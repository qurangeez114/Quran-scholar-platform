#!/usr/bin/env python3
"""
QuranHikma — Ibn Kathir Arabic↔English Tafsir fidelity batch evaluator.

Purpose
-------
Pre-compute the same kind of assessment currently produced by the site's
interactive Tafsir Accuracy button, then persist it in tafsir_accuracy_analysis.
The website can therefore display a saved score/grade immediately and use the
saved explanation as the detail view, without making visitors wait for AI.

Properties
----------
* Resumable: skips (sura, aya) rows already stored for ibn_kathir.
* Incremental: saves every successful evaluation immediately.
* Bounded: defaults to 20 new evaluations per run; use --limit to change it.
* Retry-safe: failures are reported and left missing, so a later run retries them.
* Source-safe: evaluates only verses that have BOTH Arabic and English Tafsir.
* Same 0–10 score convention used by the existing frontend analyzer.

Examples
--------
  python batch_tafsir_accuracy.py
  python batch_tafsir_accuracy.py --limit 50
  python batch_tafsir_accuracy.py --start 2:255 --limit 10
  python batch_tafsir_accuracy.py --dry-run --limit 20

This script calls the site's existing /api/claude-stream endpoint, so the
ANTHROPIC_API_KEY remains server-side in Netlify and is never stored here.
"""

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

SUPABASE_URL = "https://ylosytbxpzxzwfzjpaej.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ5bG9zeXRieHB6eHp3ZnpqcGFlaiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzc2MTQ2NTI3LCJleHAiOjIwOTE3MjI1Mjd9.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs"
CLAUDE_URL = "https://quranhikma.com/api/claude-stream"
SCHOLAR_KEY = "ibn_kathir"
EVALUATOR_VERSION = "tafsir-fidelity-v1-2026-08-18"

SB_HEADERS = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": "Bearer " + SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
}


def request_json(url, method="GET", body=None, headers=None, timeout=60):
    data = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read().decode("utf-8", errors="replace")
        return json.loads(raw) if raw.strip() else None


def sb_get(table, params, timeout=60):
    query = urllib.parse.urlencode(params, safe="(),.*:")
    return request_json(f"{SUPABASE_URL}/rest/v1/{table}?{query}", headers=SB_HEADERS, timeout=timeout)


def fetch_all(table, params, page_size=1000):
    out = []
    offset = 0
    while True:
        p = dict(params)
        p["limit"] = str(page_size)
        p["offset"] = str(offset)
        rows = sb_get(table, p) or []
        out.extend(rows)
        if len(rows) < page_size:
            return out
        offset += page_size


def load_tafsir_pairs():
    rows = fetch_all(
        "tafsir_entries",
        {
            "scholar_key": f"eq.{SCHOLAR_KEY}",
            "language": "in.(ar,en)",
            "select": "sura,aya,language,content",
            "order": "sura.asc,aya.asc,language.asc",
        },
    )
    grouped = {}
    for r in rows:
        try:
            key = (int(r["sura"]), int(r["aya"]))
        except Exception:
            continue
        lang = r.get("language")
        content = (r.get("content") or "").strip()
        if lang in ("ar", "en") and content:
            # If duplicates exist for a language, keep the longest complete row.
            old = grouped.setdefault(key, {}).get(lang, "")
            if len(content) > len(old):
                grouped[key][lang] = content
    return [
        (s, a, v["ar"], v["en"])
        for (s, a), v in sorted(grouped.items())
        if v.get("ar") and v.get("en")
    ]


def load_existing_keys():
    rows = fetch_all(
        "tafsir_accuracy_analysis",
        {
            "scholar_key": f"eq.{SCHOLAR_KEY}",
            "select": "sura,aya",
            "order": "sura.asc,aya.asc",
        },
    )
    keys = set()
    for r in rows:
        try:
            keys.add((int(r["sura"]), int(r["aya"])))
        except Exception:
            pass
    return keys


def build_prompt(sura, aya, arabic, english):
    return f"""You are evaluating the fidelity of an English translation of Ibn Kathir's Arabic tafsir for Qur'an {sura}:{aya}.

Compare ONLY the Arabic source text and the supplied English translation. Do not grade Ibn Kathir's theology, historical claims, or the Qur'an itself. Evaluate translation fidelity: preserved meaning, omissions, additions, mistranslations, softened/strengthened wording, named entities, negation, modality, causation, and theological wording where translation choices materially change the Arabic.

Scoring rubric (0–10):
10 = essentially complete and faithful; only harmless stylistic differences.
9 = highly faithful; very minor nuance loss/addition.
8 = reliable but has limited omissions/additions or notable nuance shifts.
7 = broadly usable but several meaningful issues.
6 = moderate fidelity; substantial meaning is affected.
4–5 = unreliable in important places.
0–3 = seriously misleading or not a translation of the supplied Arabic.

Be conservative and evidence-based. Do NOT deduct points merely because English cannot mirror Arabic word order. Do NOT invent omissions that are not present. If an English explanatory phrase accurately makes an implicit Arabic referent explicit, identify it as interpretive but distinguish it from a mistranslation.

Return STRICT JSON only, with exactly these keys:
{{
  "score": 0.0,
  "accurate": "What the English preserves accurately, with short Arabic anchors where useful.",
  "omitted": "Material present in Arabic but absent from English, or 'None material'.",
  "mistranslated": "Actual meaning changes or incorrect renderings, or 'None material'.",
  "concerns": "Interpretive additions, theological/semantic shifts, strengthening/softening, or 'None material'.",
  "verdict": "One concise overall judgment.",
  "evaluator_version": "{EVALUATOR_VERSION}"
}}

ARABIC SOURCE:
{arabic}

ENGLISH TRANSLATION:
{english}
"""


def call_claude(prompt, model="claude-sonnet-4-6", max_tokens=900, timeout=180):
    payload = {
        "model": model,
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
    }
    req = urllib.request.Request(
        CLAUDE_URL,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", errors="replace").strip()


def parse_result(raw):
    text = (raw or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.I)
        text = re.sub(r"\s*```$", "", text)
    try:
        obj = json.loads(text)
    except json.JSONDecodeError:
        # Recover a single JSON object if the model accidentally wrapped it in prose.
        start, end = text.find("{"), text.rfind("}")
        if start < 0 or end <= start:
            raise ValueError("No JSON object in model response")
        obj = json.loads(text[start : end + 1])

    required = ("score", "accurate", "omitted", "mistranslated", "concerns", "verdict")
    missing = [k for k in required if k not in obj]
    if missing:
        raise ValueError("Missing fields: " + ", ".join(missing))

    score = float(obj["score"])
    if not (0 <= score <= 10):
        raise ValueError(f"Score out of range: {score}")
    obj["score"] = round(score, 1)
    obj["evaluator_version"] = obj.get("evaluator_version") or EVALUATOR_VERSION
    return obj


def save_result(sura, aya, result, raw):
    body = {
        "sura": sura,
        "aya": aya,
        "scholar_key": SCHOLAR_KEY,
        "accuracy_score": result["score"],
        "accurately_translated": str(result["accurate"]),
        "omitted": str(result["omitted"]),
        "mistranslated": str(result["mistranslated"]),
        "theological_concerns": str(result["concerns"]),
        "verdict": str(result["verdict"]),
        "full_analysis": json.dumps(
            {
                **result,
                "sura": sura,
                "aya": aya,
                "scholar_key": SCHOLAR_KEY,
                "evaluator_version": EVALUATOR_VERSION,
                "raw_model_response": raw,
            },
            ensure_ascii=False,
        ),
    }
    headers = dict(SB_HEADERS)
    headers["Prefer"] = "resolution=merge-duplicates,return=minimal"
    request_json(
        f"{SUPABASE_URL}/rest/v1/tafsir_accuracy_analysis",
        method="POST",
        body=body,
        headers=headers,
        timeout=60,
    )


def parse_start(value):
    if not value:
        return None
    m = re.fullmatch(r"(\d+):(\d+)", value.strip())
    if not m:
        raise argparse.ArgumentTypeError("--start must look like 2:255")
    return int(m.group(1)), int(m.group(2))


def main():
    ap = argparse.ArgumentParser(description="Precompute Ibn Kathir Arabic↔English Tafsir fidelity scores")
    ap.add_argument("--limit", type=int, default=20, help="maximum NEW evaluations this run (default: 20; 0 = all)")
    ap.add_argument("--start", type=parse_start, help="begin at or after SURA:AYA")
    ap.add_argument("--delay", type=float, default=1.0, help="seconds between successful API calls")
    ap.add_argument("--retries", type=int, default=2, help="retries per failed verse")
    ap.add_argument("--model", default="claude-sonnet-4-6")
    ap.add_argument("--dry-run", action="store_true", help="show missing targets without calling AI or writing")
    args = ap.parse_args()

    if args.limit < 0:
        ap.error("--limit cannot be negative")

    print("Loading Ibn Kathir Arabic/English Tafsir pairs…")
    pairs = load_tafsir_pairs()
    print(f"Paired Arabic+English verses: {len(pairs)}")

    print("Loading already-saved fidelity evaluations…")
    existing = load_existing_keys()
    print(f"Already evaluated: {len(existing)}")

    missing = []
    for s, a, ar, en in pairs:
        if (s, a) in existing:
            continue
        if args.start and (s, a) < args.start:
            continue
        missing.append((s, a, ar, en))

    if args.limit:
        missing = missing[: args.limit]

    print(f"Selected missing evaluations this run: {len(missing)}")
    if not missing:
        print("✅ Nothing to do.")
        return 0

    if args.dry_run:
        for s, a, _, _ in missing:
            print(f"  {s}:{a}")
        return 0

    saved = 0
    failed = []
    for idx, (s, a, ar, en) in enumerate(missing, 1):
        print(f"[{idx}/{len(missing)}] {s}:{a} … ", end="", flush=True)
        prompt = build_prompt(s, a, ar, en)
        last_error = None
        for attempt in range(args.retries + 1):
            try:
                raw = call_claude(prompt, model=args.model)
                result = parse_result(raw)
                save_result(s, a, result, raw)
                pct = round(result["score"] * 10)
                print(f"✅ {pct}% ({result['score']}/10)")
                saved += 1
                last_error = None
                break
            except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError, json.JSONDecodeError) as e:
                last_error = e
                if attempt < args.retries:
                    wait = 2 ** attempt
                    print(f"retry {attempt + 1} in {wait}s … ", end="", flush=True)
                    time.sleep(wait)
        if last_error is not None:
            print(f"❌ {last_error}")
            failed.append((s, a, str(last_error)))
        if args.delay > 0:
            time.sleep(args.delay)

    print("\n" + "=" * 58)
    print(f"Saved this run: {saved}")
    print(f"Failed this run: {len(failed)}")
    if failed:
        print("Failed verses (safe to retry later):")
        for s, a, err in failed:
            print(f"  {s}:{a} — {err[:160]}")
    print("Because successful rows were saved immediately, re-running resumes automatically.")
    return 0 if not failed else 2


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\nStopped. Completed rows are already saved; rerun to resume.")
        sys.exit(130)

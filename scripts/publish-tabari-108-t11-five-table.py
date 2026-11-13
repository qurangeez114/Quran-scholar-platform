#!/usr/bin/env python3
"""Guarded five-table T11A/T11C publisher; intended only for the manual workflow."""
import hashlib
import importlib.util
import json
import os
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WRITE_CONTRACT = ROOT / "data/tafsir/staging/tabari-108-t11-authorized-five-table-write-workflow-contract-2026-11-12.json"
LIVE_RESULT = ROOT / "data/tafsir/staging/tabari-108-t11-live-duplicate-state-result-2026-11-12.json"
PREVIEW = ROOT / "data/tafsir/staging/tabari-108-t11-plural-consumer-lifecycle-preview-2026-11-12.json"
PREFLIGHT = ROOT / "data/tafsir/staging/tabari-108-t11-authorized-workflow-preflight-contract-2026-11-12.json"
PINS = {
    WRITE_CONTRACT: "3432c88adf1e486136ca75836a4ffc5fd1a31ea2",
    LIVE_RESULT: "fae44e98903111d31f97531c523dd7ffccc5cee2",
    PREVIEW: "94febb43597c17dc1e701b126aaffde63fd45253",
    PREFLIGHT: "8953650e5e7b1733075c8734cd707c351358096f",
}
BASE_URL = "https://ylosytbxpzxzwfzjpaej.supabase.co/rest/v1/"
CONFIRM_PHRASE = "APPLY_T11A_T11C_33_ROWS"
TABLE_ORDER = ("propositions", "proposition_voice_chain", "evidence_units", "proposition_evidence", "evidence_transmission_routes")
REVERSE_ORDER = ("evidence_transmission_routes", "proposition_evidence",
                 "proposition_voice_chain", "evidence_units", "propositions")


def git_blob(raw):
    return hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()


def load_pinned():
    values = {}
    for path, expected in PINS.items():
        raw = path.read_bytes()
        if git_blob(raw) != expected:
            raise RuntimeError("pinned input drift: " + path.name)
        values[path] = json.loads(raw)
    return values


def require_confirmation(confirm_commit, github_sha, confirm_apply):
    if not github_sha or confirm_commit != github_sha:
        raise RuntimeError("confirmed commit does not equal workflow commit")
    if confirm_apply != CONFIRM_PHRASE:
        raise RuntimeError("apply confirmation phrase mismatch")


def load_classifier():
    path = ROOT / "scripts/preview-tabari-108-t11-live-duplicate-state.py"
    spec = importlib.util.spec_from_file_location("t11_classifier", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def fresh_gate(api, preflight, preview, sha256_bytes=lambda b: hashlib.sha256(b).hexdigest()):
    classifier = load_classifier()
    result = classifier.build_preview(preflight, preview, api.get, sha256_bytes=sha256_bytes)
    expected = {"absent": 33, "exactly_one_full_exact_match": 0, "blocking_conflict": 0,
                "intended_rows": 33, "observed_classifications": 33}
    if result.get("summary") != expected or result.get("source_entry_id") != 5263:
        raise RuntimeError("fresh all-absent gate failed")
    return result


def batches_from(contract):
    rows = contract["intended_rows"]
    expected = {"propositions": 2, "proposition_voice_chain": 6, "evidence_units": 8,
                "proposition_evidence": 8, "evidence_transmission_routes": 9}
    if {k: len(rows[k]) for k in expected} != expected:
        raise RuntimeError("write-contract cardinality drift")
    return rows


def resolve_row(table, row, prop_ids, evidence_ids):
    if table == "propositions":
        return dict(row["database_fields"])
    if table == "proposition_voice_chain":
        return {"proposition_id": prop_ids[row["proposition_id_symbolic_handle"]],
                **row["database_fields_without_proposition_id"]}
    if table == "evidence_units":
        return dict(row["database_fields"])
    if table == "proposition_evidence":
        return {"proposition_id": prop_ids[row["proposition_id_symbolic_handle"]],
                "evidence_unit_id": evidence_ids[row["evidence_unit_id_symbolic_handle"]],
                **row["database_fields_without_foreign_keys"]}
    return {"evidence_unit_id": evidence_ids[row["evidence_unit_id_symbolic_handle"]],
            **row["database_fields_without_evidence_unit_id"]}


def owned_filters(table, item):
    fields = item["fields"]
    if table in ("propositions", "evidence_units"):
        return {"id": "eq." + str(item["id"]), "select": "*", "limit": "2"}
    return {k: ("is.null" if v is None else "eq." + json.dumps(v, ensure_ascii=False, separators=(",", ":")) if isinstance(v, (list, dict)) else "eq." + str(v))
            for k, v in fields.items()} | {"select": "*", "limit": "2"}


def row_matches(row, fields):
    return all(row.get(k) == v for k, v in fields.items())


def cleanup(api, ledger):
    errors = []
    for table in REVERSE_ORDER:
        for item in reversed(ledger[table]):
            try:
                candidates = api.get(table, owned_filters(table, item))
                exact = [r for r in candidates if row_matches(r, item["fields"])]
                if len(exact) != 1:
                    raise RuntimeError("cleanup ownership cardinality mismatch")
                api.delete(table, owned_filters(table, item))
                if api.get(table, owned_filters(table, item)):
                    raise RuntimeError("cleanup readback found owned row")
            except Exception as exc:
                errors.append(table + ": " + str(exc))
                break
        if errors:
            break
    if errors:
        raise RuntimeError("CLEANUP_BLOCKED: " + errors[0])


def publish(api, contract, preflight, preview, sha256_bytes=lambda b: hashlib.sha256(b).hexdigest()):
    fresh_gate(api, preflight, preview, sha256_bytes=sha256_bytes)
    rows = batches_from(contract)
    ledger = {table: [] for table in TABLE_ORDER}
    prop_ids, evidence_ids = {}, {}
    try:
        for table in TABLE_ORDER:
            for row in rows[table]:
                fields = resolve_row(table, row, prop_ids, evidence_ids)
                representation = api.post(table, fields)
                if not isinstance(representation, list) or len(representation) != 1:
                    raise RuntimeError("POST representation cardinality mismatch")
                created = representation[0]
                if not row_matches(created, fields):
                    raise RuntimeError("POST representation field mismatch")
                item = {"fields": fields, "id": created.get("id")}
                if table in ("propositions", "evidence_units") and item["id"] is None:
                    raise RuntimeError("created parent missing id")
                ledger[table].append(item)
                if table == "propositions":
                    prop_ids[row["symbolic_handle"]] = item["id"]
                elif table == "evidence_units":
                    evidence_ids[row["symbolic_handle"]] = item["id"]
        for table in TABLE_ORDER:
            for item in ledger[table]:
                matches = [r for r in api.get(table, owned_filters(table, item)) if row_matches(r, item["fields"])]
                if len(matches) != 1:
                    raise RuntimeError("success readback cardinality mismatch")
        if sum(map(len, ledger.values())) != 33:
            raise RuntimeError("success ledger cardinality mismatch")
        return {"status": "written_readback_verified_h01_active", "created_rows": 33,
                "database_written": True, "publication_ready": False,
                "scholar_complete": False, "chapter_complete": False, "h01_status": "active"}
    except Exception:
        if any(ledger.values()):
            cleanup(api, ledger)
        raise


class RestAPI:
    def __init__(self, secret):
        self.headers = {"apikey": secret, "Authorization": "Bearer " + secret, "Content-Type": "application/json"}

    def request(self, method, table, params=None, body=None):
        url = BASE_URL + table
        if params:
            url += "?" + urllib.parse.urlencode(params, quote_via=urllib.parse.quote)
        headers = dict(self.headers)
        if method == "POST":
            headers["Prefer"] = "return=representation"
        req = urllib.request.Request(url, data=None if body is None else json.dumps(body, ensure_ascii=False).encode(), headers=headers, method=method)
        with urllib.request.urlopen(req, timeout=30) as response:
            raw = response.read()
            return json.loads(raw) if raw else []

    def get(self, table, params): return self.request("GET", table, params=params)
    def post(self, table, fields): return self.request("POST", table, body=fields)
    def delete(self, table, params): return self.request("DELETE", table, params=params)


def main():
    require_confirmation(os.environ.get("CONFIRM_COMMIT", ""), os.environ.get("GITHUB_SHA", ""), os.environ.get("CONFIRM_APPLY", ""))
    secret = os.environ.get("SUPABASE_SERVICE_KEY", "")
    if not secret:
        raise SystemExit("Missing protected database credential")
    values = load_pinned()
    result = publish(RestAPI(secret), values[WRITE_CONTRACT], values[PREFLIGHT], values[PREVIEW])
    print("T11_PUBLISH_RESULT " + json.dumps(result, sort_keys=True))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print("T11_PUBLISH_BLOCKED " + str(exc), file=sys.stderr)
        raise SystemExit(1)

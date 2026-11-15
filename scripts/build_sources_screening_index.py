#!/usr/bin/env python3
"""Build a conservative per-ayah Sources screening index from checked-in staging JSON.

This is NOT a publication ledger: it excludes remote PR branches and live Supabase.
Conflicting records fail closed and are reported; draft coverage is not verified coverage.
Usage: python3 scripts/build_sources_screening_index.py
"""
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STAGING = ROOT / "data/sources/staging"
OUT = STAGING / "screening-index-main-and-branch.json"
# Canonical Hafs surah verse counts; reject non-existent ayah coordinates.
SURAH_LENGTHS = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6]

def verse_number(value):
    """Accept only positive integral JSON numbers or canonical decimal strings."""
    if isinstance(value, bool):
        raise ValueError("boolean verse key")
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.isascii() and value.isdecimal() and value == str(int(value)):
        return int(value)
    raise ValueError("nonintegral or noncanonical verse key")

def main():
    records = defaultdict(list)
    invalid = []
    files = sorted(STAGING.glob("coverage-*-to-*-*.json"))
    if not files:
        raise SystemExit("No coverage staging files matched; index not overwritten")
    for path in files:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, UnicodeError) as exc:
            invalid.append({"file": path.name, "error": f"unreadable JSON: {exc}"})
            continue
        if not isinstance(data, dict) or not isinstance(data.get("rows"), list):
            invalid.append({"file": path.name, "error": "rows must be an array"})
            continue
        for row in data["rows"]:
            try:
                sura = verse_number(row.get("sura", row.get("surah", data.get("surah"))))
                aya = verse_number(row["aya"])
                if not (1 <= sura <= len(SURAH_LENGTHS) and 1 <= aya <= SURAH_LENGTHS[sura - 1]):
                    raise ValueError("invalid verse key")
                key = f"{sura}:{aya}"
                candidates = row.get("candidate_sources", row.get("candidates", []))
                if not isinstance(candidates, list):
                    raise ValueError("candidates must be a list")
                records[key].append({"file": path.name, "depth": row.get("review_depth"),
                                     "classification": row.get("classification", row.get("status")),
                                     "candidates": len(candidates)})
            except (ValueError, TypeError, KeyError, AttributeError) as exc:
                invalid.append({"file": path.name, "error": str(exc), "row": row})
    duplicates = {k:v for k,v in records.items() if len(v)>1}
    entries = {k:{"evidence":v, "status":"conflict_needs_review" if len(v)>1 else "preliminary_screen_only"}
               for k,v in sorted(records.items(),key=lambda kv: tuple(map(int,kv[0].split(":"))))}
    output = {"schema_version":1, "scope":"checked-in staging coverage JSON only; NOT full main/PR/Supabase union",
              "not_publication_approval":True,"source_files":[p.name for p in files],
              "unique_ayat":len(entries),"duplicate_keys":duplicates,"invalid_rows":invalid,
              "entries":entries,
              "next_target_rule":"Do not infer first unreviewed verse until all main, open PR, and database coverage are reconciled."}
    if duplicates or invalid:
        raise SystemExit("Conflicting or invalid coverage; index not overwritten")
    OUT.write_text(json.dumps(output,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"Indexed {len(entries)} unique ayat in {len(files)} local files; {len(duplicates)} duplicate keys; {len(invalid)} invalid rows.")

if __name__ == "__main__":
    main()

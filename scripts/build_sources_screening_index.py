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

def main():
    records = defaultdict(list)
    invalid = []
    files = sorted(STAGING.glob("coverage-*-to-*-*.json"))
    for path in files:
        data = json.loads(path.read_text(encoding="utf-8"))
        for row in data.get("rows", []):
            try:
                sura, aya = int(row["sura"]), int(row["aya"])
                if not (1 <= sura <= 114 and aya >= 1):
                    raise ValueError("invalid verse key")
                key = f"{sura}:{aya}"
                records[key].append({"file": path.name, "depth": row.get("review_depth"),
                                     "classification": row.get("classification"),
                                     "candidates": len(row.get("candidate_sources", []))})
            except (ValueError, TypeError, KeyError) as exc:
                invalid.append({"file": path.name, "error": str(exc), "row": row})
    duplicates = {k:v for k,v in records.items() if len(v)>1}
    entries = {k:{"evidence":v, "status":"conflict_needs_review" if len(v)>1 else "preliminary_screen_only"}
               for k,v in sorted(records.items(),key=lambda kv: tuple(map(int,kv[0].split(":"))))}
    output = {"schema_version":1, "scope":"checked-in staging coverage JSON only; NOT full main/PR/Supabase union",
              "not_publication_approval":True,"source_files":[p.name for p in files],
              "unique_ayat":len(entries),"duplicate_keys":duplicates,"invalid_rows":invalid,
              "entries":entries,
              "next_target_rule":"Do not infer first unreviewed verse until all main, open PR, and database coverage are reconciled."}
    OUT.write_text(json.dumps(output,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"Indexed {len(entries)} unique ayat in {len(files)} local files; {len(duplicates)} duplicate keys; {len(invalid)} invalid rows.")
    if duplicates or invalid:
        raise SystemExit("Review conflicting or invalid coverage before promoting the index")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Check Q10 staged-fragment mapping guardrails; no database access."""
import json
from pathlib import Path

p = Path(__file__).resolve().parents[1] / "data/tafsir/staging/qurtubi-108-q10-canonical-gap-assessment-2026-11-23.json"
d = json.loads(p.read_text(encoding="utf-8"))
b = d["baseline"]
assert b["canonical_qurtubi_claims"] == 23 and b["all_scholars_claims"] == 74 and b["active_holds"] == 48
assert b["assembly_has_q10"] is False and b["plan_ends_with"] == "108-Q09"
assert {x["staged_id"] for x in d["fragments"]} == {"108-Q10A-R01", "108-Q10A-R02", "108-Q10B-R01"}
assert d["reviewers"]["independent_scholarly_review"] == "pending"
l = d["ledger"]
assert l["database_written"] is False and l["plan_changed"] is False and l["assembly_changed"] is False
assert l["new_canonical_claims"] == 0 and l["holds_cleared"] == 0 and l["published_claims"] == 0
assert l["chapter_complete"] is False and l["ui_validated"] is False
assert d["live_rows"]["source_url"] == "671 (legacy identifier; not URL)"
print("PASS: Q10 fragments remain unmapped, with counts and publication guards intact.")

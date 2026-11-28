#!/usr/bin/env python3
"""Guard Qurtubi Q10 staging provenance against accidental canonical count inflation."""
import json
import sys
from pathlib import Path

p = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[1] / "data/tafsir/staging/qurtubi-108-q10-inventory-origin-audit-2026-11-23.json"
d = json.loads(p.read_text(encoding="utf-8"))
assert d["project"] == "QuranHikma" and d["supabase_project_id"] == "ylosytbxpzxzwfzjpaej"
assert d["pull_request"]["number"] == 470 and d["pull_request"]["draft"] is True and d["pull_request"]["merged"] is False
assert d["preflight"]["baseline_six_scholar_claims"] == 74
assert d["preflight"]["active_chapter_holds"] == 48
assert d["preflight"]["qurtubi_plan_claims"] == 23
assert d["preflight"]["qurtubi_active_holds"] == 8
hist = d["source_inventory_history"]
assert hist[0]["reported_claim_count"] == 23 and hist[0]["contains_q10_id"] is False
assert hist[1]["claim_count"] == 23 and hist[1]["contains_q10_id"] is False
assert hist[2]["qurtubi_claim_count"] == 23 and hist[2]["contains_q10_id"] is False
assert hist[3]["pr_470_additions"]["canonical_parent_present"] is False
assert d["interpretation"]["fact"].startswith("The live Arabic row already contained")
assert d["interpretation"]["decision"].startswith("Do not treat")
assert d["live_read_only"]["database_writes"] == 0
assert d["live_read_only"]["analysis_rows_surah108"] == 0
assert d["review_status"]["source_claims_closed"] == 0
assert d["review_status"]["holds_cleared"] == 0
assert d["review_status"]["published"] is False
assert len(d["unresolved_holds"]) == 8
print("PASS: Q10A/B preserved as staging-only until reviewed crosswalk; 23/74 counts and holds unchanged")

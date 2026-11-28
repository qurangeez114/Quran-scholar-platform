#!/usr/bin/env python3
"""Validate staged Qurtubi Q10A/Q10B coverage and candidate crosswalk only."""
import json, sys
from pathlib import Path
p = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[1] / "data/tafsir/staging/qurtubi-108-q10a-q10b-bilingual-coverage-2026-11-23.json"
d = json.loads(p.read_text(encoding="utf-8"))
assert d["project"] == "QuranHikma" and d["supabase_project_id"] == "ylosytbxpzxzwfzjpaej"
assert d["pull_request"]["number"] == 470 and d["pull_request"]["draft"] is True and d["pull_request"]["merged"] is False
pf = d["preflight"]
assert (pf["six_scholar_claims"], pf["active_holds"], pf["qurtubi_claims"], pf["qurtubi_active_holds"]) == (74, 48, 23, 8)
assert pf["holds_cleared"] == 0 and pf["claim_count_changed"] == 0 and pf["published"] == 0
assert pf["candidate_crosswalks_added"] == 2 and pf["canonical_plan_changed"] is False
live = d["live_read_only"]
assert live["database_write_statements"] == 0 and live["tafsir_accuracy_analysis_s108_rows"] == 0
assert live["arabic"]["id"] == 13241 and live["arabic"]["md5"] == "4963824f42a040edcaa995b7afbf8678"
assert live["english"]["id"] == 38032 and live["english"]["md5"] == "a9d8970d560e8683641ee47e22a38a24"
assert live["arabic"]["q10b_start_1based"] == 2215 and live["arabic"]["q10b_chars"] == 341
assert live["english"]["q10b_any_coverage"] is False and live["english"]["row_tail"] == 'And it is said: "Allah made him'
cw = d["candidate_crosswalk"]
assert cw["status"] == "candidate_relations_only_pending_independent_scholarly_review"
assert cw["canonical_plan_changed"] is False and cw["new_canonical_claim_ids"] == []
items = {x["staged_review_id"]: x for x in cw["candidates"]}
assert set(items) == {"108-Q10A-R01", "108-Q10B-R01"}
assert items["108-Q10A-R01"]["suggested_existing_claim_id"] == "108-Q08A"
assert items["108-Q10A-R01"]["relation"] == "lexical_overlap_candidate_not_equivalence"
assert items["108-Q10B-R01"]["suggested_existing_claim_id"] == "108-Q09"
assert items["108-Q10B-R01"]["relation"] == "contextual_lexical_companion_candidate_not_word_identity"
assert all(x["decision"] == "suggestion_only" for x in items.values())
assert len(d["unresolved_holds"]) == 8 and d["status_ledger"]["publication"] == "not_published"
assert d["status_ledger"]["human_scholarly_review"] == "pending"
assert all(v is False for k,v in d["actions"].items() if k not in {"candidate_crosswalk_added", "source_role_review_added"})
assert d["actions"]["candidate_crosswalk_added"] is True

roles = d["source_role_review"]
assert roles["status"] == "staged_source_attribution_review_pending_scholar"
assert roles["database_changed"] is False and roles["canonical_claim_count_changed"] is False
assert len(roles["roles"]) == 2
assert "does not independently verify" in roles["roles"][0]["independent_check"]
assert "vol.2, p.708" in roles["roles"][1]["locator"]
assert all(x["reviewer_status"] == "independent_scholarly_review_pending" for x in [roles])
assert d["preflight"]["source_role_reviews_added"] == 1
assert d["actions"]["source_role_review_added"] is True
print("PASS: source-role distinctions staged; no canon, translation, or live DB change")


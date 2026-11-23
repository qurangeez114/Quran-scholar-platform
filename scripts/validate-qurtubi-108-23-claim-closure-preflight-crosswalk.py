#!/usr/bin/env python3
"""Validate the Qurtubi 108 staged-claim crosswalk without mutating source rows."""
import json
import sys
from pathlib import Path

path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[1] / "data/tafsir/staging/qurtubi-108-23-claim-closure-preflight-crosswalk-2026-11-23.json"
d = json.loads(path.read_text(encoding="utf-8"))
assert d["project"] == "QuranHikma"
assert d["supabase_project_id"] == "ylosytbxpzxzwfzjpaej"
assert d["pull_request"]["number"] == 470
assert d["pull_request"]["draft"] is True and d["pull_request"]["merged"] is False
pre = d["preflight"]
assert (pre["baseline_claims_all_scholars"], pre["qurtubi_claims"], pre["active_holds_all_scholars"]) == (74, 23, 48)
assert pre["qurtubi_holds_cleared"] == 0
assert pre["published_claims"] == 0 and pre["publication_ready_claims"] == 0
assert pre["database_written"] is False and pre["chapter_complete"] is False
src = d["source_inventories"]
plan = src["qurtubi_plan"]["claim_ids"]
assembly = src["chapter_assembly"]["claim_ids"]
assert len(plan) == 23 and len(set(plan)) == 23
assert len(assembly) == 23 and len(set(assembly)) == 23
assert set(plan) == set(assembly) and src["comparison"]["claim_id_sets_identical"] is True
assert src["chapter_assembly"]["all_publication_ready"] is False
assert src["chapter_assembly"]["states"]["semantic_hold_ids"] == ["108-Q04C", "108-Q04G", "108-Q04J"]
assert len(pre["qurtubi_active_hold_ids"]) == 8
assert set(pre["qurtubi_active_hold_ids"]) == {f"108-QURTUBI-SCHOLAR-H{i:02d}" for i in range(1, 9)}
cw = d["crosswalk"]
assert cw["canonical_claim_count_remains"] == 23 and cw["no_new_claim_ids_allocated"] is True
assert "108-Q09" in cw["canonical_rows_without_dedicated_review_artifact"]
assert all(x["canonical_claim_id"] != "108-Q09" for x in cw["direct_canonical_review_artifacts"])
assert cw["opening_name_proposal"]["claim_id_declared"] is False
assert cw["opening_name_proposal"]["mapping"] == "unmapped_fragment_outside_canonical_anchor"
assert "108-Q10" not in plan and "108-Q10A-R01" not in plan and "108-Q10B-R01" not in plan
ids = {x["id"] for x in cw["additional_staged_identifiers"]}
assert {"108-Q04O", "108-Q04P", "108-Q04Q", "108-Q04R", "108-Q04S", "108-Q07-H", "108-Q10A-R01", "108-Q10A-R02", "108-Q10B-R01", "108-Q09C-R01"} <= ids
assert all(x["mapping"] in {"supplemental_child_of_canonical", "unmapped_extra_claim"} for x in cw["additional_staged_identifiers"])
assert d["latest_live_read_only_rows"]["database_write_statements"] == 0
assert d["latest_live_read_only_rows"]["tafsir_accuracy_analysis_surah_108_rows"] == 0
assert d["latest_live_read_only_rows"]["qurtubi_english"]["q10b"] == "no sanbur/sunbur/cistern wording found; no English coverage"
assert all(x is False for x in d["actions"].values() if isinstance(x, bool))
assert d["status_ledger"]["publication"] == "not_published"
assert d["status_ledger"]["independent_human_review"] == "pending"
assert d["status_ledger"]["all_six_scholars"] == "incomplete"
assert d["status_ledger"]["qurtubi_holds"] == pre["qurtubi_active_hold_ids"]
print("PASS: 23 canonical IDs agree; staged extra IDs and holds remain unmerged/unpublished")

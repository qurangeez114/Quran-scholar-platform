#!/usr/bin/env python3
"""Check the narrow Qurtubi 108:3 hadith-phrase boundary checkpoint."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "data/tafsir/staging/qurtubi-108-q10a-batirayra-report-boundary-revalidation-2026-11-23.json"
data = json.loads(PATH.read_text(encoding="utf-8"))

assert data["project"] == "QuranHikma"
assert data["supabase_project_id"] == "ylosytbxpzxzwfzjpaej"
assert data["claim_id"] == "108-Q10A-R02"
assert data["pull_request"]["number"] == 470
assert data["pull_request"]["draft"] is True
assert data["pull_request"]["merged"] is False
assert data["preflight"]["latest_main_sha"] == "e1f4c53bc3c47a728505dc0f601026f4d765eb12"
assert data["preflight"]["six_scholar_claims"] == 74
assert data["preflight"]["active_chapter_holds"] == 48
assert data["preflight"]["holds_cleared"] == 0
assert data["preflight"]["publication_ready_claims_added"] == 0
assert len(data["preflight"]["qurtubi_active_holds"]) == 8

live = data["live_read_only_revalidation"]
assert live["write_statements"] == 0
assert live["tafsir_accuracy_analysis_rows_for_surah_108"] == 0
assert live["arabic"]["id"] == 13241
assert live["arabic"]["md5"] == "4963824f42a040edcaa995b7afbf8678"
assert live["arabic"]["unattributed_hadith_phrase"] == "وفي الحديث ما هذه البتيراء"
assert live["english"]["id"] == 38032
assert live["english"]["md5"] == "a9d8970d560e8683641ee47e22a38a24"
assert live["english"]["terminal_text"] == 'And it is said: "Allah made him"'
assert live["english"]["translation_status"].startswith("still_truncated")

witnesses = {w["witness_id"]: w for w in data["source_witnesses"]}
assert "printed page 222" in witnesses["qurtubi_quranpedia_108_3_edition2"]["locator"]
assert "printed p. 94" in witnesses["ibn_al_athir_al_nihaya_btr"]["locator"]
assert "not proof of Qurtubi's unnamed citation" in witnesses["bayhaqi_al_sunan_al_kubra_4568"]["relation"]
assert data["source_boundary_findings"]["intended_source_identified"] is False
assert data["source_boundary_findings"]["qurtubi_isnad_found"] is False
assert data["source_boundary_findings"]["hadith_authenticity_assessed"] is False
assert data["source_boundary_findings"]["claim_closed"] is False

for key in ["source_text_changed", "translation_drafted", "sql_executed", "database_written", "workflow_dispatched", "deployment_performed", "merge_performed"]:
    assert data["actions"][key] is False
assert data["approval"]["independent_human_scholarly_review"] == "pending"
assert data["approval"]["published"] is False
assert len(data["unresolved_holds"]) == 8
assert data["next_target"]["claim_id"] == "108-QURTUBI-CLOSURE-PREFLIGHT-01"

print("PASS Qurtubi 108 Q10A exact hadith phrase boundary revalidation; all publication and hold gates preserved")

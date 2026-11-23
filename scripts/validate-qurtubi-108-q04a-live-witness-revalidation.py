#!/usr/bin/env python3
"""Validate the read-only Qurtubi 108:1 Ikrima fidelity checkpoint."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "data/tafsir/staging/qurtubi-108-q04a-live-witness-revalidation-2026-11-23.json"
d = json.loads(PATH.read_text(encoding="utf-8"))

assert d["project"] == "QuranHikma"
assert d["supabase_project_id"] == "ylosytbxpzxzwfzjpaej"
assert d["claim_id"] == "108-Q04A-R02"
assert d["pull_request"]["number"] == 470
assert d["pull_request"]["draft"] is True and d["pull_request"]["merged"] is False
assert d["preflight"]["six_scholar_claims"] == 74
assert d["preflight"]["active_chapter_holds"] == 48
assert d["preflight"]["qurtubi_claims"] == 23
assert d["preflight"]["qurtubi_active_holds"] == 8
assert d["preflight"]["holds_cleared"] == 0
assert d["preflight"]["publication_ready_claims_added"] == 0

live = d["live_read_only_witnesses"]
assert live["database_writes"] == 0
assert live["tafsir_accuracy_analysis_rows_for_surah_108"] == 0
ar, en = live["arabic"], live["english"]
assert ar["id"] == 13239 and ar["md5"] == "d813e9174d86a6f60a76cb2d88d67a0c"
assert ar["exact_span"] == "الثالث : أن الكوثر النبوة والكتاب ; قاله عكرمة ."
assert ar["exact_span_occurrences"] == 1
assert en["id"] == 38030 and en["md5"] == "a2ed72b9348cbf3c4fbcfff5e7567bb7"
assert en["anchors"]["Ikrimah"] == 0
assert en["anchors"]["prophethood"] == 0
assert d["fidelity_findings"]["this_is_an_english_absence_not_a_proven_wrong_translation"] is True
assert d["fidelity_findings"]["English_editor_or_witness_identity_established"] is False
assert d["fidelity_findings"]["claim_closed"] is False

for key in ["translation_drafted", "source_text_changed"]:
    assert d["fidelity_findings"][key] is False
for key in ["sql_executed", "database_written", "workflow_dispatched", "deployment_performed", "merge_performed"]:
    assert d["actions"][key] is False
assert d["approval"]["published"] is False
assert d["approval"]["independent_human_scholarly_review"] == "pending"
assert len(d["unresolved_holds"]) == 8
assert d["next_target"]["claim_id"] == "108-Q04B"

print("PASS Qurtubi 108 Q04A live revalidation; English absence and all review holds preserved")

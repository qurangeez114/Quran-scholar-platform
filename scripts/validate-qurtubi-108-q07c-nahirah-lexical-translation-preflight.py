#!/usr/bin/env python3
import copy
import json
from pathlib import Path

P = Path(__file__).parents[1] / "data/tafsir/staging/qurtubi-108-q07c-nahirah-lexical-translation-preflight-2026-11-21.json"
D = json.loads(P.read_text(encoding="utf-8"))


def check(d):
    assert d["schema_version"] == "qh-qurtubi-108-q07c-nahirah-lexical-translation-preflight-v1"
    assert d["claim_id"] == "108-Q07-C-LEX1" and d["parent_claim_id"] == "108-Q07-C"
    assert (d["surah"], d["ayah"]) == (108, 2)
    r = d["repository_state"]
    assert r["pull_request"] == 470 and r["draft"] and not r["merged"]
    assert r["parent_head_sha"] == "9e4aa57a2f05dc8992a7c54a3e8e66a01150a8b1"
    assert r["conflicting_surah_108_tafsir_pull_requests"] == []
    assert r["parent_ci"]["run_id"] == 44907603300 and r["parent_ci"]["conclusion"] == "success"
    b = d["baseline"]
    assert (b["six_scholar_claims"], b["qurtubi_claims"], b["active_chapter_holds"]) == (74, 23, 48)
    assert b["holds_cleared"] == b["publication_ready_claims_added"] == 0
    assert not b["chapter_complete"] and not b["advance_to_surah_107"]
    live = d["live_read_only_witnesses"]
    assert live["database_writes"] == 0 and live["read_only_selects_executed"]
    assert live["tafsir_accuracy_analysis_rows_for_surah_108"] == 0
    assert live["arabic"]["id"] == 13240 and live["arabic"]["sha256"] == "0c5c2323d19824e53fcf8821838df214033284a8ea65d94a3ff5e1aecea45857"
    assert live["english"]["id"] == 38031 and live["english"]["sha256"] == "a96d7aed0bccc235c2ab86c0eed60651d677ce70d41b89b26f196dbaeda59894"
    assert live["arabic"]["source_url_kind"] == live["english"]["source_url_kind"] == "legacy_numeric_source_identifier_not_url"
    lex = {x["source_id"]: x for x in d["lexical_witnesses"]}
    assert set(lex) == {"al_mujam_al_wasit_nahirah", "tahdhib_al_lugha_nhr", "lisan_al_arab_nhr"}
    assert "المنحورة" in lex["al_mujam_al_wasit_nahirah"]["arabic"]
    assert "تستقبله" in lex["tahdhib_al_lugha_nhr"]["arabic"]
    assert "نحر الصدر أعلاه" in lex["lisan_al_arab_nhr"]["arabic"]
    reports = {x["source_id"]: x for x in d["report_witness_alignment"]}
    assert set(reports) == {"qurtubi_q07c", "thalabi_q07c", "ibn_kathir_q07c"}
    assert reports["qurtubi_q07c"]["question"] == "ما هذه النحيرة التي أمرني الله بها"
    assert reports["thalabi_q07c"]["question"] == reports["ibn_kathir_q07c"]["question"] == "ما هذه النحيرة التي أمرني بها ربي"
    assert "حديثا منكرا جدا" in reports["ibn_kathir_q07c"]["locator"]
    comp = {x["source_id"]: x for x in d["comparative_english_witnesses"]}
    assert set(comp) == {"tafsir_al_mizan_english", "hadith_unlocked_hakim_23_108"}
    assert "comparative" in comp["tafsir_al_mizan_english"]["use_limit"]
    t = d["translation_decision"]
    assert t["arabic_question"] == "ما هذه النحيرة التي أمرني الله بها"
    assert t["arabic_reply_opening"] == "ليست بنحيرة ولكنه يأمرك"
    assert "raising of hands" in t["stored_question"] and "nuhur" in t["stored_reply_opening"]
    assert t["proposed_question"] == "What is this *nahirah* (sacrifice) that Allah has commanded me to perform?"
    assert t["proposed_reply_opening"] == "It is not a *nahirah*,"
    assert t["correction_proposed"] and not t["correction_applied"]
    assert not t["silent_replacement_permitted"] and t["human_scholarly_review_required"]
    assert not t["historical_authenticity_affected"]
    g = d["guarded_candidate_preflight"]
    assert g["row_id"] == 38031 and g["source_url_value"] == "671"
    assert g["source_url_kind"] == "legacy_numeric_source_identifier_not_url"
    assert (g["question_offset_1_based"], g["question_occurrences"]) == (2486, 1)
    assert (g["reply_offset_1_based"], g["reply_occurrences"]) == (2571, 1)
    assert g["before"]["sha256"] == "a96d7aed0bccc235c2ab86c0eed60651d677ce70d41b89b26f196dbaeda59894"
    assert g["candidate_after_two_replacements"]["sha256"] == "9bb611f9b499f27115df15d3c47f5dfb0480ee1da79566d4b326d60ea8acc7c3"
    assert not g["sql_patch_present"] and not g["database_write_authorized"] and not g["database_write_attempted"]
    f = d["fidelity_findings"]
    assert not f["raising_hands_gloss_supported_for_nahirah"] and f["sacrifice_gloss_supported_for_nahirah"]
    assert f["question_reply_contrast_preserved_by_candidate"]
    assert not f["parallel_route_imported_into_qurtubi"] and not f["qurtubi_adoption_established"]
    assert f["negative_report_assessments_preserved"] and f["translation_hold_active"]
    assert not f["publication_ready"]
    a = d["actions"]
    assert a["human_scholarly_approval"] == "pending" and not a["independent_human_review_observed"]
    assert a["read_only_database_selects"]
    assert all(not a[k] for k in ("live_database_written", "production_dml_executed", "pr_merged", "deployed"))
    assert a["publication_status"] == "not_published"
    assert d["unresolved_holds"] == [f"108-QURTUBI-SCHOLAR-H0{i}" for i in range(1, 9)]
    assert d["next_target"]["claim_id"] == "108-Q07-C-LEX1"


check(D)
mutations = [
    ("publish", lambda x: x["actions"].__setitem__("publication_status", "published")),
    ("write", lambda x: x["actions"].__setitem__("live_database_written", True)),
    ("dml", lambda x: x["actions"].__setitem__("production_dml_executed", True)),
    ("approval", lambda x: x["actions"].__setitem__("human_scholarly_approval", "approved")),
    ("independent_review", lambda x: x["actions"].__setitem__("independent_human_review_observed", True)),
    ("apply", lambda x: x["translation_decision"].__setitem__("correction_applied", True)),
    ("silent", lambda x: x["translation_decision"].__setitem__("silent_replacement_permitted", True)),
    ("authenticity", lambda x: x["translation_decision"].__setitem__("historical_authenticity_affected", True)),
    ("sql_patch", lambda x: x["guarded_candidate_preflight"].__setitem__("sql_patch_present", True)),
    ("write_auth", lambda x: x["guarded_candidate_preflight"].__setitem__("database_write_authorized", True)),
    ("write_attempt", lambda x: x["guarded_candidate_preflight"].__setitem__("database_write_attempted", True)),
    ("wrong_question_count", lambda x: x["guarded_candidate_preflight"].__setitem__("question_occurrences", 2)),
    ("wrong_reply_count", lambda x: x["guarded_candidate_preflight"].__setitem__("reply_occurrences", 0)),
    ("hash", lambda x: x["guarded_candidate_preflight"]["candidate_after_two_replacements"].__setitem__("sha256", "0" * 64)),
    ("hand_gloss", lambda x: x["fidelity_findings"].__setitem__("raising_hands_gloss_supported_for_nahirah", True)),
    ("drop_sacrifice", lambda x: x["fidelity_findings"].__setitem__("sacrifice_gloss_supported_for_nahirah", False)),
    ("erase_contrast", lambda x: x["fidelity_findings"].__setitem__("question_reply_contrast_preserved_by_candidate", False)),
    ("import_route", lambda x: x["fidelity_findings"].__setitem__("parallel_route_imported_into_qurtubi", True)),
    ("adoption", lambda x: x["fidelity_findings"].__setitem__("qurtubi_adoption_established", True)),
    ("drop_criticism", lambda x: x["fidelity_findings"].__setitem__("negative_report_assessments_preserved", False)),
    ("clear_translation_hold", lambda x: x["fidelity_findings"].__setitem__("translation_hold_active", False)),
    ("ready", lambda x: x["fidelity_findings"].__setitem__("publication_ready", True)),
    ("hold", lambda x: x["unresolved_holds"].pop()),
    ("hold_count", lambda x: x["baseline"].__setitem__("holds_cleared", 1)),
    ("complete", lambda x: x["baseline"].__setitem__("chapter_complete", True)),
    ("advance", lambda x: x["baseline"].__setitem__("advance_to_surah_107", True)),
    ("merge", lambda x: x["repository_state"].__setitem__("merged", True)),
    ("url", lambda x: x["live_read_only_witnesses"]["english"].__setitem__("source_url_kind", "verified_url"))
]
for name, mutate in mutations:
    bad = copy.deepcopy(D)
    mutate(bad)
    try:
        check(bad)
    except (AssertionError, KeyError, TypeError):
        pass
    else:
        raise AssertionError(f"unsafe mutation accepted: {name}")
print(f"PASS: Qurtubi 108-Q07-C-LEX1 nahirah lexical translation preflight; {len(mutations)}/{len(mutations)} unsafe mutations rejected; 0 writes; 48 holds active")

#!/usr/bin/env python3
import copy
import json
from pathlib import Path

P = Path(__file__).parents[1] / "data/tafsir/staging/qurtubi-108-q07c-nahirah-transliteration-edition-preflight-2026-11-21.json"
D = json.loads(P.read_text(encoding="utf-8"))


def check(d):
    assert d["schema_version"] == "qh-qurtubi-108-q07c-nahirah-transliteration-edition-preflight-v1"
    assert d["claim_id"] == "108-Q07-C-LEX2" and d["parent_claim_id"] == "108-Q07-C-LEX1"
    assert (d["surah"], d["ayah"]) == (108, 2)
    r = d["repository_state"]
    assert r["pull_request"] == 470 and r["draft"] and not r["merged"] and r["mergeable"]
    assert r["parent_head_sha"] == "11781c83e812d1c14025cc78857745a7f5ad0971"
    assert r["conflicting_surah_108_tafsir_pull_requests"] == []
    assert r["parent_ci"]["run_id"] == 44912031585 and r["parent_ci"]["conclusion"] == "success"
    b = d["baseline"]
    assert (b["six_scholar_claims"], b["active_chapter_holds"]) == (74, 48)
    assert (b["resolved_holds"], b["publication_ready_rows"], b["complete_scholars"], b["incomplete_scholars"]) == (0, 0, 0, 6)
    assert b["holds_cleared_by_this_step"] == 0 and not b["chapter_complete"] and not b["advance_to_surah_107"]
    live = d["live_read_only_snapshot"]
    assert live["database_writes"] == 0 and live["read_only_selects_executed"]
    assert live["tafsir_accuracy_analysis_rows_for_surah_108"] == 0
    assert live["arabic"]["id"] == 13240 and live["arabic"]["sha256"] == "0c5c2323d19824e53fcf8821838df214033284a8ea65d94a3ff5e1aecea45857"
    assert live["english"]["id"] == 38031 and live["english"]["sha256"] == "a96d7aed0bccc235c2ab86c0eed60651d677ce70d41b89b26f196dbaeda59894"
    assert live["arabic"]["source_url_kind"] == live["english"]["source_url_kind"] == "legacy_numeric_source_identifier_not_url"
    tr = d["transliteration_review"]
    assert tr["arabic_vocalized"] == "النَّحِيرَة" and tr["refined_transliteration"] == "naḥīrah"
    assert tr["ascii_fallback"] == "nahirah" and tr["human_style_review_required"]
    assert [x["latin"] for x in tr["mapping"]] == ["n", "ḥ", "ī", "r", "ah"]
    lex = {x["source_id"]: x for x in d["lexical_anchors"]}
    assert set(lex) == {"al_mujam_al_wasit_nahirah", "lanes_lexicon_nhr", "maqayis_al_lugha_nhr"}
    assert "المنحورة" in lex["al_mujam_al_wasit_nahirah"]["arabic"]
    assert lex["lanes_lexicon_nhr"]["arabic"] == "نَحِيرَة"
    assert lex["maqayis_al_lugha_nhr"]["arabic"] == "النَّحِيرَةُ"
    editions = {x["source_id"]: x for x in d["qurtubi_edition_matrix"]}
    assert set(editions) == {"qurtubi_ksu", "qurtubi_islamweb", "qurtubi_printed_other_edition"}
    assert {x["question"] for x in editions.values()} == {"ما هذه النحيرة التي أمرني الله بها"}
    assert {x["reply_opening"] for x in editions.values()} == {"ليست بنحيرة ولكنه يأمرك"}
    eb = d["edition_boundary"]
    assert eb["qurtubi_wording_to_preserve"] == "أمرني الله بها"
    assert eb["parallel_wording_not_to_import"] == "أمرني بها ربي"
    assert "ربي" in eb["parallel_anchor"]["question"]
    assert not eb["semantic_punctuation_difference_observed"] and not eb["silent_edition_assimilation_permitted"]
    t = d["translation_refinement"]
    assert "raising of hands" in t["stored_question"]
    assert t["refined_staged_question"] == "What is this *naḥīrah* (sacrificial offering) that Allah has commanded me to perform?"
    assert t["refined_staged_reply_opening"] == "It is not a *naḥīrah*,"
    assert t["raising_hands_remains_in_following_explanation"] and t["correction_proposed"] and not t["correction_applied"]
    assert t["human_scholarly_approval"] == "pending" and not t["independent_human_review_observed"]
    g = d["guarded_candidate_preflight"]
    assert g["row_id"] == 38031
    assert (g["question_offset_1_based"], g["question_occurrences"]) == (2486, 1)
    assert (g["reply_offset_1_based"], g["reply_occurrences"]) == (2571, 1)
    assert g["before"]["sha256"] == "a96d7aed0bccc235c2ab86c0eed60651d677ce70d41b89b26f196dbaeda59894"
    assert g["refined_candidate_after_two_replacements"]["sha256"] == "a34f1a8666b4aa393f43e2244adfb88e3996111efaf27b5d55de71250dc34c10"
    assert (g["refined_candidate_after_two_replacements"]["chars"], g["refined_candidate_after_two_replacements"]["bytes"]) == (3947, 3963)
    assert not g["sql_patch_present"] and not g["database_write_authorized"] and not g["database_write_attempted"]
    f = d["fidelity_boundaries"]
    assert not f["full_isnad_in_stored_qurtubi"] and not f["parallel_full_route_imported"]
    assert f["ibn_kathir_negative_assessment_preserved"] and f["ibn_hibban_negative_assessment_preserved"]
    assert f["known_abridgments_and_variants_preserved"] and not f["historical_authenticity_reclassified"]
    assert f["translation_hold_active"] and not f["publication_ready"]
    a = d["actions"]
    assert a["read_only_database_selects"]
    assert all(not a[k] for k in ("live_database_written", "production_dml_executed", "pr_merged", "deployed"))
    assert a["publication_status"] == "not_published"
    assert d["unresolved_holds"] == [f"108-QURTUBI-SCHOLAR-H0{i}" for i in range(1, 9)]
    assert d["next_target"]["claim_id"] == "108-Q07-C-LEX2"


check(D)
mutations = [
    ("publish", lambda x: x["actions"].__setitem__("publication_status", "published")),
    ("write", lambda x: x["actions"].__setitem__("live_database_written", True)),
    ("dml", lambda x: x["actions"].__setitem__("production_dml_executed", True)),
    ("merge", lambda x: x["repository_state"].__setitem__("merged", True)),
    ("approval", lambda x: x["translation_refinement"].__setitem__("human_scholarly_approval", "approved")),
    ("human_review", lambda x: x["translation_refinement"].__setitem__("independent_human_review_observed", True)),
    ("apply", lambda x: x["translation_refinement"].__setitem__("correction_applied", True)),
    ("wrong_translit", lambda x: x["transliteration_review"].__setitem__("refined_transliteration", "nuhur")),
    ("drop_style_review", lambda x: x["transliteration_review"].__setitem__("human_style_review_required", False)),
    ("import_parallel", lambda x: x["edition_boundary"].__setitem__("qurtubi_wording_to_preserve", "أمرني بها ربي")),
    ("assimilate", lambda x: x["edition_boundary"].__setitem__("silent_edition_assimilation_permitted", True)),
    ("semantic_punctuation", lambda x: x["edition_boundary"].__setitem__("semantic_punctuation_difference_observed", True)),
    ("sql_patch", lambda x: x["guarded_candidate_preflight"].__setitem__("sql_patch_present", True)),
    ("write_auth", lambda x: x["guarded_candidate_preflight"].__setitem__("database_write_authorized", True)),
    ("write_attempt", lambda x: x["guarded_candidate_preflight"].__setitem__("database_write_attempted", True)),
    ("question_count", lambda x: x["guarded_candidate_preflight"].__setitem__("question_occurrences", 2)),
    ("reply_count", lambda x: x["guarded_candidate_preflight"].__setitem__("reply_occurrences", 0)),
    ("hash", lambda x: x["guarded_candidate_preflight"]["refined_candidate_after_two_replacements"].__setitem__("sha256", "0" * 64)),
    ("isnad", lambda x: x["fidelity_boundaries"].__setitem__("full_isnad_in_stored_qurtubi", True)),
    ("route", lambda x: x["fidelity_boundaries"].__setitem__("parallel_full_route_imported", True)),
    ("drop_ibn_kathir", lambda x: x["fidelity_boundaries"].__setitem__("ibn_kathir_negative_assessment_preserved", False)),
    ("drop_ibn_hibban", lambda x: x["fidelity_boundaries"].__setitem__("ibn_hibban_negative_assessment_preserved", False)),
    ("reclassify", lambda x: x["fidelity_boundaries"].__setitem__("historical_authenticity_reclassified", True)),
    ("clear_hold", lambda x: x["fidelity_boundaries"].__setitem__("translation_hold_active", False)),
    ("ready", lambda x: x["fidelity_boundaries"].__setitem__("publication_ready", True)),
    ("hold", lambda x: x["unresolved_holds"].pop()),
    ("hold_count", lambda x: x["baseline"].__setitem__("holds_cleared_by_this_step", 1)),
    ("complete", lambda x: x["baseline"].__setitem__("chapter_complete", True)),
    ("advance", lambda x: x["baseline"].__setitem__("advance_to_surah_107", True)),
    ("url", lambda x: x["live_read_only_snapshot"]["english"].__setitem__("source_url_kind", "verified_url"))
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
print(f"PASS: Qurtubi 108-Q07-C-LEX2 transliteration/edition preflight; {len(mutations)}/{len(mutations)} unsafe mutations rejected; 0 writes; 48 holds active")

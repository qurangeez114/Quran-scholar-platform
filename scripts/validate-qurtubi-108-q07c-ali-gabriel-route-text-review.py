#!/usr/bin/env python3
import copy
import json
from pathlib import Path

P = Path(__file__).parents[1] / "data/tafsir/staging/qurtubi-108-q07c-ali-gabriel-route-text-review-2026-11-21.json"
D = json.loads(P.read_text(encoding="utf-8"))


def check(d):
    assert d["schema_version"] == "qh-qurtubi-108-q07c-ali-gabriel-route-text-review-v1"
    assert d["claim_id"] == "108-Q07-C" and d["parent_claim_id"] == "108-Q07"
    assert d["surah"] == 108 and d["ayah"] == 2
    r = d["repository_state"]
    assert r["pull_request"] == 470 and r["draft"] and not r["merged"]
    assert r["parent_head_sha"] == "1c608f62566f085929879ae8318a57dedccf6805"
    assert r["conflicting_surah_108_tafsir_pull_requests"] == [] and r["parent_ci"]["conclusion"] == "success"
    b = d["baseline"]
    assert (b["six_scholar_claims"], b["qurtubi_claims"], b["active_chapter_holds"]) == (74, 23, 48)
    assert b["holds_cleared"] == b["publication_ready_claims_added"] == 0
    assert not b["chapter_complete"] and not b["advance_to_surah_107"]
    live = d["live_read_only_witnesses"]
    assert live["database_writes"] == 0 and live["tafsir_accuracy_analysis_rows_for_surah_108"] == 0
    assert live["arabic"]["id"] == 13240 and live["arabic"]["sha256"] == "0c5c2323d19824e53fcf8821838df214033284a8ea65d94a3ff5e1aecea45857"
    assert live["english"]["id"] == 38031 and live["english"]["sha256"] == "a96d7aed0bccc235c2ab86c0eed60651d677ce70d41b89b26f196dbaeda59894"
    assert live["arabic"]["source_url_kind"] == live["english"]["source_url_kind"] == "legacy_numeric_source_identifier_not_url"
    spans = d["exact_q07c_spans"]
    assert spans["offset_convention"] == "zero_based_unicode_codepoints_half_open"
    ar, en = spans["arabic"], spans["english"]
    assert (ar["start_cp"], ar["end_cp"], ar["length_cp"], ar["position_1_based"]) == (1298, 1673, 375, 1299)
    assert (en["start_cp"], en["end_cp"], en["length_cp"], en["position_1_based"]) == (2289, 2965, 676, 2290)
    assert ar["sha256"] == "7280eb999d99d6fff24d072db8b80a0c9b47c58fa4996a8b5217c40281665a09"
    assert en["sha256"] == "39b22c9e3b6c6096a8f1c0304e169eae3d34eb41e7b3bd8aba2f3d541e86a397"
    q = d["qurtubi_voice_boundary"]
    assert q["stored_route_marker"] == "وعن علي رضي الله عنه قال"
    assert not q["stored_route_supplied_before_ali"] and not q["full_isnad_attested_in_stored_qurtubi"]
    assert q["reporter"] == "Ali ibn Abi Talib" and q["embedded_speakers"] == ["Prophet Muhammad", "Gabriel"]
    assert q["embedded_dialogue_is_not_a_transmission_chain"] and not q["qurtubi_adoption_established"]
    route = d["parallel_source_route"]
    assert route["common_core"] == ["Israel ibn Hatim al-Marwazi", "Muqatil ibn Hayyan", "al-Asbagh ibn Nubata", "Ali ibn Abi Talib"]
    assert route["route_state"] == "attested_in_parallel_sources_not_present_in_stored_qurtubi"
    assert not route["independent_upstream_routes_established"] and not route["may_be_imported_into_qurtubi_voice_chain"]
    src = {s["source_id"]: s for s in d["source_witnesses"]}
    assert set(src) == {"qurtubi_q07c", "thalabi_q07c", "ibn_abi_hatim_q07c", "hakim_q07c", "bayhaqi_q07c"}
    assert src["qurtubi_q07c"]["route_scope"] == "abridged_from_Ali_only"
    assert src["thalabi_q07c"]["route"][-4:] == route["common_core"]
    assert src["ibn_abi_hatim_q07c"]["route"][-4:] == route["common_core"]
    assert src["hakim_q07c"]["route"][-4:] == route["common_core"]
    assert src["bayhaqi_q07c"]["route"][-4:] == route["common_core"]
    assert "line 8" in src["qurtubi_q07c"]["locator"] and "line 22" in src["thalabi_q07c"]["locator"]
    assert "19508" in src["ibn_abi_hatim_q07c"]["locator"] and "3981" in src["hakim_q07c"]["locator"] and "2563" in src["bayhaqi_q07c"]["locator"]
    crit = {c["critic"]: c for c in d["critical_assessments"]}
    assert set(crit) == {"Ibn Kathir", "Ibn Hibban"}
    assert crit["Ibn Kathir"]["assessment_ar"] == "حديثا منكرا جدا"
    assert crit["Ibn Hibban"]["assessment_ar"] == "وهذا متن باطل إلا ذكر رفع اليدين فيه"
    assert "Umar ibn Subh" in crit["Ibn Hibban"]["additional_claim"]
    v = d["textual_variant_matrix"]
    assert v["bowing_action"]["qurtubi"] == "absent" and v["bowing_action"]["thalabi_and_ibn_abi_hatim"] == "present"
    assert v["prostration_action"]["qurtubi"] == "present" and v["prostration_action"]["hakim_and_bayhaqi_displayed_text"] == "absent"
    assert v["beauty_formula"]["qurtubi"] == "present" and v["beauty_formula"]["hakim_and_bayhaqi_displayed_text"] == "absent"
    assert v["prayer_entry_verb"]["ibn_abi_hatim_displayed_text"] == "تحزمت"
    tr = d["stored_translation_review"]
    assert tr["overall_alignment"] == "substantially_aligned_with_one_lexical_gloss_hold"
    assert tr["held_phrase_ar"] == "ما هذه النحيرة التي أمرني الله بها"
    assert "raising of hands" in tr["stored_phrase_en"] and "immediate reply" in tr["issue"]
    assert not tr["correction_proposed"] and not tr["silent_replacement_permitted"]
    assert tr["candidate_status"] == "lexical_and_human_review_required_not_for_database_use"
    f = d["fidelity_findings"]
    assert f["stored_qurtubi_report_attested"] and f["parallel_common_route_attested"]
    assert not f["parallel_route_present_in_stored_qurtubi"] and not f["parallel_witnesses_independent_above_common_core"]
    assert not f["qurtubi_adopts_report"] and not f["full_qurtubi_isnad_attested"]
    assert not f["embedded_dialogue_misclassified_as_isnad"]
    assert f["ibn_kathir_negative_assessment_preserved"] and f["ibn_hibban_negative_assessment_preserved"]
    assert f["material_matn_variants_preserved"] and f["stored_translation_lexical_hold_active"]
    assert f["historical_authenticity_conclusion"] == "negative_critical_assessments_recorded_no_new_adjudication"
    assert not f["publication_ready"]
    act = d["actions"]
    assert act["human_scholarly_approval"] == "pending" and not act["independent_human_review_observed"]
    assert all(not act[k] for k in ("live_database_written", "sql_executed", "pr_merged", "deployed"))
    assert act["publication_status"] == "not_published"
    assert d["unresolved_holds"] == [f"108-QURTUBI-SCHOLAR-H0{i}" for i in range(1, 9)]
    assert d["next_target"]["claim_id"] == "108-Q07-C"


check(D)
mutations = [
    ("publish", lambda x: x["actions"].__setitem__("publication_status", "published")),
    ("write", lambda x: x["actions"].__setitem__("live_database_written", True)),
    ("sql", lambda x: x["actions"].__setitem__("sql_executed", True)),
    ("approval", lambda x: x["actions"].__setitem__("human_scholarly_approval", "approved")),
    ("human_review", lambda x: x["actions"].__setitem__("independent_human_review_observed", True)),
    ("hold", lambda x: x["unresolved_holds"].pop()),
    ("hold_count", lambda x: x["baseline"].__setitem__("holds_cleared", 1)),
    ("complete", lambda x: x["baseline"].__setitem__("chapter_complete", True)),
    ("advance", lambda x: x["baseline"].__setitem__("advance_to_surah_107", True)),
    ("full_qurtubi_route", lambda x: x["qurtubi_voice_boundary"].__setitem__("full_isnad_attested_in_stored_qurtubi", True)),
    ("import_route", lambda x: x["parallel_source_route"].__setitem__("may_be_imported_into_qurtubi_voice_chain", True)),
    ("independent", lambda x: x["parallel_source_route"].__setitem__("independent_upstream_routes_established", True)),
    ("adoption", lambda x: x["fidelity_findings"].__setitem__("qurtubi_adopts_report", True)),
    ("dialogue_chain", lambda x: x["fidelity_findings"].__setitem__("embedded_dialogue_misclassified_as_isnad", True)),
    ("drop_ibn_kathir", lambda x: x["fidelity_findings"].__setitem__("ibn_kathir_negative_assessment_preserved", False)),
    ("drop_ibn_hibban", lambda x: x["fidelity_findings"].__setitem__("ibn_hibban_negative_assessment_preserved", False)),
    ("drop_variants", lambda x: x["fidelity_findings"].__setitem__("material_matn_variants_preserved", False)),
    ("clear_translation", lambda x: x["fidelity_findings"].__setitem__("stored_translation_lexical_hold_active", False)),
    ("propose", lambda x: x["stored_translation_review"].__setitem__("correction_proposed", True)),
    ("replace", lambda x: x["stored_translation_review"].__setitem__("silent_replacement_permitted", True)),
    ("auth", lambda x: x["fidelity_findings"].__setitem__("historical_authenticity_conclusion", "authenticated")),
    ("ready", lambda x: x["fidelity_findings"].__setitem__("publication_ready", True)),
    ("span", lambda x: x["exact_q07c_spans"]["arabic"].__setitem__("start_cp", 1299)),
    ("hash", lambda x: x["exact_q07c_spans"]["english"].__setitem__("sha256", "0" * 64)),
    ("url", lambda x: x["live_read_only_witnesses"]["arabic"].__setitem__("source_url_kind", "verified_url")),
    ("merge", lambda x: x["repository_state"].__setitem__("merged", True))
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
print(f"PASS: Qurtubi 108-Q07-C Ali/Gabriel route and text review; {len(mutations)}/{len(mutations)} unsafe mutations rejected; 0 writes; 48 holds active")

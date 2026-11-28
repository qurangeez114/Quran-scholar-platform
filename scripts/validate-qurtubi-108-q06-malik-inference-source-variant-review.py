#!/usr/bin/env python3
import copy
import hashlib
import json
from pathlib import Path

P = Path(__file__).parents[1] / "data/tafsir/staging/qurtubi-108-q06-malik-inference-source-variant-review-2026-11-21.json"
D = json.loads(P.read_text(encoding="utf-8"))


def check(d):
    assert d["schema_version"] == "qh-qurtubi-108-q06-malik-inference-source-variant-review-v1"
    assert d["claim_id"] == "108-Q06" and d["surah"] == 108 and d["ayah"] == 2
    r = d["repository_state"]
    assert r["pull_request"] == 470 and r["draft"] and not r["merged"]
    assert r["parent_head_sha"] == "e1819062cd3b9f2bb2e2f553c67c1b38b6d055a7"
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
    spans = d["exact_q06_spans"]
    ar, en = spans["arabic"], spans["english"]
    assert (ar["start_cp"], ar["end_cp"], ar["length_cp"], ar["position_1_based"]) == (909, 1031, 122, 910)
    assert (en["start_cp"], en["end_cp"], en["length_cp"], en["position_1_based"]) == (1657, 1851, 194, 1658)
    assert ar["occurrences"] == en["occurrences"] == 1
    assert len(ar["text"]) == 122 and len(en["text"]) == 194
    assert hashlib.sha256(ar["text"].encode()).hexdigest() == ar["sha256"] == "a0a6ac35cb19e5f85e7c96171cd03c1751cd5deefeb0bcdc15d87b6763b02a76"
    assert hashlib.sha256(en["text"].encode()).hexdigest() == en["sha256"] == "6d2023fdc5c5476252b65e79609bffe907d34f3e4460f94848786d60d977d80b"
    prior = d["prior_review_continuity"]
    assert prior["prior_voice_name"] == "Malik as reported by Ibn al-Arabi"
    assert "personal inference" in prior["required_refinement"]
    voice = d["nested_voice_boundary"]
    assert voice["outer_author"] == "al-Qurtubi" and voice["intermediate_reporting_source"] == "Ibn al-Arabi, Ahkam al-Quran"
    assert voice["quoted_speaker"] == "Malik ibn Anas"
    assert voice["negative_provenance_statement"] == "ma samitu fihi shayan"
    assert voice["inference_owner"] == "Malik ibn Anas" and voice["inference_status"] == "personal_reasoning_not_received_transmission"
    assert not voice["qurtubi_personal_adoption_established"] and not voice["ibn_al_arabi_personal_adoption_of_malik_inference_established"]
    assert not voice["full_isnad_for_malik_quote_attested"] and not voice["oral_route_beyond_nested_literary_attribution_permitted"]
    own = d["ibn_al_arabi_own_work_witness"]
    assert "صلاة الصبح يوم النحر" in own["exact_malik_passage"]
    assert own["ibn_al_arabi_own_preference_marker"] == "والذي عندي"
    assert own["ibn_al_arabi_own_preference"] == "اعبد ربك وانحر له"
    assert own["relationship_to_malik_inference"] == "reported_and_explained_but_not_adopted_as_own_preference"
    assert not own["full_isnad_for_malik_quote_attested"]
    var = d["material_source_variant"]
    assert var["omitted_in_qurtubi"] == "الصبح"
    assert "صلاة يوم النحر" in var["qurtubi_stored_text"] and "صلاة الصبح يوم النحر" in var["ibn_al_arabi_displayed_text"]
    assert var["stored_english_matches_stored_qurtubi"] and not var["stored_english_complete_against_ibn_al_arabi_own_witness"]
    assert not var["silent_import_or_assimilation_permitted"] and not var["edition_relationship_resolved"]
    assert not var["database_correction_proposed"] and var["resolution_status"] == "held_for_edition_or_manuscript_review"
    src = {s["source_id"]: s for s in d["source_locators"]}
    assert len(src) == 2 and "line 6" in src["qurtubi_q06"]["locator"] and "lines 4-10" in src["ibn_al_arabi_q06"]["locator"]
    f = d["fidelity_findings"]
    assert f["qurtubi_q06_source_attested"] and f["ibn_al_arabi_own_work_source_attested"]
    assert f["malik_is_quoted_speaker"] and f["ibn_al_arabi_is_intermediate_reporting_source"]
    assert f["malik_negative_transmission_claim_preserved"] and f["malik_personal_inference_preserved"]
    assert not f["malik_inference_is_transmitted_tafsir"] and not f["ibn_al_arabi_adopts_malik_inference"]
    assert f["ibn_al_arabi_separate_preference_preserved"] and f["material_dawn_prayer_variant_preserved"]
    assert f["stored_arabic_english_pair_aligned"] and not f["cross_source_completeness_resolved"]
    assert not f["silent_variant_assimilation_permitted"] and not f["oral_or_manuscript_route_reconstruction_permitted"]
    assert f["historical_authenticity_conclusion"] is None
    act = d["actions"]
    assert act["human_scholarly_approval"] == "pending" and not act["independent_human_review_observed"]
    assert all(not act[k] for k in ("live_database_written", "sql_executed", "pr_merged", "deployed"))
    assert act["publication_status"] == "not_published"
    assert d["unresolved_holds"] == [f"108-QURTUBI-SCHOLAR-H0{i}" for i in range(1, 9)]
    assert d["next_target"]["claim_id"] == "108-Q07"


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
    ("span", lambda x: x["exact_q06_spans"]["arabic"].__setitem__("start_cp", 910)),
    ("hash", lambda x: x["exact_q06_spans"]["english"].__setitem__("sha256", "0" * 64)),
    ("speaker", lambda x: x["nested_voice_boundary"].__setitem__("quoted_speaker", "Ibn al-Arabi")),
    ("transmitted", lambda x: x["fidelity_findings"].__setitem__("malik_inference_is_transmitted_tafsir", True)),
    ("adoption", lambda x: x["fidelity_findings"].__setitem__("ibn_al_arabi_adopts_malik_inference", True)),
    ("qurtubi_adoption", lambda x: x["nested_voice_boundary"].__setitem__("qurtubi_personal_adoption_established", True)),
    ("isnad", lambda x: x["nested_voice_boundary"].__setitem__("full_isnad_for_malik_quote_attested", True)),
    ("route", lambda x: x["nested_voice_boundary"].__setitem__("oral_route_beyond_nested_literary_attribution_permitted", True)),
    ("drop_variant", lambda x: x["fidelity_findings"].__setitem__("material_dawn_prayer_variant_preserved", False)),
    ("complete_cross", lambda x: x["fidelity_findings"].__setitem__("cross_source_completeness_resolved", True)),
    ("assimilate", lambda x: x["material_source_variant"].__setitem__("silent_import_or_assimilation_permitted", True)),
    ("edition", lambda x: x["material_source_variant"].__setitem__("edition_relationship_resolved", True)),
    ("correction", lambda x: x["material_source_variant"].__setitem__("database_correction_proposed", True)),
    ("auth", lambda x: x["fidelity_findings"].__setitem__("historical_authenticity_conclusion", "authenticated")),
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
print(f"PASS: Qurtubi 108-Q06 Malik nested quote and source-variant review; {len(mutations)}/{len(mutations)} unsafe mutations rejected; 0 writes; 48 holds active")

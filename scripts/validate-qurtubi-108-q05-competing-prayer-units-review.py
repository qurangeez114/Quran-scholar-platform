#!/usr/bin/env python3
import copy
import hashlib
import json
from pathlib import Path

P = Path(__file__).parents[1] / "data/tafsir/staging/qurtubi-108-q05-competing-prayer-units-review-2026-11-21.json"
D = json.loads(P.read_text(encoding="utf-8"))


def check(d):
    assert d["schema_version"] == "qh-qurtubi-108-q05-competing-prayer-units-review-v1"
    assert d["claim_id"] == "108-Q05" and d["surah"] == 108 and d["ayah"] == 2
    r = d["repository_state"]
    assert r["pull_request"] == 470 and r["draft"] and not r["merged"]
    assert r["parent_head_sha"] == "721955cd39c0e8ef3f722132200c13a2789865ac"
    assert r["conflicting_surah_108_tafsir_pull_requests"] == []
    assert r["parent_ci"]["conclusion"] == "success"
    b = d["baseline"]
    assert (b["six_scholar_claims"], b["qurtubi_claims"], b["active_chapter_holds"]) == (74, 23, 48)
    assert b["holds_cleared"] == b["publication_ready_claims_added"] == 0
    assert not b["chapter_complete"] and not b["advance_to_surah_107"]
    live = d["live_read_only_witnesses"]
    assert live["database_writes"] == 0 and live["tafsir_accuracy_analysis_rows_for_surah_108"] == 0
    assert live["arabic"]["id"] == 13240 and live["arabic"]["sha256"] == "0c5c2323d19824e53fcf8821838df214033284a8ea65d94a3ff5e1aecea45857"
    assert live["english"]["id"] == 38031 and live["english"]["sha256"] == "a96d7aed0bccc235c2ab86c0eed60651d677ce70d41b89b26f196dbaeda59894"
    assert live["arabic"]["source_url_kind"] == live["english"]["source_url_kind"] == "legacy_numeric_source_identifier_not_url"
    spans = d["cluster_spans"]
    assert (spans["arabic"]["start_cp"], spans["arabic"]["end_cp"], spans["arabic"]["length_cp"]) == (51, 508, 457)
    assert spans["arabic"]["sha256"] == "278486c39a5605824c61587f14d5206274d8e1f8b037aefb1eda41fddcac3065"
    assert (spans["english"]["start_cp"], spans["english"]["end_cp"], spans["english"]["length_cp"]) == (163, 965, 802)
    assert spans["english"]["sha256"] == "468b0aa84616207f1735146263b035c15519ebfd3e48438d345c7b4a7d756ba2"
    prior = d["prior_review_continuity"]
    assert prior["prior_status"] == "arabic_english_aligned"
    assert "Do not project this cluster as one originating voice" in prior["required_refinement"]
    units = d["source_local_units"]
    assert [u["subclaim_id"] for u in units] == [f"108-Q05-{x}" for x in "ABCDE"]
    assert len(units) == 5
    expected = {
        "108-Q05-A": ((51, 127, 76), (163, 298, 135), "aligned_at_proposition_and_reporting_link_scope"),
        "108-Q05-B": ((128, 199, 71), (299, 450, 151), "held_translation_number_and_coordination_error"),
        "108-Q05-C": ((200, 281, 81), (451, 596, 145), "aligned_reporter_and_report_scope"),
        "108-Q05-D": ((282, 360, 78), (597, 718, 121), "aligned_with_place_name_gloss_explicit"),
        "108-Q05-E": ((361, 507, 146), (719, 963, 244), "aligned_reporter_and_occasion_report_scope")
    }
    for u in units:
        ar, en, state = expected[u["subclaim_id"]]
        assert (u["arabic"]["start_cp"], u["arabic"]["end_cp"], u["arabic"]["length_cp"]) == ar
        assert (u["english"]["start_cp"], u["english"]["end_cp"], u["english"]["length_cp"]) == en
        assert len(u["arabic"]["text"]) == ar[2] and len(u["english"]["text"]) == en[2]
        assert hashlib.sha256(u["arabic"]["text"].encode()).hexdigest() == u["arabic"]["sha256"]
        assert hashlib.sha256(u["english"]["text"].encode()).hexdigest() == u["english"]["sha256"]
        assert u["fidelity_state"] == state
        assert not u["full_isnad_in_qurtubi"]
    a, bunit, c, dunit, e = units
    assert a["named_reporting_link"] == "al-Dahhak from Ibn Abbas"
    assert bunit["named_originating_authorities"] == ["Qatadah", "Ata", "Ikrimah"]
    assert bunit["error"]["arabic_control"] == "صلاة العيد"
    assert "two Festivals" in bunit["error"]["unsupported_english"]
    assert bunit["error"]["candidate_status"] == "staged_only_pending_human_review_and_edition_resolution"
    assert not bunit["error"]["database_correction_proposed"]
    assert c["reporter"] == "Anas" and not c["personal_interpretation_by_reporter_established"]
    assert dunit["named_originating_authority"] == "Said ibn Jubayr" and "Muzdalifah" in dunit["lexical_note"]
    assert e["reporter"] == "Said ibn Jubayr" and not e["personal_interpretation_by_reporter_established"]
    src = {s["source_id"]: s for s in d["source_locators"]}
    assert len(src) == 3
    assert "lines 3-6" in src["qurtubi_q05_digital"]["locator"]
    assert "lines 96-103" in src["qurtubi_q05_parallel_edition"]["locator"]
    assert "lines 35-42" in src["tabari_independent_report_collection"]["locator"]
    cross = d["cross_source_boundaries"]
    assert cross["tabari_parallel_reports_found"] and not cross["qurtubi_and_tabari_same_reporting_work"]
    assert not cross["tabari_isnads_may_be_attached_to_qurtubi_units"]
    assert cross["qurtubi_explicit_route_only"] == "al-Dahhak from Ibn Abbas"
    assert not cross["qurtubi_full_isnad_for_any_unit"] and not cross["independent_manuscript_ancestry_established"]
    f = d["fidelity_findings"]
    assert f["canonical_q05_is_verse_2_competing_prayer_cluster"] and f["previous_handoff_label_was_incorrect"]
    assert f["five_source_local_units_required"] and not f["one_cluster_originating_voice_permitted"]
    assert f["q05_a_aligned"] and not f["q05_b_aligned"] and f["q05_c_aligned"] and f["q05_d_aligned"] and f["q05_e_aligned"]
    assert not f["two_festivals_supported_by_arabic"] and f["anas_is_reporter_not_personal_interpreter"]
    assert f["said_occasion_report_separate_from_muzdalifa_interpretation"]
    assert not f["oral_chain_reconstruction_beyond_explicit_text_permitted"]
    assert not f["qurtubi_personal_adoption_of_any_q05_unit"] and f["historical_authenticity_conclusion"] is None
    act = d["actions"]
    assert act["human_scholarly_approval"] == "pending" and not act["independent_human_review_observed"]
    assert all(not act[k] for k in ("live_database_written", "sql_executed", "pr_merged", "deployed"))
    assert act["publication_status"] == "not_published"
    assert d["unresolved_holds"] == [f"108-QURTUBI-SCHOLAR-H0{i}" for i in range(1, 9)]
    assert d["next_target"]["claim_id"] == "108-Q06"


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
    ("span", lambda x: x["cluster_spans"]["arabic"].__setitem__("start_cp", 52)),
    ("unit_count", lambda x: x["source_local_units"].pop()),
    ("group_voice", lambda x: x["fidelity_findings"].__setitem__("one_cluster_originating_voice_permitted", True)),
    ("q05b_aligned", lambda x: x["fidelity_findings"].__setitem__("q05_b_aligned", True)),
    ("plural_supported", lambda x: x["fidelity_findings"].__setitem__("two_festivals_supported_by_arabic", True)),
    ("anas_origin", lambda x: x["source_local_units"][2].__setitem__("personal_interpretation_by_reporter_established", True)),
    ("said_origin", lambda x: x["source_local_units"][4].__setitem__("personal_interpretation_by_reporter_established", True)),
    ("full_isnad", lambda x: x["source_local_units"][1].__setitem__("full_isnad_in_qurtubi", True)),
    ("attach_tabari", lambda x: x["cross_source_boundaries"].__setitem__("tabari_isnads_may_be_attached_to_qurtubi_units", True)),
    ("same_work", lambda x: x["cross_source_boundaries"].__setitem__("qurtubi_and_tabari_same_reporting_work", True)),
    ("route", lambda x: x["fidelity_findings"].__setitem__("oral_chain_reconstruction_beyond_explicit_text_permitted", True)),
    ("adoption", lambda x: x["fidelity_findings"].__setitem__("qurtubi_personal_adoption_of_any_q05_unit", True)),
    ("auth", lambda x: x["fidelity_findings"].__setitem__("historical_authenticity_conclusion", "authenticated")),
    ("correction", lambda x: x["source_local_units"][1]["error"].__setitem__("database_correction_proposed", True)),
    ("url", lambda x: x["live_read_only_witnesses"]["arabic"].__setitem__("source_url_kind", "verified_url")),
    ("merge", lambda x: x["repository_state"].__setitem__("merged", True)),
    ("hash", lambda x: x["source_local_units"][0]["arabic"].__setitem__("sha256", "0" * 64))
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
print(f"PASS: Qurtubi 108-Q05 five-unit attribution and translation review; {len(mutations)}/{len(mutations)} unsafe mutations rejected; 0 writes; 48 holds active")

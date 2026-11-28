#!/usr/bin/env python3
import copy
import json
from pathlib import Path

P = Path(__file__).parents[1] / "data/tafsir/staging/qurtubi-108-q07-atomic-voice-source-variant-review-2026-11-21.json"
D = json.loads(P.read_text(encoding="utf-8"))


def check(d):
    assert d["schema_version"] == "qh-qurtubi-108-q07-atomic-voice-source-variant-review-v1"
    assert d["claim_id"] == "108-Q07" and d["surah"] == 108 and d["ayah"] == 2
    r = d["repository_state"]
    assert r["pull_request"] == 470 and r["draft"] and not r["merged"]
    assert r["parent_head_sha"] == "b5616ccb5d5b65f22cb11cd0dc02f9ebf1d695"
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
    spans = d["exact_q07_outer_spans"]
    assert spans["offset_convention"] == "zero_based_unicode_codepoints_half_open"
    ar, en = spans["arabic"], spans["english"]
    assert (ar["start_cp"], ar["end_cp"], ar["length_cp"], ar["position_1_based"]) == (1031, 2160, 1129, 1032)
    assert (en["start_cp"], en["end_cp"], en["length_cp"], en["position_1_based"]) == (1851, 3839, 1988, 1852)
    assert ar["sha256"] == "0f73a8d06a5f1dbe285edb0db67813c6dc94a13dae082a8edc9d5ac48784e824"
    assert en["sha256"] == "34151154f62edfe26534a25719dec5bf8271177833b15d0b9b991dddb4bbf418"
    prior = d["prior_review_continuity"]
    assert "mixed voice cluster" in prior["required_refinement"] and "eight bounded evidence units" in prior["required_refinement"]
    units = {u["unit_id"]: u for u in d["atomic_voice_units"]}
    assert set(units) == {f"108-Q07-{x}" for x in "ABCDEFGH"}
    assert [a["name"] for a in units["108-Q07-A"]["authorities"]] == ["Ali ibn Abi Talib", "Muhammad ibn Ka'b", "Ibn Abbas"]
    assert units["108-Q07-A"]["authorities"][2]["marker"] == "وروي عن"
    assert [a["name"] for a in units["108-Q07-B"]["authorities"]] == ["Ali ibn Abi Talib", "Ja'far ibn Ali"]
    c = units["108-Q07-C"]
    assert [a["role"] for a in c["authorities"]] == ["reporter_of_prophetic_gabriel_dialogue", "questioner_in_embedded_dialogue", "speaker_in_embedded_dialogue"]
    assert not c["full_isnad_attested"] and c["historical_authenticity_conclusion"] is None and not c["qurtubi_adoption_established"]
    dunit = units["108-Q07-D"]
    assert dunit["chain_scope"] == "Abu_Salih_from_Ibn_Abbas_only"
    assert [a["name"] for a in dunit["authorities"]] == ["Abu Salih", "Ibn Abbas", "al-Farra", "al-Kalbi", "Abu al-Ahwas"]
    assert units["108-Q07-E"]["authorities"][1]["name"] == "unnamed Arabs" and not units["108-Q07-E"]["is_quranic_tafsir_chain"]
    assert units["108-Q07-F"]["authorities"][0]["name"] == "Ibn al-A'rabi (lexicographer)"
    assert "not Ibn al-Arabi" in units["108-Q07-F"]["disambiguation"]
    assert units["108-Q07-G"]["authorities"][0]["route"] == "passive_report_route_not_supplied"
    assert units["108-Q07-H"]["authorities"][0]["name"] == "Sulayman al-Taymi"
    for uid in ("108-Q07-A", "108-Q07-B", "108-Q07-C", "108-Q07-D", "108-Q07-G", "108-Q07-H"):
        assert not units[uid]["qurtubi_adoption_established"]
    cross = d["cross_source_boundaries"]
    ia = cross["ibn_al_arabi_ahkam"]
    assert len(ia["differences_from_stored_qurtubi"]) == 3
    assert any("Abu al-Jawza" in x for x in ia["differences_from_stored_qurtubi"])
    assert any("Muhammad ibn Ka'b" in x for x in ia["differences_from_stored_qurtubi"])
    assert any("Ja'far ibn Ali" in x for x in ia["differences_from_stored_qurtubi"])
    assert not ia["silent_assimilation_permitted"] and not ia["edition_relationship_resolved"]
    tab = cross["tabari_jami_al_bayan"]
    assert not tab["named_q07_hand_placement_or_hand_raising_route_attested"]
    assert not tab["named_qibla_authority_attested"]
    assert "sincerely to God" in tab["tabari_preferred_reading"]
    src = {s["source_id"]: s for s in d["source_locators"]}
    assert set(src) == {"qurtubi_q07", "ibn_al_arabi_q07", "tabari_q07"}
    assert "lines 6-10" in src["qurtubi_q07"]["locator"]
    assert "lines 5-7" in src["ibn_al_arabi_q07"]["locator"]
    assert "lines 42-45" in src["tabari_q07"]["locator"]
    f = d["fidelity_findings"]
    assert f["qurtubi_q07_source_attested"] and f["stored_arabic_english_pair_aligned_at_bounded_scope"]
    assert not f["current_mixed_voice_cluster_safe_for_publication"] and f["atomic_voice_split_required"]
    assert f["direct_and_passive_report_markers_preserved"] and f["abu_salih_chain_limited_to_ibn_abbas_qibla_unit"]
    assert not f["ali_gabriel_report_full_isnad_attested"] and not f["qurtubi_adopts_any_q07_alternative"]
    assert f["ibn_al_arabi_variant_preserved_separately"] and not f["tabari_supplies_named_qurtubi_routes"]
    assert not f["silent_cross_source_assimilation_permitted"] and f["historical_authenticity_conclusion"] is None
    act = d["actions"]
    assert act["human_scholarly_approval"] == "pending" and not act["independent_human_review_observed"]
    assert all(not act[k] for k in ("live_database_written", "sql_executed", "pr_merged", "deployed"))
    assert act["publication_status"] == "not_published"
    assert d["unresolved_holds"] == [f"108-QURTUBI-SCHOLAR-H0{i}" for i in range(1, 9)]
    assert d["next_target"]["claim_id"] == "108-Q07-H"
    if d["next_target"]["claim_id"] == "108-Q07-E":
        review = d["bounded_revalidation_q07d"]
        assert review["claim_id"] == "108-Q07-D"
        assert review["exact_q07d_span"]["coordinate_system"] == "zero-based Unicode code points, half-open [start,end)"
        assert (review["exact_q07d_span"]["arabic"]["start_cp"], review["exact_q07d_span"]["arabic"]["end_cp"], review["exact_q07d_span"]["arabic"]["length_cp"]) == (1673, 1761, 88)
        assert (review["exact_q07d_span"]["english"]["start_cp"], review["exact_q07d_span"]["english"]["end_cp"], review["exact_q07d_span"]["english"]["length_cp"]) == (2965, 3103, 138)
        assert review["attribution_boundary"]["explicit_route_in_this_unit"] == ["Abu Salih", "Ibn Abbas"]
        assert review["publication_gate"]["owner_direction_to_publish_recorded"]
        assert not review["publication_gate"]["independent_human_scholarly_review_observed"]
        assert not review["publication_gate"]["production_database_write_performed"]
        assert review["baseline"]["active_holds"] == 48 and review["baseline"]["holds_cleared"] == 0
    if d["next_target"]["claim_id"] == "108-Q07-F":
        reviewd = d["bounded_revalidation_q07d"]
        assert not reviewd["publication_gate"]["independent_human_scholarly_review_observed"]
        assert not reviewd["publication_gate"]["production_database_write_performed"]
        review = d["bounded_revalidation_q07e"]
        assert review["claim_id"] == "108-Q07-E"
        assert review["exact_q07e_span"]["coordinate_system"] == "zero-based Unicode code points, half-open [start,end)"
        assert (review["exact_q07e_span"]["arabic"]["start_cp"], review["exact_q07e_span"]["arabic"]["end_cp"], review["exact_q07e_span"]["arabic"]["length_cp"]) == (1840, 1935, 95)
        assert (review["exact_q07e_span"]["english"]["start_cp"], review["exact_q07e_span"]["english"]["end_cp"], review["exact_q07e_span"]["english"]["length_cp"]) == (3275, 3447, 172)
        assert review["attribution_boundary"]["outer_author"] == "al-Qurtubi"
        assert review["attribution_boundary"]["lexicographer_reporter"] == "al-Farra"
        assert review["attribution_boundary"]["informants"] == "unnamed Arabs"
        assert review["attribution_boundary"]["lexical_example_is_not_isnad"]
        assert review["variant_handling"]["not_imported_into_qurtubi_text"]
        assert not review["primary_witness_status"]["al_farra_maani_direct_witness_opened"]
        assert review["baseline"]["active_holds"] == 48
        assert not review["publication_gate"]["independent_human_scholarly_review_observed"]
        assert not review["publication_gate"]["production_database_write_performed"]


    for key in ("bounded_revalidation_q07d", "bounded_revalidation_q07e"):
        gate = d[key]["publication_gate"]
        assert gate["independent_human_scholarly_review_observed"] is False
        assert gate["production_database_write_performed"] is False
        assert gate["pr_merged"] is False and gate["deployed"] is False
    reviewf = d["bounded_revalidation_q07f"]
    assert reviewf["claim_id"] == "108-Q07-F"
    assert reviewf["repository_state"]["latest_main_sha_observed"] == "e1f4c53bc3c47a728505dc0f601026f4d765eb12"
    assert reviewf["repository_state"]["head_sha_before_this_checkpoint"] == "c8436fc77922c588fde140f5510f96860fc2d77d"
    assert reviewf["repository_state"]["review_submissions"] == 0
    assert reviewf["repository_state"]["competing_open_surah_108_tafsir_prs"] == 0
    assert reviewf["live_read_only_rows"]["writes"] == 0 and reviewf["live_read_only_rows"]["tafsir_accuracy_analysis_rows_for_surah_108"] == 0
    ar_f, en_f = reviewf["exact_q07f_span"]["arabic"], reviewf["exact_q07f_span"]["english"]
    assert (ar_f["entry_id"], ar_f["start_cp"], ar_f["end_cp"], ar_f["length_cp"], ar_f["span_md5"]) == (13240, 1935, 2037, 102, "ebda3a4ab8e6997588f7a5b7fee39699")
    assert (en_f["entry_id"], en_f["start_cp"], en_f["end_cp"], en_f["length_cp"], en_f["span_md5"]) == (38031, 3447, 3621, 174, "73920b6c922f49d03a288fe4fdde2c12")
    assert ar_f["span_sha256"] == "90bf52f614c87db2546df5ffba2b2bf2cc7c774bcf82c75edd94c7ca6f2042f0"
    assert en_f["span_sha256"] == "40b55663682a76a8264a82d80d0f587a081756033fdf737314f5cb62d81bcfba"
    assert "ابن الأعرابي" in ar_f["source_text"] and "Ibn al-A'rabi" in en_f["source_text"]
    assert reviewf["attribution_boundary"]["quoted_authority_as_written"] == "Ibn al-A'rabi (ابن الأعرابي)"
    assert reviewf["attribution_boundary"]["route"] == "not supplied in this passage"
    assert not reviewf["attribution_boundary"]["isnad_claimed"] and not reviewf["attribution_boundary"]["qurtubi_adoption_established"]
    assert reviewf["attribution_boundary"]["not_the_jurist"].startswith("Abu Bakr Ibn al-Arabi")
    assert reviewf["variant_and_provenance_handling"]["direct_dependence_of_qurtubi_on_lisan_established"] is False
    assert reviewf["variant_and_provenance_handling"]["no_text_or_spelling_change_proposed"] is True
    reviewg = d["bounded_revalidation_q07g"]
    assert reviewg["claim_id"] == "108-Q07-G"
    assert reviewg["repository_state"]["latest_main_sha_observed"] == "e1f4c53bc3c47a728505dc0f601026f4d765eb12"
    assert reviewg["repository_state"]["head_sha_before_this_checkpoint"] == "c8297be9f71edf8dd79e512e4f1adb50097a5f6e"
    assert reviewg["live_read_only_rows"]["writes"] == 0 and reviewg["live_read_only_rows"]["tafsir_accuracy_analysis_rows_for_surah_108"] == 0
    ar_g, en_g = reviewg["exact_q07g_span"]["arabic"], reviewg["exact_q07g_span"]["english"]
    assert (ar_g["entry_id"],ar_g["start_cp"],ar_g["end_cp"],ar_g["length_cp"],ar_g["span_md5"]) == (13240,2037,2105,68,"044b270aa900156102a302033e7a374b")
    assert (en_g["entry_id"],en_g["start_cp"],en_g["end_cp"],en_g["length_cp"],en_g["span_md5"]) == (38031,3621,3754,133,"c27cbde382dccafa41fc35a9e67b7a12")
    assert "وروي عن عطاء" in ar_g["source_text"] and "It is narrated from Ata" in en_g["source_text"]
    assert reviewg["attribution_boundary"]["transmission_route"] == "not supplied in this passage"
    assert reviewg["attribution_boundary"]["isnad_claimed"] is False and reviewg["attribution_boundary"]["qurtubi_adoption_established"] is False
    assert reviewg["baseline"]["active_holds"] == 48 and reviewg["baseline"]["holds_cleared"] == 0
    assert reviewg["publication_gate"]["independent_human_scholarly_review_observed"] is False
    assert reviewg["publication_gate"]["production_database_write_performed"] is False
    assert reviewg["publication_gate"]["pr_merged"] is False and reviewg["publication_gate"]["deployed"] is False
    assert {x["source_id"] for x in reviewg["source_anchors"]} == {"qurtubi_q07g","qurtubi_print_edition_q07g","live_qurtubi_arabic_q07g","live_qurtubi_english_q07g"}
    source_ids = {x["source_id"] for x in reviewf["source_anchors"]}
    assert {"qurtubi_q07f", "lisan_al_arab_nahr", "ibn_al_arabi_lexicographer_biography", "ibn_al_arabi_jurist_biography", "live_qurtubi_arabic_q07f", "live_qurtubi_english_q07f"} == source_ids
    assert reviewf["baseline"]["active_holds"] == 48 and reviewf["baseline"]["holds_cleared"] == 0
    assert reviewf["publication_gate"]["owner_direction_to_publish_recorded"] is True
    assert reviewf["publication_gate"]["independent_human_scholarly_review_observed"] is False
    assert reviewf["publication_gate"]["production_database_write_performed"] is False
    assert reviewf["publication_gate"]["pr_merged"] is False and reviewf["publication_gate"]["deployed"] is False


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
    ("safe", lambda x: x["fidelity_findings"].__setitem__("current_mixed_voice_cluster_safe_for_publication", True)),
    ("no_split", lambda x: x["fidelity_findings"].__setitem__("atomic_voice_split_required", False)),
    ("isnad", lambda x: x["fidelity_findings"].__setitem__("ali_gabriel_report_full_isnad_attested", True)),
    ("adoption", lambda x: x["fidelity_findings"].__setitem__("qurtubi_adopts_any_q07_alternative", True)),
    ("assimilation", lambda x: x["fidelity_findings"].__setitem__("silent_cross_source_assimilation_permitted", True)),
    ("edition", lambda x: x["cross_source_boundaries"]["ibn_al_arabi_ahkam"].__setitem__("edition_relationship_resolved", True)),
    ("tabari_route", lambda x: x["cross_source_boundaries"]["tabari_jami_al_bayan"].__setitem__("named_q07_hand_placement_or_hand_raising_route_attested", True)),
    ("chain_broaden", lambda x: x["atomic_voice_units"][3].__setitem__("chain_scope", "all_named_authorities")),
    ("merge_voices", lambda x: x["atomic_voice_units"].pop()),
    ("ibn_confusion", lambda x: x["atomic_voice_units"][5]["authorities"][0].__setitem__("name", "Ibn al-Arabi (jurist)")),
    ("auth", lambda x: x["fidelity_findings"].__setitem__("historical_authenticity_conclusion", "authenticated")),
    ("span", lambda x: x["exact_q07_outer_spans"]["arabic"].__setitem__("start_cp", 1032)),
    ("hash", lambda x: x["exact_q07_outer_spans"]["english"].__setitem__("sha256", "0" * 64)),
    ("url", lambda x: x["live_read_only_witnesses"]["arabic"].__setitem__("source_url_kind", "verified_url")),
    ("merge", lambda x: x["repository_state"].__setitem__("merged", True)),
    ("review_gate", lambda x: x["bounded_revalidation_q07d"]["publication_gate"].__setitem__("independent_human_scholarly_review_observed", True)),
    ("q07f_published", lambda x: x["bounded_revalidation_q07f"]["publication_gate"].__setitem__("pr_merged", True)),
    ("q07f_route", lambda x: x["bounded_revalidation_q07f"]["attribution_boundary"].__setitem__("route", "full_isnad")),
    ("q07f_identity", lambda x: x["bounded_revalidation_q07f"]["attribution_boundary"].__setitem__("quoted_authority_as_written", "Ibn al-Arabi (jurist)")),
    ("q07f_holds", lambda x: x["bounded_revalidation_q07f"]["baseline"].__setitem__("holds_cleared", 1)),
    ("q07g_route", lambda x: x["bounded_revalidation_q07g"]["attribution_boundary"].__setitem__("transmission_route", "full_isnad")),
    ("q07g_publish", lambda x: x["bounded_revalidation_q07g"]["publication_gate"].__setitem__("pr_merged", True))
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
print(f"PASS: Qurtubi 108-Q07 atomic voice/source-variant review; {len(mutations)}/{len(mutations)} unsafe mutations rejected; 0 writes; 48 holds active")


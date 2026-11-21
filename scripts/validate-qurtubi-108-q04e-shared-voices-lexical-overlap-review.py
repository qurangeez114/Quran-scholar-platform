#!/usr/bin/env python3
import copy
import hashlib
import json
from pathlib import Path

P = Path(__file__).parents[1] / "data/tafsir/staging/qurtubi-108-q04e-shared-voices-lexical-overlap-review-2026-11-21.json"
D = json.loads(P.read_text(encoding="utf-8"))


def span_ok(s, start, end, length, digest):
    assert (s["start_cp"], s["end_cp"], s["length_cp"]) == (start, end, length)
    assert s["occurrences"] == 1 and len(s["text"]) == length
    assert hashlib.sha256(s["text"].encode()).hexdigest() == s["sha256"] == digest


def check(d):
    assert d["schema_version"] == "qh-qurtubi-108-q04e-shared-voices-lexical-overlap-review-v1"
    assert d["claim_id"] == "108-Q04E" and d["surah"] == 108 and d["ayah"] == 1
    r = d["repository_state"]
    assert r["pull_request"] == 470 and r["draft"] and not r["merged"]
    assert r["conflicting_surah_108_tafsir_pull_requests"] == []
    b = d["baseline"]
    assert (b["six_scholar_claims"], b["qurtubi_claims"], b["active_chapter_holds"]) == (74, 23, 48)
    assert b["holds_cleared"] == b["publication_ready_claims_added"] == 0
    assert not b["chapter_complete"] and not b["advance_to_surah_107"]
    live = d["live_read_only_witnesses"]
    assert live["database_writes"] == 0 and live["tafsir_accuracy_analysis_rows_for_surah_108"] == 0
    assert live["arabic"]["id"] == 13239 and live["arabic"]["md5"] == "d813e9174d86a6f60a76cb2d88d67a0c"
    assert live["english"]["id"] == 38030 and live["english"]["md5"] == "a2ed72b9348cbf3c4fbcfff5e7567bb7"
    assert live["arabic"]["source_url_kind"] == live["english"]["source_url_kind"] == "legacy_numeric_source_identifier_not_url"
    span_ok(d["exact_q04e_arabic_span"], 2303, 2382, 79, "469e49d169d2bf6f9a76bc117e092c911deeb6d648a1726e232d2255ab04dfaf")
    pair = d["lexical_overlap_pair"]
    span_ok(pair["arabic"], 646, 690, 44, "9e5317be51e7264fc5f2840e915ff06c474ab5cb22d89501bf811e1734f72689")
    span_ok(pair["english"], 1246, 1309, 63, "f4d5db831b42c2de9d68c6e1a3a767bacfa7d1806b9fe52548b994fd1e6e0ad4")
    assert pair["aligned_to_each_other"] and not pair["evidence_for_q04e_numbered_attribution"]
    assert len(pair["why_not_q04e"]) == 4
    tc = d["translation_coverage"]
    assert not tc["q04e_numbered_interpretation_translated"] and tc["overlapping_lexical_meaning_translated"]
    assert tc["corrected_precise_label"] == "q04e_numbered_attribution_absent_with_separately_aligned_lexical_overlap"
    voice = d["voice_and_claim_boundary"]
    assert voice["distinct_voice_records_required"] == ["Abu Bakr ibn Ayyash", "Yaman ibn Ri'ab"]
    assert not voice["concatenated_single_person_permitted"]
    assert not voice["joint_transmission_route_attested"] and not voice["individual_transmission_routes_attested"]
    assert voice["status_within_qurtubi"] == "reported_only_not_preferred" and not voice["rejected_by_qurtubi"]
    src = {s["source_id"]: s for s in d["source_locators"]}
    assert len(src) == 5
    assert "printed page 521" in src["qurtubi_edition_q04e"]["locator"]
    assert "Abu Bakr ibn Ayyash alone" in src["mawardi_narrower_variant"]["differences_from_qurtubi"]
    assert "not the community" in src["wahidi_basit_variant"]["differences_from_qurtubi"]
    assert "not normalized" in src["thalabi_edition_name_variants"]["differences_from_qurtubi"]
    f = d["fidelity_findings"]
    assert f["qurtubi_shared_view_two_names_source_attested"] and f["two_distinct_voice_records_required"]
    assert f["english_lexical_overlap_false_positive_documented"] and f["q04e_numbered_attribution_english_absent"]
    assert f["lexical_definition_bilingual_alignment_preserved"] and f["ummah_present_in_q04e_but_absent_from_lexical_pair"]
    assert not f["name_variants_resolved"] and not f["silent_name_normalization_permitted"]
    assert not f["source_relationship_or_independence_proven"] and f["historical_authenticity_conclusion"] is None
    assert not f["route_reconstruction_permitted"]
    a = d["actions"]
    assert a["human_scholarly_approval"] == "pending" and not a["independent_human_review_observed"]
    assert all(not a[k] for k in ("live_database_written", "sql_executed", "pr_merged", "deployed"))
    assert a["publication_status"] == "not_published"
    assert d["unresolved_holds"] == [f"108-QURTUBI-SCHOLAR-H0{i}" for i in range(1, 9)]
    assert d["next_target"]["claim_id"] == "108-Q04G"


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
    ("span", lambda x: x["exact_q04e_arabic_span"].__setitem__("start_cp", 2304)),
    ("hash", lambda x: x["exact_q04e_arabic_span"].__setitem__("sha256", "0" * 64)),
    ("lexical_hash", lambda x: x["lexical_overlap_pair"]["english"].__setitem__("sha256", "0" * 64)),
    ("false_alignment", lambda x: x["lexical_overlap_pair"].__setitem__("evidence_for_q04e_numbered_attribution", True)),
    ("q04e_translated", lambda x: x["translation_coverage"].__setitem__("q04e_numbered_interpretation_translated", True)),
    ("single_person", lambda x: x["voice_and_claim_boundary"].__setitem__("concatenated_single_person_permitted", True)),
    ("joint_route", lambda x: x["voice_and_claim_boundary"].__setitem__("joint_transmission_route_attested", True)),
    ("preferred", lambda x: x["voice_and_claim_boundary"].__setitem__("status_within_qurtubi", "preferred")),
    ("variants_resolved", lambda x: x["fidelity_findings"].__setitem__("name_variants_resolved", True)),
    ("normalize_names", lambda x: x["fidelity_findings"].__setitem__("silent_name_normalization_permitted", True)),
    ("source_link", lambda x: x["fidelity_findings"].__setitem__("source_relationship_or_independence_proven", True)),
    ("auth", lambda x: x["fidelity_findings"].__setitem__("historical_authenticity_conclusion", "authenticated")),
    ("route", lambda x: x["fidelity_findings"].__setitem__("route_reconstruction_permitted", True)),
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
print(f"PASS: Qurtubi 108-Q04E shared voices and lexical overlap review; {len(mutations)}/{len(mutations)} unsafe mutations rejected; 0 writes; 48 holds active")

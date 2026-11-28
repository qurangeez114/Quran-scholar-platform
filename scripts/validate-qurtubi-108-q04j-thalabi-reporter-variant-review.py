#!/usr/bin/env python3
import copy
import hashlib
import json
from pathlib import Path

P = Path(__file__).parents[1] / "data/tafsir/staging/qurtubi-108-q04j-thalabi-reporter-variant-review-2026-11-21.json"
D = json.loads(P.read_text(encoding="utf-8"))


def check(d):
    assert d["schema_version"] == "qh-qurtubi-108-q04j-thalabi-reporter-variant-review-v1"
    assert d["claim_id"] == "108-Q04J" and d["surah"] == 108 and d["ayah"] == 1
    r = d["repository_state"]
    assert r["pull_request"] == 470 and r["draft"] and not r["merged"]
    assert r["conflicting_surah_108_tafsir_pull_requests"] == []
    assert r["parent_ci"]["conclusion"] == "success"
    b = d["baseline"]
    assert (b["six_scholar_claims"], b["qurtubi_claims"], b["active_chapter_holds"]) == (74, 23, 48)
    assert b["holds_cleared"] == b["publication_ready_claims_added"] == 0
    assert not b["chapter_complete"] and not b["advance_to_surah_107"]
    live = d["live_read_only_witnesses"]
    assert live["database_writes"] == 0 and live["tafsir_accuracy_analysis_rows_for_surah_108"] == 0
    assert live["arabic"]["id"] == 13239 and live["arabic"]["md5"] == "d813e9174d86a6f60a76cb2d88d67a0c"
    assert live["english"]["id"] == 38030 and live["english"]["md5"] == "a2ed72b9348cbf3c4fbcfff5e7567bb7"
    assert live["arabic"]["source_url_kind"] == live["english"]["source_url_kind"] == "legacy_numeric_source_identifier_not_url"
    span = d["exact_q04j_arabic_span"]
    assert (span["start_cp"], span["end_cp"], span["length_cp"], span["position_1_based"]) == (2549, 2628, 79, 2550)
    assert span["occurrences"] == 1 and len(span["text"]) == 79
    assert hashlib.sha256(span["text"].encode()).hexdigest() == span["sha256"] == "c8fed53738d0cca7d5057c10a666b29e5b8b3a15d3ecb481bcfadf2bc5ec9747"
    en = d["stored_english_coverage"]
    assert not en["q04j_numbered_interpretation_translated"]
    assert all(en[k] == 0 for k in ("thalabi_occurrences_case_insensitive", "miracle_occurrences_case_insensitive", "miracles_occurrences_case_insensitive", "twelfth_occurrences_case_insensitive", "guided_occurrences_case_insensitive", "those_responding_occurrences_case_insensitive"))
    assert {k: v["occurrences"] for k, v in en["false_positive_lexemes"].items()} == {"call": 1, "lord": 2}
    assert all(not v["q04j_evidence"] for v in en["false_positive_lexemes"].values())
    assert en["correct_translation_state"] == "q04j_numbered_interpretation_absent_false_positive_english_lexemes_excluded"
    prior = d["prior_review_continuity"]
    assert prior["prior_originating_voice_name"] == "al-Tha'labi"
    assert "no originating authority" in prior["required_refinement"]
    voice = d["voice_and_claim_boundary"]
    assert voice["qurtubi_origin_marker"] == "qila_unnamed"
    assert voice["named_reporting_source"] == "al-Tha'labi" and voice["originating_authority"] is None
    assert not voice["personal_adoption_by_al_thalabi_established"] and not voice["oral_transmission_chain_attested_for_this_view"]
    assert voice["literary_reporting_relationship_attested"] and not voice["manuscript_or_copying_route_attested"]
    assert voice["status_within_qurtubi"] == "reported_only_not_preferred" and not voice["rejected_by_qurtubi"]
    own = d["thalabi_own_work_boundary"]
    assert own["view_present"] and own["source_local_number"] is None and own["origin_marker"] == "qila_unnamed"
    assert own["named_prior_authority"] is None and own["attached_isnad"] is None and not own["personal_origin_or_adoption_proven"]
    var = d["wording_variant"]
    assert "الرب هدي" in var["qurtubi_text"] and "أكثرت" in var["thalabi_displayed_edition_text"]
    assert len(var["material_differences"]) == 3
    assert not var["silent_normalization_permitted"] and not var["edition_relationship_resolved"]
    src = {s["source_id"]: s for s in d["source_locators"]}
    assert len(src) == 4
    assert "printed page 310" in src["thalabi_own_work_print"]["locator"]
    assert "printed page 193" in src["qurtubi_q04j"]["locator"]
    f = d["fidelity_findings"]
    assert f["qurtubi_q04j_source_attested"] and f["qurtubi_names_al_thalabi_as_reporting_source"]
    assert f["qurtubi_originating_authority_is_unnamed"] and f["thalabi_work_contains_related_view"]
    assert not f["thalabi_work_names_originating_authority"] and not f["thalabi_personal_adoption_proven"]
    assert f["literary_reporting_relationship_attested"] and not f["oral_or_manuscript_route_reconstruction_permitted"]
    assert f["material_wording_variant_preserved"] and not f["silent_variant_assimilation_permitted"]
    assert f["stored_english_absence_correctly_classified"] and f["false_positive_english_lexemes_excluded"]
    assert not f["qurtubi_preferred_this_view"] and f["historical_authenticity_conclusion"] is None
    a = d["actions"]
    assert a["human_scholarly_approval"] == "pending" and not a["independent_human_review_observed"]
    assert all(not a[k] for k in ("live_database_written", "sql_executed", "pr_merged", "deployed"))
    assert a["publication_status"] == "not_published"
    assert d["unresolved_holds"] == [f"108-QURTUBI-SCHOLAR-H0{i}" for i in range(1, 9)]
    assert d["next_target"]["claim_id"] == "108-Q05"


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
    ("span", lambda x: x["exact_q04j_arabic_span"].__setitem__("start_cp", 2550)),
    ("hash", lambda x: x["exact_q04j_arabic_span"].__setitem__("sha256", "0" * 64)),
    ("english_present", lambda x: x["stored_english_coverage"].__setitem__("q04j_numbered_interpretation_translated", True)),
    ("false_positive", lambda x: x["stored_english_coverage"]["false_positive_lexemes"]["lord"].__setitem__("q04j_evidence", True)),
    ("origin", lambda x: x["voice_and_claim_boundary"].__setitem__("originating_authority", "al-Tha'labi")),
    ("adoption", lambda x: x["voice_and_claim_boundary"].__setitem__("personal_adoption_by_al_thalabi_established", True)),
    ("oral", lambda x: x["voice_and_claim_boundary"].__setitem__("oral_transmission_chain_attested_for_this_view", True)),
    ("attached_isnad", lambda x: x["thalabi_own_work_boundary"].__setitem__("attached_isnad", ["invented"])),
    ("number", lambda x: x["thalabi_own_work_boundary"].__setitem__("source_local_number", 12)),
    ("normalize", lambda x: x["wording_variant"].__setitem__("silent_normalization_permitted", True)),
    ("edition_resolved", lambda x: x["wording_variant"].__setitem__("edition_relationship_resolved", True)),
    ("named_origin", lambda x: x["fidelity_findings"].__setitem__("thalabi_work_names_originating_authority", True)),
    ("adoption_proven", lambda x: x["fidelity_findings"].__setitem__("thalabi_personal_adoption_proven", True)),
    ("route", lambda x: x["fidelity_findings"].__setitem__("oral_or_manuscript_route_reconstruction_permitted", True)),
    ("assimilate", lambda x: x["fidelity_findings"].__setitem__("silent_variant_assimilation_permitted", True)),
    ("preferred", lambda x: x["fidelity_findings"].__setitem__("qurtubi_preferred_this_view", True)),
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
print(f"PASS: Qurtubi 108-Q04J al-Tha'labi reporter and variant review; {len(mutations)}/{len(mutations)} unsafe mutations rejected; 0 writes; 48 holds active")

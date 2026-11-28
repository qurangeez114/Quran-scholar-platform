#!/usr/bin/env python3
import copy
import hashlib
import json
from pathlib import Path

P = Path(__file__).parents[1] / "data/tafsir/staging/qurtubi-108-q04g-mawardi-reporter-boundary-review-2026-11-21.json"
D = json.loads(P.read_text(encoding="utf-8"))


def check(d):
    assert d["schema_version"] == "qh-qurtubi-108-q04g-mawardi-reporter-boundary-review-v1"
    assert d["claim_id"] == "108-Q04G" and d["surah"] == 108 and d["ayah"] == 1
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
    span = d["exact_q04g_arabic_span"]
    assert (span["start_cp"], span["end_cp"], span["length_cp"], span["position_1_based"]) == (2421, 2462, 41, 2422)
    assert span["occurrences"] == 1 and len(span["text"]) == 41
    assert hashlib.sha256(span["text"].encode()).hexdigest() == span["sha256"] == "d28e27109943de01d71b1e37872bc56263124f50620f891fc938d0767661dbe8"
    en = d["stored_english_coverage"]
    assert not en["q04g_numbered_interpretation_translated"]
    assert all(en[k] == 0 for k in ("mawardi_occurrences_case_insensitive", "ninth_occurrences_case_insensitive", "elevation_occurrences_case_insensitive", "elevation_of_occurrences_case_insensitive", "raised_mention_occurrences_case_insensitive", "lofty_mention_occurrences_case_insensitive"))
    assert {k: v["occurrences"] for k, v in en["false_positive_lexemes"].items()} == {"remembrance": 2, "mention": 3, "raised": 1}
    assert all(not v["q04g_evidence"] for v in en["false_positive_lexemes"].values())
    assert en["correct_translation_state"] == "q04g_numbered_interpretation_absent_false_positive_english_lexemes_excluded"
    prior = d["prior_review_continuity"]
    assert prior["prior_originating_voice_name"] == "al-Mawardi"
    assert "do not encode him as the originating authority" in prior["required_refinement"]
    voice = d["voice_and_claim_boundary"]
    assert voice["named_reporting_source"] == "al-Mawardi" and voice["originating_authority"] is None
    assert not voice["personal_adoption_by_al_mawardi_established"] and not voice["oral_transmission_chain_attested"]
    assert voice["literary_reporting_relationship_attested"] and not voice["manuscript_or_copying_route_attested"]
    assert voice["status_within_qurtubi"] == "reported_only_not_preferred" and not voice["rejected_by_qurtubi"]
    own = d["mawardi_own_work_boundary"]
    assert own["view_present"] and own["source_local_number"] == 9 and own["named_prior_authority"] is None
    assert not own["uses_qalahu_marker"] and not own["uses_hakahu_marker"] and not own["uses_wa_yuhtamal_personal_possibility_marker"]
    assert not own["personal_origin_or_adoption_proven"]
    src = {s["source_id"]: s for s in d["source_locators"]}
    assert len(src) == 4
    assert "printed page 193" in src["qurtubi_q04g"]["locator"]
    assert "printed page 355" in src["mawardi_own_work"]["locator"]
    f = d["fidelity_findings"]
    assert f["qurtubi_q04g_source_attested"] and f["qurtubi_names_al_mawardi_as_reporting_source"]
    assert f["mawardi_work_contains_same_numbered_view"] and not f["mawardi_named_as_originating_authority"]
    assert not f["mawardi_personal_adoption_proven"] and f["literary_reporting_relationship_attested"]
    assert not f["oral_or_manuscript_route_reconstruction_permitted"] and f["source_local_numbering_preserved"]
    assert f["stored_english_absence_correctly_classified"] and f["false_positive_english_lexemes_excluded"]
    assert not f["qurtubi_preferred_this_view"] and f["historical_authenticity_conclusion"] is None
    a = d["actions"]
    assert a["human_scholarly_approval"] == "pending" and not a["independent_human_review_observed"]
    assert all(not a[k] for k in ("live_database_written", "sql_executed", "pr_merged", "deployed"))
    assert a["publication_status"] == "not_published"
    assert d["unresolved_holds"] == [f"108-QURTUBI-SCHOLAR-H0{i}" for i in range(1, 9)]
    assert d["next_target"]["claim_id"] == "108-Q04J"


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
    ("span", lambda x: x["exact_q04g_arabic_span"].__setitem__("start_cp", 2422)),
    ("hash", lambda x: x["exact_q04g_arabic_span"].__setitem__("sha256", "0" * 64)),
    ("english_present", lambda x: x["stored_english_coverage"].__setitem__("q04g_numbered_interpretation_translated", True)),
    ("false_positive", lambda x: x["stored_english_coverage"]["false_positive_lexemes"]["raised"].__setitem__("q04g_evidence", True)),
    ("origin", lambda x: x["voice_and_claim_boundary"].__setitem__("originating_authority", "al-Mawardi")),
    ("adoption", lambda x: x["voice_and_claim_boundary"].__setitem__("personal_adoption_by_al_mawardi_established", True)),
    ("oral", lambda x: x["voice_and_claim_boundary"].__setitem__("oral_transmission_chain_attested", True)),
    ("copy_route", lambda x: x["voice_and_claim_boundary"].__setitem__("manuscript_or_copying_route_attested", True)),
    ("preferred", lambda x: x["voice_and_claim_boundary"].__setitem__("status_within_qurtubi", "preferred")),
    ("own_origin", lambda x: x["mawardi_own_work_boundary"].__setitem__("personal_origin_or_adoption_proven", True)),
    ("named_origin", lambda x: x["fidelity_findings"].__setitem__("mawardi_named_as_originating_authority", True)),
    ("adoption_proven", lambda x: x["fidelity_findings"].__setitem__("mawardi_personal_adoption_proven", True)),
    ("route", lambda x: x["fidelity_findings"].__setitem__("oral_or_manuscript_route_reconstruction_permitted", True)),
    ("preferred_finding", lambda x: x["fidelity_findings"].__setitem__("qurtubi_preferred_this_view", True)),
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
print(f"PASS: Qurtubi 108-Q04G al-Mawardi reporter boundary review; {len(mutations)}/{len(mutations)} unsafe mutations rejected; 0 writes; 48 holds active")

#!/usr/bin/env python3
import copy
import hashlib
import json
from pathlib import Path

P = Path(__file__).parents[1] / "data/tafsir/staging/qurtubi-108-q04c-hakahu-reporter-review-2026-11-20.json"
D = json.loads(P.read_text(encoding="utf-8"))


def check(d):
    assert d["schema_version"] == "qh-qurtubi-108-q04c-hakahu-reporter-review-v1"
    assert d["claim_id"] == "108-Q04C" and d["surah"] == 108 and d["ayah"] == 1
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
    span = d["exact_arabic_span"]
    assert (span["start_cp"], span["end_cp"], span["length_cp"], span["position_1_based"]) == (2209, 2242, 33, 2210)
    assert span["occurrences"] == 1 and len(span["text"]) == 33
    assert hashlib.sha256(span["text"].encode()).hexdigest() == span["sha256"] == "e85f908a4b31d816e2cb77f0f042f1fca266013a7550015172d28128c6de94bc"
    en = d["stored_english_absence"]
    assert not en["q04c_corresponding_translation_present"]
    assert en["al_mughira_occurrences_case_sensitive"] == en["islam_occurrences_case_sensitive"] == 0
    assert en["correct_translation_state"] == "source_verified_english_absent"
    prior = d["prior_review_continuity"]
    assert prior["present_on_pr_branch"] and prior["prior_status"] == "reporter_origin_boundary_flagged_not_integrated"
    voice = d["voice_and_claim_boundary"]
    assert "recounted" in voice["safe_statement_en"]
    assert voice["named_recounting_reporter"] == "al-Mughira"
    assert voice["fuller_identity_in_source_text"] is None and voice["originating_authority"] is None
    assert not voice["adoption_by_al_mughira_established"] and voice["stored_transmission_route"] is None
    assert not voice["oral_transmission_chain_claimed"] and voice["status_within_qurtubi"] == "reported_only_not_preferred"
    assert not voice["rejected_by_qurtubi"] and not voice["prophetic_or_companion_attribution"]
    src = {s["source_id"]: s for s in d["source_locators"]}
    assert len(src) == 4
    assert "printed page 354" in src["mawardi_parallel"]["locator"]
    assert src["zajjaj_earlier_islam_view"]["named_reporter_for_islam_view"] is None
    assert not src["islamweb_person_index"]["source_text_expands_name"]
    f = d["fidelity_findings"]
    assert f["islam_interpretation_source_attested"] and f["hakahu_marks_recounting_reporter"]
    assert not f["hakahu_proves_origin_or_adoption"] and not f["fuller_identity_source_verified"]
    assert not f["editorial_index_identity_may_be_published_as_source_fact"]
    assert not f["qurtubi_mawardi_dependence_proven"] and f["qurtubi_mawardi_parallel_wording_documented"]
    assert f["source_local_numbering_must_be_preserved"] and f["stored_english_absence_correctly_classified"]
    assert f["historical_authenticity_conclusion"] is None and not f["route_reconstruction_permitted"]
    a = d["actions"]
    assert a["human_scholarly_approval"] == "pending" and not a["independent_human_review_observed"]
    assert all(not a[k] for k in ("live_database_written", "sql_executed", "pr_merged", "deployed"))
    assert a["publication_status"] == "not_published"
    assert d["unresolved_holds"] == [f"108-QURTUBI-SCHOLAR-H0{i}" for i in range(1, 9)]
    assert d["next_target"]["claim_id"] == "108-Q04E"


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
    ("span", lambda x: x["exact_arabic_span"].__setitem__("start_cp", 2210)),
    ("hash", lambda x: x["exact_arabic_span"].__setitem__("sha256", "0" * 64)),
    ("english_present", lambda x: x["stored_english_absence"].__setitem__("q04c_corresponding_translation_present", True)),
    ("origin", lambda x: x["voice_and_claim_boundary"].__setitem__("originating_authority", "al-Mughira")),
    ("identity", lambda x: x["voice_and_claim_boundary"].__setitem__("fuller_identity_in_source_text", "al-Mughira ibn Shu'ba")),
    ("adoption", lambda x: x["voice_and_claim_boundary"].__setitem__("adoption_by_al_mughira_established", True)),
    ("route", lambda x: x["voice_and_claim_boundary"].__setitem__("stored_transmission_route", "invented chain")),
    ("preferred", lambda x: x["voice_and_claim_boundary"].__setitem__("status_within_qurtubi", "preferred")),
    ("prophetic", lambda x: x["voice_and_claim_boundary"].__setitem__("prophetic_or_companion_attribution", True)),
    ("hakahu_origin", lambda x: x["fidelity_findings"].__setitem__("hakahu_proves_origin_or_adoption", True)),
    ("identity_verified", lambda x: x["fidelity_findings"].__setitem__("fuller_identity_source_verified", True)),
    ("editorial_publish", lambda x: x["fidelity_findings"].__setitem__("editorial_index_identity_may_be_published_as_source_fact", True)),
    ("dependence", lambda x: x["fidelity_findings"].__setitem__("qurtubi_mawardi_dependence_proven", True)),
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
print(f"PASS: Qurtubi 108-Q04C hakahu reporter review; {len(mutations)}/{len(mutations)} unsafe mutations rejected; 0 writes; 48 holds active")

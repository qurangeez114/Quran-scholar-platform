#!/usr/bin/env python3
import copy
import hashlib
import json
from pathlib import Path

P = Path(__file__).parents[1] / "data/tafsir/staging/qurtubi-108-q04b-al-hasan-quran-review-2026-11-20.json"
D = json.loads(P.read_text(encoding="utf-8"))


def check(d):
    assert d["schema_version"] == "qh-qurtubi-108-q04b-al-hasan-quran-review-v1"
    assert d["claim_id"] == "108-Q04B" and d["surah"] == 108 and d["ayah"] == 1
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
    span = d["exact_arabic_span"]
    assert (span["start_cp"], span["end_cp"], span["length_cp"], span["position_1_based"]) == (2179, 2209, 30, 2180)
    assert span["occurrences"] == 1 and len(span["text"]) == 30
    assert hashlib.sha256(span["text"].encode()).hexdigest() == span["sha256"] == "de337c6723d13fc0a350dc59148a1e2ecfe08b9089ada3fb6c4d8e209047ea12"
    en = d["stored_english_absence"]
    assert not en["q04b_corresponding_translation_present"]
    assert en["the_quran_phrase_occurrences_casefold"] == en["fourth_marker_occurrences_casefold"] == 0
    assert en["al_hasan_name_occurrences_casefold"] == 1 and not en["al_hasan_occurrence_is_q04b_evidence"]
    assert en["correct_translation_state"] == "source_verified_english_absent"
    voice = d["voice_and_claim_boundary"]
    assert voice["originator_named_by_qurtubi"] == "al-Hasan" and voice["stored_qurtubi_route"] is None
    assert not voice["oral_transmission_chain_claimed"] and voice["status_within_qurtubi"] == "reported_only_not_preferred"
    assert not voice["rejected_by_qurtubi"] and not voice["prophetic_or_companion_attribution"]
    src = {s["source_id"]: s for s in d["source_locators"]}
    assert len(src) == 5 and src["ibn_abi_hatim_19510"]["displayed_route_before_al_hasan"] is None
    assert src["baghawi_variant"]["variant_from_qurtubi"] == "adds العظيم"
    assert "knowledge" in src["ibn_al_jawzi_substantive_variant"]["variant_from_qurtubi"]
    f = d["fidelity_findings"]
    assert f["core_quran_attribution_to_al_hasan_source_attested"] and f["stored_english_absence_correctly_classified"]
    assert f["english_name_token_false_positive_documented"] and f["qurtubi_wording_controls_qurtubi_claim"]
    assert not f["import_baghawi_epithet_permitted"] and not f["import_ibn_al_jawzi_knowledge_permitted"]
    assert not f["normalize_source_local_numbering_permitted"] and not f["source_relationship_or_independence_proven"]
    assert f["historical_authenticity_conclusion"] is None and not f["route_reconstruction_permitted"]
    a = d["actions"]
    assert a["human_scholarly_approval"] == "pending" and not a["independent_human_review_observed"]
    assert all(not a[k] for k in ("live_database_written", "sql_executed", "pr_merged", "deployed"))
    assert a["publication_status"] == "not_published"
    assert d["unresolved_holds"] == [f"108-QURTUBI-SCHOLAR-H0{i}" for i in range(1, 9)]
    assert d["next_target"]["claim_id"] == "108-Q04C"


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
    ("span", lambda x: x["exact_arabic_span"].__setitem__("start_cp", 2180)),
    ("hash", lambda x: x["exact_arabic_span"].__setitem__("sha256", "0" * 64)),
    ("english_present", lambda x: x["stored_english_absence"].__setitem__("q04b_corresponding_translation_present", True)),
    ("name_evidence", lambda x: x["stored_english_absence"].__setitem__("al_hasan_occurrence_is_q04b_evidence", True)),
    ("route", lambda x: x["voice_and_claim_boundary"].__setitem__("stored_qurtubi_route", "reconstructed")),
    ("preferred", lambda x: x["voice_and_claim_boundary"].__setitem__("status_within_qurtubi", "preferred")),
    ("prophetic", lambda x: x["voice_and_claim_boundary"].__setitem__("prophetic_or_companion_attribution", True)),
    ("baghawi_import", lambda x: x["fidelity_findings"].__setitem__("import_baghawi_epithet_permitted", True)),
    ("knowledge_import", lambda x: x["fidelity_findings"].__setitem__("import_ibn_al_jawzi_knowledge_permitted", True)),
    ("renumber", lambda x: x["fidelity_findings"].__setitem__("normalize_source_local_numbering_permitted", True)),
    ("auth", lambda x: x["fidelity_findings"].__setitem__("historical_authenticity_conclusion", "authenticated")),
    ("source_link", lambda x: x["fidelity_findings"].__setitem__("source_relationship_or_independence_proven", True)),
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
print(f"PASS: Qurtubi 108-Q04B al-Hasan/Quran review; {len(mutations)}/{len(mutations)} unsafe mutations rejected; 0 writes; 48 holds active")

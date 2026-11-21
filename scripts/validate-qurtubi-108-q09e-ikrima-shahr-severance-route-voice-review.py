#!/usr/bin/env python3
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "data/tafsir/staging/qurtubi-108-q09e-ikrima-shahr-severance-route-voice-review-2026-11-21.json"
data = json.loads(PATH.read_text(encoding="utf-8"))

assert data["project"] == "QuranHikma"
assert data["supabase_project_id"] == "ylosytbxpzxzwfzjpaej"
assert data["claim_id"] == "108-Q09E-R01"
assert data["baseline"] == {
    "six_scholar_claims": 74,
    "active_chapter_holds": 48,
    "holds_cleared": 0,
    "publication_ready_claims_added": 0,
    "chapter_complete": False,
    "advance_to_surah_107": False,
}

assert data["pull_request"]["draft"] is True
assert data["pull_request"]["merged"] is False
assert data["approval"]["independent_human_scholarly_review"] == "pending"
assert data["approval"]["published"] is False
for key in ["sql_executed", "database_written", "deployment_performed", "merge_performed"]:
    assert data["actions"][key] is False

assert len(data["exact_bilingual_spans"]) == 2
for span in data["exact_bilingual_spans"]:
    text = span["text"]
    assert len(text) == span["chars"]
    assert hashlib.md5(text.encode("utf-8")).hexdigest() == span["md5"]
    assert span["occurrences"] == 1

voice = data["voice_classification"]
assert voice["quoted_speaker"] == "Quraysh"
assert voice["named_tail_attribution_authorities"] == ["Ikrimah", "Shahr ibn Hawshab"]
assert voice["oral_transmission_chain_in_stored_qurtubi"] is False

route = data["route_analysis"]
assert route["tabari_ikrima_route_located"] is True
assert route["shahr_chain_specific_route_located"] is False
assert route["route_independence_established"] is False
assert route["shahr_attribution_status"] == "textually_attested_in_multiple_compilations_but_route_unresolved"

witnesses = {w["witness_id"]: w for w in data["source_witnesses"]}
assert witnesses["mawardi_quranpedia_108_3_fifth_view"]["relationship"] == "earlier_full_form_parallel_without_isnad"
assert witnesses["tabari_ksu_108_3_ikrima_severance_route"]["route"][-1] == "Ikrimah"
assert "Shahr ibn Hawshab is absent" in witnesses["tabari_ksu_108_3_ikrima_severance_route"]["absent_or_variant"]

findings = data["fidelity_findings"]
assert findings["stored_arabic_english_alignment"] == "substantively_aligned"
assert findings["translation_correction_proposed"] is False
assert findings["source_attribution_closed"] is False
assert findings["silent_variant_assimilation_permitted"] is False
assert len(data["unresolved_holds"]) == 8
assert data["next_target"]["claim_id"] == "108-Q10A"

print("PASS qurtubi 108 Q09E staged route/voice review")

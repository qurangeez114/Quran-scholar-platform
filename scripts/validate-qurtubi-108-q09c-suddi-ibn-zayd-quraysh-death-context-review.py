#!/usr/bin/env python3
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "data/tafsir/staging/qurtubi-108-q09c-suddi-ibn-zayd-quraysh-death-context-review-2026-11-21.json"

data = json.loads(PATH.read_text(encoding="utf-8"))

assert data["project"] == "QuranHikma"
assert data["supabase_project_id"] == "ylosytbxpzxzwfzjpaej"
assert data["claim_id"] == "108-Q09C-R01"
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
assert data["actions"]["database_written"] is False
assert data["actions"]["sql_executed"] is False
assert data["actions"]["deployment_performed"] is False
assert data["actions"]["merge_performed"] is False

assert len(data["exact_bilingual_spans"]) == 2
for span in data["exact_bilingual_spans"]:
    text = span["text"]
    assert len(text) == span["chars"]
    assert hashlib.md5(text.encode("utf-8")).hexdigest() == span["md5"]
    assert span["occurrences"] == 1

voice = data["voice_classification"]
assert voice["named_attribution_authorities"] == ["al-Suddi", "Ibn Zayd"]
assert voice["oral_transmission_chain_present"] is False
assert voice["narrative_collective"] == "Quraysh"

findings = data["fidelity_findings"]
assert findings["stored_arabic_english_alignment"] == "substantively_aligned"
assert findings["translation_correction_proposed"] is False
assert findings["combined_account_independently_source_closed"] is False
assert findings["silent_harmonization_permitted"] is False

witnesses = {w["witness_id"]: w for w in data["source_witnesses"]}
assert witnesses["tabari_ksu_108_3_ibn_zayd"]["relationship"] == "source_specific_partial_parallel_not_same_wording"
assert witnesses["suyuti_lubab_108_3_suddi_inventory"]["relationship"] == "report_inventory_partial_parallel_not_same_report"
assert "al-Qasim" in witnesses["tabari_ksu_108_3_ibn_zayd"]["absent_from_witness"]
assert any("al-As ibn Wa'il" in item for item in witnesses["suyuti_lubab_108_3_suddi_inventory"]["disagrees_or_differs"])
assert len(data["unresolved_holds"]) == 8
assert data["next_target"]["claim_id"] == "108-Q09D"

print("PASS qurtubi 108 Q09C staged source-boundary review")

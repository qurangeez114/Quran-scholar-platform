#!/usr/bin/env python3
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "data/tafsir/staging/qurtubi-108-q10a-abtar-lexicon-english-truncation-review-2026-11-21.json"
data = json.loads(PATH.read_text(encoding="utf-8"))

assert data["project"] == "QuranHikma"
assert data["supabase_project_id"] == "ylosytbxpzxzwfzjpaej"
assert data["claim_id"] == "108-Q10A-R01"
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
for key in ["repair_text_drafted", "sql_executed", "database_written", "deployment_performed", "merge_performed"]:
    assert data["actions"][key] is False

ar = data["arabic_scope"]
assert len(ar["text"]) == ar["chars"]
assert hashlib.md5(ar["text"].encode("utf-8")).hexdigest() == ar["md5"]

boundary = data["translation_boundary"]
en = boundary["english_available_lexical_tail"]
assert len(en["text"]) == en["chars"]
assert hashlib.md5(en["text"].encode("utf-8")).hexdigest() == en["md5"]
assert en["text"].endswith('And it is said: "Allah made him')
assert boundary["row_ends_mid_sentence"] is True
assert boundary["closing_quote_present"] is False
assert boundary["following_sanbur_block_present_in_english"] is False

partial = boundary["partially_attempted_arabic_phrase"]
assert len(partial["text"]) == partial["chars"]
assert hashlib.md5(partial["text"].encode("utf-8")).hexdigest() == partial["md5"]
omitted = boundary["wholly_omitted_arabic_suffix"]
assert len(omitted["text"]) == omitted["chars"]
assert hashlib.md5(omitted["text"].encode("utf-8")).hexdigest() == omitted["md5"]

findings = data["fidelity_findings"]
assert findings["english_is_complete_for_arabic_scope"] is False
assert findings["english_row_is_syntactically_complete"] is False
assert findings["confirmed_live_truncation"] is True
assert findings["translation_correction_proposed"] is False
assert findings["silent_completion_permitted"] is False

witnesses = {w["witness_id"]: w for w in data["source_witnesses"]}
assert witnesses["jawhari_sihah_btr_p584"]["relationship"] == "earlier_lexicographic_parallel"
assert witnesses["ibn_al_sikkit_islah_al_mantiq_abtaran"]["relationship"] == "named_primary_lexicographer_parallel"
assert witnesses["abu_yala_musnad_5594"]["relationship"] == "variant_hadith_wording"
assert len(data["unresolved_holds"]) == 8
assert data["next_target"]["claim_id"] == "108-Q10B"

print("PASS qurtubi 108 Q10A staged English truncation review")

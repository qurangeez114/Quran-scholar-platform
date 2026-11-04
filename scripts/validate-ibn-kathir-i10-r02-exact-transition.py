#!/usr/bin/env python3
import copy
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "data/tafsir/staging/ibn-kathir-108-i10-r02-exact-transition-2026-11-04.json"

EXPECTED = {
    "AR_ABU_JAHL": (17968, 18017, "8395d1499875119eebc8a222444e14e12512c6b8df8b42ec688975a5194628b5"),
    "AR_ENEMY_GLOSS": (18018, 18066, "4ec96709b4b419e6c1a2c2e68e0c89cf81d6012948bbde1ece64372451059118"),
    "AR_UNIVERSALIZATION_BOUNDARY": (18067, 18125, "84f4a92b5c9f8923122ca03296197c65e0ff155a06c13dbe7d3d5e6712b416b4"),
}

def digest(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()

def validate(doc):
    assert doc["route_id"] == "108-I10-R02"
    assert doc["database_written"] is False and doc["publication_ready"] is False
    assert doc["chapter_complete"] is False and doc["proposition_count_effect"] == 0
    assert doc["offset_contract"] == {
        "unit": "Unicode code points", "base": 0, "end": "exclusive",
        "normalization": "none", "hash_input": "exact UTF-8 bytes of the unnormalized span"
    }
    units = {x["unit_id"]: x for x in doc["arabic_units"]}
    assert set(units) == set(EXPECTED)
    for key, (start, end, sha) in EXPECTED.items():
        unit = units[key]
        assert (unit["start_cp"], unit["end_cp"]) == (start, end)
        assert unit["span_codepoints"] == end - start == len(unit["exact_text"])
        assert unit["span_sha256"] == sha == digest(unit["exact_text"])
    ar = doc["arabic_transition_envelope"]
    assert ar["span_codepoints"] == ar["end_cp"] - ar["start_cp"] == len(ar["exact_text"])
    assert ar["span_sha256"] == digest(ar["exact_text"])
    en = doc["english_local_transition"]
    assert en["left_boundary"]["end_cp"] == en["separator"]["start_cp"]
    assert en["separator"]["end_cp"] == en["right_boundary"]["start_cp"]
    for part in (en["separator"], en["right_boundary"], en["envelope"]):
        assert part["span_codepoints"] == part["end_cp"] - part["start_cp"] == len(part["exact_text"])
        assert part["span_sha256"] == digest(part["exact_text"])
    assert en["separator"]["exact_text"] == " "
    assert en["right_boundary"]["exact_text"] == "As-Suddi said"
    assert "local omission only" in en["scope_limit"]
    assert "invented English sentence" in en["scope_limit"]
    holds = doc["source_and_disagreement_holds"]
    assert holds["chain_present_in_checked_ibn_kathir"] is False
    assert holds["direct_source_editions_resolved"] == 0
    assert holds["direct_source_editions_required"] == 4
    assert holds["displayed_chain"] is None
    assert holds["authentication_state"] == "not_assessed"

def main():
    doc = json.loads(PATH.read_text(encoding="utf-8"))
    validate(doc)
    mutations = []
    for path, value in [
        (("database_written",), True), (("publication_ready",), True),
        (("chapter_complete",), True), (("proposition_count_effect",), 1),
        (("arabic_units", 0, "start_cp"), 17967),
        (("arabic_units", 1, "exact_text"), "changed"),
        (("arabic_units", 2, "span_sha256"), "0" * 64),
        (("english_local_transition", "separator", "exact_text"), "\n"),
        (("english_local_transition", "right_boundary", "start_cp"), 7881),
        (("source_and_disagreement_holds", "direct_source_editions_resolved"), 4),
        (("source_and_disagreement_holds", "authentication_state"), "authenticated"),
        (("source_and_disagreement_holds", "displayed_chain"), "invented"),
    ]:
        bad = copy.deepcopy(doc)
        target = bad
        for key in path[:-1]: target = target[key]
        target[path[-1]] = value
        try: validate(bad)
        except (AssertionError, KeyError, TypeError): mutations.append(path)
    assert len(mutations) == 12
    print("PASS: I10-R02 exact transition validated; 12 unsafe mutations rejected; 0 database writes")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
import copy
import json
import sys
from pathlib import Path

ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
stage = ROOT / "data/tafsir/staging"
projection = json.loads((stage / "ibn-kathir-108-i10-r01-normalized-offline-projection-2026-11-03.json").read_text())
spans = json.loads((stage / "ibn-kathir-108-i10-r01-exact-spans-2026-11-03.json").read_text())

def check(doc):
    assert doc["route_id"] == "108-I10-R01"
    assert len(doc["rows"]) == 4
    assert len({r["key"] for r in doc["rows"]}) == 4
    assert all(r["physical_proposition_id"] is None and r["physical_voice_id"] is None for r in doc["rows"])
    assert all(r["physical_claim_type"] is None and r["physical_voice_category"] is None for r in doc["rows"])
    assert all(r["authentication_state"] == "not_assessed" for r in doc["rows"])
    by_language = {w["language"]: w for w in spans["witnesses"]}
    for locator in doc["clause_locators"]:
        for lang, field in (("ar", "arabic"), ("en", "english")):
            witness = by_language[lang]
            loc = locator[field]
            rel0, rel1 = loc["start"] - witness["start_cp"], loc["end"] - witness["start_cp"]
            assert 0 <= rel0 < rel1 <= len(witness["exact_text"])
            assert witness["exact_text"][rel0:rel1] == loc["text"]
    gloss = doc["fidelity_context"][0]
    witness = by_language["en"]
    assert witness["exact_text"][gloss["start"]-witness["start_cp"]:gloss["end"]-witness["start_cp"]] == gloss["text"]
    assert doc["database_written"] is False and doc["publication_ready"] is False and doc["chapter_complete"] is False
    joined = " ".join(doc["holds"])
    for token in ("No chain", "Ibn Abi Hatim", "Authentication", "Physical", "No physical IDs"):
        assert token in joined

check(projection)
mutators = [
    lambda d: d.update(route_id="108-I10-R02"),
    lambda d: d["rows"].pop(),
    lambda d: d["rows"][1].update(key=d["rows"][0]["key"]),
    lambda d: d["rows"][0].update(physical_proposition_id=1),
    lambda d: d["rows"][0].update(physical_voice_id=1),
    lambda d: d["rows"][0].update(physical_claim_type="occasion"),
    lambda d: d["rows"][2].update(physical_voice_category="quoted_opponent"),
    lambda d: d["rows"][0].update(authentication_state="authenticated"),
    lambda d: d["clause_locators"][0]["arabic"].update(start=17733),
    lambda d: d["fidelity_context"][0].update(text="from progeny"),
    lambda d: d.update(database_written=True),
    lambda d: d["holds"].clear(),
]
for mutate in mutators:
    candidate = copy.deepcopy(projection)
    mutate(candidate)
    try:
        check(candidate)
    except (AssertionError, KeyError, IndexError):
        continue
    raise AssertionError("unsafe mutation was accepted")
print("PASS: I10-R01 normalized projection; 12 unsafe mutations rejected")

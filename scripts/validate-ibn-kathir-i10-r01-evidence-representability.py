#!/usr/bin/env python3
import copy
import json
import sys
from pathlib import Path

ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
stage = ROOT / "data/tafsir/staging"
assessment = json.loads((stage / "ibn-kathir-108-i10-r01-evidence-representability-2026-11-03.json").read_text())
projection = json.loads((stage / "ibn-kathir-108-i10-r01-normalized-offline-projection-2026-11-03.json").read_text())
spans = json.loads((stage / "ibn-kathir-108-i10-r01-exact-spans-2026-11-03.json").read_text())

def check(doc):
    assert doc["route_id"] == "108-I10-R01"
    assert len(doc["groups"]) == 1 and doc["groups"][0]["key"] == "E:I10-R01"
    group = doc["groups"][0]
    assert group["chain"] is None and group["independence"] == "unknown"
    assert group["physical_evidence_unit_id"] is None
    assert len(doc["links"]) == 4
    assert {x["symbolic_proposition_key"] for x in doc["links"]} == {x["symbolic_proposition_key"] for x in projection["rows"]}
    assert all(x["evidence_group"] == "E:I10-R01" for x in doc["links"])
    assert all(x["physical_proposition_id"] is None and x["physical_evidence_unit_id"] is None and x["physical_link_created"] is False for x in doc["links"])
    by_lang = {w["language"]: w for w in spans["witnesses"]}
    for loc, lang in zip(group["locators"], ("ar", "en")):
        witness = by_lang[lang]
        assert (loc["canonical_entry_id"], loc["start"], loc["end"], loc["span_sha256"]) == (witness["tafsir_entry_id"], witness["start_cp"], witness["end_cp"], witness["span_sha256"])
    schema = doc["read_only_schema_observation"]
    assert schema["evidence_unit"]["proposition_evidence_supports_many_to_many_links"] is True
    assert schema["evidence_unit"]["exact_locator_offset_or_hash_columns"] is False
    assert schema["voice_chain"]["embedded_abu_lahab_faithful_category_available"] is False
    assert schema["proposition_span"]["bilingual_exact_locator_persistence_verified"] is False
    assert doc["database_written"] is False and doc["publication_ready"] is False and doc["chapter_complete"] is False
    limits = " ".join(doc["limits"])
    for token in ("No physical", "Ibn Abi Hatim", "No exact bilingual", "No database writes"):
        assert token in limits

check(assessment)
mutators = [
    lambda d: d.update(route_id="108-I10-R02"),
    lambda d: d["groups"].append(copy.deepcopy(d["groups"][0])),
    lambda d: d["groups"][0].update(chain=["Ata"]),
    lambda d: d["groups"][0].update(independence="independence_supported"),
    lambda d: d["groups"][0].update(physical_evidence_unit_id=1),
    lambda d: d["links"].pop(),
    lambda d: d["links"][0].update(evidence_group="E:I10-R02"),
    lambda d: d["links"][0].update(physical_proposition_id=1),
    lambda d: d["groups"][0]["locators"][0].update(start=17733),
    lambda d: d["read_only_schema_observation"]["evidence_unit"].update(exact_locator_offset_or_hash_columns=True),
    lambda d: d["read_only_schema_observation"]["voice_chain"].update(embedded_abu_lahab_faithful_category_available=True),
    lambda d: d.update(database_written=True),
]
for mutate in mutators:
    candidate = copy.deepcopy(assessment)
    mutate(candidate)
    try:
        check(candidate)
    except (AssertionError, KeyError, IndexError):
        continue
    raise AssertionError("unsafe mutation was accepted")
print("PASS: I10-R01 evidence representability; 12 unsafe mutations rejected")

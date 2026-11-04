#!/usr/bin/env python3
import copy
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[1]
STAGE = ROOT / "data/tafsir/staging"

def read(name, blob):
    raw = (STAGE / name).read_bytes()
    actual = hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()
    assert actual == blob, (name, actual, blob)
    return json.loads(raw)

consolidation = json.loads((STAGE / "ibn-kathir-108-i10-r02-hold-consolidation-2026-11-04.json").read_text())
exact = read("ibn-kathir-108-i10-r02-exact-transition-2026-11-04.json", "54b69d0d9fb003b30688dbd49112e3d7bb78a7ae")
projection = read("ibn-kathir-108-i10-r02-semantic-evidence-projection-2026-11-04.json", "3b8c8be006fa3082940fd3d2b809761409cac2d5")
contract = read("ibn-kathir-108-i10-r02-offline-consumer-contract-2026-11-04.json", "5130fc2baf2d85e02352a6135b2dfb26386398c4")

def check(c):
    assert c["route_id"] == "108-I10-R02"
    assert c["status"] == "offline_validation_complete_physical_integration_held"
    assert [x["blob"] for x in c["basis"]] == [
        "22865286bbcb063575ebece55c51716eedd7494f",
        "54b69d0d9fb003b30688dbd49112e3d7bb78a7ae",
        "3b8c8be006fa3082940fd3d2b809761409cac2d5",
        "5130fc2baf2d85e02352a6135b2dfb26386398c4"
    ]
    assert len(exact["arabic_units"]) == 3
    assert len(projection["semantic_rows"]) == len(projection["evidence_groups"]) == len(projection["evidence_links"]) == 1
    assert contract["identity_contract"]["expected_counts"] == {
        "propositions": 1, "voices": 1, "evidence_units": 1, "links": 1, "routes": 0
    }
    assert c["frozen_graph"] == {
        "propositions": 1, "voices": 1, "evidence_units": 1, "links": 1, "routes": 0,
        "positive_languages": ["ar"], "english_local_omission_contexts": 1,
        "unresolved_direct_source_editions": 4
    }
    assert len(c["ci_observed"]) == 6
    assert all(x["conclusion"] == "success" for x in c["ci_observed"])
    assert {x["key"] for x in c["remaining_holds"]} == {
        "english_fidelity", "source_chain_authentication", "adjacency_and_chronology",
        "claim_and_voice_categories", "evidence_metadata", "integration"
    }
    joined = " ".join(x["finding"] for x in c["remaining_holds"])
    for token in ("global absence", "Abd ibn Humayd", "chronologically impossible", "candidate-only", "offsets/hash", "No physical IDs"):
        assert token in joined
    assert c["next_research"]["claim"] == "108-I11"
    assert c["next_research"]["bounded_transition_blob"] == "78c1533a79a622f567b3e32660d3c2f365b0e222"
    assert c["next_research"]["known_arabic_unit"] == {
        "start": 18067, "end": 18125,
        "span_sha256": "84f4a92b5c9f8923122ca03296197c65e0ff155a06c13dbe7d3d5e6712b416b4"
    }
    assert c["counts_unchanged"] is True
    assert c["database_written"] is False and c["database_write_count"] == 0
    assert c["publication_ready"] is False and c["chapter_complete"] is False

check(consolidation)
mutators = [
    lambda x: x.update(route_id="108-I10-R01"),
    lambda x: x.update(status="publication_ready"),
    lambda x: x["basis"].pop(),
    lambda x: x["frozen_graph"].update(propositions=2),
    lambda x: x["frozen_graph"].update(positive_languages=["ar", "en"]),
    lambda x: x["ci_observed"][0].update(conclusion="failure"),
    lambda x: x["remaining_holds"].pop(),
    lambda x: x["remaining_holds"][0].update(key="integration"),
    lambda x: x["next_research"].update(claim="108-I10-R02"),
    lambda x: x["next_research"]["known_arabic_unit"].update(start=18068),
    lambda x: x.update(counts_unchanged=False),
    lambda x: x.update(database_written=True),
    lambda x: x.update(publication_ready=True),
    lambda x: x.update(chapter_complete=True),
]
for mutate in mutators:
    bad = copy.deepcopy(consolidation)
    mutate(bad)
    try:
        check(bad)
    except (AssertionError, KeyError, IndexError, TypeError):
        continue
    raise AssertionError("unsafe mutation accepted")
assert len(mutators) == 14
print("PASS: I10-R02 hold consolidation; 14 unsafe mutations rejected; 0 database writes")

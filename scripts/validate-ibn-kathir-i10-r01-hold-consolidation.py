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
    assert hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest() == blob
    return json.loads(raw)

consolidation = json.loads((STAGE / "ibn-kathir-108-i10-r01-hold-consolidation-2026-11-03.json").read_text())
spans = read("ibn-kathir-108-i10-r01-exact-spans-2026-11-03.json", "cf97cb03defef3a852cad473b5e5f7e1aa726af2")
projection = read("ibn-kathir-108-i10-r01-normalized-offline-projection-2026-11-03.json", "f9f1f70d0e11427eb66aade56e124b502af63e92")
assessment = read("ibn-kathir-108-i10-r01-evidence-representability-2026-11-03.json", "414bd0900cab995c7fadbbe92bfd3d5453252e47")
contract = read("ibn-kathir-108-i10-r01-offline-consumer-contract-2026-11-03.json", "1a98bd121f1201c2053da8b30798789e9de72d38")

def check(c):
    assert c["route_id"] == "108-I10-R01"
    assert c["status"] == "offline_validation_complete_physical_integration_held"
    assert [x["blob"] for x in c["basis"]] == ["cf97cb03defef3a852cad473b5e5f7e1aa726af2", "f9f1f70d0e11427eb66aade56e124b502af63e92", "414bd0900cab995c7fadbbe92bfd3d5453252e47", "1a98bd121f1201c2053da8b30798789e9de72d38"]
    assert len(spans["witnesses"]) == 2
    assert len(projection["rows"]) == 4 and len(assessment["groups"]) == 1 and len(assessment["links"]) == 4
    assert contract["identity_contract"]["expected_counts"] == {"propositions": 4, "voices": 4, "evidence_units": 1, "links": 4, "routes": 0}
    assert all(x["conclusion"] == "success" for x in c["ci_observed"])
    assert {x["key"] for x in c["remaining_holds"]} == {"quoted_voice", "evidence_metadata", "claim_type_boundary", "source_chain_authentication", "integration"}
    joined = " ".join(x["finding"] for x in c["remaining_holds"])
    for token in ("Abu Lahab", "offsets and hashes", "candidate-only", "Ibn Abi Hatim", "No physical IDs"):
        assert token in joined
    assert c["next_research"]["claim"] == "108-I10-R02"
    assert c["next_research"]["source_blob"] == "22865286bbcb063575ebece55c51716eedd7494f"
    assert c["counts_unchanged"] is True
    assert c["database_written"] is False and c["publication_ready"] is False and c["chapter_complete"] is False

check(consolidation)
mutators = [
    lambda x: x.update(route_id="108-I10-R02"),
    lambda x: x.update(status="publication_ready"),
    lambda x: x["basis"].pop(),
    lambda x: x["ci_observed"][0].update(conclusion="failure"),
    lambda x: x["remaining_holds"].pop(),
    lambda x: x["remaining_holds"][0].update(key="integration"),
    lambda x: x["next_research"].update(claim="108-I11"),
    lambda x: x["next_research"].update(source_blob="invented"),
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
    except (AssertionError, KeyError, IndexError):
        continue
    raise AssertionError("unsafe mutation accepted")
print("PASS: I10-R01 hold consolidation; 12 unsafe mutations rejected")

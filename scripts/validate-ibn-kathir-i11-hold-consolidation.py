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

consolidation = json.loads((STAGE / "ibn-kathir-108-i11-hold-consolidation-2026-11-04.json").read_text())
exact = read("ibn-kathir-108-i11-exact-transition-2026-11-04.json", "d3af5507037044cb0fc3e4a65396bd714d81de44")
projection = read("ibn-kathir-108-i11-semantic-evidence-projection-2026-11-04.json", "c7d1c6c1f4b65530e63edffb983e37b7defabbde")
contract = read("ibn-kathir-108-i11-offline-consumer-contract-2026-11-04.json", "c0019f2d614f643b7d8f88536092906de302dd6d")

def check(c):
    assert c["claim_id"] == "108-I11"
    assert c["status"] == "offline_validation_complete_physical_integration_held"
    assert [x["blob"] for x in c["basis"]] == [
        "d3af5507037044cb0fc3e4a65396bd714d81de44",
        "c7d1c6c1f4b65530e63edffb983e37b7defabbde",
        "c0019f2d614f643b7d8f88536092906de302dd6d"
    ]
    assert exact["arabic_exact_unit"]["span_sha256"] == "84f4a92b5c9f8923122ca03296197c65e0ff155a06c13dbe7d3d5e6712b416b4"
    assert len(projection["semantic_rows"]) == len(projection["evidence_groups"]) == len(projection["evidence_links"]) == 1
    assert len(projection["fidelity_context"]) == 2
    assert contract["identity_contract"]["expected_counts"] == {
        "propositions": 1, "voices": 1, "evidence_units": 1, "links": 1, "routes": 0
    }
    assert c["frozen_graph"] == {
        "propositions": 1, "voices": 1, "evidence_units": 1, "links": 1, "routes": 0,
        "positive_languages": ["ar"], "english_fidelity_contexts": 2, "chapter_witnesses": 1
    }
    assert len(c["ci_observed"]) == 6
    assert sum(x["conclusion"] == "success" for x in c["ci_observed"]) == 4
    assert sum(x["conclusion"] == "cancelled" for x in c["ci_observed"]) == 2
    assert {x["key"] for x in c["remaining_holds"]} == {
        "english_fidelity", "context_separation", "witness_route_independence",
        "claim_and_voice_categories", "evidence_metadata", "integration"
    }
    joined = " ".join(x["finding"] for x in c["remaining_holds"])
    for token in ("No global absence", "neither I11's translation", "zero transmission routes",
                  "unallocated", "offsets/hash", "No physical IDs"):
        assert token in joined
    assert c["next_research"]["research_blob"] == "03b4890d28328f918dc175876d1f053271fc53d5"
    assert c["next_research"]["evidence_plan_blob"] == "a373f1af92ad5a911af553ddb3475857a65d6c9b"
    assert c["counts_unchanged"] is True
    assert c["database_written"] is False and c["database_write_count"] == 0
    assert c["publication_ready"] is False and c["chapter_complete"] is False

check(consolidation)
mutators = [
    lambda x: x.update(claim_id="108-I10"),
    lambda x: x.update(status="publication_ready"),
    lambda x: x["basis"].pop(),
    lambda x: x["frozen_graph"].update(propositions=2),
    lambda x: x["frozen_graph"].update(routes=1),
    lambda x: x["frozen_graph"].update(positive_languages=["ar", "en"]),
    lambda x: x["frozen_graph"].update(english_fidelity_contexts=1),
    lambda x: x["frozen_graph"].update(chapter_witnesses=2),
    lambda x: x["remaining_holds"].pop(),
    lambda x: x["remaining_holds"][0].update(key="integration"),
    lambda x: x["next_research"].update(research_blob="bad"),
    lambda x: x.update(counts_unchanged=False),
    lambda x: x.update(database_written=True),
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
print("PASS: I11 hold consolidation; 14 unsafe mutations rejected; 0 database writes")

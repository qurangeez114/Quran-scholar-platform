#!/usr/bin/env python3
import copy, json, sys
from pathlib import Path

ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[1]
STAGE = ROOT / "data/tafsir/staging"
CONTRACT = STAGE / "ibn-kathir-108-i08-offline-consumer-contract-2026-11-05.json"
CONSOLIDATION = STAGE / "ibn-kathir-108-i08-hold-consolidation-2026-11-05.json"

HOLD_IDS = [
    "category_resolution",
    "locator_persistence_and_readback",
    "absent_route_and_chain",
    "duplicated_chapter_witness",
    "unknown_external_independence_and_authentication",
    "authorized_integration_and_completion",
]

def check(data, contract):
    projection = contract["required_projection"]
    assert data["claim_id"] == "108-I08"
    assert data["basis"] == {
        "path": "data/tafsir/staging/ibn-kathir-108-i08-offline-consumer-contract-2026-11-05.json",
        "blob": "f358cbf51df0fdbaea2964997ef2b9758d908e79",
    }
    assert data["frozen_projection"] == projection
    assert [h["id"] for h in data["active_holds"]] == HOLD_IDS
    assert [h["statement"] for h in data["active_holds"]] == projection["holds"]
    assert all(h["status"] == "active" and h["resolved"] is False and h["waived"] is False for h in data["active_holds"])
    assert data["graph"] == contract["projected_graph"]
    assert data["boundaries"] == contract["explicit_boundaries"]
    assert data["resolved_holds"] == data["waived_holds"] == data["database_write_count"] == 0
    assert all(data[k] is False for k in (
        "claim_complete", "scholar_complete", "chapter_complete", "publication_ready", "database_written"
    ))
    assert data["counts"] == projection["counts"]
    assert data["six_scholar_baseline"] == projection["six_scholar_baseline"]

def main():
    data = json.loads(CONSOLIDATION.read_text())
    contract = json.loads(CONTRACT.read_text())
    check(data, contract)
    mutations = [
        ("frozen_projection", None),
        ("active_holds", []),
        ("graph", {}),
        ("boundaries", {}),
        ("resolved_holds", 1),
        ("waived_holds", 1),
        ("database_write_count", 1),
        ("claim_complete", True),
        ("scholar_complete", True),
        ("chapter_complete", True),
        ("publication_ready", True),
        ("database_written", True),
    ]
    for key, value in mutations:
        bad = copy.deepcopy(data)
        bad[key] = value
        try:
            check(bad, contract)
        except (AssertionError, KeyError, IndexError, TypeError):
            continue
        raise AssertionError("unsafe mutation accepted: " + key)
    print(json.dumps({"result": "PASS", "unsafe_mutations_rejected": len(mutations), "database_writes": 0}))

if __name__ == "__main__":
    main()

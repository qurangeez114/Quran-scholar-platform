#!/usr/bin/env python3
import copy, json, sys
from pathlib import Path

ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[1]
STAGE = ROOT / "data/tafsir/staging"
PROJECTION = STAGE / "ibn-kathir-108-i07-semantic-evidence-projection-2026-11-05.json"
CONTRACT = STAGE / "ibn-kathir-108-i07-offline-consumer-contract-2026-11-05.json"

EXPECTED_RULES = {
    "mode": "offline_only",
    "physical_id_resolution": False,
    "allow_source_locator_mutation": False,
    "allow_voice_boundary_collapse": False,
    "allow_named_report_merge": False,
    "allow_chain_completion": False,
    "allow_witness_inflation": False,
    "allow_external_independence_inference": False,
    "allow_publication": False,
}

def check(contract, projection):
    assert contract["claim_id"] == "108-I07"
    assert contract["basis"] == {
        "path": "data/tafsir/staging/ibn-kathir-108-i07-semantic-evidence-projection-2026-11-05.json",
        "blob": "c5524f0e945443e6f78d9c0c79ee6f75828c26c6",
    }
    assert contract["required_projection"] == projection
    assert contract["consumer_rules"] == EXPECTED_RULES
    assert contract["projected_graph"] == {
        "propositions": 1,
        "voices": 1,
        "evidence_groups": 1,
        "links": 1,
        "routes": 0,
        "positive_languages": ["ar", "en"],
        "independent_witnesses_established": 0,
    }
    assert contract["explicit_boundaries"] == {
        "commentator_voice": "Ibn Kathir",
        "subsequent_named_reports_separate": ["108-I08", "108-I09", "108-I10"],
        "route": "absent",
        "chain": "absent_in_checked_excerpt",
        "chapter_witnesses": 1,
        "external_independence": "unknown",
    }
    assert all(contract[k] is False for k in (
        "database_written", "publication_ready", "claim_complete", "scholar_complete", "chapter_complete"
    ))
    assert contract["database_write_count"] == 0

def main():
    contract = json.loads(CONTRACT.read_text())
    projection = json.loads(PROJECTION.read_text())
    check(contract, projection)
    mutations = []
    for key in EXPECTED_RULES:
        if key == "mode":
            mutations.append(lambda x, key=key: x["consumer_rules"].update({key: "online"}))
        else:
            mutations.append(lambda x, key=key: x["consumer_rules"].update({key: True}))
    mutations.extend([
        lambda x: x["required_projection"].update(claim_id="108-I08"),
        lambda x: x["required_projection"]["exact_locators"][0]["arabic"].update(start=16429),
        lambda x: x["required_projection"]["evidence_groups"][0].update(routes=1),
        lambda x: x["required_projection"]["excluded_or_separate_units"].pop(),
        lambda x: x["projected_graph"].update(independent_witnesses_established=1),
        lambda x: x.update(database_written=True),
    ])
    for mutate in mutations:
        bad = copy.deepcopy(contract)
        mutate(bad)
        try:
            check(bad, projection)
        except (AssertionError, KeyError, IndexError, TypeError):
            continue
        raise AssertionError("unsafe mutation accepted")
    assert len(mutations) == 15
    print(json.dumps({"result": "PASS", "unsafe_mutations_rejected": 15, "database_writes": 0}))

if __name__ == "__main__":
    main()

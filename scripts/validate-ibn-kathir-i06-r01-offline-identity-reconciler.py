#!/usr/bin/env python3
"""Validate I06-R01 offline identity reconciliation over all link subsets."""
from __future__ import annotations
import copy
import hashlib
import itertools
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT_PATH = ROOT / "data/tafsir/staging/ibn-kathir-108-i06-r01-offline-identity-contract-2026-10-31.json"
RESULT_PATH = ROOT / "data/tafsir/staging/ibn-kathir-108-i06-r01-offline-identity-reconciler-2026-11-06.json"
CONTRACT_BLOB = "c0ef76973efa0f740f71b7e5feb8612caa2d87d2"
SPAN_HASH = "d50781c74ddcd53fb26683a3d31ba85b6d9fcdbd70c18cc0bf6f3796b99e8360"
EXPECTED_NAMES = ["Ibn Abbas", "Mujahid", "Sa'id ibn Jubayr", "Qatada"]
EXPECTED_COUNTS = {
    "symbolic_propositions": 4, "proposed_voices": 4,
    "evidence_units": 1, "links": 4, "routes": 0,
}

def require(ok: bool, message: str) -> None:
    if not ok:
        raise AssertionError(message)

def link_id(link: dict) -> str:
    return f'{link["proposition_ref"]}|{link["evidence_unit_ref"]}'

def assert_contract(c: dict) -> None:
    require(c["schema_version"] == "quranhikma-i06-r01-offline-identity-contract-v1", "contract schema")
    g = c["expected_graph"]
    require(len(g["propositions"]) == 4 and len(g["voices"]) == 4, "proposition/voice count")
    require(len(g["evidence_units"]) == 1 and len(g["links"]) == 4 and g["routes"] == [], "evidence/link/route graph")
    require(c["identity_rules"]["expected_counts"] == EXPECTED_COUNTS, "expected counts")
    require(c["identity_rules"]["evidence_identity"] == "108-I06-R01-E", "evidence identity")
    require(c["identity_rules"]["link_identity"] == ["proposition_ref", "evidence_unit_ref"], "link identity fields")
    require(c["identity_rules"]["physical_payload"] is False, "physical payload")
    require(len(c["retained_holds"]) == 6, "retained holds")
    evidence = g["evidence_units"][0]
    require(evidence["staging_key"] == "108-I06-R01-E", "evidence key")
    loc = evidence["source_locator"]
    require((loc["canonical_entry_id"], loc["start"], loc["end"]) == (48459, 16623, 16733), "locator")
    require(loc["sha256"] == SPAN_HASH, "locator hash")
    require(hashlib.sha256(loc["text"].encode("utf-8")).hexdigest() == SPAN_HASH, "span bytes")
    require([v["originating_voice_name"] for v in g["voices"]] == EXPECTED_NAMES, "voice names")
    require(all(p["physical_proposition_id"] is None for p in g["propositions"]), "proposition physical IDs")
    require(all(v["physical_voice_id"] is None for v in g["voices"]), "voice physical IDs")
    require(evidence["physical_evidence_id"] is None, "evidence physical ID")
    require(all(x["physical_link_id"] is None for x in g["links"]), "link physical IDs")

def reconcile(c: dict, existing: list[str]) -> dict:
    assert_contract(c)
    target = [link_id(x) for x in c["expected_graph"]["links"]]
    require(len(existing) == len(set(existing)), "duplicate existing link identity")
    require(set(existing).issubset(set(target)), "unknown existing link identity")
    missing = [x for x in target if x not in existing]
    final = list(existing) + missing
    require(len(final) == 4 and set(final) == set(target), "final links")
    return {
        "missing": missing,
        "inserted": len(missing),
        "final": final,
        "shared_evidence_units": 1,
    }

def validate_result(c: dict, r: dict) -> None:
    require(r["schema_version"] == "quranhikma-i06-r01-offline-identity-reconciler-v1", "result schema")
    require(r["status"] == "offline_identity_reconciler_validated_not_deployed", "status")
    require(r["basis"]["identity_contract"]["blob"] == CONTRACT_BLOB, "contract pin")
    require(r["exact_source_locator"]["sha256"] == SPAN_HASH, "result locator")
    require(r["attribution_scope"]["names"] == EXPECTED_NAMES, "result voices")
    require(r["identity_contract"]["expected_counts"] == EXPECTED_COUNTS, "result counts")
    fidelity = r["arabic_english_fidelity"]
    require(fidelity["arabic_grouped_attribution_controls_scope"] is True, "Arabic scope")
    require(fidelity["english_separate_positive_evidence_units"] == 0, "English boundary")
    require(fidelity["tabari_chains_borrowed"] is False, "borrowed chains")
    rows = r["subset_test_matrix"]
    require(len(rows) == 16 and len({x["mask"] for x in rows}) == 16, "subset matrix")
    target = [link_id(x) for x in c["expected_graph"]["links"]]
    for mask in range(16):
        row = rows[mask]
        require(row["mask"] == format(mask, "04b"), "mask order")
        existing = [x for i, x in enumerate(target) if mask & (1 << i)]
        got = reconcile(c, existing)
        require(row["existing_link_identities"] == existing, "existing identities")
        require(row["missing_link_identities"] == got["missing"], "missing identities")
        require(row["inserted_link_count"] == got["inserted"], "insert count")
        require(row["final_link_count"] == 4 and set(row["final_link_identities"]) == set(target), "final graph")
        require(row["shared_evidence_units"] == 1, "shared evidence")
        require(row["repeated_full_replay_inserted_links"] == 0, "replay no-op")
        require(row["graph_and_metadata_preserved"] is True and row["result"] == "PASS", "row result")
    s = r["subset_test_summary"]
    require(s == {
        "total_partial_link_subsets": 16, "passed": 16, "failed": 0,
        "empty_subset_inserts": 4, "complete_subset_inserts": 0,
        "repeated_complete_replay_inserts": 0, "per_proposition_evidence_clones": 0,
    }, "summary")
    require(len(r["unsafe_case_results"]) == 8 and all(x["result"] == "REJECTED" for x in r["unsafe_case_results"]), "unsafe cases")
    require(r["retained_holds"] == c["retained_holds"], "holds")
    for key in ("database_written", "publication_ready", "claim_complete", "scholar_complete", "chapter_complete"):
        require(r[key] is False, key)
    require(r["physical_ids_allocated"] == 0 and r["database_write_count"] == 0, "physical/write boundary")

def rejected(fn) -> bool:
    try:
        fn()
    except (AssertionError, KeyError, TypeError):
        return True
    return False

def main() -> None:
    contract = json.loads(CONTRACT_PATH.read_text(encoding="utf-8"))
    result = json.loads(RESULT_PATH.read_text(encoding="utf-8"))
    assert_contract(contract)
    validate_result(contract, result)
    target = [link_id(x) for x in contract["expected_graph"]["links"]]
    for size in range(5):
        for combo in itertools.combinations(target, size):
            first = reconcile(contract, list(combo))
            second = reconcile(contract, first["final"])
            require(second["inserted"] == 0, "complete replay changed graph")
    unsafe = [
        lambda: reconcile(contract, [target[0], target[0]]),
        lambda: reconcile(contract, ["unknown|108-I06-R01-E"]),
        lambda: assert_contract({**copy.deepcopy(contract), "schema_version": "bad"}),
        lambda: assert_contract({**copy.deepcopy(contract), "retained_holds": []}),
    ]
    for mutator in (
        lambda c: c["expected_graph"]["evidence_units"].append(copy.deepcopy(c["expected_graph"]["evidence_units"][0])),
        lambda c: c["expected_graph"].update(routes=[{"invented": True}]),
        lambda c: c["expected_graph"]["evidence_units"][0]["source_locator"].update(start=0),
        lambda c: c["expected_graph"]["propositions"][0].update(physical_proposition_id=1),
        lambda c: c["expected_graph"]["voices"][0].update(physical_voice_id=1),
        lambda c: c["expected_graph"]["links"][0].update(physical_link_id=1),
        lambda c: c["identity_rules"].update(physical_payload=True),
        lambda c: c["expected_graph"]["voices"][0].update(originating_voice_name="collective"),
    ):
        def run(m=mutator):
            changed = copy.deepcopy(contract)
            m(changed)
            assert_contract(changed)
        unsafe.append(run)
    require(len(unsafe) == 12 and all(rejected(x) for x in unsafe), "unsafe mutation accepted")
    print("PASS: I06-R01 identity reconciler; 16 subsets and full replay; 12 unsafe mutations rejected")

if __name__ == "__main__":
    main()

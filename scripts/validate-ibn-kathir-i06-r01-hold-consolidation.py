#!/usr/bin/env python3
"""Validate I06-R01 held route consolidation without parent-claim completion."""
from __future__ import annotations
import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STAGE = ROOT / "data/tafsir/staging"
ARTIFACT = STAGE / "ibn-kathir-108-i06-r01-hold-consolidation-2026-11-06.json"
CONSUMER = STAGE / "ibn-kathir-108-i06-r01-offline-consumer-contract-2026-11-06.json"
RECONCILER = STAGE / "ibn-kathir-108-i06-r01-offline-identity-reconciler-2026-11-06.json"
IDENTITY = STAGE / "ibn-kathir-108-i06-r01-offline-identity-contract-2026-10-31.json"
REVIEW = STAGE / "ibn-kathir-108-i06-r01-evidence-consumer-review-2026-10-31.json"

BASELINE = {
    "tabari": 18, "ibn_kathir": 15, "qurtubi": 23,
    "jalalayn": 5, "saadi": 6, "tanwir_disputed_attribution": 7,
}
NAMES = ["Ibn Abbas", "Mujahid", "Sa'id ibn Jubayr", "Qatada"]
HOLD_TEXTS = [
    "Physical assertion-mode semantic mapping needs derivative validation; allowed literal alone is insufficient.",
    "Voice category fit remains proposed/pending.",
    "Live duplicate/reuse and multi-proposition consumer handling unresolved.",
    "No complete physical payload or authorized publication preflight; R02 holds remain.",
    "Shared evidence unit and four attribution-specific links need consumer/identity review before physical allocation.",
    "Preview not integrated into six-scholar chapter assembly; historical counts unchanged.",
]
SPAN_HASH = "d50781c74ddcd53fb26683a3d31ba85b6d9fcdbd70c18cc0bf6f3796b99e8360"

def require(ok: bool, message: str) -> None:
    if not ok:
        raise AssertionError(message)

def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))

def validate(d: dict, consumer: dict, reconciler: dict, identity: dict, review: dict) -> None:
    require(d["schema_version"] == "quranhikma-i06-r01-hold-consolidation-v1", "schema")
    require((d["surah"], d["scholar_key"], d["claim_id"], d["route_id"]) == (108, "ibn_kathir", "108-I06", "108-I06-R01"), "scope")
    require(d["status"] == "offline_route_hold_consolidated_parent_claim_incomplete", "status")
    require(d["six_scholar_baseline"] == BASELINE, "baseline")
    require(d["basis"]["consumer_contract"]["blob"] == "a5ac33fc8fd0af2bad0b16166a3e59b51b100ef5", "consumer pin")
    require(d["basis"]["identity_reconciler"]["blob"] == "446f34a467c50c891357378c661dc7c8fbc36363", "reconciler pin")
    require(d["basis"]["identity_contract"]["blob"] == "c0ef76973efa0f740f71b7e5feb8612caa2d87d2", "identity pin")
    require(d["basis"]["evidence_consumer_review"]["blob"] == "d27ede69db560518d43f1ace348791fc8795fe9a", "review pin")
    g = d["frozen_graph"]
    require((g["symbolic_propositions"], g["proposed_voices"], g["evidence_units"], g["links"], g["routes"]) == (4, 4, 1, 4, 0), "graph")
    require(g["voices"] == NAMES and g["shared_evidence_key"] == "108-I06-R01-E", "graph identities")
    require(g["physical_ids"] == 0, "physical IDs")
    loc = d["exact_source_locator"]
    source = identity["expected_graph"]["evidence_units"][0]["source_locator"]
    require((loc["captured_entry_id"], loc["canonical_entry_id"], loc["start_cp"], loc["end_cp"]) == (48457, 48459, 16623, 16733), "locator")
    require(loc["span_sha256"] == source["sha256"] == SPAN_HASH, "locator hash")
    require(loc["reporting_work_id"] == 2 and loc["offsets"] == source["offsets"], "locator metadata")
    fidelity = d["arabic_english_fidelity"]
    require(fidelity["arabic_grouped_attribution_controls_scope"] is True, "Arabic scope")
    require(fidelity["english_separate_positive_evidence_units"] == 0, "English evidence boundary")
    require(fidelity["shared_paragraph_independent_witness_count"] == 1, "witness count")
    require(fidelity["absent_upper_chains_explicit"] is True and fidelity["tabari_chains_borrowed"] is False, "route limits")
    require(fidelity["english_scope_limit"] == consumer["arabic_english_fidelity"]["english_scope_limit"], "English scope")
    holds = d["active_holds"]
    require(len(holds) == 6 and [x["statement"] for x in holds] == HOLD_TEXTS, "holds")
    require(all(x["status"] == "active" and x["resolved"] is False and x["waived"] is False for x in holds), "hold states")
    require(d["resolved_holds"] == [] and d["waived_holds"] == [], "resolved/waived lists")
    require(d["hold_summary"] == {"active": 6, "resolved": 0, "waived": 0}, "hold summary")
    require(consumer["retained_holds"] == HOLD_TEXTS, "consumer hold provenance")
    require(reconciler["subset_test_summary"]["passed"] == 16 and reconciler["subset_test_summary"]["failed"] == 0, "reconciler result")
    require(review["status"] == "historical_consumer_incompatible_shared_evidence", "consumer review status")
    boundary = d["compatibility_boundary"]
    require(boundary == {
        "historical_importer_compatible": False,
        "broader_consumer_compatibility": "untested",
        "physical_reuse": "unresolved",
        "metadata_persistence_readback": "unauthorized_and_unverified",
    }, "compatibility boundary")
    effect = d["consolidation_effect"]
    require(effect == {
        "route_hold_consolidated": True,
        "parent_claim_complete": False,
        "parent_claim_level_hold_consolidated": False,
        "active_split_claim_count_changed": False,
        "publication_ready_claim_count_changed": False,
        "database_rows_changed": 0,
    }, "consolidation effect")
    for key in ("database_written", "publication_ready", "route_complete", "claim_complete", "scholar_complete", "chapter_complete"):
        require(d[key] is False, key)
    require(d["physical_ids_allocated"] == 0 and d["database_write_count"] == 0, "write boundary")
    require(d["counts_unchanged"] is True, "counts")
    require("I06 parent incomplete" in d["next_step"], "next-step boundary")

def rejected(mutator, base: dict, sources: tuple[dict, dict, dict, dict]) -> bool:
    d = copy.deepcopy(base)
    mutator(d)
    try:
        validate(d, *sources)
    except (AssertionError, KeyError, TypeError):
        return True
    return False

def main() -> None:
    data = load(ARTIFACT)
    sources = (load(CONSUMER), load(RECONCILER), load(IDENTITY), load(REVIEW))
    validate(data, *sources)
    mutations = [
        lambda d: d.update(schema_version="bad"),
        lambda d: d["six_scholar_baseline"].update(ibn_kathir=14),
        lambda d: d["frozen_graph"].update(evidence_units=4),
        lambda d: d["frozen_graph"].update(routes=1),
        lambda d: d["frozen_graph"]["voices"].pop(),
        lambda d: d["exact_source_locator"].update(start_cp=0),
        lambda d: d["arabic_english_fidelity"].update(english_separate_positive_evidence_units=4),
        lambda d: d["active_holds"].pop(),
        lambda d: d["active_holds"][0].update(resolved=True),
        lambda d: d["consolidation_effect"].update(parent_claim_complete=True),
        lambda d: d.update(database_written=True),
        lambda d: d.update(chapter_complete=True),
    ]
    require(all(rejected(m, data, sources) for m in mutations), "unsafe mutation accepted")
    print("PASS: I06-R01 route-hold consolidation; 6 active, 0 resolved, 0 waived; 12 unsafe mutations rejected")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Validate the held I06-R01 offline consumer contract."""
from __future__ import annotations
import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STAGE = ROOT / "data/tafsir/staging"
ARTIFACT = STAGE / "ibn-kathir-108-i06-r01-offline-consumer-contract-2026-11-06.json"
IDENTITY = STAGE / "ibn-kathir-108-i06-r01-offline-identity-contract-2026-10-31.json"
RECONCILER = STAGE / "ibn-kathir-108-i06-r01-offline-identity-reconciler-2026-11-06.json"
REVIEW = STAGE / "ibn-kathir-108-i06-r01-evidence-consumer-review-2026-10-31.json"
PROJECTION = STAGE / "ibn-kathir-108-i06-r01-evidence-projection-2026-11-01.json"

BASELINE = {
    "tabari": 18, "ibn_kathir": 15, "qurtubi": 23,
    "jalalayn": 5, "saadi": 6, "tanwir_disputed_attribution": 7,
}
NAMES = ["Ibn Abbas", "Mujahid", "Sa'id ibn Jubayr", "Qatada"]
PROPS = [f"108-I06-R01-VIEW-{i}-P" for i in range(1, 5)]
HOLDS = [
    "Physical assertion-mode semantic mapping needs derivative validation; allowed literal alone is insufficient.",
    "Voice category fit remains proposed/pending.",
    "Live duplicate/reuse and multi-proposition consumer handling unresolved.",
    "No complete physical payload or authorized publication preflight; R02 holds remain.",
    "Shared evidence unit and four attribution-specific links need consumer/identity review before physical allocation.",
    "Preview not integrated into six-scholar chapter assembly; historical counts unchanged.",
]
BLOBS = {
    "reconciler": "446f34a467c50c891357378c661dc7c8fbc36363",
    "identity": "c0ef76973efa0f740f71b7e5feb8612caa2d87d2",
    "review": "d27ede69db560518d43f1ace348791fc8795fe9a",
    "projection": "db95e31463eb0bf3f3f8eb32b40fd20d1d28d983",
    "cross": "d5fcb66f8687f802b7a0d88626a2d830dbba0f12",
}
SPAN_HASH = "d50781c74ddcd53fb26683a3d31ba85b6d9fcdbd70c18cc0bf6f3796b99e8360"

def require(ok: bool, message: str) -> None:
    if not ok:
        raise AssertionError(message)

def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))

def validate(d: dict, identity: dict, reconciler: dict, review: dict, projection: dict) -> None:
    require(d["schema_version"] == "quranhikma-i06-r01-offline-consumer-contract-v1", "schema")
    require((d["surah"], d["scholar_key"], d["claim_id"], d["route_id"]) == (108, "ibn_kathir", "108-I06", "108-I06-R01"), "scope")
    require(d["status"] == "offline_consumer_contract_held_not_deployed", "status")
    require(d["six_scholar_baseline"] == BASELINE, "baseline")
    b = d["basis"]
    require(b["identity_reconciler"]["blob"] == BLOBS["reconciler"], "reconciler pin")
    require(b["identity_contract"]["blob"] == BLOBS["identity"], "identity pin")
    require(b["evidence_consumer_review"]["blob"] == BLOBS["review"], "review pin")
    require(b["evidence_projection"]["blob"] == BLOBS["projection"], "projection pin")
    require(b["cross_work_review"]["blob"] == BLOBS["cross"], "cross-work pin")
    g = d["frozen_graph"]
    require((g["symbolic_propositions"], g["proposed_voices"], g["evidence_units"], g["links"], g["routes"]) == (4, 4, 1, 4, 0), "graph")
    require(g["proposition_keys"] == PROPS and g["voice_names"] == NAMES, "attribution identities")
    require(g["evidence_key"] == "108-I06-R01-E", "evidence identity")
    require(g["link_identity_fields"] == ["proposition_ref", "evidence_unit_ref"], "link identity")
    source = identity["expected_graph"]["evidence_units"][0]["source_locator"]
    exact = d["exact_evidence_contract"]
    require(exact["unit_kind"] == "grouped_named_attribution" and exact["reporting_work_id"] == 2, "evidence metadata")
    require(exact["physical_evidence_id"] is None, "evidence physical ID")
    require(exact["independence_state"] == "unknown" and exact["authentication"] == "not_assessed", "evidence limits")
    for key in ("staging_key", "route_id", "captured_entry_id", "canonical_entry_id", "start", "end", "sha256", "offsets"):
        require(exact["source_locator"][key] == source[key], f"locator {key}")
    require(exact["source_locator"]["sha256"] == SPAN_HASH, "locator hash")
    require(exact["scope"] == identity["expected_graph"]["evidence_units"][0]["scope"], "evidence scope")
    ops = d["consumer_operations"]
    require([x["order"] for x in ops] == list(range(1, 7)), "operation order")
    require([x["operation"] for x in ops] == [
        "resolve_shared_evidence", "preserve_evidence_metadata", "resolve_attribution_pairs",
        "reconcile_links", "readback", "preserve_holds",
    ], "operations")
    read = d["read_model_contract"]
    require(read == {
        "evidence_instances": 1, "attribution_records": 4, "links": 4, "routes": 0,
        "evidence_render_once": True, "attribution_records_each_reference_shared_evidence": True,
        "english_scope_limit_exposed": True, "physical_ids_exposed": 0,
        "publication_badge": False,
    }, "read model")
    fidelity = d["arabic_english_fidelity"]
    require(fidelity["arabic_grouped_attribution_controls_scope"] is True, "Arabic scope")
    require(fidelity["english_separate_positive_evidence_units"] == 0, "English evidence boundary")
    require(fidelity["independent_witnesses_established"] == 1, "witness count")
    require(fidelity["absent_upper_chains_explicit"] is True and fidelity["tabari_chains_borrowed"] is False, "route limits")
    require("merges R01 and R02" in fidelity["english_scope_limit"], "English limit")
    compat = d["compatibility_findings"]
    require(compat["historical_importer_status"] == "incompatible", "historical consumer")
    require(compat["physical_reuse_state"] == "unresolved", "physical reuse")
    require(compat["historical_importer_limit"] == review["finding"], "review finding")
    require("singular payload voice" in compat["current_voice_projection_limit"], "voice consumer limit")
    require("do not assert incompatibility for every repository consumer" in compat["scope_limit"], "scope caveat")
    require(len(d["reject_conditions"]) == 8, "reject conditions")
    require(d["retained_holds"] == HOLDS and d["active_holds"] == 6, "holds")
    require((d["resolved_holds"], d["waived_holds"]) == (0, 0), "hold resolution")
    require(reconciler["subset_test_summary"]["passed"] == 16 and reconciler["subset_test_summary"]["failed"] == 0, "reconciler basis")
    require(projection["staging_metadata"]["source_locator"]["sha256"] == SPAN_HASH, "projection locator")
    require(projection["fidelity_limits"][0] == identity["retained_metadata"]["fidelity_limits"][0], "fidelity provenance")
    for key in ("database_written", "publication_ready", "claim_complete", "scholar_complete", "chapter_complete"):
        require(d[key] is False, key)
    require(d["physical_ids_allocated"] == 0 and d["database_write_count"] == 0, "write boundary")
    require(d["counts_unchanged"] is True, "counts")

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
    sources = (load(IDENTITY), load(RECONCILER), load(REVIEW), load(PROJECTION))
    validate(data, *sources)
    mutations = [
        lambda d: d.update(schema_version="bad"),
        lambda d: d["six_scholar_baseline"].update(ibn_kathir=14),
        lambda d: d["frozen_graph"].update(evidence_units=4),
        lambda d: d["frozen_graph"].update(routes=1),
        lambda d: d["frozen_graph"]["voice_names"].pop(),
        lambda d: d["exact_evidence_contract"]["source_locator"].update(start=0),
        lambda d: d["exact_evidence_contract"].update(reporting_work_id=1),
        lambda d: d["consumer_operations"].pop(),
        lambda d: d["read_model_contract"].update(evidence_instances=4),
        lambda d: d["arabic_english_fidelity"].update(english_separate_positive_evidence_units=4),
        lambda d: d["compatibility_findings"].update(physical_reuse_state="resolved"),
        lambda d: d["retained_holds"].pop(),
        lambda d: d.update(database_written=True),
        lambda d: d.update(chapter_complete=True),
    ]
    require(all(rejected(m, data, sources) for m in mutations), "unsafe mutation accepted")
    print("PASS: I06-R01 offline consumer contract; 14 unsafe mutations rejected")

if __name__ == "__main__":
    main()

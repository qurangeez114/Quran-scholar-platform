#!/usr/bin/env python3
"""Validate the bounded post-I08 Ibn Kathir 108 closure audit."""
from __future__ import annotations
import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTIFACT = ROOT / "data/tafsir/staging/ibn-kathir-108-closure-audit-after-i08-2026-11-05.json"
IDS = [
    "108-I01-A", "108-I01-B", "108-I02", "108-I03", "108-I04A",
    "108-I04B", "108-I04C", "108-I04D", "108-I05", "108-I06",
    "108-I07", "108-I08", "108-I09", "108-I10", "108-I11",
]
CONSOLIDATED = [
    "108-I01-A", "108-I01-B", "108-I03", "108-I04A", "108-I04B",
    "108-I04C", "108-I04D", "108-I07", "108-I08", "108-I09",
    "108-I10", "108-I11",
]
BASELINE = {
    "tabari": 18, "ibn_kathir": 15, "qurtubi": 23,
    "jalalayn": 5, "saadi": 6, "tanwir_disputed_attribution": 7,
}
I08_BLOB = "bfa63a1bf528c64c0dd760cdc3ad95d99cea0926"
I09_BLOB = "881e14689e63a27305a71cf3752d679e482e7ca9"
I06_BLOB = "c0ef76973efa0f740f71b7e5feb8612caa2d87d2"
LOCATOR_HASH = "d50781c74ddcd53fb26683a3d31ba85b6d9fcdbd70c18cc0bf6f3796b99e8360"

def require(ok: bool, message: str) -> None:
    if not ok:
        raise AssertionError(message)

def validate(d: dict) -> None:
    require(d["schema_version"] == "quranhikma-ibn-kathir-108-closure-audit-after-i08-v1", "schema")
    require(d["surah"] == 108 and d["scholar_key"] == "ibn_kathir", "scope")
    require(d["six_scholar_baseline"] == BASELINE, "baseline")
    rows = d["claim_rows"]
    require(len(rows) == 15 and [r["claim_id"] for r in rows] == IDS, "split inventory")
    require(len({r["claim_id"] for r in rows}) == 15, "unique claims")
    by_id = {r["claim_id"]: r for r in rows}
    require(all(by_id[x]["closure_class"] == "offline_hold_consolidated" for x in CONSOLIDATED), "claim closure")
    require(by_id["108-I02"]["closure_class"] == "route_hold_consolidated_for_r05_claim_incomplete", "I02 parent")
    c = d["coverage_summary"]
    require(c["active_split_claims"] == 15 and c["publication_ready_claims"] == 0, "claim counts")
    require(c["claim_level_offline_hold_consolidated"] == CONSOLIDATED, "consolidated list")
    require(c["claim_level_offline_hold_consolidated_count"] == 12, "consolidated count")
    require(c["route_level_offline_hold_consolidated"] == ["108-I02-R05"], "route hold")
    require(c["route_level_offline_hold_consolidated_count"] == 1 and c["i02_claim_complete"] is False, "I02 incomplete")
    require(c["reviewed_routes"] == 18 and c["publication_ready_routes"] == 0, "route coverage")
    require(c["next_repair_claim"] == "108-I06", "next claim")
    require(d["basis"]["i08_consolidation"]["blob"] == I08_BLOB, "I08 basis")
    require(d["basis"]["i09_consolidation"]["blob"] == I09_BLOB, "I09 basis")
    require(d["basis"]["i06_identity_contract"]["blob"] == I06_BLOB, "I06 basis")
    i08 = d["i08_refresh_finding"]
    require((i08["active_holds"], i08["resolved_holds"], i08["waived_holds"]) == (6, 0, 0), "I08 holds")
    require(i08["graph"] == {"propositions": 1, "voices": 1, "evidence_groups": 1, "links": 1, "routes": 0}, "I08 graph")
    require(i08["positive_languages"] == ["ar", "en"] and i08["competing_or_adjacent_units_separate"] == 4, "I08 fidelity")
    require(i08["extracted_route"] == "absent" and i08["external_independence"] == "unknown", "I08 limits")
    i09 = d["i09_reconciliation_finding"]
    require(i09["ci_observed"] == {"run_id": 41563569434, "preflight": "success", "grading_boundaries": "success"}, "I09 CI")
    require(i09["active_holds"] == 4 and len(i09["remaining_holds"]) == 4, "I09 holds")
    require(i09["database_writes"] == 0 and i09["publication_ready"] is False, "I09 safety")
    n = d["selected_next_repair"]
    require((n["claim_id"], n["route_id"]) == ("108-I06", "108-I06-R01"), "selected repair")
    require(n["basis"]["blob"] == I06_BLOB and n["partial_link_subsets"] == 16, "identity contract")
    require(n["expected_graph"] == {"symbolic_propositions": 4, "proposed_voices": 4, "evidence_units": 1, "links": 4, "routes": 0}, "I06 graph")
    require(n["shared_evidence_identity"] == "108-I06-R01-E", "shared evidence")
    require(n["exact_locator"]["span_sha256"] == LOCATOR_HASH, "exact locator")
    require(n["repeated_full_replay_expected"] == "no-op" and len(n["reject"]) == 6, "replay contract")
    require(d["route_summary"]["expected_routes"] == 18 and d["route_summary"]["publication_ready_routes"] == 0, "routes")
    require(all(r["publication_ready"] is False for r in rows), "row readiness")
    for key in ("database_written", "publication_ready", "scholar_complete", "chapter_complete"):
        require(d[key] is False, key)
    require(d["database_write_count"] == 0 and d["counts_unchanged"] is True, "write/count boundary")

def rejected(mutator) -> bool:
    d = json.loads(ARTIFACT.read_text(encoding="utf-8"))
    mutator(d)
    try:
        validate(d)
    except (AssertionError, KeyError, TypeError):
        return True
    return False

def main() -> None:
    data = json.loads(ARTIFACT.read_text(encoding="utf-8"))
    validate(data)
    mutations = [
        lambda d: d.update(schema_version="bad"),
        lambda d: d["six_scholar_baseline"].update(ibn_kathir=14),
        lambda d: d["claim_rows"].pop(),
        lambda d: d["claim_rows"][11].update(closure_class="pending"),
        lambda d: d["coverage_summary"].update(claim_level_offline_hold_consolidated_count=11),
        lambda d: d["coverage_summary"].update(i02_claim_complete=True),
        lambda d: d["i08_refresh_finding"]["graph"].update(routes=1),
        lambda d: d["i09_reconciliation_finding"].update(active_holds=0),
        lambda d: d["selected_next_repair"].update(partial_link_subsets=15),
        lambda d: d["selected_next_repair"]["expected_graph"].update(evidence_units=4),
        lambda d: d.update(database_written=True),
        lambda d: d.update(chapter_complete=True),
    ]
    require(all(rejected(m) for m in mutations), "unsafe mutation accepted")
    print("PASS: post-I08 closure audit; 12 unsafe mutations rejected")

if __name__ == "__main__":
    main()

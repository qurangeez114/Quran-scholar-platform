#!/usr/bin/env python3
"""Validate the Ibn Kathir 108 closure audit after I05-A03 hold consolidation."""

from __future__ import annotations

import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTIFACT = ROOT / "data/tafsir/staging/ibn-kathir-108-closure-audit-after-i05-a03-2026-11-11.json"
BASELINE = {"tabari": 18, "ibn_kathir": 15, "qurtubi": 23, "jalalayn": 5, "saadi": 6, "tanwir_disputed_attribution": 7}
CLAIMS = ["108-I01-A", "108-I01-B", "108-I02", "108-I03", "108-I04A", "108-I04B", "108-I04C", "108-I04D", "108-I05", "108-I06", "108-I07", "108-I08", "108-I09", "108-I10", "108-I11"]
CLAIM_HOLDS = ["108-I01-A", "108-I01-B", "108-I03", "108-I04A", "108-I04B", "108-I04C", "108-I04D", "108-I06", "108-I07", "108-I08", "108-I09", "108-I10", "108-I11"]
ROUTE_HOLDS = ["108-I02-R05", "108-I06-R01", "108-I06-R02"]
BLOBS = {
    "prior_closure_audit": "49d8e51b154010edd6ee92288003ad5549adca2d",
    "i05_a03_hold_consolidation": "179d18c60209968049600c9fe36a122ee74745d5",
    "i05_integration_readiness": "2b1a7abe57d9cb500d60c14e1c5fa6a106ee35cd",
    "i05_held_annotated_assembly": "991e19f469ebbbb6a8373587152a38e9eb140cfe",
    "i05_coverage_reconciliation": "3d05d0e7ee53ed4c1c3a6d292177124b00ea902b",
}
GRAPH = {"propositions": 2, "mapped_voices": 1, "unresolved_voice_mappings": 1, "evidence_units": 2, "links": 2, "routes": 0, "physical_ids": 0}


def require(ok: bool, label: str) -> None:
    if not ok:
        raise ValueError(label)


def validate(d: dict) -> None:
    require(d["schema_version"] == "quranhikma-ibn-kathir-108-closure-audit-after-i05-a03-v1", "schema")
    require((d["surah"], d["scholar_key"]) == (108, "ibn_kathir"), "scope")
    require(d["status"] == "i05_a03_unit_hold_consolidated_i05_parent_hold_selected_scholar_incomplete", "status")
    require(d["six_scholar_baseline"] == BASELINE, "baseline")
    require({k: v["blob"] for k, v in d["basis"].items()} == BLOBS, "basis")

    inv = d["inventory_reconciliation"]
    require(inv["authoritative_split_claim_count"] == 15 and inv["authoritative_split_ids"] == CLAIMS, "split inventory")
    require(inv["historical_audit_parent_count"] == 14 and inv["retired_parent"] == "108-I01", "historical inventory")
    require(inv["active_replacements"] == ["108-I01-A", "108-I01-B"] and inv["mixed_or_partial_inventory_allowed"] is False, "I01 lifecycle")
    routes = d["route_summary"]
    require((routes["expected_routes"], routes["reviewed_routes"], routes["unreviewed_routes"], routes["publication_ready_routes"]) == (18, 18, 0, 0), "routes")

    rows = d["claim_rows"]
    require(len(rows) == 15 and [x["claim_id"] for x in rows] == CLAIMS, "claim rows")
    require(all(x["publication_ready"] is False for x in rows), "claim readiness")
    by_id = {x["claim_id"]: x for x in rows}
    require(by_id["108-I05"]["closure_class"] == "a03_unit_hold_consolidated_parent_claim_incomplete", "I05 row")
    require("A03 bounded English transition absent" in by_id["108-I05"]["translation_state"], "I05 English absence")
    require("anonymous voice deliberately unresolved" in by_id["108-I05"]["chain_state"], "I05 voice absence")
    require(by_id["108-I06"]["closure_class"] == "offline_parent_hold_consolidated_claim_incomplete", "I06 row")

    cov = d["coverage_summary"]
    require((cov["active_split_claims"], cov["publication_ready_claims"], cov["reviewed_routes"], cov["publication_ready_routes"]) == (15, 0, 18, 0), "coverage counts")
    require(cov["claim_level_offline_hold_consolidated"] == CLAIM_HOLDS and cov["claim_level_offline_hold_consolidated_count"] == 13, "claim holds")
    require(cov["route_level_offline_hold_consolidated"] == ROUTE_HOLDS and cov["route_level_offline_hold_consolidated_count"] == 3, "route holds")
    require(cov["i02_claim_complete"] is False and cov["i05_claim_complete"] is False and cov["i06_claim_complete"] is False, "incomplete claims")
    require(cov["next_repair_claim"] == "108-I05" and cov["next_repair_route"] is None, "next coverage repair")

    finding = d["i05_a03_refresh_finding"]
    require(finding["unit_hold_consolidated"] is True and finding["unit_complete"] is False, "A03 hold state")
    require(finding["frozen_offline_graph"] == GRAPH, "A03 graph")
    src = finding["exact_source"]
    require((src["captured_entry_id"], src["canonical_entry_id"], src["start"], src["end"]) == (48457, 48458, 13894, 14013), "A03 locator")
    require(src["sha256"] == "bf65c4f4aa6d3501a1de6ec1eafed518e242d672f0ef813aaf0a8d52e7de6657", "A03 source hash")
    require(src["clause_hashes"] == {"anonymous_marker": "3604139e520f446c72a953392e6d460d0ab0a70bc0fc3f3777a4f1cdcc8be23f", "interpretation": "f93becd7177f51beee1fed71b610b8dba807917add69438bb5ef8d27ffb03d37", "reporting": "2c59276a023761295b34ff3804ebb8660464e1bec50a66e15ade2aa2b5f8de32"}, "A03 clause hashes")
    require((finding["active_holds"], finding["resolved_holds"], finding["waived_holds"]) == (6, 0, 0), "A03 holds")
    require(finding["anonymous_originator_identity"] is None and finding["anonymous_originator_number"] == "unspecified", "anonymous boundary")
    require(finding["ibn_jarir_role"] == "earlier_reporter_not_proven_originator_or_endorser" and finding["current_reporting_author"] == "Ibn Kathir", "reporting boundary")
    require(finding["bounded_english_transition"] == "absent" and finding["english_paraphrase_is_source_quotation"] is False, "English boundary")
    require(finding["parent_claim_level_hold_consolidated"] is False and finding["parent_claim_complete"] is False and finding["database_writes"] == 0, "parent boundary")

    selected = d["selected_next_repair"]
    require((selected["claim_id"], selected["kind"], selected["verse_mapping"]) == ("108-I05", "parent_claim_hold_consolidation", "2"), "selection")
    require(len(selected["required_boundaries"]) == 5, "selection boundaries")
    require(selected["physical_ids_allocated"] == 0 and selected["database_written"] is False and selected["publication_ready"] is False and selected["claim_complete"] is False, "selection safety")
    require(d["selection_rationale"]["selected"] == "108-I05 parent-claim hold consolidation", "selection rationale")
    require(d["selection_rationale"]["deferred"] == [{"claim_id": "108-I02", "reason": "Only R05 has a consolidated route hold; the I02 parent claim remains incomplete."}], "deferred I02")
    require(len(d["disagreements_and_absences"]) == 6, "disagreements and absences")
    require(d["repository_observation"]["prior_workflow_run_id"] == 42999847192 and d["repository_observation"]["prior_workflow_state"] == "completed_success", "workflow observation")
    require(d["validation"] == {"result": "PASS", "local_validator": "scripts/validate-ibn-kathir-108-closure-audit-after-i05-a03.py", "unsafe_mutations_rejected": 22}, "validation declaration")
    require(d["counts_unchanged"] is True and d["physical_ids_allocated"] == 0, "count boundary")
    require(d["database_written"] is False and d["database_write_count"] == 0, "database boundary")
    require(d["publication_ready"] is False and d["scholar_complete"] is False and d["chapter_complete"] is False, "completion boundary")
    require("parent-claim hold consolidation" in d["next_step"] and "perform a database operation" in d["next_step"], "next step")


def set_path(d: dict, path: tuple[str, ...], value: object) -> None:
    target = d
    for key in path[:-1]:
        target = target[key]
    target[path[-1]] = value


def reject_mutations(source: dict) -> int:
    mutations = [
        (("six_scholar_baseline", "tabari"), 17),
        (("basis", "i05_a03_hold_consolidation", "blob"), "0" * 40),
        (("inventory_reconciliation", "authoritative_split_claim_count"), 14),
        (("inventory_reconciliation", "mixed_or_partial_inventory_allowed"), True),
        (("route_summary", "reviewed_routes"), 17),
        (("route_summary", "publication_ready_routes"), 1),
        (("coverage_summary", "claim_level_offline_hold_consolidated_count"), 14),
        (("coverage_summary", "route_level_offline_hold_consolidated_count"), 4),
        (("coverage_summary", "i05_claim_complete"), True),
        (("i05_a03_refresh_finding", "unit_hold_consolidated"), False),
        (("i05_a03_refresh_finding", "frozen_offline_graph", "mapped_voices"), 2),
        (("i05_a03_refresh_finding", "frozen_offline_graph", "physical_ids"), 1),
        (("i05_a03_refresh_finding", "anonymous_originator_identity"), "Ibn Jarir"),
        (("i05_a03_refresh_finding", "anonymous_originator_number"), "plural"),
        (("i05_a03_refresh_finding", "current_reporting_author"), "Ibn Jarir"),
        (("i05_a03_refresh_finding", "bounded_english_transition"), "present"),
        (("i05_a03_refresh_finding", "parent_claim_level_hold_consolidated"), True),
        (("selected_next_repair", "kind"), "publish"),
        (("selected_next_repair", "physical_ids_allocated"), 1),
        (("database_written",), True),
        (("publication_ready",), True),
        (("chapter_complete",), True),
    ]
    rejected = 0
    for path, value in mutations:
        candidate = copy.deepcopy(source)
        set_path(candidate, path, value)
        try:
            validate(candidate)
        except (KeyError, TypeError, ValueError):
            rejected += 1
    return rejected


def main() -> None:
    data = json.loads(ARTIFACT.read_text())
    validate(data)
    rejected = reject_mutations(data)
    require(rejected == 22, f"unsafe mutations rejected: {rejected}/22")
    print("PASS: closure audit after I05-A03; 22/22 unsafe mutations rejected")


if __name__ == "__main__":
    main()

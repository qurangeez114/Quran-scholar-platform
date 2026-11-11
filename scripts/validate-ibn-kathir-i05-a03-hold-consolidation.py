#!/usr/bin/env python3
"""Validate the held I05-A03 consolidation without promoting completion."""

from __future__ import annotations

import copy
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ARTIFACT = ROOT / "data/tafsir/staging/ibn-kathir-108-i05-a03-hold-consolidation-2026-11-11.json"
BASELINE = {"tabari": 18, "ibn_kathir": 15, "qurtubi": 23, "jalalayn": 5, "saadi": 6, "tanwir_disputed_attribution": 7}
BLOBS = {
    "anonymous_originator_review": "7ad04d13290d196eaa19d82c05ea3e81defeabd3",
    "post_i06_parent_closure_audit": "49d8e51b154010edd6ee92288003ad5549adca2d",
    "integration_readiness": "2b1a7abe57d9cb500d60c14e1c5fa6a106ee35cd",
    "held_annotated_assembly": "991e19f469ebbbb6a8373587152a38e9eb140cfe",
    "coverage_reconciliation": "3d05d0e7ee53ed4c1c3a6d292177124b00ea902b",
}
GRAPH = {"propositions": 2, "mapped_voices": 1, "unresolved_voice_mappings": 1, "evidence_units": 2, "links": 2, "routes": 0, "physical_ids": 0}
HOLD_CLASSES = {"anonymous_voice_schema", "consumer_round_trip", "authorized_schema_rollout", "physical_integration", "english_fidelity", "adjacent_i05_gaps"}
CLAUSES = [
    ("anonymous_marker", 13894, 13902, "وَقِيلَ:", "3604139e520f446c72a953392e6d460d0ab0a70bc0fc3f3777a4f1cdcc8be23f"),
    ("interpretation", 13921, 13956, "اسْتَقْبِلْ بِنَحْرِكَ الْقِبْلَةَ.", "f93becd7177f51beee1fed71b610b8dba807917add69438bb5ef8d27ffb03d37"),
    ("reporting", 13957, 14011, "ذَكَرَ هَذِهِ الْأَقْوَالَ الثَّلَاثَةَ ابْنُ جَرِيرٍ.", "2c59276a023761295b34ff3804ebb8660464e1bec50a66e15ade2aa2b5f8de32"),
]


def require(ok: bool, label: str) -> None:
    if not ok:
        raise ValueError(label)


def validate(d: dict) -> None:
    require(d["schema_version"] == "quranhikma-ibn-kathir-108-i05-a03-hold-consolidation-v1", "schema")
    require((d["surah"], d["scholar_key"], d["claim_id"], d["unit_id"]) == (108, "ibn_kathir", "108-I05", "108-I05-A03"), "scope")
    require(d["status"] == "offline_unit_hold_consolidated_parent_claim_incomplete", "status")
    require(d["six_scholar_baseline"] == BASELINE, "baseline")
    require({k: v["blob"] for k, v in d["basis"].items()} == BLOBS, "basis")

    inv = d["inventory_boundary"]
    require(inv == {"active_split_claims": 15, "reviewed_routes": 18, "claim_level_holds_before_step": 13, "claim_level_holds_after_step": 13, "route_level_holds": 3, "publication_ready_claims": 0, "publication_ready_routes": 0}, "inventory")
    require(d["frozen_offline_graph"] == GRAPH, "graph")

    source = d["exact_source"]
    require((source["captured_entry_id"], source["canonical_entry_id"], source["start"], source["end"]) == (48457, 48458, 13894, 14013), "source span")
    require(source["offsets"] == "zero-based Unicode code points, half-open, unnormalized", "offsets")
    require(source["sha256"] == "bf65c4f4aa6d3501a1de6ec1eafed518e242d672f0ef813aaf0a8d52e7de6657", "source hash")
    require(len(source["clause_locators"]) == 3, "clause count")
    for actual, expected in zip(source["clause_locators"], CLAUSES):
        require((actual["key"], actual["start"], actual["end"], actual["text"], actual["sha256"]) == expected, f"clause {expected[0]}")
        require(actual["end"] - actual["start"] == len(actual["text"]), f"clause length {expected[0]}")
        require(hashlib.sha256(actual["text"].encode()).hexdigest() == actual["sha256"], f"clause hash {expected[0]}")

    boundary = d["attribution_and_fidelity_boundary"]
    require(boundary["anonymous_originator_identity"] is None, "anonymous identity")
    require(boundary["anonymous_originator_number"] == "unspecified", "anonymous number")
    require(boundary["anonymous_voice_row_present"] is False, "anonymous voice")
    require(boundary["current_reporting_author"] == "Ibn Kathir", "reporting author")
    require(boundary["ibn_jarir_role"] == "earlier_reporter_not_proven_originator_or_endorser", "Ibn Jarir role")
    require(boundary["bounded_english_transition"] == "absent", "English absence")
    require(boundary["english_paraphrase_is_source_quotation"] is False, "quotation boundary")
    require(boundary["facing_qibla_and_sacrificial_slaughter_are_separate_interpretations"] is True, "interpretation disagreement")
    require(boundary["arabic_controls_attribution"] is True, "Arabic authority")

    holds = d["active_holds"]
    require(len(holds) == 6, "hold count")
    require({h["hold_class"] for h in holds} == HOLD_CLASSES, "hold classes")
    require(all(h["status"] == "active" and h["resolved"] is False and h["waived"] is False for h in holds), "hold state")
    require(d["resolved_holds"] == [] and d["waived_holds"] == [], "closed holds")
    require(d["hold_summary"] == {"active": 6, "resolved": 0, "waived": 0}, "hold summary")
    require(len(d["disagreements_and_absences"]) == 5, "disagreements and absences")

    effect = d["consolidation_effect"]
    require(effect["unit_hold_consolidated"] is True, "unit consolidation")
    require(effect["parent_claim_level_hold_consolidated"] is False and effect["parent_claim_complete"] is False, "parent boundary")
    require(all(effect[k] is False for k in ("active_split_claim_count_changed", "claim_level_hold_count_changed", "route_level_hold_count_changed", "publication_ready_claim_count_changed")), "unchanged counts")
    require(effect["database_rows_changed"] == 0, "row changes")
    require(d["repository_observation"]["prior_workflow_run_id"] == 42992685035 and d["repository_observation"]["prior_workflow_state"] == "completed_success", "workflow observation")
    require(d["validation"] == {"result": "PASS", "validator": "scripts/validate-ibn-kathir-i05-a03-hold-consolidation.py", "unsafe_mutations_rejected": 22}, "validation declaration")
    require(d["counts_unchanged"] is True and d["physical_ids_allocated"] == 0, "physical boundary")
    require(d["database_written"] is False and d["database_write_count"] == 0, "database boundary")
    for flag in ("publication_ready", "unit_complete", "claim_complete", "scholar_complete", "chapter_complete"):
        require(d[flag] is False, flag)
    require("Refresh the 15-claim and 18-route" in d["next_step"] and "perform no database operation" in d["next_step"], "next step")


def set_path(d: dict, path: tuple[str, ...], value: object) -> None:
    target = d
    for key in path[:-1]:
        target = target[key]
    target[path[-1]] = value


def reject_mutations(source: dict) -> int:
    mutations = [
        (("six_scholar_baseline", "ibn_kathir"), 16),
        (("basis", "anonymous_originator_review", "blob"), "0" * 40),
        (("inventory_boundary", "claim_level_holds_after_step"), 14),
        (("inventory_boundary", "publication_ready_claims"), 1),
        (("frozen_offline_graph", "mapped_voices"), 2),
        (("frozen_offline_graph", "unresolved_voice_mappings"), 0),
        (("frozen_offline_graph", "physical_ids"), 1),
        (("exact_source", "start"), 13895),
        (("exact_source", "sha256"), "0" * 64),
        (("attribution_and_fidelity_boundary", "anonymous_originator_identity"), "Ibn Jarir"),
        (("attribution_and_fidelity_boundary", "anonymous_originator_number"), "plural"),
        (("attribution_and_fidelity_boundary", "anonymous_voice_row_present"), True),
        (("attribution_and_fidelity_boundary", "current_reporting_author"), "Ibn Jarir"),
        (("attribution_and_fidelity_boundary", "bounded_english_transition"), "present"),
        (("attribution_and_fidelity_boundary", "english_paraphrase_is_source_quotation"), True),
        (("attribution_and_fidelity_boundary", "facing_qibla_and_sacrificial_slaughter_are_separate_interpretations"), False),
        (("consolidation_effect", "parent_claim_level_hold_consolidated"), True),
        (("consolidation_effect", "parent_claim_complete"), True),
        (("physical_ids_allocated",), 1),
        (("database_written",), True),
        (("publication_ready",), True),
        (("unit_complete",), True),
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
    print("PASS: I05-A03 held consolidation; 22/22 unsafe mutations rejected")


if __name__ == "__main__":
    main()

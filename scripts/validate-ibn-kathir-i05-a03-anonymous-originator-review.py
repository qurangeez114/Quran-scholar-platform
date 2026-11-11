#!/usr/bin/env python3
"""Validate the bounded Surah 108 I05-A03 anonymous-originator review."""

from __future__ import annotations

import copy
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ARTIFACT = ROOT / "data/tafsir/staging/ibn-kathir-108-i05-a03-anonymous-originator-review-2026-11-11.json"

BASELINE = {
    "tabari": 18,
    "ibn_kathir": 15,
    "qurtubi": 23,
    "jalalayn": 5,
    "saadi": 6,
    "tanwir_disputed_attribution": 7,
}
BASIS_BLOBS = {
    "post_i06_parent_audit": "49d8e51b154010edd6ee92288003ad5549adca2d",
    "bounded_draft": "2c574e88f95e586c11d990ffa9afa8950a32295d",
    "attribution_review": "688752ac1e4cfe8cbeaca0bb0f2f8ba75167d5c2",
    "constraint_refresh": "acbd7ae6a64db4b8c22e4ac5da3adc06cae5f6d5",
    "offline_consumer_preview": "9a297bf229f9cebc122475f52b350f5571835dc3",
    "rollout_requirements": "16c45e23dba26fca59565cd2dbf383bdfba6f18f",
}
CLAUSES = [
    ("anonymous_marker", 13894, 13902, "وَقِيلَ:", "3604139e520f446c72a953392e6d460d0ab0a70bc0fc3f3777a4f1cdcc8be23f"),
    ("interpretation", 13921, 13956, "اسْتَقْبِلْ بِنَحْرِكَ الْقِبْلَةَ.", "f93becd7177f51beee1fed71b610b8dba807917add69438bb5ef8d27ffb03d37"),
    ("reporting", 13957, 14011, "ذَكَرَ هَذِهِ الْأَقْوَالَ الثَّلَاثَةَ ابْنُ جَرِيرٍ.", "2c59276a023761295b34ff3804ebb8660464e1bec50a66e15ade2aa2b5f8de32"),
]
HOLD_CLASSES = {
    "anonymous_voice_schema",
    "consumer_round_trip",
    "authorized_schema_rollout",
    "physical_integration",
    "english_fidelity",
    "adjacent_i05_gaps",
}
FORBIDDEN = {
    "Passive qila identifies Ibn Jarir as the originator.",
    "A missing name establishes a group or plurality.",
    "Ibn Kathir endorses the anonymous interpretation.",
    "The facing-qibla interpretation means sacrificial slaughter.",
}


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def validate(d: dict) -> None:
    require(d["schema_version"] == "quranhikma-ibn-kathir-108-i05-a03-anonymous-originator-review-v1", "schema")
    require((d["surah"], d["scholar_key"], d["claim_id"], d["unit_id"]) == (108, "ibn_kathir", "108-I05", "108-I05-A03"), "scope")
    require(d["six_scholar_baseline"] == BASELINE, "baseline")
    require({k: v["blob"] for k, v in d["basis"].items()} == BASIS_BLOBS, "basis blobs")

    source = d["exact_source"]
    require((source["captured_entry_id"], source["canonical_entry_id"], source["start"], source["end"]) == (48457, 48458, 13894, 14013), "source locator")
    require(source["offsets"] == "zero-based Unicode code points, half-open, unnormalized", "offset convention")
    require(source["sha256"] == "bf65c4f4aa6d3501a1de6ec1eafed518e242d672f0ef813aaf0a8d52e7de6657", "source hash")
    require(len(source["clause_locators"]) == len(CLAUSES), "clause count")
    for actual, expected in zip(source["clause_locators"], CLAUSES):
        key, start, end, text, digest = expected
        require((actual["key"], actual["start"], actual["end"], actual["text"], actual["sha256"]) == expected, f"clause {key}")
        require(end - start == len(text), f"clause {key} offsets")
        require(hashlib.sha256(text.encode()).hexdigest() == digest, f"clause {key} hash")

    require(d["frozen_offline_graph"] == {"propositions": 2, "mapped_voices": 1, "unresolved_voice_mappings": 1, "evidence_units": 2, "links": 2, "routes": 0, "physical_ids": 0}, "graph")
    sem = d["semantic_boundaries"]
    require(sem["anonymous_interpretation"]["speaker_name"] is None, "anonymous speaker")
    require(sem["anonymous_interpretation"]["originator_number"] == "unspecified", "anonymous number")
    require(sem["anonymous_interpretation"]["voice_row_present"] is False, "anonymous voice row")
    require(sem["reporting_statement"]["speaker_name"] == "Ibn Kathir", "reporting author")
    require("not established as originator or endorser" in sem["ibn_jarir_role"], "Ibn Jarir boundary")
    require(sem["preferred_sacrifice_interpretation_separate"] is True, "interpretation disagreement")

    fidelity = d["arabic_english_fidelity"]
    require(fidelity["arabic_controls_attribution"] is True, "Arabic control")
    require(fidelity["english_state"] == "absent_in_corresponding_bounded_transition_per_scope_audit", "English absence")
    require(fidelity["english_analytical_paraphrase_not_source_quotation"] is True, "English quotation boundary")
    require(set(fidelity["forbidden_inferences"]) == FORBIDDEN, "forbidden inferences")

    review = d["constraint_and_consumer_review"]
    require(review["faithful_existing_type_available"] is False, "existing type")
    require(review["unattributed_group_faithful"] is False, "group coercion")
    require(review["exegete_own_view_faithful"] is False, "own-view coercion")
    require((review["offline_held_type"], review["offline_held_type_name"]) == ("anonymous_originator", None), "offline held type")
    require(review["live_consumer_compatibility_proven"] is False, "consumer compatibility")
    require(review["authorized_schema_rollout_verified"] is False, "rollout authorization")
    require("No migration or production implementation" in review["current_default_branch_search"], "repository search result")

    holds = d["hold_records"]
    require(len(holds) == 6 and {x["hold_class"] for x in holds} == HOLD_CLASSES, "hold classes")
    require(all(x["state"] == "active" for x in holds), "hold state")
    require(d["hold_summary"] == {"active": 6, "resolved": 0, "waived": 0}, "hold summary")
    require("Do not coerce" in d["decision"], "decision")
    require(d["validation"]["unsafe_mutations_rejected"] == 20, "mutation declaration")

    require(d["counts_unchanged"] is True, "counts")
    require(d["physical_ids_allocated"] == 0, "physical IDs")
    require(d["database_written"] is False and d["database_write_count"] == 0, "database write")
    for flag in ("publication_ready", "unit_complete", "claim_complete", "scholar_complete", "chapter_complete"):
        require(d[flag] is False, flag)
    require("perform no database operation" in d["next_step"], "next step")


def set_path(d: dict, path: tuple[str, ...], value: object) -> None:
    target = d
    for key in path[:-1]:
        target = target[key]
    target[path[-1]] = value


def mutation_tests(original: dict) -> int:
    mutations = [
        (("six_scholar_baseline", "tabari"), 17),
        (("basis", "bounded_draft", "blob"), "0" * 40),
        (("exact_source", "start"), 13895),
        (("exact_source", "sha256"), "0" * 64),
        (("frozen_offline_graph", "propositions"), 3),
        (("frozen_offline_graph", "routes"), 1),
        (("semantic_boundaries", "anonymous_interpretation", "speaker_name"), "Ibn Jarir"),
        (("semantic_boundaries", "anonymous_interpretation", "originator_number"), "plural"),
        (("semantic_boundaries", "anonymous_interpretation", "voice_row_present"), True),
        (("semantic_boundaries", "reporting_statement", "speaker_name"), "Ibn Jarir"),
        (("semantic_boundaries", "preferred_sacrifice_interpretation_separate"), False),
        (("arabic_english_fidelity", "english_state"), "present"),
        (("arabic_english_fidelity", "english_analytical_paraphrase_not_source_quotation"), False),
        (("constraint_and_consumer_review", "unattributed_group_faithful"), True),
        (("constraint_and_consumer_review", "live_consumer_compatibility_proven"), True),
        (("constraint_and_consumer_review", "authorized_schema_rollout_verified"), True),
        (("physical_ids_allocated",), 1),
        (("database_written",), True),
        (("publication_ready",), True),
        (("unit_complete",), True),
    ]
    rejected = 0
    for path, value in mutations:
        candidate = copy.deepcopy(original)
        set_path(candidate, path, value)
        try:
            validate(candidate)
        except (KeyError, TypeError, ValueError):
            rejected += 1
    return rejected


def main() -> None:
    data = json.loads(ARTIFACT.read_text())
    validate(data)
    rejected = mutation_tests(data)
    require(rejected == 20, f"unsafe mutations rejected: {rejected}/20")
    print("PASS: I05-A03 anonymous-originator review; 20/20 unsafe mutations rejected")


if __name__ == "__main__":
    main()

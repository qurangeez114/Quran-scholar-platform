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

contract = json.loads((STAGE / "ibn-kathir-108-i10-r02-offline-consumer-contract-2026-11-04.json").read_text())
projection = read("ibn-kathir-108-i10-r02-semantic-evidence-projection-2026-11-04.json", "3b8c8be006fa3082940fd3d2b809761409cac2d5")
exact = read("ibn-kathir-108-i10-r02-exact-transition-2026-11-04.json", "54b69d0d9fb003b30688dbd49112e3d7bb78a7ae")

def check(c):
    graph = c["expected_graph"]
    assert c["route_id"] == "108-I10-R02"
    assert c["identity_contract"]["expected_counts"] == {
        "propositions": 1, "voices": 1, "evidence_units": 1, "links": 1, "routes": 0
    }
    assert len(graph["propositions"]) == len(graph["voices"]) == len(graph["evidence_units"]) == len(graph["links"]) == 1
    row = projection["semantic_rows"][0]
    prop, voice = graph["propositions"][0], graph["voices"][0]
    assert prop["symbolic_key"] == row["symbolic_proposition_key"]
    assert (prop["statement_en"], prop["mode"], prop["assertion_scope"]) == (
        row["statement_en"], row["mode"], row["assertion_scope"]
    )
    assert prop["physical_proposition_id"] is None
    assert voice["symbolic_key"] == row["symbolic_voice_key"]
    assert (voice["voice"], voice["report_narrator"], voice["discourse_role"]) == (
        row["voice"], row["report_narrator"], row["discourse_role"]
    )
    assert voice["physical_voice_id"] is None and voice["physical_voice_category"] is None
    group = graph["evidence_units"][0]
    source_group = projection["evidence_groups"][0]
    assert group["symbolic_key"] == source_group["key"] == "E:I10-R02"
    for key in ("scope", "unit_type_candidate", "attributed_authority_candidate", "reporting_work_candidate", "chain", "independence", "positive_languages", "locators", "physical_evidence_unit_id"):
        assert group[key] == source_group[key]
    link = graph["links"][0]
    source_link = projection["evidence_links"][0]
    assert (link["proposition_ref"], link["evidence_unit_ref"], link["exact_locator_ref"], link["discourse_role"]) == (
        source_link["symbolic_proposition_key"], source_link["evidence_group"],
        source_link["exact_locator_ref"], source_link["discourse_role"]
    )
    assert link["physical_link_created"] is False and graph["routes"] == []
    retained = c["retained_metadata"]
    assert retained["exact_locators"] == projection["exact_locators"]
    assert retained["fidelity_context"] == projection["fidelity_context"]
    assert retained["trace_context_not_evidence_groups"] == projection["trace_context_not_evidence_groups"]
    assert retained["excluded_adjacent_units"] == [x["unit_id"] for x in projection["excluded_adjacent_units"]]
    semantics = c["consumer_semantics"]
    assert semantics["positive_evidence_languages"] == ["ar"]
    for key in (
        "english_local_omission_is_context_only", "english_global_absence_not_asserted",
        "invented_translation_forbidden", "adjacent_units_remain_separate",
        "named_source_cluster_does_not_create_evidence_or_routes",
        "missing_chain_means_no_route_record", "chronology_exclusion_required"
    ):
        assert semantics[key] is True
    assert exact["english_local_transition"]["scope_limit"].startswith("This proves a local omission only")
    assert c["identity_contract"]["physical_payload"] is False
    assert c["database_written"] is False and c["database_write_count"] == 0
    assert c["publication_ready"] is False and c["chapter_complete"] is False
    assert c["proposition_count_effect"] == 0
    holds = " ".join(c["holds"])
    for token in ("No chain", "four works", "Authentication", "locally omits", "Chronology", "Physical", "No physical IDs"):
        assert token in holds

check(contract)
mutators = [
    lambda x: x["expected_graph"]["propositions"].pop(),
    lambda x: x["expected_graph"]["voices"].pop(),
    lambda x: x["expected_graph"]["evidence_units"].append(copy.deepcopy(x["expected_graph"]["evidence_units"][0])),
    lambda x: x["expected_graph"]["links"].pop(),
    lambda x: x["expected_graph"]["routes"].append({"chain": None}),
    lambda x: x["expected_graph"]["evidence_units"][0].update(chain=["Ibn Abbas"]),
    lambda x: x["expected_graph"]["evidence_units"][0].update(positive_languages=["ar", "en"]),
    lambda x: x["retained_metadata"]["exact_locators"][0]["arabic"].update(start=17969),
    lambda x: x["retained_metadata"]["fidelity_context"][0].update(disposition="positive_support"),
    lambda x: x["retained_metadata"]["excluded_adjacent_units"].pop(),
    lambda x: x["consumer_semantics"].update(english_global_absence_not_asserted=False),
    lambda x: x["consumer_semantics"].update(invented_translation_forbidden=False),
    lambda x: x["consumer_semantics"].update(named_source_cluster_does_not_create_evidence_or_routes=False),
    lambda x: x["identity_contract"].update(physical_payload=True),
    lambda x: x.update(publication_ready=True),
    lambda x: x.update(database_written=True),
]
for mutate in mutators:
    bad = copy.deepcopy(contract)
    mutate(bad)
    try:
        check(bad)
    except (AssertionError, KeyError, IndexError, TypeError):
        continue
    raise AssertionError("unsafe mutation accepted")
assert len(mutators) == 16
print("PASS: I10-R02 consumer contract; 16 unsafe mutations rejected; 0 database writes")

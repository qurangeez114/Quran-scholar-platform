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
    assert hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest() == blob
    return json.loads(raw)

contract = json.loads((STAGE / "ibn-kathir-108-i10-r01-offline-consumer-contract-2026-11-03.json").read_text())
projection = read("ibn-kathir-108-i10-r01-normalized-offline-projection-2026-11-03.json", "f9f1f70d0e11427eb66aade56e124b502af63e92")
assessment = read("ibn-kathir-108-i10-r01-evidence-representability-2026-11-03.json", "414bd0900cab995c7fadbbe92bfd3d5453252e47")
spans = read("ibn-kathir-108-i10-r01-exact-spans-2026-11-03.json", "cf97cb03defef3a852cad473b5e5f7e1aa726af2")

def check(c):
    graph = c["expected_graph"]
    assert c["route_id"] == "108-I10-R01"
    assert c["identity_contract"]["expected_counts"] == {"propositions": 4, "voices": 4, "evidence_units": 1, "links": 4, "routes": 0}
    assert [p["symbolic_key"] for p in graph["propositions"]] == [r["symbolic_proposition_key"] for r in projection["rows"]]
    assert [v["symbolic_key"] for v in graph["voices"]] == [r["symbolic_voice_key"] for r in projection["rows"]]
    for voice, row in zip(graph["voices"], projection["rows"]):
        assert (voice["voice"], voice["report_narrator"], voice["discourse_role"]) == (row["voice"], row["report_narrator"], row["discourse_role"])
        assert voice["physical_voice_id"] is None and voice["physical_voice_category"] is None
    assert len(graph["evidence_units"]) == 1
    group = graph["evidence_units"][0]
    source_group = assessment["groups"][0]
    assert group["symbolic_key"] == "E:I10-R01"
    assert (group["chain"], group["independence"], group["locators"]) == (source_group["chain"], source_group["independence"], source_group["locators"])
    assert group["physical_evidence_unit_id"] is None
    assert len(graph["links"]) == 4 and graph["routes"] == []
    assert [(x["proposition_ref"], x["evidence_unit_ref"], x["exact_locator_ref"], x["discourse_role"]) for x in graph["links"]] == [(x["symbolic_proposition_key"], x["evidence_group"], x["exact_locator_ref"], x["discourse_role"]) for x in assessment["links"]]
    assert all(x["physical_link_created"] is False for x in graph["links"])
    assert c["retained_metadata"]["clause_locators"] == projection["clause_locators"]
    assert c["retained_metadata"]["fidelity_context"] == projection["fidelity_context"]
    assert c["retained_metadata"]["route_boundaries"] == projection["route_boundaries"]
    semantics = c["consumer_semantics"]
    assert semantics["report_narrator"] == "Ata" and semantics["embedded_speaker"] == "Abu Lahab"
    assert all(semantics[k] is True for k in ("narrator_is_not_embedded_speaker", "clause_boundaries_do_not_establish_independence", "missing_chain_means_no_route_record", "bilingual_locators_required_for_readback", "translator_progeny_gloss_is_context_not_proposition"))
    assert len(spans["witnesses"]) == 2
    assert c["identity_contract"]["physical_payload"] is False
    assert c["database_written"] is False and c["publication_ready"] is False and c["chapter_complete"] is False

check(contract)
mutators = [
    lambda x: x["expected_graph"]["propositions"].pop(),
    lambda x: x["expected_graph"]["voices"].pop(),
    lambda x: x["expected_graph"]["evidence_units"].append(copy.deepcopy(x["expected_graph"]["evidence_units"][0])),
    lambda x: x["expected_graph"]["links"].pop(),
    lambda x: x["expected_graph"]["routes"].append({"chain": None}),
    lambda x: x["expected_graph"]["evidence_units"][0].update(chain=["Ata"]),
    lambda x: x["expected_graph"]["voices"][2].update(voice="Ata"),
    lambda x: x["expected_graph"]["voices"][0].update(report_narrator="Ibn Abbas"),
    lambda x: x["retained_metadata"]["clause_locators"].pop(),
    lambda x: x["retained_metadata"]["fidelity_context"][0].update(disposition="new_proposition"),
    lambda x: x["consumer_semantics"].update(narrator_is_not_embedded_speaker=False),
    lambda x: x["identity_contract"].update(physical_payload=True),
    lambda x: x.update(publication_ready=True),
    lambda x: x.update(chapter_complete=True),
]
for mutate in mutators:
    bad = copy.deepcopy(contract)
    mutate(bad)
    try:
        check(bad)
    except (AssertionError, KeyError, IndexError):
        continue
    raise AssertionError("unsafe mutation accepted")
print("PASS: I10-R01 consumer contract; 14 unsafe mutations rejected")

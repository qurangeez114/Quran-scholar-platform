#!/usr/bin/env python3
import copy
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
STAGE = ROOT / "data/tafsir/staging"
PROJECTION = STAGE / "ibn-kathir-108-i10-r02-semantic-evidence-projection-2026-11-04.json"
EXACT = STAGE / "ibn-kathir-108-i10-r02-exact-transition-2026-11-04.json"

def sha(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()

def check(doc, exact):
    assert doc["route_id"] == "108-I10-R02"
    assert len(doc["semantic_rows"]) == 1
    row = doc["semantic_rows"][0]
    assert row["symbolic_proposition_key"] == "P:108-I10-R02-IBN-ABBAS-ABU-JAHL"
    assert row["authentication_state"] == "not_assessed"
    assert all(row[k] is None for k in (
        "physical_proposition_id", "physical_voice_id",
        "physical_claim_type", "physical_voice_category"
    ))
    ar_source = next(x for x in exact["arabic_units"] if x["unit_id"] == "AR_ABU_JAHL")
    locator = doc["exact_locators"][0]
    ar = locator["arabic"]
    assert locator["english"] is None
    assert (ar["canonical_entry_id"], ar["start"], ar["end"], ar["span_sha256"], ar["text"]) == (
        exact["source_witnesses"]["arabic"]["tafsir_entry_id"],
        ar_source["start_cp"], ar_source["end_cp"], ar_source["span_sha256"], ar_source["exact_text"]
    )
    assert sha(ar["text"]) == ar["span_sha256"]
    fidelity = doc["fidelity_context"][0]
    envelope = exact["english_local_transition"]["envelope"]
    assert (fidelity["canonical_entry_id"], fidelity["start"], fidelity["end"], fidelity["span_sha256"], fidelity["text"]) == (
        exact["source_witnesses"]["english"]["tafsir_entry_id"],
        envelope["start_cp"], envelope["end_cp"], envelope["span_sha256"], envelope["exact_text"]
    )
    assert fidelity["disposition"] == "local_omission_context_not_positive_support_and_not_global_absence"
    assert fidelity["invented_translation"] is False
    assert len(doc["evidence_groups"]) == 1 and len(doc["evidence_links"]) == 1
    group = doc["evidence_groups"][0]
    assert group["key"] == "E:I10-R02" and group["positive_languages"] == ["ar"]
    assert group["chain"] is None and group["independence"] == "unknown"
    assert group["physical_evidence_unit_id"] is None
    link = doc["evidence_links"][0]
    assert link["symbolic_proposition_key"] == row["symbolic_proposition_key"]
    assert link["evidence_group"] == group["key"]
    assert link["physical_proposition_id"] is None
    assert link["physical_evidence_unit_id"] is None
    assert link["physical_link_created"] is False
    trace = doc["trace_context_not_evidence_groups"]
    assert len(trace["named_source_cluster"]) == 4
    assert trace["direct_editions_resolved"] == 0 and trace["direct_editions_required"] == 4
    assert trace["displayed_chain"] is None
    assert trace["evidence_groups_created"] == 0 and trace["routes_created"] == 0
    excluded = {x["unit_id"] for x in doc["excluded_adjacent_units"]}
    assert excluded == {
        "AR_ENEMY_GLOSS", "AR_UNIVERSALIZATION_BOUNDARY",
        "IBN-ABBAS-AL-AS", "EXPANDED-IBRAHIM-DEATH-STORY"
    }
    assert doc["database_written"] is False and doc["database_write_count"] == 0
    assert doc["publication_ready"] is False and doc["chapter_complete"] is False
    assert doc["proposition_count_effect"] == 0
    joined = " ".join(doc["holds"])
    for token in ("No chain", "four works", "Authentication", "locally omits", "Chronology", "Physical", "No physical IDs"):
        assert token in joined

def main():
    doc = json.loads(PROJECTION.read_text(encoding="utf-8"))
    exact = json.loads(EXACT.read_text(encoding="utf-8"))
    check(doc, exact)
    mutators = [
        lambda d: d.update(route_id="108-I10-R01"),
        lambda d: d["semantic_rows"].append(copy.deepcopy(d["semantic_rows"][0])),
        lambda d: d["semantic_rows"][0].update(physical_proposition_id=1),
        lambda d: d["semantic_rows"][0].update(authentication_state="authenticated"),
        lambda d: d["exact_locators"][0].update(english={"text": "invented"}),
        lambda d: d["exact_locators"][0]["arabic"].update(start=17969),
        lambda d: d["fidelity_context"][0].update(invented_translation=True),
        lambda d: d["fidelity_context"][0].update(disposition="positive_support"),
        lambda d: d["evidence_groups"][0].update(positive_languages=["ar", "en"]),
        lambda d: d["evidence_groups"][0].update(chain=["Ibn Abbas"]),
        lambda d: d["evidence_links"].pop(),
        lambda d: d["trace_context_not_evidence_groups"].update(direct_editions_resolved=4),
        lambda d: d["excluded_adjacent_units"].pop(),
        lambda d: d.update(database_written=True),
    ]
    for mutate in mutators:
        candidate = copy.deepcopy(doc)
        mutate(candidate)
        try:
            check(candidate, exact)
        except (AssertionError, KeyError, IndexError, TypeError):
            continue
        raise AssertionError("unsafe mutation was accepted")
    assert len(mutators) == 14
    print("PASS: I10-R02 semantic/evidence projection; 14 unsafe mutations rejected; 0 database writes")

if __name__ == "__main__":
    main()

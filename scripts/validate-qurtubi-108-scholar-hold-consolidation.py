#!/usr/bin/env python3
"""Validate the bounded Qurtubi 108 scholar hold consolidation."""
import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "data/tafsir/staging/qurtubi-108-scholar-hold-consolidation-2026-11-11.json"
EXPECTED_CLAIMS = [
    "108-Q01","108-Q02","108-Q03","108-Q04A","108-Q04B","108-Q04C","108-Q04D",
    "108-Q04E","108-Q04F","108-Q04G","108-Q04H","108-Q04I","108-Q04J","108-Q04K",
    "108-Q04L","108-Q04M","108-Q04N","108-Q05","108-Q06","108-Q07","108-Q08A",
    "108-Q08B","108-Q09",
]
HELD = ["108-Q02","108-Q03","108-Q04C","108-Q04E","108-Q04G","108-Q04J","108-Q05","108-Q06","108-Q07","108-Q09"]
EXPLICIT = ["108-Q04C","108-Q04G","108-Q04J"]
ABSENT_EN = [f"108-Q04{x}" for x in "BCDEFGHIJKLMN"]
ENTRY_HASHES = {
    13239:"e1c72b12ee5bf92aae47d85847ccd2daaf144a215235afbdcf882a075955ecc9",
    38030:"60fa566a5a6b2f311d99e467d6c8569b3ad2c4c398f8a792642d4e7822760520",
    13240:"0c5c2323d19824e53fcf8821838df214033284a8ea65d94a3ff5e1aecea45857",
    38031:"a96d7aed0bccc235c2ab86c0eed60651d677ce70d41b89b26f196dbaeda59894",
    13241:"296826ec28cd8b240a23ad8d55401e858d2c8a295f98baa7181307df63e344f2",
    38032:"1d749b4e63e92b9af87288d55de656e21b16e2efbd30930d53308945fd13cf91",
}
Q06_AR = [["قال ابن العربي",909,923],["فأما مالك فقال",928,942],["ما سمعت فيه شيئا",945,961],["والذي يقع في نفسي",964,981],["صلاة يوم النحر",997,1011],["والنحر بعدها",1014,1026]]
Q06_EN = [["Ibn al-Arabi said",1657,1674],["As for Malik",1677,1689],["I have not heard anything about it",1700,1734],["what occurs to my mind",1740,1762],["prayer of the Day of Sacrifice",1790,1820],["the sacrifice after it",1825,1847]]

def validate(d):
    assert d["schema_version"] == "quranhikma-qurtubi-108-scholar-hold-consolidation-v1"
    assert d["surah"] == 108 and d["scholar_key"] == "qurtubi"
    inv = d["inventory_boundary"]
    assert inv["claim_count"] == inv["incomplete_claims"] == 23
    assert inv["publication_ready_claims"] == 0
    assert inv["claim_ids"] == EXPECTED_CLAIMS and len(set(inv["claim_ids"])) == 23
    assert inv["assembly_states"] == {"copied_payload_pending_chapter_validation":20,"payload_present_semantic_hold_not_import_ready":3}
    assert inv["semantic_hold_metadata_rows"] == 10
    assert inv["semantic_hold_claim_ids"] == HELD
    assert inv["explicit_hold_state_claim_ids"] == EXPLICIT
    assert inv["transmission_routes_planned"] == 0 and inv["route_inventory_complete"] is False
    fidelity = d["arabic_english_fidelity"]
    assert fidelity["partial_claim_groups"] == ["108-Q04A"]
    assert fidelity["corresponding_english_meaning_absent_claim_groups"] == ABSENT_EN
    rows = d["semantic_hold_classification"]
    assert [x["claim_id"] for x in rows] == HELD
    assert len({x["classification"] for x in rows}) >= 7
    assert d["q08_boundary"]["q08a"]["state"] == "commentator_own_gloss"
    assert d["q08_boundary"]["q08b"]["state"] == "unnamed_report_do_not_infer"
    manifest = d["source_locator_manifest"]
    actual = {}
    for e in manifest["entries"]:
        actual[e["arabic_entry_id"]] = e["arabic_sha256"]
        actual[e["english_entry_id"]] = e["english_sha256"]
    assert actual == ENTRY_HASHES
    q6 = manifest["q06"]
    assert q6["arabic"]["context"] == [729,2529] and q6["arabic"]["spans"] == Q06_AR
    assert q6["english"]["context"] == [1484,3284] and q6["english"]["spans"] == Q06_EN
    holds = d["scholar_active_holds"]
    assert len(holds) == 8 and len({h["hold_id"] for h in holds}) == 8
    assert all(h["status"] == "active" and h["resolved"] is False and h["waived"] is False for h in holds)
    assert d["hold_summary"] == {"active":8,"resolved":0,"waived":0}
    assert d["resolved_holds"] == [] and d["waived_holds"] == []
    for key in ("database_written","publication_ready","scholar_complete","chapter_complete","physical_ids_allocated"):
        assert d[key] is False
    assert d["database_write_count"] == 0 and d["counts_unchanged"] is True
    assert d["repository_observation"]["guard_head"] == "95484eeec7eea40cb26173b144c7fe3dae9ce145"
    assert d["validation"]["unsafe_mutations_rejected"] == 40

def mutation_cases(d):
    cases = []
    def add(path, value):
        x = copy.deepcopy(d)
        cur = x
        for k in path[:-1]: cur = cur[k]
        cur[path[-1]] = value
        cases.append(x)
    add(["inventory_boundary","claim_count"],22); add(["inventory_boundary","incomplete_claims"],22)
    add(["inventory_boundary","publication_ready_claims"],1); add(["inventory_boundary","claim_ids"],EXPECTED_CLAIMS[:-1])
    add(["inventory_boundary","assembly_states"],{"copied_payload_pending_chapter_validation":23})
    add(["inventory_boundary","semantic_hold_metadata_rows"],9); add(["inventory_boundary","semantic_hold_claim_ids"],HELD[:-1])
    add(["inventory_boundary","explicit_hold_state_claim_ids"],[]); add(["inventory_boundary","transmission_routes_planned"],1)
    add(["inventory_boundary","route_inventory_complete"],True); add(["arabic_english_fidelity","partial_claim_groups"],[])
    add(["arabic_english_fidelity","corresponding_english_meaning_absent_claim_groups"],ABSENT_EN[:-1])
    add(["q08_boundary","q08a","state"],"unnamed_report_do_not_infer"); add(["q08_boundary","q08b","state"],"commentator_own_gloss")
    add(["source_locator_manifest","q06","arabic","context"],[730,2529])
    add(["source_locator_manifest","q06","english","context"],[1484,3283])
    add(["source_locator_manifest","q06","arabic","spans"],Q06_AR[:-1])
    add(["source_locator_manifest","q06","english","spans"],Q06_EN[:-1])
    for i in range(6):
        x=copy.deepcopy(d); e=x["source_locator_manifest"]["entries"][i//2]
        e["arabic_sha256" if i%2==0 else "english_sha256"]="0"*64; cases.append(x)
    for key in ("database_written","publication_ready","scholar_complete","chapter_complete","physical_ids_allocated"):
        add([key],True)
    add(["database_write_count"],1); add(["counts_unchanged"],False)
    add(["hold_summary","active"],7); add(["hold_summary","resolved"],1); add(["hold_summary","waived"],1)
    add(["resolved_holds"],["unsafe"]); add(["waived_holds"],["unsafe"])
    add(["scholar_active_holds"],d["scholar_active_holds"][:-1])
    x=copy.deepcopy(d); x["scholar_active_holds"][0]["status"]="resolved"; cases.append(x)
    x=copy.deepcopy(d); x["scholar_active_holds"][0]["resolved"]=True; cases.append(x)
    x=copy.deepcopy(d); x["scholar_active_holds"][0]["waived"]=True; cases.append(x)
    assert len(cases) == 40
    return cases

def main():
    data = json.loads(PATH.read_text(encoding="utf-8"))
    validate(data)
    rejected = 0
    for case in mutation_cases(data):
        try: validate(case)
        except AssertionError: rejected += 1
    assert rejected == 40
    print(f"PASS: Qurtubi 108 scholar holds consolidated; 23/23 incomplete, 10 semantic-hold rows preserved, 40/40 unsafe mutations rejected.")

if __name__ == "__main__":
    main()


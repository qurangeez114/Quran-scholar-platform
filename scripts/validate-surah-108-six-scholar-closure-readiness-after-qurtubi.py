#!/usr/bin/env python3
"""Validate post-Qurtubi Surah 108 six-scholar closure readiness."""
import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "data/tafsir/staging/surah-108-six-scholar-closure-readiness-after-qurtubi-2026-11-11.json"
BASELINE = {"tabari":18,"ibn_kathir":15,"qurtubi":23,"jalalayn":5,"saadi":6,"tanwir_disputed_attribution":7}
HELD = ["108-Q02","108-Q03","108-Q04C","108-Q04E","108-Q04G","108-Q04J","108-Q05","108-Q06","108-Q07","108-Q09"]
ABSENT_EN = [f"108-Q04{x}" for x in "BCDEFGHIJKLMN"]
J_IDS = [23671,23672,23673]
J_HASHES = {
 "23671":"cbcef7915018869e68c64deb57a9ebb6fd18e1d2b417437b0e4a0ea1463823e0",
 "23672":"926c19acf9d6aaca6265c89ca1ed6f835287e4cfbbee08437d151983e8fb1eb0",
 "23673":"c87e16c462a22f83487462994014cd5c4628e5e427ad8474883f32ca63a9e8b8",
}
J_CLAIMS = ["108-J01","108-J02","108-J03","108-J04","108-J05"]
J_ENTRIES = [23671,23671,23672,23673,23673]
J_ANCHORS = [
 "هو نهر في الجنة هو حوضه ترد عليه أمته",
 "والكوثر الخير الكثير من النبوة والقرآن والشفاعة ونحوها",
 "صلاة عيد النحر ... نسكك",
 "أي مبغضك ... المنقطع عن كل خير أو المنقطع العقب",
 "نزلت في العاصي بن وائل ... عند موت ابنه القاسم",
]

def validate(d):
    assert d["schema_version"] == "quranhikma-surah-108-six-scholar-closure-readiness-after-qurtubi-v1"
    assert d["surah"] == 108 and d["baseline_total"] == 74
    assert d["six_scholar_baseline"] == BASELINE and sum(BASELINE.values()) == 74
    s = d["scholar_readiness"]
    assert list(s) == ["tabari","ibn_kathir","qurtubi","jalalayn","saadi","tanwir_disputed_attribution"]
    assert all(x["publication_ready_rows"] == 0 for x in s.values())
    assert all(x["scholar_complete"] is False and x["publication_ready"] is False for x in s.values())
    assert s["tabari"]["scholar_hold_consolidated"] is True and s["tabari"]["active_holds"] == 8
    assert s["ibn_kathir"]["scholar_hold_consolidated"] is True and s["ibn_kathir"]["active_holds"] == 8
    q = s["qurtubi"]
    assert q["claim_count"] == 23 and q["scholar_hold_consolidated"] is True
    assert (q["active_holds"],q["resolved_holds"],q["waived_holds"]) == (8,0,0)
    assert q["rows_with_semantic_hold_metadata"] == 10 and q["explicit_semantic_hold_state_rows"] == 3
    assert q["held_claim_ids"] == HELD
    assert q["transmission_routes_planned"] == 0 and q["complete_route_inventory"] is False
    assert q["english_fidelity"]["partial_claim_groups"] == ["108-Q04A"]
    assert q["english_fidelity"]["corresponding_english_meaning_absent_claim_groups"] == ABSENT_EN
    q6 = q["source_locators"]["q06"]
    assert q6["arabic"]["entry_id"] == 13240 and q6["arabic"]["context"] == [729,2529]
    assert q6["english"]["entry_id"] == 38031 and q6["english"]["context"] == [1484,3284]
    j = s["jalalayn"]
    assert j["claim_count"] == 5 and j["scholar_hold_consolidated"] is False
    assert j["live_english_entry_ids"] == J_IDS and j["live_english_hashes"] == J_HASHES
    assert j["transmission_routes_planned"] == 0
    rows = j["claim_locators"]
    assert [r["claim_id"] for r in rows] == J_CLAIMS
    assert [r["english_entry_id"] for r in rows] == J_ENTRIES
    assert [r["english_sha256"] for r in rows] == [J_HASHES[str(x)] for x in J_ENTRIES]
    assert [r["evidence_anchor_ar"] for r in rows] == J_ANCHORS
    assert all(r["transmission_route_action"] == "none" for r in rows)
    assert rows[-1]["mufassir_own_position"] == "reported_only"
    hp = d["hold_progress"]
    assert hp["scholars_with_consolidated_holds"] == ["tabari","ibn_kathir","qurtubi"]
    assert hp["scholars_pending_hold_consolidation"] == ["jalalayn","saadi","tanwir_disputed_attribution"]
    assert (hp["active_consolidated_holds"],hp["resolved_consolidated_holds"],hp["waived_consolidated_holds"]) == (24,0,0)
    cr = d["chapter_readiness"]
    assert cr == {"claim_rows":74,"publication_ready_rows":0,"complete_scholars":0,"incomplete_scholars":6,"physical_ids_allocated":0,"database_rows_changed":0,"database_written":False,"publication_ready":False,"chapter_complete":False,"advance_to_surah_107":False}
    selected = d["selected_next_boundary"]
    assert selected["scholar_key"] == "jalalayn" and selected["claim_count"] == 5 and selected["transmission_routes_planned"] == 0
    assert d["validation"]["unsafe_mutations_rejected"] == 44
    assert d["counts_unchanged"] is True and d["database_written"] is False
    assert d["database_write_count"] == 0 and d["publication_ready"] is False and d["chapter_complete"] is False

def mutation_cases(d):
    cases=[]
    def add(path,value):
        x=copy.deepcopy(d); cur=x
        for k in path[:-1]: cur=cur[k]
        cur[path[-1]]=value; cases.append(x)
    add(["baseline_total"],73)
    add(["chapter_readiness","claim_rows"],73)
    add(["chapter_readiness","publication_ready_rows"],1)
    add(["chapter_readiness","complete_scholars"],1)
    add(["chapter_readiness","incomplete_scholars"],5)
    add(["chapter_readiness","database_written"],True)
    add(["chapter_readiness","publication_ready"],True)
    add(["chapter_readiness","chapter_complete"],True)
    add(["chapter_readiness","advance_to_surah_107"],True)
    add(["scholar_readiness","qurtubi","active_holds"],7)
    add(["scholar_readiness","qurtubi","scholar_hold_consolidated"],False)
    add(["scholar_readiness","qurtubi","rows_with_semantic_hold_metadata"],9)
    add(["scholar_readiness","qurtubi","explicit_semantic_hold_state_rows"],10)
    add(["scholar_readiness","qurtubi","transmission_routes_planned"],1)
    add(["scholar_readiness","qurtubi","complete_route_inventory"],True)
    add(["scholar_readiness","qurtubi","english_fidelity","partial_claim_groups"],[])
    add(["scholar_readiness","qurtubi","english_fidelity","corresponding_english_meaning_absent_claim_groups"],ABSENT_EN[:-1])
    add(["scholar_readiness","qurtubi","source_locators","q06","arabic","context"],[730,2529])
    add(["scholar_readiness","qurtubi","source_locators","q06","english","context"],[1484,3283])
    add(["scholar_readiness","qurtubi","held_claim_ids"],HELD[:-1])
    add(["scholar_readiness","jalalayn","claim_count"],4)
    add(["scholar_readiness","jalalayn","scholar_hold_consolidated"],True)
    add(["scholar_readiness","jalalayn","transmission_routes_planned"],1)
    add(["scholar_readiness","jalalayn","live_english_entry_ids"],J_IDS[:-1])
    add(["scholar_readiness","jalalayn","live_english_hashes","23671"],"0"*64)
    add(["scholar_readiness","jalalayn","live_english_hashes","23672"],"0"*64)
    add(["scholar_readiness","jalalayn","live_english_hashes","23673"],"0"*64)
    add(["scholar_readiness","jalalayn","claim_locators",0,"english_entry_id"],23672)
    add(["scholar_readiness","jalalayn","claim_locators",0,"english_sha256"],"0"*64)
    add(["scholar_readiness","jalalayn","claim_locators",1,"evidence_anchor_ar"],"")
    add(["scholar_readiness","jalalayn","claim_locators",2,"english_entry_id"],23673)
    add(["scholar_readiness","jalalayn","claim_locators",2,"evidence_anchor_ar"],"")
    add(["scholar_readiness","jalalayn","claim_locators",3,"english_entry_id"],23672)
    add(["scholar_readiness","jalalayn","claim_locators",3,"evidence_anchor_ar"],"")
    add(["scholar_readiness","jalalayn","claim_locators",4,"mufassir_own_position"],"preferred")
    add(["scholar_readiness","jalalayn","claim_locators",4,"transmission_route_action"],"create")
    add(["hold_progress","active_consolidated_holds"],23)
    add(["hold_progress","scholars_pending_hold_consolidation"],["saadi","tanwir_disputed_attribution"])
    add(["hold_progress","resolved_consolidated_holds"],1)
    add(["hold_progress","waived_consolidated_holds"],1)
    add(["selected_next_boundary","scholar_key"],"saadi")
    add(["selected_next_boundary","claim_count"],6)
    add(["counts_unchanged"],False)
    add(["database_write_count"],1)
    assert len(cases)==44
    return cases

def main():
    data=json.loads(PATH.read_text(encoding="utf-8"))
    validate(data)
    rejected=0
    for case in mutation_cases(data):
        try: validate(case)
        except (AssertionError,KeyError): rejected+=1
    assert rejected==44
    print("PASS: post-Qurtubi readiness; 74 claims, 0 ready, 24 active consolidated holds, Jalalayn selected, 44/44 unsafe mutations rejected.")

if __name__=="__main__":
    main()


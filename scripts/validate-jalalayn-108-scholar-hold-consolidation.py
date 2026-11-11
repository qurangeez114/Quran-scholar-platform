#!/usr/bin/env python3
"""Validate the bounded Jalalayn 108 scholar hold consolidation."""
import copy
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
PATH=ROOT/"data/tafsir/staging/jalalayn-108-scholar-hold-consolidation-2026-11-11.json"
BASE={"tabari":18,"ibn_kathir":15,"qurtubi":23,"jalalayn":5,"saadi":6,"tanwir_disputed_attribution":7}
IDS=["108-J01","108-J02","108-J03","108-J04","108-J05"]
ENTRIES=[23671,23671,23672,23673,23673]
HASHES={
 23671:"cbcef7915018869e68c64deb57a9ebb6fd18e1d2b417437b0e4a0ea1463823e0",
 23672:"926c19acf9d6aaca6265c89ca1ed6f835287e4cfbbee08437d151983e8fb1eb0",
 23673:"c87e16c462a22f83487462994014cd5c4628e5e427ad8474883f32ca63a9e8b8",
}
ANCHORS=[
 "هو نهر في الجنة هو حوضه ترد عليه أمته",
 "والكوثر الخير الكثير من النبوة والقرآن والشفاعة ونحوها",
 "صلاة عيد النحر ... نسكك",
 "أي مبغضك ... المنقطع عن كل خير أو المنقطع العقب",
 "نزلت في العاصي بن وائل ... عند موت ابنه القاسم",
]
URLS=[
 "https://quran.com/108:1/tafsirs/ar-tafsir-jalalayn",
 "https://quran.com/108:2/tafsirs/ar-tafsir-jalalayn",
 "https://quran.com/108:3/tafsirs/ar-tafsir-jalalayn",
]
HOLD_CLASSES=[
 "source_identity_and_live_revalidation","voice_and_report_status_representation",
 "external_arabic_live_english_fidelity","alternative_semantics_and_atomicity",
 "authentication_and_independence","semantic_duplicate_and_shared_evidence_clearance",
 "assembly_lifecycle_and_physical_persistence","database_lifecycle_and_protected_publication",
]

def validate(d):
    assert d["schema_version"]=="quranhikma-jalalayn-108-scholar-hold-consolidation-v1"
    assert d["surah"]==108 and d["scholar_key"]=="jalalayn" and d["six_scholar_baseline"]==BASE
    inv=d["inventory_boundary"]
    assert inv["claim_count"]==inv["incomplete_claims"]==5 and inv["publication_ready_claims"]==0
    assert inv["claim_ids"]==IDS and len(set(inv["claim_ids"]))==5
    assert inv["assembly_states"]=={"copied_payload_pending_chapter_validation":5}
    assert inv["live_english_entry_ids"]==[23671,23672,23673] and inv["live_arabic_entry_ids"]==[]
    assert inv["external_arabic_pages"]==URLS
    assert inv["transmission_routes_planned"]==0 and inv["route_inventory_complete"] is True
    m=d["source_locator_manifest"]
    assert m["live_english_sha256_by_entry"]=={str(k):v for k,v in HASHES.items()}
    rows=m["claim_locators"]
    assert [x["claim_id"] for x in rows]==IDS
    assert [x["english_entry_id"] for x in rows]==ENTRIES
    assert [x["english_sha256"] for x in rows]==[HASHES[x] for x in ENTRIES]
    assert [x["external_arabic_url"] for x in rows]==[URLS[0],URLS[0],URLS[1],URLS[2],URLS[2]]
    assert [x["evidence_anchor_ar"] for x in rows]==ANCHORS
    assert all(x["transmission_route_action"]=="none" for x in rows)
    assert rows[-1]["mufassir_own_position"]=="reported_only"
    assert rows[-1]["voice_type"]=="exegete_own_view"
    f=d["arabic_english_fidelity"]
    assert f["aligned_claim_ids"]==IDS and f["missing_live_arabic_rows"]==5
    holds=d["scholar_active_holds"]
    assert [x["hold_class"] for x in holds]==HOLD_CLASSES and len({x["hold_id"] for x in holds})==8
    assert all(x["status"]=="active" and x["resolved"] is False and x["waived"] is False for x in holds)
    assert d["hold_summary"]=={"active":8,"resolved":0,"waived":0}
    assert d["resolved_holds"]==[] and d["waived_holds"]==[]
    assert d["repository_observation"]["guard_head"]=="0e953aa06084ebb77ec4df3044bf27a7b43bdb60"
    assert d["basis"]["source_alignment_workflow"]["conclusion"]=="success"
    assert d["validation"]["unsafe_mutations_rejected"]==44
    assert d["counts_unchanged"] is True and d["database_write_count"]==0
    for key in ("physical_ids_allocated","database_written","publication_ready","scholar_complete","chapter_complete"):
        assert d[key] is False

def mutation_cases(d):
    cases=[]
    def add(path,value):
        x=copy.deepcopy(d);cur=x
        for k in path[:-1]:cur=cur[k]
        cur[path[-1]]=value;cases.append(x)
    add(["inventory_boundary","claim_count"],4)
    add(["inventory_boundary","incomplete_claims"],4)
    add(["inventory_boundary","publication_ready_claims"],1)
    add(["inventory_boundary","claim_ids"],IDS[:-1])
    add(["inventory_boundary","assembly_states"],{"copied_payload_pending_chapter_validation":4})
    add(["inventory_boundary","live_english_entry_ids"],[23671,23672])
    add(["inventory_boundary","live_arabic_entry_ids"],[1])
    add(["inventory_boundary","external_arabic_pages"],URLS[:-1])
    add(["inventory_boundary","transmission_routes_planned"],1)
    add(["inventory_boundary","route_inventory_complete"],False)
    for k in ("23671","23672","23673"):
        add(["source_locator_manifest","live_english_sha256_by_entry",k],"0"*64)
    for i in range(5):
        add(["source_locator_manifest","claim_locators",i,"english_entry_id"],99999)
    for i in range(5):
        add(["source_locator_manifest","claim_locators",i,"english_sha256"],"0"*64)
    for i in range(5):
        add(["source_locator_manifest","claim_locators",i,"evidence_anchor_ar"],"")
    add(["source_locator_manifest","claim_locators",4,"mufassir_own_position"],"preferred")
    add(["source_locator_manifest","claim_locators",4,"transmission_route_action"],"create")
    add(["source_locator_manifest","claim_locators",4,"voice_type"],"named_earlier_exegete")
    add(["arabic_english_fidelity","aligned_claim_ids"],IDS[:-1])
    add(["arabic_english_fidelity","missing_live_arabic_rows"],4)
    add(["hold_summary","active"],7)
    add(["hold_summary","resolved"],1)
    add(["hold_summary","waived"],1)
    add(["scholar_active_holds"],d["scholar_active_holds"][:-1])
    x=copy.deepcopy(d);x["scholar_active_holds"][0]["status"]="resolved";cases.append(x)
    x=copy.deepcopy(d);x["scholar_active_holds"][0]["resolved"]=True;cases.append(x)
    add(["physical_ids_allocated"],True)
    add(["database_written"],True)
    add(["publication_ready"],True)
    add(["scholar_complete"],True)
    add(["chapter_complete"],True)
    assert len(cases)==44
    return cases

def main():
    data=json.loads(PATH.read_text(encoding="utf-8"))
    validate(data)
    rejected=0
    for case in mutation_cases(data):
        try:validate(case)
        except (AssertionError,KeyError):rejected+=1
    assert rejected==44
    print("PASS: Jalalayn 108 holds consolidated; 5/5 incomplete, no Arabic rows fabricated, zero routes, 44/44 unsafe mutations rejected.")

if __name__=="__main__":
    main()


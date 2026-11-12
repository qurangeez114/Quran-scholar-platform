#!/usr/bin/env python3
"""Validate the bounded Saadi 108 scholar hold consolidation."""
import copy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PATH=ROOT/"data/tafsir/staging/saadi-108-scholar-hold-consolidation-2026-11-11.json"
BASE={"tabari":18,"ibn_kathir":15,"qurtubi":23,"jalalayn":5,"saadi":6,"tanwir_disputed_attribution":7}
IDS=["108-S01","108-S02","108-S03","108-S04","108-S05","108-S06"]
AR_IDS=[36286,36286,36287,36287,36288,36288]
EN_IDS=[48103,48103,48104,48104,48105,48105]
AR_HASH=["36210cd035e92d8e4213fa2a6cb4cbd8f51ad5fe93cba93590e141a453d279db"]*2+["94b52b9fc5d2c9345998c69b4eeb7e3a9c98fe308440c91e162a7f48a691a368"]*2+["b351d82179de0e097132df2b07940bb2c2af77bace9836b449ce772b6b0794cc"]*2
EN_HASH=["6bed6b833bf0002498f317866b9bb15277495f540c1313b0ff0bb2c8d54223a5"]*2+["b592916ce3c51178cc313e96a714c70b23f8a136917c7620f2e5bd279e333696"]*2+["dec0d77ea35a7debd407e43c7c7a97fdfffbc82f14c8365bddb8c4c6540951c7"]*2
ANCHORS=["الخير الكثير، والفضل الغزير","من النهر الذي يقال له الكوثر ومن الحوض ... لم يظمأ بعدها أبدا","خص هاتين العبادتين بالذكر، لأنهما من أفضل العبادات وأجل القربات","الصلاة تتضمن الخضوع في القلب والجوارح ... وفي النحر تقرب إلى الله ... وإخراج للمال","مبغضك وذامك ومنتقصك ... المقطوع من كل خير، مقطوع العمل، مقطوع الذكر","فهو الكامل حقا ... من رفع الذكر، وكثرة الأنصار، والأتباع"]
HCLS=["source_identity_and_live_revalidation","paired_arabic_english_fidelity","voice_and_attribution_representation","alternative_semantics_and_atomicity","source_edition_and_independence","semantic_duplicate_and_shared_evidence_clearance","assembly_lifecycle_and_physical_persistence","database_lifecycle_and_protected_publication"]

def validate(d):
 assert d["schema_version"]=="quranhikma-saadi-108-scholar-hold-consolidation-v1"
 assert d["surah"]==108 and d["scholar_key"]=="saadi" and d["six_scholar_baseline"]==BASE
 i=d["inventory_boundary"]
 assert i["claim_count"]==i["incomplete_claims"]==6 and i["publication_ready_claims"]==0
 assert i["claim_ids"]==IDS and len(set(i["claim_ids"]))==6
 assert i["assembly_states"]=={"copied_payload_pending_chapter_validation":6}
 assert i["arabic_entry_ids"]==[36286,36287,36288] and i["english_entry_ids"]==[48103,48104,48105]
 assert i["transmission_routes_planned"]==0 and i["route_inventory_complete"] is True
 m=d["source_locator_manifest"];rows=m["claim_locators"]
 assert [x["claim_id"] for x in rows]==IDS
 assert [x["arabic_entry_id"] for x in rows]==AR_IDS and [x["english_entry_id"] for x in rows]==EN_IDS
 assert [x["arabic_sha256"] for x in rows]==AR_HASH and [x["english_sha256"] for x in rows]==EN_HASH
 assert [x["evidence_anchor_ar"] for x in rows]==ANCHORS
 assert all(x["mufassir_own_position"]=="preferred" and x["voice_type"]=="exegete_own_view" and x["transmission_route_action"]=="none" for x in rows)
 f=d["arabic_english_fidelity"]
 assert f["aligned_claim_ids"]==IDS and f["arabic_entry_ids"]==[36286,36287,36288] and f["english_entry_ids"]==[48103,48104,48105]
 holds=d["scholar_active_holds"]
 assert [x["hold_class"] for x in holds]==HCLS and len({x["hold_id"] for x in holds})==8
 assert all(x["status"]=="active" and x["resolved"] is False and x["waived"] is False for x in holds)
 assert d["hold_summary"]=={"active":8,"resolved":0,"waived":0} and d["resolved_holds"]==[] and d["waived_holds"]==[]
 assert d["basis"]["source_coverage_workflow"]["conclusion"]=="success"
 assert d["repository_observation"]["guard_head"]=="370700dfc098201fbe3142f8f9a89b780ece851c"
 assert d["validation"]["unsafe_mutations_rejected"]==46 and d["counts_unchanged"] is True
 assert d["database_write_count"]==0
 for k in ("physical_ids_allocated","database_written","publication_ready","scholar_complete","chapter_complete"):assert d[k] is False

def mutations(d):
 c=[]
 def add(path,value):
  x=copy.deepcopy(d);q=x
  for k in path[:-1]:q=q[k]
  q[path[-1]]=value;c.append(x)
 add(["inventory_boundary","claim_count"],5)
 add(["inventory_boundary","incomplete_claims"],5)
 add(["inventory_boundary","publication_ready_claims"],1)
 add(["inventory_boundary","claim_ids"],IDS[:-1])
 add(["inventory_boundary","assembly_states"],{"copied_payload_pending_chapter_validation":5})
 add(["inventory_boundary","arabic_entry_ids"],[36286,36287])
 add(["inventory_boundary","english_entry_ids"],[48103,48104])
 add(["inventory_boundary","transmission_routes_planned"],1)
 add(["inventory_boundary","route_inventory_complete"],False)
 for i in range(6):add(["source_locator_manifest","claim_locators",i,"arabic_sha256"],"0"*64)
 for i in range(6):add(["source_locator_manifest","claim_locators",i,"english_sha256"],"0"*64)
 for i in range(6):add(["source_locator_manifest","claim_locators",i,"evidence_anchor_ar"],"")
 for i in range(6):add(["source_locator_manifest","claim_locators",i,"arabic_entry_id"],99999)
 add(["arabic_english_fidelity","aligned_claim_ids"],IDS[:-1])
 add(["arabic_english_fidelity","arabic_entry_ids"],[36286,36287])
 add(["arabic_english_fidelity","english_entry_ids"],[48103,48104])
 add(["hold_summary","active"],7)
 add(["hold_summary","resolved"],1)
 add(["hold_summary","waived"],1)
 add(["scholar_active_holds"],d["scholar_active_holds"][:-1])
 x=copy.deepcopy(d);x["scholar_active_holds"][0]["status"]="resolved";c.append(x)
 x=copy.deepcopy(d);x["scholar_active_holds"][0]["resolved"]=True;c.append(x)
 add(["physical_ids_allocated"],True)
 add(["database_written"],True)
 add(["publication_ready"],True)
 add(["scholar_complete"],True)
 assert len(c)==46
 return c

def main():
 d=json.loads(PATH.read_text(encoding="utf-8"));validate(d)
 rejected=0
 for x in mutations(d):
  try:validate(x)
  except (AssertionError,KeyError):rejected+=1
 assert rejected==46
 print("PASS: Saadi 108 holds consolidated; 6/6 incomplete, paired witnesses distinct, zero routes, 46/46 unsafe mutations rejected.")
if __name__=="__main__":main()


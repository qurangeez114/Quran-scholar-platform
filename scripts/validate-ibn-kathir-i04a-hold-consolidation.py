#!/usr/bin/env python3
import copy,json,sys
from pathlib import Path
B={"tabari":18,"ibn_kathir":15,"qurtubi":23,"jalalayn":5,"saadi":6,"tanwir_disputed_attribution":7}
H=["source_authentication_and_external_collection_verification","route_independence_and_witness_count","english_chain_abridgment","narrator_grading","physical_locator_persistence_and_readback","publication_authorization"]
AR={"108-I04A-E1":"023758dae9b7a0edc37a68489d65431601e705d40d474cc28232753073675ea6","108-I04A-E2":"a699d11ed53a5d8214f31dba8653d473aa24341e5a8cfd40d5514b780e5dfe3c","108-I04A-E3":"5f035bdbe7552b42b7cb0f7eedb6de13e3f60742201c4233ef57bd75706762e3"}
EN=["e55e5e904a8ffa1629af6c9320cde5631beb4e7b9aa89d64bc8f84e1486ee4b3","5d5a7997899521652c7e4290e3c04d24f0b985ae057abc43845a9c3e5d289052","13267c6bed743f7d56208fa1afdb849df476d9488b09da141e91ce35e01db25c"]
ROUTES=["108-I04A-R1-gloss","108-I04A-R1-reply","108-I04A-R2-AbuBishr","108-I04A-R2-Ata","108-I04A-R3"]
def validate(d):
 assert d["schema_version"]=="quranhikma-i04a-offline-hold-consolidation-v1" and d["claim_id"]=="108-I04A" and d["historical_claim_count"]==1
 assert d["basis"]["combined_candidate"]["blob"]=="fb9aea3b5420eb66b15948122b03a8cca0c42ec4"
 c=d["frozen_candidate"];assert [len(c[k]) for k in ["propositions","voices","evidence_units","links","routes"]]==[2,2,3,3,5]
 assert [p["speaker_name"] for p in c["propositions"]]==["Ibn Abbas","Sa'id ibn Jubayr"]
 assert [v["originating_voice_name"] for v in c["voices"]]==["Ibn Abbas","Sa'id ibn Jubayr"]
 assert {e["staging_key"]:e["source_locator"]["sha256"] for e in c["evidence_units"]}==AR
 assert [(x["proposition_ref"],x["evidence_unit_ref"]) for x in c["links"]]==[("108-I04A-A-P","108-I04A-E1"),("108-I04A-A-P","108-I04A-E2"),("108-I04A-B-P","108-I04A-E3")]
 assert [r["staging_key"] for r in c["routes"]]==ROUTES
 chains={r["staging_key"]:r["transmitter_chain"] for r in c["routes"]}
 assert chains["108-I04A-R2-AbuBishr"]==["Hushaym","Abu Bishr","Sa'id ibn Jubayr","Ibn Abbas"]
 assert chains["108-I04A-R2-Ata"]==["Hushaym","Ata ibn al-Sa'ib","Sa'id ibn Jubayr","Ibn Abbas"]
 assert all(not ("Abu Bishr" in chain and "Ata ibn al-Sa'ib" in chain) for chain in chains.values())
 b=d["bilingual_alignment"];assert [x["span_sha256"] for x in b["exact_english_units"]]==EN and b["global_absence_claimed"] is False
 assert len(b["exact_arabic_units"])==3 and len(b["contextual_question_units"])==2
 r=d["route_semantics"];assert r["printed_contexts"]==3 and r["projected_route_rows"]==5 and r["independence_state"]=="unknown"
 assert r["r2_parallel_branches"]==["108-I04A-R2-AbuBishr","108-I04A-R2-Ata"]
 assert d["graph_counts"]=={"propositions":2,"voices":2,"evidence_units":3,"links":3,"routes":5}
 assert [x["id"] for x in d["active_holds"]]==H and all(x=={"id":x["id"],"status":"active","resolved":False,"waived":False} for x in d["active_holds"])
 assert d["resolved_holds"]==0 and d["waived_holds"]==0 and d["six_scholar_baseline"]==B
 assert d["integration_state"]["repository_staging_integrated"] is True and d["integration_state"]["physical_database_written"] is False and d["integration_state"]["physical_ids_verified"] is False
 assert d["database_written"] is False and d["database_write_count"]==0 and d["publication_ready"] is False and d["claim_complete"] is False and d["scholar_complete"] is False and d["chapter_complete"] is False
def mutations(d):
 z=[]
 for k in ["database_written","publication_ready","claim_complete","scholar_complete","chapter_complete"]:
  x=copy.deepcopy(d);x[k]=True;z.append(x)
 x=copy.deepcopy(d);x["active_holds"].pop();z.append(x)
 x=copy.deepcopy(d);x["active_holds"][0]["resolved"]=True;z.append(x)
 x=copy.deepcopy(d);x["frozen_candidate"]["propositions"][1]["speaker_name"]="Ibn Abbas";z.append(x)
 x=copy.deepcopy(d);x["frozen_candidate"]["evidence_units"][0]["source_locator"]["sha256"]="0"*64;z.append(x)
 x=copy.deepcopy(d);x["frozen_candidate"]["routes"][2]["transmitter_chain"].insert(2,"Ata ibn al-Sa'ib");z.append(x)
 x=copy.deepcopy(d);x["bilingual_alignment"]["exact_english_units"][0]["span_sha256"]="0"*64;z.append(x)
 x=copy.deepcopy(d);x["route_semantics"]["independence_state"]="independent";z.append(x)
 return z
p=Path(sys.argv[1] if len(sys.argv)>1 else "data/tafsir/staging/ibn-kathir-108-i04a-hold-consolidation-2026-11-05.json")
d=json.loads(p.read_text(encoding="utf-8"));validate(d);q=0
for x in mutations(d):
 try:validate(x)
 except (AssertionError,KeyError,TypeError):q+=1
assert q==12
print("PASS: I04A hold consolidation; 12 unsafe mutations rejected")

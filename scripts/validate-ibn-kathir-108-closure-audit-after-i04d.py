#!/usr/bin/env python3
import copy,json,sys
from pathlib import Path
B={"tabari":18,"ibn_kathir":15,"qurtubi":23,"jalalayn":5,"saadi":6,"tanwir_disputed_attribution":7};C=["108-I01-A","108-I01-B","108-I03","108-I04B","108-I10","108-I11","108-I04C","108-I04D"]
AH=["023758dae9b7a0edc37a68489d65431601e705d40d474cc28232753073675ea6","5f035bdbe7552b42b7cb0f7eedb6de13e3f60742201c4233ef57bd75706762e3","a699d11ed53a5d8214f31dba8653d473aa24341e5a8cfd40d5514b780e5dfe3c"];RH=["ecc556e35dbafaaa78d398000c29f10ceaa65650c3c9acb665e629fdd45ce8de","75381a6772c31c8f9ac2304848bf9286957bb6eb04d749eba11001a7b559d48c","9864b37b801e21752ae5e6b687f0bfaf3e650ea57c7b28531a0c87adc60f530a"]
def validate(d):
 assert d["schema_version"]=="quranhikma-ibn-kathir-108-closure-audit-after-i04d-v1" and d["surah"]==108 and d["scholar_key"]=="ibn_kathir" and d["six_scholar_baseline"]==B and len(d["claim_rows"])==15
 assert {r["claim_id"] for r in d["claim_rows"]}=={"108-I01-A","108-I01-B","108-I02","108-I03","108-I04A","108-I04B","108-I04C","108-I04D","108-I05","108-I06","108-I07","108-I08","108-I09","108-I10","108-I11"}
 r=next(r for r in d["claim_rows"] if r["claim_id"]=="108-I04D");assert r["closure_class"]=="offline_hold_consolidated" and r["publication_ready"] is False
 c=d["coverage_summary"];assert c["active_split_claims"]==15 and c["publication_ready_claims"]==0 and c["claim_level_offline_hold_consolidated"]==C and c["claim_level_offline_hold_consolidated_count"]==8 and c["reviewed_routes"]==18 and c["publication_ready_routes"]==0 and c["next_repair_claim"]=="108-I04A"
 f=d["i04d_refresh_finding"];assert (f["active_holds"],f["resolved_holds"],f["waived_holds"])==(6,0,0) and f["graph"]=={"propositions":1,"voices":1,"evidence_units":1,"links":1,"routes":0} and f["arabic_span_sha256"]=="53c9a5ed4c68c2f410614d49254d3179c8f8f20388b18aa15851bcdedb8981b1" and f["english_positive_evidence_units"]==0 and f["claim_complete"] is False
 n=d["selected_next_repair"];assert n["claim_id"]=="108-I04A" and n["speakers"]==["Ibn Abbas","Sa'id ibn Jubayr"] and n["historical_claim_count"]==1 and n["physical_proposition_count"]==2 and sorted(x["span_sha256"] for x in n["exact_arabic_units"])==sorted(AH) and [x["span_sha256"] for x in n["printed_route_contexts"]]==RH and n["independence_state"]=="unknown" and n["publication_ready"] is False
 assert d["route_summary"]["expected_routes"]==18 and d["route_summary"]["publication_ready_routes"]==0 and d["counts_unchanged"] is True and d["database_written"] is False and d["database_write_count"]==0 and d["publication_ready"] is False and d["scholar_complete"] is False and d["chapter_complete"] is False
def mutations(d):
 z=[]
 for k in ["publication_ready","scholar_complete","chapter_complete","database_written"]:
  x=copy.deepcopy(d);x[k]=True;z.append(x)
 x=copy.deepcopy(d);x["coverage_summary"]["claim_level_offline_hold_consolidated"].pop();z.append(x)
 x=copy.deepcopy(d);x["coverage_summary"]["next_repair_claim"]="108-I05";z.append(x)
 x=copy.deepcopy(d);next(r for r in x["claim_rows"] if r["claim_id"]=="108-I04D")["closure_class"]="complete";z.append(x)
 x=copy.deepcopy(d);x["i04d_refresh_finding"]["active_holds"]=5;z.append(x)
 x=copy.deepcopy(d);x["selected_next_repair"]["speakers"]=["Ibn Abbas and Sa'id ibn Jubayr"];z.append(x)
 x=copy.deepcopy(d);x["selected_next_repair"]["exact_arabic_units"][0]["span_sha256"]="0"*64;z.append(x)
 return z
p=Path(sys.argv[1] if len(sys.argv)>1 else "data/tafsir/staging/ibn-kathir-108-closure-audit-after-i04d-2026-11-05.json");d=json.loads(p.read_text());validate(d);q=0
for x in mutations(d):
 try:validate(x)
 except (AssertionError,KeyError,TypeError):q+=1
assert q==10
print("PASS: closure audit after I04D; 10 unsafe mutations rejected")

#!/usr/bin/env python3
import copy,json,sys
from pathlib import Path
B={"tabari":18,"ibn_kathir":15,"qurtubi":23,"jalalayn":5,"saadi":6,"tanwir_disputed_attribution":7}
C=["108-I01-A","108-I01-B","108-I03","108-I04A","108-I04B","108-I04C","108-I04D","108-I10","108-I11"]
def validate(d):
 assert d["schema_version"]=="quranhikma-ibn-kathir-108-closure-audit-after-i04a-v1" and d["surah"]==108 and d["scholar_key"]=="ibn_kathir" and d["six_scholar_baseline"]==B
 assert len(d["claim_rows"])==15 and len({x["claim_id"] for x in d["claim_rows"]})==15
 i=next(x for x in d["claim_rows"] if x["claim_id"]=="108-I04A");assert i["closure_class"]=="offline_hold_consolidated" and i["publication_ready"] is False
 c=d["coverage_summary"];assert c["active_split_claims"]==15 and c["publication_ready_claims"]==0 and c["claim_level_offline_hold_consolidated"]==C and c["claim_level_offline_hold_consolidated_count"]==9
 assert c["route_level_offline_hold_consolidated"]==["108-I02-R05"] and c["i02_claim_complete"] is False and c["reviewed_routes"]==18 and c["publication_ready_routes"]==0 and c["next_repair_claim"]=="108-I07"
 f=d["i04a_refresh_finding"];assert (f["active_holds"],f["resolved_holds"],f["waived_holds"])==(6,0,0) and f["historical_claim_count"]==1
 assert f["graph"]=={"propositions":2,"voices":2,"evidence_units":3,"links":3,"routes":5} and f["printed_contexts"]==3 and f["projected_route_rows"]==5
 assert f["distinct_speakers"]==["Ibn Abbas","Sa'id ibn Jubayr"] and f["r2_parallel_branches"]==["108-I04A-R2-AbuBishr","108-I04A-R2-Ata"] and f["independence_state"]=="unknown" and f["claim_complete"] is False
 n=d["selected_next_repair"];assert n["claim_id"]=="108-I07" and (n["arabic_entry_id"],n["english_entry_id"])==(48459,11081)
 assert n["arabic_source_sha256"]=="088bd57659f0a6645f7195f2e98caf9562e0571eca8214730cd55c07401402b2" and n["english_source_sha256"]=="7e5883c137fce598750407a0a0d4aca5fa03e791f371b3ffdd5d7c280511afda"
 assert n["voice_record_type"]=="commentator_statement" and n["translation_state"]=="bounded_claim_content_aligned" and n["chain_state"]=="full_route_not_extracted" and n["publication_ready"] is False
 assert n["print_locator"]=={"edition":"Dar Taybah, 2nd ed., 1420/1999","volume":8,"pages":[504],"page_urls":["https://shamela.ws/book/8473/4550"]}
 assert d["selection_rationale"]["selected"]=="108-I07" and {x["claim_id"] for x in d["selection_rationale"]["deferred"]}=={"108-I02","108-I05","108-I06","108-I08","108-I09"}
 assert d["route_summary"]["expected_routes"]==18 and d["route_summary"]["publication_ready_routes"]==0 and d["counts_unchanged"] is True
 assert d["database_written"] is False and d["database_write_count"]==0 and d["publication_ready"] is False and d["scholar_complete"] is False and d["chapter_complete"] is False
def mutations(d):
 z=[]
 for k in ["database_written","publication_ready","scholar_complete","chapter_complete"]:
  x=copy.deepcopy(d);x[k]=True;z.append(x)
 x=copy.deepcopy(d);x["coverage_summary"]["claim_level_offline_hold_consolidated"].pop();z.append(x)
 x=copy.deepcopy(d);x["coverage_summary"]["next_repair_claim"]="108-I08";z.append(x)
 x=copy.deepcopy(d);next(r for r in x["claim_rows"] if r["claim_id"]=="108-I04A")["closure_class"]="complete";z.append(x)
 x=copy.deepcopy(d);x["i04a_refresh_finding"]["active_holds"]=5;z.append(x)
 x=copy.deepcopy(d);x["selected_next_repair"]["voice_record_type"]="reported_interpretation_or_report";z.append(x)
 x=copy.deepcopy(d);x["selected_next_repair"]["arabic_source_sha256"]="0"*64;z.append(x)
 return z
p=Path(sys.argv[1] if len(sys.argv)>1 else "data/tafsir/staging/ibn-kathir-108-closure-audit-after-i04a-2026-11-05.json")
d=json.loads(p.read_text(encoding="utf-8"));validate(d);q=0
for x in mutations(d):
 try:validate(x)
 except (AssertionError,KeyError,TypeError):q+=1
assert q==10
print("PASS: closure audit after I04A; 10 unsafe mutations rejected")

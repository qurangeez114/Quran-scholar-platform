#!/usr/bin/env python3
"""Validate the Surah 108 six-scholar source/live revalidation plan."""
import copy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PATH=ROOT/"data/tafsir/staging/surah-108-source-live-revalidation-plan-2026-11-11.json"
BASE={"tabari":18,"ibn_kathir":15,"qurtubi":23,"jalalayn":5,"saadi":6,"tanwir_disputed_attribution":7}
SCHOLARS=list(BASE)
H01=["108-TABARI-SCHOLAR-H01","108-IBN-KATHIR-SCHOLAR-H01","108-QURTUBI-SCHOLAR-H01","108-JALALAYN-SCHOLAR-H01","108-SAADI-SCHOLAR-H01","108-TANWIR-SCHOLAR-H01"]
TAB_HASHES=["2eae44dd583cc8562eeda7d40aafeeecddd22b3b73055dcfec1363b6c27c87f4","55143e1930f2511d2af04570d8e8e1091490c769829840a0ea03b92178992314","dd11e99471301b8b2044d0dddb518a375a69b4c4e8d654ac966ecc1ee46da988"]
INVARIANTS={"target_holds":6,"target_claims":74,"active_holds_before":48,"active_holds_after_plan":48,"resolved_holds_after_plan":0,"waived_holds_after_plan":0,"publication_ready_rows":0,"complete_scholars":0,"incomplete_scholars":6,"physical_ids_allocated":0,"database_rows_changed":0,"database_written":False,"publication_ready":False,"chapter_complete":False,"advance_to_surah_107":False}

def validate(d):
 assert d["schema_version"]=="quranhikma-surah-108-source-live-revalidation-plan-v1"
 assert d["status"]=="read_only_source_live_revalidation_plan_built_six_h01_holds_remain_active"
 assert d["surah"]==108 and d["six_scholar_baseline"]==BASE and d["baseline_total"]==74
 assert d["target_hold_class"]=="source_and_live_revalidation"
 assert d["basis"]["checkpoint_guard"]["workflow_run_id"]==43158982630 and d["basis"]["checkpoint_guard"]["conclusion"]=="cancelled" and d["basis"]["checkpoint_guard"]["passed_steps_before_cancellation"]==13
 assert d["basis"]["matrix_artifact_guard"]["workflow_run_id"]==43158901563 and d["basis"]["matrix_artifact_guard"]["conclusion"]=="success"
 targets=d["target_holds"]
 assert [x["scholar_key"] for x in targets]==SCHOLARS and [x["hold_id"] for x in targets]==H01
 assert [x["claim_count"] for x in targets]==list(BASE.values()) and all(x["status"]=="active" and x["condition"] for x in targets)
 lanes=d["execution_lanes"]
 assert [x["priority"] for x in lanes]==[1,2,3]
 assert lanes[0]["scholars"]==["tabari","qurtubi","saadi"] and lanes[1]["scholars"]==["jalalayn","tanwir_disputed_attribution"] and lanes[2]["scholars"]==["ibn_kathir"]
 assert all(x["write_mode"]=="read_only" and x["required_checks"] for x in lanes)
 s=d["scholar_revalidation_specs"];assert list(s)==SCHOLARS
 assert s["tabari"]["hold_id"]==H01[0] and [x["entry_id"] for x in s["tabari"]["entry_sources"]]==[5261,5262,5263]
 assert [x["sha256"] for x in s["tabari"]["entry_sources"]]==TAB_HASHES and s["tabari"]["english_witness"]=="absent_for_all_claims"
 assert s["ibn_kathir"]["hold_id"]==H01[1] and s["ibn_kathir"]["expected_routes"]==s["ibn_kathir"]["reviewed_routes"]==18
 assert len(s["ibn_kathir"]["unresolved_locator_groups"])==3 and s["ibn_kathir"]["english_witness"]=="abridged_not_full_route_translation"
 assert s["qurtubi"]["hold_id"]==H01[2] and len(s["qurtubi"]["source_locator_manifest"]["entries"])==3
 assert s["qurtubi"]["arabic_english_fidelity"]["partial_claim_groups"]==["108-Q04A"] and len(s["qurtubi"]["arabic_english_fidelity"]["corresponding_english_meaning_absent_claim_groups"])==13
 assert s["jalalayn"]["hold_id"]==H01[3] and s["jalalayn"]["live_arabic_entry_ids"]==[] and len(s["jalalayn"]["external_arabic_pages"])==3
 assert len(s["jalalayn"]["source_locator_manifest"]["claim_locators"])==5
 assert s["saadi"]["hold_id"]==H01[4] and s["saadi"]["arabic_entry_ids"]==[36286,36287,36288] and s["saadi"]["english_entry_ids"]==[48103,48104,48105]
 assert len(s["saadi"]["source_locator_manifest"]["claim_locators"])==6
 assert s["tanwir_disputed_attribution"]["hold_id"]==H01[5] and s["tanwir_disputed_attribution"]["live_arabic_entry_ids"]==[]
 assert len(s["tanwir_disputed_attribution"]["source_locator_manifest"]["claim_locators"])==7 and s["tanwir_disputed_attribution"]["attribution_boundary"]["all_claims_reported_only"] is True
 assert s["tanwir_disputed_attribution"]["encoding_defect_boundary"]["status"]=="visible_replacement_character_defect_preserved"
 assert all(any("No H01 hold is cleared" in x for x in s[k]["non_clearance"]) for k in SCHOLARS)
 assert d["plan_invariants"]==INVARIANTS
 n=d["selected_next_boundary"]
 assert n["kind"]=="tabari_h01_stored_source_hash_revalidation" and n["scholar_key"]=="tabari" and n["hold_id"]==H01[0]
 assert n["claim_count"]==18 and n["entry_ids"]==[5261,5262,5263] and n["entry_hashes"]==TAB_HASHES
 assert n["write_mode"]=="read_only" and n["hold_clearance_authorized"] is False and n["database_write_authorized"] is False and n["advance_to_surah_107"] is False
 assert d["validation"]["unsafe_mutations_rejected"]==60
 assert d["database_written"] is False and d["database_write_count"]==0 and d["publication_ready"] is False and d["chapter_complete"] is False

def mutations(d):
 c=[]
 def add(path,value):
  x=copy.deepcopy(d);q=x
  for k in path[:-1]:q=q[k]
  q[path[-1]]=value;c.append(x)
 add(["status"],"source_revalidated")
 add(["baseline_total"],73)
 add(["database_written"],True)
 add(["database_write_count"],1)
 add(["publication_ready"],True)
 add(["chapter_complete"],True)
 add(["basis","checkpoint_guard","conclusion"],"success")
 add(["basis","matrix_artifact_guard","conclusion"],"cancelled")
 for i in range(6):add(["target_holds",i,"status"],"resolved")
 for i in range(6):add(["target_holds",i,"hold_id"],"bad")
 for i in range(3):add(["execution_lanes",i,"priority"],9)
 for i in range(3):add(["execution_lanes",i,"scholars"],[])
 add(["scholar_revalidation_specs","tabari","english_witness"],"present")
 add(["scholar_revalidation_specs","tabari","entry_sources",0,"sha256"],"0"*64)
 add(["scholar_revalidation_specs","ibn_kathir","reviewed_routes"],17)
 add(["scholar_revalidation_specs","ibn_kathir","unresolved_locator_groups"],[])
 add(["scholar_revalidation_specs","qurtubi","source_locator_manifest","entries"],[])
 add(["scholar_revalidation_specs","qurtubi","arabic_english_fidelity","partial_claim_groups"],[])
 add(["scholar_revalidation_specs","jalalayn","live_arabic_entry_ids"],[1])
 add(["scholar_revalidation_specs","jalalayn","external_arabic_pages"],[])
 add(["scholar_revalidation_specs","saadi","arabic_entry_ids"],[36286])
 add(["scholar_revalidation_specs","saadi","source_locator_manifest","claim_locators"],[])
 add(["scholar_revalidation_specs","tanwir_disputed_attribution","live_arabic_entry_ids"],[1])
 add(["scholar_revalidation_specs","tanwir_disputed_attribution","encoding_defect_boundary","status"],"repaired")
 changes={"target_holds":5,"target_claims":73,"active_holds_before":47,"active_holds_after_plan":47,"resolved_holds_after_plan":1,"waived_holds_after_plan":1,"publication_ready_rows":1,"complete_scholars":1,"incomplete_scholars":5,"physical_ids_allocated":1,"database_rows_changed":1,"database_written":True,"publication_ready":True,"chapter_complete":True,"advance_to_surah_107":True}
 for k,v in changes.items():add(["plan_invariants",k],v)
 add(["selected_next_boundary","kind"],"advance_to_surah_107")
 add(["selected_next_boundary","hold_id"],"bad")
 add(["selected_next_boundary","entry_ids"],[5261])
 add(["selected_next_boundary","entry_hashes"],["0"*64]*3)
 add(["selected_next_boundary","hold_clearance_authorized"],True)
 add(["selected_next_boundary","database_write_authorized"],True)
 add(["validation","unsafe_mutations_rejected"],59)
 assert len(c)==60,len(c)
 return c

def main():
 d=json.loads(PATH.read_text(encoding="utf-8"));validate(d)
 rejected=0
 for x in mutations(d):
  try:validate(x)
  except (AssertionError,KeyError):rejected+=1
 assert rejected==60
 print("PASS: Surah 108 source/live revalidation plan; six H01 holds active, 74 claims unchanged, 60/60 unsafe mutations rejected.")
if __name__=="__main__":main()

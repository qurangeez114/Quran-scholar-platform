#!/usr/bin/env python3
"""Validate the Surah 108 chapter-level closure blocker matrix."""
import copy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PATH=ROOT/"data/tafsir/staging/surah-108-chapter-closure-blocker-matrix-2026-11-11.json"
BASE={"tabari":18,"ibn_kathir":15,"qurtubi":23,"jalalayn":5,"saadi":6,"tanwir_disputed_attribution":7}
SCHOLARS=list(BASE)
CLASSES=["source_and_live_revalidation","attribution_and_voice","arabic_english_fidelity_and_storage_integrity","route_and_authentication","duplicate_and_atomicity","physical_persistence","protected_publication_and_readback"]
COUNTS={"source_and_live_revalidation":6,"attribution_and_voice":6,"arabic_english_fidelity_and_storage_integrity":7,"route_and_authentication":9,"duplicate_and_atomicity":8,"physical_persistence":6,"protected_publication_and_readback":6}
PREFIX={"tabari":"108-TABARI-SCHOLAR-H","ibn_kathir":"108-IBN-KATHIR-SCHOLAR-H","qurtubi":"108-QURTUBI-SCHOLAR-H","jalalayn":"108-JALALAYN-SCHOLAR-H","saadi":"108-SAADI-SCHOLAR-H","tanwir_disputed_attribution":"108-TANWIR-SCHOLAR-H"}
H01=[PREFIX[k]+"01" for k in SCHOLARS]

def validate(d):
 assert d["schema_version"]=="quranhikma-surah-108-chapter-closure-blocker-matrix-v1"
 assert d["status"]=="chapter_closure_blocker_matrix_consolidated_all_48_holds_active"
 assert d["surah"]==108 and d["six_scholar_baseline"]==BASE and d["baseline_total"]==74
 holds=d["active_hold_inventory"]
 assert len(holds)==48 and len({x["hold_id"] for x in holds})==48
 assert all(x["status"]=="active" and x["resolved"] is False and x["waived"] is False and x["condition"] for x in holds)
 assert all(x["scholar_claim_count"]==BASE[x["scholar_key"]] for x in holds)
 for scholar in SCHOLARS:
  rows=[x for x in holds if x["scholar_key"]==scholar]
  assert len(rows)==8 and sorted(x["hold_id"] for x in rows)==[PREFIX[scholar]+f"{i:02d}" for i in range(1,9)]
 matrix=d["blocker_matrix"]
 assert [x["normalized_class"] for x in matrix]==CLASSES and [x["priority"] for x in matrix]==list(range(1,8))
 for row in matrix:
  c=row["normalized_class"]; ids=[x["hold_id"] for x in holds if x["normalized_class"]==c]
  assert row["active_hold_count"]==COUNTS[c] and row["active_hold_count"]==len(ids)
  assert row["hold_ids"]==ids and row["clearance_state"]=="blocked_no_hold_cleared"
 b=d["scholar_source_and_fidelity_boundaries"]
 assert b["tabari"]["known_route_boundaries"]==11 and b["tabari"]["complete_route_inventory"] is False and b["tabari"]["english_witness"]=="absent_for_all_claims"
 assert b["ibn_kathir"]["reviewed_routes"]==18 and b["ibn_kathir"]["route_level_holds"]==3 and b["ibn_kathir"]["english_witness"]=="abridged_not_full_route_translation"
 assert b["qurtubi"]["semantic_hold_metadata_rows"]==10 and b["qurtubi"]["explicit_hold_state_rows"]==3 and b["qurtubi"]["q04_english"]=="Q04A partial; Q04B-Q04N absent"
 assert b["jalalayn"]["live_arabic_entries"]==[] and b["jalalayn"]["j05_status"]=="reported_only" and b["jalalayn"]["transmission_routes_planned"]==0
 assert b["saadi"]["paired_witnesses_distinct"] is True and b["saadi"]["transmission_routes_planned"]==0
 assert b["tanwir_disputed_attribution"]["live_arabic_entries"]==[] and b["tanwir_disputed_attribution"]["direct_authenticated_chain"] is False
 assert "disputed" in b["tanwir_disputed_attribution"]["attribution"] and "defect preserved" in b["tanwir_disputed_attribution"]["entry_29982_defect"]
 ex=d["explicit_disagreements_and_absences"]
 assert list(ex)==SCHOLARS and all(len(ex[k])>=6 for k in SCHOLARS)
 summary=d["inventory_summary"]
 assert summary=={"claims":74,"scholars":6,"active_holds":48,"resolved_holds":0,"waived_holds":0,"publication_ready_rows":0,"complete_scholars":0,"incomplete_scholars":6,"physical_ids_allocated":0,"database_rows_changed":0,"database_written":False,"publication_ready":False,"chapter_complete":False,"advance_to_surah_107":False}
 n=d["selected_next_boundary"]
 assert n["kind"]=="source_and_live_revalidation_priority_batch" and n["normalized_class"]=="source_and_live_revalidation"
 assert n["active_hold_count"]==6 and n["hold_ids"]==H01 and n["database_write_authorized"] is False and n["advance_to_surah_107"] is False
 assert d["validation"]["unsafe_mutations_rejected"]==56
 assert d["database_written"] is False and d["database_write_count"]==0 and d["publication_ready"] is False and d["chapter_complete"] is False

def mutations(d):
 c=[]
 def add(path,value):
  x=copy.deepcopy(d);q=x
  for k in path[:-1]:q=q[k]
  q[path[-1]]=value;c.append(x)
 add(["status"],"chapter_complete")
 add(["baseline_total"],73)
 add(["database_written"],True)
 add(["database_write_count"],1)
 add(["publication_ready"],True)
 add(["chapter_complete"],True)
 summary_changes={"claims":73,"scholars":5,"active_holds":47,"resolved_holds":1,"waived_holds":1,"publication_ready_rows":1,"complete_scholars":1,"incomplete_scholars":5,"physical_ids_allocated":1,"database_rows_changed":1,"database_written":True,"advance_to_surah_107":True}
 for k,v in summary_changes.items():add(["inventory_summary",k],v)
 for i,cname in enumerate(CLASSES):add(["blocker_matrix",i,"active_hold_count"],COUNTS[cname]-1)
 for i,cname in enumerate(CLASSES):add(["blocker_matrix",i,"hold_ids"],d["blocker_matrix"][i]["hold_ids"][:-1])
 for scholar in SCHOLARS:
  idx=next(i for i,x in enumerate(d["active_hold_inventory"]) if x["scholar_key"]==scholar)
  add(["active_hold_inventory",idx,"status"],"resolved")
 for scholar in SCHOLARS:
  idx=next(i for i,x in enumerate(d["active_hold_inventory"]) if x["scholar_key"]==scholar)
  add(["active_hold_inventory",idx,"condition"],"")
 add(["scholar_source_and_fidelity_boundaries","tabari","english_witness"],"present")
 add(["scholar_source_and_fidelity_boundaries","ibn_kathir","reviewed_routes"],17)
 add(["scholar_source_and_fidelity_boundaries","qurtubi","q04_english"],"full")
 add(["scholar_source_and_fidelity_boundaries","jalalayn","live_arabic_entries"],[1])
 add(["scholar_source_and_fidelity_boundaries","saadi","paired_witnesses_distinct"],False)
 add(["scholar_source_and_fidelity_boundaries","tanwir_disputed_attribution","direct_authenticated_chain"],True)
 add(["selected_next_boundary","kind"],"advance_to_surah_107")
 add(["selected_next_boundary","active_hold_count"],5)
 add(["selected_next_boundary","hold_ids"],H01[:-1])
 add(["selected_next_boundary","database_write_authorized"],True)
 add(["explicit_disagreements_and_absences","tabari"],[])
 add(["validation","unsafe_mutations_rejected"],55)
 assert len(c)==56,len(c)
 return c

def main():
 d=json.loads(PATH.read_text(encoding="utf-8"));validate(d)
 rejected=0
 for x in mutations(d):
  try:validate(x)
  except (AssertionError,KeyError):rejected+=1
 assert rejected==56
 print("PASS: Surah 108 blocker matrix; 74 claims, 48 active holds across 7 classes, 56/56 unsafe mutations rejected.")
if __name__=="__main__":main()

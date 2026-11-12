#!/usr/bin/env python3
"""Validate final Surah 108 six-scholar readiness."""
import copy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PATH=ROOT/"data/tafsir/staging/surah-108-six-scholar-closure-readiness-final-2026-11-11.json"
BASE={"tabari":18,"ibn_kathir":15,"qurtubi":23,"jalalayn":5,"saadi":6,"tanwir_disputed_attribution":7}
SCHOLARS=list(BASE)
IDS=["108-W01","108-W02","108-W03","108-W04","108-W05","108-W06","108-W07"]
ENTRIES=[29980,29980,29981,29981,29981,29982,29982]
HASHES=["212a378f1bdffbbd016c42205a39c8ec1e572b8ab976c321b34f39806c60335e"]*2+["9c2e89421a4567bbe4b0c40b018a2826a8712988fcaf82e74926f656854ebd47"]*3+["6122617e7838708a2b33368485668b9f3ec7e6aca695fb552c62196978f59e42"]*2
ANCHORS=["الخير الكثير والقرآن منه","ويقال الكوثر نهر فى الجنة أعطاه الله محمدا","استقبل بنحرك إلى القبلة ويقال ضع يمينك على شمالك في الصلاة","استوف الركوع والسجود حتى يبدو نحرك","صل لربك صلاة يوم النحر وانحر البدن","مبغضك ... أبتر عن أهله وولده وماله وعن كل خير لا يذكر بعد موته بخير","وهو العاص بن وائل السهمي ... مات ابنه عبد الله"]
SPEAKER="Ibn ʿAbbās (attribution through Tanwīr al-Miqbās disputed)"
VOICE="Ibn ʿAbbās (attribution disputed)"
AUTH="Tanwīr al-Miqbās (traditionally attributed to Ibn ʿAbbās; disputed)"
CLASSES=["source_and_live_revalidation","attribution_and_voice","arabic_english_fidelity","route_and_authentication","duplicate_and_atomicity","physical_persistence","protected_publication_and_readback"]

def validate(d):
 assert d["schema_version"]=="quranhikma-surah-108-six-scholar-closure-readiness-final-v1"
 assert d["surah"]==108 and d["six_scholar_baseline"]==BASE and d["baseline_total"]==74
 s=d["scholar_readiness"]
 assert list(s)==SCHOLARS
 assert all(x["claim_count"]==BASE[k] for k,x in s.items())
 assert all(x["publication_ready_rows"]==0 and x["scholar_hold_consolidated"] is True for x in s.values())
 assert all((x["active_holds"],x["resolved_holds"],x["waived_holds"])==(8,0,0) for x in s.values())
 assert all(x["scholar_complete"] is False and x["publication_ready"] is False for x in s.values())
 assert s["tabari"]["known_route_boundaries"]==11 and s["tabari"]["complete_route_inventory"] is False and s["tabari"]["english_witness"]=="absent_for_all_claims"
 assert s["ibn_kathir"]["reviewed_routes"]==18 and s["ibn_kathir"]["route_level_holds"]==3 and s["ibn_kathir"]["english_witness"]=="abridged_not_full_route_translation"
 q=s["qurtubi"]
 assert q["rows_with_semantic_hold_metadata"]==10 and q["explicit_semantic_hold_state_rows"]==3 and q["transmission_routes_planned"]==0
 assert q["english_fidelity"]["partial_claim_groups"]==["108-Q04A"] and len(q["english_fidelity"]["corresponding_english_meaning_absent_claim_groups"])==13
 assert s["jalalayn"]["live_arabic_entry_ids"]==[] and s["jalalayn"]["external_arabic_witnesses"]==3 and s["jalalayn"]["j05_status"]=="reported_only" and s["jalalayn"]["transmission_routes_planned"]==0
 assert s["saadi"]["arabic_entry_ids"]==[36286,36287,36288] and s["saadi"]["english_entry_ids"]==[48103,48104,48105] and s["saadi"]["paired_witnesses_distinct"] is True and s["saadi"]["transmission_routes_planned"]==0
 t=s["tanwir_disputed_attribution"]
 assert t["live_english_entry_ids"]==[29980,29981,29982] and t["live_arabic_entry_ids"]==[] and t["direct_authenticated_chain"] is False
 assert t["transmission_routes_planned"]==0 and t["route_inventory_complete"] is True
 assert t["attribution"]=="Traditionally attributed to Ibn Abbas; attribution disputed"
 assert "silently repair" in t["encoding_guard"]
 rows=t["claim_locators"]
 assert [x["claim_id"] for x in rows]==IDS and [x["english_entry_id"] for x in rows]==ENTRIES
 assert [x["english_sha256"] for x in rows]==HASHES and [x["evidence_anchor_ar"] for x in rows]==ANCHORS
 assert all(x["speaker_name"]==SPEAKER and x["voice_name"]==VOICE and x["evidence_authority"]==AUTH for x in rows)
 assert all(x["mufassir_own_position"]=="reported_only" and x["transmission_route_action"]=="none" for x in rows)
 hp=d["hold_progress"]
 assert hp["scholars_with_consolidated_holds"]==SCHOLARS and hp["scholars_pending_hold_consolidation"]==[]
 assert (hp["active_consolidated_holds"],hp["resolved_consolidated_holds"],hp["waived_consolidated_holds"])==(48,0,0)
 assert d["chapter_readiness"]=={"claim_rows":74,"publication_ready_rows":0,"complete_scholars":0,"incomplete_scholars":6,"physical_ids_allocated":0,"database_rows_changed":0,"database_written":False,"publication_ready":False,"chapter_complete":False,"advance_to_surah_107":False}
 n=d["selected_next_boundary"]
 assert n["kind"]=="chapter_closure_blocker_inventory_and_priority" and n["scope"]=="all_six_scholars_48_active_holds"
 assert n["required_classes"]==CLASSES and (n["active_holds"],n["claims"],n["publication_ready_rows"])==(48,74,0) and n["advance_to_surah_107"] is False
 assert len(d["explicit_disagreements_and_absences"])==7
 assert d["validation"]["unsafe_mutations_rejected"]==52 and d["counts_unchanged"] is True
 assert d["database_written"] is False and d["database_write_count"]==0 and d["publication_ready"] is False and d["chapter_complete"] is False

def mutations(d):
 c=[]
 def add(path,value):
  x=copy.deepcopy(d);q=x
  for k in path[:-1]:q=q[k]
  q[path[-1]]=value;c.append(x)
 add(["baseline_total"],73)
 add(["database_written"],True)
 add(["database_write_count"],1)
 add(["publication_ready"],True)
 add(["chapter_complete"],True)
 add(["hold_progress","active_consolidated_holds"],47)
 add(["hold_progress","resolved_consolidated_holds"],1)
 add(["hold_progress","waived_consolidated_holds"],1)
 add(["hold_progress","scholars_pending_hold_consolidation"],["tanwir_disputed_attribution"])
 add(["hold_progress","scholars_with_consolidated_holds"],SCHOLARS[:-1])
 for k,v in [("claim_rows",73),("publication_ready_rows",1),("complete_scholars",1),("incomplete_scholars",5),("physical_ids_allocated",1),("database_rows_changed",1),("database_written",True),("publication_ready",True),("chapter_complete",True),("advance_to_surah_107",True)]: add(["chapter_readiness",k],v)
 for k in SCHOLARS: add(["scholar_readiness",k,"scholar_hold_consolidated"],False)
 for k in SCHOLARS: add(["scholar_readiness",k,"active_holds"],7)
 add(["scholar_readiness","tabari","english_witness"],"present")
 add(["scholar_readiness","ibn_kathir","reviewed_routes"],17)
 add(["scholar_readiness","qurtubi","rows_with_semantic_hold_metadata"],9)
 add(["scholar_readiness","jalalayn","live_arabic_entry_ids"],[1])
 add(["scholar_readiness","saadi","paired_witnesses_distinct"],False)
 add(["scholar_readiness","tanwir_disputed_attribution","direct_authenticated_chain"],True)
 add(["scholar_readiness","tanwir_disputed_attribution","live_arabic_entry_ids"],[1])
 add(["scholar_readiness","tanwir_disputed_attribution","attribution"],"Ibn Abbas")
 add(["scholar_readiness","tanwir_disputed_attribution","encoding_guard"],"repaired")
 add(["scholar_readiness","tanwir_disputed_attribution","claim_locators"],d["scholar_readiness"]["tanwir_disputed_attribution"]["claim_locators"][:-1])
 add(["scholar_readiness","tanwir_disputed_attribution","claim_locators",0,"english_sha256"],"0"*64)
 add(["scholar_readiness","tanwir_disputed_attribution","claim_locators",1,"evidence_anchor_ar"],"")
 add(["scholar_readiness","tanwir_disputed_attribution","claim_locators",2,"speaker_name"],"Ibn Abbas")
 add(["scholar_readiness","tanwir_disputed_attribution","claim_locators",3,"transmission_route_action"],"create")
 add(["selected_next_boundary","kind"],"advance_to_surah_107")
 add(["selected_next_boundary","active_holds"],47)
 add(["selected_next_boundary","required_classes"],CLASSES[:-1])
 add(["selected_next_boundary","advance_to_surah_107"],True)
 add(["explicit_disagreements_and_absences"],[])
 add(["validation","unsafe_mutations_rejected"],51)
 assert len(c)==52,len(c)
 return c

def main():
 d=json.loads(PATH.read_text(encoding="utf-8"));validate(d)
 rejected=0
 for x in mutations(d):
  try:validate(x)
  except (AssertionError,KeyError):rejected+=1
 assert rejected==52
 print("PASS: final six-scholar readiness; 74 claims, 0 ready, 48 active holds, all scholars incomplete, 52/52 unsafe mutations rejected.")
if __name__=="__main__":main()

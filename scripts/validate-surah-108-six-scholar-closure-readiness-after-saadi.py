#!/usr/bin/env python3
"""Validate post-Saadi Surah 108 six-scholar readiness."""
import copy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PATH=ROOT/"data/tafsir/staging/surah-108-six-scholar-closure-readiness-after-saadi-2026-11-11.json"
BASE={"tabari":18,"ibn_kathir":15,"qurtubi":23,"jalalayn":5,"saadi":6,"tanwir_disputed_attribution":7}
IDS=["108-W01","108-W02","108-W03","108-W04","108-W05","108-W06","108-W07"]
ENTRIES=[29980,29980,29981,29981,29981,29982,29982]
HASHES=["212a378f1bdffbbd016c42205a39c8ec1e572b8ab976c321b34f39806c60335e"]*2+["9c2e89421a4567bbe4b0c40b018a2826a8712988fcaf82e74926f656854ebd47"]*3+["6122617e7838708a2b33368485668b9f3ec7e6aca695fb552c62196978f59e42"]*2
ANCHORS=["الخير الكثير والقرآن منه","ويقال الكوثر نهر فى الجنة أعطاه الله محمدا","استقبل بنحرك إلى القبلة ويقال ضع يمينك على شمالك في الصلاة","استوف الركوع والسجود حتى يبدو نحرك","صل لربك صلاة يوم النحر وانحر البدن","مبغضك ... أبتر عن أهله وولده وماله وعن كل خير لا يذكر بعد موته بخير","وهو العاص بن وائل السهمي ... مات ابنه عبد الله"]
SPEAKER="Ibn ʿAbbās (attribution through Tanwīr al-Miqbās disputed)"
VOICE="Ibn ʿAbbās (attribution disputed)"
AUTH="Tanwīr al-Miqbās (traditionally attributed to Ibn ʿAbbās; disputed)"

def validate(d):
 assert d["schema_version"]=="quranhikma-surah-108-six-scholar-closure-readiness-after-saadi-v1"
 assert d["surah"]==108 and d["six_scholar_baseline"]==BASE and d["baseline_total"]==74
 s=d["scholar_readiness"]
 assert list(s)==["tabari","ibn_kathir","qurtubi","jalalayn","saadi","tanwir_disputed_attribution"]
 assert all(x["publication_ready_rows"]==0 and x["scholar_complete"] is False and x["publication_ready"] is False for x in s.values())
 assert all(s[k]["scholar_hold_consolidated"] is True for k in ("tabari","ibn_kathir","qurtubi","jalalayn","saadi"))
 a=s["saadi"]
 assert a["claim_count"]==6 and a["active_holds"]==8 and a["resolved_holds"]==a["waived_holds"]==0
 assert a["arabic_entry_ids"]==[36286,36287,36288] and a["english_entry_ids"]==[48103,48104,48105]
 assert a["transmission_routes_planned"]==0 and a["paired_witnesses_distinct"] is True
 t=s["tanwir_disputed_attribution"]
 assert t["claim_count"]==7 and t["scholar_hold_consolidated"] is False
 assert t["live_english_entry_ids"]==[29980,29981,29982] and t["live_arabic_entry_ids"]==[]
 assert t["transmission_routes_planned"]==0
 assert t["attribution"]=="Tanwir al-Miqbas, traditionally attributed to Ibn Abbas; attribution disputed"
 assert "replacement-character defect" in t["encoding_guard"]
 rows=t["claim_locators"]
 assert [x["claim_id"] for x in rows]==IDS and [x["english_entry_id"] for x in rows]==ENTRIES
 assert [x["english_sha256"] for x in rows]==HASHES and [x["evidence_anchor_ar"] for x in rows]==ANCHORS
 assert all(x["speaker_name"]==SPEAKER and x["voice_name"]==VOICE and x["evidence_authority"]==AUTH for x in rows)
 assert all(x["mufassir_own_position"]=="reported_only" and x["transmission_route_action"]=="none" for x in rows)
 hp=d["hold_progress"]
 assert hp["scholars_with_consolidated_holds"]==["tabari","ibn_kathir","qurtubi","jalalayn","saadi"]
 assert hp["scholars_pending_hold_consolidation"]==["tanwir_disputed_attribution"]
 assert (hp["active_consolidated_holds"],hp["resolved_consolidated_holds"],hp["waived_consolidated_holds"])==(40,0,0)
 cr=d["chapter_readiness"]
 assert cr=={"claim_rows":74,"publication_ready_rows":0,"complete_scholars":0,"incomplete_scholars":6,"physical_ids_allocated":0,"database_rows_changed":0,"database_written":False,"publication_ready":False,"chapter_complete":False,"advance_to_surah_107":False}
 n=d["selected_next_boundary"]
 assert n["scholar_key"]=="tanwir_disputed_attribution" and n["claim_count"]==7 and n["transmission_routes_planned"]==0
 assert d["validation"]["unsafe_mutations_rejected"]==48 and d["counts_unchanged"] is True
 assert d["database_written"] is False and d["database_write_count"]==0 and d["publication_ready"] is False and d["chapter_complete"] is False

def mutations(d):
 c=[]
 def add(path,value):
  x=copy.deepcopy(d);q=x
  for k in path[:-1]:q=q[k]
  q[path[-1]]=value;c.append(x)
 add(["baseline_total"],73)
 add(["chapter_readiness","claim_rows"],73)
 add(["chapter_readiness","publication_ready_rows"],1)
 add(["chapter_readiness","complete_scholars"],1)
 add(["chapter_readiness","incomplete_scholars"],5)
 add(["chapter_readiness","physical_ids_allocated"],1)
 add(["chapter_readiness","database_rows_changed"],1)
 add(["chapter_readiness","database_written"],True)
 add(["chapter_readiness","publication_ready"],True)
 add(["chapter_readiness","chapter_complete"],True)
 add(["chapter_readiness","advance_to_surah_107"],True)
 add(["scholar_readiness","saadi","claim_count"],5)
 add(["scholar_readiness","saadi","scholar_hold_consolidated"],False)
 add(["scholar_readiness","saadi","active_holds"],7)
 add(["scholar_readiness","saadi","resolved_holds"],1)
 add(["scholar_readiness","saadi","arabic_entry_ids"],[36286,36287])
 add(["scholar_readiness","saadi","english_entry_ids"],[48103,48104])
 add(["scholar_readiness","saadi","transmission_routes_planned"],1)
 add(["scholar_readiness","saadi","paired_witnesses_distinct"],False)
 add(["scholar_readiness","tanwir_disputed_attribution","claim_count"],6)
 add(["scholar_readiness","tanwir_disputed_attribution","scholar_hold_consolidated"],True)
 add(["scholar_readiness","tanwir_disputed_attribution","live_english_entry_ids"],[29980,29981])
 add(["scholar_readiness","tanwir_disputed_attribution","live_arabic_entry_ids"],[1])
 add(["scholar_readiness","tanwir_disputed_attribution","transmission_routes_planned"],1)
 add(["scholar_readiness","tanwir_disputed_attribution","attribution"],"Ibn Abbas")
 add(["scholar_readiness","tanwir_disputed_attribution","encoding_guard"],"repaired")
 add(["scholar_readiness","tanwir_disputed_attribution","claim_locators"],d["scholar_readiness"]["tanwir_disputed_attribution"]["claim_locators"][:-1])
 for i in range(7):add(["scholar_readiness","tanwir_disputed_attribution","claim_locators",i,"english_sha256"],"0"*64)
 for i in range(7):add(["scholar_readiness","tanwir_disputed_attribution","claim_locators",i,"evidence_anchor_ar"],"")
 for i in range(7):add(["scholar_readiness","tanwir_disputed_attribution","claim_locators",i,"speaker_name"],"Ibn Abbas")
 assert len(c)==48, len(c)
 return c

def main():
 d=json.loads(PATH.read_text(encoding="utf-8"));validate(d)
 rejected=0
 for x in mutations(d):
  try:validate(x)
  except (AssertionError,KeyError):rejected+=1
 assert rejected==48
 print("PASS: post-Saadi readiness; 74 claims, 0 ready, 40 active consolidated holds, disputed Tanwir selected, 48/48 unsafe mutations rejected.")
if __name__=="__main__":main()


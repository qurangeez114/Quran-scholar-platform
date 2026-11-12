#!/usr/bin/env python3
"""Validate post-Jalalayn Surah 108 six-scholar readiness."""
import copy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PATH=ROOT/"data/tafsir/staging/surah-108-six-scholar-closure-readiness-after-jalalayn-2026-11-11.json"
BASE={"tabari":18,"ibn_kathir":15,"qurtubi":23,"jalalayn":5,"saadi":6,"tanwir_disputed_attribution":7}
IDS=["108-S01","108-S02","108-S03","108-S04","108-S05","108-S06"]
AR_IDS=[36286,36286,36287,36287,36288,36288]
EN_IDS=[48103,48103,48104,48104,48105,48105]
AR_HASH=[
"36210cd035e92d8e4213fa2a6cb4cbd8f51ad5fe93cba93590e141a453d279db",
"36210cd035e92d8e4213fa2a6cb4cbd8f51ad5fe93cba93590e141a453d279db",
"94b52b9fc5d2c9345998c69b4eeb7e3a9c98fe308440c91e162a7f48a691a368",
"94b52b9fc5d2c9345998c69b4eeb7e3a9c98fe308440c91e162a7f48a691a368",
"b351d82179de0e097132df2b07940bb2c2af77bace9836b449ce772b6b0794cc",
"b351d82179de0e097132df2b07940bb2c2af77bace9836b449ce772b6b0794cc"]
EN_HASH=[
"6bed6b833bf0002498f317866b9bb15277495f540c1313b0ff0bb2c8d54223a5",
"6bed6b833bf0002498f317866b9bb15277495f540c1313b0ff0bb2c8d54223a5",
"b592916ce3c51178cc313e96a714c70b23f8a136917c7620f2e5bd279e333696",
"b592916ce3c51178cc313e96a714c70b23f8a136917c7620f2e5bd279e333696",
"dec0d77ea35a7debd407e43c7c7a97fdfffbc82f14c8365bddb8c4c6540951c7",
"dec0d77ea35a7debd407e43c7c7a97fdfffbc82f14c8365bddb8c4c6540951c7"]
ANCHORS=[
"الخير الكثير، والفضل الغزير",
"من النهر الذي يقال له الكوثر ومن الحوض ... لم يظمأ بعدها أبدا",
"خص هاتين العبادتين بالذكر، لأنهما من أفضل العبادات وأجل القربات",
"الصلاة تتضمن الخضوع في القلب والجوارح ... وفي النحر تقرب إلى الله ... وإخراج للمال",
"مبغضك وذامك ومنتقصك ... المقطوع من كل خير، مقطوع العمل، مقطوع الذكر",
"فهو الكامل حقا ... من رفع الذكر، وكثرة الأنصار، والأتباع"]

def validate(d):
 assert d["schema_version"]=="quranhikma-surah-108-six-scholar-closure-readiness-after-jalalayn-v1"
 assert d["surah"]==108 and d["six_scholar_baseline"]==BASE and d["baseline_total"]==74
 s=d["scholar_readiness"]
 assert list(s)==["tabari","ibn_kathir","qurtubi","jalalayn","saadi","tanwir_disputed_attribution"]
 assert all(x["publication_ready_rows"]==0 and x["scholar_complete"] is False and x["publication_ready"] is False for x in s.values())
 assert all(s[k]["scholar_hold_consolidated"] is True for k in ("tabari","ibn_kathir","qurtubi","jalalayn"))
 j=s["jalalayn"]
 assert j["claim_count"]==5 and j["active_holds"]==8 and j["resolved_holds"]==j["waived_holds"]==0
 assert j["live_english_entry_ids"]==[23671,23672,23673] and j["live_arabic_entry_ids"]==[]
 assert j["external_arabic_witnesses"]==3 and j["transmission_routes_planned"]==0 and j["j05_status"]=="reported_only"
 a=s["saadi"]
 assert a["claim_count"]==6 and a["scholar_hold_consolidated"] is False
 assert a["arabic_entry_ids"]==[36286,36287,36288] and a["english_entry_ids"]==[48103,48104,48105]
 assert a["transmission_routes_planned"]==0
 rows=a["claim_locators"]
 assert [x["claim_id"] for x in rows]==IDS
 assert [x["arabic_entry_id"] for x in rows]==AR_IDS and [x["english_entry_id"] for x in rows]==EN_IDS
 assert [x["arabic_sha256"] for x in rows]==AR_HASH and [x["english_sha256"] for x in rows]==EN_HASH
 assert [x["evidence_anchor_ar"] for x in rows]==ANCHORS
 assert all(x["mufassir_own_position"]=="preferred" and x["transmission_route_action"]=="none" for x in rows)
 hp=d["hold_progress"]
 assert hp["scholars_with_consolidated_holds"]==["tabari","ibn_kathir","qurtubi","jalalayn"]
 assert hp["scholars_pending_hold_consolidation"]==["saadi","tanwir_disputed_attribution"]
 assert (hp["active_consolidated_holds"],hp["resolved_consolidated_holds"],hp["waived_consolidated_holds"])==(32,0,0)
 cr=d["chapter_readiness"]
 assert cr=={"claim_rows":74,"publication_ready_rows":0,"complete_scholars":0,"incomplete_scholars":6,"physical_ids_allocated":0,"database_rows_changed":0,"database_written":False,"publication_ready":False,"chapter_complete":False,"advance_to_surah_107":False}
 n=d["selected_next_boundary"]
 assert n["scholar_key"]=="saadi" and n["claim_count"]==6 and n["transmission_routes_planned"]==0
 assert d["validation"]["unsafe_mutations_rejected"]==46
 assert d["counts_unchanged"] is True and d["database_written"] is False and d["database_write_count"]==0 and d["publication_ready"] is False and d["chapter_complete"] is False

def mutation_cases(d):
 cases=[]
 def add(path,value):
  x=copy.deepcopy(d);cur=x
  for k in path[:-1]:cur=cur[k]
  cur[path[-1]]=value;cases.append(x)
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
 add(["scholar_readiness","jalalayn","claim_count"],4)
 add(["scholar_readiness","jalalayn","scholar_hold_consolidated"],False)
 add(["scholar_readiness","jalalayn","active_holds"],7)
 add(["scholar_readiness","jalalayn","live_english_entry_ids"],[23671,23672])
 add(["scholar_readiness","jalalayn","live_arabic_entry_ids"],[1])
 add(["scholar_readiness","jalalayn","external_arabic_witnesses"],2)
 add(["scholar_readiness","jalalayn","transmission_routes_planned"],1)
 add(["scholar_readiness","jalalayn","j05_status"],"preferred")
 add(["scholar_readiness","saadi","claim_count"],5)
 add(["scholar_readiness","saadi","scholar_hold_consolidated"],True)
 add(["scholar_readiness","saadi","arabic_entry_ids"],[36286,36287])
 add(["scholar_readiness","saadi","english_entry_ids"],[48103,48104])
 add(["scholar_readiness","saadi","transmission_routes_planned"],1)
 add(["scholar_readiness","saadi","claim_locators"],d["scholar_readiness"]["saadi"]["claim_locators"][:-1])
 for i in range(6):add(["scholar_readiness","saadi","claim_locators",i,"arabic_sha256"],"0"*64)
 for i in range(6):add(["scholar_readiness","saadi","claim_locators",i,"english_sha256"],"0"*64)
 for i in range(6):add(["scholar_readiness","saadi","claim_locators",i,"evidence_anchor_ar"],"")
 add(["hold_progress","active_consolidated_holds"],31)
 add(["hold_progress","scholars_pending_hold_consolidation"],["tanwir_disputed_attribution"])
 add(["selected_next_boundary","scholar_key"],"tanwir_disputed_attribution")
 assert len(cases)==46
 return cases

def main():
 d=json.loads(PATH.read_text(encoding="utf-8"));validate(d)
 rejected=0
 for x in mutation_cases(d):
  try:validate(x)
  except (AssertionError,KeyError):rejected+=1
 assert rejected==46
 print("PASS: post-Jalalayn readiness; 74 claims, 0 ready, 32 active consolidated holds, Saadi selected, 46/46 unsafe mutations rejected.")

if __name__=="__main__":main()


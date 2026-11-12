#!/usr/bin/env python3
"""Validate Tabari Surah 108 H01 protected live-source revalidation."""
import copy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PATH=ROOT/"data/tafsir/staging/tabari-108-h01-live-source-revalidation-2026-11-11.json"
ENTRY_IDS=[5261,5262,5263]
ENTRY_LENGTHS=[11335,6569,4322]
ENTRY_HASHES=["2eae44dd583cc8562eeda7d40aafeeecddd22b3b73055dcfec1363b6c27c87f4","55143e1930f2511d2af04570d8e8e1091490c769829840a0ea03b92178992314","dd11e99471301b8b2044d0dddb518a375a69b4c4e8d654ac966ecc1ee46da988"]
SPAN_LABELS=["108-T01","108-T02","108-T08A","108-T08B","108-T11A-01","108-T11A-02","108-T11A-03","108-T11A-04","108-T11A-05","108-T11A-06","108-T11C-01","108-T11C-02"]
SPAN_IDS=[5261,5261,5262,5262]+[5263]*8
SPAN_STARTS=[165,2925,1952,2385,398,544,701,860,1106,1351,2039,2809]
SPAN_ENDS=[234,2965,2110,2553,544,701,860,1106,1351,1485,2567,3235]
SPAN_HASHES=["92a0a9f40568c8eabb5bbc34971bdead061f4330ce7b2e0a3b1d0ff161f46e7a","50a7a46bbd22af6c3b843c49883407e0c2ff10a7fc139688d4b3ddf28812ffb6","88ffde7baa94e8aa5f04d59fea3b1e9361f1463631549803aaaf8e45d1a14dee","6f1e099bc09a08936c1c1c503493046fa33aaa58396ff0f9b3d1e4d2117e4edc","3669edac610421c993ee045a1c3efcc905455d92863d2d5bf32def54ea49825e","7123a05b538b184a3c2e5326dec6ef6c14e54a229a12eec5ecc12c3dc2eab1e2","b6ceb2786188888ffd8499d6337953658d7431897c94dedab89b80715a5d0610","96d510029202a124bcd0bc5aec8d2dc8b3ced75d1996af01cee90895d3f362b1","473867d6624124ad310f870bee7af0ffc675192c96711fa80d770a97f8887b18","d03a2cc0f98040dc8aaf7f445f33c38e7314c71c3834adedde4cfddd0726c2b9","a3124d113132b3e48d781d2f5ee7df0aa29b55d497a705fe9cabe2384d3af818","e2e3057e54e8d5b6578c72388178e03b00c0f5f1b68236ade34e909f5f36572e"]

def validate(d):
 assert d["schema_version"]=="quranhikma-tabari-108-h01-live-source-revalidation-v1"
 assert d["status"]=="protected_read_only_live_source_identity_hash_and_span_revalidation_passed_hold_remains_active"
 assert d["surah"]==108 and d["scholar_key"]=="tabari" and d["hold_id"]=="108-TABARI-SCHOLAR-H01"
 assert d["basis"]["plan_artifact_guard"]["conclusion"]=="success" and d["basis"]["plan_checkpoint_guard"]["conclusion"]=="success"
 m=d["observation_method"]
 assert m=={"mode":"protected_read_only_sql","table":"public.tafsir_entries","selection":"id in (5261,5262,5263); aggregate scholar_key=tabari and sura=108 by language","content_disclosed":False,"credentials_disclosed":False,"database_mutated":False}
 rows=d["entry_observations"]
 assert [x["entry_id"] for x in rows]==ENTRY_IDS and [x["aya"] for x in rows]==[1,2,3]
 assert [x["unicode_codepoints"] for x in rows]==ENTRY_LENGTHS
 assert [x["expected_sha256"] for x in rows]==ENTRY_HASHES and [x["observed_sha256"] for x in rows]==ENTRY_HASHES
 assert all(x["sura"]==108 and x["scholar_key"]=="tabari" and x["language"]=="ar" and x["source_url"]=="310" for x in rows)
 assert all(x["hash_match"] is True and x["identity_match"] is True for x in rows)
 spans=d["span_observations"]
 assert [x["label"] for x in spans]==SPAN_LABELS and [x["entry_id"] for x in spans]==SPAN_IDS
 assert [x["start_codepoint"] for x in spans]==SPAN_STARTS and [x["end_codepoint"] for x in spans]==SPAN_ENDS
 assert [x["expected_sha256"] for x in spans]==SPAN_HASHES and [x["observed_sha256"] for x in spans]==SPAN_HASHES
 assert all(x["codepoints"]==x["end_codepoint"]-x["start_codepoint"] and x["hash_match"] is True and x["bounds_valid"] is True for x in spans)
 li=d["live_language_inventory"]
 assert li["languages"]==[{"language":"ar","row_count":3,"entry_ids":[5261,5262,5263]}]
 assert li["english_row_count"]==0 and li["english_entry_ids"]==[]
 r=d["revalidation_result"]
 assert (r["entry_identity_matches"],r["entry_hash_matches"],r["span_hash_matches"],r["span_bounds_valid"],r["live_english_rows"])==(3,3,12,12,0)
 assert r["source_component"]=="verified_current_live_match"
 assert r["schema_vocabulary_component"]=="not_yet_revalidated_for_all_eighteen_non_final_rows"
 assert r["final_consumer_identity_component"]=="not_yet_revalidated_for_all_eighteen_non_final_rows"
 assert r["h01_status"]=="active" and r["h01_resolved"] is False and r["h01_waived"] is False
 assert r["scholar_complete"] is False and r["publication_ready"] is False
 assert len(d["explicit_disagreements_and_absences"])==7
 inv=d["lifecycle_invariants"]
 assert inv=={"historical_claims":74,"tabari_claims":18,"publication_ready_tabari_claims":0,"active_scholar_holds_before":48,"active_scholar_holds_after":48,"resolved_scholar_holds":0,"waived_scholar_holds":0,"physical_ids_allocated":0,"database_rows_changed":0,"database_written":False,"publication_ready":False,"scholar_complete":False,"chapter_complete":False,"advance_to_surah_107":False}
 n=d["selected_next_boundary"]
 assert n["kind"]=="tabari_h01_schema_and_consumer_identity_audit" and n["hold_id"]=="108-TABARI-SCHOLAR-H01" and n["claim_count"]==18
 assert n["write_mode"]=="read_only" and n["hold_clearance_authorized"] is False and n["database_write_authorized"] is False and n["advance_to_surah_107"] is False
 assert d["validation"]["unsafe_mutations_rejected"]==64
 assert d["database_written"] is False and d["database_write_count"]==0 and d["publication_ready"] is False and d["scholar_complete"] is False and d["chapter_complete"] is False

def mutations(d):
 c=[]
 def add(path,value):
  x=copy.deepcopy(d);q=x
  for k in path[:-1]:q=q[k]
  q[path[-1]]=value;c.append(x)
 add(["status"],"complete")
 add(["database_written"],True)
 add(["database_write_count"],1)
 add(["publication_ready"],True)
 add(["scholar_complete"],True)
 add(["chapter_complete"],True)
 add(["basis","plan_artifact_guard","conclusion"],"cancelled")
 add(["basis","plan_checkpoint_guard","conclusion"],"cancelled")
 add(["observation_method","mode"],"write")
 add(["observation_method","content_disclosed"],True)
 add(["observation_method","credentials_disclosed"],True)
 add(["observation_method","database_mutated"],True)
 for i in range(3):add(["entry_observations",i,"observed_sha256"],"0"*64)
 for i in range(3):add(["entry_observations",i,"identity_match"],False)
 for i in range(3):add(["entry_observations",i,"unicode_codepoints"],ENTRY_LENGTHS[i]+1)
 for i in range(3):add(["entry_observations",i,"source_url"],"bad")
 for i in range(12):add(["span_observations",i,"observed_sha256"],"0"*64)
 for i in range(12):add(["span_observations",i,"bounds_valid"],False)
 add(["live_language_inventory","english_row_count"],1)
 add(["live_language_inventory","english_entry_ids"],[1])
 add(["live_language_inventory","languages",0,"row_count"],2)
 add(["live_language_inventory","languages",0,"language"],"en")
 add(["revalidation_result","entry_hash_matches"],2)
 add(["revalidation_result","span_hash_matches"],11)
 add(["revalidation_result","source_component"],"mismatch")
 add(["revalidation_result","schema_vocabulary_component"],"verified")
 add(["revalidation_result","h01_status"],"resolved")
 add(["revalidation_result","h01_resolved"],True)
 add(["lifecycle_invariants","active_scholar_holds_after"],47)
 add(["lifecycle_invariants","database_rows_changed"],1)
 add(["lifecycle_invariants","publication_ready"],True)
 add(["lifecycle_invariants","advance_to_surah_107"],True)
 add(["selected_next_boundary","kind"],"advance_to_surah_107")
 add(["validation","unsafe_mutations_rejected"],63)
 assert len(c)==64,len(c)
 return c

def main():
 d=json.loads(PATH.read_text(encoding="utf-8"));validate(d)
 rejected=0
 for x in mutations(d):
  try:validate(x)
  except (AssertionError,KeyError):rejected+=1
 assert rejected==64
 print("PASS: Tabari H01 live source revalidation; 3/3 rows and 12/12 spans match, no English row, H01 active, 64/64 unsafe mutations rejected.")
if __name__=="__main__":main()

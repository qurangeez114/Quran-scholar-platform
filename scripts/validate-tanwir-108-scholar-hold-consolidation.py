#!/usr/bin/env python3
"""Validate the bounded Tanwir 108 scholar hold consolidation."""
import copy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PATH=ROOT/"data/tafsir/staging/tanwir-108-scholar-hold-consolidation-2026-11-11.json"
BASE={"tabari":18,"ibn_kathir":15,"qurtubi":23,"jalalayn":5,"saadi":6,"tanwir_disputed_attribution":7}
IDS=["108-W01","108-W02","108-W03","108-W04","108-W05","108-W06","108-W07"]
ENTRIES=[29980,29980,29981,29981,29981,29982,29982]
HASHES=["212a378f1bdffbbd016c42205a39c8ec1e572b8ab976c321b34f39806c60335e"]*2+["9c2e89421a4567bbe4b0c40b018a2826a8712988fcaf82e74926f656854ebd47"]*3+["6122617e7838708a2b33368485668b9f3ec7e6aca695fb552c62196978f59e42"]*2
ANCHORS=["الخير الكثير والقرآن منه","ويقال الكوثر نهر فى الجنة أعطاه الله محمدا","استقبل بنحرك إلى القبلة ويقال ضع يمينك على شمالك في الصلاة","استوف الركوع والسجود حتى يبدو نحرك","صل لربك صلاة يوم النحر وانحر البدن","مبغضك ... أبتر عن أهله وولده وماله وعن كل خير لا يذكر بعد موته بخير","وهو العاص بن وائل السهمي ... مات ابنه عبد الله"]
SPEAKER="Ibn ʿAbbās (attribution through Tanwīr al-Miqbās disputed)"
VOICE="Ibn ʿAbbās (attribution disputed)"
AUTH="Tanwīr al-Miqbās (traditionally attributed to Ibn ʿAbbās; disputed)"
HCLS=["source_identity_and_live_revalidation","disputed_attribution_representation","external_arabic_live_english_fidelity","encoding_defect_integrity","alternative_semantics_and_duplicate_clearance","authentication_and_independence","assembly_lifecycle_and_physical_persistence","database_lifecycle_and_protected_publication"]

def validate(d):
 assert d["schema_version"]=="quranhikma-tanwir-108-scholar-hold-consolidation-v1"
 assert d["surah"]==108 and d["scholar_key"]=="tanwir_disputed_attribution" and d["six_scholar_baseline"]==BASE
 i=d["inventory_boundary"]
 assert i["claim_count"]==i["incomplete_claims"]==7 and i["publication_ready_claims"]==0
 assert i["claim_ids"]==IDS and len(set(i["claim_ids"]))==7
 assert i["assembly_states"]=={"copied_payload_pending_chapter_validation":7}
 assert i["live_english_entry_ids"]==[29980,29981,29982] and i["live_arabic_entry_ids"]==[]
 assert i["external_arabic_url"]=="https://quranpedia.net/surah/1/108/book/363"
 assert i["transmission_routes_planned"]==0 and i["route_inventory_complete"] is True
 a=d["attribution_boundary"]
 assert a["label"]=="Traditionally attributed to Ibn Abbas; attribution disputed"
 assert a["required_proposition_speaker"]==SPEAKER and a["required_voice_name"]==VOICE and a["required_evidence_authority"]==AUTH
 assert a["all_claims_reported_only"] is True and "not an authenticated direct Ibn Abbas chain" in a["rule"]
 m=d["source_locator_manifest"]
 assert m["live_english_sha256_by_entry"]=={"29980":HASHES[0],"29981":HASHES[2],"29982":HASHES[5]}
 rows=m["claim_locators"]
 assert [x["claim_id"] for x in rows]==IDS and [x["english_entry_id"] for x in rows]==ENTRIES
 assert [x["english_sha256"] for x in rows]==HASHES and [x["evidence_anchor_ar"] for x in rows]==ANCHORS
 assert all(x["speaker_name"]==SPEAKER and x["voice_name"]==VOICE and x["evidence_authority"]==AUTH for x in rows)
 assert all(x["mufassir_own_position"]=="reported_only" and x["transmission_route_action"]=="none" for x in rows)
 f=d["arabic_english_fidelity"]
 assert f["aligned_claim_ids"]==IDS and f["live_english_entry_ids"]==[29980,29981,29982] and f["live_arabic_entry_ids"]==[]
 e=d["encoding_defect_boundary"]
 assert e["entry_id"]==29982 and e["status"]=="visible_replacement_character_defect_preserved"
 assert "Do not reproduce, guess or silently repair" in e["decision"]
 holds=d["scholar_active_holds"]
 assert [x["hold_class"] for x in holds]==HCLS and len({x["hold_id"] for x in holds})==8
 assert all(x["status"]=="active" and x["resolved"] is False and x["waived"] is False for x in holds)
 assert d["hold_summary"]=={"active":8,"resolved":0,"waived":0} and d["resolved_holds"]==[] and d["waived_holds"]==[]
 assert d["basis"]["source_alignment_workflow"]["conclusion"]=="success"
 assert d["repository_observation"]["guard_head"]=="42e88cd82f7854505f7e93f1553b64525a2d0bc5"
 assert d["validation"]["unsafe_mutations_rejected"]==50 and d["counts_unchanged"] is True and d["database_write_count"]==0
 for k in ("physical_ids_allocated","database_written","publication_ready","scholar_complete","chapter_complete"):assert d[k] is False

def mutations(d):
 c=[]
 def add(path,value):
  x=copy.deepcopy(d);q=x
  for k in path[:-1]:q=q[k]
  q[path[-1]]=value;c.append(x)
 add(["inventory_boundary","claim_count"],6)
 add(["inventory_boundary","incomplete_claims"],6)
 add(["inventory_boundary","publication_ready_claims"],1)
 add(["inventory_boundary","claim_ids"],IDS[:-1])
 add(["inventory_boundary","assembly_states"],{"copied_payload_pending_chapter_validation":6})
 add(["inventory_boundary","live_english_entry_ids"],[29980,29981])
 add(["inventory_boundary","live_arabic_entry_ids"],[1])
 add(["inventory_boundary","transmission_routes_planned"],1)
 add(["inventory_boundary","route_inventory_complete"],False)
 add(["inventory_boundary","external_arabic_url"],"")
 add(["attribution_boundary","label"],"Ibn Abbas")
 add(["attribution_boundary","required_proposition_speaker"],"Ibn Abbas")
 add(["attribution_boundary","required_voice_name"],"Ibn Abbas")
 add(["attribution_boundary","required_evidence_authority"],"Ibn Abbas")
 add(["attribution_boundary","all_claims_reported_only"],False)
 add(["attribution_boundary","rule"],"authenticated")
 for k in ("29980","29981","29982"):add(["source_locator_manifest","live_english_sha256_by_entry",k],"0"*64)
 for i in range(7):add(["source_locator_manifest","claim_locators",i,"english_sha256"],"0"*64)
 for i in range(7):add(["source_locator_manifest","claim_locators",i,"evidence_anchor_ar"],"")
 for i in range(7):add(["source_locator_manifest","claim_locators",i,"speaker_name"],"Ibn Abbas")
 add(["encoding_defect_boundary","status"],"repaired")
 add(["encoding_defect_boundary","decision"],"guess punctuation")
 add(["hold_summary","active"],7)
 add(["hold_summary","resolved"],1)
 add(["hold_summary","waived"],1)
 add(["scholar_active_holds"],d["scholar_active_holds"][:-1])
 x=copy.deepcopy(d);x["scholar_active_holds"][0]["status"]="resolved";c.append(x)
 add(["physical_ids_allocated"],True)
 add(["database_written"],True)
 add(["publication_ready"],True)
 assert len(c)==50,len(c)
 return c

def main():
 d=json.loads(PATH.read_text(encoding="utf-8"));validate(d)
 rejected=0
 for x in mutations(d):
  try:validate(x)
  except (AssertionError,KeyError):rejected+=1
 assert rejected==50
 print("PASS: Tanwir 108 holds consolidated; 7/7 incomplete, disputed attribution and entry 29982 defect preserved, zero routes, 50/50 unsafe mutations rejected.")
if __name__=="__main__":main()


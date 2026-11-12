#!/usr/bin/env python3
"""Build a lossless T11A/T11C plural consumer view in memory; never writes files or SQL."""
import argparse, copy, hashlib, json
from pathlib import Path
PAYLOAD_NAME="surah-108-payload-assembly-2026-10-16.json"
PROJECTION_NAME="surah-108-voice-projection-2026-10-17.json"
CONTRACT_NAME="tabari-108-t11-plural-consumer-contract-2026-11-12.json"
T09_NAME="tabari-108-t09-coordinated-integration-result-2026-11-12.json"
PINS={PAYLOAD_NAME:"3ea692a1c310d1206fafedb3efe16c6ce1ced946",PROJECTION_NAME:"ba5b61eb693222bc1ff3604daec52a6632cd7cfa",CONTRACT_NAME:"171fbe9749e7deb0ca521a6f720df910ffe0dd6a",T09_NAME:"0af8fa484379ac89a308467790a5c25b940d63d4"}
CANONICAL_PRE_T09="ce87f640f60c43651adcc45e4bfca192b6cbd253"
CLAIMS=("108-T11A","108-T11C")
def git_blob(raw):return hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()
def check(x,msg):
 if not x: raise ValueError(msg)
def getrow(d,cid):return next(x for x in d["rows"] if x["claim_id"]==cid)
def load(root):
 folder=Path(root)/"data/tafsir/staging";raw={n:(folder/n).read_bytes() for n in PINS}
 check({n:git_blob(b) for n,b in raw.items()}==PINS,"pinned input drift")
 return tuple(json.loads(raw[n]) for n in (PAYLOAD_NAME,PROJECTION_NAME,CONTRACT_NAME,T09_NAME))
def build(payload,projection,contract,t09):
 before=copy.deepcopy((payload,projection,contract,t09))
 check(contract["status"]=="plural_consumer_contract_built_not_applied_h01_active","contract state")
 check(contract["basis"]["payload"]["blob"]==PINS[PAYLOAD_NAME],"contract payload pin")
 check(t09["integration"]["payload_blob"]==PINS[PAYLOAD_NAME],"T09 payload pin")
 check(t09["lifecycle_invariants"]["active_scholar_holds_after"]==48 and t09["database_written"] is False,"T09 lifecycle")
 check(projection["inputs"]["assembly_blob_sha"]==CANONICAL_PRE_T09,"unexpected projection baseline")
 check(all(x["database_written"] is False and x["publication_ready"] is False and x["chapter_complete"] is False for x in (payload,projection)),"publication hold")
 out={
  "status":"PASS",
  "mode":"non_applying_plural_consumer_view",
  "input_blobs":copy.deepcopy(PINS),
  "assembly_alignment":{"projection_input_blob":projection["inputs"]["assembly_blob_sha"],"current_payload_blob":PINS[PAYLOAD_NAME],"aligned":False,"reason":"projection metadata predates the exact T09-only payload transition; full projection baseline refresh remains required"},
  "claims":{},
  "files_changed":False,"database_written":False,"publication_ready":False,"chapter_complete":False
 }
 for cid in CLAIMS:
  prow=getrow(payload,cid);vrow=getrow(projection,cid);pc=prow["proposed_payload"]
  expected=contract["consumer_contract"]["cardinalities"][cid]
  check(prow["assembly_state"]==vrow["state"]=="isolated_multirow_preview_not_integrated","preview state")
  check(prow["publication_ready"] is vrow["publication_ready"] is False,"claim publication hold")
  check(vrow["target_table"]=="proposition_voice_chain","voice target")
  check(len(vrow["database_rows"])==len(vrow["staging_row_metadata"])==expected["voices"],"projection voice cardinality")
  voices=[]
  for db,meta in zip(vrow["database_rows"],vrow["staging_row_metadata"]):
   check(set(db)=={"originating_voice_name","originating_voice_type","quoted_collection","reporting_work_id"},"database voice fields")
   check(set(meta)=={"staging_key","proposition_ref"},"voice staging metadata")
   voices.append(dict(db,**meta))
  check(voices==pc["voices"],"lossy or reordered voice projection")
  check([len(pc[k]) for k in ("voices","evidence_units","links","routes")]==[expected[k] for k in ("voices","evidence_units","links","routes")],"plural cardinalities")
  pkey=pc["proposition"]["staging_key"];ekeys=[x["staging_key"] for x in pc["evidence_units"]]
  check(all(x["proposition_ref"]==pkey for x in voices),"voice proposition ref")
  check(all(x["proposition_ref"]==pkey and x["evidence_unit_ref"] in ekeys for x in pc["links"]),"link refs")
  check(all(x["evidence_unit_ref"] in ekeys for x in pc["routes"]),"route refs")
  check(all(x["source_locator"]["entry_id"]==5263 for x in pc["evidence_units"]),"source entry")
  expected_locs=[(x["start"],x["end"],x["sha256"]) for x in contract["claims"][cid]["evidence_locators"]]
  actual_locs=[(x["source_locator"]["start_codepoint"],x["source_locator"]["end_codepoint"],x["source_locator"]["sha256"]) for x in pc["evidence_units"]]
  check(actual_locs==expected_locs,"evidence locator drift")
  check(pc["proposition"]["mufassir_own_position"]=="reported_only","reported-only boundary")
  view={
   "payload_schema":prow["payload_schema"],"statement_en":prow["statement_en"],"proposition":copy.deepcopy(pc["proposition"]),
   "voices":copy.deepcopy(voices),"evidence_units":copy.deepcopy(pc["evidence_units"]),"links":copy.deepcopy(pc["links"]),"routes":copy.deepcopy(pc["routes"]),
   "semantic_publication_hold":prow["semantic_publication_hold"],"blockers":copy.deepcopy(vrow["blockers"])
  }
  packed=json.dumps(view,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()
  out["claims"][cid]={
   "payload_schema":view["payload_schema"],"statement_en":view["statement_en"],
   "cardinalities":{"propositions":1,"voices":len(voices),"evidence_units":len(pc["evidence_units"]),"links":len(pc["links"]),"routes":len(pc["routes"])},
   "voice_keys":[x["staging_key"] for x in voices],"voice_names":[x["originating_voice_name"] for x in voices],
   "evidence_keys":ekeys,"evidence_locators":[copy.deepcopy(x["source_locator"]) for x in pc["evidence_units"]],
   "link_evidence_refs":[x["evidence_unit_ref"] for x in pc["links"]],"route_keys":[x["staging_key"] for x in pc["routes"]],
   "route_evidence_refs":[x["evidence_unit_ref"] for x in pc["routes"]],"consumer_view_sha256":hashlib.sha256(packed).hexdigest(),
   "semantic_publication_hold":view["semantic_publication_hold"],"blockers":view["blockers"],"publication_ready":False
  }
 check(out["claims"]["108-T11A"]["route_evidence_refs"].count("108-T11A-E4")==2,"Mujahid branch collapse")
 check(getrow(payload,"108-T11C")["evidence_boundary_reconciliation"]["legacy_hash_preserved_in_research"] is True,"legacy hash distinction")
 check((payload,projection,contract,t09)==before,"input mutation")
 return out
def self_test(payload,projection,contract,t09):
 expected=build(payload,projection,contract,t09);cases=[]
 def add(which,mut):
  x=copy.deepcopy([payload,projection,contract,t09]);mut(x[which]);cases.append(x)
 add(1,lambda x:x["inputs"].update(assembly_blob_sha="bad"))
 add(1,lambda x:getrow(x,"108-T11A")["database_rows"].pop())
 add(1,lambda x:getrow(x,"108-T11A")["staging_row_metadata"].reverse())
 add(1,lambda x:getrow(x,"108-T11C")["database_rows"][0].update(originating_voice_name="Ka'b ibn al-Ashraf"))
 add(0,lambda x:getrow(x,"108-T11A")["proposed_payload"]["evidence_units"].pop())
 add(0,lambda x:getrow(x,"108-T11A")["proposed_payload"]["routes"].pop())
 add(0,lambda x:getrow(x,"108-T11C")["proposed_payload"]["links"][0].update(evidence_unit_ref="missing"))
 add(0,lambda x:getrow(x,"108-T11C")["proposed_payload"]["evidence_units"][1]["source_locator"].update(sha256="0"*64))
 add(0,lambda x:getrow(x,"108-T11C").update(publication_ready=True))
 add(2,lambda x:x["consumer_contract"]["cardinalities"]["108-T11A"].update(routes=6))
 add(3,lambda x:x["integration"].update(payload_blob=CANONICAL_PRE_T09))
 add(3,lambda x:x.update(database_written=True))
 rejected=0
 for idx,case in enumerate(cases):
  try:build(*case)
  except (ValueError,KeyError):rejected+=1
  else:raise ValueError(f"unsafe adapter case accepted: {idx}")
 check(rejected==12,"mutation rejection count")
 return expected,rejected
def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument("--root",default=".");args=ap.parse_args()
 values=load(args.root);out,rejected=self_test(*values);out["unsafe_cases_rejected"]=rejected
 print(json.dumps(out,ensure_ascii=False,sort_keys=True))
if __name__=="__main__":main()

#!/usr/bin/env python3
"""Validate I06-R02 route-hold consolidation without claiming completion."""
from __future__ import annotations
import copy, hashlib, json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]; STAGE=ROOT/"data/tafsir/staging"
ARTIFACT=STAGE/"ibn-kathir-108-i06-r02-hold-consolidation-2026-11-06.json"
SOURCES={
 "consumer":(STAGE/"ibn-kathir-108-i06-r02-offline-consumer-contract-2026-11-06.json","abaa1747fc0aabe01cde028cefbd171851a63aaa"),
 "validation":(STAGE/"ibn-kathir-108-i06-r02-evidence-link-validation-2026-11-06.json","4bdc1d8f53aa70a14ee273695900ce1a3e26b393"),
 "draft":(STAGE/"ibn-kathir-108-i06-r02-held-proposition-draft-2026-10-30.json","469ff5d9b0812814cece0fdd43cbd6038c40e0ee"),
 "clauses":(STAGE/"ibn-kathir-108-i06-r02-clause-map-2026-10-30.json","5832e147d541183557eacd320e16aae6b52b3567"),
}
BASELINE={"tabari":18,"ibn_kathir":15,"qurtubi":23,"jalalayn":5,"saadi":6,"tanwir_disputed_attribution":7}
HOLD_TEXTS=[
 "Four faithful voice-category mappings remain unresolved and required before publication.",
 "Physical proposition, evidence and link representation remains unresolved.",
 "Live duplicate, reuse and consumer compatibility remain unresolved.",
 "The bounded printed passage has no upper chain and authentication is not assessed.",
 "External-edition verification and source independence remain unresolved.",
 "R02 is not integrated into an authorized physical chapter assembly; historical counts remain unchanged.",
]

def require(ok,msg):
 if not ok: raise AssertionError(msg)
def blob_sha(raw): return hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()
def load_pinned(path,sha):
 raw=path.read_bytes(); require(blob_sha(raw)==sha,f"pinned blob changed: {path.name}"); return json.loads(raw)

def validate(d,src):
 require(d["schema_version"]=="quranhikma-i06-r02-hold-consolidation-v1","schema")
 require((d["surah"],d["scholar_key"],d["claim_id"],d["route_id"])==(108,"ibn_kathir","108-I06","108-I06-R02"),"scope")
 require(d["status"]=="offline_route_hold_consolidated_parent_claim_incomplete","status")
 require(d["six_scholar_baseline"]==BASELINE,"baseline")
 basis={"consumer":"consumer_contract","validation":"evidence_link_validation","draft":"held_proposition_draft","clauses":"clause_map"}
 for k,(_,sha) in SOURCES.items(): require(d["basis"][basis[k]]["blob"]==sha,f"basis {k}")
 require(d["frozen_graph"]=={"propositions":4,"semantic_links":4,"assertion_evidence_locators":4,"shared_context_locators":2,"voices":0,"unresolved_voice_mappings":4,"evidence_rows":0,"route_rows":0,"physical_ids":0},"graph")
 clauses=src["clauses"]["clauses"]; locs=d["exact_source_locators"]
 require([x["key"] for x in locs]==[x["key"] for x in clauses],"locator keys")
 require([x["role"] for x in locs]==["shared_context_only","shared_context_only"]+["assertion_evidence"]*4,"locator roles")
 for out,source in zip(locs,clauses):
  for k in ("captured_entry_id","canonical_entry_id","start","end","sha256"): require(out[k]==source[k],f"locator {out['key']} {k}")
 require(src["validation"]["validation"]["result"]=="PASS","link validation basis")
 require(src["consumer"]["validation"]["result"]=="PASS","consumer basis")
 require(src["draft"]["candidate"]["voices"]==[] and len(src["draft"]["unresolved_voice_mappings"])==4,"voice holds")
 require(d["arabic_english_fidelity"]=={"arabic_controls_voice":True,"english_reporting_names_omitted":["Ibn Ishaq","Yazid ibn Ruman"],"merged_english_transfers_r02_to_r01_names":False,"hostile_speech_is_compiler_endorsement":False,"revelation_statement_is_independent_proof":False},"fidelity")
 holds=d["active_holds"]
 require([x["id"] for x in holds]==[f"108-I06-R02-H{i:02d}" for i in range(1,7)],"hold ids")
 require([x["statement"] for x in holds]==HOLD_TEXTS,"hold text")
 require(all(x["status"]=="active" and x["resolved"] is False and x["waived"] is False for x in holds),"hold state")
 require(d["resolved_holds"]==[] and d["waived_holds"]==[] and d["hold_summary"]=={"active":6,"resolved":0,"waived":0},"hold summary")
 require(src["consumer"]["retained_holds"]==HOLD_TEXTS,"hold provenance")
 require(d["compatibility_boundary"]=={"physical_consumer_compatibility":"not_assessed","historical_importer_compatibility":"not_asserted_for_r02_in_this_step","physical_reuse":"unresolved","metadata_persistence_readback":"unauthorized_and_unverified"},"compatibility boundary")
 require(d["consolidation_effect"]=={"route_hold_consolidated":True,"parent_claim_complete":False,"parent_claim_level_hold_consolidated":False,"active_split_claim_count_changed":False,"publication_ready_claim_count_changed":False,"database_rows_changed":0},"effect")
 require(d["validation"]=={"result":"PASS","validator":"scripts/validate-ibn-kathir-i06-r02-hold-consolidation.py","unsafe_mutations_rejected":14},"validation declaration")
 for k in ("database_written","publication_ready","route_complete","claim_complete","scholar_complete","chapter_complete"): require(d[k] is False,k)
 require(d["counts_unchanged"] is True and d["physical_ids_allocated"]==d["database_write_count"]==0,"write boundary")
 require("Refresh the 15-claim Ibn Kathir closure audit" in d["next_step"],"next step")

def rejected(mutator,base,src):
 bad=copy.deepcopy(base); mutator(bad)
 try: validate(bad,src)
 except (AssertionError,KeyError,TypeError,IndexError): return True
 return False

def main():
 src={k:load_pinned(*v) for k,v in SOURCES.items()}; data=json.loads(ARTIFACT.read_text()); validate(data,src)
 mutations=[
  lambda d:d.update(schema_version="bad"),
  lambda d:d["six_scholar_baseline"].update(ibn_kathir=14),
  lambda d:d["frozen_graph"].update(voices=4),
  lambda d:d["frozen_graph"].update(route_rows=1),
  lambda d:d["exact_source_locators"][0].update(role="assertion_evidence"),
  lambda d:d["exact_source_locators"][2].update(start=0),
  lambda d:d["arabic_english_fidelity"].update(english_reporting_names_omitted=[]),
  lambda d:d["active_holds"].pop(),
  lambda d:d["active_holds"][0].update(resolved=True),
  lambda d:d["resolved_holds"].append("108-I06-R02-H01"),
  lambda d:d["compatibility_boundary"].update(physical_consumer_compatibility="compatible"),
  lambda d:d["consolidation_effect"].update(parent_claim_complete=True),
  lambda d:d.update(database_written=True),
  lambda d:d.update(publication_ready=True,route_complete=True,claim_complete=True,scholar_complete=True,chapter_complete=True),
 ]
 require(all(rejected(m,data,src) for m in mutations),"unsafe mutation accepted")
 print("PASS I06-R02 route-hold consolidation: 6 active, 0 resolved, 0 waived; 14 unsafe mutations rejected")

if __name__=="__main__": main()

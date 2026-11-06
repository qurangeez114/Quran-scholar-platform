#!/usr/bin/env python3
"""Validate the 15-claim Ibn Kathir closure audit after I06-R02."""
from __future__ import annotations
import copy, hashlib, json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]; STAGE=ROOT/"data/tafsir/staging"
ARTIFACT=STAGE/"ibn-kathir-108-closure-audit-after-i06-r02-2026-11-06.json"
SOURCES={
 "prior":(STAGE/"ibn-kathir-108-closure-audit-after-i06-r01-2026-11-06.json","8c1ec688fc871db6673ffe7f07ea276826bf2489"),
 "r01":(STAGE/"ibn-kathir-108-i06-r01-hold-consolidation-2026-11-06.json","5aa4f67875e36ed4ae40d24798ca422d85d25f54"),
 "r02":(STAGE/"ibn-kathir-108-i06-r02-hold-consolidation-2026-11-06.json","bcbccc3b8dc76cf0a77750cf1dc93b41d77f2503"),
 "consumer":(STAGE/"ibn-kathir-108-i06-r02-offline-consumer-contract-2026-11-06.json","abaa1747fc0aabe01cde028cefbd171851a63aaa"),
 "links":(STAGE/"ibn-kathir-108-i06-r02-evidence-link-validation-2026-11-06.json","4bdc1d8f53aa70a14ee273695900ce1a3e26b393"),
 "mapping":(STAGE/"ibn-kathir-108-i06-r02-physical-mapping-review-2026-10-30.json","7d2517e9d85e0bb46ef3d499d374eb072e41e602"),
}
IDS=["108-I01-A","108-I01-B","108-I02","108-I03","108-I04A","108-I04B","108-I04C","108-I04D","108-I05","108-I06","108-I07","108-I08","108-I09","108-I10","108-I11"]
CONSOLIDATED=["108-I01-A","108-I01-B","108-I03","108-I04A","108-I04B","108-I04C","108-I04D","108-I07","108-I08","108-I09","108-I10","108-I11"]
ROUTE_HOLDS=["108-I02-R05","108-I06-R01","108-I06-R02"]
BASELINE={"tabari":18,"ibn_kathir":15,"qurtubi":23,"jalalayn":5,"saadi":6,"tanwir_disputed_attribution":7}
ASSERTION_HASHES=["ce548e513db492a19663b73f87b59d1b9e39d7fc8b9f9893fbd1a86b1afdd60e","40d5f51371d46bc98adafad79c5fc7726f55bfac88ea3203272b62204f4cd917","8c889c2299e26e16d19975c7436f84e5e70fc4eb5071b2ec9aa270d9833cab02","9b46afa07c8aea6de6363129e674c09e23eb277ef6461fd954b8b3fca158ada6"]
CONTEXT_HASHES=["6ac4acb6268fa7deff959646611f0f347fdd74cb57ba8acf6f43a60f8f0e6258","2c231ea2b17e65f08deda3f290d689c0548257d72495e30382dbcc75be1821ec"]

def require(ok,msg):
 if not ok: raise AssertionError(msg)
def blob_sha(raw): return hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()
def load_pinned(path,sha):
 raw=path.read_bytes(); require(blob_sha(raw)==sha,f"pinned blob changed: {path.name}"); return json.loads(raw)

def validate(d,src):
 require(d["schema_version"]=="quranhikma-ibn-kathir-108-closure-audit-after-i06-r02-v1","schema")
 require((d["surah"],d["scholar_key"])==(108,"ibn_kathir"),"scope")
 require(d["six_scholar_baseline"]==BASELINE,"baseline")
 pins={"prior":"prior_audit","r01":"i06_r01_hold_consolidation","r02":"i06_r02_hold_consolidation","consumer":"i06_r02_consumer_contract","links":"i06_r02_evidence_link_validation","mapping":"i06_r02_physical_mapping_review"}
 for k,(_,sha) in SOURCES.items(): require(d["basis"][pins[k]]["blob"]==sha,f"basis {k}")
 rows=d["claim_rows"]; require(len(rows)==15 and [x["claim_id"] for x in rows]==IDS and len({x["claim_id"] for x in rows})==15,"inventory")
 prior_rows=src["prior"]["claim_rows"]
 for row,prior in zip(rows,prior_rows):
  if row["claim_id"]=="108-I06":
   expected=copy.deepcopy(prior); expected["closure_class"]="route_holds_consolidated_for_r01_r02_claim_incomplete"; require(row==expected,"I06 row")
  else: require(row==prior,f"unexpected row change {row['claim_id']}")
 by={x["claim_id"]:x for x in rows}
 require(all(by[x]["closure_class"]=="offline_hold_consolidated" for x in CONSOLIDATED),"claim holds")
 require(by["108-I02"]["closure_class"]=="route_hold_consolidated_for_r05_claim_incomplete","I02")
 c=d["coverage_summary"]
 require(c["active_split_claims"]==15 and c["publication_ready_claims"]==0,"counts")
 require(c["claim_level_offline_hold_consolidated"]==CONSOLIDATED and c["claim_level_offline_hold_consolidated_count"]==12,"claim-level holds")
 require(c["route_level_offline_hold_consolidated"]==ROUTE_HOLDS and c["route_level_offline_hold_consolidated_count"]==3,"route holds")
 require(c["reviewed_routes"]==18 and c["publication_ready_routes"]==0,"route coverage")
 require(c["i02_claim_complete"] is False and c["i06_claim_complete"] is False,"parent boundaries")
 require((c["next_repair_claim"],c["next_repair_route"])==("108-I06","108-I06-R02"),"next repair")
 r=d["i06_r02_refresh_finding"]
 require(r["graph"]=={"propositions":4,"semantic_links":4,"assertion_evidence_locators":4,"shared_context_locators":2,"voices":0,"unresolved_voice_mappings":4,"evidence_rows":0,"route_rows":0,"physical_ids":0},"R02 graph")
 require((r["active_holds"],r["resolved_holds"],r["waived_holds"])==(6,0,0),"R02 holds")
 require(r["assertion_clause_hashes"]==ASSERTION_HASHES and r["shared_context_hashes"]==CONTEXT_HASHES,"R02 locators")
 require(r["assertion_speakers"]==["al-As ibn Wa'il"]*3+["Yazid ibn Ruman"],"speakers")
 require(r["assertion_modes"]==["quoted","quoted","quoted","explicit"],"modes")
 require(r["english_reporting_names_omitted"]==["Ibn Ishaq","Yazid ibn Ruman"],"English omissions")
 require(r["upper_chain"]=="absent" and r["authentication"]=="not_assessed" and r["external_edition"]=="unresolved" and r["independence"]=="unknown","source limits")
 require(r["parent_claim_complete"] is False and r["parent_claim_level_hold_consolidated"] is False and r["database_writes"]==0,"parent boundary")
 require(src["r01"]["hold_summary"]=={"active":6,"resolved":0,"waived":0},"R01 provenance")
 require(src["r02"]["hold_summary"]=={"active":6,"resolved":0,"waived":0},"R02 provenance")
 require(src["consumer"]["validation"]["result"]=="PASS" and src["links"]["validation"]["result"]=="PASS","validation provenance")
 n=d["selected_next_repair"]
 require((n["claim_id"],n["route_id"],n["kind"])==("108-I06","108-I06-R02","physical_mapping_review_reconciliation"),"selected repair")
 require(n["candidate_keys"]==[x["candidate_key"] for x in src["mapping"]["assertion_mapping"]],"mapping keys")
 require(n["review_null_fields"]=={"claim_type_id":4,"assertion_mode":4,"voice_category":4},"null review fields")
 require(all(x["claim_type_id"] is None and x["assertion_mode"] is None and x["voice_category"] is None for x in src["mapping"]["assertion_mapping"]),"mapping review nulls")
 require(n["held_draft_claim_type_ids"]==[14,14,14,16] and n["held_draft_assertion_modes"]==["quoted","quoted","quoted","explicit"],"held mapping")
 require(n["held_draft_speaker_types"]==["unspecified","unspecified","unspecified","sub_narrator"] and n["unresolved_voice_categories"]==4,"voice mapping")
 require(len(n["required_checks"])==5 and n["physical_ids_allocated"]==0 and n["database_written"] is False and n["publication_ready"] is False,"repair safety")
 require(d["route_summary"]["expected_routes"]==18 and d["route_summary"]["publication_ready_routes"]==0,"route summary")
 require(all(x["publication_ready"] is False for x in rows),"row readiness")
 require(d["validation"]=={"result":"PASS","local_validator":"scripts/validate-ibn-kathir-108-closure-audit-after-i06-r02.py","unsafe_mutations_rejected":16},"validation declaration")
 for k in ("database_written","publication_ready","scholar_complete","chapter_complete"): require(d[k] is False,k)
 require(d["database_write_count"]==0 and d["counts_unchanged"] is True,"write/count boundary")

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
  lambda d:d["claim_rows"].pop(),
  lambda d:d["claim_rows"][9].update(closure_class="offline_hold_consolidated"),
  lambda d:d["coverage_summary"].update(claim_level_offline_hold_consolidated_count=13),
  lambda d:d["coverage_summary"]["route_level_offline_hold_consolidated"].pop(),
  lambda d:d["coverage_summary"].update(i06_claim_complete=True),
  lambda d:d["i06_r02_refresh_finding"].update(active_holds=0),
  lambda d:d["i06_r02_refresh_finding"]["assertion_clause_hashes"].reverse(),
  lambda d:d["i06_r02_refresh_finding"]["graph"].update(voices=4),
  lambda d:d["selected_next_repair"].update(kind="insert_payload"),
  lambda d:d["selected_next_repair"]["review_null_fields"].update(voice_category=0),
  lambda d:d["selected_next_repair"].update(unresolved_voice_categories=0),
  lambda d:d["selected_next_repair"].update(physical_ids_allocated=4),
  lambda d:d.update(database_written=True),
  lambda d:d.update(publication_ready=True,scholar_complete=True,chapter_complete=True),
 ]
 require(all(rejected(m,data,src) for m in mutations),"unsafe mutation accepted")
 print("PASS post-I06-R02 closure audit: 12 claim holds, 3 route holds, 0/15 ready; 16 unsafe mutations rejected")

if __name__=="__main__": main()

#!/usr/bin/env python3
"""Validate the exact non-applying plural-consumer contract for Tabari 108-T11A/T11C."""
import copy, hashlib, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/"data/tafsir/staging/tabari-108-t11-plural-consumer-contract-2026-11-12.json"
PAYLOAD=ROOT/"data/tafsir/staging/surah-108-payload-assembly-2026-10-16.json"
AUDIT=ROOT/"data/tafsir/staging/tabari-108-h01-schema-consumer-identity-audit-2026-11-12.json"
A_SRC=ROOT/"data/tafsir/staging/tabari-108-t11a-source-boundary-review-2026-10-19.json"
C_SRC=ROOT/"data/tafsir/staging/tabari-108-t11c-source-boundary-review-2026-10-20.json"
PAYLOAD_BLOB="3ea692a1c310d1206fafedb3efe16c6ce1ced946"
SOURCE="dd11e99471301b8b2044d0dddb518a375a69b4c4e8d654ac966ecc1ee46da988"
A_STMT="Multiple reports identify al-As ibn Wa'il as the hostile referent."
C_STMT="Two reports connect the verse with Quraysh speakers who disparaged Muhammad during the Ka'b ibn al-Ashraf episode; they do not simply identify Ka'b himself as the hostile referent."
A_LOCS=[(398,544,"3669edac610421c993ee045a1c3efcc905455d92863d2d5bf32def54ea49825e"),(544,701,"7123a05b538b184a3c2e5326dec6ef6c14e54a229a12eec5ecc12c3dc2eab1e2"),(701,860,"b6ceb2786188888ffd8499d6337953658d7431897c94dedab89b80715a5d0610"),(860,1106,"96d510029202a124bcd0bc5aec8d2dc8b3ced75d1996af01cee90895d3f362b1"),(1106,1351,"473867d6624124ad310f870bee7af0ffc675192c96711fa80d770a97f8887b18"),(1351,1485,"d03a2cc0f98040dc8aaf7f445f33c38e7314c71c3834adedde4cfddd0726c2b9")]
C_LOCS=[(2039,2567,"a3124d113132b3e48d781d2f5ee7df0aa29b55d497a705fe9cabe2384d3af818"),(2809,3235,"e2e3057e54e8d5b6578c72388178e03b00c0f5f1b68236ade34e909f5f36572e")]

def blob(path):
 b=path.read_bytes();return hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()
def row(payload,cid): return next(x for x in payload["rows"] if x["claim_id"]==cid)
def locs(r): return [(x["source_locator"]["start_codepoint"],x["source_locator"]["end_codepoint"],x["source_locator"]["sha256"]) for x in r["proposed_payload"]["evidence_units"]]
def validate_refs(r):
 p=r["proposed_payload"]; pk=p["proposition"]["staging_key"]
 ekeys=[x["staging_key"] for x in p["evidence_units"]]
 allkeys=[pk]+[x["staging_key"] for x in p["voices"]]+ekeys+[x["staging_key"] for x in p["routes"]]
 assert len(allkeys)==len(set(allkeys))
 assert all(x["proposition_ref"]==pk for x in p["voices"])
 assert all(x["proposition_ref"]==pk and x["evidence_unit_ref"] in ekeys for x in p["links"])
 assert all(x["evidence_unit_ref"] in ekeys for x in p["routes"])
 assert not any(k.endswith("_id") and isinstance(v,int) for section in (p["voices"],p["evidence_units"],p["links"],p["routes"]) for x in section for k,v in x.items() if k not in ("reporting_work_id","entry_id"))

def validate(d,p,a,asrc,csrc):
 assert d["schema_version"]=="quranhikma-tabari-108-t11-plural-consumer-contract-v1"
 assert (d["surah"],d["scholar_key"],d["hold_id"])==(108,"tabari","108-TABARI-SCHOLAR-H01")
 assert d["status"]=="plural_consumer_contract_built_not_applied_h01_active"
 b=d["basis"]
 assert b["repository_head"]=="a463da063eef2ddc300a2ff562dd719c9727fe77"
 assert b["payload"]["blob"]==PAYLOAD_BLOB and blob(PAYLOAD)==PAYLOAD_BLOB
 assert b["schema_consumer_audit"]["blob"]==blob(AUDIT)=="4f38c83eaa1c8ebeac557458cdc36eafcc8ea41d"
 assert b["t11a_source_review"]["blob"]==blob(A_SRC)=="3a0fbba672a61179b2611fee974ab5b8e12d6241"
 assert b["t11c_source_review"]["blob"]==blob(C_SRC)=="f5a2365ebf0a1ebb44a50702d42eb5240c514921"
 t9=b["t09_integration_result"]
 assert t9["commit"]=="ab0b2cd7a87cced4b87a0037133d16bd8e426864" and t9["checkpoint_commit"]=="a463da063eef2ddc300a2ff562dd719c9727fe77"
 assert (t9["result_guard_run_id"],t9["checkpoint_guard_run_id"])==(43215066560,43215144660)
 assert t9["result_guard_conclusion"]==t9["checkpoint_guard_conclusion"]=="success"
 c=d["consumer_contract"]
 assert c["scope_claim_ids"]==["108-T11A","108-T11C"] and c["preserve_existing_singular_four_section_rows"]==16
 assert c["plural_schema_discriminator"]=="payload_schema"
 assert c["allowed_plural_schema_values"]=={"108-T11A":"t11a_plural_sections_preview_v1","108-T11C":"t11c_plural_sections_preview_v1"}
 assert c["required_sections"]==["proposition","voices","evidence_units","links","routes"]
 assert c["cardinalities"]=={"108-T11A":{"propositions":1,"voices":4,"evidence_units":6,"links":6,"routes":7},"108-T11C":{"propositions":1,"voices":2,"evidence_units":2,"links":2,"routes":2}}
 assert len(c["reference_rules"])==6 and len(c["losslessness_rules"])==6
 ib=c["implementation_boundary"]
 assert ib=={"mode":"repository_staging_only_non_applying_adapter","target":"plural-aware projection and lifecycle validation","payload_change_allowed":False,"workflow_yaml_change_required":False,"physical_id_allocation_allowed":False,"database_write_allowed":False,"hold_clearance_allowed":False,"guard_bypass_allowed":False}
 ra,rc=row(p,"108-T11A"),row(p,"108-T11C")
 for r,schema,counts in [(ra,"t11a_plural_sections_preview_v1",(4,6,6,7)),(rc,"t11c_plural_sections_preview_v1",(2,2,2,2))]:
  assert r["assembly_state"]=="isolated_multirow_preview_not_integrated" and r["publication_ready"] is False
  assert r["payload_schema"]==schema
  assert tuple(len(r["proposed_payload"][k]) for k in ("voices","evidence_units","links","routes"))==counts
  assert r["proposed_payload"]["proposition"]["tafsir_entry_id"]==5263 and r["proposed_payload"]["proposition"]["mufassir_own_position"]=="reported_only"
  validate_refs(r)
 da,dc=d["claims"]["108-T11A"],d["claims"]["108-T11C"]
 assert da["statement_en"]==ra["statement_en"]==A_STMT and dc["statement_en"]==rc["statement_en"]==C_STMT
 for x,r in [(da,ra),(dc,rc)]:
  assert x["tafsir_entry_id"]==5263 and x["source_sha256"]==SOURCE
  assert x["english_witness_state"]=="absent" and x["translation_status"]=="controlled_research_translation_from_arabic" and x["mufassir_own_position"]=="reported_only"
  assert x["voice_names"]==[v["originating_voice_name"] for v in r["proposed_payload"]["voices"]]
  assert x["voice_types"]==[v["originating_voice_type"] for v in r["proposed_payload"]["voices"]]
 assert [(x["start"],x["end"],x["sha256"]) for x in da["evidence_locators"]]==locs(ra)==A_LOCS
 assert [(x["start"],x["end"],x["sha256"]) for x in dc["evidence_locators"]]==locs(rc)==C_LOCS
 assert da["route_evidence_refs"]==[x["evidence_unit_ref"] for x in ra["proposed_payload"]["routes"]]==["108-T11A-E1","108-T11A-E2","108-T11A-E3","108-T11A-E4","108-T11A-E4","108-T11A-E5","108-T11A-E6"]
 assert dc["route_evidence_refs"]==[x["evidence_unit_ref"] for x in rc["proposed_payload"]["routes"]]==["108-T11C-E1","108-T11C-E2"]
 assert len(da["qualifications"])==4 and len(dc["qualifications"])==4
 assert dc["legacy_saved_hash"]=="6624f5de8cb9634f41597c83af2c1b766aca47b9ceda27e183a9b4c8b12005f1" and dc["legacy_hash_state"]=="historical_mixed_context_not_atomic_evidence_retained_in_research"
 assert dc["excluded_span"]=={"start":2567,"end":2809,"reason":"Intervening Ikrima report lacks the explicit Ka'b episode."}
 assert asrc["source"]["sha256"]==csrc["source"]["sha256"]==SOURCE
 assert [(x["start_codepoint"],x["end_codepoint"],x["sha256"]) for x in asrc["units"]]==A_LOCS
 assert [(x["start_codepoint"],x["end_codepoint"],x["sha256"]) for x in csrc["units"]]==C_LOCS
 assert a["findings"]["plural_consumer_claim_ids"]==["108-T11A","108-T11C"] and a["findings"]["rows_requiring_plural_consumer_support"]==2
 assert len(d["explicit_disagreements_and_absences"])==4
 inv=d["lifecycle_invariants"]
 assert inv=={"historical_claims":74,"tabari_claims":18,"publication_ready_tabari_claims":0,"active_scholar_holds_before":48,"active_scholar_holds_after":48,"resolved_scholar_holds":0,"waived_scholar_holds":0,"physical_ids_allocated":0,"database_rows_changed":0,"database_written":False,"publication_ready":False,"scholar_complete":False,"chapter_complete":False,"advance_to_surah_107":False}
 n=d["selected_next_boundary"]
 assert n=={"kind":"tabari_h01_t11_plural_consumer_adapter","claim_ids":["108-T11A","108-T11C"],"write_mode":"repository_staging_only_non_applying","hold_clearance_authorized":False,"database_write_authorized":False,"advance_to_surah_107":False}
 assert d["validation"]=={"result":"PASS","validator":"scripts/validate-tabari-108-t11-plural-consumer-contract.py","unsafe_mutations_rejected":64}
 assert d["database_written"] is False and d["database_write_count"]==0 and d["publication_ready"] is False and d["scholar_complete"] is False and d["chapter_complete"] is False

def mutations(d):
 paths=[
 (["schema_version"],"bad"),(["surah"],107),(["scholar_key"],"other"),(["hold_id"],"bad"),(["status"],"complete"),
 (["basis","repository_head"],"0"*40),(["basis","payload","blob"],"0"*40),(["basis","schema_consumer_audit","blob"],"0"*40),
 (["basis","t11a_source_review","blob"],"0"*40),(["basis","t11c_source_review","blob"],"0"*40),(["basis","t09_integration_result","commit"],"0"*40),
 (["basis","t09_integration_result","checkpoint_commit"],"0"*40),(["basis","t09_integration_result","result_guard_run_id"],0),
 (["basis","t09_integration_result","checkpoint_guard_run_id"],0),(["basis","t09_integration_result","result_guard_conclusion"],"cancelled"),
 (["basis","t09_integration_result","checkpoint_guard_conclusion"],"cancelled"),(["consumer_contract","scope_claim_ids"],[]),
 (["consumer_contract","preserve_existing_singular_four_section_rows"],15),(["consumer_contract","plural_schema_discriminator"],"none"),
 (["consumer_contract","allowed_plural_schema_values","108-T11A"],"wrong"),(["consumer_contract","allowed_plural_schema_values","108-T11C"],"wrong"),
 (["consumer_contract","required_sections"],[]),(["consumer_contract","cardinalities","108-T11A","voices"],1),
 (["consumer_contract","cardinalities","108-T11A","evidence_units"],1),(["consumer_contract","cardinalities","108-T11A","routes"],6),
 (["consumer_contract","cardinalities","108-T11C","voices"],1),(["consumer_contract","cardinalities","108-T11C","evidence_units"],1),
 (["consumer_contract","cardinalities","108-T11C","routes"],1),(["consumer_contract","reference_rules"],[]),(["consumer_contract","losslessness_rules"],[]),
 (["consumer_contract","implementation_boundary","mode"],"apply"),(["consumer_contract","implementation_boundary","payload_change_allowed"],True),
 (["consumer_contract","implementation_boundary","physical_id_allocation_allowed"],True),(["consumer_contract","implementation_boundary","database_write_allowed"],True),
 (["consumer_contract","implementation_boundary","hold_clearance_allowed"],True),(["consumer_contract","implementation_boundary","guard_bypass_allowed"],True),
 (["claims","108-T11A","statement_en"],"changed"),(["claims","108-T11A","tafsir_entry_id"],5262),(["claims","108-T11A","source_sha256"],"0"*64),
 (["claims","108-T11A","english_witness_state"],"present"),(["claims","108-T11A","voice_names"],[]),(["claims","108-T11A","voice_types"],[]),
 (["claims","108-T11A","evidence_locators"],[]),(["claims","108-T11A","route_evidence_refs"],[]),(["claims","108-T11A","qualifications"],[]),
 (["claims","108-T11C","statement_en"],"changed"),(["claims","108-T11C","tafsir_entry_id"],5262),(["claims","108-T11C","source_sha256"],"0"*64),
 (["claims","108-T11C","english_witness_state"],"present"),(["claims","108-T11C","voice_names"],[]),(["claims","108-T11C","voice_types"],[]),
 (["claims","108-T11C","evidence_locators"],[]),(["claims","108-T11C","route_evidence_refs"],[]),(["claims","108-T11C","legacy_saved_hash"],"0"*64),
 (["claims","108-T11C","legacy_hash_state"],"replaced"),(["claims","108-T11C","excluded_span"],{}),(["claims","108-T11C","qualifications"],[]),
 (["explicit_disagreements_and_absences"],[]),(["lifecycle_invariants","active_scholar_holds_after"],47),
 (["lifecycle_invariants","physical_ids_allocated"],1),(["lifecycle_invariants","database_written"],True),(["lifecycle_invariants","publication_ready"],True),
 (["selected_next_boundary","kind"],"publish"),(["selected_next_boundary","database_write_authorized"],True)]
 assert len(paths)==64
 out=[]
 for path,value in paths:
  x=copy.deepcopy(d);q=x
  for k in path[:-1]:q=q[k]
  q[path[-1]]=value;out.append(x)
 return out

def main():
 d=json.loads(ART.read_text());p=json.loads(PAYLOAD.read_text());a=json.loads(AUDIT.read_text());asrc=json.loads(A_SRC.read_text());csrc=json.loads(C_SRC.read_text())
 validate(d,p,a,asrc,csrc)
 rejected=0
 for x in mutations(d):
  try:validate(x,p,a,asrc,csrc)
  except (AssertionError,KeyError):rejected+=1
 assert rejected==64
 print("PASS: exact T11A/T11C plural-consumer contract; source/fidelity/cardinalities preserved; 64/64 unsafe mutations rejected; H01 active")
if __name__=="__main__": main()

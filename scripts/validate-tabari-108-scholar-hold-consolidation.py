import copy, json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/"data/tafsir/staging/tabari-108-scholar-hold-consolidation-2026-11-11.json"
if not ART.exists(): ART=Path(__file__).resolve().with_name("tabari-108-scholar-hold-consolidation-2026-11-11.json")
BASE={"tabari":18,"ibn_kathir":15,"qurtubi":23,"jalalayn":5,"saadi":6,"tanwir_disputed_attribution":7}
IDS=["108-T01","108-T02","108-T03","108-T04A","108-T04B","108-T04C","108-T04D","108-T05","108-T06","108-T07","108-T08A","108-T08B","108-T09","108-T10","108-T11A","108-T11B","108-T11C","108-T11D"]
HCLS=["source_schema_and_live_revalidation","voice_and_attribution_representation","route_topology_and_identity","arabic_english_completeness","authentication_and_independence","semantic_duplicate_and_shared_evidence_clearance","assembly_lifecycle_and_physical_persistence","database_lifecycle_and_protected_publication"]
T11A=[(398,544,"3669edac610421c993ee045a1c3efcc905455d92863d2d5bf32def54ea49825e"),(544,701,"7123a05b538b184a3c2e5326dec6ef6c14e54a229a12eec5ecc12c3dc2eab1e2"),(701,860,"b6ceb2786188888ffd8499d6337953658d7431897c94dedab89b80715a5d0610"),(860,1106,"96d510029202a124bcd0bc5aec8d2dc8b3ced75d1996af01cee90895d3f362b1"),(1106,1351,"473867d6624124ad310f870bee7af0ffc675192c96711fa80d770a97f8887b18"),(1351,1485,"d03a2cc0f98040dc8aaf7f445f33c38e7314c71c3834adedde4cfddd0726c2b9")]
def check(d):
 assert d["schema_version"]=="quranhikma-tabari-108-scholar-hold-consolidation-v1" and d["surah"]==108 and d["scholar_key"]=="tabari"
 assert d["six_scholar_baseline"]==BASE
 i=d["inventory_boundary"]; assert (i["claim_count"],i["incomplete_claims"],i["publication_ready_claims"])==(18,18,0) and i["claim_ids"]==IDS
 assert i["assembly_states"]=={"proposed_payload_pending_schema_and_live_validation":16,"isolated_multirow_preview_not_integrated":2}
 assert i["known_route_boundaries"]=={"integrated_outer_routes":2,"isolated_t11a_draft_routes":7,"isolated_t11c_draft_routes":2,"known_total":11,"complete_scholar_route_inventory":False,"publication_ready_routes":0}
 m=d["source_locator_manifest"]; assert [(x["entry_id"],x["unicode_codepoints"]) for x in m["entry_sources"]]==[(5261,11335),(5262,6569),(5263,4322)]
 assert (m["108-T01"]["start"],m["108-T01"]["end"])==(165,234) and (m["108-T02"]["start"],m["108-T02"]["end"])==(2925,2965)
 assert (m["108-T08A"]["start"],m["108-T08A"]["end"])==(1952,2110) and (m["108-T08B"]["start"],m["108-T08B"]["end"])==(2385,2553)
 assert [(x["start"],x["end"],x["sha256"]) for x in m["108-T11A"]["evidence_units"]]==T11A and m["108-T11A"]["route_count"]==7
 assert [(x["start"],x["end"]) for x in m["108-T11C"]["evidence_units"]]==[(2039,2567),(2809,3235)] and m["108-T11C"]["excluded_span"]["start"]==2567 and m["108-T11C"]["excluded_span"]["end"]==2809 and m["108-T11C"]["route_count"]==2
 l=d["lifecycle_reconciliation"]; assert l["108-T11A"]["assembly_state"]=="isolated_multirow_preview_not_integrated" and l["108-T11A"]["checkpoint_staging_applied"] is True and l["108-T11A"]["later_success_evidence"]["result"]=="success"
 assert l["108-T11C"]["assembly_state"]=="isolated_multirow_preview_not_integrated" and l["108-T11C"]["result"]=="success" and l["108-T11C"]["workflow_run_id"]==39552846760
 hs=d["scholar_active_holds"]; assert len(hs)==8 and [x["hold_class"] for x in hs]==HCLS and all(x["status"]=="active" and x["resolved"] is False and x["waived"] is False for x in hs)
 assert d["resolved_holds"]==[] and d["waived_holds"]==[] and d["hold_summary"]=={"active":8,"resolved":0,"waived":0}
 e=d["consolidation_effect"]; assert e=={"scholar_level_hold_consolidated":True,"scholar_complete":False,"claim_count_before":18,"claim_count_after":18,"publication_ready_claim_count":0,"publication_ready_route_count":0,"physical_ids_allocated":0,"database_rows_changed":0,"chapter_complete":False}
 assert d["repository_observation"]["prior_workflow_state"]=="completed_success"
 assert d["counts_unchanged"] is True and d["physical_ids_allocated"]==0 and d["database_written"] is False and d["database_write_count"]==0 and d["publication_ready"] is False and d["scholar_complete"] is False and d["chapter_complete"] is False
def muts(d):
 fs=[
  lambda x:x.update(surah=107),lambda x:x["six_scholar_baseline"].update(tabari=17),lambda x:x["inventory_boundary"].update(claim_count=17),lambda x:x["inventory_boundary"].update(incomplete_claims=17),lambda x:x["inventory_boundary"].update(publication_ready_claims=1),lambda x:x["inventory_boundary"]["claim_ids"].pop(),lambda x:x["inventory_boundary"]["assembly_states"].update(isolated_multirow_preview_not_integrated=1),lambda x:x["inventory_boundary"]["known_route_boundaries"].update(known_total=10),lambda x:x["inventory_boundary"]["known_route_boundaries"].update(complete_scholar_route_inventory=True),lambda x:x["inventory_boundary"]["known_route_boundaries"].update(publication_ready_routes=1),
  lambda x:x["source_locator_manifest"]["entry_sources"][0].update(unicode_codepoints=11334),lambda x:x["source_locator_manifest"]["108-T01"].update(start=166),lambda x:x["source_locator_manifest"]["108-T02"].update(end=2964),lambda x:x["source_locator_manifest"]["108-T08A"].update(end=2109),lambda x:x["source_locator_manifest"]["108-T08B"].update(start=2384),lambda x:x["source_locator_manifest"]["108-T11A"]["evidence_units"].pop(),lambda x:x["source_locator_manifest"]["108-T11A"].update(route_count=6),lambda x:x["source_locator_manifest"]["108-T11C"]["evidence_units"][0].update(end=2568),lambda x:x["source_locator_manifest"]["108-T11C"]["excluded_span"].update(start=2566),lambda x:x["source_locator_manifest"]["108-T11C"].update(route_count=1),
  lambda x:x["lifecycle_reconciliation"]["108-T11A"].update(assembly_state="integrated"),lambda x:x["lifecycle_reconciliation"]["108-T11A"].update(checkpoint_staging_applied=False),lambda x:x["lifecycle_reconciliation"]["108-T11A"]["later_success_evidence"].update(result="failure"),lambda x:x["lifecycle_reconciliation"]["108-T11C"].update(assembly_state="integrated"),lambda x:x["lifecycle_reconciliation"]["108-T11C"].update(result="failure"),lambda x:x["lifecycle_reconciliation"]["108-T11C"].update(workflow_run_id=0),
  lambda x:x["scholar_active_holds"].pop(),lambda x:x["scholar_active_holds"][0].update(status="resolved"),lambda x:x["scholar_active_holds"][0].update(resolved=True),lambda x:x["resolved_holds"].append("108-TABARI-SCHOLAR-H01"),lambda x:x["hold_summary"].update(active=7),lambda x:x["consolidation_effect"].update(scholar_complete=True),lambda x:x["consolidation_effect"].update(claim_count_after=17),lambda x:x["consolidation_effect"].update(publication_ready_claim_count=1),lambda x:x["consolidation_effect"].update(publication_ready_route_count=1),lambda x:x["repository_observation"].update(prior_workflow_state="pending"),lambda x:x.update(database_written=True),lambda x:x.update(publication_ready=True),lambda x:x.update(scholar_complete=True),lambda x:x.update(chapter_complete=True)]
 for f in fs:
  y=copy.deepcopy(d);f(y)
  try:check(y)
  except (AssertionError,KeyError,TypeError):continue
  raise AssertionError("unsafe mutation accepted")
 return len(fs)
if __name__=="__main__":
 d=json.loads(ART.read_text());check(d);assert muts(d)==40
 print("PASS: Tabari scholar hold consolidated; 18 claims incomplete; 8 active holds; 40 unsafe mutations rejected")

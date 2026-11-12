#!/usr/bin/env python3
"""Validate the bounded Tabari 108-T09 coordinated-integration result."""
import copy, json
from pathlib import Path
P=Path(__file__).resolve().parents[1]/"data/tafsir/staging/tabari-108-t09-coordinated-integration-result-2026-11-12.json"
COMMIT="dd974ff87ba22830553866b37d2ca2940e5dad0d"
PAYLOAD="3ea692a1c310d1206fafedb3efe16c6ce1ced946"
LIFE="d28aad7abdbaa2132e4eb783c5eeff467f6d30df"
SOURCE="55143e1930f2511d2af04570d8e8e1091490c769829840a0ea03b92178992314"
SUCCESS=[43206532166,43206531957,43206532095,43206531903,43206532463,43206531960,43206531902,43206531936,43206532000]

def validate(d):
 assert d["schema_version"]=="quranhikma-tabari-108-t09-coordinated-integration-result-v1"
 assert (d["surah"],d["scholar_key"],d["claim_id"],d["hold_id"])==(108,"tabari","108-T09","108-TABARI-SCHOLAR-H01")
 assert d["status"]=="coordinated_staging_integration_observed_nine_success_one_cancelled_h01_active"
 i=d["integration"]
 assert i["commit"]==COMMIT and i["parent_commit"]=="06a8e7585bce3acdfa9b401e905040d272d421be"
 assert i["payload_blob"]==PAYLOAD and i["lifecycle_blob"]==LIFE
 assert i["candidate_artifact_blob"]=="af43067828a4ebd2c8777f321e6ab7fc4ef2af19"
 assert i["candidate_validator_blob"]=="d121eb449a1a4828c3936f10742abf160adb1669"
 assert i["contract_validator_blob"]=="40373d58cd2f325da1b5693b9dc192146fa07843"
 assert i["classifier_state"]=="exact_five_file_preview_plus_pinned_t09_enum_transition" and i["atomic_repository_staging"] is True
 w=d["workflow_observation"]
 assert (w["success_count"],w["failure_count"],w["cancelled_count"])==(9,0,1)
 assert [x["run_id"] for x in w["success_runs"]]==SUCCESS
 c=w["cancelled_run"]
 assert (c["run_id"],c["job_id"],c["conclusion"],c["successful_numbered_steps_before_cancellation"])==(43206531967,131142971268,"cancelled",15)
 assert c["cancelled_step"]=="Read pinned post-I02 baseline for historical guards" and len(c["skipped_steps"])==3
 assert [c["corresponding_dedicated_workflows"][x]["conclusion"] for x in ("I02","I03","I04A")]==["success"]*3
 assert c["interpretation"]=="partial_guard_observation_not_a_full_success"
 assert w["all_triggered_runs_completed"] is True and w["all_triggered_runs_success"] is False
 assert w["guard_bypassed"] is False and w["rerun_started"] is False
 f=d["t09_fidelity"]
 assert f["statement_en"]=="An interpretation attributed to unnamed Arabic-language scholars construes the bodily wording as facing the qibla with the upper chest."
 assert f["integrated_voice_type"]=="unattributed_group" and f["originating_voice_name"] is None
 assert f["source_locator"]=={"tafsir_entry_id":5262,"source_sha256":SOURCE,"raw_start":5515,"raw_end":5534,"normalized_arabic_anchor":"استقبل القبلة بنحرك"}
 assert f["contextual_attribution_ar"]=="وكان بعض أهل العربية يتأوّل قوله"
 assert f["english_witness_state"]=="absent" and f["translation_status"]=="controlled_research_translation_from_arabic"
 assert f["mufassir_own_position"]=="reported_only" and f["transmission_route_state"]=="not_applicable_no_transmitted_route"
 assert len(f["disagreements_and_absences"])==4
 inv=d["lifecycle_invariants"]
 assert inv=={"historical_claims":74,"tabari_claims":18,"publication_ready_tabari_claims":0,"active_scholar_holds_before":48,"active_scholar_holds_after":48,"resolved_scholar_holds":0,"waived_scholar_holds":0,"physical_ids_allocated":0,"database_rows_changed":0,"database_written":False,"publication_ready":False,"scholar_complete":False,"chapter_complete":False,"advance_to_surah_107":False}
 n=d["selected_next_boundary"]
 assert n["kind"]=="tabari_h01_t11_plural_consumer_contract" and n["claim_ids"]==["108-T11A","108-T11C"]
 assert n["write_mode"]=="repository_staging_only" and n["hold_clearance_authorized"] is False and n["database_write_authorized"] is False and n["advance_to_surah_107"] is False
 assert d["validation"]=={"result":"PASS","validator":"scripts/validate-tabari-108-t09-coordinated-integration-result.py","unsafe_mutations_rejected":58}
 assert d["database_written"] is False and d["database_write_count"]==0 and d["publication_ready"] is False and d["scholar_complete"] is False and d["chapter_complete"] is False

def mutations(d):
 paths=[
 (["schema_version"],"bad"),(["surah"],107),(["scholar_key"],"other"),(["claim_id"],"108-T10"),(["hold_id"],"bad"),(["status"],"complete"),
 (["integration","commit"],"0"*40),(["integration","parent_commit"],"0"*40),(["integration","payload_blob"],"0"*40),(["integration","lifecycle_blob"],"0"*40),
 (["integration","candidate_artifact_blob"],"0"*40),(["integration","candidate_validator_blob"],"0"*40),(["integration","contract_validator_blob"],"0"*40),
 (["integration","classifier_state"],"bypass"),(["integration","atomic_repository_staging"],False),
 (["workflow_observation","success_count"],10),(["workflow_observation","failure_count"],1),(["workflow_observation","cancelled_count"],0),
 (["workflow_observation","success_runs"],[]),(["workflow_observation","cancelled_run","run_id"],0),(["workflow_observation","cancelled_run","job_id"],0),
 (["workflow_observation","cancelled_run","conclusion"],"success"),(["workflow_observation","cancelled_run","successful_numbered_steps_before_cancellation"],16),
 (["workflow_observation","cancelled_run","cancelled_step"],"other"),(["workflow_observation","cancelled_run","skipped_steps"],[]),
 (["workflow_observation","cancelled_run","corresponding_dedicated_workflows","I02","conclusion"],"failure"),
 (["workflow_observation","cancelled_run","corresponding_dedicated_workflows","I03","conclusion"],"failure"),
 (["workflow_observation","cancelled_run","corresponding_dedicated_workflows","I04A","conclusion"],"failure"),
 (["workflow_observation","cancelled_run","interpretation"],"full_success"),(["workflow_observation","all_triggered_runs_completed"],False),
 (["workflow_observation","all_triggered_runs_success"],True),(["workflow_observation","guard_bypassed"],True),(["workflow_observation","rerun_started"],True),
 (["t09_fidelity","statement_en"],"changed"),(["t09_fidelity","integrated_voice_type"],"exegete_own_view"),(["t09_fidelity","originating_voice_name"],"unknown"),
 (["t09_fidelity","source_locator","tafsir_entry_id"],5261),(["t09_fidelity","source_locator","source_sha256"],"0"*64),
 (["t09_fidelity","source_locator","raw_start"],0),(["t09_fidelity","source_locator","raw_end"],0),(["t09_fidelity","source_locator","normalized_arabic_anchor"],"changed"),
 (["t09_fidelity","contextual_attribution_ar"],"changed"),(["t09_fidelity","english_witness_state"],"present"),
 (["t09_fidelity","translation_status"],"verbatim"),(["t09_fidelity","mufassir_own_position"],"preferred"),
 (["t09_fidelity","transmission_route_state"],"complete"),(["t09_fidelity","disagreements_and_absences"],[]),
 (["lifecycle_invariants","historical_claims"],75),(["lifecycle_invariants","publication_ready_tabari_claims"],1),(["lifecycle_invariants","active_scholar_holds_after"],47),
 (["lifecycle_invariants","resolved_scholar_holds"],1),(["lifecycle_invariants","physical_ids_allocated"],1),(["lifecycle_invariants","database_written"],True),
 (["lifecycle_invariants","publication_ready"],True),(["lifecycle_invariants","scholar_complete"],True),(["lifecycle_invariants","chapter_complete"],True),
 (["selected_next_boundary","kind"],"publish"),(["validation","result"],"FAIL")]
 assert len(paths)==58
 out=[]
 for path,val in paths:
  x=copy.deepcopy(d); q=x
  for k in path[:-1]: q=q[k]
  q[path[-1]]=val; out.append(x)
 return out

d=json.loads(P.read_text())
validate(d)
for m in mutations(d):
 try: validate(m)
 except AssertionError: pass
 else: raise AssertionError("unsafe mutation accepted")
print("PASS: Tabari 108-T09 integration result; 58/58 unsafe mutations rejected")

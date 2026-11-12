#!/usr/bin/env python3
"""Validate exact guard-compatible integration contract for Tabari 108-T09."""
import copy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
CONTRACT=ROOT/"data/tafsir/staging/tabari-108-t09-guard-compatible-integration-contract-2026-11-12.json"
CANDIDATE=ROOT/"data/tafsir/staging/tabari-108-t09-voice-enum-staged-repair-2026-11-12.json"
PAYLOAD=ROOT/"data/tafsir/staging/surah-108-payload-assembly-2026-10-16.json"
LIFECYCLE=ROOT/"scripts/test-ibn-kathir-i04a-coordinated-lifecycle.py"
CANON="ce87f640f60c43651adcc45e4bfca192b6cbd253";TARGET="3ea692a1c310d1206fafedb3efe16c6ce1ced946"
PATHS=["generated_at","rows[12].blocking_note","rows[12].proposed_payload.voice.originating_voice_type","rows[12].schema_vocabulary_repairs[1]","tabari_t09_voice_enum_repair"]
STATEMENT="An interpretation attributed to unnamed Arabic-language scholars construes the bodily wording as facing the qibla with the upper chest."
SOURCE_HASH="55143e1930f2511d2af04570d8e8e1091490c769829840a0ea03b92178992314";ANCHOR="استقبل القبلة بنحرك"

def validate(d,c,p,s):
 assert d["schema_version"]=="quranhikma-tabari-108-t09-guard-compatible-integration-contract-v1"
 assert d["status"]=="guard_compatible_exact_transition_contract_built_not_applied_h01_active"
 assert (d["surah"],d["scholar_key"],d["claim_id"],d["hold_id"])==(108,"tabari","108-T09","108-TABARI-SCHOLAR-H01")
 b=d["basis"]
 assert b["isolated_candidate"]["blob"]=="01fe746890405f64c1257e9e94538be1278e95db"
 assert b["candidate_validator"]["blob"]=="574e26cd88c365c2ef2c76877f257b448bb8ac87" and b["candidate_validator"]["result"]=="PASS" and b["candidate_validator"]["unsafe_mutations_rejected"]==50
 assert b["checkpoint"]["commit"]=="9e2b27c253a0ab79112e2da5f2e91678e454ff66" and b["checkpoint"]["blob"]=="db00049a2203f34b41a902ebcc9baf5bb5fcc2a5"
 assert b["checkpoint"]["guard_run_id"]==43189343357 and b["checkpoint"]["guard_conclusion"]=="success"
 assert b["direct_attempt"]=={"commit":"aded688eaf04cdebca9732799b4a1892393512b0","payload_blob":TARGET,"t09_validator_result":"PASS","legacy_guard_failures":[43188460336,43188460320]}
 assert b["corrected_isolated_candidate"]["historical_guard_successes"]==9 and b["corrected_isolated_candidate"]["historical_guard_failures"]==0
 files=b["legacy_contract_files"]
 assert files["lifecycle_script"]["blob"]=="a1e9fb8b4966a14049edcf8ec1283e3f0a30457c"
 assert files["preview_script"]["blob"]=="f65d6c0460144464b52b25eff7e23f49527f4cce"
 assert files["preflight_workflow"]["blob"]=="b6a8c6e0288e83f725faeb98e985ea2de57c416f"
 assert files["draft_workflow"]["blob"]=="51ac4d4afb480c3d75e8c11c0dea5d76cf4a2f33"
 pc=d["payload_contract"]
 assert pc["canonical_blob"]==CANON and pc["exact_candidate_blob"]==TARGET and pc["candidate_commit"]=="aded688eaf04cdebca9732799b4a1892393512b0"
 assert pc["exact_changed_paths"]==PATHS and pc["canonical_voice_type"]=="unnamed_report" and pc["candidate_voice_type"]=="unattributed_group"
 assert pc["originating_voice_name"] is None and pc["candidate_schema_compatible"] is True and pc["canonical_payload_must_remain_unchanged_until_coordinated_commit"] is True
 cc=d["classification_contract"]
 assert cc["current_states_preserved"]==["original_unapplied","exact_five_file_preview"]
 assert cc["new_state"]=="exact_five_file_preview_plus_pinned_t09_enum_transition"
 assert len(cc["acceptance_requirements"])==6 and len(cc["rejection_requirements"])==7
 assert any(TARGET in x for x in cc["acceptance_requirements"]) and any(CANON in x for x in cc["acceptance_requirements"])
 ib=cc["implementation_boundary"]
 assert ib["target"]=="scripts/test-ibn-kathir-i04a-coordinated-lifecycle.py"
 assert ib["workflow_yaml_change_required"] is False and ib["weaken_existing_guard"] is False and ib["bypass_guard"] is False
 f=d["t09_fidelity"]
 assert f["statement_en"]==STATEMENT
 assert f["source_locator"]=={"tafsir_entry_id":5262,"source_sha256":SOURCE_HASH,"raw_start":5515,"raw_end":5534,"normalized_arabic_anchor":ANCHOR}
 assert f["contextual_attribution_ar"]=="وكان بعض أهل العربية يتأوّل قوله"
 assert f["english_witness_state"]=="absent" and f["translation_status"]=="controlled_research_translation_from_arabic"
 assert f["mufassir_own_position"]=="reported_only" and f["transmission_route_state"]=="not_applicable_no_transmitted_route"
 assert len(f["disagreements_and_absences"])==4
 plan=d["coordinated_commit_plan"]
 assert [x["path"] for x in plan["files"]]==["data/tafsir/staging/surah-108-payload-assembly-2026-10-16.json","scripts/test-ibn-kathir-i04a-coordinated-lifecycle.py","data/tafsir/staging/tabari-108-t09-voice-enum-staged-repair-2026-11-12.json"]
 assert plan["files"][0]["target_blob"]==TARGET and plan["atomic"] is True and len(plan["required_checks"])==4
 assert plan["database_write"] is False and plan["physical_id_allocation"] is False and plan["hold_clearance"] is False
 inv=d["lifecycle_invariants"]
 assert inv=={"historical_claims":74,"tabari_claims":18,"publication_ready_tabari_claims":0,"active_scholar_holds_before":48,"active_scholar_holds_after":48,"resolved_scholar_holds":0,"waived_scholar_holds":0,"physical_ids_allocated":0,"database_rows_changed":0,"database_written":False,"publication_ready":False,"scholar_complete":False,"chapter_complete":False,"advance_to_surah_107":False}
 n=d["selected_next_boundary"]
 assert n["kind"]=="tabari_h01_t09_guard_compatible_coordinated_integration" and n["claim_id"]=="108-T09" and n["write_mode"]=="repository_staging_only_atomic"
 assert n["hold_clearance_authorized"] is False and n["database_write_authorized"] is False and n["advance_to_surah_107"] is False
 assert d["validation"]=={"result":"PASS","validator":"scripts/validate-tabari-108-t09-guard-compatible-integration-contract.py","unsafe_mutations_rejected":54}
 assert d["database_written"] is False and d["database_write_count"]==0 and d["publication_ready"] is False and d["scholar_complete"] is False and d["chapter_complete"] is False
 assert c["schema_version"]=="quranhikma-tabari-108-t09-voice-enum-coordinated-staging-integration-v1"
 assert c["repair"]["candidate_only"] is False and c["repair"]["canonical_payload_changed"] is True and c["repair"]["schema_compatible_candidate"] is True
 assert c["repair"]["integrated_payload_blob"]==TARGET and c["repair"]["guard_compatible_lifecycle_script_blob"]=="d28aad7abdbaa2132e4eb783c5eeff467f6d30df"
 assert c["selected_next_boundary"]["kind"]=="tabari_h01_t09_post_integration_guard_validation"
 row=p["rows"][12]
 assert row["claim_id"]=="108-T09" and row["statement_en"]==STATEMENT
 assert row["proposed_payload"]["voice"]=={"reporting_work_id":1,"originating_voice_type":"unattributed_group","originating_voice_name":None}
 assert row["plan_row"]["evidence"]["source_sha256"]==SOURCE_HASH and row["plan_row"]["evidence"]["normalized_arabic_anchor"]==ANCHOR
 assert row["publication_ready"] is False and p["tabari_t09_voice_enum_repair"]["schema_compatible"] is True
 assert "T09_PAYLOAD_PIN='"+TARGET+"'" in s and "exact_five_file_preview_plus_pinned_t09_enum_transition" in s and "exact_t09_transition" in s

def mutations(d):
 c=[]
 def add(path,value):
  x=copy.deepcopy(d);q=x
  for k in path[:-1]:q=q[k]
  q[path[-1]]=value;c.append(x)
 add(["status"],"complete");add(["claim_id"],"108-T10");add(["database_written"],True);add(["publication_ready"],True);add(["scholar_complete"],True);add(["chapter_complete"],True)
 add(["basis","isolated_candidate","blob"],"0"*40);add(["basis","candidate_validator","blob"],"0"*40);add(["basis","candidate_validator","result"],"FAIL");add(["basis","candidate_validator","unsafe_mutations_rejected"],49)
 add(["basis","checkpoint","commit"],"0"*40);add(["basis","checkpoint","guard_conclusion"],"failure")
 add(["basis","direct_attempt","payload_blob"],CANON);add(["basis","direct_attempt","t09_validator_result"],"FAIL");add(["basis","direct_attempt","legacy_guard_failures"],[])
 add(["basis","corrected_isolated_candidate","historical_guard_successes"],8);add(["basis","corrected_isolated_candidate","historical_guard_failures"],1)
 add(["basis","legacy_contract_files","lifecycle_script","blob"],"0"*40);add(["basis","legacy_contract_files","preview_script","blob"],"0"*40)
 add(["basis","legacy_contract_files","preflight_workflow","blob"],"0"*40);add(["basis","legacy_contract_files","draft_workflow","blob"],"0"*40)
 add(["payload_contract","canonical_blob"],TARGET);add(["payload_contract","exact_candidate_blob"],CANON);add(["payload_contract","candidate_commit"],"0"*40)
 add(["payload_contract","exact_changed_paths"],[]);add(["payload_contract","canonical_voice_type"],"unattributed_group")
 add(["payload_contract","candidate_voice_type"],"exegete_own_view");add(["payload_contract","originating_voice_name"],"unknown")
 add(["payload_contract","candidate_schema_compatible"],False);add(["payload_contract","canonical_payload_must_remain_unchanged_until_coordinated_commit"],False)
 add(["classification_contract","current_states_preserved"],[]);add(["classification_contract","new_state"],"bypass")
 add(["classification_contract","acceptance_requirements"],[]);add(["classification_contract","rejection_requirements"],[])
 add(["classification_contract","implementation_boundary","target"],"workflow");add(["classification_contract","implementation_boundary","workflow_yaml_change_required"],True)
 add(["classification_contract","implementation_boundary","weaken_existing_guard"],True);add(["classification_contract","implementation_boundary","bypass_guard"],True)
 add(["t09_fidelity","statement_en"],"changed");add(["t09_fidelity","source_locator","source_sha256"],"0"*64)
 add(["t09_fidelity","source_locator","raw_start"],5514);add(["t09_fidelity","source_locator","normalized_arabic_anchor"],"changed")
 add(["t09_fidelity","english_witness_state"],"present");add(["t09_fidelity","translation_status"],"bilingual")
 add(["t09_fidelity","mufassir_own_position"],"preferred");add(["t09_fidelity","transmission_route_state"],"present")
 add(["coordinated_commit_plan","files"],[]);add(["coordinated_commit_plan","atomic"],False)
 add(["coordinated_commit_plan","required_checks"],[]);add(["coordinated_commit_plan","database_write"],True)
 add(["lifecycle_invariants","active_scholar_holds_after"],47);add(["lifecycle_invariants","database_rows_changed"],1)
 add(["selected_next_boundary","kind"],"advance_to_surah_107")
 add(["validation","unsafe_mutations_rejected"],53)
 assert len(c)==54,len(c);return c

def main():
 d=json.loads(CONTRACT.read_text(encoding="utf-8"));c=json.loads(CANDIDATE.read_text(encoding="utf-8"));p=json.loads(PAYLOAD.read_text(encoding="utf-8"));s=LIFECYCLE.read_text(encoding="utf-8");validate(d,c,p,s)
 rejected=0
 for x in mutations(d):
  try:validate(x,c,p,s)
  except (AssertionError,KeyError):rejected+=1
 assert rejected==54
 print("PASS: T09 integration contract remains exact after coordinated application; pinned payload and lifecycle classifier present; 54/54 unsafe contract mutations rejected; H01 active.")
if __name__=="__main__":main()

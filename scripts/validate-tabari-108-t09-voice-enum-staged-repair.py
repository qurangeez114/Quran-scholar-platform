#!/usr/bin/env python3
"""Validate isolated Tabari 108-T09 voice enum staging candidate."""
import copy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/"data/tafsir/staging/tabari-108-t09-voice-enum-staged-repair-2026-11-12.json"
PAYLOAD=ROOT/"data/tafsir/staging/surah-108-payload-assembly-2026-10-16.json"
ALLOWED=["exegete_own_view","named_earlier_exegete","companion_report","hadith_report","unattributed_group"]
STATEMENT="An interpretation attributed to unnamed Arabic-language scholars construes the bodily wording as facing the qibla with the upper chest."
ANCHOR="استقبل القبلة بنحرك";SOURCE_HASH="55143e1930f2511d2af04570d8e8e1091490c769829840a0ea03b92178992314"

def validate(a,p):
 assert a["schema_version"]=="quranhikma-tabari-108-t09-voice-enum-isolated-staging-candidate-v1"
 assert a["status"]=="isolated_staging_voice_enum_candidate_schema_compatible_shared_payload_unchanged_legacy_guards_block_integration_h01_active"
 assert (a["surah"],a["scholar_key"],a["claim_id"],a["hold_id"])==(108,"tabari","108-T09","108-TABARI-SCHOLAR-H01")
 b=a["basis"]
 assert b["schema_consumer_audit"]["blob"]=="4f38c83eaa1c8ebeac557458cdc36eafcc8ea41d"
 assert b["payload_assembly"]["baseline_blob"]=="ce87f640f60c43651adcc45e4bfca192b6cbd253"
 assert b["checkpoint"]["blob"]=="41cf2cd077ac1324c9f2d6b261ecad4134e4ed46"
 assert b["prior_artifact_guard"]["validation_steps_successful"]==22 and b["prior_artifact_guard"]["failure_observed"] is False
 assert b["prior_checkpoint_guard"]["steps_successful_before_cancellation"]==18 and b["prior_checkpoint_guard"]["failure_observed"] is False
 assert b["duplicate_job_started"] is False
 attempt=b["direct_payload_integration_attempt"]
 assert attempt["commit"]=="aded688eaf04cdebca9732799b4a1892393512b0"
 assert attempt["payload_blob"]=="3ea692a1c310d1206fafedb3efe16c6ce1ced946"
 assert attempt["t09_validator_result"]=="PASS" and attempt["unsafe_mutations_rejected"]==52
 assert [x["workflow_run_id"] for x in attempt["legacy_guard_failures"]]==[43188460336,43188460320]
 assert all("Historical" in x["reason"] for x in attempt["legacy_guard_failures"]) and attempt["bypassed"] is False
 r=a["repair"]
 assert r["payload_row_index"]==12 and r["field_path"]=="rows[12].proposed_payload.voice.originating_voice_type"
 assert r["from"]=="unnamed_report" and r["to"]=="unattributed_group" and r["originating_voice_name"] is None
 assert r["live_allowed_types"]==ALLOWED and r["live_name_rule"]=="unattributed_group requires null name"
 assert r["candidate_only"] is True and r["canonical_payload_changed"] is False and r["schema_compatible_candidate"] is True
 assert r["integration_blocked_by_legacy_exact_transition_guards"] is True
 for k in ["statement_changed","plan_row_changed","authoritative_research_claim_changed","evidence_changed","link_changed","transmission_route_added","physical_id_allocated"]:assert r[k] is False
 f=a["fidelity"]
 assert f["statement_en"]==STATEMENT
 assert f["source_locator"]=={"tafsir_entry_id":5262,"source_sha256":SOURCE_HASH,"raw_start":5515,"raw_end":5534,"normalized_arabic_anchor":ANCHOR}
 assert f["contextual_attribution_ar"]=="وكان بعض أهل العربية يتأوّل قوله"
 assert f["english_witness_state"]=="absent" and f["translation_status"]=="controlled_research_translation_from_arabic"
 assert f["transmission_route_state"]=="not_applicable_no_transmitted_route" and len(f["disagreements_preserved"])==4
 c=a["consumer_state"]
 assert all(c[k] is True for k in ["singular_four_section_shape","proposition_present","voice_present","evidence_present","link_present"])
 assert c["final_consumer_identity_allocated"] is False and c["consumer_integration_status"]=="blocked_by_legacy_exact_transition_guards"
 assert c["remaining_plural_consumer_claim_ids"]==["108-T11A","108-T11C"]
 inv=a["lifecycle_invariants"]
 assert inv=={"historical_claims":74,"tabari_claims":18,"publication_ready_tabari_claims":0,"active_scholar_holds_before":48,"active_scholar_holds_after":48,"resolved_scholar_holds":0,"waived_scholar_holds":0,"physical_ids_allocated":0,"database_rows_changed":0,"database_written":False,"publication_ready":False,"scholar_complete":False,"chapter_complete":False,"advance_to_surah_107":False}
 n=a["selected_next_boundary"]
 assert n["kind"]=="tabari_h01_t09_guard_compatible_integration_contract" and n["claim_id"]=="108-T09"
 assert n["candidate_voice_type"]=="unattributed_group" and n["canonical_voice_type"]=="unnamed_report"
 assert n["write_mode"]=="repository_staging_only" and n["hold_clearance_authorized"] is False and n["database_write_authorized"] is False and n["advance_to_surah_107"] is False
 assert a["validation"]=={"result":"PASS","validator":"scripts/validate-tabari-108-t09-voice-enum-staged-repair.py","unsafe_mutations_rejected":50}
 assert a["database_written"] is False and a["database_write_count"]==0 and a["publication_ready"] is False and a["scholar_complete"] is False and a["chapter_complete"] is False
 row=p["rows"][12]
 assert row["claim_id"]=="108-T09" and row["statement_en"]==STATEMENT
 assert row["proposed_payload"]["voice"]=={"reporting_work_id":1,"originating_voice_type":"unnamed_report","originating_voice_name":None}
 assert row["plan_row"]["evidence"]["source_sha256"]==SOURCE_HASH and row["plan_row"]["evidence"]["normalized_arabic_anchor"]==ANCHOR
 assert row["plan_row"]["english_coverage"]=="absent" and row["plan_row"]["transmission_route_state"]=="not_applicable_no_transmitted_route"
 assert row["publication_ready"] is False and "tabari_t09_voice_enum_repair" not in p

def mutations(a,p):
 c=[]
 def add(path,value):
  x=copy.deepcopy(a);q=x
  for k in path[:-1]:q=q[k]
  q[path[-1]]=value;c.append(x)
 add(["status"],"complete");add(["claim_id"],"108-T10");add(["database_written"],True);add(["publication_ready"],True);add(["scholar_complete"],True);add(["chapter_complete"],True)
 add(["basis","schema_consumer_audit","blob"],"0"*40);add(["basis","payload_assembly","baseline_blob"],"0"*40);add(["basis","checkpoint","blob"],"0"*40)
 add(["basis","prior_artifact_guard","validation_steps_successful"],21);add(["basis","prior_artifact_guard","failure_observed"],True)
 add(["basis","prior_checkpoint_guard","steps_successful_before_cancellation"],17);add(["basis","prior_checkpoint_guard","failure_observed"],True)
 add(["basis","duplicate_job_started"],True);add(["basis","direct_payload_integration_attempt","commit"],"0"*40)
 add(["basis","direct_payload_integration_attempt","payload_blob"],"0"*40);add(["basis","direct_payload_integration_attempt","t09_validator_result"],"FAIL")
 add(["basis","direct_payload_integration_attempt","unsafe_mutations_rejected"],51);add(["basis","direct_payload_integration_attempt","legacy_guard_failures"],[])
 add(["basis","direct_payload_integration_attempt","bypassed"],True)
 add(["repair","payload_row_index"],13);add(["repair","field_path"],"bad");add(["repair","from"],"unattributed_group");add(["repair","to"],"exegete_own_view")
 add(["repair","originating_voice_name"],"unknown");add(["repair","live_allowed_types"],ALLOWED+["unnamed_report"]);add(["repair","candidate_only"],False)
 add(["repair","canonical_payload_changed"],True);add(["repair","schema_compatible_candidate"],False);add(["repair","integration_blocked_by_legacy_exact_transition_guards"],False)
 add(["repair","statement_changed"],True);add(["repair","plan_row_changed"],True);add(["repair","evidence_changed"],True);add(["repair","transmission_route_added"],True)
 add(["fidelity","statement_en"],"changed");add(["fidelity","source_locator","source_sha256"],"0"*64);add(["fidelity","source_locator","raw_start"],5514)
 add(["fidelity","source_locator","normalized_arabic_anchor"],"changed");add(["fidelity","english_witness_state"],"present")
 add(["fidelity","translation_status"],"bilingual");add(["fidelity","transmission_route_state"],"present");add(["fidelity","disagreements_preserved"],[])
 add(["consumer_state","final_consumer_identity_allocated"],True);add(["consumer_state","consumer_integration_status"],"complete")
 add(["lifecycle_invariants","active_scholar_holds_after"],47);add(["lifecycle_invariants","database_rows_changed"],1)
 add(["selected_next_boundary","kind"],"advance_to_surah_107");add(["selected_next_boundary","hold_clearance_authorized"],True)
 add(["selected_next_boundary","database_write_authorized"],True);add(["validation","unsafe_mutations_rejected"],49)
 assert len(c)==50,len(c);return c

def main():
 a=json.loads(ART.read_text(encoding="utf-8"));p=json.loads(PAYLOAD.read_text(encoding="utf-8"));validate(a,p)
 rejected=0
 for x in mutations(a,p):
  try:validate(x,p)
  except (AssertionError,KeyError):rejected+=1
 assert rejected==50
 print("PASS: isolated 108-T09 enum candidate preserves exact source and attribution; shared payload unchanged after legacy guard rejection; H01 active; 50/50 unsafe mutations rejected.")
if __name__=="__main__":main()

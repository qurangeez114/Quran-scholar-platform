#!/usr/bin/env python3
"""Validate coordinated Tabari 108-T09 staged enum integration."""
import copy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/"data/tafsir/staging/tabari-108-t09-voice-enum-staged-repair-2026-11-12.json"
PAYLOAD=ROOT/"data/tafsir/staging/surah-108-payload-assembly-2026-10-16.json"
LIFECYCLE=ROOT/"scripts/test-ibn-kathir-i04a-coordinated-lifecycle.py"
PIN="3ea692a1c310d1206fafedb3efe16c6ce1ced946";LPIN="d28aad7abdbaa2132e4eb783c5eeff467f6d30df"
STATEMENT="An interpretation attributed to unnamed Arabic-language scholars construes the bodily wording as facing the qibla with the upper chest."
HASH="55143e1930f2511d2af04570d8e8e1091490c769829840a0ea03b92178992314";ANCHOR="استقبل القبلة بنحرك"

def validate(a,p,s):
 assert a["schema_version"]=="quranhikma-tabari-108-t09-voice-enum-coordinated-staging-integration-v1"
 assert a["status"]=="coordinated_staging_voice_enum_integration_applied_guard_validation_pending_h01_active"
 assert (a["surah"],a["scholar_key"],a["claim_id"],a["hold_id"])==(108,"tabari","108-T09","108-TABARI-SCHOLAR-H01")
 b=a["basis"];ic=b["integration_contract"]
 assert ic["blob"]=="50793196d7961bf040fbf2b4ce6eb5ca3e24cc35" and ic["checkpoint_commit"]=="06a8e7584a0bd26a73eaeb963905b1201dcae428"
 assert ic["checkpoint_guard_run_id"]==43196596295 and ic["checkpoint_guard_conclusion"]=="success"
 assert b["direct_payload_integration_attempt"]["bypassed"] is False and len(b["direct_payload_integration_attempt"]["legacy_guard_failures"])==2
 r=a["repair"]
 assert r["from"]=="unnamed_report" and r["to"]=="unattributed_group" and r["originating_voice_name"] is None
 assert r["candidate_only"] is False and r["canonical_payload_changed"] is True and r["schema_compatible_candidate"] is True
 assert r["integration_blocked_by_legacy_exact_transition_guards"] is False
 assert r["integrated_payload_blob"]==PIN and r["guard_compatible_lifecycle_script_blob"]==LPIN
 for k in ["statement_changed","plan_row_changed","authoritative_research_claim_changed","evidence_changed","link_changed","transmission_route_added","physical_id_allocated"]:assert r[k] is False
 f=a["fidelity"];loc=f["source_locator"]
 assert f["statement_en"]==STATEMENT and loc=={"tafsir_entry_id":5262,"source_sha256":HASH,"raw_start":5515,"raw_end":5534,"normalized_arabic_anchor":ANCHOR}
 assert f["english_witness_state"]=="absent" and f["translation_status"]=="controlled_research_translation_from_arabic"
 assert f["transmission_route_state"]=="not_applicable_no_transmitted_route" and len(f["disagreements_preserved"])==4
 c=a["consumer_state"]
 assert all(c[k] is True for k in ["singular_four_section_shape","proposition_present","voice_present","evidence_present","link_present"])
 assert c["consumer_integration_status"]=="staged_payload_integrated_guard_validation_pending" and c["final_consumer_identity_allocated"] is False
 assert c["remaining_plural_consumer_claim_ids"]==["108-T11A","108-T11C"]
 inv=a["lifecycle_invariants"]
 assert inv=={"historical_claims":74,"tabari_claims":18,"publication_ready_tabari_claims":0,"active_scholar_holds_before":48,"active_scholar_holds_after":48,"resolved_scholar_holds":0,"waived_scholar_holds":0,"physical_ids_allocated":0,"database_rows_changed":0,"database_written":False,"publication_ready":False,"scholar_complete":False,"chapter_complete":False,"advance_to_surah_107":False}
 n=a["selected_next_boundary"]
 assert n["kind"]=="tabari_h01_t09_post_integration_guard_validation" and n["required_payload_workflow_successes"]==9
 assert n["write_mode"]=="read_only_guard_observation" and n["hold_clearance_authorized"] is False and n["database_write_authorized"] is False and n["advance_to_surah_107"] is False
 assert a["validation"]=={"result":"PASS","validator":"scripts/validate-tabari-108-t09-voice-enum-staged-repair.py","unsafe_mutations_rejected":56}
 assert a["database_written"] is False and a["database_write_count"]==0 and a["publication_ready"] is False and a["scholar_complete"] is False and a["chapter_complete"] is False
 row=p["rows"][12]
 assert row["claim_id"]=="108-T09" and row["statement_en"]==STATEMENT
 assert row["proposed_payload"]["voice"]=={"reporting_work_id":1,"originating_voice_type":"unattributed_group","originating_voice_name":None}
 assert row["plan_row"]["evidence"]["source_sha256"]==HASH and row["plan_row"]["evidence"]["normalized_arabic_anchor"]==ANCHOR
 assert row["plan_row"]["english_coverage"]=="absent" and row["plan_row"]["transmission_route_state"]=="not_applicable_no_transmitted_route"
 assert row["publication_ready"] is False and p["tabari_t09_voice_enum_repair"]["schema_compatible"] is True and p["tabari_t09_voice_enum_repair"]["consumer_integrated"] is False
 assert "T09_PAYLOAD_PIN='"+PIN+"'" in s and "exact_five_file_preview_plus_pinned_t09_enum_transition" in s and "exact_t09_transition" in s
 assert "partial or divergent I04A/T09 transition" in s

def mutations(a,p):
 c=[]
 def aa(path,value):
  x=copy.deepcopy(a);q=x
  for k in path[:-1]:q=q[k]
  q[path[-1]]=value;c.append((x,p))
 def pp(path,value):
  x=copy.deepcopy(p);q=x
  for k in path[:-1]:q=q[k]
  q[path[-1]]=value;c.append((a,x))
 aa(["status"],"complete");aa(["claim_id"],"108-T10");aa(["database_written"],True);aa(["publication_ready"],True);aa(["scholar_complete"],True);aa(["chapter_complete"],True)
 aa(["basis","integration_contract","blob"],"0"*40);aa(["basis","integration_contract","checkpoint_commit"],"0"*40);aa(["basis","integration_contract","checkpoint_guard_conclusion"],"failure")
 aa(["basis","direct_payload_integration_attempt","bypassed"],True);aa(["basis","direct_payload_integration_attempt","legacy_guard_failures"],[])
 aa(["repair","from"],"unattributed_group");aa(["repair","to"],"exegete_own_view");aa(["repair","originating_voice_name"],"unknown")
 aa(["repair","candidate_only"],True);aa(["repair","canonical_payload_changed"],False);aa(["repair","schema_compatible_candidate"],False)
 aa(["repair","integration_blocked_by_legacy_exact_transition_guards"],True);aa(["repair","integrated_payload_blob"],"0"*40);aa(["repair","guard_compatible_lifecycle_script_blob"],"0"*40)
 aa(["repair","statement_changed"],True);aa(["repair","plan_row_changed"],True);aa(["repair","authoritative_research_claim_changed"],True);aa(["repair","evidence_changed"],True)
 aa(["repair","link_changed"],True);aa(["repair","transmission_route_added"],True);aa(["repair","physical_id_allocated"],True)
 aa(["fidelity","statement_en"],"changed");aa(["fidelity","source_locator","source_sha256"],"0"*64);aa(["fidelity","source_locator","raw_start"],5514)
 aa(["fidelity","source_locator","normalized_arabic_anchor"],"changed");aa(["fidelity","english_witness_state"],"present");aa(["fidelity","translation_status"],"bilingual")
 aa(["fidelity","transmission_route_state"],"present");aa(["fidelity","disagreements_preserved"],[])
 aa(["consumer_state","consumer_integration_status"],"complete");aa(["consumer_state","final_consumer_identity_allocated"],True)
 aa(["consumer_state","singular_four_section_shape"],False);aa(["consumer_state","voice_present"],False);aa(["lifecycle_invariants","advance_to_surah_107"],True)
 aa(["consumer_state","remaining_plural_consumer_claim_ids"],[]);aa(["lifecycle_invariants","active_scholar_holds_after"],47)
 aa(["lifecycle_invariants","resolved_scholar_holds"],1);aa(["lifecycle_invariants","physical_ids_allocated"],1);aa(["lifecycle_invariants","database_rows_changed"],1)
 aa(["lifecycle_invariants","publication_ready"],True);aa(["selected_next_boundary","kind"],"advance_to_surah_107")
 aa(["selected_next_boundary","required_payload_workflow_successes"],8);aa(["selected_next_boundary","hold_clearance_authorized"],True)
 aa(["selected_next_boundary","database_write_authorized"],True);aa(["validation","unsafe_mutations_rejected"],55)
 pp(["rows",12,"proposed_payload","voice","originating_voice_type"],"unnamed_report");pp(["rows",12,"proposed_payload","voice","originating_voice_name"],"unknown")
 pp(["rows",12,"statement_en"],"changed");pp(["rows",12,"plan_row","evidence","source_sha256"],"0"*64);pp(["rows",12,"publication_ready"],True)
 assert len(c)==56,len(c);return c

def main():
 a=json.loads(ART.read_text(encoding="utf-8"));p=json.loads(PAYLOAD.read_text(encoding="utf-8"));s=LIFECYCLE.read_text(encoding="utf-8");validate(a,p,s)
 rejected=0
 for x,y in mutations(a,p):
  try:validate(x,y,s)
  except (AssertionError,KeyError):rejected+=1
 assert rejected==56
 print("PASS: coordinated 108-T09 staged enum integration preserves source/fidelity, uses pinned guard-compatible classifier, and rejects 56/56 unsafe mutations; H01 active.")
if __name__=="__main__":main()

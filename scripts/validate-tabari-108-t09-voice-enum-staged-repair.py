#!/usr/bin/env python3
"""Validate Tabari 108-T09 staged voice enum repair."""
import copy, json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/"data/tafsir/staging/tabari-108-t09-voice-enum-staged-repair-2026-11-12.json"
PAYLOAD=ROOT/"data/tafsir/staging/surah-108-payload-assembly-2026-10-16.json"
CLAIMS=["108-T01","108-T02","108-T03","108-T04A","108-T04B","108-T04C","108-T04D","108-T05","108-T06","108-T07","108-T08A","108-T08B","108-T09","108-T10","108-T11A","108-T11B","108-T11C","108-T11D"]
ALLOWED=["exegete_own_view","named_earlier_exegete","companion_report","hadith_report","unattributed_group"]
STATEMENT="An interpretation attributed to unnamed Arabic-language scholars construes the bodily wording as facing the qibla with the upper chest."
ANCHOR="استقبل القبلة بنحرك"
SOURCE_HASH="55143e1930f2511d2af04570d8e8e1091490c769829840a0ea03b92178992314"

def validate(a,p):
 assert a["schema_version"]=="quranhikma-tabari-108-t09-voice-enum-staged-repair-v1"
 assert a["status"]=="repository_staging_voice_enum_repaired_live_schema_compatible_consumer_integration_pending_h01_active"
 assert a["surah"]==108 and a["scholar_key"]=="tabari" and a["claim_id"]=="108-T09" and a["hold_id"]=="108-TABARI-SCHOLAR-H01"
 b=a["basis"]
 assert b["schema_consumer_audit"]["blob"]=="4f38c83eaa1c8ebeac557458cdc36eafcc8ea41d"
 assert b["payload_assembly"]["baseline_blob"]=="ce87f640f60c43651adcc45e4bfca192b6cbd253"
 assert b["checkpoint"]["blob"]=="41cf2cd077ac1324c9f2d6b261ecad4134e4ed46"
 assert b["prior_artifact_guard"]=={"workflow_run_id":43180865876,"conclusion":"cancelled","validation_steps_completed":22,"validation_steps_successful":22,"job_complete_step":"success","failure_observed":False}
 assert b["prior_checkpoint_guard"]["workflow_run_id"]==43180998036 and b["prior_checkpoint_guard"]["conclusion"]=="cancelled"
 assert b["prior_checkpoint_guard"]["steps_successful_before_cancellation"]==18 and b["prior_checkpoint_guard"]["failure_observed"] is False
 assert b["duplicate_job_started"] is False
 r=a["repair"]
 assert r["payload_row_index"]==12 and r["field_path"]=="rows[12].proposed_payload.voice.originating_voice_type"
 assert r["from"]=="unnamed_report" and r["to"]=="unattributed_group" and r["originating_voice_name"] is None
 assert r["live_allowed_types"]==ALLOWED and r["live_name_rule"]=="unattributed_group requires null name"
 assert r["schema_compatible_after_repair"] is True
 for k in ["statement_changed","plan_row_changed","authoritative_research_claim_changed","evidence_changed","link_changed","transmission_route_added","physical_id_allocated"]:
  assert r[k] is False
 f=a["fidelity"]
 assert f["statement_en"]==STATEMENT
 assert f["source_locator"]=={"tafsir_entry_id":5262,"source_sha256":SOURCE_HASH,"raw_start":5515,"raw_end":5534,"normalized_arabic_anchor":ANCHOR}
 assert f["contextual_attribution_ar"]=="وكان بعض أهل العربية يتأوّل قوله"
 assert f["english_witness_state"]=="absent" and f["translation_status"]=="controlled_research_translation_from_arabic"
 assert f["transmission_route_state"]=="not_applicable_no_transmitted_route"
 assert "not al-Tabari's own preferred view" in f["attribution_boundary"] and len(f["disagreements_preserved"])==4
 c=a["consumer_state"]
 assert all(c[k] is True for k in ["singular_four_section_shape","proposition_present","voice_present","evidence_present","link_present"])
 assert c["final_consumer_identity_allocated"] is False and c["consumer_integration_status"]=="pending"
 assert c["remaining_plural_consumer_claim_ids"]==["108-T11A","108-T11C"]
 inv=a["lifecycle_invariants"]
 assert inv=={"historical_claims":74,"tabari_claims":18,"publication_ready_tabari_claims":0,"active_scholar_holds_before":48,"active_scholar_holds_after":48,"resolved_scholar_holds":0,"waived_scholar_holds":0,"physical_ids_allocated":0,"database_rows_changed":0,"database_written":False,"publication_ready":False,"scholar_complete":False,"chapter_complete":False,"advance_to_surah_107":False}
 n=a["selected_next_boundary"]
 assert n["kind"]=="tabari_h01_t11_plural_consumer_contract" and n["claim_ids"]==["108-T11A","108-T11C"]
 assert n["write_mode"]=="repository_staging_only" and n["hold_clearance_authorized"] is False and n["database_write_authorized"] is False and n["advance_to_surah_107"] is False
 assert a["validation"]=={"result":"PASS","validator":"scripts/validate-tabari-108-t09-voice-enum-staged-repair.py","unsafe_mutations_rejected":52}
 assert a["database_written"] is False and a["database_write_count"]==0 and a["publication_ready"] is False and a["scholar_complete"] is False and a["chapter_complete"] is False
 assert p["surah"]==108 and p["database_written"] is False and p["publication_ready"] is False and p["chapter_complete"] is False
 assert [x["claim_id"] for x in p["rows"] if x["scholar_key"]=="tabari"]==CLAIMS
 row=p["rows"][12]
 assert row["claim_id"]=="108-T09" and row["statement_en"]==STATEMENT
 assert row["proposed_payload"]["voice"]=={"reporting_work_id":1,"originating_voice_type":"unattributed_group","originating_voice_name":None}
 assert row["plan_row"]["evidence"]=={"entry_id":5262,"source_sha256":SOURCE_HASH,"locator_kind":"verified_raw_range_with_normalized_anchor","raw_start":5515,"raw_end":5534,"normalized_arabic_anchor":ANCHOR,"evidence_unit_hashes":[]}
 assert row["plan_row"]["english_coverage"]=="absent" and row["plan_row"]["translation_status"]=="controlled_research_translation_from_arabic"
 assert row["plan_row"]["transmission_route_state"]=="not_applicable_no_transmitted_route"
 assert row["proposed_payload"]["evidence"]["unit_type"]=="unattributed_assertion"
 assert row["proposed_payload"]["evidence"]["attributed_authority_name"] is None
 assert row["proposed_payload"]["proposition"]["mufassir_own_position"]=="reported_only"
 assert row["publication_ready"] is False and row["assembly_state"]=="proposed_payload_pending_schema_and_live_validation"
 repairs=[x for x in row["schema_vocabulary_repairs"] if x["field"]=="voice.originating_voice_type"]
 assert repairs==[{"field":"voice.originating_voice_type","previous":"unnamed_report","value":"unattributed_group","reason":"Current live voice constraint allows unattributed_group with null name. This is a schema representation repair only; T09 remains an unnamed Arabic-language interpretation reported by al-Tabari, with no named authority or transmission route."}]
 pc=p["tabari_t09_voice_enum_repair"]
 assert pc["claim_id"]=="108-T09" and pc["from_voice_type"]=="unnamed_report" and pc["to_voice_type"]=="unattributed_group"
 assert pc["originating_voice_name"] is None and pc["schema_compatible"] is True and pc["consumer_integrated"] is False
 assert pc["source_locator"]==f["source_locator"] and pc["english_witness_state"]=="absent"
 assert pc["hold_status"]=="active" and pc["database_written"] is False and pc["publication_ready"] is False

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
 aa(["status"],"complete")
 aa(["claim_id"],"108-T10")
 aa(["database_written"],True)
 aa(["publication_ready"],True)
 aa(["scholar_complete"],True)
 aa(["chapter_complete"],True)
 aa(["basis","schema_consumer_audit","blob"],"0"*40)
 aa(["basis","payload_assembly","baseline_blob"],"0"*40)
 aa(["basis","checkpoint","blob"],"0"*40)
 aa(["basis","prior_artifact_guard","validation_steps_successful"],21)
 aa(["basis","prior_artifact_guard","failure_observed"],True)
 aa(["basis","prior_checkpoint_guard","steps_successful_before_cancellation"],17)
 aa(["basis","prior_checkpoint_guard","failure_observed"],True)
 aa(["basis","duplicate_job_started"],True)
 aa(["repair","payload_row_index"],13)
 aa(["repair","field_path"],"bad")
 aa(["repair","from"],"unattributed_group")
 aa(["repair","to"],"exegete_own_view")
 aa(["repair","originating_voice_name"],"unknown")
 aa(["repair","live_allowed_types"],ALLOWED+["unnamed_report"])
 aa(["repair","schema_compatible_after_repair"],False)
 aa(["repair","statement_changed"],True)
 aa(["repair","plan_row_changed"],True)
 aa(["repair","evidence_changed"],True)
 aa(["repair","transmission_route_added"],True)
 aa(["repair","physical_id_allocated"],True)
 aa(["fidelity","statement_en"],"changed")
 aa(["fidelity","source_locator","source_sha256"],"0"*64)
 aa(["fidelity","source_locator","raw_start"],5514)
 aa(["fidelity","source_locator","normalized_arabic_anchor"],"changed")
 aa(["fidelity","english_witness_state"],"present")
 aa(["fidelity","translation_status"],"bilingual")
 aa(["fidelity","transmission_route_state"],"present")
 aa(["fidelity","disagreements_preserved"],[])
 aa(["consumer_state","final_consumer_identity_allocated"],True)
 aa(["consumer_state","consumer_integration_status"],"complete")
 aa(["consumer_state","remaining_plural_consumer_claim_ids"],[])
 aa(["lifecycle_invariants","active_scholar_holds_after"],47)
 aa(["lifecycle_invariants","resolved_scholar_holds"],1)
 aa(["lifecycle_invariants","physical_ids_allocated"],1)
 aa(["lifecycle_invariants","database_rows_changed"],1)
 aa(["lifecycle_invariants","publication_ready"],True)
 aa(["lifecycle_invariants","advance_to_surah_107"],True)
 aa(["selected_next_boundary","kind"],"advance_to_surah_107")
 aa(["selected_next_boundary","hold_clearance_authorized"],True)
 aa(["selected_next_boundary","database_write_authorized"],True)
 aa(["validation","unsafe_mutations_rejected"],51)
 pp(["rows",12,"proposed_payload","voice","originating_voice_type"],"unnamed_report")
 pp(["rows",12,"proposed_payload","voice","originating_voice_name"],"unknown")
 pp(["rows",12,"plan_row","evidence","source_sha256"],"0"*64)
 pp(["rows",12,"publication_ready"],True)
 pp(["tabari_t09_voice_enum_repair","consumer_integrated"],True)
 assert len(c)==52,len(c)
 return c

def main():
 a=json.loads(ART.read_text(encoding="utf-8"));p=json.loads(PAYLOAD.read_text(encoding="utf-8"));validate(a,p)
 rejected=0
 for x,y in mutations(a,p):
  try:validate(x,y)
  except (AssertionError,KeyError):rejected+=1
 assert rejected==52
 print("PASS: 108-T09 staged voice enum repaired to unattributed_group with null name; source, translation and attribution boundaries preserved; H01 active; 52/52 unsafe mutations rejected.")

if __name__=="__main__":main()

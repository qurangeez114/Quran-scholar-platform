#!/usr/bin/env python3
"""Validate the exact non-applied T09 projection-baseline refresh contract."""
import copy,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'data/tafsir/staging/tabari-108-t11-projection-baseline-refresh-contract-2026-11-12.json'
PROJ=ROOT/'data/tafsir/staging/surah-108-voice-projection-2026-10-17.json'
PAYLOAD=ROOT/'data/tafsir/staging/surah-108-payload-assembly-2026-10-16.json'
LIFE=ROOT/'scripts/test-ibn-kathir-i04a-coordinated-lifecycle.py'
ADAPTER_RESULT=ROOT/'data/tafsir/staging/tabari-108-t11-plural-consumer-adapter-result-2026-11-12.json'
CURRENT='ba5b61eb693222bc1ff3604daec52a6632cd7cfa';TARGET='67cf93d8a49573c02342d7cd04d2965473e886b1';PAYLOAD_PIN='3ea692a1c310d1206fafedb3efe16c6ce1ced946';PRE='ce87f640f60c43651adcc45e4bfca192b6cbd253'
LIFE_APPLIED='a9f90819f8e3c5941b727b0780d76286d7566787';ADAPTER_RESULT_APPLIED='3cf3d5e2308513e10e59cef7fce615d43b5106ab'
def encode(x):return (json.dumps(x,ensure_ascii=False,indent=2)+'\n').encode()
def blob_bytes(b):return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
def blob(path):return blob_bytes(path.read_bytes())
def row(d,cid):return next(x for x in d['rows'] if x['claim_id']==cid)
def candidate(p):
 x=copy.deepcopy(p);x['inputs']['assembly_blob_sha']=PAYLOAD_PIN;r=row(x,'108-T09');r['database_fields']['originating_voice_type']='unattributed_group';r['blockers']=['proposition_id unresolved until authorized proposition insertion','live source and full-payload validation pending'];return x
def historical(p):
 x=copy.deepcopy(p);x['inputs']['assembly_blob_sha']=PRE;r=row(x,'108-T09');r['database_fields']['originating_voice_type']='unnamed_report';r['blockers']=['proposition_id unresolved until authorized proposition insertion','live source and full-payload validation pending','unsupported originating_voice_type retained without coercion','voice name/type CHECK mismatch'];return x
def validate_candidate(original,target,payload):
 assert blob_bytes(encode(original))==CURRENT and blob_bytes(encode(target))==TARGET
 assert target==candidate(original)
 assert len(original['rows'])==len(target['rows'])==74
 assert [x for x in original['rows'] if x['claim_id']!='108-T09']==[x for x in target['rows'] if x['claim_id']!='108-T09']
 assert original['counts']==target['counts']=={'total_claims':74,'projected':70,'unmapped':4,'rows_with_preserved_metadata':41,'semantic_holds':17}
 before,after=row(original,'108-T09'),row(target,'108-T09');assert before['database_fields']['originating_voice_type']=='unnamed_report' and after['database_fields']=={'reporting_work_id':1,'originating_voice_type':'unattributed_group','originating_voice_name':None}
 for k in ('claim_id','state','target_table','staging_metadata','semantic_publication_hold','publication_ready'):assert before[k]==after[k]
 pr=row(payload,'108-T09');assert pr['proposed_payload']['voice']=={'reporting_work_id':1,'originating_voice_type':'unattributed_group','originating_voice_name':None}
 assert pr['statement_en']=="An interpretation attributed to unnamed Arabic-language scholars construes the bodily wording as facing the qibla with the upper chest."
 assert pr['plan_row']['evidence']['source_sha256']=='55143e1930f2511d2af04570d8e8e1091490c769829840a0ea03b92178992314' and pr['plan_row']['evidence']['normalized_arabic_anchor']=='استقبل القبلة بنحرك'
 assert pr['plan_row']['english_coverage']=='absent' and pr['plan_row']['transmission_route_state']=='not_applicable_no_transmitted_route'
 assert all(target[k] is False for k in ('database_written','publication_ready','chapter_complete'))

def validate(d,p,payload,life,adapter):
 assert d['schema_version']=='quranhikma-tabari-108-t11-projection-baseline-refresh-contract-v1' and (d['surah'],d['scholar_key'],d['hold_id'])==(108,'tabari','108-TABARI-SCHOLAR-H01')
 assert d['status']=='exact_projection_refresh_contract_built_not_applied_h01_active'
 b=d['basis'];assert b=={'repository_head':'ff98d6f9fde08f58d58ef82c558f18d5e6e918e8','payload_blob':PAYLOAD_PIN,'projection_path':'data/tafsir/staging/surah-108-voice-projection-2026-10-17.json','projection_current_blob':CURRENT,'projection_target_blob':TARGET,'pre_t09_payload_blob':PRE,'lifecycle_script_blob':'d28aad7abdbaa2132e4eb783c5eeff467f6d30df','plural_contract_blob':'171fbe9749e7deb0ca521a6f720df910ffe0dd6a','adapter_blob':'88c9a165c9e352dbfbd4cbb0f3de78851a7a6bf7','adapter_result_blob':'ef6eb151d6feb8f23ebd28d6ff7542f7baa58f03','adapter_validator_blob':'f232c2a12beb5f8ebecf07bb34769e66c309bc73','adapter_guard_run_id':43233250161,'adapter_guard_conclusion':'success'}
 assert blob(PROJ)==TARGET and blob(PAYLOAD)==PAYLOAD_PIN and blob(LIFE)==LIFE_APPLIED and blob(ADAPTER_RESULT)==ADAPTER_RESULT_APPLIED
 original=historical(p);validate_candidate(original,p,payload)
 t=d['exact_projection_transition'];assert t['changed_paths']==['inputs.assembly_blob_sha','rows[108-T09].database_fields.originating_voice_type','rows[108-T09].blockers']
 assert t['from']['assembly_blob_sha']==PRE and t['from']['t09_voice_type']=='unnamed_report' and len(t['from']['t09_blockers'])==4
 assert t['to']=={'assembly_blob_sha':PAYLOAD_PIN,'t09_voice_type':'unattributed_group','t09_originating_voice_name':None,'t09_blockers':['proposition_id unresolved until authorized proposition insertion','live source and full-payload validation pending']}
 assert t['unchanged_invariants']=={'projection_rows':74,'unrelated_projection_rows':73,'counts':{'total_claims':74,'projected':70,'unmapped':4,'rows_with_preserved_metadata':41,'semantic_holds':17},'t09_state':'staging_only_not_insertable','t09_target_table':'proposition_voice_chain','t09_reporting_work_id':1,'t09_staging_metadata':{},'t09_semantic_publication_hold':None,'t09_publication_ready':False,'database_written':False,'publication_ready':False,'chapter_complete':False}
 f=d['t09_fidelity'];assert f['statement_en']==row(payload,'108-T09')['statement_en'] and f['tafsir_entry_id']==5262 and f['source_sha256']=='55143e1930f2511d2af04570d8e8e1091490c769829840a0ea03b92178992314' and (f['raw_start'],f['raw_end'],f['normalized_arabic_anchor'])==(5515,5534,'استقبل القبلة بنحرك')
 assert f['contextual_attribution_ar']=='وكان بعض أهل العربية يتأوّل قوله' and f['english_witness_state']=='absent' and f['translation_status']=='controlled_research_translation_from_arabic' and f['mufassir_own_position']=='reported_only' and f['transmission_route_state']=='not_applicable_no_transmitted_route'
 pc=d['plural_consumer_preservation'];ao=adapter['adapter_output']['claims']
 for cid in ('108-T11A','108-T11C'):
  assert pc[cid]['consumer_view_sha256']==ao[cid]['consumer_view_sha256']
  assert pc[cid]['cardinalities']==ao[cid]['cardinalities']
 assert pc['108-T11C']['legacy_saved_hash']=='6624f5de8cb9634f41597c83af2c1b766aca47b9ceda27e183a9b4c8b12005f1' and pc['108-T11C']['full_report_hash']=='e2e3057e54e8d5b6578c72388178e03b00c0f5f1b68236ade34e909f5f36572e' and pc['108-T11C']['excluded_span']==[2567,2809]
 assert pc['all_other_projection_rows_unchanged'] is True and pc['evidence_links_routes_unchanged'] is True
 assert adapter['basis']['projection_blob']==TARGET and adapter['adapter_output']['assembly_alignment']['aligned'] is True
 plan=d['guard_compatible_integration_plan'];assert len(plan['atomic_files'])==6 and plan['lifecycle_new_state']=='exact_five_file_preview_plus_pinned_t09_payload_and_projection_transition' and plan['preserve_existing_states']==['original_unapplied','exact_five_file_preview','exact_five_file_preview_plus_pinned_t09_enum_transition']
 assert plan['adapter_post_refresh_state']=='aligned_true_with_identical_t11_consumer_views' and plan['workflow_yaml_change_required'] is False and plan['required_workflow_result']=='every triggered payload/projection workflow succeeds' and plan['revert_on_any_failure'] is True
 assert all(plan[k] is False for k in ('weaken_guard','bypass_guard','database_write','physical_id_allocation','hold_clearance'))
 assert len(d['explicit_disagreements_and_absences'])==4
 inv=d['lifecycle_invariants'];assert inv=={'historical_claims':74,'tabari_claims':18,'publication_ready_tabari_claims':0,'active_scholar_holds_before':48,'active_scholar_holds_after':48,'resolved_scholar_holds':0,'waived_scholar_holds':0,'physical_ids_allocated':0,'database_rows_changed':0,'database_written':False,'publication_ready':False,'scholar_complete':False,'chapter_complete':False,'advance_to_surah_107':False}
 n=d['selected_next_boundary'];assert n=={'kind':'tabari_h01_t11_guard_compatible_projection_refresh','claim_ids':['108-T09','108-T11A','108-T11C'],'write_mode':'repository_staging_only_atomic','hold_clearance_authorized':False,'database_write_authorized':False,'advance_to_surah_107':False}
 assert d['validation']=={'result':'PASS','validator':'scripts/validate-tabari-108-t11-projection-baseline-refresh-contract.py','unsafe_mutations_rejected':68,'unsafe_candidate_variants_rejected':10}
 assert d['database_written'] is False and d['database_write_count']==0 and d['publication_ready'] is False and d['scholar_complete'] is False and d['chapter_complete'] is False

def candidate_mutations(p):
 out=[]
 def add(mut):x=candidate(p);mut(x);out.append(x)
 add(lambda x:x['inputs'].update(assembly_blob_sha=PRE));add(lambda x:row(x,'108-T09')['database_fields'].update(originating_voice_type='exegete_own_view'));add(lambda x:row(x,'108-T09')['database_fields'].update(originating_voice_name='unknown'));add(lambda x:row(x,'108-T09').update(publication_ready=True));add(lambda x:row(x,'108-T09').update(state='complete'));add(lambda x:row(x,'108-T09')['blockers'].clear());add(lambda x:row(x,'108-T11A')['database_rows'].pop());add(lambda x:row(x,'108-T11C')['database_rows'].pop());add(lambda x:x['counts'].update(projected=71));add(lambda x:x.update(database_written=True));return out

def mutations(d):
 paths=[(['schema_version'],'bad'),(['surah'],107),(['scholar_key'],'other'),(['hold_id'],'bad'),(['status'],'complete'),(['basis','repository_head'],'0'*40),(['basis','payload_blob'],PRE),(['basis','projection_current_blob'],TARGET),(['basis','projection_target_blob'],CURRENT),(['basis','pre_t09_payload_blob'],PAYLOAD_PIN),(['basis','lifecycle_script_blob'],'0'*40),(['basis','plural_contract_blob'],'0'*40),(['basis','adapter_blob'],'0'*40),(['basis','adapter_result_blob'],'0'*40),(['basis','adapter_validator_blob'],'0'*40),(['basis','adapter_guard_run_id'],0),(['basis','adapter_guard_conclusion'],'failure'),(['exact_projection_transition','changed_paths'],[]),(['exact_projection_transition','from','assembly_blob_sha'],PAYLOAD_PIN),(['exact_projection_transition','from','t09_voice_type'],'unattributed_group'),(['exact_projection_transition','from','t09_blockers'],[]),(['exact_projection_transition','to','assembly_blob_sha'],PRE),(['exact_projection_transition','to','t09_voice_type'],'exegete_own_view'),(['exact_projection_transition','to','t09_originating_voice_name'],'unknown'),(['exact_projection_transition','to','t09_blockers'],[]),(['exact_projection_transition','unchanged_invariants','projection_rows'],73),(['exact_projection_transition','unchanged_invariants','unrelated_projection_rows'],72),(['exact_projection_transition','unchanged_invariants','counts','projected'],71),(['exact_projection_transition','unchanged_invariants','t09_state'],'complete'),(['exact_projection_transition','unchanged_invariants','t09_publication_ready'],True),(['t09_fidelity','statement_en'],'changed'),(['t09_fidelity','tafsir_entry_id'],5261),(['t09_fidelity','source_sha256'],'0'*64),(['t09_fidelity','raw_start'],0),(['t09_fidelity','raw_end'],0),(['t09_fidelity','normalized_arabic_anchor'],'changed'),(['t09_fidelity','contextual_attribution_ar'],'changed'),(['t09_fidelity','english_witness_state'],'present'),(['t09_fidelity','translation_status'],'bilingual'),(['t09_fidelity','mufassir_own_position'],'preferred'),(['t09_fidelity','transmission_route_state'],'present'),(['plural_consumer_preservation','108-T11A','consumer_view_sha256'],'0'*64),(['plural_consumer_preservation','108-T11A','cardinalities','voices'],1),(['plural_consumer_preservation','108-T11A','cardinalities','routes'],6),(['plural_consumer_preservation','108-T11C','consumer_view_sha256'],'0'*64),(['plural_consumer_preservation','108-T11C','cardinalities','voices'],1),(['plural_consumer_preservation','108-T11C','cardinalities','routes'],1),(['plural_consumer_preservation','108-T11C','legacy_saved_hash'],'0'*64),(['plural_consumer_preservation','108-T11C','full_report_hash'],'0'*64),(['plural_consumer_preservation','108-T11C','excluded_span'],[]),(['plural_consumer_preservation','all_other_projection_rows_unchanged'],False),(['plural_consumer_preservation','evidence_links_routes_unchanged'],False),(['guard_compatible_integration_plan','atomic_files'],[]),(['guard_compatible_integration_plan','lifecycle_new_state'],'bypass'),(['guard_compatible_integration_plan','preserve_existing_states'],[]),(['guard_compatible_integration_plan','adapter_post_refresh_state'],'lossy'),(['guard_compatible_integration_plan','workflow_yaml_change_required'],True),(['guard_compatible_integration_plan','revert_on_any_failure'],False),(['guard_compatible_integration_plan','weaken_guard'],True),(['guard_compatible_integration_plan','bypass_guard'],True),(['guard_compatible_integration_plan','database_write'],True),(['explicit_disagreements_and_absences'],[]),(['lifecycle_invariants','active_scholar_holds_after'],47),(['lifecycle_invariants','physical_ids_allocated'],1),(['lifecycle_invariants','database_written'],True),(['selected_next_boundary','kind'],'publish'),(['selected_next_boundary','database_write_authorized'],True),(['validation','unsafe_mutations_rejected'],67)]
 assert len(paths)==68;out=[]
 for path,val in paths:
  x=copy.deepcopy(d);q=x
  for k in path[:-1]:q=q[k]
  q[path[-1]]=val;out.append(x)
 return out

def main():
 d=json.loads(ART.read_text());p=json.loads(PROJ.read_text());payload=json.loads(PAYLOAD.read_text());life=LIFE.read_text();adapter=json.loads(ADAPTER_RESULT.read_text());validate(d,p,payload,life,adapter)
 rejected=0
 for x in mutations(d):
  try:validate(x,p,payload,life,adapter)
  except (AssertionError,KeyError):rejected+=1
 assert rejected==68
 crej=0
 original=historical(p)
 for x in candidate_mutations(original):
  try:validate_candidate(original,x,payload)
  except (AssertionError,KeyError):crej+=1
 assert crej==10
 print('PASS: exact 3-path projection refresh applied; 73 unrelated rows and T11 plural views preserved; 68/68 contract and 10/10 candidate mutations rejected; H01 active')
if __name__=='__main__':main()

#!/usr/bin/env python3
"""Validate the non-writing T11 operator/result contract."""
import copy,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'data/tafsir/staging/tabari-108-t11-operator-result-contract-2026-11-12.json'
FILES={'workflow':ROOT/'.github/workflows/tafsir-108-tabari-t11-publish.yml','publisher':ROOT/'scripts/publish-tabari-108-t11-five-table.py','offline_validator':ROOT/'scripts/validate-tabari-108-t11-five-table-publish-workflow.py','write_contract':ROOT/'data/tafsir/staging/tabari-108-t11-authorized-five-table-write-workflow-contract-2026-11-12.json','approval_review':ROOT/'data/tafsir/staging/tabari-108-t11-publish-approval-boundary-review-2026-11-12.json','dispatch_environment_recheck':ROOT/'data/tafsir/staging/tabari-108-t11-dispatch-authorization-environment-recheck-2026-11-12.json'}
def blob(p):
 r=p.read_bytes();return hashlib.sha1(b'blob '+str(len(r)).encode()+b'\0'+r).hexdigest()
def get(d,path):
 for k in path.split('.'):d=d[k]
 return d
EXP={'schema_version':'quranhikma-tabari-108-t11-operator-result-contract-v1','surah':108,'scholar_key':'tabari','hold_id':'108-TABARI-SCHOLAR-H01','status':'nonwriting_operator_result_contract_built_dispatch_blocked_h01_active',
'basis.repository_head':'858bbfc6e49ac7baffc0b0a9394939ad98de53ad','basis.head_guard_run_id':43349859973,'basis.head_guard_conclusion':'success','basis.workflow_blob':'2486b87c9c532445c7c4a43a7f4af17bd3ab1e45','basis.publisher_blob':'0cf596f656d5ee10d4e50f688cdba7df87746d3f','basis.offline_validator_blob':'edd4517057e6bcc13c72bd993a104983d0ef5fcf','basis.write_contract_blob':'3432c88adf1e486136ca75836a4ffc5fd1a31ea2','basis.approval_review_blob':'8aae23ce4749706b673aeef30ebedc3ed2d7659c','basis.dispatch_environment_recheck_blob':'f6d1442463ab745c9dd42e7e4462b44f8972f79a',
'current_authorization.workflow_dispatch_authorized':False,'current_authorization.database_write_authorized':False,'current_authorization.separate_explicit_dispatch_authorization_observed':False,'current_authorization.environment_binding_verified':False,'current_authorization.operator_execution_authorized':False,'current_authorization.contract_creation_authorized':True,'current_authorization.verdict':'contract_only_do_not_dispatch',
'source_fidelity.source_entry_id':5263,'source_fidelity.source_identity.sura':108,'source_fidelity.source_identity.aya':3,'source_fidelity.source_identity.scholar_key':'tabari','source_fidelity.source_identity.language':'ar','source_fidelity.full_content_sha256':'dd11e99471301b8b2044d0dddb518a375a69b4c4e8d654ac966ecc1ee46da988','source_fidelity.arabic_locator_count':8,'source_fidelity.source_english_present':False,'source_fidelity.english_rendering_kind':'controlled_research_paraphrase','source_fidelity.explicit_disagreements_and_absences_preserved':True,'source_fidelity.t11c_excluded_report_remains_excluded':True,'source_fidelity.attribution_limits_preserved':True,
'write_expectation.post_one_row_at_a_time':True,'write_expectation.upsert_forbidden':True,'write_expectation.patch_forbidden':True,'write_expectation.preexisting_row_reuse_forbidden':True,'write_expectation.created_parent_ownership_required':True,'write_expectation.full_readback_required':True,
'result_record_requirements.persist_only_after_job_finishes':True,'result_record_requirements.exact_commit_binding_required':True,'result_record_requirements.never_claim_completion':True,'result_record_requirements.never_clear_or_waive_h01':True,'result_record_requirements.never_advance_to_surah_107':True,
'lifecycle_invariants.historical_claims':74,'lifecycle_invariants.active_scholar_holds_before':48,'lifecycle_invariants.active_scholar_holds_after':48,'lifecycle_invariants.resolved_scholar_holds':0,'lifecycle_invariants.waived_scholar_holds':0,'lifecycle_invariants.h01_status':'active','lifecycle_invariants.publication_ready':False,'lifecycle_invariants.scholar_complete':False,'lifecycle_invariants.chapter_complete':False,'lifecycle_invariants.advance_to_surah_107':False,
'execution.workflow_dispatched':False,'execution.database_requests_executed':0,'execution.database_written':False,'execution.physical_ids_allocated':0,'execution.protected_secret_value_recorded':False}
BASE={'tabari':18,'ibn_kathir':15,'qurtubi':23,'jalalayn':5,'saadi':6,'tanwir_disputed_attribution':7}
ROWS={'propositions':2,'proposition_voice_chain':6,'evidence_units':8,'proposition_evidence':8,'evidence_transmission_routes':9,'total':33}
ORDER=['evidence_transmission_routes','proposition_evidence','proposition_voice_chain','evidence_units','propositions']
STATES={'blocked_before_write','written_readback_verified_h01_active','failure_cleaned_to_zero','cleanup_blocked_manual_review'}
def validate(d):
 for p,v in EXP.items():
  if get(d,p)!=v:raise ValueError(p)
 if d['claim_ids']!=['108-T11A','108-T11C'] or d['six_scholar_baseline']!=BASE:raise ValueError('baseline')
 if d['write_expectation']['rows']!=ROWS or d['write_expectation']['reverse_cleanup_order']!=ORDER:raise ValueError('write plan')
 if set(d['allowed_result_states'])!=STATES:raise ValueError('states')
 if [p['id'] for p in d['operator_preconditions']]!=[f'P0{i}' for i in range(1,8)]:raise ValueError('preconditions')
 if d['operator_preconditions'][2]['state']!='unsatisfied' or d['operator_preconditions'][3]['state']!='unverified':raise ValueError('authorization preconditions')
 loc=d['source_fidelity']['locators']
 if len(loc)!=8 or len({x['symbolic_handle'] for x in loc})!=8:raise ValueError('locator cardinality')
 for x in loc:
  if x['entry_id']!=5263 or x['end_codepoint']-x['start_codepoint']!=len(x['arabic']) or hashlib.sha256(x['arabic'].encode()).hexdigest()!=x['sha256']:raise ValueError('locator fidelity')
 forbidden=set(d['result_record_requirements']['forbidden_fields'])
 if not {'SUPABASE_SERVICE_KEY','apikey','Authorization','credential','secret_value'}<=forbidden:raise ValueError('secret fields')
def main():
 d=json.loads(ART.read_text());validate(d)
 keys={'workflow':'workflow_blob','publisher':'publisher_blob','offline_validator':'offline_validator_blob','write_contract':'write_contract_blob','approval_review':'approval_review_blob','dispatch_environment_recheck':'dispatch_environment_recheck_blob'}
 for name,key in keys.items():assert blob(FILES[name])==d['basis'][key]
 rejected=0
 for path in EXP:
  bad=copy.deepcopy(d);cur=bad;parts=path.split('.')
  for k in parts[:-1]:cur=cur[k]
  old=cur[parts[-1]];cur[parts[-1]]=not old if isinstance(old,bool) else ('tampered' if isinstance(old,str) else old+1)
  try:validate(bad)
  except (ValueError,KeyError,TypeError):rejected+=1
  else:raise AssertionError('unsafe mutation '+path)
 print(f'PASS: non-writing operator/result contract, 8 Arabic locators, 33-row expectation, {rejected}/{len(EXP)} unsafe mutations rejected; dispatch remains blocked')
if __name__=='__main__':main()

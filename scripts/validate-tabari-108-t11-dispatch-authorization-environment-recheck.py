#!/usr/bin/env python3
"""Validate the non-writing T11 dispatch-authorization/environment recheck."""
import copy,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'data/tafsir/staging/tabari-108-t11-dispatch-authorization-environment-recheck-2026-11-12.json'
REVIEW=ROOT/'data/tafsir/staging/tabari-108-t11-publish-approval-boundary-review-2026-11-12.json'
CONTRACT=ROOT/'data/tafsir/staging/tabari-108-t11-authorized-five-table-write-workflow-contract-2026-11-12.json'
WORKFLOW=ROOT/'.github/workflows/tafsir-108-tabari-t11-publish.yml'
PUBLISHER=ROOT/'scripts/publish-tabari-108-t11-five-table.py'
OFFLINE=ROOT/'scripts/validate-tabari-108-t11-five-table-publish-workflow.py'
def blob(p):
 r=p.read_bytes();return hashlib.sha1(b'blob '+str(len(r)).encode()+b'\0'+r).hexdigest()
def get(d,path):
 for k in path.split('.'):d=d[k]
 return d
EXPECTED={
'schema_version':'quranhikma-tabari-108-t11-dispatch-authorization-environment-recheck-v1','surah':108,'scholar_key':'tabari','hold_id':'108-TABARI-SCHOLAR-H01',
'status':'dispatch_authorization_absent_environment_binding_unverified_workflow_undispatched_h01_active',
'repository_observation.observed_head':'1df8caa512383a13afb3df7cc61758ba59b415c1','repository_observation.head_matches_saved_checkpoint':True,
'repository_observation.head_guard_run_id':43333817091,'repository_observation.head_guard_conclusion':'success',
'repository_observation.publication_workflow_run_observed':False,'repository_observation.duplicate_job_observed':False,
'governing_inputs.approval_boundary_review_blob':'8aae23ce4749706b673aeef30ebedc3ed2d7659c','governing_inputs.write_contract_blob':'3432c88adf1e486136ca75836a4ffc5fd1a31ea2',
'governing_inputs.workflow_blob':'2486b87c9c532445c7c4a43a7f4af17bd3ab1e45','governing_inputs.publisher_blob':'0cf596f656d5ee10d4e50f688cdba7df87746d3f','governing_inputs.offline_validator_blob':'edd4517057e6bcc13c72bd993a104983d0ef5fcf',
'authorization_recheck.contract_workflow_dispatch_authorized':False,'authorization_recheck.contract_database_write_authorized':False,
'authorization_recheck.contract_dispatch_authorized_by_this_contract':False,'authorization_recheck.separate_explicit_dispatch_authorization_in_checkpoint_chain':False,
'authorization_recheck.implementation_or_validation_implies_dispatch_authorization':False,'authorization_recheck.prior_live_all_absent_result_implies_dispatch_authorization':False,
'authorization_recheck.approval_rejection_bypass_forbidden':True,'authorization_recheck.verdict':'blocked_no_separate_explicit_dispatch_authorization',
'environment_recheck.workflow_job_environment_binding_present':False,'environment_recheck.workflow_environment_name':None,
'environment_recheck.repository_environment_inventory_verified':False,'environment_recheck.verdict':'unverified_do_not_dispatch',
'verified_nonwriting_controls.trigger':'workflow_dispatch_only','verified_nonwriting_controls.push_trigger_present':False,
'verified_nonwriting_controls.permissions.contents':'read','verified_nonwriting_controls.exact_commit_confirmation_required':True,
'verified_nonwriting_controls.exact_apply_phrase':'APPLY_T11A_T11C_33_ROWS','verified_nonwriting_controls.protected_secret_name':'SUPABASE_SERVICE_KEY',
'verified_nonwriting_controls.protected_secret_value_recorded':False,'verified_nonwriting_controls.same_job_fresh_all_absent_gate_required':True,
'verified_nonwriting_controls.created_parent_ownership_required':True,'verified_nonwriting_controls.reverse_cleanup_repaired_and_validated':True,
'verified_nonwriting_controls.full_readback_required':True,'verified_nonwriting_controls.planned_rows':33,'verified_nonwriting_controls.arabic_locator_count':8,
'verified_nonwriting_controls.source_entry_id':5263,'verified_nonwriting_controls.source_english_present':False,
'fidelity_and_scope.historical_claims':74,'fidelity_and_scope.controlled_english_renderings_only':True,
'fidelity_and_scope.explicit_disagreements_and_absences_preserved':True,'fidelity_and_scope.t11c_excluded_report_remains_excluded':True,'fidelity_and_scope.attribution_limits_preserved':True,
'result.workflow_dispatched':False,'result.database_requests_executed':0,'result.database_written':False,'result.physical_ids_allocated':0,
'result.active_scholar_holds':48,'result.h01_status':'active','result.h01_resolved':False,'result.h01_waived':False,
'result.publication_ready':False,'result.scholar_complete':False,'result.chapter_complete':False,'result.advance_to_surah_107':False,
}
BASE={'tabari':18,'ibn_kathir':15,'qurtubi':23,'jalalayn':5,'saadi':6,'tanwir_disputed_attribution':7}
def validate(d):
 for path,value in EXPECTED.items():
  if get(d,path)!=value:raise ValueError(path)
 if d['claim_ids']!=['108-T11A','108-T11C']:raise ValueError('claim_ids')
 if d['six_scholar_baseline']!=BASE:raise ValueError('six_scholar_baseline')
 if not d['environment_recheck']['inventory_limitation'] or not d['environment_recheck']['safe_action']:raise ValueError('environment_explanation')
 if not d['next_step'].startswith('Keep the workflow undispatched.'):raise ValueError('next_step')
def main():
 d=json.loads(ART.read_text());validate(d)
 assert blob(REVIEW)==d['governing_inputs']['approval_boundary_review_blob']
 assert blob(CONTRACT)==d['governing_inputs']['write_contract_blob']
 assert blob(WORKFLOW)==d['governing_inputs']['workflow_blob']
 assert blob(PUBLISHER)==d['governing_inputs']['publisher_blob']
 assert blob(OFFLINE)==d['governing_inputs']['offline_validator_blob']
 c=json.loads(CONTRACT.read_text())
 assert c['authorization_boundary']['workflow_dispatch_authorized'] is False
 assert c['authorization_boundary']['database_write_authorized'] is False
 assert c['planned_workflow']['dispatch_authorized_by_this_contract'] is False
 w=WORKFLOW.read_text();assert 'workflow_dispatch:' in w and 'push:' not in w and 'schedule:' not in w
 assert '\n    environment:' not in w and '\n  environment:' not in w
 rejected=0
 for path in EXPECTED:
  bad=copy.deepcopy(d);cur=bad;parts=path.split('.')
  for k in parts[:-1]:cur=cur[k]
  old=cur[parts[-1]];cur[parts[-1]]=True if old is None else (not old if isinstance(old,bool) else ('tampered' if isinstance(old,str) else old+1))
  try:validate(bad)
  except (ValueError,KeyError,TypeError):rejected+=1
  else:raise AssertionError('unsafe mutation accepted '+path)
 print(f'PASS: dispatch remains blocked, environment binding unverified, {rejected}/{len(EXPECTED)} unsafe mutations rejected; no workflow dispatch or database request')
if __name__=='__main__':main()

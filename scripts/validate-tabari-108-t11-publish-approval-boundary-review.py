#!/usr/bin/env python3
"""Validate the T11 publish approval-boundary review and its non-dispatch verdict."""
import copy, hashlib, importlib.util, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'data/tafsir/staging/tabari-108-t11-publish-approval-boundary-review-2026-11-12.json'
WORKFLOW=ROOT/'.github/workflows/tafsir-108-tabari-t11-publish.yml'
PUBLISHER=ROOT/'scripts/publish-tabari-108-t11-five-table.py'
OFFLINE=ROOT/'scripts/validate-tabari-108-t11-five-table-publish-workflow.py'
CONTRACT=ROOT/'data/tafsir/staging/tabari-108-t11-authorized-five-table-write-workflow-contract-2026-11-12.json'

def blob(path):
 raw=path.read_bytes(); return hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()

def get(d,path):
 for key in path.split('.'): d=d[key]
 return d

EXPECTED={
 'schema_version':'quranhikma-tabari-108-t11-publish-approval-boundary-review-v1',
 'surah':108,
 'status':'publish_workflow_implementation_verified_dispatch_blocked_separate_authorization_required_h01_active',
 'repository_state.reviewed_head':'89499611468d90acbfa588ee8c3886c42f2856ca',
 'repository_state.head_changed_since_implementation':False,
 'repository_state.implementation_guard_run_id':43325908169,
 'repository_state.implementation_guard_conclusion':'success',
 'repository_state.publication_workflow_runs_observed_for_reviewed_head':0,
 'repository_state.duplicate_job_observed':False,
 'reviewed_implementation.workflow_blob':'2486b87c9c532445c7c4a43a7f4af17bd3ab1e45',
 'reviewed_implementation.publisher_blob':'0cf596f656d5ee10d4e50f688cdba7df87746d3f',
 'reviewed_implementation.offline_validator_blob':'edd4517057e6bcc13c72bd993a104983d0ef5fcf',
 'reviewed_implementation.write_contract_blob':'3432c88adf1e486136ca75836a4ffc5fd1a31ea2',
 'reviewed_implementation.approval_review_repair.repaired':True,
 'reviewed_implementation.approval_review_repair.post_repair_offline_validation':'pass',
 'verified_controls.trigger':'workflow_dispatch_only',
 'verified_controls.push_trigger_present':False,
 'verified_controls.schedule_trigger_present':False,
 'verified_controls.permissions.contents':'read',
 'verified_controls.concurrency_group':'tafsir-108-tabari-t11-publish',
 'verified_controls.cancel_in_progress':False,
 'verified_controls.exact_commit_confirmation_required':True,
 'verified_controls.exact_apply_phrase':'APPLY_T11A_T11C_33_ROWS',
 'verified_controls.protected_secret_name':'SUPABASE_SERVICE_KEY',
 'verified_controls.protected_secret_value_recorded':False,
 'verified_controls.same_job_fresh_all_absent_gate.absent':33,
 'verified_controls.same_job_fresh_all_absent_gate.exact_matches':0,
 'verified_controls.same_job_fresh_all_absent_gate.conflicts':0,
 'verified_controls.same_job_fresh_all_absent_gate.source_entry_id':5263,
 'verified_controls.same_job_fresh_all_absent_gate.arabic_locators':8,
 'verified_controls.write_plan.total':33,
 'verified_controls.created_parent_ownership_ledger':True,
 'verified_controls.full_readback_required':True,
 'verified_controls.offline_rollback_failure_points_verified':32,
 'verified_controls.offline_unsafe_scenarios_rejected':36,
 'fidelity_and_scope.historical_claims':74,
 'fidelity_and_scope.source_entry_id':5263,
 'fidelity_and_scope.arabic_locator_count':8,
 'fidelity_and_scope.source_english_present':False,
 'fidelity_and_scope.controlled_english_renderings_only':True,
 'fidelity_and_scope.explicit_disagreements_and_absences_preserved':True,
 'fidelity_and_scope.t11c_excluded_report_remains_excluded':True,
 'fidelity_and_scope.attribution_limits_preserved':True,
 'authorization_boundary.governing_contract_workflow_dispatch_authorized':False,
 'authorization_boundary.governing_contract_database_write_authorized':False,
 'authorization_boundary.governing_contract_dispatch_authorized_by_this_contract':False,
 'authorization_boundary.separate_explicit_dispatch_authorization_observed':False,
 'authorization_boundary.environment_approval_requirement_verified':False,
 'authorization_boundary.approval_rejection_bypass_forbidden':True,
 'authorization_boundary.dispatch_performed':False,
 'authorization_boundary.database_requests_executed':0,
 'authorization_boundary.database_written':False,
 'authorization_boundary.physical_ids_allocated':0,
 'authorization_boundary.verdict':'blocked_do_not_dispatch',
 'lifecycle_invariants.active_scholar_holds_before':48,
 'lifecycle_invariants.active_scholar_holds_after':48,
 'lifecycle_invariants.resolved_scholar_holds':0,
 'lifecycle_invariants.waived_scholar_holds':0,
 'lifecycle_invariants.h01_status':'active',
 'lifecycle_invariants.publication_ready':False,
 'lifecycle_invariants.scholar_complete':False,
 'lifecycle_invariants.chapter_complete':False,
 'lifecycle_invariants.advance_to_surah_107':False,
}
ORDER=['evidence_transmission_routes','proposition_evidence','proposition_voice_chain','evidence_units','propositions']

def validate(d):
 for path,value in EXPECTED.items():
  if get(d,path)!=value: raise ValueError(path)
 if d['claim_ids']!=['108-T11A','108-T11C']: raise ValueError('claim_ids')
 if d['verified_controls']['reverse_cleanup_order']!=ORDER: raise ValueError('reverse_cleanup_order')
 if d['reviewed_implementation']['approval_review_repair']['required_reverse_order']!=ORDER: raise ValueError('repair_order')
 if d['fidelity_and_scope']['six_scholar_baseline']!={'tabari':18,'ibn_kathir':15,'qurtubi':23,'jalalayn':5,'saadi':6,'tanwir_disputed_attribution':7}: raise ValueError('six_scholar_baseline')
 if d['verified_controls']['write_plan']!={'propositions':2,'proposition_voice_chain':6,'evidence_units':8,'proposition_evidence':8,'evidence_transmission_routes':9,'total':33}: raise ValueError('write_plan')

def main():
 d=json.loads(ART.read_text()); validate(d)
 assert blob(WORKFLOW)==d['reviewed_implementation']['workflow_blob']
 assert blob(PUBLISHER)==d['reviewed_implementation']['publisher_blob']
 assert blob(OFFLINE)==d['reviewed_implementation']['offline_validator_blob']
 assert blob(CONTRACT)==d['reviewed_implementation']['write_contract_blob']
 text=WORKFLOW.read_text(); assert 'workflow_dispatch:' in text and 'push:' not in text and 'schedule:' not in text
 assert 'secrets.SUPABASE_SERVICE_KEY' in text and 'permissions:\n  contents: read' in text
 spec=importlib.util.spec_from_file_location('publisher',PUBLISHER); m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
 assert list(m.REVERSE_ORDER)==ORDER and m.CONFIRM_PHRASE=='APPLY_T11A_T11C_33_ROWS'
 contract=json.loads(CONTRACT.read_text())
 assert contract['authorization_boundary']['workflow_dispatch_authorized'] is False
 assert contract['authorization_boundary']['database_write_authorized'] is False
 assert contract['planned_workflow']['dispatch_authorized_by_this_contract'] is False
 rejected=0
 for path in EXPECTED:
  bad=copy.deepcopy(d); parent=bad; parts=path.split('.')
  for key in parts[:-1]: parent=parent[key]
  current=parent[parts[-1]]; parent[parts[-1]]=not current if isinstance(current,bool) else ('tampered' if isinstance(current,str) else current+1)
  try: validate(bad)
  except (ValueError,KeyError,TypeError): rejected+=1
  else: raise AssertionError('unsafe mutation accepted: '+path)
 print(f'PASS: approval boundary remains blocked, exact reverse cleanup repaired, {rejected}/{len(EXPECTED)} unsafe mutations rejected; no dispatch or database request')
if __name__=='__main__': main()

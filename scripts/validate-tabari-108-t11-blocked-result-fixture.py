#!/usr/bin/env python3
"""Validate the non-executing blocked-before-write T11 result fixture."""
import copy,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
FIX=ROOT/'data/tafsir/staging/tabari-108-t11-blocked-result-fixture-2026-11-12.json'
CON=ROOT/'data/tafsir/staging/tabari-108-t11-operator-result-contract-2026-11-12.json'
def blob(p):
 r=p.read_bytes();return hashlib.sha1(b'blob '+str(len(r)).encode()+b'\0'+r).hexdigest()
def get(d,path):
 for k in path.split('.'):d=d[k]
 return d
EXP={'schema_version':'quranhikma-tabari-108-t11-blocked-result-fixture-v1','record_kind':'nonexecuting_fixture','surah':108,'scholar_key':'tabari','hold_id':'108-TABARI-SCHOLAR-H01','status':'blocked_before_write_fixture_validated_not_a_workflow_run_h01_active','contract.blob':'9eb271171c971102174d603eb9a290cb7a71d4ec','fixture_identity.nonexecuting':True,'fixture_identity.workflow_run_id':None,'fixture_identity.workflow_commit':'8c0ca94734fda5ca43f00ad9cb710273b0b04f0d','fixture_identity.started_at':None,'fixture_identity.finished_at':None,'fixture_identity.real_workflow_result':False,'fixture_identity.valid_for_database_state_claim':False,'fixture_identity.valid_for_completion_claim':False,'result_state':'blocked_before_write','fresh_gate_summary.state':'not_run','fresh_gate_summary.absent':None,'fresh_gate_summary.exact_matches':None,'fresh_gate_summary.conflicts':None,'source_entry_id':5263,'source_identity.sura':108,'source_identity.aya':3,'source_identity.scholar_key':'tabari','source_identity.language':'ar','source_revalidated_in_this_fixture':False,'locator_count':8,'locators_revalidated_in_this_fixture':0,'source_english_present':False,'planned_rows':33,'created_rows':0,'cleanup_attempted':False,'cleanup_verified':None,'database_requests_executed':0,'database_written':False,'physical_ids_allocated':0,'protected_secret_used':False,'protected_secret_value_recorded':False,'forbidden_secret_fields_present':False,'h01_status':'active','publication_ready':False,'scholar_complete':False,'chapter_complete':False,'advance_to_surah_107':False,'explicit_disagreements_and_absences_preserved':True,'attribution_limits_preserved':True,'t11c_excluded_report_remains_excluded':True}
BASE={'tabari':18,'ibn_kathir':15,'qurtubi':23,'jalalayn':5,'saadi':6,'tanwir_disputed_attribution':7}
COUNTS={'propositions':2,'proposition_voice_chain':6,'evidence_units':8,'proposition_evidence':8,'evidence_transmission_routes':9}
ZERO={**{k:0 for k in COUNTS},'total':0}
def validate(d,contract):
 for p,v in EXP.items():
  if get(d,p)!=v:raise ValueError(p)
 if d['claim_ids']!=['108-T11A','108-T11C'] or d['six_scholar_baseline']!=BASE:raise ValueError('baseline')
 if d['planned_table_counts']!=COUNTS or d['readback_counts']!=ZERO or d['created_ids']!=[]:raise ValueError('counts')
 if [b['code'] for b in d['blockers']]!=['DISPATCH_AUTHORIZATION_ABSENT','ENVIRONMENT_BINDING_UNVERIFIED'] or any(b['resolved'] for b in d['blockers']):raise ValueError('blockers')
 state=contract['allowed_result_states']['blocked_before_write']
 for k,v in state.items():
  if d[k]!=v:raise ValueError('state '+k)
 required=contract['result_record_requirements']['required_nonsecret_fields']
 if any(k not in d and k not in d['fixture_identity'] for k in required):raise ValueError('required fields')
 forbidden=set(contract['result_record_requirements']['forbidden_fields'])
 def keys(x):
  if isinstance(x,dict):
   for k,v in x.items():yield k;yield from keys(v)
  elif isinstance(x,list):
   for v in x:yield from keys(v)
 if forbidden & set(keys(d)):raise ValueError('forbidden secret key')
def main():
 d=json.loads(FIX.read_text());c=json.loads(CON.read_text());validate(d,c)
 assert blob(CON)==d['contract']['blob']
 assert c['current_authorization']['operator_execution_authorized'] is False
 rejected=0
 for path in EXP:
  bad=copy.deepcopy(d);cur=bad;parts=path.split('.')
  for k in parts[:-1]:cur=cur[k]
  old=cur[parts[-1]];cur[parts[-1]]=True if old is None else (not old if isinstance(old,bool) else ('tampered' if isinstance(old,str) else old+1))
  try:validate(bad,c)
  except (ValueError,KeyError,TypeError):rejected+=1
  else:raise AssertionError('unsafe mutation '+path)
 print(f'PASS: non-executing blocked-before-write fixture, 0 database requests, {rejected}/{len(EXP)} unsafe mutations rejected; not a live result')
if __name__=='__main__':main()

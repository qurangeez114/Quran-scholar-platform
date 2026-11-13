#!/usr/bin/env python3
"""Validate the isolated Surah 108 guard timeout repair."""
import copy,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'data/tafsir/staging/surah-108-i01-guard-timeout-repair-2026-11-12.json'
WF=ROOT/'.github/workflows/tafsir-108-i01-preview-preflight.yml'
def blob(raw):return hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
def get(d,path):
 for k in path.split('.'):d=d[k]
 return d
EXP={'schema_version':'quranhikma-surah-108-i01-guard-timeout-repair-v1','surah':108,'status':'guard_timeout_repaired_no_validation_logic_or_database_change',
'basis.repository_head':'8e64cb4ab05ca716114c6693fdac56b8e6391f6a','basis.cancelled_run_id':43341412049,'basis.cancelled_job_id':131610375019,'basis.run_conclusion':'cancelled','basis.successful_steps_before_cancellation':18,'basis.cancelled_step':'Read pinned post-I02 baseline for historical guards','basis.cancellation_message':'The operation was canceled.',
'repair.before_blob':'b7d3e376a27cd795fe681df2421c7da411b407e9','repair.after_blob':'e076f727b06c3e325ea5e84c3a75367731158142','repair.before_timeout_minutes':3,'repair.after_timeout_minutes':10,'repair.validation_steps_changed':False,'repair.baseline_refs_changed':False,'repair.trigger_paths_changed':False,'repair.permissions_changed':False,'repair.concurrency_changed':False,'repair.cancel_in_progress':False,
'safety.workflow_dispatch_performed':False,'safety.publication_workflow_dispatched':False,'safety.database_requests_executed':0,'safety.database_written':False,'safety.physical_ids_allocated':0,'safety.protected_secret_value_recorded':False,'safety.approval_rejection_bypassed':False,
'project_invariants.historical_claims':74,'project_invariants.arabic_locator_count':8,'project_invariants.source_entry_id':5263,'project_invariants.source_english_present':False,'project_invariants.active_scholar_holds':48,'project_invariants.h01_status':'active','project_invariants.publication_ready':False,'project_invariants.scholar_complete':False,'project_invariants.chapter_complete':False,'project_invariants.advance_to_surah_107':False}
BASE={'tabari':18,'ibn_kathir':15,'qurtubi':23,'jalalayn':5,'saadi':6,'tanwir_disputed_attribution':7}
def validate(d):
 for p,v in EXP.items():
  if get(d,p)!=v:raise ValueError(p)
 if d['repair']['changed_fields']!=['jobs.preview.timeout-minutes']:raise ValueError('changed_fields')
 if d['basis']['skipped_validation_steps']!=['Validate exact I02 coordinated transition','Validate exact I03 coordinated transition','Validate exact I04A five-file repair']:raise ValueError('skipped_steps')
 if d['project_invariants']['six_scholar_baseline']!=BASE:raise ValueError('baseline')
def main():
 d=json.loads(ART.read_text());validate(d)
 raw=WF.read_bytes();assert raw.count(b'timeout-minutes: 10')==1 and b'timeout-minutes: 3' not in raw
 assert blob(raw)==d['repair']['after_blob']
 before=raw.replace(b'timeout-minutes: 10',b'timeout-minutes: 3');assert blob(before)==d['repair']['before_blob']
 assert b'cancel-in-progress: false' in raw and b'permissions:\n  contents: read' in raw
 rejected=0
 for path in EXP:
  bad=copy.deepcopy(d);cur=bad;parts=path.split('.')
  for k in parts[:-1]:cur=cur[k]
  old=cur[parts[-1]];cur[parts[-1]]=not old if isinstance(old,bool) else ('tampered' if isinstance(old,str) else old+1)
  try:validate(bad)
  except (ValueError,KeyError,TypeError):rejected+=1
  else:raise AssertionError('unsafe mutation '+path)
 print(f'PASS: isolated 3-to-10-minute guard timeout repair; {rejected}/{len(EXP)} unsafe mutations rejected; no publication or database action')
if __name__=='__main__':main()

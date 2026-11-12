#!/usr/bin/env python3
"""Build a deterministic symbolic five-table lifecycle preview; never writes files or SQL."""
import argparse,copy,hashlib,json
from pathlib import Path
CONTRACT='tabari-108-t11-plural-consumer-lifecycle-contract-2026-11-12.json';PIN='642283f614be74fe36e99263e14998f3016890c8';CLAIMS=('108-T11A','108-T11C')
def git_blob(raw):return hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
def check(x,msg):
 if not x:raise ValueError(msg)
def load(root):
 p=Path(root)/'data/tafsir/staging'/CONTRACT;raw=p.read_bytes();check(git_blob(raw)==PIN,'contract pin drift');return json.loads(raw)
def ph(table,key):return f'symbolic:{table}:{key}'
def build(c):
 before=copy.deepcopy(c);check(c['status']=='plural_consumer_lifecycle_contract_built_not_applied_h01_active','contract state');check(c['basis']['projection_refresh_guard_conclusion']=='success','guard state')
 check(c['preflight_and_failure_contract']['direct_database_write_authorized'] is False,'direct database authorization')
 check(c['database_written'] is False and c['database_write_count']==0,'contract database write state')
 check(c['publication_ready'] is False and c['scholar_complete'] is False and c['chapter_complete'] is False,'contract completion state')
 check(c['lifecycle_invariants']['physical_ids_allocated']==0 and c['lifecycle_invariants']['database_rows_changed']==0 and c['lifecycle_invariants']['database_written'] is False,'lifecycle write state')
 batches={k:[] for k in ('propositions','proposition_voice_chain','evidence_units','proposition_evidence','evidence_transmission_routes')};claim_counts={};handles={'propositions':{},'evidence_units':{}}
 for cid in CLAIMS:
  x=c['claims'][cid];check(x['publication_ready'] is False,'claim publication state');check(x['proposition']['physical_id'] is None,'proposition physical id');pk=x['proposition']['staging_key'];p_handle=ph('propositions',pk);handles['propositions'][pk]=p_handle
  batches['propositions'].append({'claim_id':cid,'symbolic_handle':p_handle,'database_fields':copy.deepcopy(x['proposition']['database_fields']),'physical_id':None,'insertable':False})
  for v in x['voices']:
   check(v['staging_metadata']['proposition_ref']==pk,'voice cross-reference');batches['proposition_voice_chain'].append({'claim_id':cid,'staging_key':v['staging_metadata']['staging_key'],'proposition_id_symbolic_handle':p_handle,'database_fields_without_proposition_id':copy.deepcopy(v['database_fields']),'physical_proposition_id':None,'insertable':False})
  local_evidence=set()
  for e in x['evidence_units']:
   check(e['physical_id'] is None,'evidence physical id')
   ek=e['staging_metadata']['staging_key'];e_handle=ph('evidence_units',ek);handles['evidence_units'][ek]=e_handle;batches['evidence_units'].append({'claim_id':cid,'symbolic_handle':e_handle,'database_fields':copy.deepcopy(e['database_fields']),'source_locator_metadata':copy.deepcopy(e['staging_metadata']['source_locator']),'physical_id':None,'insertable':False})
   local_evidence.add(ek)
  for z in x['links']:
   m=z['staging_metadata'];check(m['proposition_ref']==pk and m['evidence_unit_ref'] in local_evidence,'link reference');batches['proposition_evidence'].append({'claim_id':cid,'proposition_id_symbolic_handle':p_handle,'evidence_unit_id_symbolic_handle':handles['evidence_units'][m['evidence_unit_ref']],'database_fields_without_foreign_keys':copy.deepcopy(z['database_fields']),'physical_proposition_id':None,'physical_evidence_unit_id':None,'insertable':False})
  for z in x['routes']:
   m=z['staging_metadata'];check(m['evidence_unit_ref'] in local_evidence,'route reference');batches['evidence_transmission_routes'].append({'claim_id':cid,'staging_key':m['staging_key'],'evidence_unit_id_symbolic_handle':handles['evidence_units'][m['evidence_unit_ref']],'database_fields_without_evidence_unit_id':copy.deepcopy(z['database_fields']),'staging_qualification':m.get('staging_qualification'),'physical_evidence_unit_id':None,'insertable':False})
  observed={'propositions':1,'voices':len(x['voices']),'evidence_units':len(x['evidence_units']),'links':len(x['links']),'routes':len(x['routes'])};check(x['cardinalities']==observed,'claim cardinality');claim_counts[cid]=copy.deepcopy(observed)
 expected={'propositions':2,'proposition_voice_chain':6,'evidence_units':8,'proposition_evidence':8,'evidence_transmission_routes':9};check({k:len(v) for k,v in batches.items()}==expected,'batch cardinality')
 check(len(set(handles['propositions'].values()))==2 and len(set(handles['evidence_units'].values()))==8,'handle uniqueness')
 check(all(not r['insertable'] for rows in batches.values() for r in rows),'insertability')
 packed=json.dumps(batches,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()
 out={'status':'PASS','mode':'non_applying_symbolic_lifecycle_preview','contract_blob':PIN,'symbolic_handles':handles,'table_batches':batches,'expected_readback_cardinalities':expected,'claim_cardinalities':claim_counts,'batch_sha256':hashlib.sha256(packed).hexdigest(),'physical_ids_allocated':0,'files_changed':False,'database_written':False,'publication_ready':False,'chapter_complete':False}
 check(c==before,'input mutation');return out
def self_test(c):
 expected=build(c);cases=[]
 def add(mut):x=copy.deepcopy(c);mut(x);cases.append(x)
 add(lambda x:x.update(status='complete'));add(lambda x:x['basis'].update(projection_refresh_guard_conclusion='failure'));add(lambda x:x['claims']['108-T11A']['voices'][0]['staging_metadata'].update(proposition_ref='108-T11C-P'));add(lambda x:x['claims']['108-T11C']['links'][0]['staging_metadata'].update(evidence_unit_ref='108-T11A-E1'));add(lambda x:x['claims']['108-T11A']['routes'][0]['staging_metadata'].update(evidence_unit_ref='missing'));add(lambda x:x['claims']['108-T11A']['proposition'].update(physical_id=1));add(lambda x:x['claims']['108-T11A']['evidence_units'][0].update(physical_id=1));add(lambda x:x['claims']['108-T11A']['voices'].pop());add(lambda x:x['claims']['108-T11A']['evidence_units'].pop());add(lambda x:x['claims']['108-T11A']['links'].pop());add(lambda x:x['claims']['108-T11A']['routes'].pop());add(lambda x:x['claims']['108-T11C']['voices'].pop());add(lambda x:x['claims']['108-T11C']['evidence_units'].pop());add(lambda x:x['claims']['108-T11C']['links'].pop());add(lambda x:x['claims']['108-T11C']['routes'].pop());add(lambda x:x['claims']['108-T11C'].update(publication_ready=True));add(lambda x:x['preflight_and_failure_contract'].update(direct_database_write_authorized=True));add(lambda x:x['lifecycle_invariants'].update(database_written=True))
 rejected=0
 for i,x in enumerate(cases):
  try:build(x)
  except (ValueError,KeyError):rejected+=1
  else:raise ValueError(f'unsafe lifecycle input accepted: {i}')
 check(rejected==18,'mutation rejection count');return expected,rejected
def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--root',default='.');a=ap.parse_args();out,rejected=self_test(load(a.root));out['unsafe_inputs_rejected']=rejected;print(json.dumps(out,ensure_ascii=False,sort_keys=True))
if __name__=='__main__':main()

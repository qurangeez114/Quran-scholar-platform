#!/usr/bin/env python3
"""Validate the 15-claim/18-route audit after I06 parent hold consolidation."""
from __future__ import annotations
import copy, hashlib, json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]; STAGE=ROOT/'data/tafsir/staging'
ARTIFACT=STAGE/'ibn-kathir-108-closure-audit-after-i06-parent-2026-11-06.json'
PRIOR=(STAGE/'ibn-kathir-108-closure-audit-after-i06-r02-preview-2026-11-06.json','05e23a98c638bf0a0713e893ab38f8d383e74691')
PARENT=(STAGE/'ibn-kathir-108-i06-parent-hold-consolidation-2026-11-06.json','cc6f7b296616284282f8c9714ef420dcd89cc551')
BASELINE={'tabari':18,'ibn_kathir':15,'qurtubi':23,'jalalayn':5,'saadi':6,'tanwir_disputed_attribution':7}
CLAIMS=['108-I01-A','108-I01-B','108-I03','108-I04A','108-I04B','108-I04C','108-I04D','108-I06','108-I07','108-I08','108-I09','108-I10','108-I11']
ROUTES=['108-I02-R05','108-I06-R01','108-I06-R02']

def require(ok,msg):
 if not ok: raise AssertionError(msg)
def blob_sha(raw): return hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
def load_pinned(pair):
 p,sha=pair; raw=p.read_bytes(); require(blob_sha(raw)==sha,f'pinned blob changed: {p.name}'); return json.loads(raw)

def validate(d,prior,parent):
 require(d['schema_version']=='quranhikma-ibn-kathir-108-closure-audit-after-i06-parent-v1','schema')
 require((d['surah'],d['scholar_key'])==(108,'ibn_kathir') and d['six_scholar_baseline']==BASELINE,'scope/baseline')
 require(d['basis']['prior_audit']['blob']==PRIOR[1] and d['basis']['i06_parent_hold_consolidation']['blob']==PARENT[1],'pins')
 require(len(d['claim_rows'])==15 and [x['claim_id'] for x in d['claim_rows']]==[x['claim_id'] for x in prior['claim_rows']],'inventory')
 for row,old in zip(d['claim_rows'],prior['claim_rows']):
  if row['claim_id']=='108-I06':
   expected=copy.deepcopy(old); expected['closure_class']='offline_parent_hold_consolidated_claim_incomplete'; require(row==expected,'I06 row')
  else: require(row==old,f"unexpected row change {row['claim_id']}")
 c=d['coverage_summary']; require(c['active_split_claims']==15 and c['publication_ready_claims']==0,'claim counts')
 require(c['claim_level_offline_hold_consolidated']==CLAIMS and c['claim_level_offline_hold_consolidated_count']==13,'claim holds')
 require(c['route_level_offline_hold_consolidated']==ROUTES and c['route_level_offline_hold_consolidated_count']==3,'route holds')
 require(c['reviewed_routes']==18 and c['publication_ready_routes']==0,'route counts')
 require(c['i02_claim_complete'] is False and c['i06_claim_complete'] is False,'completion boundary')
 require(c['next_repair_claim']=='108-I05' and c['next_repair_route'] is None and 'anonymous-originator' in c['next_repair_scope'],'next repair')
 require(d['route_summary']['expected_routes']==18 and d['route_summary']['reviewed_routes']==18 and d['route_summary']['publication_ready_routes']==0,'route summary')
 f=d['i06_parent_refresh_finding']; require(f['route_records']==['108-I06-R01','108-I06-R02'] and f['route_holds_consolidated']==2,'I06 routes')
 require(f['parent_claim_level_hold_consolidated'] is True and (f['parent_active_holds'],f['parent_resolved_holds'],f['parent_waived_holds'])==(7,0,0),'I06 holds')
 require((f['candidate_propositions'],f['persisted_voices'],f['persisted_evidence_rows'],f['persisted_route_rows'],f['physical_ids'])==(8,0,0,0,0),'I06 frozen')
 require(f['r01_named_interpreters']==['Ibn Abbas','Mujahid',"Sa'id ibn Jubayr",'Qatada'],'R01 voices')
 require(f['r02_assertion_speakers']==["al-As ibn Wa'il"]*3+['Yazid ibn Ruman'] and f['english_reporting_names_omitted']==['Ibn Ishaq','Yazid ibn Ruman'],'R02 attribution')
 require(f['parent_claim_complete'] is False and f['database_writes']==0,'I06 boundary')
 require(parent['hold_summary']=={'active':7,'resolved':0,'waived':0} and parent['consolidation_effect']['parent_claim_level_hold_consolidated'] is True,'parent provenance')
 n=d['selected_next_repair']; require((n['claim_id'],n['unit_id'],n['kind'])==('108-I05','108-I05-A03','anonymous_originator_representation_repair'),'selection')
 require(n['basis']['integration_readiness']['blob']=='2b1a7abe57d9cb500d60c14e1c5fa6a106ee35cd','I05 readiness pin')
 require(n['basis']['held_annotated_assembly']['blob']=='991e19f469ebbbb6a8373587152a38e9eb140cfe' and n['basis']['coverage_reconciliation']['blob']=='3d05d0e7ee53ed4c1c3a6d292177124b00ea902b','I05 staging pins')
 require(n['current_status']=='repository_preview_validated_integration_blocked_by_explicit_gaps' and 'no voice row' in n['structural_gap'],'I05 gap')
 require(len(n['required_checks'])==5 and len(n['related_unresolved_gaps'])==4,'I05 boundaries')
 require(n['physical_ids_allocated']==0 and n['database_written'] is False and n['publication_ready'] is False and n['claim_complete'] is False,'I05 safety')
 require(d['validation']=={'result':'PASS','local_validator':'scripts/validate-ibn-kathir-108-closure-audit-after-i06-parent.py','unsafe_mutations_rejected':20},'validation declaration')
 require(all(x['publication_ready'] is False for x in d['claim_rows']),'row readiness')
 require(d['counts_unchanged'] is True and d['database_write_count']==0,'count/write')
 for k in ('database_written','publication_ready','scholar_complete','chapter_complete'): require(d[k] is False,k)

def rejected(mutator,base,prior,parent):
 bad=copy.deepcopy(base); mutator(bad)
 try: validate(bad,prior,parent)
 except (AssertionError,KeyError,TypeError,IndexError): return True
 return False

def main():
 prior=load_pinned(PRIOR); parent=load_pinned(PARENT); data=json.loads(ARTIFACT.read_text()); validate(data,prior,parent)
 mutations=[
  lambda d:d.update(schema_version='bad'),lambda d:d['six_scholar_baseline'].update(ibn_kathir=14),
  lambda d:d['claim_rows'].pop(),lambda d:d['claim_rows'][9].update(publication_ready=True),
  lambda d:d['coverage_summary'].update(claim_level_offline_hold_consolidated_count=12),lambda d:d['coverage_summary']['claim_level_offline_hold_consolidated'].remove('108-I06'),
  lambda d:d['coverage_summary']['route_level_offline_hold_consolidated'].pop(),lambda d:d['coverage_summary'].update(reviewed_routes=17),
  lambda d:d['coverage_summary'].update(i06_claim_complete=True),lambda d:d['coverage_summary'].update(next_repair_claim='108-I02'),
  lambda d:d['i06_parent_refresh_finding'].update(parent_active_holds=0),lambda d:d['i06_parent_refresh_finding'].update(persisted_voices=8),
  lambda d:d['i06_parent_refresh_finding'].update(parent_claim_complete=True),lambda d:d['selected_next_repair'].update(unit_id='108-I05-R02'),
  lambda d:d['selected_next_repair'].update(kind='physical_insert'),lambda d:d['selected_next_repair'].update(physical_ids_allocated=1),
  lambda d:d['selected_next_repair'].update(claim_complete=True),lambda d:d.update(database_written=True),
  lambda d:d.update(publication_ready=True,scholar_complete=True,chapter_complete=True),lambda d:d['route_summary'].update(publication_ready_routes=1)
 ]
 require(all(rejected(m,data,prior,parent) for m in mutations),'unsafe mutation accepted')
 print('PASS post-I06-parent closure audit: 13 claim holds, 3 route holds, 0/15 claims and 0/18 routes ready; I05-A03 selected; 20 unsafe mutations rejected')

if __name__=='__main__': main()

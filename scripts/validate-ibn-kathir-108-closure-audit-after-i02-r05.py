#!/usr/bin/env python3
import copy,hashlib,json,sys
from pathlib import Path
ROOT=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parents[1]
STAGE=ROOT/'data/tafsir/staging'
def read(name,blob):
 raw=(STAGE/name).read_bytes(); actual=hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest(); assert actual==blob,(name,actual,blob); return json.loads(raw)
x=json.loads((STAGE/'ibn-kathir-108-closure-audit-after-i02-r05-2026-11-04.json').read_text())
old=read('ibn-kathir-108-closure-audit-refresh-2026-11-04.json','08c33ab49ba0acd96d56b3334b7cfb21019c83c8')
hold=read('ibn-kathir-108-i02-r05-hold-consolidation-2026-11-04.json','a4d0c053c345fc4e2511bdde70fecf4b1c077f8c')
scope=read('ibn-kathir-108-i03-scope-boundary-review-2026-10-21.json','de6701678e00023fa9a6ab7eb712f08d4ade74d2')
dossier=read('ibn-kathir-108-i03-clause-evidence-dossier-2026-10-21.json','832b3ef893ecdcab4ac01a8de11a8adb0765fbb8')
draft=read('ibn-kathir-108-i03-two-proposition-draft-2026-10-21.json','0a320992b200f42f306839b10c30d588d25eeb9c')
integration=read('ibn-kathir-108-i03-staging-integration-checkpoint-2026-10-21.json','00beb074a886dbce2c5df44b976d484bae16facf')
def check(q):
 assert q['status']=='i02_r05_route_hold_recorded_i03_offline_consolidation_selected_scholar_not_complete'
 assert q['inventory_reconciliation']==old['inventory_reconciliation'] and q['route_summary']==old['route_summary']
 assert len(q['claim_rows'])==15; rows={r['claim_id']:r for r in q['claim_rows']}
 assert rows['108-I02']['closure_class']=='route_hold_consolidated_for_r05_claim_incomplete' and rows['108-I02']['publication_ready'] is False
 assert rows['108-I03']['publication_ready'] is False
 c=q['coverage_summary']; assert c['active_split_claims']==15 and c['publication_ready_claims']==0
 assert c['claim_level_offline_hold_consolidated']==['108-I01-A','108-I01-B','108-I10','108-I11'] and c['claim_level_offline_hold_consolidated_count']==4
 assert c['route_level_offline_hold_consolidated']==['108-I02-R05'] and c['route_level_offline_hold_consolidated_count']==1 and c['i02_claim_complete'] is False
 assert c['reviewed_routes']==18 and c['publication_ready_routes']==0 and c['next_repair_claim']=='108-I03'
 f=q['i02_r05_refresh_finding']; assert f['witnesses']==3 and f['active_holds']==6 and f['live_form']=='سليمان بن هلال' and f['external_form']=='سليمان بن بلال'
 assert f['graph_effect']==hold['frozen_graph']
 s=q['selected_next_repair']; assert s['claim_id']=='108-I03' and s['source_entry_id']==48457
 assert s['source_sha256']==dossier['source']['source_sha256'] and s['paragraph_sha256']==dossier['source']['paragraph_sha256']
 assert len(s['clause_units'])==2
 for a,b in zip(s['clause_units'],dossier['units']):
  for k in ('key','start_codepoint','end_codepoint','sha256','authority','scope'): assert a[k]==b[k]
 assert s['integrated_staging_shape']==integration['payload']=={'historical_claim_count':1,'physical_propositions':2,'voices':2,'evidence_units':2,'links':2,'routes':0}
 assert s['english_fidelity']==scope['english_fidelity']['state']==draft['fidelity']['state']
 assert len(s['required_absences'])==5 and len(q['disagreements_and_absences'])==6
 assert q['six_scholar_baseline']==draft['six_scholar_baseline']
 assert q['counts_unchanged'] is True and q['database_written'] is False and q['database_write_count']==0 and q['publication_ready'] is False and q['scholar_complete'] is False and q['chapter_complete'] is False
check(x)
mutations=[
 lambda q:q.update(status='scholar_complete'),lambda q:q['claim_rows'].pop(),lambda q:q['claim_rows'][2].update(closure_class='offline_hold_consolidated'),
 lambda q:q['coverage_summary'].update(active_split_claims=14),lambda q:q['coverage_summary'].update(publication_ready_claims=1),lambda q:q['coverage_summary']['claim_level_offline_hold_consolidated'].append('108-I02'),
 lambda q:q['coverage_summary'].update(i02_claim_complete=True),lambda q:q['coverage_summary']['route_level_offline_hold_consolidated'].pop(),lambda q:q['i02_r05_refresh_finding'].update(live_form='سليمان بن بلال'),
 lambda q:q['selected_next_repair'].update(claim_id='108-I04A'),lambda q:q['selected_next_repair']['clause_units'].pop(),lambda q:q['selected_next_repair']['clause_units'][0].update(authority='named readers'),
 lambda q:q['selected_next_repair']['integrated_staging_shape'].update(routes=1),lambda q:q['selected_next_repair'].update(english_fidelity='aligned'),lambda q:q['selected_next_repair']['required_absences'].pop(),
 lambda q:q.update(database_written=True),lambda q:q.update(scholar_complete=True),lambda q:q.update(chapter_complete=True)]
for m in mutations:
 bad=copy.deepcopy(x);m(bad)
 try:check(bad)
 except (AssertionError,KeyError,IndexError,TypeError):continue
 raise AssertionError('unsafe mutation accepted')
assert len(mutations)==18
print('PASS: Ibn Kathir 108 closure audit after I02-R05; I03 selected; 18 unsafe mutations rejected; 0 database writes')

#!/usr/bin/env python3
"""Validate offline parent-level hold consolidation for Ibn Kathir 108-I06."""
from __future__ import annotations
import copy, hashlib, json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]; STAGE=ROOT/'data/tafsir/staging'
ARTIFACT=STAGE/'ibn-kathir-108-i06-parent-hold-consolidation-2026-11-06.json'
SOURCES={
 'audit':(STAGE/'ibn-kathir-108-closure-audit-after-i06-r02-preview-2026-11-06.json','05e23a98c638bf0a0713e893ab38f8d383e74691'),
 'r01':(STAGE/'ibn-kathir-108-i06-r01-hold-consolidation-2026-11-06.json','5aa4f67875e36ed4ae40d24798ca422d85d25f54'),
 'r02':(STAGE/'ibn-kathir-108-i06-r02-proposition-only-preview-hold-consolidation-2026-11-06.json','4f7d351c6c70649032bdc1a802627ebf972cba9b')
}
BASELINE={'tabari':18,'ibn_kathir':15,'qurtubi':23,'jalalayn':5,'saadi':6,'tanwir_disputed_attribution':7}
HOLD_CLASSES=['assertion_and_voice_mapping','physical_representation_and_shared_evidence','live_consumer_duplicate_and_reuse','chain_and_authentication','edition_and_independence','arabic_english_attribution_fidelity','authorized_assembly_integration']

def require(ok,msg):
 if not ok: raise AssertionError(msg)
def blob_sha(raw): return hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
def load_pinned(pair):
 p,sha=pair; raw=p.read_bytes(); require(blob_sha(raw)==sha,f'pinned blob changed: {p.name}'); return json.loads(raw)

def validate(d,s):
 require(d['schema_version']=='quranhikma-ibn-kathir-108-i06-parent-hold-consolidation-v1','schema')
 require((d['surah'],d['scholar_key'],d['claim_id'])==(108,'ibn_kathir','108-I06'),'scope')
 require(d['status']=='offline_parent_claim_hold_consolidated_claim_incomplete','status')
 require(d['six_scholar_baseline']==BASELINE,'baseline')
 pins={'audit':'post_preview_closure_audit','r01':'r01_hold_consolidation','r02':'r02_preview_hold_consolidation'}
 for k,(_,sha) in SOURCES.items(): require(d['basis'][pins[k]]['blob']==sha,f'pin {k}')
 inv=d['inventory_boundary']; require(inv=={'active_split_claims':15,'reviewed_routes':18,'publication_ready_claims':0,'publication_ready_routes':0,'prior_claim_level_holds':12,'claim_level_holds_after_step':13,'route_level_holds':3},'inventory')
 require(s['audit']['coverage_summary']['claim_level_offline_hold_consolidated_count']==12 and s['audit']['coverage_summary']['route_level_offline_hold_consolidated_count']==3,'audit provenance')
 routes=d['route_records']; require(list(routes)==['108-I06-R01','108-I06-R02'],'routes')
 r1,r2=routes['108-I06-R01'],routes['108-I06-R02']
 require(r1['source_locator']==s['r01']['exact_source_locator'] and r1['frozen_graph']==s['r01']['frozen_graph'],'R01 frozen')
 require((r1['active_holds'],r1['resolved_holds'],r1['waived_holds'])==(6,0,0) and r1['route_hold_consolidated'] is True,'R01 holds')
 require(r2['assertion_locators']==s['r02']['exact_source_readback']['assertion_locators'] and r2['shared_context_locators']==s['r02']['exact_source_readback']['shared_context_locators'],'R02 locators')
 require(r2['frozen_graph']==s['r02']['frozen_graph'],'R02 frozen')
 require((r2['active_holds'],r2['resolved_holds'],r2['waived_holds'])==(6,0,0) and r2['route_hold_consolidated'] is True and r2['preview_hold_consolidated'] is True,'R02 holds')
 p=d['parent_frozen_boundary']; require(p=={'r01_symbolic_propositions':4,'r02_preview_propositions':4,'candidate_propositions_total':8,'r01_proposed_voices':4,'r02_unresolved_voice_mappings':4,'persisted_voices':0,'r01_shared_evidence_units':1,'r02_assertion_evidence_locators':4,'r02_shared_context_locators':2,'persisted_evidence_rows':0,'persisted_route_rows':0,'physical_ids':0},'parent graph')
 a=d['attribution_boundary']
 require(a['r01_named_interpreters']==['Ibn Abbas','Mujahid',"Sa'id ibn Jubayr",'Qatada'] and a['r01_shared_paragraph_independent_witness_count']==1,'R01 attribution')
 require(a['r02_assertion_speakers']==["al-As ibn Wa'il"]*3+['Yazid ibn Ruman'] and a['r02_assertion_modes']==['quoted','quoted','quoted','explicit'],'R02 attribution')
 require(a['merged_english_transfers_r02_to_r01_names'] is False and a['english_reporting_names_omitted']==['Ibn Ishaq','Yazid ibn Ruman'] and a['arabic_controls_attribution'] is True,'fidelity')
 holds=d['parent_hold_records']; require(len(holds)==7 and [x['hold_class'] for x in holds]==HOLD_CLASSES,'parent holds')
 require(all(x['state']=='active' and x['required_before_publication'] is True and x['resolved_by_this_step'] is False and x['waived'] is False for x in holds),'hold states')
 require(d['hold_summary']=={'active':7,'resolved':0,'waived':0},'hold summary')
 e=d['consolidation_effect']; require(e=={'r01_route_hold_consolidated':True,'r02_route_hold_consolidated':True,'r02_preview_hold_consolidated':True,'parent_claim_level_hold_consolidated':True,'parent_claim_complete':False,'claim_level_hold_count_delta':1,'publication_ready_claim_count_delta':0,'database_rows_changed':0},'effect')
 require(len(d['disagreements_and_absences'])==6,'limits')
 require(d['validation']=={'result':'PASS','validator':'scripts/validate-ibn-kathir-i06-parent-hold-consolidation.py','unsafe_mutations_rejected':20},'validation declaration')
 require(d['counts_unchanged'] is True and d['physical_ids_allocated']==0 and d['database_write_count']==0,'count/write boundary')
 for k in ('database_written','publication_ready','claim_complete','scholar_complete','chapter_complete'): require(d[k] is False,k)

def rejected(mutator,base,s):
 bad=copy.deepcopy(base); mutator(bad)
 try: validate(bad,s)
 except (AssertionError,KeyError,TypeError,IndexError): return True
 return False

def main():
 s={k:load_pinned(v) for k,v in SOURCES.items()}; data=json.loads(ARTIFACT.read_text()); validate(data,s)
 mutations=[
  lambda d:d.update(schema_version='bad'),lambda d:d['six_scholar_baseline'].update(ibn_kathir=14),
  lambda d:d['inventory_boundary'].update(active_split_claims=14),lambda d:d['inventory_boundary'].update(claim_level_holds_after_step=12),
  lambda d:d['route_records'].pop('108-I06-R01'),lambda d:d['route_records']['108-I06-R01'].update(active_holds=0),
  lambda d:d['route_records']['108-I06-R02']['assertion_locators'].reverse(),lambda d:d['route_records']['108-I06-R02'].update(preview_hold_consolidated=False),
  lambda d:d['parent_frozen_boundary'].update(candidate_propositions_total=4),lambda d:d['parent_frozen_boundary'].update(persisted_voices=8),
  lambda d:d['parent_frozen_boundary'].update(physical_ids=8),lambda d:d['attribution_boundary'].update(r01_shared_paragraph_independent_witness_count=4),
  lambda d:d['attribution_boundary'].update(merged_english_transfers_r02_to_r01_names=True),lambda d:d['parent_hold_records'].pop(),
  lambda d:d['parent_hold_records'][0].update(state='resolved',resolved_by_this_step=True),lambda d:d['hold_summary'].update(active=0,resolved=7),
  lambda d:d['consolidation_effect'].update(parent_claim_complete=True),lambda d:d['consolidation_effect'].update(database_rows_changed=8),
  lambda d:d.update(database_written=True),lambda d:d.update(publication_ready=True,claim_complete=True,scholar_complete=True,chapter_complete=True)
 ]
 require(all(rejected(m,data,s) for m in mutations),'unsafe mutation accepted')
 print('PASS I06 parent hold consolidation: 7 active holds, 13/15 claim holds, 0/15 ready; 20 unsafe mutations rejected')

if __name__=='__main__': main()

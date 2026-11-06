#!/usr/bin/env python3
"""Validate the 15-claim/18-route closure audit after the I06-R02 preview holds."""
from __future__ import annotations
import copy, hashlib, json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
STAGE=ROOT/'data/tafsir/staging'
ARTIFACT=STAGE/'ibn-kathir-108-closure-audit-after-i06-r02-preview-2026-11-06.json'
PRIOR=(STAGE/'ibn-kathir-108-closure-audit-after-i06-r02-2026-11-06.json','00af132c924019d2a00eba176125a9fd785e2119')
PREVIEW=(STAGE/'ibn-kathir-108-i06-r02-proposition-only-preview-hold-consolidation-2026-11-06.json','4f7d351c6c70649032bdc1a802627ebf972cba9b')
BASELINE={'tabari':18,'ibn_kathir':15,'qurtubi':23,'jalalayn':5,'saadi':6,'tanwir_disputed_attribution':7}
CLAIM_HOLDS=['108-I01-A','108-I01-B','108-I03','108-I04A','108-I04B','108-I04C','108-I04D','108-I07','108-I08','108-I09','108-I10','108-I11']
ROUTE_HOLDS=['108-I02-R05','108-I06-R01','108-I06-R02']

def require(ok,msg):
 if not ok: raise AssertionError(msg)
def blob_sha(raw): return hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
def load_pinned(pair):
 path,sha=pair; raw=path.read_bytes(); require(blob_sha(raw)==sha,f'pinned blob changed: {path.name}'); return json.loads(raw)

def validate(d,prior,preview):
 require(d['schema_version']=='quranhikma-ibn-kathir-108-closure-audit-after-i06-r02-preview-v1','schema')
 require((d['surah'],d['scholar_key'])==(108,'ibn_kathir'),'scope')
 require(d['six_scholar_baseline']==BASELINE,'baseline')
 require(d['basis']['prior_audit']['blob']==PRIOR[1] and d['basis']['i06_r02_proposition_preview_hold_consolidation']['blob']==PREVIEW[1],'pins')
 require(d['claim_rows']==prior['claim_rows'] and len(d['claim_rows'])==15,'claim inventory changed')
 c=d['coverage_summary']
 require(c['active_split_claims']==15 and c['publication_ready_claims']==0,'claim counts')
 require(c['claim_level_offline_hold_consolidated']==CLAIM_HOLDS and c['claim_level_offline_hold_consolidated_count']==12,'claim holds')
 require(c['route_level_offline_hold_consolidated']==ROUTE_HOLDS and c['route_level_offline_hold_consolidated_count']==3,'route holds')
 require(c['reviewed_routes']==18 and c['publication_ready_routes']==0,'route counts')
 require(c['i02_claim_complete'] is False and c['i06_claim_complete'] is False,'parent boundary')
 require(c['next_repair_claim']=='108-I06' and c['next_repair_route'] is None,'next repair')
 require('parent claim-level hold' in c['next_repair_scope'],'next scope')
 require(d['route_summary']['expected_routes']==18 and d['route_summary']['reviewed_routes']==18 and d['route_summary']['publication_ready_routes']==0,'route summary')
 r=d['i06_r02_refresh_finding']
 require(r['preview_hold_consolidated'] is True,'preview state')
 require(r['preview_read_model']=={'propositions':4,'semantic_links':4,'assertion_evidence_locators':4,'shared_context_locators':2,'voices':0,'routes':0,'evidence_rows':0,'physical_ids':0},'read model')
 require((r['active_holds'],r['resolved_holds'],r['waived_holds'])==(6,0,0),'holds')
 require((r['partial_link_subsets_validated'],r['partial_context_subsets_validated'],r['complete_replay'])==(16,4,'no-op'),'replay')
 require(r['live_consumer_compatible'] is False and r['physical_persistence_authorized'] is False,'consumer/persistence')
 require(r['parent_claim_complete'] is False and r['parent_claim_level_hold_consolidated'] is False and r['database_writes']==0,'R02 boundary')
 require(preview['frozen_graph']=={'propositions':4,'voices':0,'unresolved_voice_mappings':4,'semantic_links':4,'assertion_evidence_locators':4,'shared_context_locators':2,'evidence_rows':0,'routes':0,'physical_ids':0},'preview provenance')
 require(preview['active_holds']==6 and preview['resolved_holds']==0 and preview['waived_holds']==0,'preview holds')
 require(preview['replay_and_consumer_state']['partial_link_subsets_validated']==16 and preview['replay_and_consumer_state']['partial_context_subsets_validated']==4,'preview subset provenance')
 require(preview['replay_and_consumer_state']['live_importer_or_deployed_consumer_proven_compatible'] is False and preview['replay_and_consumer_state']['physical_persistence_authorized'] is False,'preview safety provenance')
 n=d['selected_next_repair']
 require((n['claim_id'],n['kind'])==('108-I06','parent_claim_level_hold_consolidation'),'selection')
 require(n['route_records']==['108-I06-R01','108-I06-R02'] and n['route_holds_consolidated']==2,'route boundary')
 require(len(n['required_checks'])==5,'checks')
 require(n['parent_claim_level_hold_consolidated'] is False and n['parent_claim_complete'] is False,'claim hold boundary')
 require(n['physical_ids_allocated']==0 and n['database_written'] is False and n['publication_ready'] is False,'write boundary')
 require(d['validation']=={'result':'PASS','local_validator':'scripts/validate-ibn-kathir-108-closure-audit-after-i06-r02-preview.py','unsafe_mutations_rejected':18},'validation declaration')
 require(all(x['publication_ready'] is False for x in d['claim_rows']),'row readiness')
 for k in ('database_written','publication_ready','scholar_complete','chapter_complete'): require(d[k] is False,k)
 require(d['database_write_count']==0 and d['counts_unchanged'] is True,'database/counts')

def rejected(mutator,base,prior,preview):
 bad=copy.deepcopy(base); mutator(bad)
 try: validate(bad,prior,preview)
 except (AssertionError,KeyError,TypeError,IndexError): return True
 return False

def main():
 prior=load_pinned(PRIOR); preview=load_pinned(PREVIEW); data=json.loads(ARTIFACT.read_text()); validate(data,prior,preview)
 mutations=[
  lambda d:d.update(schema_version='bad'),
  lambda d:d['six_scholar_baseline'].update(ibn_kathir=14),
  lambda d:d['claim_rows'].pop(),
  lambda d:d['claim_rows'][9].update(publication_ready=True),
  lambda d:d['coverage_summary'].update(claim_level_offline_hold_consolidated_count=13),
  lambda d:d['coverage_summary']['route_level_offline_hold_consolidated'].pop(),
  lambda d:d['coverage_summary'].update(reviewed_routes=17),
  lambda d:d['coverage_summary'].update(i06_claim_complete=True),
  lambda d:d['coverage_summary'].update(next_repair_route='108-I06-R02'),
  lambda d:d['i06_r02_refresh_finding'].update(active_holds=0),
  lambda d:d['i06_r02_refresh_finding']['preview_read_model'].update(voices=4),
  lambda d:d['i06_r02_refresh_finding'].update(live_consumer_compatible=True),
  lambda d:d['selected_next_repair'].update(kind='insert_payload'),
  lambda d:d['selected_next_repair'].update(parent_claim_level_hold_consolidated=True),
  lambda d:d['selected_next_repair'].update(parent_claim_complete=True),
  lambda d:d['selected_next_repair'].update(physical_ids_allocated=8),
  lambda d:d.update(database_written=True),
  lambda d:d.update(publication_ready=True,scholar_complete=True,chapter_complete=True),
 ]
 require(all(rejected(m,data,prior,preview) for m in mutations),'unsafe mutation accepted')
 print('PASS post-preview closure audit: 12 claim holds, 3 route holds, 0/15 claims and 0/18 routes ready; 18 unsafe mutations rejected')

if __name__=='__main__': main()

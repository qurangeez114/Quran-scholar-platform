#!/usr/bin/env python3
"""Validate consolidation of I06-R02 proposition-preview route holds; no DB/network."""
from __future__ import annotations
import copy,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];S=ROOT/'data/tafsir/staging'
A=S/'ibn-kathir-108-i06-r02-proposition-only-preview-hold-consolidation-2026-11-06.json';P=S/'ibn-kathir-108-i06-r02-proposition-only-held-preview-2026-11-06.json';I=S/'ibn-kathir-108-i06-r02-proposition-only-offline-identity-reconciler-2026-11-06.json';C=S/'ibn-kathir-108-i06-r02-proposition-only-preview-consumer-contract-2026-11-06.json'
PB='82bbec8516e96ca3be86d6b9f8833fd5344a45c9';IB='332a931484de098c8abbe52991f3cc8818d2b151';CB='bfef0ec42b28551910c3bb9ae0de5b0b9c95cb38';AB='4f7d351c6c70649032bdc1a802627ebf972cba9b'
BASE={'proposition_only_held_preview':PB,'offline_identity_reconciler':IB,'preview_consumer_contract':CB,'prior_route_hold_consolidation':'bcbccc3b8dc76cf0a77750cf1dc93b41d77f2503'}
CLASSES=['voice_category_mapping','physical_representation','live_consumer_compatibility','chain_and_authentication','edition_and_independence','authorized_assembly_integration'];FLAGS=['database_written','publication_ready','route_complete','claim_complete','scholar_complete','chapter_complete']
def blob(b):return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
def validate(a,p,i,c):
 assert a['schema_version']=='quranhikma-i06-r02-proposition-only-preview-hold-consolidation-v1' and a['status']=='offline_proposition_preview_holds_consolidated_not_deployed'
 assert {k:v['blob'] for k,v in a['basis'].items()}==BASE and a['six_scholar_baseline']==p['six_scholar_baseline'] and a['frozen_graph']==p['cardinalities']
 assert a['route_hold_consolidated'] is True and a['preview_hold_consolidated'] is True and a['parent_claim_complete'] is False and a['parent_claim_level_hold_consolidated'] is False
 hs=a['hold_records'];assert len(hs)==6 and [x['hold_class'] for x in hs]==CLASSES and [x['text'] for x in hs]==p['active_holds']
 assert all(x['state']=='active' and x['required_before_publication'] and not x['resolved_by_this_step'] and not x['waived'] for x in hs)
 assert (a['active_holds'],a['resolved_holds'],a['waived_holds'])==(6,0,0)
 ex=a['exact_source_readback'];assert ex['assertion_locators']==[{'key':x['key'],'captured_entry_id':x['captured_entry_id'],'canonical_entry_id':x['canonical_entry_id'],'start':x['start'],'end':x['end'],'sha256':x['sha256']} for x in p['assertion_evidence_locators']]
 assert ex['shared_context_locators']==[{'key':x['key'],'captured_entry_id':x['captured_entry_id'],'canonical_entry_id':x['canonical_entry_id'],'start':x['start'],'end':x['end'],'sha256':x['sha256'],'role':x['role']} for x in p['shared_context_locators']]
 assert i['replay_summary']['partial_link_subsets_tested']==16 and i['replay_summary']['partial_context_subsets_tested']==4 and i['replay_summary']['repeated_complete_replay']=='no-op'
 assert a['replay_and_consumer_state']=={'partial_link_subsets_validated':16,'partial_context_subsets_validated':4,'complete_replay':'no-op','live_importer_or_deployed_consumer_proven_compatible':False,'physical_persistence_authorized':False}
 assert c['repository_consumer_review']['live_importer_or_deployed_consumer_proven_compatible'] is False
 assert a['arabic_english_fidelity']==p['arabic_english_fidelity'] and a['disagreements_and_absences']==p['disagreements_and_absences']
 assert a['validation']=={'result':'PASS','validator':'scripts/validate-ibn-kathir-i06-r02-proposition-only-preview-hold-consolidation.py','unsafe_mutations_rejected':18}
 assert a['counts_unchanged'] is True and a['physical_ids_allocated']==0 and a['database_write_count']==0 and all(a[k] is False for k in FLAGS)
def main():
 pr=P.read_bytes();ir=I.read_bytes();cr=C.read_bytes();assert blob(pr)==PB and blob(ir)==IB and blob(cr)==CB;p=json.loads(pr);i=json.loads(ir);c=json.loads(cr);ar=A.read_bytes();assert blob(ar)==AB;a=json.loads(ar);validate(a,p,i,c)
 changes=[lambda x:x['hold_records'].pop(),lambda x:x['hold_records'][0].update(state='resolved'),lambda x:x['hold_records'][0].update(required_before_publication=False),lambda x:x['hold_records'][0].update(waived=True),lambda x:x.update(active_holds=5),lambda x:x.update(resolved_holds=1),lambda x:x.update(route_hold_consolidated=False),lambda x:x.update(parent_claim_complete=True),lambda x:x['frozen_graph'].update(voices=1),lambda x:x['exact_source_readback']['assertion_locators'][0].update(start=16865),lambda x:x['exact_source_readback']['assertion_locators'][0].update(sha256='0'*64),lambda x:x['exact_source_readback']['shared_context_locators'][0].update(role='independent_evidence'),lambda x:x['replay_and_consumer_state'].update(complete_replay='insert'),lambda x:x['replay_and_consumer_state'].update(live_importer_or_deployed_consumer_proven_compatible=True),lambda x:x['arabic_english_fidelity'].update(arabic_controls_voice=False),lambda x:x['disagreements_and_absences'].pop(),lambda x:x.update(publication_ready=True),lambda x:x.update(database_written=True)]
 for change in changes:
  bad=copy.deepcopy(a);change(bad)
  try:validate(bad,p,i,c)
  except (AssertionError,KeyError,TypeError):continue
  raise AssertionError('Unsafe mutation accepted')
 print('PASS 6 active holds, 4 propositions, 4 links, 6 exact locators, 0 voices/routes/physical IDs; 18 mutations rejected')
if __name__=='__main__':main()

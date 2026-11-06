#!/usr/bin/env python3
"""Validate I06-R02 proposition-preview consumer readback; no DB/network access."""
from __future__ import annotations
import copy,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];S=ROOT/'data/tafsir/staging'
C=S/'ibn-kathir-108-i06-r02-proposition-only-preview-consumer-contract-2026-11-06.json';P=S/'ibn-kathir-108-i06-r02-proposition-only-held-preview-2026-11-06.json';I=S/'ibn-kathir-108-i06-r02-proposition-only-offline-identity-reconciler-2026-11-06.json'
PB='82bbec8516e96ca3be86d6b9f8833fd5344a45c9';IB='332a931484de098c8abbe52991f3cc8818d2b151';CB='bfef0ec42b28551910c3bb9ae0de5b0b9c95cb38'
BASE={'proposition_only_held_preview':PB,'offline_identity_reconciler':IB,'prior_offline_consumer_contract':'abaa1747fc0aabe01cde028cefbd171851a63aaa','physical_mapping_reconciliation':'e0803f58d326baeab81a081834e3dfed034d8b53'}
FLAGS=['database_written','publication_ready','route_complete','claim_complete','scholar_complete','chapter_complete']
def blob(b):return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
def expected(p):
 return {'proposition_cards':[{'staging_key':x['staging_key'],'claim_type_id':x['claim_type_id'],'claim_type_code':x['claim_type_code'],'assertion_mode':x['assertion_mode'],'speaker_type':x['speaker_type'],'speaker_name':x['speaker_name'],'assertion_locator_ref':x['assertion_locator_ref']} for x in p['propositions']], 'assertion_segments':[{'key':x['key'],'captured_entry_id':x['captured_entry_id'],'canonical_entry_id':x['canonical_entry_id'],'start':x['start'],'end':x['end'],'sha256':x['sha256'],'offsets':x['offsets']} for x in p['assertion_evidence_locators']], 'shared_context_segments':[{'key':x['key'],'captured_entry_id':x['captured_entry_id'],'canonical_entry_id':x['canonical_entry_id'],'start':x['start'],'end':x['end'],'sha256':x['sha256'],'role':x['role']} for x in p['shared_context_locators']], 'semantic_links':[{'proposition_ref':x['proposition_ref'],'assertion_locator_ref':x['assertion_locator_ref'],'relation':x['relation']} for x in p['semantic_links']], 'unresolved_voice_mappings':p['unresolved_voice_mappings'],'shared_context_render_once':True,'publication_badge':False}
def validate(c,p,i):
 assert c['schema_version']=='quranhikma-i06-r02-proposition-only-preview-consumer-contract-v1' and c['status']=='offline_preview_consumer_contract_validated_not_deployed'
 assert {k:v['blob'] for k,v in c['basis'].items()}==BASE
 assert c['six_scholar_baseline']==p['six_scholar_baseline'] and c['frozen_graph']==p['cardinalities']
 assert c['read_model_contract']==expected(p)
 assert len(c['consumer_operations'])==8 and [x['order'] for x in c['consumer_operations']]==list(range(1,9))
 assert c['replay_contract']=={'partial_link_subsets_supported':16,'partial_context_subsets_supported':4,'complete_replay':'no-op','unknown_identity':'reject','duplicate_identity':'reject','conflicting_identity':'reject','physical_allocation':'forbidden'}
 assert i['replay_summary']['partial_link_subsets_tested']==16 and i['replay_summary']['partial_context_subsets_tested']==4 and i['replay_summary']['repeated_complete_replay']=='no-op'
 assert c['arabic_english_fidelity']==p['arabic_english_fidelity']
 assert c['repository_consumer_review']['live_importer_or_deployed_consumer_proven_compatible'] is False and c['repository_consumer_review']['contract_status']=='offline_readback_and_replay_only'
 assert c['active_holds']==p['active_holds'] and len(c['active_holds'])==6 and c['resolved_holds']==[] and c['waived_holds']==[]
 assert c['disagreements_and_absences']==p['disagreements_and_absences'] and len(c['reject_conditions'])==10
 assert c['validation']=={'result':'PASS','validator':'scripts/validate-ibn-kathir-i06-r02-proposition-only-preview-consumer-contract.py','unsafe_mutations_rejected':18}
 assert c['counts_unchanged'] is True and c['physical_ids_allocated']==0 and c['database_write_count']==0 and all(c[k] is False for k in FLAGS)
 # Exact Arabic hashes survive the consumer projection.
 source={x['key']:x for x in p['assertion_evidence_locators']+p['shared_context_locators']}
 for row in c['read_model_contract']['assertion_segments']+c['read_model_contract']['shared_context_segments']:
  assert row['sha256']==source[row['key']]['sha256'] and hashlib.sha256(source[row['key']]['text'].encode()).hexdigest()==row['sha256']
def main():
 pr=P.read_bytes();ir=I.read_bytes();assert blob(pr)==PB and blob(ir)==IB;p=json.loads(pr);i=json.loads(ir);cr=C.read_bytes();assert blob(cr)==CB;c=json.loads(cr);validate(c,p,i)
 changes=[lambda x:x['read_model_contract']['proposition_cards'].pop(),lambda x:x['read_model_contract']['proposition_cards'][0].update(claim_type_id=16),lambda x:x['read_model_contract']['proposition_cards'][0].update(speaker_name='Ibn Kathir'),lambda x:x['read_model_contract']['assertion_segments'][0].update(start=16865),lambda x:x['read_model_contract']['assertion_segments'][0].update(sha256='0'*64),lambda x:x['read_model_contract']['semantic_links'][0].update(assertion_locator_ref='memory_prediction'),lambda x:x['read_model_contract']['semantic_links'][0].update(relation='historically_verified'),lambda x:x['read_model_contract']['shared_context_segments'][0].update(role='independent_evidence'),lambda x:x['read_model_contract'].update(shared_context_render_once=False),lambda x:x['read_model_contract']['unresolved_voice_mappings'].pop(),lambda x:x['frozen_graph'].update(voices=1),lambda x:x['replay_contract'].update(complete_replay='insert'),lambda x:x['repository_consumer_review'].update(live_importer_or_deployed_consumer_proven_compatible=True),lambda x:x['active_holds'].pop(),lambda x:x['resolved_holds'].append('resolved'),lambda x:x['disagreements_and_absences'].pop(),lambda x:x.update(publication_ready=True),lambda x:x.update(database_written=True)]
 for change in changes:
  bad=copy.deepcopy(c);change(bad)
  try:validate(bad,p,i)
  except (AssertionError,KeyError,TypeError):continue
  raise AssertionError('Unsafe mutation accepted')
 print('PASS exact 4-proposition/4-link/6-locator readback, replay no-op, 18 unsafe mutations rejected')
if __name__=='__main__':main()

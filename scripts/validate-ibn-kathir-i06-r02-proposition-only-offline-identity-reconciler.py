#!/usr/bin/env python3
"""Validate I06-R02 proposition-only identity replay; no DB/network access."""
from __future__ import annotations
import copy, hashlib, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; STAGE=ROOT/'data/tafsir/staging'
ART=STAGE/'ibn-kathir-108-i06-r02-proposition-only-offline-identity-reconciler-2026-11-06.json'
PRE=STAGE/'ibn-kathir-108-i06-r02-proposition-only-held-preview-2026-11-06.json'
PRE_BLOB='82bbec8516e96ca3be86d6b9f8833fd5344a45c9'
ART_BLOB='332a931484de098c8abbe52991f3cc8818d2b151'
BASE={'proposition_only_held_preview':PRE_BLOB,'offline_consumer_contract':'abaa1747fc0aabe01cde028cefbd171851a63aaa','physical_mapping_reconciliation':'e0803f58d326baeab81a081834e3dfed034d8b53','hold_consolidation':'bcbccc3b8dc76cf0a77750cf1dc93b41d77f2503'}
FLAGS=['database_written','publication_ready','route_complete','claim_complete','scholar_complete','chapter_complete']
def blob(raw): return hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
def ids(p): return [f"{x['proposition_ref']}|{x['assertion_locator_ref']}|{x['relation']}" for x in p['semantic_links']]
def ctxids(p): return [f"{x['key']}|{x['sha256']}" for x in p['shared_context_locators']]
def reconcile(want,existing):
 if len(existing)!=len(set(existing)) or any(x not in want for x in existing): raise AssertionError
 return existing+[x for x in want if x not in existing]
def validate(a,p):
 assert a['schema_version']=='quranhikma-i06-r02-proposition-only-offline-identity-reconciler-v1'
 assert a['status']=='offline_identity_reconciled_held_not_deployed'
 assert {k:v['blob'] for k,v in a['basis'].items()}==BASE
 assert a['six_scholar_baseline']==p['six_scholar_baseline']
 want=ids(p); contexts=ctxids(p)
 assert a['identity_contract']['link_identity_values']==want and a['identity_contract']['shared_context_identity_values']==contexts
 assert a['frozen_graph']==p['cardinalities']
 assert len(a['partial_link_subset_results'])==16
 for mask,row in enumerate(a['partial_link_subset_results']):
  existing=[want[i] for i in range(4) if mask&(1<<i)]; final=reconcile(want,existing)
  assert row['mask']==f'{mask:04b}' and row['existing_link_identities']==existing
  assert row['missing_link_identities']==[x for x in want if x not in existing]
  assert row['inserted_link_count']==4-len(existing) and row['final_link_identities']==final and row['final_link_count']==4
  assert row['repeated_full_replay_inserted_links']==0 and row['propositions_preserved']==4 and row['assertion_locators_preserved']==4 and row['shared_context_locators_preserved']==2 and row['result']=='PASS'
 assert len(a['partial_shared_context_subset_results'])==4
 for mask,row in enumerate(a['partial_shared_context_subset_results']):
  existing=[contexts[i] for i in range(2) if mask&(1<<i)]; final=reconcile(contexts,existing)
  assert row['mask']==f'{mask:02b}' and row['existing_context_identities']==existing and row['missing_context_identities']==[x for x in contexts if x not in existing]
  assert row['inserted_context_count']==2-len(existing) and row['final_context_identities']==final and row['final_context_count']==2 and row['repeated_full_replay_inserted_contexts']==0 and row['result']=='PASS'
 assert reconcile(want,want)==want and reconcile(contexts,contexts)==contexts
 assert a['replay_summary']=={'partial_link_subsets_tested':16,'partial_context_subsets_tested':4,'repeated_complete_replay':'no-op','unknown_link_identities_rejected':True,'duplicate_link_identities_rejected':True,'context_cloning_rejected':True,'graph_and_metadata_preserved':True}
 assert a['arabic_english_fidelity']==p['arabic_english_fidelity']
 assert a['active_holds']==p['active_holds'] and len(a['active_holds'])==6 and a['resolved_holds']==[] and a['waived_holds']==[]
 assert a['disagreements_and_absences']==p['disagreements_and_absences']
 assert len(a['unsafe_case_results'])==18 and all(x['result']=='REJECTED' for x in a['unsafe_case_results'])
 assert a['validation']=={'result':'PASS','validator':'scripts/validate-ibn-kathir-i06-r02-proposition-only-offline-identity-reconciler.py','partial_link_subsets_tested':16,'partial_context_subsets_tested':4,'unsafe_cases_rejected':18}
 assert a['physical_ids_allocated']==0 and a['database_write_count']==0 and a['counts_unchanged'] is True and all(a[k] is False for k in FLAGS)
def main():
 raw=PRE.read_bytes(); assert blob(raw)==PRE_BLOB; p=json.loads(raw); araw=ART.read_bytes(); assert blob(araw)==ART_BLOB; a=json.loads(araw); validate(a,p)
 changes=[lambda x:x['identity_contract']['link_identity_values'].pop(),lambda x:x['partial_link_subset_results'].pop(),lambda x:x['partial_link_subset_results'][0].update(inserted_link_count=3),lambda x:x['partial_link_subset_results'][15].update(repeated_full_replay_inserted_links=1),lambda x:x['partial_shared_context_subset_results'].pop(),lambda x:x['partial_shared_context_subset_results'][3].update(repeated_full_replay_inserted_contexts=1),lambda x:x['frozen_graph'].update(propositions=3),lambda x:x['frozen_graph'].update(voices=1),lambda x:x['frozen_graph'].update(physical_ids=1),lambda x:x['arabic_english_fidelity'].update(arabic_controls_voice=False),lambda x:x['arabic_english_fidelity'].update(english_names_may_be_fabricated=True),lambda x:x['active_holds'].pop(),lambda x:x['resolved_holds'].append('waived'),lambda x:x['disagreements_and_absences'].pop(),lambda x:x['unsafe_case_results'].pop(),lambda x:x.update(physical_ids_allocated=1),lambda x:x.update(publication_ready=True),lambda x:x.update(database_written=True)]
 for change in changes:
  bad=copy.deepcopy(a); change(bad)
  try: validate(bad,p)
  except (AssertionError,KeyError,TypeError): continue
  raise AssertionError('Unsafe mutation accepted')
 for bad in ([ids(p)[0],ids(p)[0]],[ids(p)[0],'unknown']):
  try: reconcile(ids(p),bad)
  except AssertionError: continue
  raise AssertionError('Unsafe replay identity accepted')
 print('PASS 16 link subsets, 4 context subsets, repeated replay no-op, 18 unsafe mutations rejected')
if __name__=='__main__': main()

#!/usr/bin/env python3
"""Validate the offline I06-R02 proposition-only held physical preview; no DB/network access."""
from __future__ import annotations
import copy, hashlib, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'data/tafsir/staging/ibn-kathir-108-i06-r02-proposition-only-held-preview-2026-11-06.json'
ART_BLOB='82bbec8516e96ca3be86d6b9f8833fd5344a45c9'
BASIS={'physical_mapping_reconciliation':'e0803f58d326baeab81a081834e3dfed034d8b53','evidence_link_validation':'4bdc1d8f53aa70a14ee273695900ce1a3e26b393','hold_consolidation':'bcbccc3b8dc76cf0a77750cf1dc93b41d77f2503','clause_map':'5832e147d541183557eacd320e16aae6b52b3567','held_proposition_draft':'469ff5d9b0812814cece0fdd43cbd6038c40e0ee'}
KEYS=['108-I06-R02-DISMISSAL-P','108-I06-R02-CHARACTERIZATION-P','108-I06-R02-MEMORY-P','108-I06-R02-REVELATION-P']
CLAUSES=['dismissal','no_descendants_speech','memory_prediction','revelation_statement']
HASHES=['ce548e513db492a19663b73f87b59d1b9e39d7fc8b9f9893fbd1a86b1afdd60e','40d5f51371d46bc98adafad79c5fc7726f55bfac88ea3203272b62204f4cd917','8c889c2299e26e16d19975c7436f84e5e70fc4eb5071b2ec9aa270d9833cab02','9b46afa07c8aea6de6363129e674c09e23eb277ef6461fd954b8b3fca158ada6']
CTX={'reporting_frame':(16733,16801,'6ac4acb6268fa7deff959646611f0f347fdd74cb57ba8acf6f43a60f8f0e6258'),'narrative_context':(16801,16866,'2c231ea2b17e65f08deda3f290d689c0548257d72495e30382dbcc75be1821ec')}
FLAGS=['database_written','publication_ready','route_complete','claim_complete','scholar_complete','chapter_complete']
def validate(a):
 assert a['schema_version']=='quranhikma-i06-r02-proposition-only-held-physical-preview-v1'
 assert a['status']=='proposition_only_held_physical_preview_not_integrated'
 assert a['six_scholar_baseline']=={'tabari':18,'ibn_kathir':15,'qurtubi':23,'jalalayn':5,'saadi':6,'tanwir_disputed_attribution':7}
 assert {k:v['blob'] for k,v in a['basis'].items()}==BASIS
 ps=a['propositions']; assert [x['staging_key'] for x in ps]==KEYS
 assert [(x['claim_type_id'],x['claim_type_code'],x['assertion_mode'],x['speaker_type'],x['speaker_name']) for x in ps]==[(14,'reported_speech','quoted','unspecified',"al-As ibn Wa'il")]*3+[(16,'event_description','explicit','sub_narrator','Yazid ibn Ruman')]
 for x in ps:
  assert (x['mufassir_own_position'],x['attribution_fidelity'],x['verification_state'],x['extraction_validity'])==('reported_only','accurate_paraphrase','source_language_located','pending_source_verification')
  assert x['voice_category'] is None and x['physical_proposition_id'] is None
 ls=a['assertion_evidence_locators']; assert [x['key'] for x in ls]==CLAUSES and [x['sha256'] for x in ls]==HASHES
 assert [(x['start'],x['end']) for x in ls]==[(16866,16874),(16874,16917),(16917,16952),(16952,16991)]
 assert all(x['captured_entry_id']==48457 and x['canonical_entry_id']==48459 and x['offsets']=='zero-based Unicode code points, half-open, unnormalized' and x['physical_evidence_id'] is None for x in ls)
 assert all(hashlib.sha256(x['text'].encode()).hexdigest()==x['sha256'] for x in ls)
 cs=a['shared_context_locators']; assert {x['key']:(x['start'],x['end'],x['sha256']) for x in cs}==CTX
 assert all(x['role']=='shared_context_only' and x['physical_evidence_id'] is None and hashlib.sha256(x['text'].encode()).hexdigest()==x['sha256'] for x in cs)
 links=a['semantic_links']; assert [(x['proposition_ref'],x['assertion_locator_ref']) for x in links]==list(zip(KEYS,CLAUSES))
 assert all(x['relation']=='source_reports_assertion' and x['physical_link_id'] is None and 'does not verify the historical occurrence or compiler endorsement' in x['scope'] for x in links)
 assert a['voices']==[] and a['evidence_rows']==[] and a['routes']==[]
 assert [x['proposition_ref'] for x in a['unresolved_voice_mappings']]==KEYS and all(x['required_before_publication'] for x in a['unresolved_voice_mappings'])
 assert a['cardinalities']=={'propositions':4,'voices':0,'unresolved_voice_mappings':4,'semantic_links':4,'assertion_evidence_locators':4,'shared_context_locators':2,'evidence_rows':0,'routes':0,'physical_ids':0}
 f=a['arabic_english_fidelity']; assert f=={'arabic_controls_voice':True,'english_reporting_names_omitted':['Ibn Ishaq','Yazid ibn Ruman'],'english_names_may_be_fabricated':False,'quoted_mode_means_exact_english_quotation':False,'merged_english_transfers_r02_to_r01_names':False}
 assert len(a['active_holds'])==6 and a['resolved_holds']==[] and a['waived_holds']==[]
 assert len(a['disagreements_and_absences'])==5 and 'competing alternatives' in a['disagreements_and_absences'][0]
 assert a['physical_ids_allocated']==0 and a['database_write_count']==0 and a['counts_unchanged'] is True
 assert all(a[x] is False for x in FLAGS)
 assert a['validation']=={'result':'PASS','validator':'scripts/validate-ibn-kathir-i06-r02-proposition-only-held-preview.py','unsafe_mutations_rejected':18}
def main():
 raw=ART.read_bytes()
 assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==ART_BLOB
 a=json.loads(raw)
 validate(a)
 changes=[
  lambda x:x['propositions'].pop(),lambda x:x['propositions'][0].update(claim_type_id=16),lambda x:x['propositions'][0].update(assertion_mode='explicit'),lambda x:x['propositions'][3].update(speaker_name="al-As ibn Wa'il"),lambda x:x['propositions'][0].update(voice_category='author'),lambda x:x['propositions'][0].update(physical_proposition_id=1),
  lambda x:x['assertion_evidence_locators'][0].update(start=16865),lambda x:x['assertion_evidence_locators'][0].update(text='دَعُوهُ'),lambda x:x['shared_context_locators'].pop(),lambda x:x['shared_context_locators'][0].update(role='independent_evidence'),
  lambda x:x['semantic_links'].pop(),lambda x:x['semantic_links'][0].update(relation='historically_verified'),lambda x:x['semantic_links'][0].update(physical_link_id=1),lambda x:x['voices'].append({'fabricated':True}),lambda x:x['routes'].append({'fabricated':True}),lambda x:x['active_holds'].pop(),lambda x:x.update(publication_ready=True),lambda x:x.update(database_written=True)]
 for change in changes:
  bad=copy.deepcopy(a); change(bad)
  try: validate(bad)
  except (AssertionError,KeyError,TypeError): continue
  raise AssertionError('Unsafe mutation accepted')
 print('PASS 4 propositions, 4 semantic links, 6 exact locators, 0 voices/routes/physical IDs; 18 unsafe mutations rejected')
if __name__=='__main__': main()

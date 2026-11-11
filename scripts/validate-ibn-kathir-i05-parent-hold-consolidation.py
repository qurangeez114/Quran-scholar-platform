#!/usr/bin/env python3
"""Validate the held Surah 108 I05 parent-claim consolidation."""

from __future__ import annotations
import copy, hashlib, json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
ARTIFACT=ROOT/'data/tafsir/staging/ibn-kathir-108-i05-parent-hold-consolidation-2026-11-11.json'
BASELINE={'tabari':18,'ibn_kathir':15,'qurtubi':23,'jalalayn':5,'saadi':6,'tanwir_disputed_attribution':7}
BLOBS={'post_a03_closure_audit':'d3bcbba3afca396e1334446ca1dfd203c2af2d98','a03_hold_consolidation':'179d18c60209968049600c9fe36a122ee74745d5','integration_readiness':'2b1a7abe57d9cb500d60c14e1c5fa6a106ee35cd','held_annotated_assembly':'991e19f469ebbbb6a8373587152a38e9eb140cfe','coverage_reconciliation':'3d05d0e7ee53ed4c1c3a6d292177124b00ea902b','r02_citation_design':'32a0cd27be07e813040502e5671c38a0f722b07d','r02_consumer_contract':'49999f978d632278c34760b164a54563bd9a81f7','a04_gloss_review':'585ae656feacf91d73037c60edf7c3084d7fac7d','p01_bracket_review':'0b07f82e97e99e00e81c61dcb5164687d05b687b'}
HOLD_CLASSES={'a03_anonymous_originator_unit','r02_dependency_and_consumer','a04_gloss_attribution','p01_bracket_provenance','semantic_duplicate_clearance','metadata_persistence','physical_integration_and_lifecycle','source_verification_limits'}

def require(ok,label):
 if not ok: raise ValueError(label)

def text_hash(text): return hashlib.sha256(text.encode()).hexdigest()

def validate(d):
 require(d['schema_version']=='quranhikma-ibn-kathir-108-i05-parent-hold-consolidation-v1','schema')
 require((d['surah'],d['scholar_key'],d['claim_id'],d['verse_mapping'])==(108,'ibn_kathir','108-I05','2'),'scope')
 require(d['status']=='offline_parent_claim_hold_consolidated_claim_incomplete','status')
 require(d['six_scholar_baseline']==BASELINE,'baseline')
 require({k:v['blob'] for k,v in d['basis'].items()}==BLOBS,'basis')
 require(d['inventory_boundary']=={'active_split_claims':15,'reviewed_routes':18,'claim_level_holds_before_step':13,'claim_level_holds_after_step':14,'route_level_holds':3,'publication_ready_claims':0,'publication_ready_routes':0},'inventory')
 a=d['assembly_boundary']; require((a['propositions'],a['voices'],a['evidence_units'],a['links'],a['routes'])==(42,41,32,42,8),'assembly counts')
 require((a['unique_proposition_keys'],a['unique_evidence_keys'],a['unresolved_internal_refs'])==(42,32,0),'assembly identity')
 require(a['exact_eleven_input_union_validated'] is True and a['pairwise_structural_comparisons']==861 and a['unsafe_pairwise_cases_rejected']==7,'assembly validation')
 require(a['semantic_duplicate_clearance'] is False and a['authoritative_historical_mapping_replaced'] is False and a['historical_mapped_count_changed'] is False and a['physical_ids']==0,'assembly safety')
 a3=d['a03_boundary']; require(a3['unit_hold_consolidated'] is True and (a3['unit_active_holds'],a3['unit_resolved_holds'],a3['unit_waived_holds'])==(6,0,0),'A03 holds')
 require(a3['graph']=={'propositions':2,'mapped_voices':1,'unresolved_voice_mappings':1,'evidence_units':2,'links':2,'routes':0,'physical_ids':0},'A03 graph')
 s=a3['source_locator']; require((s['captured_entry_id'],s['canonical_entry_id'],s['start'],s['end'])==(48457,48458,13894,14013) and s['sha256']=='bf65c4f4aa6d3501a1de6ec1eafed518e242d672f0ef813aaf0a8d52e7de6657','A03 source')
 require(a3['anonymous_originator_identity'] is None and a3['anonymous_originator_number']=='unspecified','A03 anonymous boundary')
 require(a3['ibn_jarir_role']=='earlier_reporter_not_proven_originator_or_endorser' and a3['current_reporting_author']=='Ibn Kathir','A03 reporter boundary')
 require(a3['bounded_english_transition']=='absent' and a3['english_paraphrase_is_source_quotation'] is False,'A03 English')
 r=d['r02_boundary']; require((r['evidence_ref'],r['dependency_target'],r['dependency_relation'])==('108-I05-R02-CITATION-E','108-I05-R01','printed_bihi_back_reference'),'R02 dependency')
 require(r['expanded_chain'] is None and r['collector']=='al-Hakim' and r['collection']=='al-Mustadrak' and r['explicit_node']=='Israil ibn Hatim','R02 identities')
 require(r['independence_state']=='unknown' and r['collection_locator'] is None and r['proposition_link_present'] is False,'R02 unknowns')
 rs=r['source_locator']; require((rs['captured_entry_id'],rs['canonical_entry_id'],rs['start'],rs['end'])==(48457,48458,14936,15035) and rs['sha256']=='108e9f4e052a6fbd719e7433c22e994acb772ac203e91f9183ec95f9754b396e','R02 source')
 require(r['bounded_english_transition']=='absent' and r['physical_consumer_compatibility']=='unverified' and r['authentication']=='not_assessed' and r['independent_corroboration']=='not_established','R02 limits')
 a4=d['a04_boundary']; require(a4['originating_identity'] is None and a4['originating_number']=='not_stated' and a4['physical_voice_row_present'] is False,'A04 voice')
 a4s=a4['source_locator']; require((a4s['start'],a4s['end'],a4s['text'])==(15155,15182,'يَعْنِي بِهِ الِاعْتِدَالَ.') and text_hash(a4s['text'])==a4s['sha256']=='be466927f4c4c2bef87c0acb5b754bae97249b79347bfaf934ea8fdb1427a0b0','A04 locator')
 require(a4['ata_as_author_rejected'] is True and a4['ibn_abi_hatim_as_author_rejected'] is True and a4['ibn_kathir_as_author_rejected'] is True,'A04 authorship')
 p=d['p01_boundary']; require(p['bracket_author'] is None and p['editorial_status']=='not_established' and p['technical_grading']=='not_inferred','P01 provenance')
 ps=p['bracket_locator']; require((ps['start'],ps['end'],ps['text'])==(15213,15257,'[كُلُّ هَذِهِ الْأَقْوَالِ غَرِيبَةٌ جِدًّا]') and text_hash(ps['text'])==ps['sha256']=='646b8e92d3d0ef0b84e0e5223a9ab28570e0a3f8103b9434cf0760ac8b30c1ad','P01 bracket')
 require([(x['key'],x['start'],x['end'],x['sha256']) for x in p['authorial_preference_locators']]==[('authorial_preference',15259,15293,'8e353b909eec14007bd04b2efd7333876010cf7c78e05a51ea98f000c216ba8a'),('preferred_meaning',15294,15343,'044373d563074353a850a356d836f1ce4d0c48fa6280ed3db44beea55d19046d')],'P01 preference locators')
 require(p['bracket_and_unbracketed_preference_separate'] is True and p['preferred_interpretation']=='sacrificial_slaughter','P01 disagreement')
 holds=d['parent_active_holds']; require(len(holds)==8 and {x['hold_class'] for x in holds}==HOLD_CLASSES,'parent holds')
 require(all(x['status']=='active' and x['resolved'] is False and x['waived'] is False for x in holds),'hold states')
 require(d['resolved_holds']==[] and d['waived_holds']==[] and d['hold_summary']=={'active':8,'resolved':0,'waived':0},'hold summary')
 require(len(d['disagreements_and_absences'])==7,'disagreements and absences')
 e=d['consolidation_effect']; require(e=={'parent_claim_level_hold_consolidated':True,'parent_claim_complete':False,'claim_level_hold_count_before':13,'claim_level_hold_count_after':14,'route_level_hold_count':3,'active_split_claim_count_changed':False,'publication_ready_claim_count_changed':False,'database_rows_changed':0},'effect')
 require(d['repository_observation']['prior_workflow_run_id']==43009494674 and d['repository_observation']['prior_workflow_state']=='completed_success','workflow')
 require(d['validation']=={'result':'PASS','validator':'scripts/validate-ibn-kathir-i05-parent-hold-consolidation.py','unsafe_mutations_rejected':24},'validation declaration')
 require(d['counts_unchanged'] is True and d['physical_ids_allocated']==0,'count boundary')
 require(d['database_written'] is False and d['database_write_count']==0,'database boundary')
 require(d['publication_ready'] is False and d['claim_complete'] is False and d['scholar_complete'] is False and d['chapter_complete'] is False,'completion boundary')
 require('Refresh the 15-claim and 18-route' in d['next_step'] and 'perform a database operation' in d['next_step'],'next step')

def set_path(d,path,value):
 t=d
 for k in path[:-1]: t=t[k]
 t[path[-1]]=value

def mutation_tests(source):
 muts=[
  (('six_scholar_baseline','ibn_kathir'),16),(('basis','post_a03_closure_audit','blob'),'0'*40),(('inventory_boundary','claim_level_holds_after_step'),13),(('inventory_boundary','publication_ready_claims'),1),
  (('assembly_boundary','propositions'),41),(('assembly_boundary','semantic_duplicate_clearance'),True),(('assembly_boundary','authoritative_historical_mapping_replaced'),True),(('assembly_boundary','physical_ids'),1),
  (('a03_boundary','unit_active_holds'),5),(('a03_boundary','graph','mapped_voices'),2),(('a03_boundary','anonymous_originator_identity'),'Ibn Jarir'),(('a03_boundary','current_reporting_author'),'Ibn Jarir'),(('a03_boundary','bounded_english_transition'),'present'),
  (('r02_boundary','dependency_target'),'108-I05-R02'),(('r02_boundary','expanded_chain'),['invented']),(('r02_boundary','independence_state'),'independent'),(('r02_boundary','proposition_link_present'),True),
  (('a04_boundary','originating_identity'),'Ata'),(('p01_boundary','bracket_author'),'Ibn Kathir'),(('consolidation_effect','parent_claim_complete'),True),
  (('physical_ids_allocated',),1),(('database_written',),True),(('publication_ready',),True),(('claim_complete',),True)
 ]
 rejected=0
 for path,value in muts:
  x=copy.deepcopy(source);set_path(x,path,value)
  try: validate(x)
  except (KeyError,TypeError,ValueError): rejected+=1
 return rejected

def main():
 d=json.loads(ARTIFACT.read_text());validate(d);n=mutation_tests(d);require(n==24,f'unsafe mutations rejected: {n}/24');print('PASS: I05 parent hold consolidation; 24/24 unsafe mutations rejected')

if __name__=='__main__': main()

#!/usr/bin/env python3
"""Validate the non-applying T11 plural-consumer adapter result."""
import copy, importlib.util, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'data/tafsir/staging/tabari-108-t11-plural-consumer-adapter-result-2026-11-12.json'
ADAPTER=ROOT/'scripts/preview-tabari-108-t11-plural-consumer.py'
spec=importlib.util.spec_from_file_location('adapter',ADAPTER);adapter=importlib.util.module_from_spec(spec);spec.loader.exec_module(adapter)

def expected_output():
 values=adapter.load(ROOT);out,rejected=adapter.self_test(*values);out['unsafe_cases_rejected']=rejected;return out

def validate(d,expected):
 assert d['schema_version']=='quranhikma-tabari-108-t11-plural-consumer-adapter-result-v1'
 assert (d['surah'],d['scholar_key'],d['hold_id'])==(108,'tabari','108-TABARI-SCHOLAR-H01')
 assert d['status']=='non_applying_adapter_validated_projection_baseline_stale_h01_active'
 b=d['basis'];assert b=={'repository_head':'c50e8039b4bfd58aba57338c7e617198c00c1942','contract_path':'data/tafsir/staging/tabari-108-t11-plural-consumer-contract-2026-11-12.json','contract_blob':'171fbe9749e7deb0ca521a6f720df910ffe0dd6a','payload_blob':'3ea692a1c310d1206fafedb3efe16c6ce1ced946','projection_blob':'ba5b61eb693222bc1ff3604daec52a6632cd7cfa','t09_result_blob':'0af8fa484379ac89a308467790a5c25b940d63d4','contract_guard_run_id':43224749394,'contract_guard_conclusion':'success'}
 a=d['adapter'];assert a=={'path':'scripts/preview-tabari-108-t11-plural-consumer.py','blob':'88c9a165c9e352dbfbd4cbb0f3de78851a7a6bf7','mode':'non_applying_read_only','input_mutation':False,'files_changed':False,'database_written':False,'unsafe_cases_rejected':12}
 assert d['adapter_output']==expected
 assert expected['status']=='PASS' and expected['mode']=='non_applying_plural_consumer_view' and expected['unsafe_cases_rejected']==12
 align=expected['assembly_alignment'];assert align['projection_input_blob']=='ce87f640f60c43651adcc45e4bfca192b6cbd253' and align['current_payload_blob']=='3ea692a1c310d1206fafedb3efe16c6ce1ced946' and align['aligned'] is False
 assert expected['claims']['108-T11A']['cardinalities']=={'propositions':1,'voices':4,'evidence_units':6,'links':6,'routes':7}
 assert expected['claims']['108-T11C']['cardinalities']=={'propositions':1,'voices':2,'evidence_units':2,'links':2,'routes':2}
 assert expected['claims']['108-T11A']['route_evidence_refs'].count('108-T11A-E4')==2
 assert expected['claims']['108-T11A']['publication_ready'] is expected['claims']['108-T11C']['publication_ready'] is False
 f=d['finding'];assert f=={'plural_consumer_lossless':True,'t11a_voice_projection_lossless':True,'t11c_voice_projection_lossless':True,'evidence_links_routes_preserved_in_consumer_view':True,'projection_input_assembly_blob':'ce87f640f60c43651adcc45e4bfca192b6cbd253','current_payload_blob':'3ea692a1c310d1206fafedb3efe16c6ce1ced946','projection_baseline_aligned':False,'staleness_scope':'exact T09 payload transition recorded by pinned integration result; T11A/T11C projected voice rows remain lossless','required_followup':'guarded projection baseline refresh contract before any consumer integration claim'}
 assert len(d['explicit_disagreements_and_absences'])==5
 inv=d['lifecycle_invariants'];assert inv=={'historical_claims':74,'tabari_claims':18,'publication_ready_tabari_claims':0,'active_scholar_holds_before':48,'active_scholar_holds_after':48,'resolved_scholar_holds':0,'waived_scholar_holds':0,'physical_ids_allocated':0,'database_rows_changed':0,'database_written':False,'publication_ready':False,'scholar_complete':False,'chapter_complete':False,'advance_to_surah_107':False}
 n=d['selected_next_boundary'];assert n=={'kind':'tabari_h01_t11_projection_baseline_refresh_contract','claim_ids':['108-T11A','108-T11C'],'write_mode':'repository_staging_only_non_applying','hold_clearance_authorized':False,'database_write_authorized':False,'advance_to_surah_107':False}
 assert d['validation']=={'result':'PASS','validator':'scripts/validate-tabari-108-t11-plural-consumer-adapter-result.py','unsafe_mutations_rejected':66}
 assert d['database_written'] is False and d['database_write_count']==0 and d['publication_ready'] is False and d['scholar_complete'] is False and d['chapter_complete'] is False

def mutations(d):
 paths=[
 (['schema_version'],'bad'),(['surah'],107),(['scholar_key'],'other'),(['hold_id'],'bad'),(['status'],'complete'),
 (['basis','repository_head'],'0'*40),(['basis','contract_path'],'bad'),(['basis','contract_blob'],'0'*40),(['basis','payload_blob'],'0'*40),(['basis','projection_blob'],'0'*40),(['basis','t09_result_blob'],'0'*40),(['basis','contract_guard_run_id'],0),(['basis','contract_guard_conclusion'],'failure'),
 (['adapter','path'],'bad'),(['adapter','blob'],'0'*40),(['adapter','mode'],'applying'),(['adapter','input_mutation'],True),(['adapter','files_changed'],True),(['adapter','database_written'],True),(['adapter','unsafe_cases_rejected'],11),
 (['adapter_output','status'],'FAIL'),(['adapter_output','mode'],'applying'),(['adapter_output','input_blobs'],{}),(['adapter_output','assembly_alignment','projection_input_blob'],'bad'),(['adapter_output','assembly_alignment','current_payload_blob'],'bad'),(['adapter_output','assembly_alignment','aligned'],True),(['adapter_output','claims','108-T11A','cardinalities','voices'],1),(['adapter_output','claims','108-T11A','cardinalities','evidence_units'],1),(['adapter_output','claims','108-T11A','cardinalities','routes'],6),(['adapter_output','claims','108-T11A','voice_keys'],[]),(['adapter_output','claims','108-T11A','voice_names'],[]),(['adapter_output','claims','108-T11A','evidence_keys'],[]),(['adapter_output','claims','108-T11A','evidence_locators'],[]),(['adapter_output','claims','108-T11A','route_evidence_refs'],[]),(['adapter_output','claims','108-T11A','consumer_view_sha256'],'0'*64),(['adapter_output','claims','108-T11A','publication_ready'],True),
 (['adapter_output','claims','108-T11C','cardinalities','voices'],1),(['adapter_output','claims','108-T11C','cardinalities','evidence_units'],1),(['adapter_output','claims','108-T11C','cardinalities','routes'],1),(['adapter_output','claims','108-T11C','voice_keys'],[]),(['adapter_output','claims','108-T11C','voice_names'],[]),(['adapter_output','claims','108-T11C','evidence_keys'],[]),(['adapter_output','claims','108-T11C','evidence_locators'],[]),(['adapter_output','claims','108-T11C','route_evidence_refs'],[]),(['adapter_output','claims','108-T11C','consumer_view_sha256'],'0'*64),(['adapter_output','claims','108-T11C','publication_ready'],True),(['adapter_output','files_changed'],True),(['adapter_output','database_written'],True),(['adapter_output','publication_ready'],True),(['adapter_output','unsafe_cases_rejected'],11),
 (['finding','plural_consumer_lossless'],False),(['finding','t11a_voice_projection_lossless'],False),(['finding','t11c_voice_projection_lossless'],False),(['finding','evidence_links_routes_preserved_in_consumer_view'],False),(['finding','projection_input_assembly_blob'],'bad'),(['finding','current_payload_blob'],'bad'),(['finding','projection_baseline_aligned'],True),(['finding','staleness_scope'],'unknown'),(['finding','required_followup'],'publish'),
 (['explicit_disagreements_and_absences'],[]),(['lifecycle_invariants','active_scholar_holds_after'],47),(['lifecycle_invariants','physical_ids_allocated'],1),(['lifecycle_invariants','database_written'],True),(['selected_next_boundary','kind'],'publish'),(['selected_next_boundary','database_write_authorized'],True),(['validation','unsafe_mutations_rejected'],65)
 ]
 assert len(paths)==66
 out=[]
 for path,val in paths:
  x=copy.deepcopy(d);q=x
  for k in path[:-1]:q=q[k]
  q[path[-1]]=val;out.append(x)
 return out

def main():
 d=json.loads(ART.read_text());e=expected_output();validate(d,e);rejected=0
 for x in mutations(d):
  try:validate(x,e)
  except (AssertionError,KeyError):rejected+=1
 assert rejected==66
 print('PASS: non-applying T11 plural adapter is lossless; projection baseline staleness isolated; 66/66 unsafe result mutations rejected; H01 active')
if __name__=='__main__':main()

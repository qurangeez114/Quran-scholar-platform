#!/usr/bin/env python3
import copy, hashlib, json, sys
from pathlib import Path
ROOT=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parents[1]
STAGE=ROOT/'data/tafsir/staging'
def read(name,blob):
 raw=(STAGE/name).read_bytes(); actual=hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest(); assert actual==blob,(name,actual,blob); return json.loads(raw)
x=json.loads((STAGE/'ibn-kathir-108-i02-r05-offline-repair-consumer-contract-2026-11-04.json').read_text())
rec=read('ibn-kathir-108-i02-r05-narrator-variant-repair-recommendation-2026-11-04.json','c93575df43c382abbd1c1ddc9f9eb4250b5c24a4')
r05=read('ibn-kathir-108-i02-r05-repair-review-2026-10-14.json','d1f1fed7de17ad21bcfcd08a8e7a8e8df6b4a033')
routes=read('ibn-kathir-108-i02-route-independence-2026-10-14.json','d027bb23e02d8caf869e1fab22bfbb9123fbab95')
def check(q):
 assert q['status']=='offline_repair_consumer_contract_validated_not_publication_ready'
 assert q['claim_id']=='108-I02' and q['route_id']=='108-I02-R05' and q['verse']==1
 scope=q['consumer_scope']; assert scope=={'mode':'offline_read_only_variant_note','source_entry_mutation':False,'database_write':False,'physical_id_allocation':False,'publication':False}
 w=q['witness_identity_contract']; rw=rec['source_witnesses']; assert len(w)==len(rw)==3
 assert [z['ordinal'] for z in w]==[1,2,3]
 assert [z['witness_id'] for z in w]==[z['witness_id'] for z in rw]
 assert [z['role'] for z in w]==[z['role'] for z in rw]
 assert [z['contested_name'] for z in w]==['سليمان بن هلال','سليمان بن بلال','سليمان بن بلال']
 assert [z['variant_form'] for z in w]==['ibn_hilal','ibn_bilal','ibn_bilal']
 assert [z['arabic_chain_anchor'] for z in w]==[z['arabic_chain_anchor'] for z in rw]
 assert [z['anchor_sha256'] for z in w]==[z['anchor_sha256'] for z in rw]
 assert w[0]['entry_id']==48457 and w[1]['locator']=='public text line 33' and w[2]['locator']=='editor 30/207; public text line 39'
 assert all(z['must_remain_distinct'] is True for z in w)
 v=q['variant_contract']; assert v['live_form']=='سليمان بن هلال' and v['external_form']=='سليمان بن بلال'
 assert v['live_witness_count']==1 and v['external_witness_count']==2 and v['independent_witness_count'] is None
 assert v['preferred_form'] is None and v['normalization_target'] is None and v['exact_chain_match'] is False
 assert v['tabari_additional_tokens']==['قال','يحدثنا']
 out=q['required_consumer_output']; assert all(out[k] is True for k in ('display_live_form','display_external_form','display_all_three_locators','display_scan_verification_absence','display_english_chain_limit'))
 assert all(out[k] is False for k in ('render_as_correction','render_as_authenticated','render_as_consensus'))
 assert len(q['prohibited_transformations'])==12
 e=q['english_fidelity']; assert e['positive_chain_evidence_units']==0 and e['one_to_one_chain_alignment'] is False
 assert q['frozen_graph_effect']=={'propositions':0,'voices':0,'evidence_units':0,'links':0,'routes':0,'physical_ids':0,'database_writes':0}
 assert len(q['explicit_absences'])==6
 assert r05['comparison']['authentication_state']=='not_assessed' and routes['publication_ready'] is False
 assert q['counts_unchanged'] is True and q['database_written'] is False and q['publication_ready'] is False and q['scholar_complete'] is False and q['chapter_complete'] is False
check(x)
mutations=[
 lambda q:q.update(status='publication_ready'),lambda q:q['consumer_scope'].update(source_entry_mutation=True),lambda q:q['consumer_scope'].update(database_write=True),
 lambda q:q['witness_identity_contract'].pop(),lambda q:q['witness_identity_contract'][0].update(contested_name='سليمان بن بلال'),lambda q:q['witness_identity_contract'][1].update(contested_name='سليمان بن هلال'),
 lambda q:q['witness_identity_contract'][2].update(locator='public text line 39'),lambda q:q['witness_identity_contract'][0].update(must_remain_distinct=False),
 lambda q:q['variant_contract'].update(independent_witness_count=2),lambda q:q['variant_contract'].update(preferred_form='سليمان بن بلال'),lambda q:q['variant_contract'].update(normalization_target='سليمان بن بلال'),
 lambda q:q['variant_contract'].update(exact_chain_match=True),lambda q:q['required_consumer_output'].update(display_all_three_locators=False),lambda q:q['required_consumer_output'].update(render_as_correction=True),
 lambda q:q['required_consumer_output'].update(render_as_authenticated=True),lambda q:q['english_fidelity'].update(one_to_one_chain_alignment=True),lambda q:q['frozen_graph_effect'].update(propositions=1),
 lambda q:q['explicit_absences'].pop(),lambda q:q.update(database_written=True),lambda q:q.update(chapter_complete=True)]
for m in mutations:
 bad=copy.deepcopy(x);m(bad)
 try:check(bad)
 except (AssertionError,KeyError,IndexError,TypeError):continue
 raise AssertionError('unsafe mutation accepted')
assert len(mutations)==20
print('PASS: Ibn Kathir 108 I02-R05 offline repair consumer contract; 20 unsafe mutations rejected; 0 database writes')

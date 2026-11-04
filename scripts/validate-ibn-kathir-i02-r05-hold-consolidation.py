#!/usr/bin/env python3
import copy,hashlib,json,sys
from pathlib import Path
ROOT=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parents[1]
STAGE=ROOT/'data/tafsir/staging'
def read(name,blob):
 raw=(STAGE/name).read_bytes(); actual=hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest(); assert actual==blob,(name,actual,blob); return json.loads(raw)
x=json.loads((STAGE/'ibn-kathir-108-i02-r05-hold-consolidation-2026-11-04.json').read_text())
rec=read('ibn-kathir-108-i02-r05-narrator-variant-repair-recommendation-2026-11-04.json','c93575df43c382abbd1c1ddc9f9eb4250b5c24a4')
consumer=read('ibn-kathir-108-i02-r05-offline-repair-consumer-contract-2026-11-04.json','b93cbef9198cfb0850e9d11981a2b1d268ab0517')
r05=read('ibn-kathir-108-i02-r05-repair-review-2026-10-14.json','d1f1fed7de17ad21bcfcd08a8e7a8e8df6b4a033')
def check(q):
 assert q['status']=='offline_route_hold_consolidated_not_publication_ready'
 assert q['claim_id']=='108-I02' and q['route_id']=='108-I02-R05'
 f=q['frozen_variant_record']; assert f['witness_count']==3 and f['live_witness_count']==1 and f['external_witness_count']==2
 assert f['independent_witness_count'] is None and f['live_entry_id']==48457
 assert f['live_form']=='سليمان بن هلال' and f['external_form']=='سليمان بن بلال'
 assert f['preferred_form'] is None and f['normalization_target'] is None and f['exact_chain_match'] is False
 assert f['tabari_additional_tokens']==['قال','يحدثنا']
 cw=consumer['witness_identity_contract']; assert len(f['witnesses'])==len(cw)==3
 for a,b in zip(f['witnesses'],cw):
  for k in ('witness_id','work','locator','url','arabic_chain_anchor','anchor_sha256'): assert a[k]==b[k]
 assert q['frozen_graph']=={'propositions':0,'voices':0,'evidence_units':0,'links':0,'routes':0,'physical_ids':0,'database_writes':0}
 holds=q['hold_classes']; assert len(holds)==6 and [h['hold_id'] for h in holds]==['edition-and-narrator-resolution','witness-independence','isnad-authentication','english-chain-fidelity','physical-identity-allocation','integration-and-publication']
 assert all(h['state']=='active' and h['reason'] and h['release_condition'] for h in holds)
 s=q['hold_summary']; assert s=={'active':6,'resolved':0,'waived':0,'route_offline_record_frozen':True,'claim_complete':False,'scholar_complete':False,'chapter_complete':False}
 assert len(q['disagreements_preserved'])==3 and len(q['absences_preserved'])==5
 assert rec['repair_recommendation']['source_mutation_authorized'] is False and consumer['consumer_scope']['database_write'] is False
 assert r05['comparison']['authentication_state']=='not_assessed'
 assert q['counts_unchanged'] is True and q['database_written'] is False and q['publication_ready'] is False and q['claim_complete'] is False and q['scholar_complete'] is False and q['chapter_complete'] is False
check(x)
mutations=[
 lambda q:q.update(status='publication_ready'),lambda q:q['frozen_variant_record'].update(witness_count=2),lambda q:q['frozen_variant_record'].update(live_form='سليمان بن بلال'),
 lambda q:q['frozen_variant_record'].update(preferred_form='سليمان بن بلال'),lambda q:q['frozen_variant_record'].update(normalization_target='سليمان بن بلال'),lambda q:q['frozen_variant_record'].update(independent_witness_count=2),
 lambda q:q['frozen_variant_record']['witnesses'].pop(),lambda q:q['frozen_variant_record']['witnesses'][2].update(locator='public text line 39'),lambda q:q['frozen_graph'].update(routes=1),
 lambda q:q['hold_classes'].pop(),lambda q:q['hold_classes'][0].update(state='resolved'),lambda q:q['hold_classes'][1].update(release_condition=''),
 lambda q:q['hold_summary'].update(active=5),lambda q:q['hold_summary'].update(route_offline_record_frozen=False),lambda q:q['disagreements_preserved'].pop(),
 lambda q:q.update(database_written=True),lambda q:q.update(claim_complete=True),lambda q:q.update(chapter_complete=True)]
for m in mutations:
 bad=copy.deepcopy(x);m(bad)
 try:check(bad)
 except (AssertionError,KeyError,IndexError,TypeError):continue
 raise AssertionError('unsafe mutation accepted')
assert len(mutations)==18
print('PASS: Ibn Kathir 108 I02-R05 hold consolidation; 6 active holds; 18 unsafe mutations rejected; 0 database writes')

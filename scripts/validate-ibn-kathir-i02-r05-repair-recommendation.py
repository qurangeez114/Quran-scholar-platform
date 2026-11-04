#!/usr/bin/env python3
import copy, hashlib, json, sys
from pathlib import Path
ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[1]
STAGE = ROOT / 'data/tafsir/staging'
def read(name, blob):
    raw=(STAGE/name).read_bytes(); actual=hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest(); assert actual==blob,(name,actual,blob); return json.loads(raw)
def sha(s): return hashlib.sha256(s.encode()).hexdigest()
x=json.loads((STAGE/'ibn-kathir-108-i02-r05-narrator-variant-repair-recommendation-2026-11-04.json').read_text())
audit=read('ibn-kathir-108-closure-audit-refresh-2026-11-04.json','08c33ab49ba0acd96d56b3334b7cfb21019c83c8')
r05=read('ibn-kathir-108-i02-r05-repair-review-2026-10-14.json','d1f1fed7de17ad21bcfcd08a8e7a8e8df6b4a033')
routes=read('ibn-kathir-108-i02-route-independence-2026-10-14.json','d027bb23e02d8caf869e1fab22bfbb9123fbab95')
consumer=read('ibn-kathir-108-i02-consumer-audit-2026-10-21.json','b37a3a8af397aac7c57d8fccff415a5c1d774f06')
checkpoint=read('ibn-kathir-108-i02-staging-integration-checkpoint-2026-10-21.json','2b08906c7dc02fcbdda204a1759343b3f71ec83b')
def check(q):
    assert q['status']=='read_only_repair_recommendation_validated_not_authorized_for_source_mutation'
    assert q['surah']==108 and q['verse']==1 and q['claim_id']=='108-I02' and q['route_id']=='108-I02-R05'
    assert audit['coverage_summary']['next_repair_route']=='108-I02-R05'
    w=q['source_witnesses']; assert len(w)==3
    assert [z['witness_id'] for z in w]==['live-staged-48457','public-ibn-kathir-line-33','direct-tabari-30-207-line-39']
    expected=[r05['live_staged_witness']['arabic_anchor'],r05['public_ibn_kathir_witness']['arabic_chain_anchor'],r05['direct_tabari_witness']['arabic_chain_anchor']]
    assert [z['arabic_chain_anchor'] for z in w]==expected
    assert all(z['anchor_sha256']==sha(z['arabic_chain_anchor']) for z in w)
    assert w[0]['entry_id']==48457 and w[0]['contested_name']=='سليمان بن هلال' and w[0]['variant_form']=='ibn_hilal'
    assert [z['contested_name'] for z in w[1:]]==['سليمان بن بلال','سليمان بن بلال']
    assert [z['variant_form'] for z in w[1:]]==['ibn_bilal','ibn_bilal']
    assert w[1]['interface_locator']=='public text line 33' and w[2]['editor_locator']=='30/207' and w[2]['interface_locator']=='public text line 39'
    assert all(z['edition_or_scan_verified'] is False for z in w)
    c=q['comparison']; assert c['report_family_match'] is True and c['exact_chain_match'] is False
    assert c['authentication_state']=='not_assessed' and c['witness_independence_state']=='not_established' and c['proposition_count_effect']==0
    assert q['print_context']['identified_scan_checked_for_variant'] is False
    rec=q['repair_recommendation']; assert rec['action']=='retain_live_text_and_stage_variant_note_only'
    for k in ('source_mutation_authorized','database_write_authorized','normalization_authorized','publication_authorized'): assert rec[k] is False
    assert q['english_fidelity']['full_chain_alignment_claimed'] is False
    assert len(q['explicit_disagreements'])==3 and len(q['explicit_absences'])==6
    assert q['frozen_effects']=={'propositions':0,'voices':0,'evidence_units':0,'links':0,'routes':0,'database_writes':0}
    assert routes['publication_ready'] is False and consumer['validated_draft']['scope']=='R01 only; R02-R11 excluded, not resolved'
    assert checkpoint['payload']['scope']=='R01 only; R02-R11 excluded and unresolved'
    assert q['counts_unchanged'] is True and q['database_written'] is False and q['publication_ready'] is False and q['scholar_complete'] is False and q['chapter_complete'] is False
check(x)
mutations=[
 lambda q:q.update(status='publication_ready'), lambda q:q['source_witnesses'].pop(),
 lambda q:q['source_witnesses'][0].update(contested_name='سليمان بن بلال'), lambda q:q['source_witnesses'][1].update(contested_name='سليمان بن هلال'),
 lambda q:q['source_witnesses'][0].update(arabic_chain_anchor=q['source_witnesses'][1]['arabic_chain_anchor']), lambda q:q['source_witnesses'][2].update(editor_locator='30/208'),
 lambda q:q['source_witnesses'][1].update(edition_or_scan_verified=True), lambda q:q['comparison'].update(exact_chain_match=True),
 lambda q:q['comparison'].update(authentication_state='authenticated'), lambda q:q['comparison'].update(witness_independence_state='independent'),
 lambda q:q['comparison'].update(proposition_count_effect=1), lambda q:q['repair_recommendation'].update(source_mutation_authorized=True),
 lambda q:q['repair_recommendation'].update(normalization_authorized=True), lambda q:q['english_fidelity'].update(full_chain_alignment_claimed=True),
 lambda q:q['explicit_absences'].pop(), lambda q:q.update(database_written=True), lambda q:q.update(scholar_complete=True), lambda q:q.update(chapter_complete=True)]
for m in mutations:
    bad=copy.deepcopy(x); m(bad)
    try: check(bad)
    except (AssertionError,KeyError,IndexError,TypeError): continue
    raise AssertionError('unsafe mutation accepted')
assert len(mutations)==18
print('PASS: Ibn Kathir 108 I02-R05 read-only repair recommendation; 18 unsafe mutations rejected; 0 database writes')

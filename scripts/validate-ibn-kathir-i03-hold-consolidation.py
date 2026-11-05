#!/usr/bin/env python3
import copy,hashlib,json,sys
from pathlib import Path
ROOT=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parents[1]
STAGE=ROOT/'data/tafsir/staging'
def read(name,blob):
 raw=(STAGE/name).read_bytes(); actual=hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest(); assert actual==blob,(name,actual,blob); return json.loads(raw)
x=json.loads((STAGE/'ibn-kathir-108-i03-hold-consolidation-2026-11-04.json').read_text())
audit=read('ibn-kathir-108-closure-audit-after-i02-r05-2026-11-04.json','59af3dba4de320183af1a99fdf91c46c5d5d8618')
scope=read('ibn-kathir-108-i03-scope-boundary-review-2026-10-21.json','de6701678e00023fa9a6ab7eb712f08d4ade74d2')
dossier=read('ibn-kathir-108-i03-clause-evidence-dossier-2026-10-21.json','832b3ef893ecdcab4ac01a8de11a8adb0765fbb8')
draft=read('ibn-kathir-108-i03-two-proposition-draft-2026-10-21.json','0a320992b200f42f306839b10c30d588d25eeb9c')
integration=read('ibn-kathir-108-i03-staging-integration-checkpoint-2026-10-21.json','00beb074a886dbce2c5df44b976d484bae16facf')
def check(q):
 assert q['status']=='offline_claim_hold_consolidated_not_publication_ready' and q['claim_id']=='108-I03'
 assert audit['selected_next_repair']['claim_id']=='108-I03'
 src=q['frozen_source']; assert src['entry_id']==48457 and src['source_sha256']==dossier['source']['source_sha256'] and src['paragraph_sha256']==dossier['source']['paragraph_sha256']
 g=q['frozen_graph']; assert g['historical_claim_count']==integration['payload']['historical_claim_count'] and g['physical_propositions']==integration['payload']['physical_propositions'] and g['routes']==integration['payload']['routes']==0
 assert len(g['propositions'])==integration['payload']['physical_propositions']==2 and len(g['voices'])==integration['payload']['voices']==2 and len(g['evidence_units'])==integration['payload']['evidence_units']==2 and len(g['links'])==integration['payload']['links']==2
 assert [p['staging_key'] for p in g['propositions']]==[p['staging_key'] for p in draft['candidate']['propositions']]
 assert all(p['speaker_name'] is None and p['mufassir_own_position']=='reported_only' for p in g['propositions'])
 assert [v['originating_voice_type'] for v in g['voices']]==['unattributed_group','unattributed_group'] and all(v['originating_voice_name'] is None for v in g['voices'])
 assert [u['independence_state'] for u in g['evidence_units']]==['unknown','unknown']
 clauses=q['clause_scope_contract']; assert len(clauses)==2
 for a,b in zip(clauses,dossier['units']):
  for k in ('key','scope','start_codepoint','end_codepoint','sha256','arabic','controlled_translation'): assert a[k]==b['text' if k=='arabic' else k]
 assert clauses[0]['anonymous_group']=='many Quran readers (unnamed)' and clauses[1]['anonymous_group']=='many jurists (unnamed)'
 assert clauses[0]['end_codepoint']==clauses[1]['start_codepoint']==2219 and clauses[0]['inherited_predicate'] is False and clauses[1]['inherited_predicate'] is True
 assert clauses[1]['ellipsis_note']==dossier['units'][1]['ellipsis_note']
 e=q['english_fidelity']; assert e['state']==scope['english_fidelity']['state']==draft['fidelity']['state'] and e['positive_translation_evidence_units']==0 and e['global_edition_absence_claimed'] is False
 holds=q['hold_classes']; assert len(holds)==6 and [h['hold_id'] for h in holds]==['anonymous-voice-scope','clause-boundary-and-ellipsis','english-fidelity','authority-and-endorsement','historical-versus-physical-count','integration-and-publication']
 assert all(h['state']=='active' and h['reason'] and h['release_condition'] for h in holds)
 assert q['hold_summary']=={'active':6,'resolved':0,'waived':0,'offline_record_frozen':True,'historical_claim_complete':False,'publication_ready':False,'scholar_complete':False,'chapter_complete':False}
 assert len(q['disagreements_and_absences'])==5
 assert q['counts_unchanged'] is True and q['database_written'] is False and q['publication_ready'] is False and q['claim_complete'] is False and q['scholar_complete'] is False and q['chapter_complete'] is False
check(x)
mutations=[
 lambda q:q.update(status='publication_ready'),lambda q:q['frozen_graph'].update(historical_claim_count=2),lambda q:q['frozen_graph'].update(physical_propositions=1),lambda q:q['frozen_graph']['propositions'].pop(),
 lambda q:q['frozen_graph']['propositions'][0].update(speaker_name='named reader'),lambda q:q['frozen_graph']['voices'][0].update(originating_voice_type='single_named_attribution'),lambda q:q['frozen_graph']['voices'][1].update(originating_voice_name='jurists'),
 lambda q:q['frozen_graph']['evidence_units'][0].update(independence_state='independence_supported'),lambda q:q['frozen_graph'].update(routes=1),lambda q:q['clause_scope_contract'].pop(),
 lambda q:q['clause_scope_contract'][0].update(end_codepoint=2220),lambda q:q['clause_scope_contract'][1].update(inherited_predicate=False),lambda q:q['english_fidelity'].update(positive_translation_evidence_units=1),
 lambda q:q['english_fidelity'].update(global_edition_absence_claimed=True),lambda q:q['hold_classes'].pop(),lambda q:q['hold_classes'][0].update(state='resolved'),
 lambda q:q['hold_summary'].update(active=5),lambda q:q['disagreements_and_absences'].pop(),lambda q:q.update(database_written=True),lambda q:q.update(chapter_complete=True)]
for m in mutations:
 bad=copy.deepcopy(x);m(bad)
 try:check(bad)
 except (AssertionError,KeyError,IndexError,TypeError):continue
 raise AssertionError('unsafe mutation accepted')
assert len(mutations)==20
print('PASS: Ibn Kathir 108 I03 hold consolidation; 6 active holds; 20 unsafe mutations rejected; 0 database writes')

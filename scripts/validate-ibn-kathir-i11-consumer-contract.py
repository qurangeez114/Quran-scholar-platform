#!/usr/bin/env python3
import copy, hashlib, json, sys
from pathlib import Path
ROOT=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parents[1]
STAGE=ROOT/'data/tafsir/staging'
def read(name,blob):
 raw=(STAGE/name).read_bytes(); actual=hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest(); assert actual==blob,(name,actual,blob); return json.loads(raw)
c=json.loads((STAGE/'ibn-kathir-108-i11-offline-consumer-contract-2026-11-04.json').read_text())
p=read('ibn-kathir-108-i11-semantic-evidence-projection-2026-11-04.json','c7d1c6c1f4b65530e63edffb983e37b7defabbde')
e=read('ibn-kathir-108-i11-exact-transition-2026-11-04.json','d3af5507037044cb0fc3e4a65396bd714d81de44')
def check(x):
 g=x['expected_graph']; assert x['claim_id']=='108-I11'
 assert x['identity_contract']['expected_counts']=={'propositions':1,'voices':1,'evidence_units':1,'links':1,'routes':0}
 assert len(g['propositions'])==len(g['voices'])==len(g['evidence_units'])==len(g['links'])==1 and g['routes']==[]
 row=p['semantic_rows'][0]; prop,voice=g['propositions'][0],g['voices'][0]
 assert prop['symbolic_key']==row['symbolic_proposition_key'] and (prop['statement_en'],prop['statement_kind'],prop['mode'],prop['assertion_scope'])==(row['statement_en'],row['statement_kind'],row['mode'],row['assertion_scope']) and prop['physical_proposition_id'] is None
 assert voice['symbolic_key']==row['symbolic_voice_key'] and (voice['voice'],voice['reporting_author'],voice['discourse_role'])==(row['voice'],row['reporting_author'],row['discourse_role']) and voice['physical_voice_id'] is None and voice['physical_voice_category'] is None
 unit,src=g['evidence_units'][0],p['evidence_groups'][0]; assert unit['symbolic_key']==src['key']=='E:I11-ARABIC-COMMENTATOR'
 for k in ('scope','unit_type_candidate','attributed_authority_candidate','reporting_work_candidate','chain','routes','independence','positive_languages','locators','physical_evidence_unit_id'): assert unit[k]==src[k]
 link,slink=g['links'][0],p['evidence_links'][0]; assert (link['proposition_ref'],link['evidence_unit_ref'],link['exact_locator_ref'],link['discourse_role'])==(slink['symbolic_proposition_key'],slink['evidence_group'],slink['exact_locator_ref'],slink['discourse_role']) and link['physical_link_created'] is False
 r=x['retained_metadata']; assert r['exact_locators']==p['exact_locators'] and r['fidelity_context']==p['fidelity_context'] and r['route_and_independence_state']==p['route_and_independence_state'] and r['excluded_or_separate_units']==[q['unit_id'] for q in p['excluded_or_separate_units']]
 s=x['consumer_semantics']; assert s['positive_evidence_languages']==['ar']
 for k in ('research_summary_is_not_stored_english_translation','english_local_omission_is_context_only','english_global_absence_not_asserted','invented_translation_forbidden','later_preserved_remembrance_is_distinct_context_only','preceding_reports_and_enemy_gloss_remain_separate','authorial_sentence_creates_no_transmission_route','duplicate_verse_rows_remain_one_witness'): assert s[k] is True
 assert e['english_local_transition']['scope_limit'].startswith('This proves a local omission only') and e['later_english_preserved_remembrance_context']['excluded_from_i11_positive_evidence'] is True
 assert x['identity_contract']['physical_payload'] is False and x['database_written'] is False and x['database_write_count']==0 and x['publication_ready'] is False and x['chapter_complete'] is False and x['proposition_count_effect']==0
 holds=' '.join(x['holds'])
 for t in ('locally omits','No global','semantically and evidentially distinct','unassessed','Abu Jahl','Physical claim type','No physical IDs'): assert t in holds
check(c)
muts=[
 lambda x:x['expected_graph']['propositions'].pop(),lambda x:x['expected_graph']['voices'].pop(),lambda x:x['expected_graph']['evidence_units'].append(copy.deepcopy(x['expected_graph']['evidence_units'][0])),lambda x:x['expected_graph']['links'].pop(),lambda x:x['expected_graph']['routes'].append({'chain':None}),
 lambda x:x['expected_graph']['evidence_units'][0].update(chain=['invented']),lambda x:x['expected_graph']['evidence_units'][0].update(routes=1),lambda x:x['expected_graph']['evidence_units'][0].update(positive_languages=['ar','en']),
 lambda x:x['retained_metadata']['exact_locators'][0]['arabic'].update(start=18068),lambda x:x['retained_metadata']['fidelity_context'][0].update(disposition='positive_support'),lambda x:x['retained_metadata']['fidelity_context'][1].update(excluded_from_positive_evidence=False),
 lambda x:x['consumer_semantics'].update(english_global_absence_not_asserted=False),lambda x:x['consumer_semantics'].update(invented_translation_forbidden=False),lambda x:x['consumer_semantics'].update(later_preserved_remembrance_is_distinct_context_only=False),lambda x:x['consumer_semantics'].update(duplicate_verse_rows_remain_one_witness=False),lambda x:x['identity_contract'].update(physical_payload=True),lambda x:x.update(database_written=True)]
for m in muts:
 b=copy.deepcopy(c);m(b)
 try:check(b)
 except (AssertionError,KeyError,IndexError,TypeError):continue
 raise AssertionError('unsafe mutation accepted')
assert len(muts)==17
print('PASS: I11 consumer contract; 17 unsafe mutations rejected; 0 database writes')

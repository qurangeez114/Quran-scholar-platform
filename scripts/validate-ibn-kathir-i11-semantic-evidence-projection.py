#!/usr/bin/env python3
import copy, hashlib, json, sys
from pathlib import Path
ROOT=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parents[1]
STAGE=ROOT/'data/tafsir/staging'
PROJECTION=STAGE/'ibn-kathir-108-i11-semantic-evidence-projection-2026-11-04.json'
EXACT=STAGE/'ibn-kathir-108-i11-exact-transition-2026-11-04.json'
def sha(s): return hashlib.sha256(s.encode()).hexdigest()
def check(d,e):
 assert d['claim_id']=='108-I11' and len(d['semantic_rows'])==1
 row=d['semantic_rows'][0]
 assert row['symbolic_proposition_key']=='P:108-I11-IBN-KATHIR-UNIVERSALIZATION'
 assert row['mode']=='authorial_interpretation' and row['statement_kind']=='controlled_research_summary_not_stored_english_translation'
 assert all(row[k] is None for k in ('physical_proposition_id','physical_voice_id','physical_claim_type','physical_voice_category'))
 loc=d['exact_locators'][0]; ar=loc['arabic']; src=e['arabic_exact_unit']
 assert loc['english'] is None
 assert (ar['canonical_entry_id'],ar['start'],ar['end'],ar['span_sha256'],ar['text'])==(48459,src['start_cp'],src['end_cp'],src['span_sha256'],src['exact_text'])
 assert sha(ar['text'])==ar['span_sha256']
 assert len(d['fidelity_context'])==2
 local,later=d['fidelity_context']; env=e['english_local_transition']['envelope']; late=e['later_english_preserved_remembrance_context']
 assert (local['start'],local['end'],local['span_sha256'],local['text'])==(env['start_cp'],env['end_cp'],env['span_sha256'],env['exact_text'])
 assert local['disposition']=='local_omission_context_not_positive_support_and_not_global_absence' and local['invented_translation'] is False
 assert (later['start'],later['end'],later['span_sha256'],later['text'])==(late['start_cp'],late['end_cp'],late['span_sha256'],late['exact_text'])
 assert later['disposition']=='distinct_later_context_not_translation_or_positive_support_for_i11' and later['excluded_from_positive_evidence'] is True
 assert len(d['evidence_groups'])==len(d['evidence_links'])==1
 g=d['evidence_groups'][0]; link=d['evidence_links'][0]
 assert g['key']=='E:I11-ARABIC-COMMENTATOR' and g['positive_languages']==['ar'] and g['chain'] is None and g['routes']==0 and g['physical_evidence_unit_id'] is None
 assert link['symbolic_proposition_key']==row['symbolic_proposition_key'] and link['evidence_group']==g['key'] and link['physical_link_created'] is False
 route=d['route_and_independence_state']
 assert route['projection_route_count']==0 and route['single_chapter_witness'] is True and route['duplicate_verse_rows_count_as_independent_witnesses'] is False and route['external_route_independence']=='unassessed'
 assert {x['unit_id'] for x in d['excluded_or_separate_units']}=={'108-I10-R02-ABU-JAHL','AR_ENEMY_GLOSS','LATER-ENGLISH-PRESERVED-REMEMBRANCE'}
 assert d['database_written'] is False and d['database_write_count']==0 and d['publication_ready'] is False and d['chapter_complete'] is False and d['proposition_count_effect']==0
 joined=' '.join(d['holds'])
 for token in ('locally omits','No global','semantically and evidentially distinct','unassessed','Physical claim type','No physical IDs'): assert token in joined

def main():
 d=json.loads(PROJECTION.read_text()); e=json.loads(EXACT.read_text()); check(d,e)
 muts=[
  lambda x:x.update(claim_id='108-I10'), lambda x:x['semantic_rows'].append(copy.deepcopy(x['semantic_rows'][0])),
  lambda x:x['semantic_rows'][0].update(mode='reported_interpretation'), lambda x:x['semantic_rows'][0].update(physical_proposition_id=1),
  lambda x:x['exact_locators'][0].update(english={'text':'invented'}), lambda x:x['exact_locators'][0]['arabic'].update(start=18068),
  lambda x:x['fidelity_context'][0].update(invented_translation=True), lambda x:x['fidelity_context'][0].update(disposition='positive_support'),
  lambda x:x['fidelity_context'][1].update(excluded_from_positive_evidence=False), lambda x:x['evidence_groups'][0].update(positive_languages=['ar','en']),
  lambda x:x['evidence_groups'][0].update(chain=['invented']), lambda x:x['evidence_groups'][0].update(routes=1),
  lambda x:x['evidence_links'].pop(), lambda x:x['route_and_independence_state'].update(duplicate_verse_rows_count_as_independent_witnesses=True),
  lambda x:x.update(database_written=True)]
 for m in muts:
  bad=copy.deepcopy(d); m(bad)
  try: check(bad,e)
  except (AssertionError,KeyError,IndexError,TypeError): continue
  raise AssertionError('unsafe mutation accepted')
 assert len(muts)==15
 print('PASS: I11 semantic/evidence projection; 15 unsafe mutations rejected; 0 database writes')
if __name__=='__main__': main()

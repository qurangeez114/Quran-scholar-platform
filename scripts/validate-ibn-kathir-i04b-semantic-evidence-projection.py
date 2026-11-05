#!/usr/bin/env python3
import copy
import hashlib
import json
from pathlib import Path

PATH = Path('data/tafsir/staging/ibn-kathir-108-i04b-semantic-evidence-projection-2026-11-04.json')
SOURCE = Path('data/tafsir/staging/ibn-kathir-108-i04b-exact-transition-2026-11-04.json')

def validate(d, source):
    assert d['claim_id'] == '108-I04B' and d['surah'] == 108
    assert d['basis'] == {'path':str(SOURCE),'blob':'62005cb94a6d676078bbb7d0172b80b3dedfc71d'}
    assert d['expected_counts'] == dict(propositions=1,voices=1,evidence_units=1,links=1,routes=0)
    for key, count in d['expected_counts'].items():
        assert len(d[key]) == count
    p,v,e,l = (d[k][0] for k in ('propositions','voices','evidence_units','links'))
    assert p['ref'] == '108-I04B-P'
    assert p['statement_en'] == source['claim_contract']['research_statement_en']
    assert p['statement_kind'] == 'controlled_research_summary_not_stored_english_translation'
    assert p['physical_category'] is None
    assert v['ref'] == '108-I04B-V' and v['proposition_ref'] == p['ref']
    assert v['name'] == 'Mujahid' and v['role'] == 'reported_named_earlier_exegete'
    assert v['commentator_endorsement'] is None
    assert e['ref'] == '108-I04B-E' and e['authority'] == 'Mujahid'
    assert e['language'] == 'ar' and e['entry_id'] == 48457
    assert e['source_sha256'] == source['source_witnesses']['arabic']['chapter_sha256']
    assert e['locator'] == source['arabic_exact_unit']
    assert e['print_locator'] == source['source_locator_and_route_state']
    assert e['independence'] == 'unknown'
    assert l == dict(proposition_ref=p['ref'],voice_ref=v['ref'],evidence_unit_ref=e['ref'],physical_id=None)
    assert all(row['physical_id'] is None for row in (p,v,e,l))
    ctx=d['english_fidelity_context']
    assert ctx['entry_id'] == 11079
    assert ctx['source_sha256'] == source['source_witnesses']['english']['chapter_sha256']
    assert ctx['locator'] == source['english_local_transition']
    assert ctx['role'] == 'local_omission_context_only'
    assert ctx['positive_evidence'] is False and ctx['global_edition_absence'] is False
    assert ctx['reconstructed_translation'] is None
    for unit in (e['locator'],ctx['locator']):
        assert len(unit['exact_text']) == unit['end_cp']-unit['start_cp'] == unit['span_codepoints']
        assert hashlib.sha256(unit['exact_text'].encode()).hexdigest() == unit['span_sha256']
    assert d['separation_contract'] == source['separation_contract']
    assert d['holds'] == ['physical_category_resolution','exact_locator_persistence_and_readback','local_english_omission_fidelity','absent_chain_and_authentication','single_chapter_witness_and_unknown_route_independence','authorized_integration_and_publication']
    assert d['six_scholar_baseline'] == source['six_scholar_baseline']
    assert d['counts'] == source['counts']
    assert d['chapter_witness_count'] == 1 and d['proposition_count_effect'] == 0
    assert d['database_write_count'] == 0
    assert all(d[k] is False for k in ('database_written','publication_ready','scholar_complete','chapter_complete'))

def main():
    d=json.loads(PATH.read_text()); source=json.loads(SOURCE.read_text())
    validate(d,source)
    cases=[
        (('voices',0,'name'),'Ibn Abbas'),
        (('voices',0,'commentator_endorsement'),True),
        (('propositions',0,'physical_id'),1),
        (('propositions',0,'physical_category'),'interpretation'),
        (('evidence_units',0,'language'),'en'),
        (('evidence_units',0,'independence'),'independent'),
        (('evidence_units',0,'locator','start_cp'),8977),
        (('evidence_units',0,'locator','exact_text'),'invented'),
        (('links',0,'proposition_ref'),'108-I04C-P'),
        (('routes',),[{'invented':True}]),
        (('english_fidelity_context','positive_evidence'),True),
        (('english_fidelity_context','global_edition_absence'),True),
        (('english_fidelity_context','reconstructed_translation'),'invented'),
        (('holds',),[]),
        (('chapter_witness_count',),3),
        (('database_write_count',),1),
        (('publication_ready',),True),
        (('chapter_complete',),True),
    ]
    for path,value in cases:
        bad=copy.deepcopy(d); node=bad
        for part in path[:-1]: node=node[part]
        node[path[-1]]=value
        try: validate(bad,source)
        except AssertionError: pass
        else: raise AssertionError('Unsafe mutation accepted: '+str(path))
    print(json.dumps({'result':'PASS','unsafe_mutations_rejected':len(cases),'database_writes':0}))

if __name__ == '__main__': main()

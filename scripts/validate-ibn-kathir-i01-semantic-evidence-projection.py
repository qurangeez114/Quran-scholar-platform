#!/usr/bin/env python3
import copy, hashlib, json, sys
from pathlib import Path

ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[1]
STAGE = ROOT / 'data/tafsir/staging'
PROJECTION = STAGE / 'ibn-kathir-108-i01-semantic-evidence-projection-2026-11-04.json'
EXACT = STAGE / 'ibn-kathir-108-i01-exact-classification-2026-11-04.json'

def sha(text):
    return hashlib.sha256(text.encode()).hexdigest()

def check(d, exact):
    assert d['claim_ids'] == ['108-I01-A', '108-I01-B']
    assert len(d['semantic_rows']) == 2
    a, b = d['semantic_rows']
    assert a['symbolic_proposition_key'] == 'P:108-I01A-MEDINAN'
    assert a['symbolic_voice_key'] == 'V:108-I01A-IBN-KATHIR-DIRECT'
    assert a['mode'] == 'authorial_classification'
    assert b['symbolic_proposition_key'] == 'P:108-I01B-MECCAN-QILA'
    assert b['symbolic_voice_key'] == 'V:108-I01B-UNATTRIBUTED'
    assert b['mode'] == 'reported_anonymous_classification'
    assert b['authority_identified'] is False and b['authority_count'] is None
    assert b['transmitter_chain'] is None and b['commentator_adopts_alternative'] is False
    for row in (a, b):
        assert all(row[k] is None for k in ('physical_proposition_id', 'physical_voice_id', 'physical_claim_type', 'physical_voice_category'))
    assert len(d['exact_locators']) == 2
    for loc, ar, en in zip(d['exact_locators'], exact['arabic_units'], exact['english_units']):
        assert loc['claim_id'] == ar['claim_id'] == en['claim_id']
        assert (loc['arabic']['start'], loc['arabic']['end'], loc['arabic']['span_sha256'], loc['arabic']['text']) == (ar['start_cp'], ar['end_cp'], ar['span_sha256'], ar['exact_text'])
        assert (loc['english']['start'], loc['english']['end'], loc['english']['span_sha256'], loc['english']['text']) == (en['start_cp'], en['end_cp'], en['span_sha256'], en['exact_text'])
        assert sha(loc['arabic']['text']) == loc['arabic']['span_sha256']
        assert sha(loc['english']['text']) == loc['english']['span_sha256']
    assert len(d['evidence_groups']) == 1
    group = d['evidence_groups'][0]
    assert group['key'] == 'E:I01-BILINGUAL-CLASSIFICATION-SENTENCE'
    assert group['positive_languages'] == ['ar', 'en'] and group['chain'] is None and group['routes'] == 0
    assert group['physical_evidence_unit_id'] is None and len(group['locators']) == 2
    ar_env, en_env = group['locators']
    assert (ar_env['start'], ar_env['end'], ar_env['span_sha256']) == (exact['arabic_envelope']['start_cp'], exact['arabic_envelope']['end_cp'], exact['arabic_envelope']['span_sha256'])
    assert (en_env['start'], en_env['end'], en_env['span_sha256']) == (exact['english_envelope']['start_cp'], exact['english_envelope']['end_cp'], exact['english_envelope']['span_sha256'])
    assert len(d['evidence_links']) == 2
    assert {x['symbolic_proposition_key'] for x in d['evidence_links']} == {a['symbolic_proposition_key'], b['symbolic_proposition_key']}
    assert {x['exact_locator_ref'] for x in d['evidence_links']} == {x['id'] for x in d['exact_locators']}
    assert all(x['evidence_group'] == group['key'] and x['physical_link_created'] is False for x in d['evidence_links'])
    dc = d['disagreement_contract']
    assert dc['classifications_disagree'] is True and dc['propositions_remain_distinct'] is True and dc['voices_remain_distinct'] is True
    assert dc['merge_forbidden'] is True and dc['explicit_comparative_preference'] is False
    assert dc['english_plurality_or_consensus_inference_forbidden'] is True
    route = d['route_and_independence_state']
    assert route['projection_route_count'] == 0 and route['single_chapter_witness'] is True
    assert route['duplicate_verse_rows_count_as_independent_witnesses'] is False and route['external_route_independence'] == 'unassessed'
    assert d['database_written'] is False and d['database_write_count'] == 0 and d['publication_ready'] is False
    assert d['scholar_complete'] is False and d['chapter_complete'] is False and d['proposition_count_effect'] == 0

def main():
    d = json.loads(PROJECTION.read_text())
    exact = json.loads(EXACT.read_text())
    check(d, exact)
    muts = [
        lambda x: x['semantic_rows'].pop(),
        lambda x: x['semantic_rows'][0].update(symbolic_voice_key='V:MERGED'),
        lambda x: x['semantic_rows'][1].update(authority_identified=True),
        lambda x: x['semantic_rows'][1].update(authority_count=2),
        lambda x: x['semantic_rows'][1].update(transmitter_chain=['invented']),
        lambda x: x['semantic_rows'][1].update(commentator_adopts_alternative=True),
        lambda x: x['semantic_rows'][0].update(physical_proposition_id=1),
        lambda x: x['exact_locators'][0]['arabic'].update(start=32),
        lambda x: x['exact_locators'][1]['english'].update(text='They say in Makkah'),
        lambda x: x['evidence_groups'][0].update(positive_languages=['ar']),
        lambda x: x['evidence_groups'][0].update(routes=1),
        lambda x: x['evidence_links'].pop(),
        lambda x: x['disagreement_contract'].update(merge_forbidden=False),
        lambda x: x['disagreement_contract'].update(explicit_comparative_preference=True),
        lambda x: x['route_and_independence_state'].update(duplicate_verse_rows_count_as_independent_witnesses=True),
        lambda x: x.update(database_written=True)
    ]
    for mutate in muts:
        bad = copy.deepcopy(d)
        mutate(bad)
        try:
            check(bad, exact)
        except (AssertionError, KeyError, IndexError, TypeError):
            continue
        raise AssertionError('unsafe mutation accepted')
    assert len(muts) == 16
    print('PASS: I01 semantic/evidence projection; 16 unsafe mutations rejected; 0 database writes')

if __name__ == '__main__':
    main()

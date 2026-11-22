#!/usr/bin/env python3
import copy
import hashlib
import json
from pathlib import Path

P = Path('data/tafsir/staging/qurtubi-108-q03-cistern-cluster-review-2026-11-20.json')
D = json.loads(P.read_text(encoding='utf-8'))


def check(d):
    assert d['schema_version'] == 'qh-qurtubi-108-q03-cistern-cluster-review-v1'
    assert (d['project'], d['surah'], d['ayah'], d['claim_id']) == ('QuranHikma', 108, 1, '108-Q03')
    assert d['status'] == 'source_reviewed_voice_decomposition_staged_human_review_pending_not_published'
    pr = d['pull_request']
    assert pr['number'] == 470 and pr['draft'] is True and pr['merged'] is False
    b = d['baseline']
    assert (b['six_scholar_claims'], b['qurtubi_claims'], b['active_chapter_holds']) == (74, 23, 48)
    assert b['holds_cleared'] == b['publication_ready_claims_added'] == 0
    assert b['chapter_complete'] is False and b['advance_to_surah_107'] is False
    live = d['live_read_only_witnesses']
    assert live['database_writes'] == 0 and live['tafsir_accuracy_analysis_rows_for_surah_108'] == 0
    assert live['arabic']['id'] == 13239 and live['arabic']['sha256'] == 'e1c72b12ee5bf92aae47d85847ccd2daaf144a215235afbdcf882a075955ecc9'
    assert live['english']['id'] == 38030 and live['english']['sha256'] == '60fa566a5a6b2f311d99e467d6c8569b3ad2c4c398f8a792642d4e7822760520'
    assert live['arabic']['source_url_kind'] == live['english']['source_url_kind'] == 'legacy_numeric_source_identifier_not_url'
    spans = d['exact_bilingual_spans']
    assert len(spans) == 7 and len({x['span_id'] for x in spans}) == 7
    expected = {
        'Q03-AR-ATA-VIEW': (13239, 'ar', 1197, 1266, 'ecaa88220a89966ce7e51427cf4b86d4bf4f04b6b802aa42ca2d6ae5bd6cc524'),
        'Q03-EN-ATA-VIEW': (38030, 'en', 2133, 2270, 'd71c7d7750f37794952eaec8a8a5f985583e26bde8d202b48f055934fb7f4248'),
        'Q03-AR-MUSLIM-ANAS-REPORT': (13239, 'ar', 1267, 1752, '3527c9c0f7d094a38f8171746fdf9865441cccaddab1fd93cd65c5197577b6e8'),
        'Q03-EN-MUSLIM-ANAS-REPORT': (38030, 'en', 2271, 3191, 'bfeaf811aaf1b0de98fee2b3eb02690499d048766f8d9ac0582f256292812fb8'),
        'Q03-AR-QURTUBI-TADHKIRA-DISCUSSION': (13239, 'ar', 1752, 1981, '723d47cd410f2b65e047f94deb8c75097e311198eec47f2dc5c11cb9ad59d142'),
        'Q03-EN-QURTUBI-TADHKIRA-DISCUSSION': (38030, 'en', 3193, 3583, '43bfa4286df974b2d6a44fd85e7624ad1557c633c1a47bd829fbd5db4dd9d151'),
        'Q03-AR-QURTUBI-RIVER-CISTERN-SYNTHESIS': (13239, 'ar', 1982, 2131, 'a11039b3ed5c8b3f09feb84fe91e2bb452a2884969d85a8ff7873577dec75d50')
    }
    for x in spans:
        assert (x['entry_id'], x['language'], x['start_cp'], x['end_cp'], x['sha256']) == expected[x['span_id']]
        assert x['occurrences'] == 1 and x['end_cp'] - x['start_cp'] == len(x['text'])
        assert hashlib.sha256(x['text'].encode()).hexdigest() == x['sha256']
    loc = d['edition_and_collection_locators']
    assert len(loc) == 3 and {x['witness_id'] for x in loc} == {'quranpedia_qurtubi_book_366', 'sahih_muslim_400a', 'tabari_24_645_ata_parallel'}
    assert all(x['url'].startswith('https://') and x['locator'] and x['scope'] for x in loc)
    comps = {x['component_id']: x for x in d['voice_decomposition']}
    assert set(comps) == {'108-Q03-A', '108-Q03-B', '108-Q03-C', '108-Q03-D'}
    assert comps['108-Q03-A']['voice'] == 'Ata'
    assert 'do not merge it with the following prophetic quotation' in comps['108-Q03-A']['boundary']
    assert 'Muslim' in comps['108-Q03-B']['voice'] and 'Anas' in comps['108-Q03-B']['voice']
    assert comps['108-Q03-C']['voice'] == comps['108-Q03-D']['voice'] == 'al-Qurtubi'
    assert 'not wording quoted from Sahih Muslim' in comps['108-Q03-C']['boundary']
    assert 'stored English row ends before this segment' in comps['108-Q03-D']['boundary']
    routes = d['external_route_and_parallel_witnesses']
    assert len(routes) == 4 and all(x['url'].startswith('https://') and len(x['route_as_printed']) >= 4 for x in routes)
    assert routes[1]['wording_scope'].startswith('Muslim states')
    assert 'omits' in routes[2]['wording_scope']
    assert 'Matar/Fitr' in routes[3]['route_as_printed'][2] and 'do not resolve' in routes[3]['persistence_scope']
    f = d['fidelity_findings']
    assert f['required_structured_split'] == ['Ata interpretation', 'Muslim/Anas prophetic quotation', 'al-Qurtubi al-Tadhkira discussion', 'al-Qurtubi synthesis']
    assert f['qurtubi_synthesis_english_coverage'] == 'absent_from_stored_english_row'
    assert f['ata_parallel_location_disagreement'] == "al-Qurtubi says at the gathering; the al-Tabari parallel says in Paradise"
    assert f['four_caliphs_claim_part_of_muslim_report'] is False
    assert f['historical_authenticity_conclusion'] == f['route_independence_conclusion'] == 'not_assessed'
    second = d['independent_source_confirmation']
    assert second['status'].startswith('source_text_and_voice_boundaries_confirmed')
    assert len(second['commentary_witnesses']) == 2
    assert 'lines 35–37' in second['commentary_witnesses'][0]['locator']
    assert 'pp. 216–217' in second['commentary_witnesses'][1]['locator']
    assert second['collection_witness']['reference'].startswith('Sahih Muslim 400a')
    assert second['parallel_commentary_witness']['reference'].startswith('Al-Tabari')
    assert 'al-mawqif' in second['unresolved_variants'][1] and 'fi al-jannah' in second['unresolved_variants'][1]
    assert 'Matar/Fitr' in second['unresolved_variants'][0] and 'unresolved' in second['unresolved_variants'][0]
    assert second['no_new_judgment']['historical_authenticity'] == 'not assessed'
    assert second['no_new_judgment']['route_independence'] == 'not assessed'
    assert second['live_span_result'].startswith('All seven')
    assert d['live_read_only_witnesses']['exact_span_readback']['sha256_matches'] == 7
    assert d['live_read_only_witnesses']['exact_span_readback']['mismatches'] == 0
    assert d['next_target']['claim_id'] == '108-Q04A'
    a = d['actions']
    assert a['source_review_performed'] and a['exact_span_hashes_recorded'] and a['collection_references_recorded']
    assert all(a[k] is False for k in ('live_database_written', 'sql_executed', 'pr_merged', 'deployed'))
    assert a['human_scholarly_approval'] == 'pending' and a['publication_status'] == 'not_published'
    assert d['unresolved_holds'] == [f'108-QURTUBI-SCHOLAR-H0{i}' for i in range(1, 9)]
    assert d['next_target']['claim_id'] == '108-Q04A'


check(D)
mutations = [
    ('published', lambda x: x['actions'].__setitem__('publication_status', 'published')),
    ('write', lambda x: x['actions'].__setitem__('live_database_written', True)),
    ('approval', lambda x: x['actions'].__setitem__('human_scholarly_approval', 'approved')),
    ('hold', lambda x: x['unresolved_holds'].pop()),
    ('count', lambda x: x['baseline'].__setitem__('holds_cleared', 1)),
    ('complete', lambda x: x['baseline'].__setitem__('chapter_complete', True)),
    ('advance', lambda x: x['baseline'].__setitem__('advance_to_surah_107', True)),
    ('span', lambda x: x['exact_bilingual_spans'][0].__setitem__('start_cp', 1198)),
    ('hash', lambda x: x['exact_bilingual_spans'][3].__setitem__('sha256', '0' * 64)),
    ('merge_ata_anas', lambda x: x['voice_decomposition'][0].__setitem__('boundary', 'Ata transmits the Muslim report.')),
    ('misvoice_tadhkira', lambda x: x['voice_decomposition'][2].__setitem__('voice', 'Anas')),
    ('fake_english_synthesis', lambda x: x['fidelity_findings'].__setitem__('qurtubi_synthesis_english_coverage', 'aligned')),
    ('erase_location_difference', lambda x: x['fidelity_findings'].__setitem__('ata_parallel_location_disagreement', 'none')),
    ('attach_caliphs_to_muslim', lambda x: x['fidelity_findings'].__setitem__('four_caliphs_claim_part_of_muslim_report', True)),
    ('auth', lambda x: x['fidelity_findings'].__setitem__('historical_authenticity_conclusion', 'authenticated')),
    ('resolve_name_variant', lambda x: x['external_route_and_parallel_witnesses'][3]['route_as_printed'].__setitem__(2, 'Fitr')),
    ('url', lambda x: x['live_read_only_witnesses']['arabic'].__setitem__('source_url_kind', 'verified_url')),
    ('merge', lambda x: x['pull_request'].__setitem__('merged', True))
]
for name, mutate in mutations:
    bad = copy.deepcopy(D)
    mutate(bad)
    try:
        check(bad)
    except (AssertionError, KeyError, TypeError):
        pass
    else:
        raise AssertionError(f'unsafe mutation accepted: {name}')
print(f'PASS: Qurtubi 108-Q03 cistern cluster split; {len(mutations)}/{len(mutations)} unsafe mutations rejected; 0 writes; 48 holds active')

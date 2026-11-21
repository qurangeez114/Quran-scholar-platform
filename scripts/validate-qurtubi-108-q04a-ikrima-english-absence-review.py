#!/usr/bin/env python3
import copy
import hashlib
import json
from pathlib import Path

P = Path('data/tafsir/staging/qurtubi-108-q04a-ikrima-english-absence-review-2026-11-20.json')
D = json.loads(P.read_text(encoding='utf-8'))


def check(d):
    assert d['schema_version'] == 'qh-qurtubi-108-q04a-ikrima-english-absence-review-v1'
    assert (d['project'], d['surah'], d['ayah'], d['claim_id']) == ('QuranHikma', 108, 1, '108-Q04A')
    assert d['status'] == 'source_reviewed_translation_absence_correction_staged_human_review_pending_not_published'
    r = d['repository_state']
    assert r['main_sha'] == 'deba3cedcfc4f8fa522cb11cd0dc02f9ebf1d695'
    assert r['pull_request'] == 470 and r['draft'] is True and r['merged'] is False
    assert r['conflicting_open_surah_108_tafsir_prs'] == 0
    b = d['baseline']
    assert (b['six_scholar_claims'], b['qurtubi_claims'], b['active_chapter_holds']) == (74, 23, 48)
    assert b['holds_cleared'] == b['publication_ready_claims_added'] == 0
    assert b['chapter_complete'] is False and b['advance_to_surah_107'] is False
    live = d['live_read_only_witnesses']
    assert live['database_writes'] == 0 and live['tafsir_accuracy_analysis_rows_for_surah_108'] == 0
    assert live['arabic']['id'] == 13239 and live['arabic']['sha256'] == 'e1c72b12ee5bf92aae47d85847ccd2daaf144a215235afbdcf882a075955ecc9'
    assert live['english']['id'] == 38030 and live['english']['sha256'] == '60fa566a5a6b2f311d99e467d6c8569b3ad2c4c398f8a792642d4e7822760520'
    assert live['arabic']['source_url_kind'] == live['english']['source_url_kind'] == 'legacy_numeric_source_identifier_not_url'
    s = d['exact_arabic_span']
    assert (s['entry_id'], s['start_cp'], s['end_cp'], s['chars'], s['occurrences']) == (13239, 2131, 2179, 48, 1)
    assert s['end_cp'] - s['start_cp'] == len(s['text']) == s['chars']
    assert hashlib.sha256(s['text'].encode()).hexdigest() == s['sha256'] == '1ed46cf2faad825ae805f3fc0f8307647df630257a2afc2a4a8c43f7703ad253'
    e = d['stored_english_absence']
    assert e['prophethood_occurrences'] == e['ikrima_occurrences'] == e['third_interpretation_marker_occurrences'] == 0
    assert e['book_occurrences'] == 2 and len(e['book_occurrence_contexts']) == 2
    assert [x['position_1_based'] for x in e['book_occurrence_contexts']] == [1769, 3297]
    assert all(x['phrase'] == 'Book of Remembrance' and x['q04a_evidence'] is False for x in e['book_occurrence_contexts'])
    assert e['correct_translation_state'] == 'corresponding_stored_english_meaning_absent'
    assert e['previous_translation_state'] == 'source_verified_english_partial'
    v = d['voice_and_claim_boundary']
    assert v['originating_voice'] == 'Ikrima' and v['qurtubi_role'] == 'reports a named third interpretation'
    assert v['status_within_qurtubi'] == 'reported_only_not_preferred'
    assert v['stored_qurtubi_route'].startswith('none')
    assert v['prophetic_or_companion_attribution'] is False and v['rejected_view'] is False
    loc = {x['source_id']: x for x in d['source_locators']}
    assert set(loc) == {'qurtubi_quranpedia_book_366', 'ibn_al_mubarak_zuhd_report_980', 'ibn_al_mubarak_modern_study_69_394', 'tabari_24_647_648_ikrima_variants'}
    assert loc['ibn_al_mubarak_zuhd_report_980']['route_as_printed'] == ['al-Husayn', 'Yazid ibn Zuray', 'Imara', 'Ikrima']
    assert len(loc['tabari_24_647_648_ikrima_variants']['variant_wordings']) == 4
    f = d['fidelity_findings']
    assert f['qurtubi_arabic_claim_verified'] and f['book_marker_false_positive_confirmed']
    assert f['stored_english_q04a_coverage'] == 'absent'
    assert f['external_book_wording_attested'] and f['external_route_attested']
    assert f['route_is_part_of_stored_qurtubi'] is False and f['variant_wording_requires_preservation'] is True
    assert f['source_relationship_between_qurtubi_and_ibn_al_mubarak_proven'] is False
    assert f['historical_authenticity_conclusion'] == 'not_independently_assessed'
    assert f['route_independence_conclusion'] == 'not_assessed'
    a = d['actions']
    assert a['source_review_performed'] and a['exact_span_hash_recorded'] and a['false_positive_translation_marker_documented']
    assert all(a[k] is False for k in ('live_database_written', 'sql_executed', 'pr_merged', 'deployed'))
    assert a['human_scholarly_approval'] == 'pending' and a['publication_status'] == 'not_published'
    assert d['unresolved_holds'] == [f'108-QURTUBI-SCHOLAR-H0{i}' for i in range(1, 9)]
    assert d['next_target']['claim_id'] == '108-Q04B'


check(D)
mutations = [
    ('published', lambda x: x['actions'].__setitem__('publication_status', 'published')),
    ('write', lambda x: x['actions'].__setitem__('live_database_written', True)),
    ('approval', lambda x: x['actions'].__setitem__('human_scholarly_approval', 'approved')),
    ('hold', lambda x: x['unresolved_holds'].pop()),
    ('count', lambda x: x['baseline'].__setitem__('holds_cleared', 1)),
    ('complete', lambda x: x['baseline'].__setitem__('chapter_complete', True)),
    ('advance', lambda x: x['baseline'].__setitem__('advance_to_surah_107', True)),
    ('span', lambda x: x['exact_arabic_span'].__setitem__('start_cp', 2132)),
    ('hash', lambda x: x['exact_arabic_span'].__setitem__('sha256', '0' * 64)),
    ('partial', lambda x: x['stored_english_absence'].__setitem__('correct_translation_state', 'source_verified_english_partial')),
    ('book_evidence', lambda x: x['stored_english_absence']['book_occurrence_contexts'][0].__setitem__('q04a_evidence', True)),
    ('prophethood_found', lambda x: x['stored_english_absence'].__setitem__('prophethood_occurrences', 1)),
    ('qurtubi_route', lambda x: x['voice_and_claim_boundary'].__setitem__('stored_qurtubi_route', 'Ibn al-Mubarak route')),
    ('preferred', lambda x: x['voice_and_claim_boundary'].__setitem__('status_within_qurtubi', 'preferred')),
    ('prophetic', lambda x: x['voice_and_claim_boundary'].__setitem__('prophetic_or_companion_attribution', True)),
    ('normalize_variants', lambda x: x['source_locators'][3].__setitem__('variant_wordings', ['prophethood and the Book'])),
    ('auth', lambda x: x['fidelity_findings'].__setitem__('historical_authenticity_conclusion', 'authenticated')),
    ('source_link', lambda x: x['fidelity_findings'].__setitem__('source_relationship_between_qurtubi_and_ibn_al_mubarak_proven', True)),
    ('url', lambda x: x['live_read_only_witnesses']['arabic'].__setitem__('source_url_kind', 'verified_url')),
    ('merge', lambda x: x['repository_state'].__setitem__('merged', True))
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
print(f'PASS: Qurtubi 108-Q04A English absence correction; {len(mutations)}/{len(mutations)} unsafe mutations rejected; 0 writes; 48 holds active')

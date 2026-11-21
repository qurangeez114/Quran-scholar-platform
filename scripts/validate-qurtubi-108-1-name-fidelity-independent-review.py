#!/usr/bin/env python3
import copy, hashlib, json
from pathlib import Path

P = Path('data/tafsir/staging/qurtubi-108-1-name-fidelity-independent-review-2026-11-20.json')
D = json.loads(P.read_text(encoding='utf-8'))


def check(d):
    assert d['schema_version'] == 'qh-tafsir-108-1-qurtubi-name-fidelity-independent-review-v1'
    assert (d['project'], d['supabase_project_id'], d['surah'], d['ayah']) == ('QuranHikma', 'ylosytbxpzxzwfzjpaej', 108, 1)
    pr = d['pull_request']
    assert pr['number'] == 470 and pr['draft'] is True and pr['merged'] is False
    s = d['status_ledger']
    assert s == {
        'proposal': 'staged_in_draft_pr_not_applied',
        'source_review': 'automated_independent_second_pass_passed_for_narrow_name_substitution',
        'human_scholarly_approval': 'pending',
        'database_publication': 'not_applied',
        'ui_validation': 'not_applicable_until_authorized_publication'
    }
    inv = d['inventory_boundary']
    assert inv['six_scholar_claims'] == 74 and inv['qurtubi_claims'] == 23
    assert inv['active_chapter_holds'] == 48 and inv['holds_cleared_by_this_review'] == 0
    assert inv['claims_marked_published_by_this_review'] == 0
    assert inv['chapter_complete'] is False and inv['advance_to_surah_107'] is False
    live = d['live_read_only_recheck']
    assert live['database_requests'] == 3 and live['write_statements_executed'] == 0
    assert live['tafsir_accuracy_analysis_rows_for_surah_108'] == 0
    ar, en = live['arabic'], live['english']
    assert (ar['id'], ar['md5'], ar['anchor_position_1_based'], ar['fuller_medinan_clause_position']) == (13239, 'd813e9174d86a6f60a76cb2d88d67a0c', 18, 0)
    assert ar['source_url_value'] == '671' and ar['source_url_interpretation'] == 'legacy_numeric_source_identifier_not_url'
    assert 'مقاتل' in ar['anchor'] and 'مجاهد' not in ar['anchor']
    assert (en['id'], en['md5_before'], en['old_phrase_position_1_based'], en['old_phrase_occurrences']) == (38030, 'a2ed72b9348cbf3c4fbcfff5e7567bb7', 31, 1)
    assert en['md5_after_simulated_read_only_replacement'] == '033ac68543f6cb27588c06ef8a30a230'
    assert en['old_phrase'].endswith('Mujahid.') and en['proposed_phrase'].endswith('Muqatil.')
    witnesses = d['external_witnesses']
    assert len(witnesses) == 4 and len({w['witness_id'] for w in witnesses}) == 4
    assert all(w['url'].startswith('https://') and w['locator'] for w in witnesses)
    assert all('مقاتل' in w['meccan_clause'] for w in witnesses)
    assert witnesses[0]['medinan_clause_present'] is False
    assert all(w['medinan_clause_present'] is True and 'مجاهد' in w['medinan_clause'] for w in witnesses[1:])
    f = d['review_findings']
    assert f['narrow_correction_supported'] is True and f['correct_meccan_authority'] == 'Muqatil'
    assert f['incorrect_stored_english_name'] == 'Mujahid' and f['silent_assimilation_of_fuller_clause_permitted'] is False
    for k in ('historical_authenticity_of_attributions_assessed','edition_identity_resolved','source_independence_resolved','oral_transmission_route_claimed'):
        assert f[k] is False
    a = d['approval_and_action']
    assert a['human_editor_approval_required'] is True and a['human_editor_approval_observed'] is False
    assert all(a[k] is False for k in ('sql_executed','database_written','deployment_performed','merge_performed'))
    expected_holds = [f'108-QURTUBI-SCHOLAR-H0{i}' for i in range(1,9)]
    assert d['unresolved_holds'] == expected_holds
    assert len(d['explicit_absence_and_disagreement']) == 4
    assert d['next_target']['claim_id'] == '108-Q02' and d['next_target']['verse'] == 1


check(D)
mutations = [
    ('pull_request.merged', lambda x: x['pull_request'].__setitem__('merged', True)),
    ('status.published', lambda x: x['status_ledger'].__setitem__('database_publication', 'published')),
    ('holds.cleared', lambda x: x['inventory_boundary'].__setitem__('holds_cleared_by_this_review', 1)),
    ('chapter.complete', lambda x: x['inventory_boundary'].__setitem__('chapter_complete', True)),
    ('db.write', lambda x: x['approval_and_action'].__setitem__('database_written', True)),
    ('sql.run', lambda x: x['approval_and_action'].__setitem__('sql_executed', True)),
    ('approval.faked', lambda x: x['approval_and_action'].__setitem__('human_editor_approval_observed', True)),
    ('arabic.name', lambda x: x['live_read_only_recheck']['arabic'].__setitem__('anchor', x['live_read_only_recheck']['arabic']['anchor'].replace('مقاتل','مجاهد'))),
    ('english.count', lambda x: x['live_read_only_recheck']['english'].__setitem__('old_phrase_occurrences', 2)),
    ('source.url', lambda x: x['live_read_only_recheck']['arabic'].__setitem__('source_url_interpretation', 'verified_url')),
    ('scope.assimilated', lambda x: x['review_findings'].__setitem__('silent_assimilation_of_fuller_clause_permitted', True)),
    ('route.invented', lambda x: x['review_findings'].__setitem__('oral_transmission_route_claimed', True)),
    ('hold.removed', lambda x: x['unresolved_holds'].pop()),
    ('next.advanced', lambda x: x['inventory_boundary'].__setitem__('advance_to_surah_107', True))
]
for name, mutate in mutations:
    bad = copy.deepcopy(D); mutate(bad)
    try: check(bad)
    except (AssertionError, KeyError, TypeError): pass
    else: raise AssertionError(f'unsafe mutation accepted: {name}')
print(f"PASS: Qurtubi 108:1 independent narrow review; {len(mutations)}/{len(mutations)} unsafe mutations rejected; 0 writes; 48 holds active")

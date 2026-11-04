#!/usr/bin/env python3
import copy, hashlib, json, sys
from pathlib import Path

ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[1]
STAGE = ROOT / 'data/tafsir/staging'

def read(name, blob):
    raw = (STAGE / name).read_bytes()
    actual = hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()
    assert actual == blob, (name, actual, blob)
    return json.loads(raw)

consolidation = json.loads((STAGE / 'ibn-kathir-108-i01-hold-consolidation-2026-11-04.json').read_text())
exact = read('ibn-kathir-108-i01-exact-classification-2026-11-04.json', 'b38fba124ca3d7b99ccf7d69a1609adac85df6e9')
projection = read('ibn-kathir-108-i01-semantic-evidence-projection-2026-11-04.json', '6da7f61fac6369596c43f2cd9c1485d73ca64b4d')
contract = read('ibn-kathir-108-i01-offline-consumer-contract-2026-11-04.json', 'bc47df49f8512d6f582179e4bc777f30f78f2f07')

def check(c):
    assert c['claim_ids'] == ['108-I01-A', '108-I01-B']
    assert c['status'] == 'offline_validation_complete_physical_integration_held'
    assert [x['blob'] for x in c['basis']] == [
        'b38fba124ca3d7b99ccf7d69a1609adac85df6e9',
        '6da7f61fac6369596c43f2cd9c1485d73ca64b4d',
        'bc47df49f8512d6f582179e4bc777f30f78f2f07'
    ]
    assert [(x['start_cp'], x['end_cp']) for x in exact['arabic_units']] == [(31, 49), (51, 71)]
    assert [(x['start_cp'], x['end_cp']) for x in exact['english_units']] == [(0, 32), (37, 60)]
    assert exact['voice_and_disagreement_contract']['classifications_disagree'] is True
    assert len(projection['semantic_rows']) == len(projection['evidence_links']) == 2
    assert len(projection['evidence_groups']) == 1
    assert contract['identity_contract']['expected_counts'] == {'propositions': 2, 'voices': 2, 'evidence_units': 1, 'links': 2, 'routes': 0}
    assert c['frozen_graph'] == {
        'propositions': 2, 'voices': 2, 'evidence_units': 1, 'links': 2, 'routes': 0,
        'positive_languages': ['ar', 'en'], 'exact_bilingual_sublocators': 2, 'chapter_witnesses': 1
    }
    assert len(c['ci_observed']) == 6
    assert sum(x['conclusion'] == 'success' for x in c['ci_observed']) == 3
    assert sum(x['conclusion'] == 'cancelled' for x in c['ci_observed']) == 3
    assert {x['key'] for x in c['remaining_holds']} == {
        'disagreement_and_voice_separation', 'anonymous_attribution', 'bilingual_fidelity_and_locators',
        'witness_route_independence', 'claim_and_voice_categories', 'integration'
    }
    joined = ' '.join(x['finding'] for x in c['remaining_holds'])
    for token in ('must remain two propositions', 'no named authority', 'all four offsets and hashes', 'zero transmission routes', 'unallocated', 'No physical IDs'):
        assert token in joined
    assert c['next_research']['closure_audit_blob'] == '1e67f3db9540cf2c7affc49c3c1fd866a5f0a808'
    assert c['next_research']['research_blob'] == '03b4890d28328f918dc175876d1f053271fc53d5'
    assert c['next_research']['evidence_plan_blob'] == 'a373f1af92ad5a911af553ddb3475857a65d6c9b'
    assert c['counts_unchanged'] is True
    assert c['database_written'] is False and c['database_write_count'] == 0
    assert c['publication_ready'] is False and c['scholar_complete'] is False and c['chapter_complete'] is False

check(consolidation)
mutations = [
    lambda x: x['claim_ids'].pop(),
    lambda x: x.update(status='publication_ready'),
    lambda x: x['basis'].pop(),
    lambda x: x['frozen_graph'].update(propositions=1),
    lambda x: x['frozen_graph'].update(voices=1),
    lambda x: x['frozen_graph'].update(routes=1),
    lambda x: x['frozen_graph'].update(positive_languages=['ar']),
    lambda x: x['frozen_graph'].update(exact_bilingual_sublocators=1),
    lambda x: x['frozen_graph'].update(chapter_witnesses=2),
    lambda x: x['remaining_holds'].pop(),
    lambda x: x['remaining_holds'][0].update(key='integration'),
    lambda x: x['next_research'].update(closure_audit_blob='bad'),
    lambda x: x.update(counts_unchanged=False),
    lambda x: x.update(database_written=True),
    lambda x: x.update(chapter_complete=True)
]
for mutate in mutations:
    bad = copy.deepcopy(consolidation)
    mutate(bad)
    try:
        check(bad)
    except (AssertionError, KeyError, IndexError, TypeError):
        continue
    raise AssertionError('unsafe mutation accepted')
assert len(mutations) == 15
print('PASS: I01 hold consolidation; 15 unsafe mutations rejected; 0 database writes')

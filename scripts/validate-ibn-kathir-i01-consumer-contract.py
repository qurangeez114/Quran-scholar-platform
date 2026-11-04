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

c = json.loads((STAGE / 'ibn-kathir-108-i01-offline-consumer-contract-2026-11-04.json').read_text())
p = read('ibn-kathir-108-i01-semantic-evidence-projection-2026-11-04.json', '6da7f61fac6369596c43f2cd9c1485d73ca64b4d')
e = read('ibn-kathir-108-i01-exact-classification-2026-11-04.json', 'b38fba124ca3d7b99ccf7d69a1609adac85df6e9')

def check(x):
    graph = x['expected_graph']
    assert x['claim_ids'] == ['108-I01-A', '108-I01-B']
    assert x['identity_contract']['expected_counts'] == {'propositions': 2, 'voices': 2, 'evidence_units': 1, 'links': 2, 'routes': 0}
    assert len(graph['propositions']) == len(graph['voices']) == len(graph['links']) == 2
    assert len(graph['evidence_units']) == 1 and graph['routes'] == []
    for prop, voice, row in zip(graph['propositions'], graph['voices'], p['semantic_rows']):
        assert prop['symbolic_key'] == row['symbolic_proposition_key'] and prop['claim_id'] == row['claim_id']
        assert (prop['statement_en'], prop['statement_kind'], prop['mode'], prop['assertion_scope']) == (row['statement_en'], row['statement_kind'], row['mode'], row['assertion_scope'])
        assert prop['physical_proposition_id'] is None
        assert voice['symbolic_key'] == row['symbolic_voice_key'] and voice['proposition_ref'] == row['symbolic_proposition_key']
        assert (voice['voice'], voice['reporting_author'], voice['discourse_role']) == (row['voice'], row['reporting_author'], row['discourse_role'])
        assert voice['physical_voice_id'] is None and voice['physical_voice_category'] is None
    anonymous = graph['voices'][1]
    assert anonymous['authority_identified'] is False and anonymous['authority_count'] is None
    assert anonymous['transmitter_chain'] is None and anonymous['commentator_adopts_alternative'] is False
    unit, source = graph['evidence_units'][0], p['evidence_groups'][0]
    assert unit['symbolic_key'] == source['key'] == 'E:I01-BILINGUAL-CLASSIFICATION-SENTENCE'
    for key in ('scope', 'unit_type_candidate', 'attributed_authority_candidate', 'reporting_work_candidate', 'chain', 'routes', 'independence', 'positive_languages', 'locators', 'physical_evidence_unit_id'):
        assert unit[key] == source[key]
    assert unit['positive_languages'] == ['ar', 'en'] and unit['chain'] is None and unit['routes'] == 0
    for link, source_link in zip(graph['links'], p['evidence_links']):
        assert (link['proposition_ref'], link['voice_ref'], link['evidence_unit_ref'], link['exact_locator_ref'], link['discourse_role']) == (source_link['symbolic_proposition_key'], source_link['symbolic_voice_key'], source_link['evidence_group'], source_link['exact_locator_ref'], source_link['discourse_role'])
        assert link['physical_link_created'] is False
    retained = x['retained_metadata']
    assert retained['exact_locators'] == p['exact_locators']
    assert retained['disagreement_contract'] == p['disagreement_contract']
    assert retained['route_and_independence_state'] == p['route_and_independence_state']
    assert retained['exact_locators'][0]['arabic']['text'] == e['arabic_units'][0]['exact_text']
    assert retained['exact_locators'][1]['english']['text'] == e['english_units'][1]['exact_text']
    semantics = x['consumer_semantics']
    assert semantics['positive_evidence_languages'] == ['ar', 'en']
    for key in ('claim_specific_sublocators_required', 'medinan_and_meccan_classifications_remain_distinct', 'direct_and_anonymous_voices_remain_distinct', 'qila_authority_identity_count_and_chain_remain_absent', 'english_they_does_not_establish_plurality_or_consensus', 'ordering_does_not_establish_preference', 'commentator_adoption_of_anonymous_alternative_not_asserted', 'no_transmission_route_created', 'duplicate_verse_rows_remain_one_witness'):
        assert semantics[key] is True
    assert x['identity_contract']['physical_payload'] is False
    assert x['database_written'] is False and x['database_write_count'] == 0 and x['publication_ready'] is False
    assert x['scholar_complete'] is False and x['chapter_complete'] is False and x['proposition_count_effect'] == 0
    holds = ' '.join(x['holds'])
    for token in ('no named authority', 'disagree', 'They', 'one duplicated chapter witness', 'Physical claim type', 'No physical IDs'):
        assert token in holds

check(c)
mutations = [
    lambda x: x['expected_graph']['propositions'].pop(),
    lambda x: x['expected_graph']['voices'].pop(),
    lambda x: x['expected_graph']['evidence_units'].append(copy.deepcopy(x['expected_graph']['evidence_units'][0])),
    lambda x: x['expected_graph']['links'].pop(),
    lambda x: x['expected_graph']['routes'].append({'chain': None}),
    lambda x: x['expected_graph']['voices'][1].update(authority_identified=True),
    lambda x: x['expected_graph']['voices'][1].update(authority_count=2),
    lambda x: x['expected_graph']['voices'][1].update(transmitter_chain=['invented']),
    lambda x: x['expected_graph']['voices'][1].update(commentator_adopts_alternative=True),
    lambda x: x['expected_graph']['evidence_units'][0].update(positive_languages=['ar']),
    lambda x: x['expected_graph']['evidence_units'][0].update(routes=1),
    lambda x: x['retained_metadata']['exact_locators'][0]['arabic'].update(start=32),
    lambda x: x['retained_metadata']['disagreement_contract'].update(merge_forbidden=False),
    lambda x: x['consumer_semantics'].update(english_they_does_not_establish_plurality_or_consensus=False),
    lambda x: x['consumer_semantics'].update(ordering_does_not_establish_preference=False),
    lambda x: x['consumer_semantics'].update(duplicate_verse_rows_remain_one_witness=False),
    lambda x: x['identity_contract'].update(physical_payload=True),
    lambda x: x.update(database_written=True)
]
for mutate in mutations:
    bad = copy.deepcopy(c)
    mutate(bad)
    try:
        check(bad)
    except (AssertionError, KeyError, IndexError, TypeError):
        continue
    raise AssertionError('unsafe mutation accepted')
assert len(mutations) == 18
print('PASS: I01 consumer contract; 18 unsafe mutations rejected; 0 database writes')

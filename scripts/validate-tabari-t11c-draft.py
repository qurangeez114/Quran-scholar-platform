#!/usr/bin/env python3
"""Read-only T11C draft guard. No network, SQL, or apply operation."""
import argparse
import copy
import hashlib
import json
from pathlib import Path

SOURCE = 'dd11e99471301b8b2044d0dddb518a375a69b4c4e8d654ac966ecc1ee46da988'
BOUNDS = [(2039, 2567, 'a3124d113132b3e48d781d2f5ee7df0aa29b55d497a705fe9cabe2384d3af818'),
          (2809, 3235, 'e2e3057e54e8d5b6578c72388178e03b00c0f5f1b68236ade34e909f5f36572e')]
CHAINS = [['ابن المثنى', 'عبد الوهاب', 'داود', 'عكرمة'],
          ['ابن بشار', 'ابن أبى عديّ', 'داود بن أبي هند', 'عكرمة', 'ابن عباس']]
NAMES = ['Ikrima', 'Ibn Abbas']
STATEMENT = "Two reports connect the verse with Quraysh speakers who disparaged Muhammad during the Ka'b ibn al-Ashraf episode; they do not simply identify Ka'b himself as the hostile referent."

def need(condition, message):
    if not condition:
        raise ValueError(message)

def validate(draft, dossier):
    for doc in (draft, dossier):
        need(doc['surah'] == 108 and doc['claim_id'] == '108-T11C', 'claim identity')
        for flag in ('database_written', 'assembly_changed', 'publication_ready', 'chapter_complete'):
            need(doc[flag] is False, 'unsafe flag: ' + flag)
        need(doc['source']['entry_id'] == 5263 and doc['source']['sha256'] == SOURCE, 'source pin')
        need(doc['fidelity']['english_witness'] == 'absent_in_existing_plan', 'English absence')
        need(doc['fidelity']['translation_status'] == 'controlled_research_translation_from_arabic', 'translation label')
        need(doc['counts_unchanged'] == {'claims': 74, 'mapped': 66, 'unmapped': 8}, 'counts')
        need(doc['six_scholar_baseline'] == {'tabari': 18, 'ibn_kathir': 15, 'qurtubi': 23, 'jalalayn': 5, 'saadi': 6, 'tanwir_disputed_attribution': 7}, 'six scholars')
    need(draft['physical_table_mapping'] == {'proposition': 'propositions', 'voices': 'proposition_voice_chain', 'evidence_units': 'evidence_units', 'links': 'proposition_evidence', 'routes': 'evidence_transmission_routes'}, 'table mapping')
    c = draft['candidate']
    need(set(c) == {'proposition', 'voices', 'evidence_units', 'links', 'routes'}, 'sections')
    p = c['proposition']
    need('id' not in p and p['staging_key'] == '108-T11C-P', 'proposition identity')
    need(p['statement_en'] == STATEMENT and p['claim_type_id'] == 43, 'claim meaning')
    for key, value in {'tafsir_entry_id':5263, 'source_type':'tafsir_entry', 'speaker_type':'unspecified', 'speaker_name':None, 'mufassir_own_position':'reported_only', 'verification_state':'source_language_located', 'extraction_validity':'pending_source_verification', 'normative_polarity':None, 'scope_generality':None, 'comparison_object_id':None}.items():
        need(p[key] == value, 'proposition field: ' + key)
    need(len(dossier['units']) == 2, 'dossier unit loss')
    for key in ('voices', 'evidence_units', 'links', 'routes'):
        need(len(c[key]) == 2, key + ' cardinality')
        need(all('id' not in r for r in c[key]), 'generated ID supplied')
    for i, (start, end, digest) in enumerate(BOUNDS):
        number = i + 1
        u = dossier['units'][i]
        e, v, link, route = (c[k][i] for k in ('evidence_units', 'voices', 'links', 'routes'))
        need((u['start_codepoint'], u['end_codepoint'], u['sha256']) == (start, end, digest), 'dossier boundaries')
        need(hashlib.sha256(u['arabic'].encode()).hexdigest() == digest and len(u['arabic']) == end-start, 'report hash')
        need(u['authority'] == NAMES[i] and u['chain_labels_as_written'] == CHAINS[i], 'authority/chain identity')
        need(len(u['transmitter_locators']) == len(CHAINS[i]), 'transmitter locator loss')
        cursor = start
        for label, loc in zip(CHAINS[i], u['transmitter_locators']):
            a, b = loc['start_codepoint'], loc['end_codepoint']
            need(cursor <= a < b <= end and loc['arabic'] == label and u['arabic'][a-start:b-start] == label, 'transmitter locator')
            cursor = b
        er = f'108-T11C-E{number}'
        need(e['staging_key'] == er and e['unit_type'] == 'single_named_attribution' and e['attributed_authority_name'] == NAMES[i] and e['independence_state'] == 'unknown', 'evidence authority')
        need(e['source_locator'] == {'entry_id':5263, 'start_codepoint':start, 'end_codepoint':end, 'sha256':digest, 'arabic':u['arabic']}, 'atomic evidence locator')
        need(v['staging_key'] == f'108-T11C-V{number}' and v['proposition_ref'] == '108-T11C-P' and v['reporting_work_id'] == 1 and v['originating_voice_name'] == NAMES[i] and v['originating_voice_type'] == ['named_earlier_exegete','companion_report'][i], 'voice mapping')
        need(link['proposition_ref'] == '108-T11C-P' and link['evidence_unit_ref'] == er, 'evidence link')
        need(route['staging_key'] == f'108-T11C-R{number}' and route['evidence_unit_ref'] == er and route['transmitter_chain'] == CHAINS[i] and route['source_citation_text'] == u['arabic'], 'route mapping')
    need(p['supporting_span'] == dossier['units'][0]['arabic'], 'supporting span')
    return True

def self_test(draft, dossier):
    mutations = [
        lambda d: d['candidate']['routes'].pop(),
        lambda d: d['candidate']['voices'].pop(),
        lambda d: d['candidate']['voices'][1].update(originating_voice_name='Ikrima'),
        lambda d: d['candidate']['routes'][0]['transmitter_chain'].__setitem__(2, 'داود بن أبي هند'),
        lambda d: d['candidate']['evidence_units'][1]['source_locator'].update(end_codepoint=4322, sha256='6624f5de8cb9634f41597c83af2c1b766aca47b9ceda27e183a9b4c8b12005f1'),
        lambda d: d.update(publication_ready=True),
        lambda d: d['candidate']['proposition'].update(mufassir_own_position='preferred_interpretation'),
        lambda d: d['candidate']['evidence_units'][0].update(id=1),
        lambda d: d['candidate']['links'][1].update(evidence_unit_ref='108-T11C-E1'),
        lambda d: d['fidelity'].update(english_witness='present'),
        lambda d: d['candidate']['proposition'].update(statement_en="Ka'b alone is the hostile referent."),
        lambda d: d['candidate']['evidence_units'][0].update(independence_state='independence_supported'),
    ]
    for mutation in mutations:
        changed = copy.deepcopy(draft)
        mutation(changed)
        try:
            validate(changed, dossier)
        except (ValueError, KeyError):
            continue
        raise ValueError('negative case accepted')
    print(f'PASS: {len(mutations)} unsafe mutations rejected')

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path('.'))
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    base = args.root / 'data/tafsir/staging'
    draft = json.loads((base/'tabari-108-t11c-five-table-draft-2026-10-20.json').read_text())
    dossier = json.loads((base/'tabari-108-t11c-transmission-route-dossier-2026-10-20.json').read_text())
    validate(draft, dossier)
    print('PASS: T11C 1 proposition, 2 authorities, 2 atomic evidence units, 2 links, 2 routes, 9 transmitter locators')
    if args.self_test:
        self_test(draft, dossier)

if __name__ == '__main__':
    main()

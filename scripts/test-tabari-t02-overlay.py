#!/usr/bin/env python3
"""Offline T02 assembly preview. Changes memory only; no publication authority."""
import argparse
import copy
import hashlib
import json
from pathlib import Path

NAMES = {
    'assembly': 'surah-108-payload-assembly-2026-10-16.json',
    'draft': 'tabari-108-t02-four-table-draft-2026-10-19.json',
    'preflight': 'tabari-108-t02-readonly-preflight-2026-10-19.json',
}
PINS = {
    'assembly': '1b6228c128f382521338988f6836cd62fa2a3ec6',
    'draft': '92cc39a6af21f905e88afa144889248e5e911179',
    'preflight': '150b19a643167bef27cb35906d6b708dca65c034',
}
HEADING = 'وقال آخرون: عُنِي بالكوثر: الخير الكثير.'
SOURCE_HASH = '2eae44dd583cc8562eeda7d40aafeeecddd22b3b73055dcfec1363b6c27c87f4'
SPAN_HASH = '50a7a46bbd22af6c3b843c49883407e0c2ff10a7fc139688d4b3ddf28812ffb6'
HOLDS = ('database_written', 'publication_ready', 'chapter_complete')

def require(ok, message):
    if not ok:
        raise ValueError(message)

def blob(raw):
    return hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()

def preview(a, d, p):
    for obj in (a, d, p):
        require(all(obj[k] is False for k in HOLDS), 'publication holds')
    require(d['claim_id'] == p['claim_id'] == '108-T02', 'claim identity')
    require(d['status'] == 'draft_only_not_integrated', 'draft lifecycle')
    require(p['draft']['blob_sha'] == PINS['draft'], 'preflight draft reference')
    require(p['assembly_blob_sha'] == PINS['assembly'], 'preflight assembly reference')
    c = d['candidate']
    require(set(c) == {'proposition', 'voice', 'evidence', 'link'}, 'four sections')
    prop = c['proposition']
    require(prop['statement_en'] == 'Al-Kawthar means abundant good.', 'English scope')
    require(prop['supporting_span'] == HEADING, 'Arabic heading')
    require(hashlib.sha256(HEADING.encode()).hexdigest() == SPAN_HASH, 'heading hash')
    require(d['source']['sha256'] == SOURCE_HASH and d['source']['span_sha256'] == SPAN_HASH, 'source hashes')
    require((d['source']['span_start'], d['source']['span_end']) == (2925, 2965), 'heading range')
    require(prop['tafsir_entry_id'] == 5261 and prop['claim_type_id'] == 44, 'source/type identity')
    require(prop['extracted_by'] == c['link']['linked_by'] == 'work-surah108-v1:t02-candidate', 'markers')
    require(prop['speaker_type'] == 'unspecified' and prop['speaker_name'] is None, 'speaker')
    require(prop['mufassir_own_position'] == 'reported_only', 'reported voice')
    require(prop['extraction_validity'] == 'pending_source_verification' and prop['verification_state'] == 'source_language_located', 'verification limits')
    require(c['voice'] == {'reporting_work_id': 1, 'originating_voice_type': 'unattributed_group', 'originating_voice_name': None, 'quoted_collection': None}, 'anonymous voice')
    require(c['evidence']['unit_type'] == 'unattributed_assertion' and c['evidence']['attributed_authority_name'] is None and c['evidence']['independence_state'] == 'unknown', 'evidence scope')
    require(d['fidelity']['english_witness'] == 'absent' and d['fidelity']['translation_status'] == 'controlled_research_translation_from_arabic', 'English absence')
    source = p['checks']['source']
    require(source['sha256'] == SOURCE_HASH and source['heading_sha256'] == SPAN_HASH and source['heading'] == HEADING, 'saved source verification')
    for key in ('exact_evidence_matches', 'propositions_for_source', 'voices_linked_to_source', 'exact_link_marker_matches', 'exact_proposition_matches'):
        require(p['checks'][key] == 0, 'saved duplicate preflight')
    rows = a['rows']
    require(len(rows) == len({r['claim_id'] for r in rows}) == 74, '74 unique claims')
    target = [r for r in rows if r['claim_id'] == '108-T02']
    require(len(target) == 1, 'one T02')
    before = target[0]
    require(before['assembly_state'] == 'blocked_incomplete_payload_mapping' and 'proposed_payload' not in before, 'before state/repeated application')
    require(before['statement_en'] == prop['statement_en'] and before['tafsir_entry_id'] == 5261 and before['reporting_work_id'] == 1, 'assembly identity')
    require(before['plan_row']['evidence']['raw_start'] == 2937 and before['plan_row']['evidence']['raw_end'] == 2964, 'historical plan range')
    expected_counts = {'claims': 74, 'copied_four_section_payloads': 41, 'new_proposed_four_section_payloads': 23, 'blocked_payload_mappings': 10}
    require(a['counts'] == expected_counts, 'before counts')
    out = copy.deepcopy(a)
    after = next(r for r in out['rows'] if r['claim_id'] == '108-T02')
    after.update(assembly_state='proposed_payload_pending_schema_and_live_validation', missing_payload_sections=[], proposed_payload=copy.deepcopy(c))
    after['t02_heading_locator'] = {'entry_id': 5261, 'start': 2925, 'end': 2965, 'offset_convention': 'zero-based Unicode codepoints, half-open', 'sha256': SPAN_HASH, 'original_plan_range_preserved': [2937, 2964]}
    after['blocking_note'] = 'Anonymous heading candidate only. Saved read-only checks passed; coordinated projection/consumer validation and publication approval remain pending.'
    out['counts']['new_proposed_four_section_payloads'] += 1
    out['counts']['blocked_payload_mappings'] -= 1
    require(after['plan_row'] == before['plan_row'] and after['authoritative_research_claim'] == before['authoritative_research_claim'], 'historical research preserved')
    require([r for r in out['rows'] if r['claim_id'] != '108-T02'] == [r for r in rows if r['claim_id'] != '108-T02'], '73 unrelated claims preserved')
    require(all(out[k] is False for k in HOLDS) and after['publication_ready'] is False, 'preview holds')
    return out

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path('.'))
    args = parser.parse_args()
    folder = args.root / 'data/tafsir/staging'
    inputs = {}
    for key, name in NAMES.items():
        raw = (folder / name).read_bytes()
        require(blob(raw) == PINS[key], 'pinned input drift: ' + key)
        inputs[key] = json.loads(raw)
    a, d, p = (inputs[k] for k in ('assembly', 'draft', 'preflight'))
    snapshot = copy.deepcopy(inputs)
    result = preview(a, d, p)
    require(inputs == snapshot, 'input mutated')
    cases = []
    def altered(which, change):
        triple = copy.deepcopy([a, d, p])
        change(triple[which])
        cases.append(triple)
    altered(1, lambda x: x['candidate']['voice'].update(originating_voice_name='Ibn Abbas'))
    altered(1, lambda x: x['candidate']['proposition'].update(mufassir_own_position='preferred'))
    altered(1, lambda x: x['candidate']['proposition'].update(supporting_span=HEADING + ' حدثني يعقوب'))
    altered(1, lambda x: x['source'].update(span_start=2937))
    altered(1, lambda x: x['fidelity'].update(english_witness='present'))
    altered(1, lambda x: x.update(publication_ready=True))
    altered(2, lambda x: x['checks'].update(exact_proposition_matches=1))
    altered(0, lambda x: x['rows'].append(copy.deepcopy(x['rows'][0])))
    cases.append([result, d, p])
    for triple in cases:
        try:
            preview(*triple)
        except ValueError:
            continue
        raise RuntimeError('unsafe or repeated preview accepted')
    print(json.dumps({'status': 'PASS', 'preview_counts': result['counts'], 'unrelated_claims_preserved': 73, 'unsafe_cases_rejected': len(cases), 'inputs_unchanged': inputs == snapshot, 'database_written': False, 'files_applied': False, 'publication_ready': False, 'chapter_complete': False}))

if __name__ == '__main__':
    main()

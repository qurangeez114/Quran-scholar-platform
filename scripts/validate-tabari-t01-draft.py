#!/usr/bin/env python3
"""Offline staging-only T01 contract check. Never authorizes publication.

Run: python3 scripts/validate-tabari-t01-draft.py --root . --self-test
No network, secrets, database access, writes or generated identifiers.
"""
import argparse
import copy
import hashlib
import json
from pathlib import Path

DRAFT = 'tabari-108-t01-four-table-draft-2026-10-18.json'
SOURCE = 'tabari-108-t01-stored-source-check-2026-10-18.json'
SPAN = 'فقال بعضهم: هو نهر في الجنة أعطاه الله نبيه محمدا صلى الله عليه وسلم.'
SPAN_HASH = '92a0a9f40568c8eabb5bbc34971bdead061f4330ce7b2e0a3b1d0ff161f46e7a'
SOURCE_HASH = '2eae44dd583cc8562eeda7d40aafeeecddd22b3b73055dcfec1363b6c27c87f4'

def validate(d, s):
    def require(ok, label):
        if not ok:
            raise ValueError(label)
    require(d['schema_version'] == 'quranhikma-tabari-t01-four-table-draft-v1', 'schema')
    require(d['surah'] == 108 and d['claim_id'] == '108-T01', 'identity')
    require(d['status'] == 'draft_only_not_integrated', 'draft lifecycle')
    for obj in (d, s):
        require(all(obj[k] is False for k in ('database_written', 'publication_ready', 'chapter_complete')), 'publication hold')
    require((d['authoritative_claim_count'], d['mapped_claim_count_unchanged'], d['unmapped_claim_count_unchanged']) == (74,63,11), 'inventory')
    require(s['claim_id'] == '108-T01' and s['source']['entry_id'] == 5261, 'checkpoint identity')
    require(d['source']['sha256'] == s['source']['sha256'] == SOURCE_HASH, 'source hash')
    require((d['source']['entry_id'], d['source']['language'], d['source']['scholar'], d['source']['verse']) == (5261,'ar','Tabari','108:1'), 'draft source identity')
    require((d['source']['span_start'],d['source']['span_end']) == (165,234), 'source bounds')
    require((s['heading']['start'],s['heading']['end']) == (165,234), 'checkpoint bounds')
    require(s['heading']['text'] == SPAN and len(SPAN) == 69, 'heading')
    require(hashlib.sha256(SPAN.encode()).hexdigest() == d['source']['span_sha256'] == s['heading']['sha256'] == SPAN_HASH, 'span hash')
    c = d['candidate']
    require(set(c) == {'proposition','voice','evidence','link'}, 'four sections')
    p = c['proposition']
    require(p['supporting_span'] == SPAN, 'complete heading only')
    require(p['statement_en'] == 'Al-Kawthar is a river in Paradise given to Muhammad.', 'English scope')
    require(p['claim_type_id'] == 44 and p['source_type'] == 'tafsir_entry' and p['tafsir_entry_id'] == 5261, 'source/type mapping')
    require(p['speaker_type'] == 'unspecified' and p['speaker_name'] is None and p['mufassir_own_position'] == 'reported_only', 'reported anonymous voice')
    require(p['extraction_validity'] == 'pending_source_verification' and p['verification_state'] == 'source_language_located', 'verification ceiling')
    require((p['assertion_mode'],p['status'],p['attribution_fidelity'],p['quranic_textual_support']) == ('explicit','active','accurate_paraphrase','not_stated'), 'proposition semantics')
    require(c['voice'] == {'reporting_work_id':1,'originating_voice_type':'unattributed_group','originating_voice_name':None,'quoted_collection':None}, 'voice/collection')
    e = c['evidence']
    require(e['unit_type'] == 'unattributed_assertion' and e['attributed_authority_name'] is None and e['independence_state'] == 'unknown', 'evidence attribution')
    require(p['extracted_by'] == c['link']['linked_by'] == 'work-surah108-v1:t01-candidate', 'marker')
    require(e['content_summary'] == "Tabari reports an unnamed group's interpretation of al-Kawthar as a river in Paradise given by Allah to Muhammad.", 'evidence summary scope')
    require(c['link']['semantic_link_note'] == "The complete anonymous heading supports the river, Paradise and gift-to-Muhammad scope. Following named reports begin at codepoint 234 and are excluded. This is reported interpretation, not Tabari's own preference.", 'link scope')
    require(all(not any(k in row for k in ('id','proposition_id','evidence_unit_id','transmission_routes')) for row in c.values()), 'no fabricated IDs/routes')
    f = d['fidelity']
    require(f['english_witness'] == 'absent' and f['translation_status'] == 'controlled_research_translation_from_arabic' and f['independence'] == 'unknown', 'fidelity')
    require(f['disagreements_preserved'] == ['T02 abundant-good reading','T03 river included within abundant good','T06 later Tabari preference remains separate'], 'alternatives')

def self_test(d, s):
    changes = [
        (('candidate','voice','originating_voice_name'), 'Ibn Umar'),
        (('candidate','voice','originating_voice_type'), 'exegete_own_view'),
        (('candidate','proposition','mufassir_own_position'), 'preferred'),
        (('candidate','proposition','supporting_span'), 'هو نهر في الجنة'),
        (('candidate','proposition','statement_en'), 'All scholars agree it is a river.'),
        (('source','span_end'),235),
        (('source','sha256'),'0'*64),
        (('fidelity','english_witness'),'present'),
        (('candidate','evidence','independence_state'),'independence_supported'),
        (('candidate','voice','quoted_collection'),'invented collection'),
        (('publication_ready',),True),
        (('mapped_claim_count_unchanged',),64),
        (('candidate','proposition','id'),123),
        (('candidate','voice','transmission_routes'),['invented']),
        (('source','entry_id'),5262),
        (('source','language'),'en'),
        (('candidate','proposition','assertion_mode'),'inferred'),
        (('candidate','proposition','quranic_textual_support'),'explicit'),
        (('candidate','proposition','attribution_fidelity'),'exact_quotation'),
        (('candidate','proposition','status'),'superseded'),
        (('candidate','evidence','content_summary'),'Tabari himself prefers this interpretation.'),
        (('candidate','link','semantic_link_note'),'All named reports belong to this heading.'),
    ]
    validate(d,s)
    for path, value in changes:
        bad = copy.deepcopy(d)
        target = bad
        for key in path[:-1]:
            target = target[key]
        target[path[-1]] = value
        try:
            validate(bad,s)
        except ValueError:
            continue
        raise RuntimeError('Mutation accepted: ' + '.'.join(path))
    print(f'PASS: baseline and {len(changes)} rejected mutations')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path('.'))
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    folder = args.root / 'data/tafsir/staging'
    draft = json.loads((folder / DRAFT).read_text())
    source = json.loads((folder / SOURCE).read_text())
    validate(draft,source)
    if args.self_test:
        self_test(draft,source)
    print('PASS: staging contract only; semantic review, integration and publication remain pending')

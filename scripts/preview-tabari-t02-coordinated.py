#!/usr/bin/env python3
"""Preview three linked T02 staging files in memory; no database or file writes."""
import argparse
import copy
import importlib.util
import json
from pathlib import Path

ASSEMBLY = 'surah-108-payload-assembly-2026-10-16.json'
PROJECTION = 'surah-108-voice-projection-2026-10-17.json'
Q06 = 'qurtubi-108-q06-bilingual-source-check-2026-10-17.json'
PINS = {PROJECTION: 'b5537aa139daff735f388c830d0c0762834b96b7', Q06: 'd95de66e60f042c27c6e8db1f00a3f01e459072b'}

def encode(doc):
    return json.dumps(doc, ensure_ascii=False, indent=2) + '\n'

def build(a, projection, q06, draft, preflight, overlay):
    check = overlay.require
    before = copy.deepcopy((a, projection, q06, draft, preflight))
    sha = overlay.PINS['assembly']
    check(projection['inputs']['assembly_blob_sha'] == sha and q06['input_assembly_blob_sha'] == sha, 'stale consumer assembly reference')
    for doc in (projection, q06):
        check(all(doc[k] is False for k in overlay.HOLDS), 'consumer publication holds')
    check(projection['counts'] == {'total_claims': 74, 'projected': 64, 'unmapped': 10, 'rows_with_preserved_metadata': 41, 'semantic_holds': 12}, 'before projection counts')
    check(len(projection['rows']) == len({r['claim_id'] for r in projection['rows']}) == 74, 'projection inventory')
    old = [r for r in projection['rows'] if r['claim_id'] == '108-T02']
    check(old == [{'claim_id': '108-T02', 'state': 'blocked_no_four_table_payload', 'publication_ready': False}], 'projection before/repeated state')
    assembly = overlay.preview(a, draft, preflight)
    new_sha = overlay.blob(encode(assembly).encode())
    projected = copy.deepcopy(projection)
    replacement = {'claim_id': '108-T02', 'state': 'staging_only_not_insertable',
                   'target_table': 'proposition_voice_chain', 'database_fields': copy.deepcopy(draft['candidate']['voice']),
                   'staging_metadata': {}, 'semantic_publication_hold': None, 'publication_ready': False,
                   'blockers': ['proposition_id unresolved until authorized proposition insertion', 'final coordinated preflight pending']}
    projected['rows'] = [replacement if r['claim_id'] == '108-T02' else r for r in projected['rows']]
    projected['inputs']['assembly_blob_sha'] = new_sha
    projected['counts'].update(projected=65, unmapped=9)
    check([r for r in projected['rows'] if r['claim_id'] != '108-T02'] == [r for r in projection['rows'] if r['claim_id'] != '108-T02'], '73 projection rows changed')
    check(all(r['publication_ready'] is False for r in projected['rows']), 'row publication hold')
    oldq = next(r for r in a['rows'] if r['claim_id'] == '108-Q06')
    newq = next(r for r in assembly['rows'] if r['claim_id'] == '108-Q06')
    check(oldq == newq, 'Q06 research changed')
    rebased = copy.deepcopy(q06)
    rebased['previous_assembly_blob_sha'] = sha
    rebased['input_assembly_blob_sha'] = new_sha
    rebased['preview_rebase_note'] = 'T02-only preview: Q06 row unchanged as JSON; historical source-check date retained, no fresh source check inferred.'
    check(rebased['at'] == q06['at'] and rebased['locators'] == q06['locators'], 'historical evidence changed')
    check((a, projection, q06, draft, preflight) == before, 'input mutated')
    return {ASSEMBLY: encode(assembly), PROJECTION: encode(projected), Q06: encode(rebased)}

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--root', type=Path, default=Path('.'))
    p.add_argument('--scripts-root', type=Path, default=Path('scripts'))
    args = p.parse_args()
    spec = importlib.util.spec_from_file_location('t02_overlay', args.scripts_root / 'test-tabari-t02-overlay.py')
    overlay = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(overlay)
    folder = args.root / 'data/tafsir/staging'
    def read(name):
        return json.loads((folder / name).read_text())
    for key, name in overlay.NAMES.items():
        overlay.require(overlay.blob((folder / name).read_bytes()) == overlay.PINS[key], 'pinned input drift: ' + key)
    for name, sha in PINS.items():
        overlay.require(overlay.blob((folder / name).read_bytes()) == sha, 'pinned consumer drift: ' + name)
    inputs = [read(ASSEMBLY), read(PROJECTION), read(Q06), read(overlay.NAMES['draft']), read(overlay.NAMES['preflight'])]
    outputs = build(*inputs, overlay)
    cases = []
    for index, field, value in [(1, 'inputs', {'assembly_blob_sha': 'bad'}), (2, 'input_assembly_blob_sha', 'bad'), (1, 'publication_ready', True)]:
        bad = copy.deepcopy(inputs)
        bad[index][field] = value
        cases.append(bad)
    bad = copy.deepcopy(inputs)
    bad[1]['rows'].append(copy.deepcopy(bad[1]['rows'][0]))
    cases.append(bad)
    cases.append([json.loads(outputs[name]) for name in (ASSEMBLY, PROJECTION, Q06)] + inputs[3:])
    for bad in cases:
        try:
            build(*bad, overlay)
        except ValueError:
            continue
        raise RuntimeError('unsafe/repeated coordinated preview accepted')
    print(json.dumps({'status': 'PASS', 'files_previewed': 3, 'claims': 74, 'preview_mapped': 65, 'preview_unmapped': 9, 'unrelated_assembly_and_projection_rows_preserved': 73, 'rejected_cases': len(cases), 'output_blob_shas': {name: overlay.blob(text.encode()) for name, text in outputs.items()}, 'files_applied': False, 'database_written': False, 'publication_ready': False, 'chapter_complete': False}))

if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Validate the original or exact coordinated T02 state; no writes or publication."""
import argparse
import copy
import importlib.util
import itertools
import json
from pathlib import Path

BASE_COMMIT = 'f737063faf85198b8cf46286b8643681bba9687c'

def lifecycle(before, after, current):
    if set(before) != set(after) or set(current) != set(before):
        raise ValueError('Missing or unexpected coordinated file')
    if current == before:
        return 'original_unapplied'
    if current == after:
        return 'exact_three_file_preview'
    raise ValueError('Partial or divergent T02 transition')

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline', type=Path, required=True, help='Pinned pre-T02 checkout ' + BASE_COMMIT)
    parser.add_argument('--current', type=Path)
    parser.add_argument('--scripts-root', type=Path, default=Path('scripts'))
    args = parser.parse_args()
    def module(name):
        spec = importlib.util.spec_from_file_location(name, args.scripts_root / (name + '.py'))
        obj = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(obj)
        return obj
    overlay = module('test-tabari-t02-overlay')
    coordinated = module('preview-tabari-t02-coordinated')
    pins = {overlay.NAMES[k]: sha for k, sha in overlay.PINS.items()}
    pins.update(coordinated.PINS)
    folder = args.baseline / 'data/tafsir/staging'
    raw = {name: (folder / name).read_bytes() for name in pins}
    for name, sha in pins.items():
        overlay.require(overlay.blob(raw[name]) == sha, 'Baseline pin mismatch: ' + name)
    docs = {name: json.loads(value) for name, value in raw.items()}
    after = coordinated.build(docs[coordinated.ASSEMBLY], docs[coordinated.PROJECTION], docs[coordinated.Q06], docs[overlay.NAMES['draft']], docs[overlay.NAMES['preflight']], overlay)
    before = {name: raw[name].decode() for name in after}
    overlay.require(lifecycle(before, after, before) == 'original_unapplied', 'before state')
    overlay.require(lifecycle(before, after, after) == 'exact_three_file_preview', 'after state')
    rejected = 0
    for choices in itertools.product((False, True), repeat=3):
        if all(choices) or not any(choices):
            continue
        mixed = {name: (after if changed else before)[name] for name, changed in zip(before, choices)}
        try:
            lifecycle(before, after, mixed)
        except ValueError:
            rejected += 1
            continue
        raise RuntimeError('Partial application accepted')
    corrupt = copy.deepcopy(after)
    corrupt[next(iter(corrupt))] += ' '
    try:
        lifecycle(before, after, corrupt)
    except ValueError:
        rejected += 1
    else:
        raise RuntimeError('Divergent bytes accepted')
    current_state = None
    if args.current:
        current = {name: (args.current / 'data/tafsir/staging' / name).read_text() for name in before}
        current_state = lifecycle(before, after, current)
    print(json.dumps({'status': 'PASS', 'current_state': current_state, 'partial_or_divergent_states_rejected': rejected, 'output_blobs': {name: overlay.blob(value.encode()) for name, value in after.items()}, 'files_applied': False, 'database_written': False, 'publication_ready': False, 'chapter_complete': False}))

if __name__ == '__main__':
    main()

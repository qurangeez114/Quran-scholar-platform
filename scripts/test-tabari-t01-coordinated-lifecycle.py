#!/usr/bin/env python3
"""Check an exact three-file T01 transition against a separately pinned baseline.

Does not apply files or approve publication. Other repository consumers still
require their own coordinated validation before integration.
"""
import argparse
import copy
import importlib.util
import itertools
import json
from pathlib import Path

BASE_COMMIT='5517c14dbde1656932d55a7d310b458f7c1866f7'
PINS={
 'surah-108-payload-assembly-2026-10-16.json':'34938f3e141f01d409100a5f97d10baa9f232c78',
 'surah-108-voice-projection-2026-10-17.json':'02568e6caa398cb0fcc11ce74431233f8eda7a05',
 'qurtubi-108-q06-bilingual-source-check-2026-10-17.json':'bcf625c6a933487ac6ef147df789f762cd22eb31',
 'tabari-108-t01-assembly-overlay-2026-10-18.json':'fdce7103c3a8dd982d185104c6956278e23f20f1',
 'tabari-108-t01-four-table-draft-2026-10-18.json':'ec526f9ed35a157fd623a8ef8455cc7ba6b1abe7',
 'tabari-108-t01-stored-source-check-2026-10-18.json':'0c8e5c6c4b6e6ee119ecb69e3b253548b07631e9',
}

def lifecycle(before,after,current):
    if set(before)!=set(after) or set(current)!=set(before):
        raise ValueError('Missing or unexpected coordinated file')
    if current==before: return 'original_unapplied'
    if current==after: return 'exact_three_file_preview'
    raise ValueError('Partial or divergent T01 transition')

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--baseline',type=Path,required=True,help='Checkout of pinned pre-T01 commit '+BASE_COMMIT)
    p.add_argument('--current',type=Path,help='Optional checkout to validate against original/exact preview')
    p.add_argument('--scripts-root',type=Path,default=Path('scripts'))
    args=p.parse_args()
    def module(name):
        spec=importlib.util.spec_from_file_location(name,args.scripts_root/(name+'.py'))
        obj=importlib.util.module_from_spec(spec); spec.loader.exec_module(obj); return obj
    contract=module('validate-tabari-t01-draft')
    overlay_test=module('test-tabari-t01-overlay')
    coordinated=module('preview-tabari-t01-coordinated')
    folder=args.baseline/'data/tafsir/staging'
    raw={name:(folder/name).read_bytes() for name in PINS}
    for name,sha in PINS.items():
        if overlay_test.blob(raw[name])!=sha: raise ValueError('Baseline pin mismatch: '+name)
    docs={name:json.loads(value) for name,value in raw.items()}
    after=coordinated.build(docs[coordinated.ASSEMBLY],docs[coordinated.PROJECTION],docs[coordinated.Q06],docs['tabari-108-t01-assembly-overlay-2026-10-18.json'],docs[contract.DRAFT],docs[contract.SOURCE],contract,overlay_test)
    before={name:raw[name].decode() for name in after}
    if lifecycle(before,after,before)!='original_unapplied': raise RuntimeError('Before state')
    if lifecycle(before,after,after)!='exact_three_file_preview': raise RuntimeError('After state')
    rejected=0
    for choices in itertools.product((False,True),repeat=3):
        if all(choices) or not any(choices): continue
        mixed={name:(after if changed else before)[name] for name,changed in zip(before,choices)}
        try: lifecycle(before,after,mixed)
        except ValueError: rejected+=1; continue
        raise RuntimeError('Partial application accepted')
    corrupt=copy.deepcopy(after); corrupt[next(iter(corrupt))]+=' '
    try: lifecycle(before,after,corrupt)
    except ValueError: rejected+=1
    else: raise RuntimeError('Divergent bytes accepted')
    if args.current:
        current={name:(args.current/'data/tafsir/staging'/name).read_text() for name in before}
        print('Current state: '+lifecycle(before,after,current))
    print(f'PASS: original and exact three-file states; {rejected} partial/divergent states rejected')
    print('No files applied; publication holds remain.')

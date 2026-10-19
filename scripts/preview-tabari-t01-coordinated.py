#!/usr/bin/env python3
"""Non-applying, pinned T01 assembly/projection/Q06 preview. No database I/O.

This does NOT validate every repository consumer or authorize integration.
"""
import argparse
import copy
import importlib.util
import json
from pathlib import Path

ASSEMBLY='surah-108-payload-assembly-2026-10-16.json'
PROJECTION='surah-108-voice-projection-2026-10-17.json'
Q06='qurtubi-108-q06-bilingual-source-check-2026-10-17.json'

def encode(doc):
    return json.dumps(doc,ensure_ascii=False,indent=2)+'\n'

def build(a, projection, q06, overlay, draft, source, contract, overlay_test):
    if q06['input_assembly_blob_sha'] != overlay['expected_blobs']['assembly']:
        raise ValueError('Stale Q06 checkpoint')
    if projection['inputs']['assembly_blob_sha'] != overlay['expected_blobs']['assembly']:
        raise ValueError('Stale projection')
    original=copy.deepcopy((a,projection,q06))
    out=overlay_test.preview(a,overlay,draft,source,contract.validate)
    sha=overlay_test.blob(encode(out).encode())
    projected=copy.deepcopy(projection)
    old=[r for r in projected['rows'] if r['claim_id']=='108-T01']
    if old != [{'claim_id':'108-T01','state':'blocked_no_four_table_payload','publication_ready':False}]:
        raise ValueError('Unexpected or repeated T01 projection')
    new={'claim_id':'108-T01','state':'staging_only_not_insertable',
         'target_table':'proposition_voice_chain','database_fields':copy.deepcopy(draft['candidate']['voice']),
         'staging_metadata':{},'semantic_publication_hold':None,'publication_ready':False,
         'blockers':['proposition_id unresolved until authorized proposition insertion','final coordinated preflight pending']}
    projected['rows']=[new if r['claim_id']=='108-T01' else r for r in projected['rows']]
    projected['inputs']['assembly_blob_sha']=sha
    projected['counts'].update(projected=64,unmapped=10)
    rebased=copy.deepcopy(q06)
    # Do not imply fresh source verification; only the assembly pointer changes.
    oldq=next(r for r in a['rows'] if r['claim_id']=='108-Q06')
    newq=next(r for r in out['rows'] if r['claim_id']=='108-Q06')
    if oldq != newq:
        raise ValueError('Q06 changed; historical checkpoint cannot be rebased')
    rebased['previous_assembly_blob_sha']=q06['input_assembly_blob_sha']
    rebased['input_assembly_blob_sha']=sha
    rebased['preview_rebase_note']='T01-only preview: Q06 row unchanged as JSON; historical source-check date retained, no fresh source check inferred.'
    if any(r['publication_ready'] is not False for r in projected['rows']):
        raise ValueError('Projection publication flag')
    if [r for r in projected['rows'] if r['claim_id']!='108-T01'] != [r for r in projection['rows'] if r['claim_id']!='108-T01']:
        raise ValueError('Unrelated projection changed')
    if (a,projection,q06)!=original:
        raise ValueError('Input mutated')
    return {ASSEMBLY:encode(out),PROJECTION:encode(projected),Q06:encode(rebased)}

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--root',type=Path,default=Path('.'))
    p.add_argument('--scripts-root',type=Path,default=Path('scripts'))
    args=p.parse_args()
    def module(name):
        spec=importlib.util.spec_from_file_location(name,args.scripts_root/(name+'.py'))
        obj=importlib.util.module_from_spec(spec); spec.loader.exec_module(obj); return obj
    contract=module('validate-tabari-t01-draft'); overlay_test=module('test-tabari-t01-overlay')
    folder=args.root/'data/tafsir/staging'
    def read(name): return json.loads((folder/name).read_text())
    o=read('tabari-108-t01-assembly-overlay-2026-10-18.json')
    for key,name in [('assembly',ASSEMBLY),('projection',PROJECTION),('draft',contract.DRAFT)]:
        if overlay_test.blob((folder/name).read_bytes())!=o['expected_blobs'][key]:
            raise ValueError('Pinned input drift: '+key)
    if overlay_test.blob((folder/Q06).read_bytes())!='bcf625c6a933487ac6ef147df789f762cd22eb31':
        raise ValueError('Pinned Q06 input drift')
    inputs=[read(ASSEMBLY),read(PROJECTION),read(Q06),o,read(contract.DRAFT),read(contract.SOURCE)]
    outputs=build(*inputs,contract,overlay_test)
    # Corrupt and partial linkage must fail; baseline objects stay untouched.
    for idx,field,value in [(1,'inputs',{'assembly_blob_sha':'bad'}),(2,'input_assembly_blob_sha','bad')]:
        bad=copy.deepcopy(inputs); bad[idx][field]=value
        try: build(*bad,contract,overlay_test)
        except ValueError: continue
        raise RuntimeError('Stale linkage accepted')
    print('PASS: 3-file isolated preview; 74 claims, 64 mapped / 10 unmapped; 73 unrelated assembly and projection rows preserved')
    print('PASS: stale projection and Q06 inputs rejected; Q06 historical timestamp retained; nothing applied')
    print(json.dumps({name:overlay_test.blob(text.encode()) for name,text in outputs.items()},sort_keys=True))

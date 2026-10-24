#!/usr/bin/env python3
"""Validate exact bounded I05 composition without publishing."""
import argparse,copy,json
from pathlib import Path
FILES=["ibn-kathir-108-i05-combined-bounded-draft-2026-10-23.json","ibn-kathir-108-i05-authorial-physical-draft-2026-10-23.json","ibn-kathir-108-i05-reported-voice-physical-draft-2026-10-23.json","ibn-kathir-108-i05-adjacent-coverage-ledger-2026-10-23.json"]
PINS={"ibn-kathir-108-i05-authorial-physical-draft-2026-10-23.json":"6b9e6a9e0643bf55f1df82ab1c58a179681d524e","ibn-kathir-108-i05-reported-voice-physical-draft-2026-10-23.json":"2f4ad7173cf5a40bf9226cd5b9d4b2c04ba8fecd","ibn-kathir-108-i05-adjacent-coverage-ledger-2026-10-23.json":"1353a9d2ea7675ccf33d86a5f04832ee8f397f74"}
def validate(d,a,r,l):
    def need(ok,msg):
        if not ok: raise ValueError(msg)
    need(d['basis']==[dict(file=f,blob_sha=PINS[f]) for f in FILES[1:]],'input pins')
    expected={k:a['candidate'][k]+r['candidate'][k] for k in a['candidate']}
    need(d['candidate']==expected,'exact input preservation')
    c=d['candidate']; ps=[p['staging_key'] for p in c['propositions']]; es=[e['staging_key'] for e in c['evidence_units']]
    need(len(ps)==len(set(ps))==14 and len(es)==len(set(es))==3,'unique inventory')
    need(len(c['voices'])==len(c['links'])==14 and not c['routes'],'inventory')
    need(all(v['proposition_ref'] in ps for v in c['voices']),'voice references')
    need(all(v['proposition_ref'] in ps and v['evidence_unit_ref'] in es for v in c['links']),'evidence references')
    holds=[dict(key=x['key'],status=x['status'],english_state=x['english_state'],publication_ready=False) for x in l['units']]
    need(len(holds)==10 and d['metadata']['coverage_holds']==holds,'coverage holds')
    need(d['metadata']['authorial']==a['metadata'] and d['metadata']['reported']==r['metadata'],'bilingual metadata')
    need(all(d[k] is False for k in ['database_written','publication_ready','chapter_complete']),'completion inflation')
def main():
    p=argparse.ArgumentParser();p.add_argument('--root',default='data/tafsir/staging');p.add_argument('--self-test',action='store_true');args=p.parse_args()
    d,a,r,l=[json.loads((Path(args.root)/f).read_text()) for f in FILES];validate(d,a,r,l)
    cases=[]
    def bad(fn):
        b=copy.deepcopy(d);fn(b);cases.append(b)
    bad(lambda b:b['candidate']['propositions'].pop())
    bad(lambda b:b['candidate']['voices'][0].update(originating_voice_type='companion_report'))
    bad(lambda b:b['candidate']['links'][0].update(proposition_ref='invented'))
    bad(lambda b:b['candidate']['evidence_units'].pop())
    bad(lambda b:b['candidate']['routes'].append({'invented':True}))
    bad(lambda b:b['metadata']['coverage_holds'].pop())
    bad(lambda b:b['metadata']['coverage_holds'][0].update(publication_ready=True))
    bad(lambda b:b['basis'][0].update(blob_sha='changed'))
    bad(lambda b:b['metadata']['authorial'].update(english_alignment={}))
    bad(lambda b:b.update(publication_ready=True))
    if args.self_test:
        for b in cases:
            try:validate(b,a,r,l)
            except ValueError:continue
            raise ValueError('unsafe mutation accepted')
    print(json.dumps(dict(status='PASS',rejected_cases=len(cases) if args.self_test else 0,database_written=False)))
if __name__=='__main__':main()

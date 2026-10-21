#!/usr/bin/env python3
"""Project I03 voices without losing child-proposition references; never apply SQL."""
import argparse,copy,importlib.util,json
from pathlib import Path
def need(ok,msg):
    if not ok:raise ValueError(msg)
def project(candidate):
    props=candidate['propositions'];keys=[p['staging_key'] for p in props]
    need(len(keys)==2 and len(set(keys))==2,'distinct child propositions required')
    fields=('reporting_work_id','originating_voice_type','originating_voice_name','quoted_collection')
    rows=[]
    for v in candidate['voices']:
        need(v['proposition_ref'] in keys,'dangling proposition reference')
        db={k:v[k] for k in fields};meta={k:value for k,value in v.items() if k not in fields}
        need(dict(db,**meta)==v,'lossy projection')
        rows.append(dict(database_fields=db,staging_metadata=meta,proposition_id_resolution=dict(from_staging_key=v['proposition_ref'],required_before_insert=True)))
    need(len(rows)==2 and {r['staging_metadata']['proposition_ref'] for r in rows}==set(keys),'child voice coverage')
    # Do not deduplicate identical physical fields: they belong to distinct propositions.
    need(rows[0]['database_fields']==rows[1]['database_fields'],'unexpected anonymous group projection')
    need(all(r['database_fields']['originating_voice_name'] is None for r in rows),'anonymous names')
    return rows
def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--root',default='.');args=ap.parse_args();b=Path(args.root)/'data/tafsir/staging'
    d=json.loads((b/'ibn-kathir-108-i03-two-proposition-draft-2026-10-21.json').read_text());s=json.loads((b/'ibn-kathir-108-i03-clause-evidence-dossier-2026-10-21.json').read_text())
    spec=importlib.util.spec_from_file_location('guard',Path(__file__).with_name('validate-ibn-kathir-i03-draft.py'));g=importlib.util.module_from_spec(spec);spec.loader.exec_module(g);g.validate(d,s)
    c=d['candidate'];before=copy.deepcopy(c);rows=project(c);need(c==before,'input mutated')
    rejected=0
    for mode in ('dedup','crossed','dangling','duplicate_child'):
        bad=copy.deepcopy(c)
        if mode=='dedup':bad['voices'].pop()
        if mode=='crossed':bad['voices'][1]['proposition_ref']=bad['voices'][0]['proposition_ref']
        if mode=='dangling':bad['voices'][0]['proposition_ref']='missing'
        if mode=='duplicate_child':bad['propositions'][1]['staging_key']=bad['propositions'][0]['staging_key']
        try:project(bad)
        except ValueError:rejected+=1
        else:raise ValueError('unsafe projection accepted')
    print(json.dumps(dict(status='PASS',voice_projection=rows,rejected_cases=rejected,files_applied=False,database_written=False,publication_ready=False),ensure_ascii=False))
if __name__=='__main__':main()

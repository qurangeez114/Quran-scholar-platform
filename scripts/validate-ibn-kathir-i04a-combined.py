#!/usr/bin/env python3
"""Read-only combined I04A candidate contract; no insertion or publication."""
import argparse,copy,json
from pathlib import Path
def need(ok,msg):
    if not ok:raise ValueError(msg)
def validate(x,d,r):
    need(x['claim_id']=='108-I04A','identity')
    need(all(x[k] is False for k in ('database_written','assembly_changed','publication_ready','chapter_complete')),'publication holds')
    expected=copy.deepcopy(d['candidate'])
    expected['routes']=[dict(staging_key=z['staging_key'],evidence_unit_ref=z['evidence_unit_ref'],**z['database_fields']) for z in r['route_projection']]
    need(x['candidate']==expected,'candidate differs from reviewed components')
    need(x['physical_table_mapping']==d['physical_table_mapping'],'table mapping')
    need(x['fidelity']==d['fidelity'] and x['source_contexts']==d['source_contexts'],'fidelity and sources')
    need(x['six_scholar_baseline']==d['six_scholar_baseline'] and x['counts_unchanged']==d['counts_unchanged'],'inventory')
    m=x['staging_metadata'];need(all(m[k]==v for k,v in d['staging_metadata'].items()),'speaker metadata')
    need(m['route_scope_metadata']==[dict(route_ref=z['staging_key'],**z['staging_metadata']) for z in r['route_projection']],'route metadata')
    c=x['candidate'];p={v['staging_key'] for v in c['propositions']};e={v['staging_key'] for v in c['evidence_units']}
    need(len(p)==2 and len(e)==3 and len(c['routes'])==5,'counts')
    need(all(v['proposition_ref'] in p for v in c['voices']),'voice ref')
    need(all(v['proposition_ref'] in p and v['evidence_unit_ref'] in e for v in c['links']),'link ref')
    need(all(v['evidence_unit_ref'] in e and set(v)=={'staging_key','evidence_unit_ref','route_description','transmitter_chain','source_citation_text'} for v in c['routes']),'route field allowlist')
def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--root',default='data/tafsir/staging');ap.add_argument('--self-test',action='store_true');a=ap.parse_args();b=Path(a.root)
    x,d,r=[json.loads((b/n).read_text()) for n in ('ibn-kathir-108-i04a-combined-candidate-2026-10-22.json','ibn-kathir-108-i04a-two-proposition-draft-2026-10-22.json','ibn-kathir-108-i04a-route-projection-draft-2026-10-22.json')]
    validate(x,d,r);n=0
    if a.self_test:
        mutations=[
          lambda x:x['candidate']['routes'][1].update(evidence_unit_ref='108-I04A-E1'),
          lambda x:x['candidate']['voices'][1].update(proposition_ref='108-I04A-A-P'),
          lambda x:x['candidate']['propositions'][1].update(speaker_name='Ibn Abbas'),
          lambda x:x['candidate']['routes'][0].update(id=123),
          lambda x:x['candidate']['evidence_units'].pop(),
          lambda x:x.update(publication_ready=True),
          lambda x:x['counts_unchanged'].update(mapped=70),
          lambda x:x['staging_metadata']['route_scope_metadata'][0].update(independence_state='independence_supported'),
          lambda x:x.update(fidelity={})]
        for mutate in mutations:
            bad=copy.deepcopy(x);mutate(bad)
            try:validate(bad,d,r)
            except (ValueError,KeyError,IndexError):n+=1;continue
            raise ValueError('unsafe mutation accepted')
    print(json.dumps(dict(status='PASS',rejected_cases=n,scope='combined equality and references; component validators remain required',database_written=False,publication_ready=False)))
if __name__=='__main__':main()

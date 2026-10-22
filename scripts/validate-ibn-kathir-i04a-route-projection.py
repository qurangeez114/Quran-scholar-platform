#!/usr/bin/env python3
"""Validate provisional I04A route scopes without applying files or SQL."""
import argparse,copy,hashlib,json
from pathlib import Path
def need(ok,msg):
    if not ok:raise ValueError(msg)
def validate(p,d):
    need(p['publication_ready'] is False and p['database_written'] is False and p['chapter_complete'] is False,'publication holds')
    rows=p['route_projection'];need(len(rows)==5,'five projections')
    r=d['route_contexts']
    chains=[r[0]['printed_chain_order'],r[0]['printed_chain_order'][:-1],r[1]['branches'][0],r[1]['branches'][1],r[2]['printed_chain_order']]
    refs=['108-I04A-E1','108-I04A-E3','108-I04A-E2','108-I04A-E2','108-I04A-E2']
    keys=['R1-gloss','R1-reply','R2-AbuBishr','R2-Ata','R3']
    need(len({x['staging_key'] for x in rows})==5,'unique keys')
    for i,(row,chain,ref,key,idx) in enumerate(zip(rows,chains,refs,keys,[0,0,1,1,2])):
        need(row['staging_key']=='108-I04A-'+key and row['evidence_unit_ref']==ref,'route evidence scope')
        f,m=row['database_fields'],row['staging_metadata']
        need(set(f)=={'route_description','transmitter_chain','source_citation_text'},'physical field allowlist')
        need(f['transmitter_chain']==chain and bool(f['route_description']),'chain or description')
        need(m['printed_context_index']==idx and m['source_locator']==d['contexts'][idx],'exact locator')
        need(f['source_citation_text']==d['contexts'][idx]['span'],'exact citation')
        need(m['independence_state']=='unknown' and m['physical_id_resolution_required'] is True,'resolution and independence hold')
    need(chains[1][-1]=="Sa'id ibn Jubayr",'reply origin')
    for x in d['contexts']:
        need(hashlib.sha256(x['span'].encode()).hexdigest()==x['sha256'],'context hash')
    need(p['counts']==dict(printed_contexts=3,projected_route_rows=5,historical_claims_added=0),'no witness inflation')
    need(p['validation']['identity_generation_review_pending'] is True and p['validation']['full_payload_validation_pending'] is True,'pending review')
def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--root',default='.');ap.add_argument('--self-test',action='store_true');a=ap.parse_args();b=Path(a.root)
    p=json.loads((b/'ibn-kathir-108-i04a-route-projection-draft-2026-10-22.json').read_text());d=json.loads((b/'ibn-kathir-108-i04a-printed-route-scope-dossier-2026-10-22.json').read_text());validate(p,d);n=0
    if a.self_test:
        mutations=[
            lambda p:p['route_projection'][1].update(evidence_unit_ref='108-I04A-E1'),
            lambda p:p['route_projection'][2].update(evidence_unit_ref='108-I04A-E3'),
            lambda p:p['route_projection'][1]['database_fields']['transmitter_chain'].append('Ibn Abbas'),
            lambda p:p['route_projection'][2]['database_fields']['transmitter_chain'].insert(2,"Ata ibn al-Sa'ib"),
            lambda p:p['route_projection'][0]['database_fields'].update(source_citation_text='changed'),
            lambda p:p['route_projection'][0]['database_fields'].update(id=1),
            lambda p:p['route_projection'][0]['staging_metadata'].update(independence_state='independence_supported'),
            lambda p:p.update(publication_ready=True),
            lambda p:p['counts'].update(historical_claims_added=5),
            lambda p:p['route_projection'].pop()]
        for mutate in mutations:
            bad=copy.deepcopy(p);mutate(bad)
            try:validate(bad,d)
            except (ValueError,KeyError,IndexError):n+=1;continue
            raise ValueError('unsafe mutation accepted')
    print(json.dumps(dict(status='PASS',rejected_cases=n,route_rows=5,independent_witness_count_established=False,database_written=False,publication_ready=False)))
if __name__=='__main__':main()

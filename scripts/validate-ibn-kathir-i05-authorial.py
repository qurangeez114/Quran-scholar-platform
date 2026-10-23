#!/usr/bin/env python3
"""Read-only validation of the bounded I05 authorial subset."""
import argparse,copy,hashlib,json
from pathlib import Path
D='ibn-kathir-108-i05-authorial-physical-draft-2026-10-23.json'
R='ibn-kathir-108-i05-authorial-clause-review-2026-10-23.json'
def need(v,m):
    if not v:raise ValueError(m)
def validate(d,r):
    c=d['candidate'];ps=c['propositions'];vs=c['voices'];es=c['evidence_units'];ls=c['links']
    need(len(ps)==len(vs)==len(ls)==2 and len(es)==1,'inventory')
    need([p['staging_key'] for p in ps]==['108-I05-A-P','108-I05-B-P'],'child references')
    need(d['classification']['claim_type_id']==44,'classification')
    for p,v,l in zip(ps,vs,ls):
        need(p['claim_type_id']==44 and p['speaker_name']=='Ibn Kathir' and p['mufassir_own_position']=='preferred','authorial scope')
        need(p['tafsir_entry_id']==48458 and p['source_type']=='tafsir_entry','canonical attachment')
        need(p['verification_state']=='source_language_located' and p['extraction_validity']=='pending_source_verification','verification inflation')
        need(v['proposition_ref']==p['staging_key'] and v['originating_voice_type']=='exegete_own_view' and v['originating_voice_name'] is None,'authorial voice')
        need(v['reporting_work_id']==2 and v['quoted_collection'] is None,'reporting work')
        need(l['proposition_ref']==p['staging_key'] and l['evidence_unit_ref']=='108-I05-AUTH-E','evidence linkage')
    need(es[0]['staging_key']=='108-I05-AUTH-E' and es[0]['independence_state']=='unknown','shared evidence')
    need(es[0]['source_locator']==r['locators'][0] and d['metadata']['english_alignment']==r['locators'][1],'narrow bilingual clauses')
    for loc in r['locators']:
        need(hashlib.sha256(loc['text'].encode()).hexdigest()==loc['sha256'],'source hash')
    need([(x['start'],x['end']) for x in r['locators']]==[(12698,12859),(4772,5028)],'source boundaries')
    need(c['routes']==[],'invented route')
    need(all(d[k] is False for k in ['database_written','publication_ready','chapter_complete']),'completion inflation')
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--root',default='data/tafsir/staging');ap.add_argument('--self-test',action='store_true');a=ap.parse_args();p=Path(a.root)
    d=json.loads((p/D).read_text());r=json.loads((p/R).read_text());validate(d,r);cases=[]
    def bad(fn):
        b=copy.deepcopy(d);fn(b);cases.append(b)
    bad(lambda b:b['candidate']['propositions'][0].update(speaker_name='Ibn Abbas'))
    bad(lambda b:b['candidate']['propositions'][0].update(claim_type_id=14))
    bad(lambda b:b['candidate']['voices'][0].update(originating_voice_name='Ibn Kathir'))
    bad(lambda b:b['candidate']['voices'][0].update(originating_voice_type='companion_report'))
    bad(lambda b:b['candidate']['links'][0].update(proposition_ref='108-I05-B-P'))
    bad(lambda b:b['candidate']['propositions'][0].update(extraction_validity='verified'))
    bad(lambda b:b['candidate']['evidence_units'][0]['source_locator'].update(end=13355))
    bad(lambda b:b['metadata']['english_alignment'].update(text='invented'))
    bad(lambda b:b['candidate']['routes'].append({'invented':True}))
    bad(lambda b:b.update(publication_ready=True))
    if a.self_test:
        for b in cases:
            try:validate(b,r)
            except ValueError:continue
            raise ValueError('unsafe mutation accepted')
    print(json.dumps(dict(status='PASS',rejected_cases=len(cases) if a.self_test else 0,database_written=False,publication_ready=False)))
if __name__=='__main__':main()

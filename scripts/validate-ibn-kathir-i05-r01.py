#!/usr/bin/env python3
"""Read-only validation of I05-R01 printed-chain and nested-speaker boundaries."""
import argparse,copy,hashlib,json
from pathlib import Path
D='ibn-kathir-108-i05-r01-chain-dialogue-dossier-2026-10-23.json'
L='ibn-kathir-108-i05-adjacent-coverage-ledger-2026-10-23.json'
NAMES=['Wahb ibn Ibrahim al-Fami','Israil ibn Hatim al-Marwazi','Muqatil ibn Hayyan','al-Asbagh ibn Nubata','Ali ibn Abi Talib']
def need(ok,msg):
    if not ok:raise ValueError(msg)
def validate(d,l):
    u=next(x for x in l['units'] if x['key']=='108-I05-R01')
    ctx=u['arabic_locator'];s=ctx['text'];base=ctx['start']
    need(d['source']['context']==ctx,'context drift')
    need(d['source']['witness_sha256']==l['witness_sha256'],'witness drift')
    need(d['source']['canonical_entry_id']==48458 and d['source']['captured_entry_id']==48457,'canonical/witness confusion')
    def span(v):
        need(base<=v['start']<v['end']<=ctx['end'],'span boundary')
        need(s[v['start']-base:v['end']-base]==v['text'],'span text')
        need(hashlib.sha256(v['text'].encode()).hexdigest()==v['sha256'],'span hash')
    chain=d['printed_chain'];span(chain['locator'])
    ts=chain['transmitters_in_printed_order']
    need([x['display_name'] for x in ts]==NAMES,'printed transmitter order')
    need(chain['connectors']==['haddathana']*3+['an']*2,'connectors')
    previous=-1
    for t in ts:
        need(t['start']>previous and chain['locator']['start']<=t['start']<t['end']<=chain['locator']['end'],'name order/bounds')
        need(s[t['start']-base:t['end']-base]==t['name_as_printed'],'name text')
        previous=t['end']
    need(chain['independence']=='unknown' and chain['authenticity']=='not independently assessed','authentication inflation')
    need(d['reporting_frame']['tafsir_author']=='Ibn Kathir' and d['reporting_frame']['quoted_collection_author']=='Ibn Abi Hatim','reporting frame')
    voices=d['dialogue']
    need([(x['role'],x['name']) for x in voices]==[('report_narrator','Ali ibn Abi Talib'),('questioner','Muhammad'),('answerer','Gabriel')],'crossed dialogue speakers')
    for v in voices[1:]:span(v['locator'])
    need('name is not repeated' in voices[2]['speaker_resolution'],'implicit answer resolution lost')
    j=d['source_judgment'];span(j['locator'])
    need(j['speaker']=='Ibn Kathir' and j['wording']=='مُنْكَرًا جِدًّا','judgment attribution')
    need('not' in j['handling'] and 'independently' in j['handling'],'judgment scope')
    need(d['parallel_reference']['independence']=='unknown' and 'not reconstructed' in d['parallel_reference']['dependency'],'invented parallel chain')
    need(all(d[k] is False for k in ['database_written','publication_ready','chapter_complete']),'completion inflation')
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--root',default='data/tafsir/staging');ap.add_argument('--self-test',action='store_true');a=ap.parse_args()
    p=Path(a.root);d=json.loads((p/D).read_text());l=json.loads((p/L).read_text());validate(d,l)
    cases=[]
    def bad(fn):
        b=copy.deepcopy(d);fn(b);cases.append(b)
    bad(lambda b:b['printed_chain']['transmitters_in_printed_order'].reverse())
    bad(lambda b:b['printed_chain']['transmitters_in_printed_order'].pop())
    bad(lambda b:b['dialogue'][2].update(name='Ali ibn Abi Talib'))
    bad(lambda b:b['dialogue'][1].update(name='Gabriel'))
    bad(lambda b:b['source_judgment'].update(speaker='Gabriel'))
    bad(lambda b:b['printed_chain'].update(independence='independent'))
    bad(lambda b:b['printed_chain'].update(authenticity='verified'))
    bad(lambda b:b['parallel_reference'].update(dependency='full chain reconstructed'))
    bad(lambda b:b['dialogue'][2]['locator'].update(start=0))
    bad(lambda b:b.update(publication_ready=True))
    if a.self_test:
        for b in cases:
            try:validate(b,l)
            except ValueError:continue
            raise ValueError('unsafe mutation accepted')
    print(json.dumps(dict(status='PASS',rejected_cases=len(cases) if a.self_test else 0,database_written=False,publication_ready=False)))
if __name__=='__main__':main()

#!/usr/bin/env python3
"""Read-only I05 reported-subset attribution and evidence graph checks."""
import argparse,copy,hashlib,json
from pathlib import Path
D='ibn-kathir-108-i05-reported-voice-physical-draft-2026-10-23.json'
S='ibn-kathir-108-i05-semantic-candidate-design-2026-10-22.json'
def need(ok,msg):
    if not ok:raise ValueError(msg)
def validate(d,s):
    expected=[p for p in s['propositions'] if p['voice_role']=='reported_interpretation']
    c=d['candidate'];ps=c['propositions'];vs=c['voices'];es=c['evidence_units'];ls=c['links']
    need(len(ps)==len(vs)==len(ls)==12 and len(es)==2,'subset count')
    need(len({p['staging_key'] for p in ps})==12,'duplicate proposition')
    need(c['routes']==[],'invented cluster chain')
    for p,v,link,source in zip(ps,vs,ls,expected):
        need(p['staging_key']==source['key'] and p['speaker_name']==source['speaker'] and p['statement_en']==source['statement_en'],'attribution drift')
        need(p['tafsir_entry_id']==48458 and p['source_type']=='tafsir_entry','source attachment')
        need(p['claim_type_id']==14 and p['mufassir_own_position']=='reported_only','reported scope')
        need(p['verification_state']=='source_language_located' and p['extraction_validity']=='pending_source_verification','verification inflation')
        need(v['proposition_ref']==p['staging_key'] and v['originating_voice_name']==p['speaker_name'],'crossed voice')
        need(v['originating_voice_type']==('companion_report' if p['speaker_name']=='Ibn Abbas' else 'named_earlier_exegete'),'voice type')
        need(v['quoted_collection'] is None and v['reporting_work_id']==2,'invented collection')
        group='1' if source['attribution_group'].endswith('1') else '2'
        need(link['proposition_ref']==p['staging_key'] and link['evidence_unit_ref']=='108-I05-G'+group+'-E','crossed evidence group')
        need('not explicit in captured English' in link['semantic_link_note'],'translation scope lost')
        need('id' not in p and 'id' not in v,'generated id supplied')
    locator=next(e for e in s['evidence_contexts'] if e['key']=='arabic_attribution_cluster')
    for i,e in enumerate(es,1):
        names=[p['speaker'] for p in expected if p['attribution_group']=='attribution_group_'+str(i)]
        need(e['staging_key']=='108-I05-G'+str(i)+'-E' and e['attributed_authority_name']=='; '.join(names),'group membership')
        need(e['unit_type']=='grouped_named_attribution' and e['independence_state']=='unknown','independence inflation')
        need(e['source_locator']==locator,'source locator drift')
    need(hashlib.sha256(locator['text'].encode()).hexdigest()==locator['sha256'],'locator hash')
    need(all(d[k] is False for k in ['database_written','publication_ready','chapter_complete']),'completion inflation')
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--root',default='data/tafsir/staging');ap.add_argument('--self-test',action='store_true');a=ap.parse_args();p=Path(a.root)
    d=json.loads((p/D).read_text());s=json.loads((p/S).read_text());validate(d,s);cases=[]
    def bad(fn):
        b=copy.deepcopy(d);fn(b['candidate']);cases.append(b)
    bad(lambda c:c['voices'][0].update(originating_voice_name='Ata'))
    bad(lambda c:c['links'][0].update(evidence_unit_ref='108-I05-G2-E'))
    bad(lambda c:c['propositions'][0].update(speaker_name='Ibn Kathir'))
    bad(lambda c:c['propositions'][0].update(tafsir_entry_id=48459))
    bad(lambda c:c['propositions'][0].update(extraction_validity='verified'))
    bad(lambda c:c['evidence_units'][0].update(independence_state='independence_supported'))
    bad(lambda c:c['routes'].append({'invented':'chain'}))
    bad(lambda c:c['propositions'].pop())
    bad(lambda c:c['links'][0].update(semantic_link_note='full English translation'))
    bad(lambda c:c['propositions'][0].update(id=1))
    bad(lambda c:c['evidence_units'][0]['source_locator'].update(text='altered'))
    b=copy.deepcopy(d);b['publication_ready']=True;cases.append(b)
    if a.self_test:
        for b in cases:
            try:validate(b,s)
            except ValueError:continue
            raise ValueError('unsafe mutation accepted')
    print(json.dumps(dict(status='PASS',rejected_cases=len(cases) if a.self_test else 0,database_written=False,publication_ready=False)))
if __name__=='__main__':main()

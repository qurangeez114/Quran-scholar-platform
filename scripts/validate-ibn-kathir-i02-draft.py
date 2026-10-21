#!/usr/bin/env python3
"""Non-applying I02 R01 draft validation; no database or network operations."""
import argparse,copy,hashlib,json
from pathlib import Path
def need(ok,message):
    if not ok:raise ValueError(message)
def validate(d,s):
    for doc in (d,s):
        need(doc['claim_id']=='108-I02' and doc['surah']==108,'identity')
        for flag in ('database_written','assembly_changed','publication_ready','chapter_complete'):need(doc[flag] is False,'publication hold')
        need(doc['counts_unchanged']==dict(claims=74,mapped=67,unmapped=7),'counts')
    c=d['candidate'];p=c['proposition']
    need(set(c)=={'proposition','voices','evidence_units','links','routes'},'sections')
    need(p['staging_key']=='108-I02-P' and p['claim_type_id']==16 and p['tafsir_entry_id']==48457,'proposition identity')
    need(p['mufassir_own_position']=='reported_only' and p['verification_state']=='source_language_located' and p['extraction_validity']=='pending_source_verification','verification scope')
    for k in ('normative_polarity','scope_generality','comparison_object_id'):need(p[k] is None,'uncoded normative field')
    need(p['statement_en']=="A report presents the surah as newly revealed during a brief doze and explains al-Kawthar as a river granted in Paradise, associated with abundant good and a pool visited by the community.",'statement drift')
    need(c['voices']==[dict(staging_key='108-I02-V1',proposition_ref='108-I02-P',reporting_work_id=2,originating_voice_type='hadith_report',originating_voice_name='Anas ibn Malik',quoted_collection=None)],'voice')
    need([len(c[k]) for k in ('evidence_units','links','routes')]==[2,2,3],'cardinality')
    for row in [p]+c['voices']+c['evidence_units']+c['links']+c['routes']:need('id' not in row,'generated id')
    bounds=[(117,930,'82c59af8354a4e34da0e37e646f54e4ce0830c3e21d37920d564d006ee88f88b'),(1203,2128,'6076f14938155f7501d4a84a2b1977fe0f59bc021d9e3ab3cbe11cea10a8145e')]
    need(len(s['report_units'])==2,'dossier units')
    expected_routes=[]
    for i,(u,(a,b,h)) in enumerate(zip(s['report_units'],bounds),1):
        need((u['start_codepoint'],u['end_codepoint'],u['sha256'])==(a,b,h),'boundary pin')
        need(len(u['text'])==b-a and hashlib.sha256(u['text'].encode()).hexdigest()==h,'Arabic hash')
        e=c['evidence_units'][i-1];key=f'108-I02-E{i}'
        need(e['staging_key']==key and e['unit_type']=='single_hadith_citation' and e['attributed_authority_name']=='Anas ibn Malik' and e['independence_state']=='unknown','evidence identity')
        need(e['source_locator']==dict(entry_id=48457,start_codepoint=a,end_codepoint=b,sha256=h,arabic=u['text']),'evidence locator')
        need(e['content_summary']==u['scope'],'scoped summary')
        link=c['links'][i-1]
        need(link['proposition_ref']=='108-I02-P' and link['evidence_unit_ref']==key,'link refs')
        need(link['semantic_link_note']==u['scope']+' This is scoped partial support within the R01 family, not a standalone quotation of the entire compound summary; no independent authenticity judgment.','partial support qualifier')
        for chain in u['chain_branches']:expected_routes.append((key,chain,u['text']))
    for i,(r,(key,chain,text)) in enumerate(zip(c['routes'],expected_routes),1):
        need(r['staging_key']==f'108-I02-R01-B{i}' and r['evidence_unit_ref']==key and r['transmitter_chain']==chain and r['source_citation_text']==text,'route loss or serial branch')
    # Pin branch topology independently of the editable dossier.
    need([r['transmitter_chain'] for r in c['routes']]==[['مُحَمَّدُ بْنُ فُضَيْلٍ','الْمُخْتَارِ بْنِ فُلْفُل','أَنَسِ بْنِ مَالِكٍ'],['مُحَمَّدِ بْنِ فُضَيْلٍ','الْمُخْتَارِ بْنِ فُلْفُل','أَنَسٍ'],['عَلِيِّ بْنِ مُسْهِر','الْمُخْتَارِ بْنِ فُلْفُل','أَنَسٍ']],'chain identity')
    need(p['supporting_span']==s['report_units'][0]['text'],'support span')
    need(d['fidelity']==s['fidelity'],'translation metadata drift')
    need('No English narration of dozing' in d['fidelity']['bounded_absence'],'English omission')
def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--root',default='.');ap.add_argument('--self-test',action='store_true');args=ap.parse_args()
    b=Path(args.root)/'data/tafsir/staging';d=json.loads((b/'ibn-kathir-108-i02-five-table-draft-2026-10-21.json').read_text());s=json.loads((b/'ibn-kathir-108-i02-r01-evidence-voice-dossier-2026-10-21.json').read_text());validate(d,s)
    mutations=[lambda x:x['candidate']['routes'].pop(),lambda x:x['candidate']['routes'][1]['transmitter_chain'].insert(1,'عَلِيِّ بْنِ مُسْهِر'),lambda x:x['candidate']['voices'][0].update(originating_voice_name='Aisha'),lambda x:x['candidate']['evidence_units'][0]['source_locator'].update(end_codepoint=1203),lambda x:x['candidate']['links'][0].update(semantic_link_note='Supports everything'),lambda x:x.update(publication_ready=True),lambda x:x['candidate']['proposition'].update(id=1),lambda x:x['candidate']['evidence_units'][1].update(independence_state='independence_supported'),lambda x:x['fidelity'].update(bounded_absence='English includes dozing'),lambda x:x['candidate']['proposition'].update(mufassir_own_position='preferred'),lambda x:x['candidate']['links'][1].update(evidence_unit_ref='108-I02-E1')]
    if args.self_test:
        for f in mutations:
            bad=copy.deepcopy(d);f(bad)
            try:validate(bad,s)
            except ValueError:continue
            raise ValueError('unsafe mutation accepted')
    print(json.dumps(dict(status='PASS',routes=3,evidence_units=2,voices=1,rejected_cases=len(mutations) if args.self_test else 0,database_written=False,publication_ready=False)))
if __name__=='__main__':main()

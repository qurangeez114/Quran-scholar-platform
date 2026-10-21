#!/usr/bin/env python3
"""Read-only I03 atomic draft checks. No network, database or file writes."""
import argparse,copy,hashlib,json
from pathlib import Path
def need(ok,msg):
    if not ok:raise ValueError(msg)
def validate(d,s):
    for x in (d,s):
        need(x['claim_id']=='108-I03' and x['surah']==108,'identity')
        need(all(x[k] is False for k in ('database_written','publication_ready','chapter_complete')),'publication hold')
        need(x['counts_unchanged']==dict(claims=74,mapped=68,unmapped=6,semantic_holds=15),'counts')
    need(d['assembly_changed'] is False,'assembly hold')
    c=d['candidate'];need(set(c)=={'propositions','voices','evidence_units','links','routes'},'sections')
    need([len(c[k]) for k in ('propositions','voices','evidence_units','links','routes')]==[2,2,2,2,0],'cardinality')
    need(d['fidelity']==s['fidelity'] and d['fidelity']['state']=='corresponding_inference_paragraph_absent_in_stored_abridged_witness','English absence')
    need(d['source']==s['source'],'source pin')
    need(d['staging_metadata']['historical_claim_count']==1 and d['staging_metadata']['physical_proposition_count']==2,'claim versus proposition counts')
    expected=[('A',2128,2219,'4d2616743bfa273ed9aa66bc4b75460dd3df711f4583277d28c98fa5a99c2942','Ibn Kathir reports that many Quran readers inferred from the preceding report that this surah is Medinan.'),('B',2219,2321,'d8e69e5b2225dfcb56ec0c3d46ce6b1395e77b919233474ba1b5c3ea57414be9','Ibn Kathir reports that many jurists inferred from the preceding report that the basmala is part of the surah and was revealed with it.')]
    need(len(s['units'])==2,'dossier cardinality')
    for i,(suffix,a,b,h,statement) in enumerate(expected):
        key='108-I03-'+suffix;p=c['propositions'][i];v=c['voices'][i];e=c['evidence_units'][i];link=c['links'][i];u=s['units'][i]
        need((u['start_codepoint'],u['end_codepoint'],u['sha256'])==(a,b,h),'boundary pin')
        need(len(u['text'])==b-a and hashlib.sha256(u['text'].encode()).hexdigest()==h,'Arabic hash')
        need(p['staging_key']==key+'-P' and p['statement_en']==statement and p['supporting_span']==u['text'],'statement or span')
        need(p['claim_type_id']==14 and p['tafsir_entry_id']==48457 and p['assertion_mode']=='explicit','reported inference classification')
        need(p['mufassir_own_position']=='reported_only' and p['verification_state']=='source_language_located' and p['extraction_validity']=='pending_source_verification','verification scope')
        need(all(p[k] is None for k in ('normative_polarity','scope_generality','comparison_object_id')),'uncoded fields')
        need(v==dict(staging_key=key+'-V',proposition_ref=key+'-P',reporting_work_id=2,originating_voice_type='unattributed_group',originating_voice_name=None,quoted_collection=None),'anonymous group or association')
        need(e['staging_key']==key+'-E' and e['unit_type']=='unattributed_assertion' and e['attributed_authority_name'] is None and e['independence_state']=='unknown' and e['content_summary']==statement,'evidence scope')
        need(e['source_locator']==dict(entry_id=48457,start_codepoint=a,end_codepoint=b,sha256=h,arabic=u['text']),'locator')
        need(link['proposition_ref']==key+'-P' and link['evidence_unit_ref']==key+'-E','crossed links')
        need(link['semantic_link_note']=='Supports only the inference attributed to '+u['authority']+". Anonymous group label and scope are retained in the proposition statement; this is not Anas's speech or a claim of independent historical verification.",'link scope')
        for row in (p,v,e,link):need('id' not in row and 'proposition_id' not in row,'physical id')
    need(d['clause_annotations'][1]['ellipsis_note']==s['units'][1]['ellipsis_note'],'supplied predicate annotation')
    need(hashlib.sha256(''.join(u['text'] for u in s['units']).encode()).hexdigest()==s['source']['paragraph_sha256'],'paragraph reconstruction')
def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--root',default='.');ap.add_argument('--self-test',action='store_true');args=ap.parse_args();b=Path(args.root)/'data/tafsir/staging'
    d=json.loads((b/'ibn-kathir-108-i03-two-proposition-draft-2026-10-21.json').read_text());s=json.loads((b/'ibn-kathir-108-i03-clause-evidence-dossier-2026-10-21.json').read_text());validate(d,s)
    mutations=[lambda x:x['candidate']['propositions'].pop(),lambda x:x['candidate']['voices'][1].update(proposition_ref='108-I03-A-P'),lambda x:x['candidate']['voices'][0].update(originating_voice_name='Anas'),lambda x:x['candidate']['routes'].append({}),lambda x:x['candidate']['links'][1].update(evidence_unit_ref='108-I03-A-E'),lambda x:x['candidate']['evidence_units'][0]['source_locator'].update(end_codepoint=2321),lambda x:x.update(publication_ready=True),lambda x:x['candidate']['propositions'][0].update(mufassir_own_position='preferred'),lambda x:x['fidelity'].update(state='fully_aligned'),lambda x:x['clause_annotations'][1].update(ellipsis_note=''),lambda x:x['staging_metadata'].update(historical_claim_count=2),lambda x:x['candidate']['propositions'][0].update(id=1)]
    if args.self_test:
        for mutate in mutations:
            bad=copy.deepcopy(d);mutate(bad)
            try:validate(bad,s)
            except ValueError:continue
            raise ValueError('unsafe mutation accepted')
    print(json.dumps(dict(status='PASS',propositions=2,voices=2,evidence_units=2,routes=0,rejected_cases=len(mutations) if args.self_test else 0,database_written=False,publication_ready=False)))
if __name__=='__main__':main()

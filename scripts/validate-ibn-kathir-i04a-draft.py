#!/usr/bin/env python3
"""Read-only checks for the provisional I04A speaker split; no publication approval."""
import argparse, copy, hashlib, json
from pathlib import Path
def need(ok, message):
    if not ok: raise ValueError(message)
def validate(d, s, r):
    for x in (d,s,r):
        need(x['claim_id']=='108-I04A' and x['database_written'] is False and x['publication_ready'] is False and x['chapter_complete'] is False,'identity or publication hold')
    c=d['candidate']
    need([len(c[k]) for k in ('propositions','voices','evidence_units','links','routes')]==[2,2,3,3,0],'provisional section counts')
    need(d['route_handling']['state']=='printed_routes_present_not_yet_modeled' and d['route_handling']['publication_block'] is True,'routes pending, not absent')
    need(d['staging_metadata']['historical_claim_count']==1 and d['staging_metadata']['physical_proposition_count']==2,'historical count')
    need(d['counts_unchanged']==dict(historical_claims=74,mapped=69,unmapped=5,semantic_holds=16),'inventory drift')
    clauses={(x['entry_id'],x['unit']):x for x in s['clause_locators']}
    need(len(clauses)==8,'eight bilingual clauses')
    for x in clauses.values():
        need(x['end_codepoint_0']-x['start_codepoint_0']==len(x['span']),'clause length')
        need(hashlib.sha256(x['span'].encode()).hexdigest()==x['span_sha256'],'clause hash')
    for i,(speaker,kind,stype) in enumerate((('Ibn Abbas','companion_report','companion'),("Sa'id ibn Jubayr",'named_earlier_exegete','sub_narrator'))):
        p,v=c['propositions'][i],c['voices'][i]
        key='108-I04A-'+('A' if i==0 else 'B')
        need(p['staging_key']==key+'-P' and v['proposition_ref']==key+'-P','child refs')
        need(p['statement_en']==s['proposed_atomic_scopes'][i]['statement_en'],'speaker statement')
        need(p['speaker_name']==v['originating_voice_name']==speaker and p['speaker_type']==stype and v['originating_voice_type']==kind,'speaker identity')
        need(v['reporting_work_id']==2 and v['quoted_collection'] is None,'provisional voice projection')
        need(p['claim_type_id']==14 and p['mufassir_own_position']=='reported_only' and p['extraction_validity']=='pending_source_verification','reported-only hold')
        need(all(p[k] is None for k in ('normative_polarity','scope_generality','comparison_object_id')),'uncoded fields')
        unit='said_reply' if i else 'ibn_abbas_good'
        need(p['supporting_span']==clauses[(48457,unit)]['span'],'supporting span')
    for i,(child,unit,speaker) in enumerate((('A','ibn_abbas_good','Ibn Abbas'),('A','ibn_abbas_abundant_good','Ibn Abbas'),('B','said_reply',"Sa'id ibn Jubayr"))):
        e,l=c['evidence_units'][i],c['links'][i]; a=clauses[(48457,unit)]
        need(e['unit_type']=='single_named_attribution' and e['attributed_authority_name']==speaker and e['independence_state']=='unknown','evidence authority')
        need(e['source_locator']==dict(entry_id=48457,start_codepoint=a['start_codepoint_0'],end_codepoint=a['end_codepoint_0'],sha256=a['span_sha256'],arabic=a['span']),'exact evidence locator')
        need(l['proposition_ref']=='108-I04A-'+child+'-P' and l['evidence_unit_ref']==e['staging_key'],'evidence crossed')
    need(d['fidelity']==s['translation_fidelity'],'fidelity drift')
    need(d['staging_metadata']['english_alignment']==[x for x in s['clause_locators'] if x['entry_id']==11079],'English alignment')
    need(d['staging_metadata']['question_context']==[x for x in s['clause_locators'] if x['unit']=='abu_bishr_question'],'question context')
    need(r['route_contexts'][1]['branches']==[['Hushaym','Abu Bishr',"Sa'id ibn Jubayr",'Ibn Abbas'],['Hushaym',"Ata ibn al-Sa'ib","Sa'id ibn Jubayr",'Ibn Abbas']],'parallel branches')
    for route in r['route_contexts'][1:]:
        need(route['supports']==['108-I04A-A-P'] and route['does_not_support']==['108-I04A-B-P'] and route['independence_state']=='unknown','reply scope')
    for x in r['contexts']:
        need(hashlib.sha256(x['span'].encode()).hexdigest()==x['sha256'] and len(x['span'])==x['end_codepoint_0']-x['start_codepoint_0'],'route context hash')
    need(r['contexts'][0]['start_codepoint_0']==7906 and r['contexts'][-1]['end_codepoint_0']==8684,'context bounds')
    need(all(a['end_codepoint_0']==b['start_codepoint_0'] for a,b in zip(r['contexts'],r['contexts'][1:])),'context gaps')
    need(hashlib.sha256(''.join(x['span'] for x in r['contexts']).encode()).hexdigest()==s['sources'][0]['context_sha256'],'context partition')
def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--root',default='.');ap.add_argument('--self-test',action='store_true');args=ap.parse_args()
    b=Path(args.root)/'data/tafsir/staging'
    d,s,r=[json.loads((b/n).read_text()) for n in ('ibn-kathir-108-i04a-two-proposition-draft-2026-10-22.json','ibn-kathir-108-i04a-clause-speaker-dossier-2026-10-22.json','ibn-kathir-108-i04a-printed-route-scope-dossier-2026-10-22.json')]
    validate(d,s,r);rejected=0
    if args.self_test:
        mutations=[
            lambda d,s,r:d['candidate']['propositions'][1].update(speaker_name='Ibn Abbas'),
            lambda d,s,r:d['candidate']['voices'][1].update(proposition_ref='108-I04A-A-P'),
            lambda d,s,r:d['candidate']['links'][2].update(proposition_ref='108-I04A-A-P'),
            lambda d,s,r:d['candidate']['evidence_units'][2]['source_locator'].update(start_codepoint=0),
            lambda d,s,r:d.update(publication_ready=True),
            lambda d,s,r:d['route_handling'].update(state='chain_absent'),
            lambda d,s,r:d['candidate']['routes'].append({}),
            lambda d,s,r:r['route_contexts'][1].update(supports=['108-I04A-B-P']),
            lambda d,s,r:r['route_contexts'][1]['branches'][0].insert(2,"Ata ibn al-Sa'ib"),
            lambda d,s,r:d['staging_metadata'].update(historical_claim_count=2),
            lambda d,s,r:d['staging_metadata']['english_alignment'].pop(),
            lambda d,s,r:s['clause_locators'][0].update(span='altered')]
        for mutate in mutations:
            dd,ss,rr=copy.deepcopy((d,s,r));mutate(dd,ss,rr)
            try:validate(dd,ss,rr)
            except (ValueError,KeyError,IndexError):rejected+=1;continue
            raise ValueError('unsafe mutation accepted')
    print(json.dumps(dict(status='PASS',unsafe_cases_rejected=rejected,scope='provisional speaker/evidence contract only; schema and route payload pending',database_written=False,publication_ready=False)))
if __name__=='__main__':main()

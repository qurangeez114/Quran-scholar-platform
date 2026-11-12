#!/usr/bin/env python3
"""Accept exact I04A/T09 payload and projection lifecycle states; read-only."""
import argparse,copy,importlib.util,json
from pathlib import Path
sp=importlib.util.spec_from_file_location('preview',Path(__file__).with_name('preview-ibn-kathir-i04a-coordinated.py'));p=importlib.util.module_from_spec(sp);sp.loader.exec_module(p)
T09_PAYLOAD_PIN='3ea692a1c310d1206fafedb3efe16c6ce1ced946'
T09_STATE='exact_five_file_preview_plus_pinned_t09_enum_transition'
T09_PROJECTION_PIN='67cf93d8a49573c02342d7cd04d2965473e886b1'
T09_PROJECTION_STATE='exact_five_file_preview_plus_pinned_t09_payload_and_projection_transition'
def t09row(x):return next(r for r in x['rows'] if r['claim_id']=='108-T09')
def exact_t09_transition(expected,current):
    if p.blob(p.encode(current))!=T09_PAYLOAD_PIN:return False
    e=t09row(expected);c=t09row(current)
    if c['proposed_payload']['voice']!={'reporting_work_id':1,'originating_voice_type':'unattributed_group','originating_voice_name':None}:return False
    if c['statement_en']!=e['statement_en'] or c['plan_row']!=e['plan_row'] or c['authoritative_research_claim']!=e['authoritative_research_claim']:return False
    for key in ('proposition','evidence','link'):
        if c['proposed_payload'][key]!=e['proposed_payload'][key]:return False
    if c['publication_ready'] is not False or c['assembly_state']!=e['assembly_state']:return False
    n=copy.deepcopy(current);nr=t09row(n)
    n['generated_at']=expected['generated_at'];nr['blocking_note']=e['blocking_note']
    nr['proposed_payload']['voice']=copy.deepcopy(e['proposed_payload']['voice'])
    nr['schema_vocabulary_repairs']=copy.deepcopy(e['schema_vocabulary_repairs'])
    if n.pop('tabari_t09_voice_enum_repair',None) is None:return False
    return n==expected
def exact_t09_projection_transition(expected,current):
    if p.blob(p.encode(current))!=T09_PROJECTION_PIN:return False
    e=t09row(expected);c=t09row(current)
    if current['inputs']['assembly_blob_sha']!=T09_PAYLOAD_PIN:return False
    if c['database_fields']!={'reporting_work_id':1,'originating_voice_type':'unattributed_group','originating_voice_name':None}:return False
    if c['blockers']!=['proposition_id unresolved until authorized proposition insertion','live source and full-payload validation pending']:return False
    n=copy.deepcopy(current);nr=t09row(n)
    n['inputs']['assembly_blob_sha']=expected['inputs']['assembly_blob_sha']
    nr['database_fields']=copy.deepcopy(e['database_fields']);nr['blockers']=copy.deepcopy(e['blockers'])
    return n==expected
def classify(original,expected,current):
    if current==original:return 'original_unapplied'
    if current==expected:return 'exact_five_file_preview'
    if current[1:]==expected[1:] and exact_t09_transition(expected[0],current[0]):return T09_STATE
    if current[2:]==expected[2:] and exact_t09_transition(expected[0],current[0]) and exact_t09_projection_transition(expected[1],current[1]):return T09_PROJECTION_STATE
    raise ValueError('partial or divergent I04A/T09 transition')
def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--baseline',required=True);ap.add_argument('--current',required=True);a=ap.parse_args()
    b=Path(a.baseline)/'data/tafsir/staging';n=Path(a.current)/'data/tafsir/staging'
    raw=[(b/x).read_bytes() for x in p.NAMES];p.need([p.blob(x) for x in raw]==p.PINS,'baseline drift')
    cr=(b/p.CANDIDATE).read_bytes();p.need(p.blob(cr)==p.CPIN and cr==(n/p.CANDIDATE).read_bytes(),'candidate drift')
    original=[json.loads(x) for x in raw];expected=list(p.build(*original,json.loads(cr)));current=[json.loads((n/x).read_text()) for x in p.NAMES]
    state=classify(original,expected,current);p.need(classify(original,expected,expected)=='exact_five_file_preview','positive transition')
    cases=[]
    for mask in range(1,31):cases.append([copy.deepcopy(expected[i] if mask&(1<<i) else original[i]) for i in range(5)])
    def row(x,index):return next(r for r in x[index]['rows'] if r['claim_id']=='108-I04A')
    bad=copy.deepcopy(expected);row(bad,0)['proposed_payload']['routes'][1]['evidence_unit_ref']='108-I04A-E1';cases.append(bad)
    bad=copy.deepcopy(expected);row(bad,1)['atomic_voice_projection'][1]['proposition_id_resolution']['from_staging_key']='108-I04A-A-P';cases.append(bad)
    bad=copy.deepcopy(expected);next(r for r in bad[3]['claims'] if r['id']=='108-I04A')['statement_en']='Ibn Abbas gives the river reply';cases.append(bad)
    bad=copy.deepcopy(expected);bad[4]['source_blob_sha']=p.PINS[3];cases.append(bad)
    bad=copy.deepcopy(expected);bad[2]['locators']=[];cases.append(bad)
    bad=copy.deepcopy(expected);bad[2]['at']='altered';cases.append(bad)
    bad=copy.deepcopy(expected);bad[0]['rows'][0]['statement_en']='unrelated change';cases.append(bad)
    bad=copy.deepcopy(expected);row(bad,0)['semantic_publication_hold']='';cases.append(bad)
    bad=copy.deepcopy(expected);bad[1]['publication_ready']=True;cases.append(bad)
    bad=copy.deepcopy(expected);bad[0]['counts']['claims']=75;cases.append(bad)
    if state==T09_STATE:
        p.need(exact_t09_transition(expected[0],current[0]),'T09 positive transition')
        def tbad(mutator):
            x=copy.deepcopy(current);mutator(t09row(x[0]),x[0]);cases.append(x)
        tbad(lambda r,x:r['proposed_payload']['voice'].update(originating_voice_type='exegete_own_view'))
        tbad(lambda r,x:r['proposed_payload']['voice'].update(originating_voice_name='unknown'))
        tbad(lambda r,x:r.update(statement_en='changed'))
        tbad(lambda r,x:r['plan_row']['evidence'].update(source_sha256='0'*64))
        tbad(lambda r,x:r['proposed_payload']['evidence'].update(unit_type='single_named_attribution'))
        tbad(lambda r,x:r['proposed_payload']['link'].update(semantic_link_note='changed'))
        tbad(lambda r,x:r['plan_row'].update(transmission_route_state='present'))
        tbad(lambda r,x:r.update(publication_ready=True))
        tbad(lambda r,x:x.update(unrelated_change=True))
    if state==T09_PROJECTION_STATE:
        p.need(exact_t09_transition(expected[0],current[0]),'T09 payload positive transition')
        p.need(exact_t09_projection_transition(expected[1],current[1]),'T09 projection positive transition')
        def pbad(mutator):
            x=copy.deepcopy(current);mutator(t09row(x[1]),x[1]);cases.append(x)
        pbad(lambda r,x:x['inputs'].update(assembly_blob_sha=expected[1]['inputs']['assembly_blob_sha']))
        pbad(lambda r,x:r['database_fields'].update(originating_voice_type='exegete_own_view'))
        pbad(lambda r,x:r['database_fields'].update(originating_voice_name='unknown'))
        pbad(lambda r,x:r['blockers'].clear())
        pbad(lambda r,x:r.update(publication_ready=True))
        pbad(lambda r,x:r.update(state='complete'))
        pbad(lambda r,x:next(z for z in x['rows'] if z['claim_id']=='108-T11A')['database_rows'].pop())
        pbad(lambda r,x:x['counts'].update(projected=71))
        pbad(lambda r,x:x.update(database_written=True))
        pbad(lambda r,x:x.update(unrelated_change=True))
    for bad in cases:
        try:classify(original,expected,bad)
        except ValueError:continue
        raise ValueError('unsafe transition accepted')
    print(json.dumps(dict(status='PASS',current_state=state,rejected_cases=len(cases),partial_subsets_rejected=30,t09_payload_unsafe_variants_rejected=9 if state in (T09_STATE,T09_PROJECTION_STATE) else 0,t09_projection_unsafe_variants_rejected=10 if state==T09_PROJECTION_STATE else 0,files_applied=False,database_written=False,publication_ready=False,chapter_complete=False)))
if __name__=='__main__':main()

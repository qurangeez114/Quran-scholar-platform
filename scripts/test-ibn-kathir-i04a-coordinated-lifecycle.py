#!/usr/bin/env python3
"""Accept only original or exact five-file I04A transition; read-only."""
import argparse,copy,importlib.util,json
from pathlib import Path
sp=importlib.util.spec_from_file_location('preview',Path(__file__).with_name('preview-ibn-kathir-i04a-coordinated.py'));p=importlib.util.module_from_spec(sp);sp.loader.exec_module(p)
def classify(original,expected,current):
    if current==original:return 'original_unapplied'
    if current==expected:return 'exact_five_file_preview'
    raise ValueError('partial or divergent I04A transition')
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
    for bad in cases:
        try:classify(original,expected,bad)
        except ValueError:continue
        raise ValueError('unsafe transition accepted')
    print(json.dumps(dict(status='PASS',current_state=state,rejected_cases=len(cases),partial_subsets_rejected=30,files_applied=False,database_written=False,publication_ready=False,chapter_complete=False)))
if __name__=='__main__':main()

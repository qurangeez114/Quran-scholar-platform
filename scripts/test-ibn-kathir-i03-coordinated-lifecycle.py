#!/usr/bin/env python3
"""Read-only I03 transition: accept original or exact coordinated preview only."""
import argparse,copy,importlib.util,json
from pathlib import Path
sp=importlib.util.spec_from_file_location('preview',Path(__file__).with_name('preview-ibn-kathir-i03-coordinated.py'));p=importlib.util.module_from_spec(sp);sp.loader.exec_module(p)
def classify(original,expected,current):
 if current==original:return 'original_unapplied'
 if current==expected:return 'exact_three_file_preview'
 raise ValueError('partial or divergent I03 transition')
def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--baseline',required=True);ap.add_argument('--current',required=True);args=ap.parse_args();b=Path(args.baseline)/'data/tafsir/staging';n=Path(args.current)/'data/tafsir/staging'
 raw=[(b/x).read_bytes() for x in p.NAMES];p.need([p.blob(x) for x in raw]==p.PINS,'baseline drift');original=[json.loads(x) for x in raw]
 inputs=['ibn-kathir-108-i03-two-proposition-draft-2026-10-21.json','ibn-kathir-108-i03-clause-evidence-dossier-2026-10-21.json']
 for x in inputs:p.need((b/x).read_bytes()==(n/x).read_bytes(),'draft or dossier drift')
 d,s=[json.loads((b/x).read_text()) for x in inputs];expected=list(p.build(*original,d,s));current=[json.loads((n/x).read_text()) for x in p.NAMES];state=classify(original,expected,current);p.need(classify(original,expected,expected)=='exact_three_file_preview','positive transition')
 cases=[]
 for mask in range(1,7):cases.append([copy.deepcopy(expected[i] if mask&(1<<i) else original[i]) for i in range(3)])
 def row(x,idx=0):return next(r for r in x[idx]['rows'] if r['claim_id']=='108-I03')
 for section in ('propositions','voices','evidence_units','links'):
  bad=copy.deepcopy(expected);row(bad)['proposed_payload'][section].pop();cases.append(bad)
 bad=copy.deepcopy(expected);row(bad,1)['atomic_voice_projection'][1]['proposition_id_resolution']['from_staging_key']='108-I03-A-P';cases.append(bad)
 bad=copy.deepcopy(expected);row(bad,1)['atomic_voice_projection'].pop();cases.append(bad)
 bad=copy.deepcopy(expected);row(bad)['fidelity']['state']='English fully aligned';cases.append(bad)
 bad=copy.deepcopy(expected);bad[2]['locators']=[];cases.append(bad)
 bad=copy.deepcopy(expected);bad[2]['at']='changed';cases.append(bad)
 bad=copy.deepcopy(expected);bad[0]['rows'][0]['statement_en']='unrelated change';cases.append(bad)
 bad=copy.deepcopy(expected);bad[1]['publication_ready']=True;cases.append(bad)
 bad=copy.deepcopy(expected);bad[0]['counts']['claims']=75;cases.append(bad)
 for bad in cases:
  try:classify(original,expected,bad)
  except ValueError:continue
  raise ValueError('unsafe transition accepted')
 print(json.dumps(dict(status='PASS',current_state=state,exact_transition_accepted=True,rejected_cases=len(cases),files_applied=False,database_written=False,publication_ready=False,chapter_complete=False)))
if __name__=='__main__':main()

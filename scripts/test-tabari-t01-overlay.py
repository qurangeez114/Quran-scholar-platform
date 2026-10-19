#!/usr/bin/env python3
"""Offline, non-applying T01 assembly overlay test. No publication authority."""
import argparse
import copy
import hashlib
import importlib.util
import json
from pathlib import Path

def blob(raw):
    return hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()

def preview(a, o, d, source, validator):
    def check(ok, message):
        if not ok:
            raise ValueError(message)
    validator(d,source)
    check(o['status']=='preview_only_not_applied', 'overlay lifecycle')
    check(all(o[k] is False and a[k] is False for k in ('database_written','publication_ready','chapter_complete')), 'holds')
    rows=a['rows']
    check(len(rows)==74 and len({r['claim_id'] for r in rows})==74, 'inventory')
    replacement=o['row_replacement']
    target=[r for r in rows if r['claim_id']=='108-T01']
    check(len(target)==1 and replacement['before']==target[0], 'before row drift/repeated application')
    after=replacement['after']
    check(after['proposed_payload']==d['candidate'], 'candidate drift')
    expected=copy.deepcopy(target[0])
    expected.update(assembly_state='proposed_payload_pending_schema_and_live_validation',missing_payload_sections=[],proposed_payload=d['candidate'])
    # Only these documented overlay fields may supplement the unchanged source plan.
    expected['blocking_note']=after['blocking_note']
    expected['t01_heading_locator']=after['t01_heading_locator']
    expected['t01_candidate_inputs']=after['t01_candidate_inputs']
    check(after==expected and after['publication_ready'] is False, 'unapproved row change')
    loc=after['t01_heading_locator']
    check(loc=={'entry_id':5261,'start':165,'end':234,'offset_convention':'zero-based Unicode codepoints, half-open','sha256':d['source']['span_sha256'],'original_plan_range_preserved':[177,192]}, 'heading locator')
    out=copy.deepcopy(a)
    out['rows']=[copy.deepcopy(after) if r['claim_id']=='108-T01' else copy.deepcopy(r) for r in rows]
    out['counts']['new_proposed_four_section_payloads']+=1
    out['counts']['blocked_payload_mappings']-=1
    check(out['counts']=={'claims':74,'copied_four_section_payloads':41,'new_proposed_four_section_payloads':23,'blocked_payload_mappings':10}, 'projected counts')
    check([r for r in out['rows'] if r['claim_id']!='108-T01']==[r for r in rows if r['claim_id']!='108-T01'], '73 unrelated claims')
    return out

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--root',type=Path,default=Path('.'))
    p.add_argument('--validator',type=Path,default=Path('scripts/validate-tabari-t01-draft.py'))
    args=p.parse_args()
    spec=importlib.util.spec_from_file_location('t01_contract',args.validator)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    folder=args.root/'data/tafsir/staging'
    def read(name):
        return json.loads((folder/name).read_text())
    a=read('surah-108-payload-assembly-2026-10-16.json')
    o=read('tabari-108-t01-assembly-overlay-2026-10-18.json')
    d=read(module.DRAFT)
    source=read(module.SOURCE)
    for key,name in [('assembly','surah-108-payload-assembly-2026-10-16.json'),('projection','surah-108-voice-projection-2026-10-17.json'),('draft',module.DRAFT)]:
        if blob((folder/name).read_bytes())!=o['expected_blobs'][key]:
            raise ValueError('Pinned input drift: '+key)
    result=preview(a,o,d,source,module.validate)
    bad_cases=[]
    bad=copy.deepcopy(o); bad['row_replacement']['after']['proposed_payload']['voice']['originating_voice_name']='Ibn Umar'; bad_cases.append((a,bad))
    bad=copy.deepcopy(o); bad['row_replacement']['after']['plan_row']['english_coverage']='present'; bad_cases.append((a,bad))
    bad=copy.deepcopy(o); bad['row_replacement']['after']['publication_ready']=True; bad_cases.append((a,bad))
    bad=copy.deepcopy(a); bad['rows'].append(copy.deepcopy(bad['rows'][0])); bad_cases.append((bad,o))
    bad_cases.append((result,o))
    for baseline,overlay in bad_cases:
        try:
            preview(baseline,overlay,d,source,module.validate)
        except ValueError:
            continue
        raise RuntimeError('Unsafe overlay accepted')
    print('PASS: pinned inputs, isolated 74-row preview, 73 unchanged claims; 5 unsafe/repeated cases rejected')
    print('No files applied. Projection and other consumers still require coordinated integration.')

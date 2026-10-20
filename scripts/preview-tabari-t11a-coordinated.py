#!/usr/bin/env python3
"""Preview T11A's coordinated staging documents in memory. Never writes files or SQL."""
import argparse, copy, hashlib, importlib.util, json
from pathlib import Path
NAMES = ["surah-108-payload-assembly-2026-10-16.json","surah-108-voice-projection-2026-10-17.json","qurtubi-108-q06-bilingual-source-check-2026-10-17.json"]
PINS = ["b5410232db5a307f43404033fb792c3118670a31","53accc427b656bd76c3f884dbf0da7290ccf3145","8cfa8cb97ff4c581b28eaae05fe99db6e16ec710"]
def encode(x): return (json.dumps(x,ensure_ascii=False,indent=2)+"\n").encode()
def blob(b): return hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()
def check(x,msg):
    if not x: raise ValueError(msg)
def build(a,p,q,d):
    before=copy.deepcopy((a,p,q,d))
    check(all(x.get(k) is False for x in (a,p,q,d) for k in ("database_written","publication_ready","chapter_complete")),"holds")
    check(p["inputs"]["assembly_blob_sha"]==q["input_assembly_blob_sha"]==PINS[0],"stale consumer")
    check(a["counts"]["blocked_payload_mappings"]==9 and p["counts"]["projected"]==65 and p["counts"]["unmapped"]==9,"baseline counts")
    old=next(x for x in a["rows"] if x["claim_id"]=="108-T11A")
    check(old["assembly_state"]=="blocked_incomplete_payload_mapping" and "proposed_payload" not in old,"already mapped")
    c=d["candidate"]
    check([len(c[k]) for k in ("voices","evidence_units","links","routes")]==[4,6,6,7],"candidate cardinalities")
    aa,pp,qq=copy.deepcopy((a,p,q))
    row=next(x for x in aa["rows"] if x["claim_id"]=="108-T11A")
    row.update(assembly_state="isolated_multirow_preview_not_integrated",proposed_payload=copy.deepcopy(c),payload_schema="t11a_plural_sections_preview_v1",semantic_publication_hold="Multirow consumer lifecycle validation and authorized final preflight pending")
    row["missing_payload_sections"]=[]
    row["blocking_note"]="Preview only; existing single-voice consumers must be adapted before application."
    aa["counts"]["blocked_payload_mappings"]=8
    aa["counts"]["new_proposed_four_section_payloads"]=25
    sha=blob(encode(aa))
    projected=next(x for x in pp["rows"] if x["claim_id"]=="108-T11A")
    projected.update(state="isolated_multirow_preview_not_integrated",target_table="proposition_voice_chain",database_rows=[],staging_row_metadata=[],publication_ready=False,semantic_publication_hold=row["semantic_publication_hold"],blockers=["Plural consumer adaptation pending","proposition_id unresolved"])
    fields={"reporting_work_id","originating_voice_type","originating_voice_name","quoted_collection"}
    for v in c["voices"]:
        db={k:v[k] for k in sorted(fields)}
        meta={k:v[k] for k in v if k not in fields}
        check(dict(db,**meta)==v,"lossy voice")
        projected["database_rows"].append(db)
        projected["staging_row_metadata"].append(meta)
    pp["inputs"]["assembly_blob_sha"]=sha
    pp["counts"].update(projected=66,unmapped=8,semantic_holds=13)
    qq.update(previous_assembly_blob_sha=PINS[0],input_assembly_blob_sha=sha,preview_rebase_note="T11A in-memory preview only; Q06 evidence and historical source-check date preserved.")
    for original,preview in ((a,aa),(p,pp)):
        check([x for x in original["rows"] if x["claim_id"]!="108-T11A"]==[x for x in preview["rows"] if x["claim_id"]!="108-T11A"],"unrelated rows changed")
    check(q["locators"]==qq["locators"] and q["at"]==qq["at"],"Q06 evidence changed")
    check((a,p,q,d)==before,"input mutation")
    return aa,pp,qq
if __name__=="__main__":
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--root",default=".")
    ap.add_argument("--draft-root",default=".")
    args=ap.parse_args()
    base=Path(args.root)/"data/tafsir/staging"
    raw=[(base/n).read_bytes() for n in NAMES]
    check([blob(b) for b in raw]==PINS,"pinned source drift")
    folder=Path(args.draft_root)/"data/tafsir/staging"
    d=json.loads((folder/"tabari-108-t11a-catalog-provenance-review-2026-10-20.json").read_text())
    dossier=json.loads((folder/"tabari-108-t11a-transmission-route-dossier-2026-10-19.json").read_text())
    spec=importlib.util.spec_from_file_location("validator",Path(__file__).with_name("validate-tabari-t11a-draft.py"))
    validator=importlib.util.module_from_spec(spec);spec.loader.exec_module(validator)
    validator.validate(d,dossier)
    a,p,q=[json.loads(b) for b in raw]
    outputs=build(a,p,q,d)
    rejected=0
    for mode in ("stale","repeat","loss","publish"):
        bad=copy.deepcopy([a,p,q,d])
        if mode=="stale":bad[1]["inputs"]["assembly_blob_sha"]="bad"
        if mode=="repeat":bad[:3]=copy.deepcopy(outputs)
        if mode=="loss":bad[3]["candidate"]["voices"].pop()
        if mode=="publish":bad[0]["publication_ready"]=True
        try: build(*bad)
        except ValueError:rejected+=1
        else:raise ValueError("unsafe case accepted: "+mode)
    print(json.dumps(dict(status="PASS",files_previewed=3,preview_claims=74,preview_mapped=66,preview_unmapped=8,voices=4,evidence_units=6,routes=7,unrelated_rows_preserved=73,rejected_cases=rejected,output_blob_shas={n:blob(encode(x)) for n,x in zip(NAMES,outputs)},files_applied=False,database_written=False,publication_ready=False,chapter_complete=False)))

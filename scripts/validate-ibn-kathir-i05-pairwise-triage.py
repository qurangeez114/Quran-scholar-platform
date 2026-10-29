#!/usr/bin/env python3
"""Reproduce structural duplicate triage; does not grant semantic clearance."""
import hashlib,itertools,json
from pathlib import Path
B=Path("data/tafsir/staging")
def validate(d):
    raw=(B/d["basis"]["file"]).read_bytes()
    if hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()!=d["basis"]["blob_sha"]:raise ValueError("Assembly changed")
    c=json.loads(raw)["candidate"];ps=c["propositions"];exact=[];overlap=[]
    def locs(p):
        ids={l["evidence_unit_ref"] for l in c["links"] if l["proposition_ref"]==p["staging_key"]}
        return [e["source_locator"] for e in c["evidence_units"] if e["staging_key"] in ids and "source_locator" in e]
    pairs=list(itertools.combinations(ps,2))
    for x,y in pairs:
        keys=[x["staging_key"],y["staging_key"]]
        if x["statement_en"].strip().lower()==y["statement_en"].strip().lower():exact.append(keys)
        if x["speaker_name"]==y["speaker_name"] and any(l["start"]<r["end"] and r["start"]<l["end"] for l in locs(x) for r in locs(y)):overlap.append(keys)
    if len(pairs)!=d["pairs_screened"] or exact!=d["exact_text_duplicates"] or overlap!=d["same_speaker_overlapping_source_pairs"] or len(overlap)!=d["flagged_pair_count"]:raise ValueError("Triage mismatch")
    if any(d[k] for k in ("semantic_duplicate_clearance","database_written","publication_ready","chapter_complete")):raise ValueError("Unsupported clearance")
def main():
    import copy
    d=json.loads((B/"ibn-kathir-108-i05-pairwise-duplicate-triage-2026-10-29.json").read_text());validate(d)
    cases=[]
    for k in ("pairs_screened","flagged_pair_count"):
        x=copy.deepcopy(d);x[k]+=1;cases.append(x)
    x=copy.deepcopy(d);x["same_speaker_overlapping_source_pairs"]=[];cases.append(x)
    for k in ("semantic_duplicate_clearance","database_written","publication_ready","chapter_complete"):
        x=copy.deepcopy(d);x[k]=True;cases.append(x)
    for bad in cases:
        try:validate(bad)
        except ValueError:continue
        raise AssertionError("Unsafe triage accepted")
    print("PASS: 861 pairs and 22 overlaps reproduced; 7 unsafe changes rejected")
if __name__=="__main__":main()

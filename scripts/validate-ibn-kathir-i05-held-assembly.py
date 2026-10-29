#!/usr/bin/env python3
"""Read-only pinned I05 assembly union validation."""
import copy,hashlib,json
from pathlib import Path
B=Path("data/tafsir/staging")
N="ibn-kathir-108-i05-held-annotated-assembly-2026-10-28.json"
def read(spec):
    raw=(B/spec["file"]).read_bytes()
    if hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()!=spec["blob_sha"]:raise ValueError("Pinned source changed")
    return json.loads(raw)
def validate(d):
    union={k:[] for k in ("propositions","voices","evidence_units","links","routes")}
    for i,spec in enumerate(d["inputs"]):
        c=copy.deepcopy(read(spec)["candidate"])
        if i==0:
            for r in c["propositions"]:
                if r["staging_key"]=="108-I05-R02-P":r["staging_key"]="108-I05-BASE-ATA-SLAUGHTER-P"
            for r in c["voices"]:
                if r.get("staging_key")=="108-I05-R02-V":r["staging_key"]="108-I05-BASE-ATA-SLAUGHTER-V"
            for r in c["voices"]+c["links"]:
                if r["proposition_ref"]=="108-I05-R02-P":r["proposition_ref"]="108-I05-BASE-ATA-SLAUGHTER-P"
        for k in union:union[k]+=c[k]
    if d["candidate"]!=union:raise ValueError("Exact scoped union mismatch")
    original=read(d["assembly_basis"])
    if d["candidate"]!=original["candidate"] or d["source_metadata"]!=original["source_metadata"]:raise ValueError("Annotation changed candidate/source metadata")
    read(d["alias_plan"])
    for a in d["annotations"]:
        if a["review"]!=read(a) or a["representation"]!="unattributed_review_metadata_only":raise ValueError("Annotation fidelity")
    ps={r["staging_key"] for r in union["propositions"]};es={r["staging_key"] for r in union["evidence_units"]}
    if len(ps)!=42 or len(es)!=32:raise ValueError("Unique key count")
    if any(r["proposition_ref"] not in ps for r in union["voices"]+union["links"]):raise ValueError("Proposition reference")
    if any(r["evidence_unit_ref"] not in es for r in union["links"]+union["routes"]):raise ValueError("Evidence reference")
    if len(union["voices"])!=41 or len(union["routes"])!=8:raise ValueError("Deliberate absence/count")
    if d["holds"]!=["A03 anonymous voice missing by design","A04 gloss attribution unresolved","P01 bracket provenance unresolved","R02 standalone citation consumer/provenance and dependency hold","Full union/inverse-alias and semantic duplicate validation pending","Annotation attachment preserves attribution uncertainty; it does not resolve original gloss/bracket holds."]:raise ValueError("Holds changed")
    if any(d[k] for k in ("database_written","publication_ready","chapter_complete")):raise ValueError("False completion")
def main():
    d=json.loads((B/N).read_text());validate(d);cases=[]
    for k in ("propositions","voices","evidence_units","links","routes"):
        x=copy.deepcopy(d);x["candidate"][k]=[];cases.append(x)
    for k in ("database_written","publication_ready","chapter_complete"):
        x=copy.deepcopy(d);x[k]=True;cases.append(x)
    x=copy.deepcopy(d);x["holds"]=[];cases.append(x)
    x=copy.deepcopy(d);x["annotations"][0]["review"]={};cases.append(x)
    for bad in cases:
        try:validate(bad)
        except ValueError:continue
        raise AssertionError("Unsafe assembly accepted")
    print("PASS: eleven-input scoped union, annotations, keys and refs; 10 unsafe mutations rejected")
if __name__=="__main__":main()

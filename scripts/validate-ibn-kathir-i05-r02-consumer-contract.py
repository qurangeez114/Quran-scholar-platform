#!/usr/bin/env python3
"""Offline R02 consumer contract guard; no DB access."""
import copy,hashlib,json,pathlib
BASE=pathlib.Path(__file__).resolve().parents[1]/"data/tafsir/staging"
def read(name,sha):
    raw=(BASE/name).read_bytes()
    assert hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()==sha,"Pinned source changed"
    return json.loads(raw)
def validate(c,p):
    assert c["expected_graph"]==p["candidate"],"Graph changed"
    assert c["retained_metadata"]==p["metadata"],"Provenance lost"
    assert c["retained_holds"]==p["holds"],"Hold lost"
    assert c["identity_contract"]["expected_counts"]==p["counts"]
    assert c["identity_contract"]["physical_payload"] is False
    for k in ("database_written","publication_ready","chapter_complete"):assert c[k] is False
def main():
    c=read("ibn-kathir-108-i05-r02-offline-consumer-contract-2026-10-29.json","49999f978d632278c34760b164a54563bd9a81f7")
    p=read("ibn-kathir-108-i05-r02-coordinated-preview-2026-10-28.json","a93a3f1ac58a57b8b4715c9b7298f74e321c299a")
    validate(c,p)
    mutations=[
      lambda x:x["expected_graph"]["evidence_units"].pop(),
      lambda x:x["expected_graph"]["links"].append({"proposition_ref":"108-I05-R02-P","evidence_unit_ref":"108-I05-R02-CITATION-E"}),
      lambda x:x["expected_graph"]["routes"][0].update(evidence_unit_ref="108-I05-R02-E"),
      lambda x:x["expected_graph"]["routes"][0].update(transmitter_chain=["Israil ibn Hatim","invented continuation"]),
      lambda x:x["retained_metadata"]["reported_citation"].pop("dependency"),
      lambda x:x["retained_metadata"]["reported_citation"].pop("source_locator"),
      lambda x:x.update(publication_ready=True),
      lambda x:x.update(chapter_complete=True),
    ]
    for mutate in mutations:
        bad=copy.deepcopy(c);mutate(bad)
        try:validate(bad,p)
        except AssertionError:continue
        raise AssertionError("Unsafe mutation accepted")
    print("PASS exact R02 graph, metadata and holds; 8 unsafe mutations rejected")
    print("OFFLINE ONLY: no consumer deployment, physical provenance or publication clearance")
if __name__=="__main__":main()

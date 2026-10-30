#!/usr/bin/env python3
"""Offline I06 attribution boundary guard. No DB access."""
import copy,hashlib,json,pathlib
BASE=pathlib.Path(__file__).resolve().parents[1]/"data/tafsir/staging"
def read(name,sha):
    raw=(BASE/name).read_bytes()
    assert hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()==sha
    return json.loads(raw)
def validate(c,l):
    views=c["candidates"][:4];n=c["candidates"][4]
    assert len(c["candidates"])==5
    assert [v["originator"] for v in views]==["Ibn Abbas","Mujahid","Sa'id ibn Jubayr","Qatada"]
    assert all(v["route_id"]=="108-I06-R01" and v["chain"] is None and v["independence_state"]=="unknown" for v in views)
    assert n["route_id"]=="108-I06-R02" and n["reporting_sequence"]==["Ibn Kathir","Muhammad ibn Ishaq","Yazid ibn Ruman"]
    assert n["upper_chain"] is None and n["independence_state"]=="unknown"
    assert "omitted" in n["english_fidelity"] and "merges" in n["english_fidelity"]
    assert c["status"]=="semantic_candidate_only_not_physical_payload"
    assert len(c["holds"])==5
    for obj in (c,l):
        for k in ("database_written","publication_ready","chapter_complete"):assert obj[k] is False
    a,b=l["arabic_locators"];parent=c["source_locators"]["arabic"]
    assert [a["route_id"],b["route_id"]]==["108-I06-R01","108-I06-R02"]
    assert a["start"]==parent["start"] and a["end"]==b["start"] and b["end"]==parent["end"]
    assert a["text"]+b["text"]==parent["text"]
    for x in (a,b,parent):assert hashlib.sha256(x["text"].encode()).hexdigest()==x["sha256"]
    assert l["candidate_scope_map"]==[{"candidate_key":x["key"],"arabic_route_locator":x["route_id"]} for x in c["candidates"]]
def main():
    c=read("ibn-kathir-108-i06-separated-semantic-candidate-2026-10-30.json","63b7d5e50977864d14ce8aa429b749698a38cb94")
    l=read("ibn-kathir-108-i06-paragraph-locators-2026-10-30.json","cd3742ec4100e1eb0c97bac2829c0db42abf06a2")
    validate(c,l)
    mutations=[
      lambda c,l:c["candidates"][4].update(reporting_sequence=["Ibn Abbas","Mujahid","Sa'id ibn Jubayr","Qatada"]),
      lambda c,l:c["candidates"][0].update(chain=["Ibn Abbas","Mujahid"]),
      lambda c,l:c["candidates"][4].update(upper_chain=["invented"]),
      lambda c,l:c["candidates"][4].update(english_fidelity="fully preserved"),
      lambda c,l:l["arabic_locators"][0].update(end=16734),
      lambda c,l:c.update(holds=[]),
      lambda c,l:c.update(publication_ready=True),
    ]
    for mutate in mutations:
        x,y=copy.deepcopy(c),copy.deepcopy(l);mutate(x,y)
        try:validate(x,y)
        except AssertionError:continue
        raise AssertionError("Unsafe mutation accepted")
    print("PASS I06 parallel voices, narrative boundary, paragraph hashes and holds; 7 unsafe cases rejected")
if __name__=="__main__":main()

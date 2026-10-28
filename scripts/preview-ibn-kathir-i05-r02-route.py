#!/usr/bin/env python3
"""Build a review-only abbreviated route; never connect to or write a database."""
import copy,json
from pathlib import Path
def build(design):
    c=design["reported_citation"]; dep=design["dependency"]; r=design["route_design"]
    if c["representation"]!="design_only_not_physical_payload": raise ValueError("Design scope")
    if c["staging_key"]!="108-I05-R02-CITATION-E" or r["evidence_unit_ref"]!=c["staging_key"]: raise ValueError("Citation target")
    if dep["from_evidence_ref"]!=c["staging_key"] or dep["to_coverage_key"]!="108-I05-R01": raise ValueError("Dependency")
    if dep["expanded_chain"] is not None or r["transmitter_chain"] is not None: raise ValueError("Unprinted chain")
    if c["independence_state"]!="unknown" or c["collection_locator"] is not None: raise ValueError("Unsupported inference")
    if r["physical_ids_assigned"] or any(design[k] for k in ("database_written","publication_ready","chapter_complete")): raise ValueError("Lifecycle")
    if any(design["link_decision"][k] for k in ("new_propositions","new_voices","new_proposition_evidence_links")): raise ValueError("New claim/link")
    if r["source_citation_text"]!=c["source_locator"]["text"]: raise ValueError("Citation text")
    return {"status":"review_only_evidence_type_and_linkage_unverified","table":"evidence_transmission_routes","staging_evidence_ref":c["staging_key"],"fields":{"route_description":r["route_description"],"transmitter_chain":None,"source_citation_text":r["source_citation_text"]},"dependency_metadata":copy.deepcopy(dep),"database_written":False,"publication_ready":False}
def main():
    d=json.loads(Path("data/tafsir/staging/ibn-kathir-108-i05-r02-reported-citation-design-2026-10-28.json").read_text())
    out=build(d)
    assert out["fields"]["transmitter_chain"] is None
    cases=[]
    for section,key,val in [("route_design","evidence_unit_ref","108-I05-R02-E"),("route_design","transmitter_chain",["Israil"]),("dependency","expanded_chain",["Ali"]),("reported_citation","independence_state","independent"),("route_design","physical_ids_assigned",True)]:
        x=copy.deepcopy(d);x[section][key]=val;cases.append(x)
    for bad in cases:
        try:build(bad)
        except ValueError:continue
        raise AssertionError("Unsafe preview accepted")
    print("PASS: null-chain route retained in review-only preview; 5 unsafe changes rejected")
if __name__=="__main__":main()

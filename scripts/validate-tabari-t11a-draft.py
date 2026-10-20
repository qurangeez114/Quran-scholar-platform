#!/usr/bin/env python3
"""Read-only T11A draft validation. No network, SQL, or file writes."""
import argparse
import copy
import hashlib
import json
from pathlib import Path

def require(ok, message):
    if not ok:
        raise ValueError(message)

def validate(draft, dossier):
    c = draft["candidate"]
    require(all(draft.get(k) is False for k in ("database_written", "assembly_changed", "publication_ready", "chapter_complete")), "publication flags")
    require(draft["counts_unchanged"] == {"total_claims":74,"mapped":65,"unmapped":9}, "counts")
    require(draft["six_scholar_baseline"] == dossier["six_scholar_baseline"], "six scholars")
    require(draft["source"] == dossier["source"] if "source" in draft else True, "source metadata")
    require([len(c[k]) for k in ("voices","evidence_units","links","routes")] == [4,6,6,7], "cardinalities")
    p = c["proposition"]
    require(p["claim_type_id"] == 43 and p["tafsir_entry_id"] == 5263 and p["source_type"] == "tafsir_entry", "proposition identity")
    require(p["statement_en"] == dossier["fidelity"]["claim_summary"], "statement")
    require(p["supporting_span"] == dossier["evidence_units"][0]["arabic"], "supporting span")
    require(p["mufassir_own_position"] == "reported_only" and p["quranic_textual_support"] == "not_stated", "attribution")
    require(p["verification_state"] == "source_language_located" and p["extraction_validity"] == "pending_source_verification", "verification level")
    require(all(p.get(k) is None for k in ("normative_polarity","scope_generality","comparison_object_id")), "provenance fields")
    require(all("id" not in x for x in [p]+c["voices"]+c["evidence_units"]+c["routes"]), "invented generated ID")
    expected = [("companion_report","Ibn Abbas"),("named_earlier_exegete","Said ibn Jubayr"),("named_earlier_exegete","Mujahid"),("named_earlier_exegete","Qatada")]
    require([(v["originating_voice_type"],v["originating_voice_name"]) for v in c["voices"]] == expected, "voices")
    require(all(v["reporting_work_id"] == 1 and v["proposition_ref"] == p["staging_key"] for v in c["voices"]), "voice links")
    keys = []
    for i,(e,u) in enumerate(zip(c["evidence_units"],dossier["evidence_units"]),1):
        key = "108-T11A-E"+str(i)
        require(e["staging_key"] == key, "evidence key")
        keys.append(key)
        loc = e["source_locator"]
        require(loc["entry_id"] == 5263 and all(loc[k] == u[k] for k in ("start_codepoint","end_codepoint","sha256","arabic")), "source locator")
        require(len(loc["arabic"]) == loc["end_codepoint"]-loc["start_codepoint"], "span length")
        require(hashlib.sha256(loc["arabic"].encode()).hexdigest() == loc["sha256"], "span hash")
        require(e["unit_type"] == "single_named_attribution" and e["attributed_authority_name"] == u["originating_authority"] and e["independence_state"] == "unknown", "evidence attribution")
    require([x["evidence_unit_ref"] for x in c["links"]] == keys and all(x["proposition_ref"] == p["staging_key"] for x in c["links"]), "evidence links")
    for r, original in zip(c["routes"],dossier["routes"]):
        require(r["staging_key"] == original["route_key"], "route identity")
        require(r["evidence_unit_ref"] == keys[original["evidence_unit_index"]-1], "route unit")
        require(r["transmitter_chain"] == [n["label_ar_as_written"] for n in original["ordered_transmitters"]], "literal transmitter chain")
        require(r["source_citation_text"] == dossier["evidence_units"][original["evidence_unit_index"]-1]["arabic"], "route citation")
    require(c["routes"][-1].get("staging_qualification") == "بلغنا", "reporting qualification")
    require(draft["physical_table_mapping"]["routes"] == "evidence_transmission_routes", "physical route table")

def self_test(draft, dossier):
    mutations = [
        ("route loss",lambda x:x["candidate"]["routes"].pop()),
        ("authority collapse",lambda x:x["candidate"]["voices"].pop()),
        ("citation change",lambda x:x["candidate"]["routes"][0].update(source_citation_text="changed")),
        ("name expansion",lambda x:x["candidate"]["routes"][0]["transmitter_chain"].__setitem__(1,"guessed father")),
        ("independence upgrade",lambda x:x["candidate"]["evidence_units"][0].update(independence_state="independence_supported")),
        ("publication flag",lambda x:x.update(publication_ready=True)),
        ("invented ID",lambda x:x["candidate"]["voices"][0].update(id=1)),
        ("provenance coding",lambda x:x["candidate"]["proposition"].update(scope_generality="specific_instance")),
        ("qualification loss",lambda x:x["candidate"]["routes"][-1].pop("staging_qualification")),
        ("duplicate evidence link",lambda x:x["candidate"]["links"][1].update(evidence_unit_ref="108-T11A-E1")),
    ]
    for name, mutate in mutations:
        altered = copy.deepcopy(draft)
        mutate(altered)
        try:
            validate(altered,dossier)
        except (ValueError,KeyError,IndexError):
            continue
        raise ValueError("accepted invalid mutation: "+name)
    return len(mutations)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root",default=".")
    parser.add_argument("--self-test",action="store_true")
    args = parser.parse_args()
    base = Path(args.root)/"data/tafsir/staging"
    draft = json.loads((base/"tabari-108-t11a-catalog-provenance-review-2026-10-20.json").read_text())
    dossier = json.loads((base/"tabari-108-t11a-transmission-route-dossier-2026-10-19.json").read_text())
    validate(draft,dossier)
    n = self_test(draft,dossier) if args.self_test else 0
    print(json.dumps({"draft_valid":True,"rejected_mutations":n,"database_written":False,"publication_ready":False}))

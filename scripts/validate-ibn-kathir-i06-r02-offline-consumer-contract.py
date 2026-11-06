#!/usr/bin/env python3
"""Validate the held I06-R02 offline consumer contract; no database access."""
from __future__ import annotations
import copy, hashlib, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STAGE = ROOT / "data/tafsir/staging"
ARTIFACT = STAGE / "ibn-kathir-108-i06-r02-offline-consumer-contract-2026-11-06.json"
SOURCES = {
    "validation": (STAGE / "ibn-kathir-108-i06-r02-evidence-link-validation-2026-11-06.json", "4bdc1d8f53aa70a14ee273695900ce1a3e26b393"),
    "review": (STAGE / "ibn-kathir-108-i06-r02-evidence-link-review-2026-10-30.json", "ac0f521d3a06a2906fef2342a9e3e34e423ed7b9"),
    "draft": (STAGE / "ibn-kathir-108-i06-r02-held-proposition-draft-2026-10-30.json", "469ff5d9b0812814cece0fdd43cbd6038c40e0ee"),
    "clauses": (STAGE / "ibn-kathir-108-i06-r02-clause-map-2026-10-30.json", "5832e147d541183557eacd320e16aae6b52b3567"),
}
BASELINE = {"tabari":18,"ibn_kathir":15,"qurtubi":23,"jalalayn":5,"saadi":6,"tanwir_disputed_attribution":7}
PROPS = ["108-I06-R02-DISMISSAL-P","108-I06-R02-CHARACTERIZATION-P","108-I06-R02-MEMORY-P","108-I06-R02-REVELATION-P"]
ASSERTION_KEYS = ["dismissal","no_descendants_speech","memory_prediction","revelation_statement"]
CONTEXT_KEYS = ["reporting_frame","narrative_context"]

def require(ok, message):
    if not ok: raise AssertionError(message)

def blob_sha(raw):
    return hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()

def load_pinned(path, sha):
    raw=path.read_bytes(); require(blob_sha(raw)==sha, f"pinned blob changed: {path.name}")
    return json.loads(raw)

def validate(d, src):
    require(d["schema_version"]=="quranhikma-i06-r02-offline-consumer-contract-v1", "schema")
    require((d["surah"],d["scholar_key"],d["claim_id"],d["route_id"])==(108,"ibn_kathir","108-I06","108-I06-R02"), "scope")
    require(d["status"]=="offline_consumer_contract_held_not_deployed", "status")
    require(d["six_scholar_baseline"]==BASELINE, "baseline")
    basis_keys={"validation":"evidence_link_validation","review":"evidence_link_review","draft":"held_proposition_draft","clauses":"clause_map"}
    for key, (_, sha) in SOURCES.items(): require(d["basis"][basis_keys[key]]["blob"]==sha, f"basis {key}")
    g=d["frozen_graph"]
    require({k:g[k] for k in ("propositions","semantic_links","assertion_evidence_locators","shared_context_locators","voices","unresolved_voice_mappings","evidence_rows","route_rows","physical_ids")}=={"propositions":4,"semantic_links":4,"assertion_evidence_locators":4,"shared_context_locators":2,"voices":0,"unresolved_voice_mappings":4,"evidence_rows":0,"route_rows":0,"physical_ids":0}, "graph")
    require(g["proposition_keys"]==PROPS and g["assertion_clause_keys"]==ASSERTION_KEYS and g["shared_context_clause_keys"]==CONTEXT_KEYS, "graph identities")
    props=src["draft"]["candidate"]["propositions"]
    require([p["staging_key"] for p in props]==PROPS, "proposition provenance")
    require([p["clause_keys"][0] for p in props]==ASSERTION_KEYS, "clause provenance")
    require(src["draft"]["candidate"]["voices"]==[] and len(src["draft"]["unresolved_voice_mappings"])==4, "voice holds")
    require(all(x["required_before_publication"] for x in src["draft"]["unresolved_voice_mappings"]), "voice blocking")
    require([c["key"] for c in src["review"]["context_locators"]]==CONTEXT_KEYS, "context provenance")
    require([x["proposition_ref"] for x in src["review"]["links"]]==PROPS, "link provenance")
    require([x["assertion_clause_locators"][0]["key"] for x in src["review"]["links"]]==ASSERTION_KEYS, "link clauses")
    require(src["validation"]["validation"]["result"]=="PASS" and src["validation"]["validation"]["unsafe_mutations_rejected"]==16, "validation basis")
    require([x["order"] for x in d["consumer_operations"]]==list(range(1,8)), "operation order")
    require([x["operation"] for x in d["consumer_operations"]]==["verify_pinned_sources","resolve_shared_context","resolve_assertion_links","preserve_reported_speakers","preserve_fidelity_and_absences","readback","preserve_holds"], "operations")
    require(d["read_model_contract"]=={"proposition_cards":4,"semantic_links":4,"assertion_evidence_segments":4,"shared_context_segments":2,"shared_context_render_once":True,"voices":0,"routes":0,"physical_ids_exposed":0,"publication_badge":False}, "read model")
    f=d["arabic_english_fidelity"]
    require(f=={"arabic_controls_voice":True,"english_reporting_names_omitted":["Ibn Ishaq","Yazid ibn Ruman"],"english_names_may_be_fabricated":False,"merged_english_transfers_r02_to_r01_names":False,"hostile_speech_is_compiler_endorsement":False,"revelation_statement_is_independent_proof":False}, "fidelity")
    c=d["compatibility_findings"]
    require(c["physical_consumer_compatibility"]=="not_assessed" and c["historical_importer_compatibility"]=="not_asserted_for_r02_in_this_step" and c["physical_reuse_state"]=="unresolved", "compatibility limits")
    require(len(d["reject_conditions"])==10, "reject conditions")
    require(len(d["retained_holds"])==d["active_holds"]==6 and d["resolved_holds"]==d["waived_holds"]==0, "holds")
    require(d["validation"]=={"result":"PASS","validator":"scripts/validate-ibn-kathir-i06-r02-offline-consumer-contract.py","unsafe_mutations_rejected":16}, "validation declaration")
    for key in ("database_written","publication_ready","route_complete","claim_complete","scholar_complete","chapter_complete"): require(d[key] is False, key)
    require(d["counts_unchanged"] is True and d["physical_ids_allocated"]==d["database_write_count"]==0, "write boundary")

def rejected(mutator, base, src):
    bad=copy.deepcopy(base); mutator(bad)
    try: validate(bad,src)
    except (AssertionError,KeyError,TypeError,IndexError): return True
    return False

def main():
    src={k:load_pinned(*v) for k,v in SOURCES.items()}
    data=json.loads(ARTIFACT.read_text())
    validate(data,src)
    mutations=[
        lambda d:d.update(schema_version="bad"),
        lambda d:d["six_scholar_baseline"].update(ibn_kathir=14),
        lambda d:d["frozen_graph"].update(propositions=3),
        lambda d:d["frozen_graph"].update(shared_context_locators=0),
        lambda d:d["frozen_graph"].update(voices=4),
        lambda d:d["frozen_graph"].update(physical_ids=1),
        lambda d:d["frozen_graph"]["assertion_clause_keys"].reverse(),
        lambda d:d["consumer_operations"].pop(),
        lambda d:d["read_model_contract"].update(shared_context_segments=6),
        lambda d:d["read_model_contract"].update(routes=1),
        lambda d:d["arabic_english_fidelity"].update(english_names_may_be_fabricated=True),
        lambda d:d["arabic_english_fidelity"].update(hostile_speech_is_compiler_endorsement=True),
        lambda d:d["compatibility_findings"].update(physical_consumer_compatibility="compatible"),
        lambda d:d["retained_holds"].pop(),
        lambda d:d.update(database_written=True),
        lambda d:d.update(publication_ready=True,route_complete=True,claim_complete=True,scholar_complete=True,chapter_complete=True),
    ]
    require(all(rejected(m,data,src) for m in mutations), "unsafe mutation accepted")
    print("PASS I06-R02 offline consumer contract: 4 propositions, 4 links, 2 shared context clauses, 0 voices/routes; 16 unsafe mutations rejected")

if __name__=="__main__": main()

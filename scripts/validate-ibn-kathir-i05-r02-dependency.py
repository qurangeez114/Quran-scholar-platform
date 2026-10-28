#!/usr/bin/env python3
"""Read-only guard for R02's bounded textual dependency, not route reconstruction."""
import copy, hashlib, json
from pathlib import Path
BASE = Path("data/tafsir/staging")
FILE = "ibn-kathir-108-i05-r02-dependency-design-2026-10-28.json"
EXPECTED = json.loads("{\"schema_version\":\"quranhikma-r02-dependency-design-v1\",\"at\":\"2026-10-28T00:03:00-07:00\",\"surah\":108,\"coverage_key\":\"108-I05-R02\",\"status\":\"explicit_back_reference_design_pending_validation\",\"inputs\":[{\"file\":\"ibn-kathir-108-i05-r02-bounded-draft-2026-10-25.json\",\"blob_sha\":\"55577fec4afbea540d15ee425b481d05de0b5068\"},{\"file\":\"ibn-kathir-108-i05-r01-with-routes-preview-2026-10-27.json\",\"blob_sha\":\"36a362a15e4f3548141d9a6f1b9cce752688f7b1\"}],\"dependency\":{\"from_coverage_key\":\"108-I05-R02\",\"to_coverage_key\":\"108-I05-R01\",\"relation\":\"printed_bihi_back_reference\",\"evidence\":[{\"key\":\"parallel_marker\",\"start\":14936,\"end\":14945,\"text\":\"وَهَكَذَا\",\"sha256\":\"742e7f7760828f43b4e3fe664535bae6af3fb7009caaea8dbb48014881b519a9\",\"captured_entry_id\":48457,\"canonical_entry_id\":48458,\"offsets\":\"zero-based Unicode code points, half-open, unnormalized\"},{\"key\":\"collector_collection\",\"start\":14947,\"end\":14986,\"text\":\"رَوَاهُ الْحَاكِمُ فِي الْمُسْتَدْرَكِ،\",\"sha256\":\"e260e7444bcfc6881c0fcb435ca626daabe518c9c577169b8ff53569a0084850\",\"captured_entry_id\":48457,\"canonical_entry_id\":48458,\"offsets\":\"zero-based Unicode code points, half-open, unnormalized\"},{\"key\":\"named_node\",\"start\":14987,\"end\":15026,\"text\":\"مِنْ حَدِيثِ إِسْرَائِيلَ بْنِ حَاتِمٍ،\",\"sha256\":\"2bcc0856550069e4401b4bda96c9d8b925d37f87367e29926d298217d2bdf02b\",\"captured_entry_id\":48457,\"canonical_entry_id\":48458,\"offsets\":\"zero-based Unicode code points, half-open, unnormalized\"},{\"key\":\"back_reference\",\"start\":15027,\"end\":15032,\"text\":\"بِهِ.\",\"sha256\":\"733154d59059b00263926c8c37596d1f181d3a27f6503b95b9896768eb3c7f12\",\"captured_entry_id\":48457,\"canonical_entry_id\":48458,\"offsets\":\"zero-based Unicode code points, half-open, unnormalized\"}],\"scope\":\"Ibn Kathir reports that al-Hakim narrated it in al-Mustadrak through Israil ibn Hatim, with bihi referring back to the preceding report.\",\"explicit_node\":\"Israil ibn Hatim\",\"expanded_chain\":null,\"independence_state\":\"unknown\",\"collection_locator\":null},\"physical_design\":{\"table\":\"evidence_transmission_routes\",\"decision\":\"A future route description may record the printed abbreviated citation and explicit back-reference; do not populate transmitter_chain with the full R01 chain.\",\"transmitter_chain\":null,\"reason\":\"A single named node plus bihi is not a fully printed R02 transmitter chain.\",\"dependency_storage\":\"Keep relation in staging metadata unless an existing verified physical relation is found; do not invent FK columns.\"},\"limits\":[\"No claim that al-Hakim heard from Israil directly.\",\"No copied Wahb node or reconstructed Muqatil-Asbagh-Ali continuation.\",\"Do not treat R02 as independent corroboration of the dialogue.\",\"Do not route Ibn Kathir's own commentary through reported transmitters.\",\"No source edition or al-Mustadrak location verified; English bounded absence retained.\"],\"remaining\":[\"Negative validation of dependency and no-chain-expansion limits\",\"Review evidence target and abbreviated physical route draft\",\"Coordinated integration and authorized preflight; historical R02 hold remains\"],\"database_written\":false,\"publication_ready\":false,\"chapter_complete\":false}")
def blob(raw):
    return hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()
def validate(d, inputs):
    if d != EXPECTED:
        raise ValueError("Reviewed dependency, limits or lifecycle changed")
    for spec in d["inputs"]:
        if blob(inputs[spec["file"]]) != spec["blob_sha"]:
            raise ValueError("Pinned input changed: " + spec["file"])
    bounded = json.loads(inputs[d["inputs"][0]["file"]])
    target = json.loads(inputs[d["inputs"][1]["file"]])
    dep = d["dependency"]
    if target["coverage_key"] != dep["to_coverage_key"]:
        raise ValueError("Back-reference target")
    if bounded["coverage_key"] != dep["from_coverage_key"]:
        raise ValueError("Back-reference source")
    if dep["evidence"] != bounded["metadata"]["clause_locators"]:
        raise ValueError("Clause correspondence")
    source = bounded["candidate"]["evidence_units"][0]["source_locator"]
    for loc in dep["evidence"]:
        if source["text"][loc["start"]-source["start"]:loc["end"]-source["start"]] != loc["text"]:
            raise ValueError("Clause span differs from captured context")
        if len(loc["text"]) != loc["end"]-loc["start"] or hashlib.sha256(loc["text"].encode()).hexdigest() != loc["sha256"]:
            raise ValueError("Clause length or SHA256")
    if bounded["candidate"]["routes"] or not bounded["unresolved_dependency_mapping"]["required_before_publication"]:
        raise ValueError("Historical dependency hold")
    if dep["expanded_chain"] is not None or d["physical_design"]["transmitter_chain"] is not None:
        raise ValueError("Unprinted chain expansion")
    if dep["independence_state"] != "unknown" or dep["collection_locator"] is not None:
        raise ValueError("Unsupported independence or edition locator")
def main():
    d = json.loads((BASE / FILE).read_text())
    inputs = {s["file"]: (BASE / s["file"]).read_bytes() for s in d["inputs"]}
    validate(d, inputs)
    cases = []
    for section, key, value in [
        ("dependency", "from_coverage_key", "108-I05-R01"),
        ("dependency", "to_coverage_key", "108-I05-R03"),
        ("dependency", "relation", "independent_corroboration"),
        ("dependency", "expanded_chain", ["Wahb", "Israil", "Muqatil", "Asbagh", "Ali"]),
        ("dependency", "independence_state", "independent"),
        ("dependency", "collection_locator", "invented volume/page"),
        ("dependency", "scope", "al-Hakim heard directly from Israil"),
        ("physical_design", "transmitter_chain", ["Israil ibn Hatim"]),
        ("physical_design", "dependency_storage", "invented dependency FK"),
    ]:
        x = copy.deepcopy(d); x[section][key] = value; cases.append(x)
    for key in ("database_written", "publication_ready", "chapter_complete"):
        x = copy.deepcopy(d); x[key] = True; cases.append(x)
    x = copy.deepcopy(d); x["limits"] = []; cases.append(x)
    x = copy.deepcopy(d); x["dependency"]["evidence"][3]["text"] = "invented"; cases.append(x)
    for bad in cases:
        try: validate(bad, inputs)
        except ValueError: continue
        raise AssertionError("Unsafe dependency mutation accepted")
    bad_inputs = dict(inputs)
    name = d["inputs"][1]["file"]
    bad_inputs[name] += b" "
    try: validate(d, bad_inputs)
    except ValueError: pass
    else: raise AssertionError("Changed pinned target accepted")
    print("PASS: pinned R02/R01 inputs, exact clause spans/hashes, dependency limits; 15 unsafe changes rejected")
if __name__ == "__main__":
    main()

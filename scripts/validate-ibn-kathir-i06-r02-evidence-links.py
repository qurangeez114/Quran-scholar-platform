#!/usr/bin/env python3
"""Validate I06-R02 semantic evidence links offline; no database access."""
import copy, hashlib, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
BASE = ROOT / "data/tafsir/staging"
FILES = {
    "review": ("ibn-kathir-108-i06-r02-evidence-link-review-2026-10-30.json", "ac0f521d3a06a2906fef2342a9e3e34e423ed7b9"),
    "draft": ("ibn-kathir-108-i06-r02-held-proposition-draft-2026-10-30.json", "469ff5d9b0812814cece0fdd43cbd6038c40e0ee"),
    "clauses": ("ibn-kathir-108-i06-r02-clause-map-2026-10-30.json", "5832e147d541183557eacd320e16aae6b52b3567"),
    "candidate": ("ibn-kathir-108-i06-r02-refined-semantic-candidate-2026-10-30.json", "8196ca25cf0a90b0954acacf9f68d65debfe1ac9"),
}
OUT = BASE / "ibn-kathir-108-i06-r02-evidence-link-validation-2026-11-06.json"

def git_blob_sha(raw):
    return hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()

def load(name, sha):
    raw = (BASE / name).read_bytes()
    assert git_blob_sha(raw) == sha, f"pinned blob changed: {name}"
    return json.loads(raw)

def validate(out, review, draft, clauses, candidate):
    props = draft["candidate"]["propositions"]
    clause_by_key = {c["key"]: c for c in clauses["clauses"]}
    assert [c["key"] for c in clauses["clauses"]] == ["reporting_frame", "narrative_context", "dismissal", "no_descendants_speech", "memory_prediction", "revelation_statement"]
    assert all(clauses["clauses"][i]["end"] == clauses["clauses"][i+1]["start"] for i in range(5))
    for c in clauses["clauses"]:
        assert len(c["text"]) == c["end"] - c["start"]
        assert hashlib.sha256(c["text"].encode()).hexdigest() == c["sha256"]
    assert draft["candidate"]["voices"] == []
    assert len(draft["unresolved_voice_mappings"]) == 4
    assert all(x["required_before_publication"] is True for x in draft["unresolved_voice_mappings"])
    assert len(review["links"]) == len(props) == 4
    expected_mapping = []
    for p, link in zip(props, review["links"]):
        assert link["proposition_ref"] == p["staging_key"]
        assert p["mufassir_own_position"] == "reported_only"
        assert link["reporting_context_clause_keys"] == ["reporting_frame", "narrative_context"]
        assert link["relation"] == "source_reports_assertion"
        assert link["scope"] == "Attests wording and attribution in this tafsir narrative; does not verify the historical occurrence or compiler endorsement."
        assert link["physical_evidence_id"] is None and link["physical_link_id"] is None
        assert link["assertion_clause_locators"] == [clause_by_key[p["clause_keys"][0]]]
        c = link["assertion_clause_locators"][0]
        expected_mapping.append({"proposition_ref": p["staging_key"], "speaker": p["speaker_name"], "assertion_mode": p["assertion_mode"], "assertion_clause_key": c["key"], "start": c["start"], "end": c["end"], "sha256": c["sha256"]})
    assert review["context_locators"] == [clause_by_key["reporting_frame"], clause_by_key["narrative_context"]]
    assert [a["clause_keys"][0] for a in candidate["assertions"]] == [m["assertion_clause_key"] for m in expected_mapping]
    assert out["validated_graph"]["mapping"] == expected_mapping
    assert out["validated_graph"]["shared_context_clause_keys"] == ["reporting_frame", "narrative_context"]
    assert out["validated_graph"]["relation"] == "source_reports_assertion"
    assert out["validated_graph"]["scope"] == review["links"][0]["scope"]
    assert out["fidelity"] == review["fidelity"] == draft["metadata"]["fidelity"]
    for key, value in {"propositions":4,"semantic_links":4,"assertion_evidence_locators":4,"shared_context_locators":2,"voices":0,"evidence_rows":0,"route_rows":0,"physical_ids":0}.items():
        assert out["validated_graph"][key] == value
    assert out["holds"] == {"unresolved_voice_mappings":4,"all_required_before_publication":True,"upper_chain":"absent_from_bounded_printed_passage","authentication":"not_assessed","external_edition":"unresolved","independence":"unknown"}
    assert out["validation"]["result"] == "PASS" and out["validation"]["unsafe_mutations_rejected"] == 16
    for key in ("database_written", "publication_ready", "scholar_complete", "chapter_complete"):
        assert out[key] is False

def main():
    docs = {k: load(*v) for k, v in FILES.items()}
    out = json.loads(OUT.read_text())
    validate(out, docs["review"], docs["draft"], docs["clauses"], docs["candidate"])
    mutations = [
        lambda x: x["validated_graph"]["mapping"].pop(),
        lambda x: x["validated_graph"]["mapping"][0].update(assertion_clause_key="no_descendants_speech"),
        lambda x: x["validated_graph"]["mapping"][0].update(start=16865),
        lambda x: x["validated_graph"]["mapping"][0].update(sha256="0"*64),
        lambda x: x["validated_graph"]["mapping"][0].update(speaker="Ibn Kathir"),
        lambda x: x["validated_graph"]["mapping"][3].update(speaker="al-As ibn Wa'il"),
        lambda x: x["validated_graph"].update(shared_context_clause_keys=["reporting_frame"]),
        lambda x: x["validated_graph"].update(shared_context_locators=0),
        lambda x: x["validated_graph"].update(relation="verifies_historical_occurrence"),
        lambda x: x["validated_graph"].update(scope="compiler endorsement"),
        lambda x: x["validated_graph"].update(voices=4),
        lambda x: x["validated_graph"].update(physical_ids=1),
        lambda x: x["holds"].update(upper_chain="verified"),
        lambda x: x["holds"].update(independence="independent"),
        lambda x: x["fidelity"].update(english_reporting_names="Ibn Ishaq and Yazid ibn Ruman stated in English"),
        lambda x: x.update(publication_ready=True, scholar_complete=True, chapter_complete=True),
    ]
    for mutate in mutations:
        bad = copy.deepcopy(out); mutate(bad)
        try: validate(bad, docs["review"], docs["draft"], docs["clauses"], docs["candidate"])
        except AssertionError: continue
        raise AssertionError("unsafe mutation accepted")
    print("PASS I06-R02: 4 proposition links, 6 exact Arabic locators, 2 context-only clauses, 4 voice holds; 16 unsafe mutations rejected")

if __name__ == "__main__":
    main()

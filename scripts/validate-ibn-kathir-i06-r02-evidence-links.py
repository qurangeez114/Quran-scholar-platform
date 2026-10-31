#!/usr/bin/env python3
"""Offline semantic evidence-link guard; no database access."""
import copy, hashlib, json, pathlib
BASE = pathlib.Path(__file__).resolve().parents[1] / "data/tafsir/staging"
def read(name, sha):
    raw = (BASE / name).read_bytes()
    assert hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest() == sha
    return json.loads(raw)
def validate(r, d):
    expected = []
    for p in d["candidate"]["propositions"]:
        expected.append(dict(proposition_ref=p["staging_key"],
            assertion_clause_locators=[c for c in d["metadata"]["clause_locators"] if c["key"] in p["clause_keys"]],
            reporting_context_clause_keys=["reporting_frame", "narrative_context"],
            relation="source_reports_assertion",
            scope="Attests wording and attribution in this tafsir narrative; does not verify the historical occurrence or compiler endorsement.",
            physical_evidence_id=None, physical_link_id=None))
    assert r["links"] == expected, "Link meaning, clause, context or physical identity changed"
    assert r["context_locators"] == [c for c in d["metadata"]["clause_locators"] if c["key"] in ["reporting_frame", "narrative_context"]]
    assert r["fidelity"] == d["metadata"]["fidelity"]
    assert r["status"] == "semantic_evidence_links_only_not_physical_payload"
    assert r["basis"]["blob_sha"] == "469ff5d9b0812814cece0fdd43cbd6038c40e0ee"
    assert len(r["links"]) == 4
    for c in r["context_locators"] + [c for link in r["links"] for c in link["assertion_clause_locators"]]:
        assert hashlib.sha256(c["text"].encode()).hexdigest() == c["sha256"]
        assert len(c["text"]) == c["end"] - c["start"]
    for k in ("database_written", "publication_ready", "chapter_complete"):
        assert r[k] is False
def main():
    r = read("ibn-kathir-108-i06-r02-evidence-link-review-2026-10-30.json", "ac0f521d3a06a2906fef2342a9e3e34e423ed7b9")
    d = read("ibn-kathir-108-i06-r02-held-proposition-draft-2026-10-30.json", "469ff5d9b0812814cece0fdd43cbd6038c40e0ee")
    validate(r,d)
    changes = [
        lambda x: x["links"].pop(),
        lambda x: x["links"][0].update(proposition_ref=x["links"][1]["proposition_ref"]),
        lambda x: x["links"][0].update(relation="verifies_historical_occurrence"),
        lambda x: x["links"][0].update(physical_evidence_id=1),
        lambda x: x["links"][0].update(assertion_clause_locators=x["context_locators"]),
        lambda x: x["links"][0].update(reporting_context_clause_keys=[]),
        lambda x: x["fidelity"].update(arabic_controls_voice=False),
        lambda x: x.update(publication_ready=True),
    ]
    for change in changes:
        bad=copy.deepcopy(r); change(bad)
        try: validate(bad,d)
        except AssertionError: continue
        raise AssertionError("Unsafe mutation accepted")
    print("PASS four source-report links, exact clause hashes and context; 8 unsafe cases rejected")
if __name__ == "__main__": main()

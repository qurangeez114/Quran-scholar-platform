#!/usr/bin/env python3
"""Offline guard for held I06 R02 propositions. No database or network access."""
import copy
import hashlib
import json
import pathlib

BASE = pathlib.Path(__file__).resolve().parents[1] / "data/tafsir/staging"

def read(name, sha):
    raw = (BASE / name).read_bytes()
    assert hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest() == sha, name
    return json.loads(raw)

def validate(d, s):
    expected = []
    holds = []
    for i, a in enumerate(s["assertions"]):
        key = a["key"] + "-P"
        expected.append(dict(
            staging_key=key, claim_type_id=14 if i < 3 else 16,
            statement_en=a["statement_en"], source_type="tafsir_entry",
            tafsir_entry_id=48459,
            speaker_type="unspecified" if i < 3 else "sub_narrator",
            speaker_name="al-As ibn Wa'il" if i < 3 else "Yazid ibn Ruman",
            assertion_mode="quoted" if i < 3 else "explicit",
            mufassir_own_position="reported_only",
            verification_state="source_language_located",
            extraction_validity="pending_source_verification",
            attribution_fidelity="accurate_paraphrase",
            quranic_textual_support="not_stated", clause_keys=a["clause_keys"]))
        holds.append(dict(proposition_ref=key, required_before_publication=True,
            reason="Historical quoted speaker has no verified faithful current voice category."
            if i < 3 else "Narrative source voice category remains semantically unverified; no forced earlier-exegete assignment."))
    assert d["candidate"] == dict(propositions=expected, voices=[]), "Propositions, ownership or empty voices changed"
    assert d["unresolved_voice_mappings"] == holds, "Mandatory voice holds changed"
    assert d["basis_blob_sha"] == "8196ca25cf0a90b0954acacf9f68d65debfe1ac9"
    for key in ("reporting_metadata", "clause_locators", "fidelity"):
        assert d["metadata"][key] == s[key], key
    assert d["status"] == "proposition_only_held_draft" and d["surah"] == 108
    for key in ("database_written", "publication_ready", "chapter_complete"):
        assert d[key] is False, key

def main():
    d = read("ibn-kathir-108-i06-r02-held-proposition-draft-2026-10-30.json", "469ff5d9b0812814cece0fdd43cbd6038c40e0ee")
    s = read("ibn-kathir-108-i06-r02-refined-semantic-candidate-2026-10-30.json", "8196ca25cf0a90b0954acacf9f68d65debfe1ac9")
    validate(d, s)
    changes = [
        lambda x: x["candidate"]["propositions"][2].update(statement_en="Muhammad's memory ceased."),
        lambda x: x["candidate"]["propositions"][0].update(speaker_name="Ibn Kathir"),
        lambda x: x["candidate"]["propositions"][0].update(mufassir_own_position="preferred"),
        lambda x: x["candidate"]["propositions"][3].update(clause_keys=["memory_prediction"]),
        lambda x: x["candidate"]["voices"].append({"voice_type": "named_earlier_exegete", "name": "al-As ibn Wa'il"}),
        lambda x: x["unresolved_voice_mappings"].pop(),
        lambda x: x["unresolved_voice_mappings"][0].update(required_before_publication=False),
        lambda x: x["metadata"]["fidelity"].update(english_reporting_names="Names present"),
        lambda x: x["metadata"]["reporting_metadata"].update(upper_chain=["invented"]),
        lambda x: x.update(publication_ready=True),
        lambda x: x["candidate"].update(evidence_units=[]),
    ]
    for change in changes:
        bad = copy.deepcopy(d)
        change(bad)
        try:
            validate(bad, s)
        except AssertionError:
            continue
        raise AssertionError("Unsafe mutation accepted")
    print("PASS four exact held propositions, source metadata and four mandatory voice holds; 11 unsafe cases rejected")

if __name__ == "__main__":
    main()

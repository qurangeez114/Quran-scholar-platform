import copy
import hashlib
import json
from pathlib import Path

P = Path("data/tafsir/staging/ibn-kathir-108-i08-exact-transition-2026-11-05.json")


def validate(d):
    assert d["schema_version"] == "quranhikma-i08-exact-transition-readonly-log-v1"
    assert (d["surah"], d["claim_id"], d["verse"]) == (108, "108-I08", 3)

    capture = d["source_capture"]
    assert capture["workflow"] == ".github/workflows/tafsir-108-i08-exact-transition-readonly.yml"
    assert capture["workflow_commit"] == "9427727862ff2227e330eeb63ca545e31de4ff4e"
    assert capture["workflow_blob"] == "24d90d42f59d2139d34eb170f54c2d73a6ad985d"
    assert (capture["run_id"], capture["job_id"], capture["conclusion"], capture["writes"]) == (
        42148797072, 127666674647, "success", 0
    )
    assert [x["run_id"] for x in capture["repair_history"]] == [
        42148253448, 42148453958, 42148566412, 42148672684
    ]
    assert all("database write" in x["finding"] for x in capture["repair_history"][:3])

    ar = d["arabic"]
    assert (ar["entry_id"], ar["sura"], ar["aya"], ar["language"], ar["scholar_key"]) == (
        48459, 108, 3, "ar", "ibn_kathir"
    )
    assert ar["source_sha256"] == "088bd57659f0a6645f7195f2e98caf9562e0571eca8214730cd55c07401402b2"
    assert (ar["start_codepoint_0"], ar["end_codepoint_0_exclusive"]) == (16991, 17061)
    assert (ar["start_utf8_byte_0"], ar["end_utf8_byte_0_exclusive"]) == (31614, 31743)
    assert len(ar["span"]) == 70 and len(ar["span"].encode()) == 129
    assert hashlib.sha256(ar["span"].encode()).hexdigest() == ar["span_sha256"] == (
        "1a3630bff12fde653c46271b628c3518ac8ab3835a7e9ffe6d9783550ce3cecd"
    )
    assert ar["normalized_anchors"] == ["وقال شمر بن عطية", "عقبة بن ابي معيط"]

    en = d["english"]
    assert (en["entry_id"], en["sura"], en["aya"], en["language"], en["scholar_key"]) == (
        11081, 108, 3, "en", "ibn_kathir"
    )
    assert en["source_sha256"] == "7e5883c137fce598750407a0a0d4aca5fa03e791f371b3ffdd5d7c280511afda"
    assert (en["start_codepoint_0"], en["end_codepoint_0_exclusive"]) == (6689, 6772)
    assert (en["start_utf8_byte_0"], en["end_utf8_byte_0_exclusive"]) == (8054, 8137)
    assert len(en["span"]) == 83 and len(en["span"].encode()) == 83
    assert hashlib.sha256(en["span"].encode()).hexdigest() == en["span_sha256"] == (
        "98511b067204bb8bd96a255003b7e0fdaecffb9259465a7fcebd835e11372a03"
    )
    assert en["span"].startswith("Shamir bin `Atiyah said")
    assert en["span"].endswith("`Uqbah bin Abi Mu`ayt.")
    assert en["role"] == "positive_aligned_evidence"
    assert "excludes the following closing quotation mark" in en["exact_span_note"]

    fidelity = d["fidelity"]
    assert fidelity["voice"] == "Shamir ibn Atiyya"
    assert fidelity["voice_type"] == "reported_interpretation_or_report"
    assert fidelity["arabic_english_alignment"] == "PASS"
    assert fidelity["disagreement_status"] == "competing_referent_reports_preserved_separately"
    assert "Ibn Abbas/Ikrima" in fidelity["excluded_context"] and "al-Bazzar" in fidelity["excluded_context"]
    assert fidelity["aligned_elements"] == [
        "Shamir ibn Atiyya is the named reporting voice",
        "Uqba ibn Abi Mu'ayt is the named referent",
        "the statement is framed as an occasion attribution for the surah",
    ]

    status = d["evidence_status"]
    assert status["extracted_route"] == "absent"
    assert status["chain_state"] == "attribution_explicit_chain_absent_in_checked_excerpt"
    assert status["chapter_witnesses"] == 1 and status["duplicated_chapter_witness"] is True
    assert status["external_independence"] == "unknown"
    assert len(status["explicit_absences"]) == 5

    locator = d["print_locator"]
    assert (locator["volume"], locator["page"]) == (8, 504)
    assert locator["url"] == "https://shamela.ws/book/8473/4550"
    assert all(
        d[key] is False
        for key in ("database_written", "publication_ready", "claim_complete", "scholar_complete", "chapter_complete")
    )


if __name__ == "__main__":
    data = json.loads(P.read_text())
    validate(data)
    cases = [
        (("arabic", "start_codepoint_0"), 16990),
        (("arabic", "span"), "invented"),
        (("english", "end_codepoint_0_exclusive"), 6773),
        (("english", "role"), "omission_context"),
        (("fidelity", "voice"), "Ibn Kathir"),
        (("fidelity", "voice_type"), "commentator_statement"),
        (("fidelity", "arabic_english_alignment"), "FAIL"),
        (("fidelity", "disagreement_status"), "none"),
        (("evidence_status", "extracted_route"), "complete"),
        (("evidence_status", "chapter_witnesses"), 2),
        (("evidence_status", "external_independence"), "independent"),
        (("database_written",), True),
        (("publication_ready",), True),
        (("chapter_complete",), True),
    ]
    for path, value in cases:
        bad = copy.deepcopy(data)
        node = bad
        for key in path[:-1]:
            node = node[key]
        node[path[-1]] = value
        try:
            validate(bad)
        except AssertionError:
            pass
        else:
            raise AssertionError(path)
    print(json.dumps({"result": "PASS", "unsafe_mutations_rejected": len(cases), "database_writes": 0}))

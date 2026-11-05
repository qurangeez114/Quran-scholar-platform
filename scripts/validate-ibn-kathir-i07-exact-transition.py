import copy
import hashlib
import json
from pathlib import Path

P = Path("data/tafsir/staging/ibn-kathir-108-i07-exact-transition-2026-11-05.json")


def validate(d):
    assert d["schema_version"] == "quranhikma-i07-exact-transition-readonly-log-v1"
    assert (d["surah"], d["claim_id"], d["verse"]) == (108, "108-I07", 3)

    ar = d["arabic"]
    assert (ar["entry_id"], ar["sura"], ar["aya"], ar["language"], ar["scholar_key"]) == (
        48459, 108, 3, "ar", "ibn_kathir"
    )
    assert ar["source_sha256"] == "088bd57659f0a6645f7195f2e98caf9562e0571eca8214730cd55c07401402b2"
    assert (ar["start_codepoint_0"], ar["end_codepoint_0_exclusive"]) == (16428, 16621)
    assert (ar["start_utf8_byte_0"], ar["end_utf8_byte_0_exclusive"]) == (30566, 30930)
    assert len(ar["span"]) == 193
    assert hashlib.sha256(ar["span"].encode()).hexdigest() == ar["span_sha256"] == (
        "f3f99e75c2312866707c987d04aaa63eabb1a684b10be3a0ee01d07425574b4c"
    )
    assert ar["normalized_anchors"] == ["إن مبغضك", "المنقطع ذكره"]

    en = d["english"]
    assert (en["entry_id"], en["sura"], en["aya"], en["language"], en["scholar_key"]) == (
        11081, 108, 3, "en", "ibn_kathir"
    )
    assert en["source_sha256"] == "7e5883c137fce598750407a0a0d4aca5fa03e791f371b3ffdd5d7c280511afda"
    assert (en["start_codepoint_0"], en["end_codepoint_0_exclusive"]) == (6083, 6339)
    assert (en["start_utf8_byte_0"], en["end_utf8_byte_0_exclusive"]) == (7446, 7702)
    assert len(en["span"]) == 256
    assert hashlib.sha256(en["span"].encode()).hexdigest() == en["span_sha256"] == (
        "ff2ef08552a6af206fcb70c3c92867793a95412f8616c3c9deed8b130532b831"
    )
    assert en["role"] == "positive_aligned_evidence"

    fidelity = d["fidelity"]
    assert fidelity["voice"] == "Ibn Kathir"
    assert fidelity["voice_type"] == "commentator_statement"
    assert fidelity["arabic_english_alignment"] == "PASS"
    assert fidelity["disagreement_status"] == "none_within_this_bounded_lexical_explanation"
    assert "Subsequent named reports" in fidelity["excluded_context"]
    assert fidelity["aligned_elements"] == [
        "hostility toward Muhammad",
        "hostility toward the guidance, truth and clear proof he brought",
        "being cut off and lowly",
        "loss of remembrance",
    ]

    status = d["evidence_status"]
    assert status["extracted_route"] == "absent"
    assert status["chain_state"] == "absent_in_checked_excerpt"
    assert status["chapter_witnesses"] == 1
    assert status["duplicated_chapter_witness"] is True
    assert status["external_independence"] == "unknown"
    assert len(status["explicit_absences"]) == 4

    locator = d["print_locator"]
    assert (locator["volume"], locator["page"]) == (8, 504)
    assert locator["url"] == "https://shamela.ws/book/8473/4550"
    assert d["source_capture"]["conclusion"] == "success"
    assert d["source_capture"]["run_id"] == 42099610554
    assert d["source_capture"]["job_id"] == 127498633285
    assert all(
        d[key] is False
        for key in ("database_written", "publication_ready", "claim_complete", "scholar_complete", "chapter_complete")
    )


if __name__ == "__main__":
    data = json.loads(P.read_text())
    validate(data)
    cases = [
        (("arabic", "start_codepoint_0"), 16427),
        (("arabic", "span"), "invented"),
        (("english", "end_codepoint_0_exclusive"), 6340),
        (("english", "role"), "omission_context"),
        (("fidelity", "voice"), "Ibn Abbas"),
        (("fidelity", "voice_type"), "reported_statement"),
        (("fidelity", "arabic_english_alignment"), "FAIL"),
        (("evidence_status", "extracted_route"), "complete"),
        (("evidence_status", "chapter_witnesses"), 2),
        (("evidence_status", "external_independence"), "independent"),
        (("print_locator", "page"), 503),
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

#!/usr/bin/env python3
import copy, hashlib, json, sys
from pathlib import Path

ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[1]
STAGE = ROOT / "data/tafsir/staging"
PROJECTION = STAGE / "ibn-kathir-108-i08-semantic-evidence-projection-2026-11-05.json"
EXACT = STAGE / "ibn-kathir-108-i08-exact-transition-2026-11-05.json"

def sha(value):
    return hashlib.sha256(value.encode()).hexdigest()

def check(d, e):
    assert d["claim_id"] == "108-I08" and d["surah"] == 108 and d["verse"] == 3
    assert d["basis"]["blob"] == "3cbf8e0a0ba84e6266a5b26de9ade1f52612db7c"
    assert len(d["semantic_rows"]) == len(d["exact_locators"]) == len(d["evidence_groups"]) == len(d["evidence_links"]) == 1
    row = d["semantic_rows"][0]
    assert row["mode"] == "reported_interpretation_or_report" and row["voice"] == "Shamir ibn Atiyya"
    assert row["statement_en"] == e["fidelity"]["controlled_summary"]
    assert row["symbolic_proposition_key"] == "P:108-I08-SHAMIR-UQBA-OCCASION-REPORT"
    assert all(row[k] is None for k in ("physical_proposition_id", "physical_voice_id", "physical_claim_type", "physical_voice_category"))

    loc = d["exact_locators"][0]
    for lang in ("arabic", "english"):
        projected = loc[lang]
        exact = e[lang]
        assert projected["canonical_entry_id"] == exact["entry_id"]
        assert projected["source_sha256"] == exact["source_sha256"]
        assert projected["start"] == exact["start_codepoint_0"]
        assert projected["end"] == exact["end_codepoint_0_exclusive"]
        assert projected["start_utf8_byte"] == exact["start_utf8_byte_0"]
        assert projected["end_utf8_byte"] == exact["end_utf8_byte_0_exclusive"]
        assert projected["text"] == exact["span"] and projected["span_sha256"] == exact["span_sha256"]
        assert len(projected["text"]) == projected["end"] - projected["start"]
        assert len(projected["text"].encode()) == projected["end_utf8_byte"] - projected["start_utf8_byte"]
        assert sha(projected["text"]) == projected["span_sha256"]

    group = d["evidence_groups"][0]
    assert group["positive_languages"] == ["ar", "en"] and group["chain"] is None and group["routes"] == 0
    assert group["attributed_authority_candidate"] == "Shamir ibn Atiyya"
    assert group["independence"] == "single_duplicated_ibn_kathir_chapter_witness; external_route_independence_unassessed"
    assert group["physical_evidence_unit_id"] is None
    link = d["evidence_links"][0]
    assert link["symbolic_proposition_key"] == row["symbolic_proposition_key"]
    assert link["evidence_group"] == group["key"] and link["physical_link_created"] is False

    route = d["route_and_independence_state"]
    assert route["projection_route_count"] == 0 and route["single_chapter_witness"] is True
    assert route["arabic_english_rows_count_as_independent_witnesses"] is False
    assert route["external_route_independence"] == "unassessed"
    boundary = d["disagreement_and_absence"]
    assert boundary["disagreement_status"] == "competing_referent_reports_preserved_separately"
    assert boundary["absent_route"] is True and boundary["absent_chain_in_checked_excerpt"] is True
    assert boundary["authentication_conclusion"] == "absent"
    assert {x["unit_id"] for x in d["excluded_or_separate_units"]} == {"I08-ADJACENT-IBN-ABBAS-IKRIMA-KAB", "I08-ADJACENT-AL-BAZZAR", "108-I09", "108-I10"}
    assert len(d["holds"]) == 6
    assert all(d[k] is False for k in ("database_written", "publication_ready", "claim_complete", "scholar_complete", "chapter_complete"))
    assert d["database_write_count"] == 0 and d["proposition_count_effect"] == 0

def main():
    d = json.loads(PROJECTION.read_text())
    e = json.loads(EXACT.read_text())
    check(d, e)
    mutations = [
        lambda x: x.update(claim_id="108-I07"),
        lambda x: x["semantic_rows"][0].update(voice="Ibn Kathir"),
        lambda x: x["semantic_rows"][0].update(statement_en="invented"),
        lambda x: x["semantic_rows"][0].update(physical_proposition_id=1),
        lambda x: x["exact_locators"][0]["arabic"].update(start=16992),
        lambda x: x["exact_locators"][0]["english"].update(text="invented"),
        lambda x: x["evidence_groups"][0].update(positive_languages=["ar"]),
        lambda x: x["evidence_groups"][0].update(chain=["invented"]),
        lambda x: x["evidence_groups"][0].update(routes=1),
        lambda x: x["evidence_links"].pop(),
        lambda x: x["route_and_independence_state"].update(arabic_english_rows_count_as_independent_witnesses=True),
        lambda x: x["route_and_independence_state"].update(external_route_independence="established"),
        lambda x: x["disagreement_and_absence"].update(disagreement_status="none"),
        lambda x: x["excluded_or_separate_units"].pop(),
        lambda x: x.update(database_written=True),
        lambda x: x.update(publication_ready=True),
    ]
    for mutate in mutations:
        bad = copy.deepcopy(d)
        mutate(bad)
        try:
            check(bad, e)
        except (AssertionError, KeyError, IndexError, TypeError):
            continue
        raise AssertionError("unsafe mutation accepted")
    print(json.dumps({"result": "PASS", "unsafe_mutations_rejected": len(mutations), "database_writes": 0}))

if __name__ == "__main__":
    main()

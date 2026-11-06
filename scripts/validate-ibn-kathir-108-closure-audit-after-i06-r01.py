#!/usr/bin/env python3
"""Validate the 15-claim Ibn Kathir closure audit after I06-R01."""
from __future__ import annotations
import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTIFACT = ROOT / "data/tafsir/staging/ibn-kathir-108-closure-audit-after-i06-r01-2026-11-06.json"
IDS = [
    "108-I01-A", "108-I01-B", "108-I02", "108-I03", "108-I04A",
    "108-I04B", "108-I04C", "108-I04D", "108-I05", "108-I06",
    "108-I07", "108-I08", "108-I09", "108-I10", "108-I11",
]
CONSOLIDATED = [
    "108-I01-A", "108-I01-B", "108-I03", "108-I04A", "108-I04B",
    "108-I04C", "108-I04D", "108-I07", "108-I08", "108-I09",
    "108-I10", "108-I11",
]
BASELINE = {
    "tabari": 18, "ibn_kathir": 15, "qurtubi": 23,
    "jalalayn": 5, "saadi": 6, "tanwir_disputed_attribution": 7,
}
PROPS = [
    "108-I06-R02-DISMISSAL-P", "108-I06-R02-CHARACTERIZATION-P",
    "108-I06-R02-MEMORY-P", "108-I06-R02-REVELATION-P",
]
ASSERTION_HASHES = [
    "ce548e513db492a19663b73f87b59d1b9e39d7fc8b9f9893fbd1a86b1afdd60e",
    "40d5f51371d46bc98adafad79c5fc7726f55bfac88ea3203272b62204f4cd917",
    "8c889c2299e26e16d19975c7436f84e5e70fc4eb5071b2ec9aa270d9833cab02",
    "9b46afa07c8aea6de6363129e674c09e23eb277ef6461fd954b8b3fca158ada6",
]
CONTEXT_HASHES = [
    "6ac4acb6268fa7deff959646611f0f347fdd74cb57ba8acf6f43a60f8f0e6258",
    "2c231ea2b17e65f08deda3f290d689c0548257d72495e30382dbcc75be1821ec",
]

def require(ok: bool, message: str) -> None:
    if not ok:
        raise AssertionError(message)

def validate(d: dict) -> None:
    require(d["schema_version"] == "quranhikma-ibn-kathir-108-closure-audit-after-i06-r01-v1", "schema")
    require((d["surah"], d["scholar_key"]) == (108, "ibn_kathir"), "scope")
    require(d["six_scholar_baseline"] == BASELINE, "baseline")
    rows = d["claim_rows"]
    require(len(rows) == 15 and [x["claim_id"] for x in rows] == IDS, "claim inventory")
    require(len({x["claim_id"] for x in rows}) == 15, "unique claims")
    by_id = {x["claim_id"]: x for x in rows}
    require(all(by_id[x]["closure_class"] == "offline_hold_consolidated" for x in CONSOLIDATED), "claim-level closures")
    require(by_id["108-I02"]["closure_class"] == "route_hold_consolidated_for_r05_claim_incomplete", "I02 boundary")
    require(by_id["108-I06"]["closure_class"] == "route_hold_consolidated_for_r01_claim_incomplete", "I06 boundary")
    c = d["coverage_summary"]
    require(c["active_split_claims"] == 15 and c["publication_ready_claims"] == 0, "claim counts")
    require(c["claim_level_offline_hold_consolidated"] == CONSOLIDATED, "consolidated list")
    require(c["claim_level_offline_hold_consolidated_count"] == 12, "consolidated count")
    require(c["route_level_offline_hold_consolidated"] == ["108-I02-R05", "108-I06-R01"], "route holds")
    require(c["route_level_offline_hold_consolidated_count"] == 2, "route hold count")
    require(c["i02_claim_complete"] is False and c["i06_claim_complete"] is False, "parent boundaries")
    require(c["reviewed_routes"] == 18 and c["publication_ready_routes"] == 0, "route coverage")
    require((c["next_repair_claim"], c["next_repair_route"]) == ("108-I06", "108-I06-R02"), "next repair")
    require(d["basis"]["i06_r01_hold_consolidation"]["blob"] == "5aa4f67875e36ed4ae40d24798ca422d85d25f54", "R01 pin")
    require(d["basis"]["i06_r02_evidence_link_review"]["blob"] == "ac0f521d3a06a2906fef2342a9e3e34e423ed7b9", "link-review pin")
    require(d["basis"]["i06_r02_held_proposition_draft"]["blob"] == "469ff5d9b0812814cece0fdd43cbd6038c40e0ee", "draft pin")
    require(d["basis"]["i06_r02_clause_map"]["blob"] == "5832e147d541183557eacd320e16aae6b52b3567", "clause pin")
    r01 = d["i06_r01_refresh_finding"]
    require(r01["graph"] == {"symbolic_propositions": 4, "proposed_voices": 4, "evidence_units": 1, "links": 4, "routes": 0}, "R01 graph")
    require((r01["active_holds"], r01["resolved_holds"], r01["waived_holds"]) == (6, 0, 0), "R01 holds")
    require(r01["parent_claim_complete"] is False and r01["parent_claim_level_hold_consolidated"] is False, "R01 parent")
    n = d["selected_next_repair"]
    require((n["claim_id"], n["route_id"]) == ("108-I06", "108-I06-R02"), "selected route")
    require(n["proposition_refs"] == PROPS and n["semantic_evidence_links"] == 4, "R02 propositions/links")
    require([x["sha256"] for x in n["assertion_clause_locators"]] == ASSERTION_HASHES, "assertion locators")
    require([x["sha256"] for x in n["shared_context_locators"]] == CONTEXT_HASHES, "context locators")
    require(n["source_entry"] == {"captured_entry_id": 48457, "canonical_entry_id": 48459, "offsets": "zero-based Unicode code points, half-open, unnormalized"}, "source entry")
    require(n["unresolved_voice_mappings"] == 4 and n["voices_allocated"] == 0, "voice boundary")
    require(n["evidence_rows_allocated"] == 0 and n["route_rows_allocated"] == 0, "physical rows")
    require(n["reporting_sequence"] == ["Ibn Kathir", "Muhammad ibn Ishaq", "Yazid ibn Ruman"], "reporting sequence")
    require(n["upper_chain"] == "absent" and n["independence"] == "unknown" and n["authentication"] == "not_assessed", "route limits")
    require("omitted" in n["english_fidelity"] and "does not transfer" in n["english_fidelity"], "English fidelity")
    require(len(n["reject"]) == 6 and n["publication_ready"] is False and n["database_written"] is False, "repair safety")
    require(d["route_summary"]["expected_routes"] == 18 and d["route_summary"]["publication_ready_routes"] == 0, "route summary")
    require(all(x["publication_ready"] is False for x in rows), "row readiness")
    for key in ("database_written", "publication_ready", "scholar_complete", "chapter_complete"):
        require(d[key] is False, key)
    require(d["database_write_count"] == 0 and d["counts_unchanged"] is True, "write/count boundary")

def rejected(mutator, base: dict) -> bool:
    d = copy.deepcopy(base)
    mutator(d)
    try:
        validate(d)
    except (AssertionError, KeyError, TypeError):
        return True
    return False

def main() -> None:
    data = json.loads(ARTIFACT.read_text(encoding="utf-8"))
    validate(data)
    mutations = [
        lambda d: d.update(schema_version="bad"),
        lambda d: d["six_scholar_baseline"].update(ibn_kathir=14),
        lambda d: d["claim_rows"].pop(),
        lambda d: d["claim_rows"][9].update(closure_class="offline_hold_consolidated"),
        lambda d: d["coverage_summary"].update(claim_level_offline_hold_consolidated_count=13),
        lambda d: d["coverage_summary"].update(route_level_offline_hold_consolidated_count=1),
        lambda d: d["coverage_summary"].update(i06_claim_complete=True),
        lambda d: d["i06_r01_refresh_finding"].update(active_holds=0),
        lambda d: d["selected_next_repair"].update(route_id="108-I06-R01"),
        lambda d: d["selected_next_repair"]["assertion_clause_locators"][0].update(start_cp=0),
        lambda d: d["selected_next_repair"].update(unresolved_voice_mappings=0),
        lambda d: d["selected_next_repair"].update(voices_allocated=4),
        lambda d: d.update(database_written=True),
        lambda d: d.update(chapter_complete=True),
    ]
    require(all(rejected(m, data) for m in mutations), "unsafe mutation accepted")
    print("PASS: post-I06-R01 closure audit; 12 claim holds, 2 route holds; 14 unsafe mutations rejected")

if __name__ == "__main__":
    main()

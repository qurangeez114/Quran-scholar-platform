#!/usr/bin/env python3
import copy
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[1]
STAGE = ROOT / "data/tafsir/staging"

def read(name, blob):
    raw = (STAGE / name).read_bytes()
    actual = hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()
    assert actual == blob, (name, actual, blob)
    return json.loads(raw)

audit = json.loads((STAGE / "ibn-kathir-108-closure-audit-2026-11-04.json").read_text())
research = read("ibn-kathir-108-research-2026-10-12.json", "03b4890d28328f918dc175876d1f053271fc53d5")
plan = read("ibn-kathir-108-evidence-voice-plan-2026-10-12.json", "a373f1af92ad5a911af553ddb3475857a65d6c9b")
historical = read("ibn-kathir-108-full-inventory-audit-2026-10-15.json", "a537ba2335c3fb88e406a7e680a5a461d8be4a5b")

def check(a):
    rec = a["inventory_reconciliation"]
    ids = [x["id"] for x in research["claims"]]
    pids = [x["claim_id"] for x in plan["claims"]]
    assert ids == pids == rec["authoritative_split_ids"]
    assert rec["authoritative_split_claim_count"] == len(ids) == 15
    assert len(set(ids)) == 15 and ids[:2] == ["108-I01-A", "108-I01-B"]
    assert rec["historical_audit_parent_ids"] == historical["claim_inventory"]["expected_ids"]
    assert rec["historical_audit_parent_count"] == len(rec["historical_audit_parent_ids"]) == 14
    assert rec["retired_parent"] == "108-I01"
    assert rec["active_replacements"] == ["108-I01-A", "108-I01-B"]
    route = a["route_summary"]
    assert route["expected_routes"] == len(historical["route_inventory"]["expected_route_ids"]) == 18
    assert route["reviewed_routes"] == historical["route_inventory"]["reviewed"] == 18
    assert route["unreviewed_routes"] == 0 and route["publication_ready_routes"] == 0
    rows = a["claim_rows"]
    assert len(rows) == 15 and [x["claim_id"] for x in rows] == ids
    assert all(x["publication_ready"] is False for x in rows)
    cov = a["coverage_summary"]
    assert cov["research_rows"] == cov["evidence_plan_rows"] == cov["translation_or_fidelity_labels_present"] == 15
    assert cov["publication_ready_claims"] == 0
    assert cov["offline_hold_consolidated_claims"] == ["108-I10", "108-I11"]
    assert cov["next_exact_closure_claims"] == ["108-I01-A", "108-I01-B"]
    nxt = a["selected_next_boundary"]
    assert nxt["claims"] == ["108-I01-A", "108-I01-B"]
    assert (nxt["arabic_entry_id"], nxt["english_entry_id"]) == (48457, 11079)
    assert "vol. 8, p. 498" in nxt["print_locator"]
    joined = " ".join(nxt["required_separation"])
    for token in ("direct Medinan", "anonymous Meccan", "preference", "consensus"):
        assert token in joined
    assert len(a["disagreements_and_absences"]) == 5
    assert a["counts_unchanged"] is True
    assert a["database_written"] is False and a["database_write_count"] == 0
    assert a["publication_ready"] is False and a["scholar_complete"] is False and a["chapter_complete"] is False

check(audit)
mutators = [
    lambda x: x["inventory_reconciliation"].update(authoritative_split_claim_count=14),
    lambda x: x["inventory_reconciliation"].update(historical_audit_parent_count=15),
    lambda x: x["inventory_reconciliation"]["authoritative_split_ids"].pop(),
    lambda x: x["inventory_reconciliation"]["authoritative_split_ids"].__setitem__(1, "108-I01-A"),
    lambda x: x["route_summary"].update(reviewed_routes=17),
    lambda x: x["route_summary"].update(publication_ready_routes=1),
    lambda x: x["claim_rows"].pop(),
    lambda x: x["coverage_summary"].update(publication_ready_claims=1),
    lambda x: x["selected_next_boundary"].update(claims=["108-I02"]),
    lambda x: x["selected_next_boundary"].update(arabic_entry_id=48458),
    lambda x: x["disagreements_and_absences"].pop(),
    lambda x: x.update(database_written=True),
    lambda x: x.update(scholar_complete=True),
    lambda x: x.update(chapter_complete=True),
]
for mutate in mutators:
    bad = copy.deepcopy(audit)
    mutate(bad)
    try:
        check(bad)
    except (AssertionError, KeyError, IndexError, TypeError):
        continue
    raise AssertionError("unsafe mutation accepted")
assert len(mutators) == 14
print("PASS: Ibn Kathir 108 closure audit; 14 unsafe mutations rejected; 0 database writes")

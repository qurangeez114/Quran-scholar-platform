#!/usr/bin/env python3
"""Validate read-only Qurtubi 108:3 lexical-tail coverage without publishing it."""
import json
import sys
from pathlib import Path

p = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[1] / "data/tafsir/staging/qurtubi-108-q10a-q10b-bilingual-coverage-2026-11-23.json"
d = json.loads(p.read_text(encoding="utf-8"))
assert d["project"] == "QuranHikma"
assert d["supabase_project_id"] == "ylosytbxpzxzwfzjpaej"
assert d["pull_request"]["number"] == 470
assert d["pull_request"]["draft"] is True and d["pull_request"]["merged"] is False
assert d["preflight"]["six_scholar_claims"] == 74
assert d["preflight"]["active_holds"] == 48
assert d["preflight"]["qurtubi_claims"] == 23
assert d["preflight"]["qurtubi_active_holds"] == 8
assert d["preflight"]["holds_cleared"] == 0
assert d["preflight"]["claim_count_changed"] == 0
live = d["live_read_only"]
assert live["database_write_statements"] == 0
assert live["tafsir_accuracy_analysis_s108_rows"] == 0
assert live["arabic"]["id"] == 13241 and live["arabic"]["md5"] == "4963824f42a040edcaa995b7afbf8678"
assert live["english"]["id"] == 38032 and live["english"]["md5"] == "a9d8970d560e8683641ee47e22a38a24"
assert live["arabic"]["q10a_start_1based"] == 1522
assert live["arabic"]["q10b_start_1based"] == 2215
assert live["arabic"]["q10b_chars"] == 341
assert live["english"]["row_tail"] == 'And it is said: "Allah made him'
assert live["english"]["q10b_any_coverage"] is False
assert live["english"]["q10b_search_terms"] == {"sanbur": 0, "sunbur": 0, "cistern": 0, "water_skin": 0}
assert d["coverage"]["q10a"]["parent_in_canonical_23"] is False
assert d["coverage"]["q10a"]["not_closed"] is True
assert d["coverage"]["q10b"]["parent_in_canonical_23"] is False
assert d["coverage"]["q10b"]["not_closed"] is True
assert d["status_ledger"]["publication"] == "not_published"
assert d["status_ledger"]["human_scholarly_review"] == "pending"
assert len(d["unresolved_holds"]) == 8
assert all(value is False for value in d["actions"].values())
assert len(d["external_witnesses"]) == 2
print("PASS: Q10A partial/truncated and Q10B absent; counts and holds unchanged")

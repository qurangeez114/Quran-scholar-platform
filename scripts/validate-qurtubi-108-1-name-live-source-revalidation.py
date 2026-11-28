#!/usr/bin/env python3
"""Validate the staged, non-applied Qurtubi 108:1 witness recheck."""
import json
from pathlib import Path

p = Path(__file__).resolve().parents[1] / "data/tafsir/staging/qurtubi-108-1-name-live-source-revalidation-2026-11-23.json"
d = json.loads(p.read_text(encoding="utf-8"))
assert d["live_rows"]["arabic"]["id"] == 13239
assert d["live_rows"]["english"]["id"] == 38030
assert d["live_rows"]["arabic"]["exact_clause"].endswith("مقاتل")
assert d["live_rows"]["arabic"]["medinan_clause_present"] is False
assert d["live_rows"]["english"]["old_phrase"].endswith("Mujahid.")
assert d["live_rows"]["english"]["proposed_phrase"].endswith("Muqatil.")
assert len(d["witnesses"]) == 3
assert all("مقاتل" in w["meccan"] and "مجاه" in w["medinan"] for w in d["witnesses"])
assert d["repository_state"]["draft"] is True and d["repository_state"]["merged"] is False
ledger = d["ledger"]
assert ledger["human_scholarly_approval"] == "pending"
assert ledger["database_written"] is False and ledger["live_row_changed"] is False and ledger["proposal_applied"] is False
assert ledger["all_six_claims"] == 74 and ledger["active_holds"] == 48 and ledger["holds_cleared"] == 0
assert ledger["published_claims"] == 0 and ledger["chapter_complete"] is False and ledger["ui_validated"] is False
print("PASS: source-scope, row identity, and non-publication safeguards are consistent.")

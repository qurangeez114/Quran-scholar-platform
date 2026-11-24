#!/usr/bin/env python3
"""Check staged Q09 row pairing and guardrails; this script never connects to Supabase."""
import json
from pathlib import Path

p = Path(__file__).resolve().parents[1] / "data/tafsir/staging/qurtubi-108-q09-live-boundary-review-2026-11-23.json"
d = json.loads(p.read_text(encoding="utf-8"))
assert d["canonical_inventory"]["canonical_id"] == "108-Q09"
assert d["canonical_inventory"]["canonical_total"] == 23
assert d["canonical_inventory"]["no_new_claim_created"] is True
assert d["live_rows"]["arabic"]["id"] == 13241
assert d["live_rows"]["english"]["id"] == 38032
assert d["live_rows"]["arabic"]["sha256"] == "296826ec28cd8b240a23ad8d55401e858d2c8a295f98baa7181307df63e344f2"
assert d["live_rows"]["english"]["sha256"] == "1d749b4e63e92b9af87288d55de656e21b16e2efbd30930d53308945fd13cf91"
assert d["assessment"]["human_scholarly_review"] == "pending"
assert "do not infer a transmission chain" in d["assessment"]["oral_chain"]
s = d["status_ledger"]
assert s["database_written"] is False and s["plan_changed"] is False and s["assembly_changed"] is False
assert s["qurtubi_holds_cleared"] == 0 and s["active_holds_all_scholars"] == 48
assert s["published_claims"] == 0 and s["chapter_complete"] is False and s["ui_validated"] is False
print("PASS: Q09 Arabic-English boundary evidence and hold/publication safeguards are consistent.")

#!/usr/bin/env python3
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "data/tafsir/staging/qurtubi-108-q10b-sanbur-polysemy-english-absence-review-2026-11-21.json"
d = json.loads(PATH.read_text(encoding="utf-8"))

assert d["claim_id"] == "108-Q10B-R01"
assert d["preflight"]["november_11_baseline"] == {
    "source_level_claims": 74, "active_holds": 48, "qurtubi_claims": 23
}
assert d["preflight"]["holds_cleared"] == 0
assert len(d["preflight"]["qurtubi_holds"]) == 8
assert d["live_read_only"]["database_writes"] == 0
assert d["live_read_only"]["arabic"]["source_url_kind"] == "legacy_numeric_source_identifier_not_url"
assert d["live_read_only"]["english"]["marker_positions_1_based"] == {
    "sanbur": 0, "sunbur": 0, "cistern": 0, "water-skin": 0
}
span = d["controlling_arabic_span"]["text"]
assert len(span) == 341
assert hashlib.sha256(span.encode()).hexdigest() == d["live_read_only"]["arabic"]["span_sha256"]
for reading in d["controlling_arabic_span"]["atomic_readings"]:
    assert reading["route_claimed"] is False
for reading in d["controlling_arabic_span"]["atomic_readings"][2:4]:
    anchor = reading["arabic_anchor"]
    assert anchor in span
    assert hashlib.sha256(anchor.encode()).hexdigest() == reading["anchor_sha256"]
terminal = d["controlling_arabic_span"]["terminal_attribution"]
assert terminal["arabic_anchor"] in span
assert hashlib.sha256(terminal["arabic_anchor"].encode()).hexdigest() == terminal["anchor_sha256"]
assert d["fidelity_findings"]["english_corresponding_block_present"] is False
assert d["fidelity_findings"]["translation_drafted"] is False
assert d["status_ledger"]["published"] is False
assert d["status_ledger"]["database_changed"] is False
assert d["status_ledger"]["ui_validated"] is False
assert d["status_ledger"]["chapter_complete"] is False
assert len(d["source_witnesses"]) >= 4
print("PASS qurtubi-108-q10b: 341-char Arabic block, source roles, English absence, and all holds preserved")

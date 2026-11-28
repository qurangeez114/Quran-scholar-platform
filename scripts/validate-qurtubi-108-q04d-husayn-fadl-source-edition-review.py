#!/usr/bin/env python3
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "data/tafsir/staging/qurtubi-108-q04d-husayn-fadl-source-edition-review-2026-11-21.json"
d = json.loads(PATH.read_text(encoding="utf-8"))

assert d["claim_id"] == "108-Q04D"
assert len(d["reconciliation"]["original_qurtubi_claim_ids"]) == 23
assert len(set(d["reconciliation"]["original_qurtubi_claim_ids"])) == 23
assert "108-Q04D" not in d["reconciliation"]["claims_with_current_pr_source_review_artifacts_before_this_step"]
assert len(d["reconciliation"]["remaining_without_current_pr_claim_specific_review_after_this_step"]) == 9
assert d["run_preflight"]["november_11_inventory"] == {
    "source_level_claims": 74,
    "active_chapter_holds": 48,
    "qurtubi_claims": 23,
    "qurtubi_active_holds": 8,
}
assert d["live_read_only"]["database_writes"] == 0
assert d["live_read_only"]["arabic"]["source_url_kind"] == "legacy_numeric_source_identifier_not_url"
assert all(v == 0 for v in d["live_read_only"]["english"]["marker_positions_1_based"].values())
e = d["exact_arabic_evidence"]
assert len(e["text"]) == e["chars"] == 59
assert hashlib.sha256(e["text"].encode()).hexdigest() == e["sha256"]
assert d["voice_and_attribution"]["oral_transmission_chain_present"] is False
assert d["voice_and_attribution"]["qurtubi_preference"].startswith("not this view")
assert d["edition_findings"]["stored_reading"] != d["edition_findings"]["attested_variant"]
assert d["edition_findings"]["silent_assimilation_permitted"] is False
assert len(d["active_holds"]) == 8 and d["holds_cleared"] == 0
for k in ("published","database_changed","ui_validated","claim_complete","scholar_complete","chapter_complete"):
    assert d["status_ledger"][k] is False
assert d["next_target"]["claim_id"] == "108-Q04F"
print("PASS qurtubi-108-q04d: exact span, named voice, edition variance, English absence, and holds preserved")

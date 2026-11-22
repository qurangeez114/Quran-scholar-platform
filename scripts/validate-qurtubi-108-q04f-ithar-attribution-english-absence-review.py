#!/usr/bin/env python3
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
p = ROOT / "data/tafsir/staging/qurtubi-108-q04f-ithar-attribution-english-absence-review-2026-11-21.json"
d = json.loads(p.read_text(encoding="utf-8"))
assert d["claim_id"] == "108-Q04F"
assert d["preflight"]["november_11_inventory"] == {
    "source_level_claims": 74, "active_chapter_holds": 48,
    "qurtubi_claims": 23, "qurtubi_active_holds": 8
}
assert d["preflight"]["holds_cleared"] == 0
assert d["preflight"]["live_writes"] == 0
assert d["preflight"]["tafsir_accuracy_analysis_matching_rows"] == 0
assert d["live_read_only"]["arabic"]["source_url_kind"] == "legacy_numeric_source_identifier_not_url"
assert all(n == 0 for n in d["live_read_only"]["english"]["marker_positions_1_based"].values())
s = d["exact_arabic_span"]["text"]
assert len(s) == d["exact_arabic_span"]["chars"] == 37
assert hashlib.sha256(s.encode()).hexdigest() == d["exact_arabic_span"]["sha256"]
assert "قاله ابن كيسان" in s
assert d["translation_and_scope"]["stored_english_has_corresponding_meaning"] is False
assert d["translation_and_scope"]["translation_is_not_stored_or_approved"] is False
assert d["translation_and_scope"]["own_position"] == "reported_only; not Qurṭubī's specific preferred view"
assert d["voice_classification"]["isnad_or_oral_route_present"] is False
assert d["voice_classification"]["historical_identity_of_ibn_kaysan_resolved"] is False
assert len(d["edition_and_parallel_witnesses"]) == 4
assert len(d["active_holds"]) == 8
for key in ("published","database_changed","ui_validated","claim_complete","scholar_complete","chapter_complete"):
    assert d["status_ledger"][key] is False
assert d["next_target"]["publication_action"] is False
print("PASS qurtubi-108-q04f: exact attribution, absence, and no-route/no-publication boundaries preserved")

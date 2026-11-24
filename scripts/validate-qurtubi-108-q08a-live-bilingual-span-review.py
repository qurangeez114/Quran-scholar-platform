#!/usr/bin/env python3
"""Consistency checks for the staged Qurtubi 108:3 Q08A review; no database access."""
from __future__ import annotations

import json
from pathlib import Path

ARTIFACT = Path(__file__).resolve().parents[1] / "data/tafsir/staging/qurtubi-108-q08a-live-bilingual-span-review-2026-11-23.json"


def main() -> None:
    data = json.loads(ARTIFACT.read_text(encoding="utf-8"))
    assert data["schema_version"] == "quranhikma-tafsir-qurtubi-108-q08a-live-bilingual-span-review-v1"
    assert data["source_plan"]["canonical_claim_id"] == "108-Q08A"
    assert data["source_plan"]["canonical_total"] == 23
    rows = {row["entry_id"]: row for row in data["live_read_only"]["rows"]}
    assert rows[13241]["language"] == "ar" and rows[13241]["sura"] == 108 and rows[13241]["aya"] == 3
    assert rows[38032]["language"] == "en" and rows[38032]["sura"] == 108 and rows[38032]["aya"] == 3
    assert rows[13241]["sha256"] == data["source_plan"]["expected_sha256_ar"]
    assert rows[38032]["sha256"] == data["source_plan"]["expected_sha256_en"]
    assert data["live_read_only"]["tafsir_accuracy_analysis_query"]["rows_returned"] == 0
    ledger = data["status_ledger"]
    assert ledger["independent_scholarly_review"] == "pending"
    assert ledger["database_written"] is False
    assert ledger["canonical_plan_changed"] is False
    assert ledger["assembly_changed"] is False
    assert ledger["qurtubi_holds_cleared"] == 0
    assert ledger["active_holds_all_scholars"] == 48
    assert ledger["published_claims"] == 0
    assert ledger["chapter_complete"] is False
    assert ledger["ui_validated"] is False
    print("PASS: Q08A row/hash pairing and staged-vs-published guardrails are consistent.")


if __name__ == "__main__":
    main()

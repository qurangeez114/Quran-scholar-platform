#!/usr/bin/env python3
"""Validate the staged-only Qurtubi 108:1 Q04K attribution review."""
import json
import sys
from pathlib import Path

DEFAULT = Path("data/tafsir/staging/qurtubi-108-q04k-hilal-ibn-yasaf-named-attribution-review-2026-11-21.json")


def require(ok: bool, message: str) -> None:
    if not ok:
        raise SystemExit(f"FAIL: {message}")


def main() -> None:
    data = json.loads((Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT).read_text(encoding="utf-8"))
    require(data["project"] == "QuranHikma" and data["supabase_project_id"] == "ylosytbxpzxzwfzjpaej", "wrong project")
    require(data["claim_id"] == "108-Q04K" and data["surah"] == 108 and data["ayah"] == 1, "wrong claim target")
    require(data["preflight"]["pull_request"] == 470 and data["preflight"]["draft"] is True, "draft PR context missing")
    require(data["inventory_boundary"]["six_scholar_source_claims"] == 74 and data["inventory_boundary"]["active_chapter_holds"] == 48, "baseline changed")
    require(data["inventory_boundary"]["holds_cleared"] == 0 and data["inventory_boundary"]["chapter_complete"] is False, "hold/closure boundary violated")
    live = data["live_read_only_recheck"]
    ar, en = live["arabic_entry"], live["english_entry"]
    require(ar["id"] == 13239 and ar["language"] == "ar" and "قال هلال بن يساف" in ar["exact_anchor"], "Arabic attribution anchor missing")
    require(ar["source_url_value"] == "671" and ar["source_url_kind"] == "legacy_numeric_source_identifier_not_url", "legacy ID misrepresented")
    require(en["id"] == 38030 and en["language"] == "en" and en["coverage_finding"].startswith("The English row ends after the first and second interpretations"), "English omission boundary missing")
    require(all(en["phrase_searches"].get(term) == 0 for term in ("Hilal ibn Yasaf", "thirteenth")), "English absence checks changed")
    finding = data["review_findings"]
    require("explicitly reports" in finding["attribution_type"] and "does not provide a transmission chain" in finding["direct_attribution_vs_chain"], "named-report/no-chain distinction missing")
    require(finding["historical_authenticity_assessed"] is False, "historical authenticity out of scope")
    actions = data["action_ledger"]
    require(actions["staged_in_draft_pr"] and actions["source_reviewed"] and not actions["human_reviewed"], "review status misrepresented")
    require(not actions["sql_executed"] and not actions["database_written"] and not actions["merge_performed"] and not actions["deployment_performed"], "live action recorded")
    require(actions["ui_validation"] == "not_performed_no_publication", "UI status misrepresented")
    require(data["next_target"]["claim_id"] == "108-Q04L", "next claim changed")
    print("PASS: Q04K named attribution and translation absence are source-anchored; no chain, publication, or hold clearance is asserted.")


if __name__ == "__main__":
    main()

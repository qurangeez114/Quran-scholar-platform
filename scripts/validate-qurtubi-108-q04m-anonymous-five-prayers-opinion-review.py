#!/usr/bin/env python3
"""Validate the staged-only Qurtubi 108:1 Q04M source review."""
import json
import sys
from pathlib import Path

DEFAULT = Path("data/tafsir/staging/qurtubi-108-q04m-anonymous-five-prayers-opinion-review-2026-11-21.json")


def require(ok: bool, message: str) -> None:
    if not ok:
        raise SystemExit(f"FAIL: {message}")


def main() -> None:
    data = json.loads((Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT).read_text(encoding="utf-8"))
    require(data["project"] == "QuranHikma" and data["supabase_project_id"] == "ylosytbxpzxzwfzjpaej", "wrong project")
    require(data["claim_id"] == "108-Q04M" and data["surah"] == 108 and data["ayah"] == 1, "wrong claim target")
    require(data["preflight"]["pull_request"] == 470 and data["preflight"]["draft"] is True, "draft PR context missing")
    boundary = data["inventory_boundary"]
    require(boundary["six_scholar_source_claims"] == 74 and boundary["active_chapter_holds"] == 48, "baseline changed")
    require(boundary["holds_cleared_by_this_review"] == 0 and not boundary["chapter_complete"], "hold/closure boundary violated")
    live = data["live_read_only_recheck"]
    ar, en = live["arabic"], live["english"]
    require(ar["id"] == 13239 and ar["md5"] == "d813e9174d86a6f60a76cb2d88d67a0c", "Arabic witness changed")
    require(ar["q04m_phrase"] == "الصلوات الخمس" and ar["fifteenth_item_marker_position_1_based"] == 2760, "Arabic item anchor missing")
    require(en["id"] == 38030 and en["md5"] == "a2ed72b9348cbf3c4fbcfff5e7567bb7", "English witness changed")
    require(all(en["phrase_searches"].get(term) == 0 for term in ("five prayers", "five daily prayers", "fifteenth")), "English absence checks changed")
    finding = data["review_findings"]
    require(finding["attribution_class"] == "anonymous_reported_opinion" and finding["speaker_identified"] is False, "anonymous attribution boundary changed")
    require(finding["transmission_chain_attested_in_clause"] is False and finding["historical_authenticity_assessed"] is False, "unsupported route/authenticity claim")
    require("Q04L is the preceding" in finding["separation_from_q04l"], "Q04L/Q04M distinction lost")
    actions = data["action_ledger"]
    require(actions["staged_in_draft_pr"] and actions["source_reviewed"] and not actions["human_reviewed"], "review status misrepresented")
    require(not actions["sql_executed"] and not actions["database_written"] and not actions["merge_performed"] and not actions["deployment_performed"], "live action recorded")
    require(data["next_target"]["claim_id"] == "108-Q04N", "next target changed")
    print("PASS: Q04M anonymous prayer opinion is source-anchored and kept distinct from Q04L; no route, publication, or hold clearance is asserted.")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Validate the staged-only Qurtubi 108:1 Q04N voice-boundary review."""
import json
import sys
from pathlib import Path

DEFAULT = Path("data/tafsir/staging/qurtubi-108-q04n-ibn-ishaq-reported-gloss-voice-boundary-review-2026-11-21.json")


def require(ok: bool, message: str) -> None:
    if not ok:
        raise SystemExit(f"FAIL: {message}")


def main() -> None:
    data = json.loads((Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT).read_text(encoding="utf-8"))
    require(data["project"] == "QuranHikma" and data["supabase_project_id"] == "ylosytbxpzxzwfzjpaej", "wrong project")
    require(data["claim_id"] == "108-Q04N" and data["surah"] == 108 and data["ayah"] == 1, "wrong target")
    require(data["preflight"]["pull_request"] == 470 and data["preflight"]["draft"] is True, "draft PR context missing")
    boundary = data["inventory_boundary"]
    require(boundary["six_scholar_source_claims"] == 74 and boundary["active_chapter_holds"] == 48, "baseline changed")
    require(boundary["holds_cleared_by_this_review"] == 0 and not boundary["chapter_complete"], "hold/closure boundary violated")
    live = data["live_read_only_recheck"]
    ar, en = live["arabic"], live["english"]
    require(ar["id"] == 13239 and ar["md5"] == "d813e9174d86a6f60a76cb2d88d67a0c", "Arabic witness changed")
    require("وقال ابن إسحاق" in ar["ibn_ishaq_clause"] and "هو العظيم من الأمر" in ar["ibn_ishaq_clause"], "named reporter span missing")
    require(en["id"] == 38030 and en["md5"] == "a2ed72b9348cbf3c4fbcfff5e7567bb7", "English witness changed")
    require(all(en["phrase_searches"].get(term) == 0 for term in ("Ibn Ishaq", "great matter", "Labid")), "English absence checks changed")
    finding = data["review_findings"]
    require(finding["speaker_for_gloss"] == "Ibn Ishaq, as explicitly named by qāla in the text", "reporter boundary changed")
    require("not elevated into an independent-source claim" in finding["poem_boundary"], "poem attribution overclaimed")
    require(not finding["transmission_chain_attested_in_clause"] and not finding["historical_authenticity_assessed"], "unsupported chain/authenticity claim")
    actions = data["action_ledger"]
    require(actions["staged_in_draft_pr"] and actions["source_reviewed"] and not actions["human_reviewed"], "review status misrepresented")
    require(not actions["sql_executed"] and not actions["database_written"] and not actions["merge_performed"] and not actions["deployment_performed"], "live action recorded")
    require(data["next_target"]["claim_id"] == "108-Q04O", "next target changed")
    print("PASS: Q04N Ibn Ishaq reporting and Labid quotation boundaries are source-anchored; no chain, authentication, publication, or hold clearance is asserted.")


if __name__ == "__main__":
    main()

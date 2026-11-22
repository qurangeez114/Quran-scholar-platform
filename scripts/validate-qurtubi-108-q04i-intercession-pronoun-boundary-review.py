#!/usr/bin/env python3
"""Validate the staged, non-publishing Qurtubi 108:1 Q04I review ledger."""
import json
import sys
from pathlib import Path


DEFAULT = Path("data/tafsir/staging/qurtubi-108-q04i-intercession-pronoun-boundary-review-2026-11-21.json")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"FAIL: {message}")


def main() -> None:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT
    data = json.loads(path.read_text(encoding="utf-8"))
    require(data["project"] == "QuranHikma", "project scope changed")
    require(data["supabase_project_id"] == "ylosytbxpzxzwfzjpaej", "wrong Supabase project")
    require(data["claim_id"] == "108-Q04I" and data["surah"] == 108 and data["ayah"] == 1, "wrong claim target")
    require(data["preflight"]["pr_number"] == 470 and data["preflight"]["parent_head_draft"] is True, "draft review context missing")
    require(data["preflight"]["open_surah_108_tafsir_prs"] == [470], "competing PR inventory changed")
    require(data["inventory_boundary"]["six_scholar_source_claims"] == 74, "baseline claim count changed")
    require(data["inventory_boundary"]["active_chapter_holds"] == 48, "chapter hold count changed")
    require(data["inventory_boundary"]["holds_cleared"] == 0 and data["inventory_boundary"]["chapter_complete"] is False, "review must not clear holds or complete chapter")
    live = data["live_read_only_recheck"]
    ar = live["arabic_entry"]
    en = live["english_entry"]
    require(ar["id"] == 13239 and ar["language"] == "ar", "Arabic row mapping changed")
    require(en["id"] == 38030 and en["language"] == "en", "English witness mapping changed")
    require(ar["source_url_value"] == "671" and ar["source_url_kind"] == "legacy_numeric_source_identifier_not_url", "legacy source identifier misrepresented")
    require(ar["claim_span"] == "وعنه : هو الشفاعة ; وهو الحادي عشر", "Q04I anchor changed")
    require("العاشر" in ar["preceding_and_following_context"] and "الثاني عشر" in ar["preceding_and_following_context"], "neighboring interpretation boundaries missing")
    require(en["coverage_finding"].startswith("Stored English text ends after the first and second interpretations"), "English omission boundary missing")
    require(all(en["exact_phrase_searches"].get(k) == 0 for k in ("intercession", "eleventh", "wa-anhu")), "English absence checks changed")
    findings = data["review_findings"]
    require(findings["antecedent_of_wa_anhu"] == "unresolved_in_examined_source_text", "do not resolve the pronoun by inference")
    require(findings["named_authority"] is None and findings["historical_reporter"] is None, "do not invent an authority")
    require(findings["transmission_route"].startswith("none stated"), "do not infer a transmission route")
    require(findings["historical_authenticity_assessed"] is False, "historical authenticity is out of scope")
    require(data["next_target"]["claim_id"] == "108-Q04K", "next bounded claim changed")
    actions = data["action_ledger"]
    require(actions["staged_in_draft_pr"] is True and actions["source_reviewed"] is True, "staging or review status missing")
    require(actions["human_reviewed"] is False and actions["database_written"] is False, "human/live status misrepresented")
    require(actions["sql_executed"] is False and actions["merge_performed"] is False and actions["deployment_performed"] is False, "forbidden action recorded")
    require(actions["ui_validation"] == "not_performed_no_publication", "UI status misrepresented")
    print("PASS: Q04I semantic content is anchored; pronoun, reporting authority, translation gap, and 74/48 hold boundaries remain explicit.")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Validate the staged, non-publishing Qurtubi 108:1 Q04H review ledger."""
import json
import sys
from pathlib import Path


DEFAULT = Path("data/tafsir/staging/qurtubi-108-q04h-unnamed-opinion-attribution-boundary-review-2026-11-21.json")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"FAIL: {message}")


def main() -> None:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT
    data = json.loads(path.read_text(encoding="utf-8"))
    require(data["project"] == "QuranHikma", "project scope changed")
    require(data["supabase_project_id"] == "ylosytbxpzxzwfzjpaej", "wrong Supabase project")
    require(data["claim_id"] == "108-Q04H" and data["surah"] == 108 and data["ayah"] == 1, "wrong claim target")
    require(data["inventory_boundary"]["six_scholar_source_claims"] == 74, "baseline claim count changed")
    require(data["inventory_boundary"]["active_chapter_holds"] == 48, "chapter hold count changed")
    require(data["inventory_boundary"]["holds_cleared"] == 0, "review must not clear holds")
    require(data["inventory_boundary"]["chapter_complete"] is False, "chapter cannot be marked complete")
    live = data["live_read_only_recheck"]
    ar = live["arabic_entry"]
    en = live["english_entry"]
    require(ar["id"] == 13239 and ar["language"] == "ar", "Arabic row mapping changed")
    require(en["id"] == 38030 and en["language"] == "en", "English witness mapping changed")
    require(ar["source_url_value"] == "671" and ar["source_url_kind"] == "legacy_numeric_source_identifier_not_url", "legacy source locator was misrepresented")
    require("العاشر" in ar["evidence_anchor_ar"] and "نور في قلبك" in ar["evidence_anchor_ar"], "Q04H source anchor missing")
    require(ar["claim_anchor_position_1_based"] == 2463, "live anchor locator changed")
    require("وعنه" in ar["surrounding_context"] and "الحادي عشر" in ar["surrounding_context"], "adjacent Q04I boundary missing")
    require(en["coverage_finding"].startswith("The fetched English row ends after discussion of the first and second interpretations"), "English abridgment boundary missing")
    require(all(en["exact_phrase_searches"].get(k) == 0 for k in ("light in your heart", "cuts you off", "all besides")), "English absence checks changed")
    findings = data["review_findings"]
    require(findings["originating_speaker"] == "not_named_in_the_tenth_item", "do not invent a speaker")
    require(findings["adjacent_eleventh_item"]["antecedent"] == "unresolved", "do not resolve the adjacent pronoun by inference")
    require(findings["transmission_route"] == "none stated for Q04H; no isnad or oral route inferred", "do not invent a transmission route")
    require(findings["qurtubi_preference"].startswith("At the end of the list Qurtubi explicitly calls the first and second views the soundest"), "authorial preference boundary missing")
    ledger = data["action_ledger"]
    require(ledger["staged_in_draft_pr"] is True and ledger["source_reviewed"] is True, "staging/review status missing")
    require(ledger["human_reviewed"] is False and ledger["database_written"] is False, "human/live status misrepresented")
    require(ledger["sql_executed"] is False and ledger["merge_performed"] is False and ledger["deployment_performed"] is False, "forbidden action recorded")
    require(ledger["ui_validation"] == "not_performed_no_publication", "UI status misrepresented")
    require(data["next_target"]["claim_id"] == "108-Q04I", "next bounded target changed")
    print("PASS: Q04H attribution/coverage review is source-anchored, staged-only, non-publishing, and preserves 74 claims / 48 holds.")


if __name__ == "__main__":
    main()

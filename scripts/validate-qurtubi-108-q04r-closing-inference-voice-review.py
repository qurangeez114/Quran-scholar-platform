#!/usr/bin/env python3
"""Validate a staged-only Qurtubi 108:1 Q04R closing-voice review."""
import json
import sys
from pathlib import Path

DEFAULT = Path("data/tafsir/staging/qurtubi-108-q04r-closing-inference-voice-review-2026-11-22.json")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"FAIL: {message}")


def main() -> None:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT
    data = json.loads(path.read_text(encoding="utf-8"))
    require(data["project"] == "QuranHikma" and data["supabase_project_id"] == "ylosytbxpzxzwfzjpaej", "wrong project")
    require(data["claim_id"] == "108-Q04R" and (data["surah"], data["ayah"]) == (108, 1), "wrong target")
    pre = data["repository_preflight"]
    require(pre["pr_470_state"] == "open_draft_unmerged" and pre["duplicate_q04r_checkpoint_found"] is False, "PR or duplication boundary changed")
    baseline = data["inventory_boundary"]
    require(baseline["six_scholar_source_claims"] == 74 and baseline["active_chapter_holds_before"] == baseline["active_chapter_holds_after"] == 48, "baseline changed")
    require(baseline["qurtubi_holds_cleared"] == 0 and baseline["claims_marked_published"] == 0 and not baseline["chapter_complete"], "hold/publication boundary violated")
    live = data["live_read_only_recheck"]
    require(live["read_only"] and live["write_statements_executed"] == 0 and live["analysis_rows_for_surah_108"] == 0, "live read-only boundary violated")
    ar = live["arabic"]
    require(ar["id"] == 13239 and ar["row_md5"] == "d813e9174d86a6f60a76cb2d88d67a0c" and ar["source_url_value"] == "671", "Arabic row identity/hash changed")
    span = ar["closing_span"]
    require((span["start"], span["end"], span["chars"]) == (3257, 3384, 127), "closing span boundaries changed")
    require(span["md5"] == "d78a18432e94e1dcd39494b130ed6320" and span["occurrences"] == 1, "closing span fingerprint changed")
    en = live["english"]
    require(en["id"] == 38030 and en["row_md5"] == "a2ed72b9348cbf3c4fbcfff5e7567bb7" and en["conclusion_present"] is False, "English row identity/coverage changed")
    voice = data["voice_and_scope_findings"]
    require(voice["speaker"] == "al-Qurtubi's authorial closing prose", "author voice boundary changed")
    require(voice["closing_prose_is_poem"] is False and voice["closing_prose_is_part_of_anas_quote"] is False, "adjacent voices conflated")
    require(voice["translation_wording_inferred"] is False and voice["historical_or_hadith_authenticity_assessed"] is False, "unsupported interpretive/authenticity claim introduced")
    fidelity = data["fidelity_findings"]
    require(fidelity["classification"] == "arabic_authorial_closing_span_absent_from_stored_english_row", "coverage classification changed")
    require(fidelity["translation_error_established"] is False and fidelity["abridgment_or_intended_scope_resolved"] is False, "omission overstated")
    actions = data["review_and_action"]
    require(actions["human_scholarly_review"] == "pending" and not actions["sql_executed"] and not actions["database_written"] and not actions["merge_performed"] and not actions["deployment_performed"], "review/publication state misrepresented")
    require(data["next_target"]["claim_id"] == "108-Q04S", "next target missing")
    print("PASS: Q04R keeps Qurtubi's closing prose separate from the anonymous poem and Anas report; English absence remains a coverage hold, not a proven translation error.")
    

if __name__ == "__main__":
    main()

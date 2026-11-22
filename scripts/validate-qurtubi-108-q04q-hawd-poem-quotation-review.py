#!/usr/bin/env python3
"""Validate a staged-only Qurtubi 108:1 Q04Q anonymous-poem review."""
import json
import sys
from pathlib import Path

DEFAULT = Path("data/tafsir/staging/qurtubi-108-q04q-hawd-poem-quotation-review-2026-11-22.json")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"FAIL: {message}")


def main() -> None:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT
    data = json.loads(path.read_text(encoding="utf-8"))
    require(data["project"] == "QuranHikma" and data["supabase_project_id"] == "ylosytbxpzxzwfzjpaej", "wrong project")
    require(data["claim_id"] == "108-Q04Q" and (data["surah"], data["ayah"]) == (108, 1), "wrong target")
    pre = data["repository_preflight"]
    require(pre["latest_main_sha"] == "0b4d5d6889b852a8408dd5dd9adc705295dcb99e", "main preflight missing")
    require(pre["pr_470_state"] == "open_draft_unmerged" and pre["duplicate_q04q_checkpoint_found"] is False, "PR or duplicate boundary changed")
    baseline = data["inventory_boundary"]
    require(baseline["six_scholar_source_claims"] == 74 and baseline["active_chapter_holds_before"] == baseline["active_chapter_holds_after"] == 48, "baseline changed")
    require(baseline["qurtubi_holds_cleared"] == 0 and baseline["claims_marked_published"] == 0 and not baseline["chapter_complete"], "hold/publication boundary violated")
    live = data["live_read_only_recheck"]
    require(live["read_only"] and live["write_statements_executed"] == 0 and live["analysis_rows_for_surah_108"] == 0, "live read-only boundary violated")
    ar = live["arabic"]
    require(ar["id"] == 13239 and ar["row_md5"] == "d813e9174d86a6f60a76cb2d88d67a0c" and ar["source_url_value"] == "671", "Arabic witness changed")
    span = ar["poem_span"]
    require((span["start"], span["end"], span["chars"]) == (3208, 3257, 49), "poem boundaries changed")
    require(span["md5"] == "13c6970fa763843340b483c0bad8ccde" and span["occurrences"] == 1, "poem span fingerprint changed")
    en = live["english"]
    require(en["id"] == 38030 and en["row_md5"] == "a2ed72b9348cbf3c4fbcfff5e7567bb7" and en["poem_anchor_occurrences"] == 0, "English witness/omission changed")
    attr = data["attribution_findings"]
    require(attr["poet_named_in_stored_arabic_row"] is False and attr["poem_attributed_to_anAS".lower()] is False, "unsupported attribution added")
    require(attr["attribution_invented"] is False, "poet attribution invented")
    fidelity = data["fidelity_findings"]
    require(fidelity["classification"] == "source_span_absent_from_stored_english_row", "omission classification changed")
    require(fidelity["translation_error_established"] is False and fidelity["abridgment_or_intended_scope_resolved"] is False, "omission overstated")
    actions = data["review_and_action"]
    require(actions["human_scholarly_review"] == "pending" and not actions["sql_executed"] and not actions["database_written"] and not actions["merge_performed"] and not actions["deployment_performed"], "review/publication state misrepresented")
    require(data["next_target"]["claim_id"] == "108-Q04R", "next target missing")
    print("PASS: Q04Q preserves the anonymous-poet attribution and English-row omission boundary; no live change, publication, or hold clearance is asserted.")


if __name__ == "__main__":
    main()

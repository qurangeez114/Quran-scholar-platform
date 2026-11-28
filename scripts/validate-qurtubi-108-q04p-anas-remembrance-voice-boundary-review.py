#!/usr/bin/env python3
"""Validate a staged-only Qurtubi 108:1 Q04P source-boundary checkpoint."""
import json
import sys
from pathlib import Path

DEFAULT = Path("data/tafsir/staging/qurtubi-108-q04p-anas-remembrance-voice-boundary-review-2026-11-22.json")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"FAIL: {message}")


def main() -> None:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT
    data = json.loads(path.read_text(encoding="utf-8"))
    require(data["project"] == "QuranHikma" and data["supabase_project_id"] == "ylosytbxpzxzwfzjpaej", "wrong project")
    require(data["claim_id"] == "108-Q04P" and (data["surah"], data["ayah"]) == (108, 1), "wrong target")
    pr = data["pr"]
    require(pr["number"] == 470 and pr["draft"] and pr["open"] and not pr["merged"], "draft PR state boundary violated")
    baseline = data["inventory_boundary"]
    require(baseline["six_scholar_source_claims"] == 74, "74-claim baseline changed")
    require(baseline["active_chapter_holds_before"] == baseline["active_chapter_holds_after"] == 48, "hold count changed")
    require(baseline["qurtubi_holds_cleared"] == baseline["claims_marked_published"] == 0, "hold or publication falsely cleared")
    live = data["live_read_only_recheck"]
    require(live["read_only"] and live["write_statements_executed"] == 0, "must remain read-only")
    ar = live["arabic"]
    require(ar["id"] == 13239 and ar["row_md5"] == "d813e9174d86a6f60a76cb2d88d67a0c", "Arabic live row identity/hash changed")
    span = ar["target_span"]
    require((span["start"], span["end"], span["chars"]) == (2993, 3186, 193), "Arabic span boundaries changed")
    require(span["md5"] == "77710ec477919978c073c9d8211decd8", "Arabic span hash changed")
    require(span["start_anchor"] == "وسمع أنس قوما يتذاكرون الحوض فقال", "reporter/speaker anchor missing")
    require(span["end_anchor"] == "وفي حوضه يقول الشاعر", "quote boundary missing")
    en = live["english"]
    require(en["id"] == 38030 and en["row_md5"] == "a2ed72b9348cbf3c4fbcfff5e7567bb7", "English live row identity/hash changed")
    require(en["later_anas_passage_present"] is False and en["same_row_authorial_preference_phrase_present"] is False, "English omission status changed")
    findings = data["voice_and_provenance_findings"]
    require(findings["quoted_speaker"].startswith("Anas"), "speaker attribution changed")
    require(findings["oral_transmission_chain_attested_in_this_sentence"] is False, "unsupported chain attribution introduced")
    require(findings["authentication_language_attached_to_this_sentence"] is False, "unsupported authentication claim introduced")
    require(findings["chain_or_hadith_grade_inferred"] is False, "hadith grade inferred")
    fidelity = data["fidelity_findings"]
    require(fidelity["classification"] == "later_arabic_source_span_absent_from_stored_english_row", "omission classification changed")
    require(fidelity["translation_error_established"] is False and fidelity["abridgment_or_intended_scope_resolved"] is False, "omission overstated")
    review = data["review_and_action"]
    require(review["human_editor_approval"] == "pending", "human review misrepresented")
    require(not review["sql_executed"] and not review["database_written"] and not review["merge_performed"] and not review["deployment_performed"], "live action falsely recorded")
    require(data["next_target"]["claim_id"] == "108-Q04Q", "next bounded target missing")
    print("PASS: Q04P is a staged voice/coverage review only; Anas's speech is distinguished from Qurtubi's frame, with no chain, grading, publication, or hold-clearance claim.")


if __name__ == "__main__":
    main()

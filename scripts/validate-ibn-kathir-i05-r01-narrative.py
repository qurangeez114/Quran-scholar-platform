#!/usr/bin/env python3
"""Read-only preservation guard for the isolated R01 narrative; no integration or publication."""
import argparse, copy, hashlib, json
from pathlib import Path
F = "ibn-kathir-108-i05-r01-narrative-draft-2026-10-26.json"
EXPECTED = json.loads("{\n  \"schema_version\": \"quranhikma-i05-r01-narrative-draft-v1\",\n  \"at\": \"2026-10-26T16:58:00-07:00\",\n  \"surah\": 108,\n  \"coverage_key\": \"108-I05-R01\",\n  \"status\": \"isolated_narrative_draft_pending_validation\",\n  \"basis\": {\n    \"review_file\": \"ibn-kathir-108-i05-r01-revelation-setting-review-2026-10-26.json\",\n    \"review_blob_sha\": \"b918095874966252c5782dacbb9460ee47573f8c\",\n    \"catalog_file\": \"claim-type-full-catalog-review-2026-10-26.json\",\n    \"catalog_blob_sha\": \"0197b31331cf855e4f0e855c433bbd9470df7bce\"\n  },\n  \"candidate\": {\n    \"propositions\": [\n      {\n        \"staging_key\": \"108-I05-R01-NARR-P\",\n        \"claim_type_id\": 16,\n        \"statement_en\": \"In the report attributed through the printed chain to Ali ibn Abi Talib, the subsequent exchange is situated when this surah was revealed to Muhammad; the passage quotes 108:1–2.\",\n        \"source_type\": \"tafsir_entry\",\n        \"tafsir_entry_id\": 48458,\n        \"speaker_type\": \"companion\",\n        \"speaker_name\": \"Ali ibn Abi Talib\",\n        \"assertion_mode\": \"explicit\",\n        \"status\": \"active\",\n        \"mufassir_own_position\": \"reported_only\",\n        \"verification_state\": \"source_language_located\",\n        \"extraction_validity\": \"pending_source_verification\",\n        \"attribution_fidelity\": \"accurate_paraphrase\",\n        \"quranic_textual_support\": \"not_stated\",\n        \"normative_polarity\": null,\n        \"scope_generality\": \"specific_instance\",\n        \"extracted_by\": \"work-surah108-v1:i05-r01-narrative-draft\"\n      }\n    ],\n    \"voices\": [\n      {\n        \"proposition_ref\": \"108-I05-R01-NARR-P\",\n        \"originating_voice_type\": \"companion_report\",\n        \"originating_voice_name\": \"Ali ibn Abi Talib\",\n        \"reporting_work_id\": 2,\n        \"quoted_collection\": null\n      }\n    ],\n    \"evidence_units\": [\n      {\n        \"staging_key\": \"108-I05-R01-NARR-E\",\n        \"unit_type\": \"single_hadith_citation\",\n        \"attributed_authority_name\": \"Ali ibn Abi Talib\",\n        \"content_summary\": \"In the report attributed through the printed chain to Ali ibn Abi Talib, the subsequent exchange is situated when this surah was revealed to Muhammad; the passage quotes 108:1–2.\",\n        \"independence_state\": \"unknown\",\n        \"independence_justification\": \"Narrative frame within the same captured R01 report; no independent corroboration or authentication.\",\n        \"source_locator\": {\n          \"captured_entry_id\": 48457,\n          \"canonical_entry_id\": 48458,\n          \"start\": 14334,\n          \"end\": 14458,\n          \"text\": \"قَالَ: لَمَّا نَزَلَتْ هَذِهِ السُّورَةُ عَلَى النَّبِيِّ ﷺ: ﴿إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ فَصَلِّ لِرَبِّكَ وَانْحَرْ﴾ \",\n          \"sha256\": \"d417e66f546e9d9ff4ac6ef76f2ae2f2ce829ed2c830d268e71e70b5465f7eac\",\n          \"offsets\": \"zero-based Unicode code points, half-open, unnormalized\"\n        }\n      }\n    ],\n    \"links\": [\n      {\n        \"proposition_ref\": \"108-I05-R01-NARR-P\",\n        \"evidence_unit_ref\": \"108-I05-R01-NARR-E\",\n        \"semantic_link_note\": \"Ali's transmitted temporal framing situates the nested exchange; quoted 108:1–2 does not limit the surah to two verses or establish an independent revelation occasion.\",\n        \"linked_by\": \"work-surah108-v1:i05-r01-narrative-draft\"\n      }\n    ],\n    \"routes\": []\n  },\n  \"metadata\": {\n    \"limits\": [\n      \"Temporal narrative framing is not an independently authenticated revelation occasion.\",\n      \"No place, date, causal incident, or Makkan/Medinan classification supplied by this span.\",\n      \"The passage says this surah while quoting 108:1–2; do not claim that the surah contains only two verses.\",\n      \"No separate originating speech assigned to Muhammad or Gabriel within this framing clause.\",\n      \"Corresponding bounded English report remains absent; statement is an Arabic-based analytical paraphrase.\"\n    ],\n    \"classification_reason\": \"event_description=16 describes a narrator's account of what happened; explicit marks the narrative assertion, not historical authentication.\",\n    \"roles\": {\n      \"report_narrator\": \"Ali ibn Abi Talib\",\n      \"reported_recipient\": \"Muhammad\",\n      \"current_tafsir_author\": \"Ibn Kathir\",\n      \"reporting_authority\": \"Ibn Abi Hatim\"\n    },\n    \"english_state\": \"absent_in_corresponding_bounded_transition_per_scope_audit\",\n    \"remaining\": [\n      \"Negative validation and read-only CI\",\n      \"Coordinated integration with seven R01 propositions; existing narrative hold remains until validated integration\",\n      \"Route physical mapping unresolved\"\n    ]\n  },\n  \"database_written\": false,\n  \"publication_ready\": false,\n  \"chapter_complete\": false\n}\n")
def validate(doc):
    if doc != EXPECTED:
        raise ValueError("Reviewed narrative, attribution, evidence, limits or holds changed")
    c = doc["candidate"]
    loc = c["evidence_units"][0]["source_locator"]
    if len(loc["text"]) != loc["end"] - loc["start"]:
        raise ValueError("Unicode span length mismatch")
    if hashlib.sha256(loc["text"].encode()).hexdigest() != loc["sha256"]:
        raise ValueError("Arabic span digest mismatch")
    return True
def self_test():
    validate(EXPECTED)
    mutations = [
        ("speaker", lambda d: d["candidate"]["propositions"][0].update(speaker_name="Muhammad")),
        ("voice", lambda d: d["candidate"]["voices"][0].update(originating_voice_type="own_view")),
        ("classification", lambda d: d["candidate"]["propositions"][0].update(claim_type_id=14)),
        ("authentication", lambda d: d["candidate"]["propositions"][0].update(extraction_validity="verified")),
        ("author endorsement", lambda d: d["candidate"]["propositions"][0].update(mufassir_own_position="preferred")),
        ("scope", lambda d: d["candidate"]["propositions"][0].update(scope_generality="general_unconditional")),
        ("English overclaim", lambda d: d["candidate"]["propositions"][0].update(statement_en="This surah has only two verses and was revealed in Medina.")),
        ("Arabic", lambda d: d["candidate"]["evidence_units"][0]["source_locator"].update(text="قَالَ")),
        ("offset", lambda d: d["candidate"]["evidence_units"][0]["source_locator"].update(start=14335)),
        ("canonical entry", lambda d: d["candidate"]["propositions"][0].update(tafsir_entry_id=48457)),
        ("independence", lambda d: d["candidate"]["evidence_units"][0].update(independence_state="independence_supported")),
        ("link deletion", lambda d: d["candidate"].update(links=[])),
        ("invented route", lambda d: d["candidate"].update(routes=[{"invented": True}])),
        ("English absence", lambda d: d["metadata"].update(english_state="verified_translation")),
        ("limits deletion", lambda d: d["metadata"].update(limits=[])),
        ("hold removal", lambda d: d["metadata"].update(remaining=[])),
        ("publication", lambda d: d.update(publication_ready=True)),
        ("completion", lambda d: d.update(chapter_complete=True)),
        ("database", lambda d: d.update(database_written=True)),
    ]
    for label, mutate in mutations:
        bad = copy.deepcopy(EXPECTED)
        mutate(bad)
        try:
            validate(bad)
        except ValueError:
            continue
        raise AssertionError("Unsafe mutation accepted: " + label)
    print(f"PASS: reviewed narrative and {len(mutations)} unsafe mutations rejected")
def main():
    p = argparse.ArgumentParser()
    p.add_argument("--root", type=Path, default=Path("."))
    p.add_argument("--self-test", action="store_true")
    args = p.parse_args()
    validate(json.loads((args.root / "data/tafsir/staging" / F).read_text()))
    if args.self_test:
        self_test()
    else:
        print("PASS: isolated R01 narrative preserved; integration and route holds remain")
if __name__ == "__main__":
    main()

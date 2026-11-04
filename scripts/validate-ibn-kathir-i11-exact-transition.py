#!/usr/bin/env python3
import copy
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "data/tafsir/staging/ibn-kathir-108-i11-exact-transition-2026-11-04.json"

def digest(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()

def exact(part):
    assert part["span_codepoints"] == part["end_cp"] - part["start_cp"] == len(part["exact_text"])
    assert part["span_sha256"] == digest(part["exact_text"])

def validate(doc):
    assert doc["claim_id"] == "108-I11"
    assert doc["database_written"] is False and doc["database_write_count"] == 0
    assert doc["publication_ready"] is False and doc["chapter_complete"] is False
    assert doc["proposition_count_effect"] == 0
    assert doc["offset_contract"] == {
        "unit": "Unicode code points", "base": 0, "end": "exclusive",
        "normalization": "none", "hash_input": "exact UTF-8 bytes of the unnormalized span"
    }
    ar = doc["arabic_exact_unit"]
    exact(ar)
    assert (ar["start_cp"], ar["end_cp"], ar["span_sha256"]) == (
        18067, 18125, "84f4a92b5c9f8923122ca03296197c65e0ff155a06c13dbe7d3d5e6712b416b4")
    assert doc["claim_contract"]["voice_record_type"] == "commentator_statement"
    assert "not a quotation" in doc["claim_contract"]["research_statement_scope"]
    en = doc["english_local_transition"]
    assert en["left_boundary"]["end_cp"] == en["separator"]["start_cp"]
    assert en["separator"]["end_cp"] == en["right_boundary"]["start_cp"]
    for part in (en["separator"], en["right_boundary"], en["envelope"]): exact(part)
    assert en["separator"]["exact_text"] == " "
    assert en["right_boundary"]["exact_text"] == "As-Suddi said"
    assert "local omission only" in en["scope_limit"] and "invented English sentence" in en["scope_limit"]
    later = doc["later_english_preserved_remembrance_context"]
    exact(later)
    assert (later["start_cp"], later["end_cp"], later["span_sha256"]) == (
        8167, 8495, "31901f38c421de85b5defb8739bd41965670066376eaeed53d23ad5f407ffea7")
    assert later["relationship_to_i11"] == "distinct_later_context_not_translation_or_positive_evidence_for_i11"
    assert later["excluded_from_i11_positive_evidence"] is True
    loc = doc["source_locator_and_route_state"]
    assert (loc["volume"], loc["page"], loc["quran_locator"]) == (8, 504, "108:3")
    assert loc["voice_record_type"] == "commentator_statement"
    assert loc["evidence_plan_chain_state"] == "full_route_not_extracted"
    sep = doc["separation_contract"]
    assert len(sep["must_not_merge_with"]) == 3
    assert sep["named_occasion_reports_remain_competing"] is True
    assert sep["i11_is_authorial_generalization"] is True
    assert sep["english_omission_is_context_not_positive_evidence"] is True
    joined = " ".join(doc["explicit_absences"])
    for token in ("No local English translation", "No global", "No missing English sentence", "No transmission chain", "not merged", "No proposition"):
        assert token in joined

def main():
    doc=json.loads(PATH.read_text(encoding="utf-8"))
    validate(doc)
    mutations=[
        (("database_written",),True), (("database_write_count",),1), (("publication_ready",),True),
        (("chapter_complete",),True), (("proposition_count_effect",),1),
        (("arabic_exact_unit","start_cp"),18068), (("arabic_exact_unit","exact_text"),"changed"),
        (("english_local_transition","separator","exact_text"),"\n"),
        (("english_local_transition","right_boundary","start_cp"),7881),
        (("later_english_preserved_remembrance_context","end_cp"),8496),
        (("later_english_preserved_remembrance_context","excluded_from_i11_positive_evidence"),False),
        (("source_locator_and_route_state","page"),503),
        (("separation_contract","must_not_merge_with"),[]),
        (("separation_contract","english_omission_is_context_not_positive_evidence"),False),
    ]
    rejected=[]
    for path,value in mutations:
        bad=copy.deepcopy(doc); target=bad
        for key in path[:-1]: target=target[key]
        target[path[-1]]=value
        try: validate(bad)
        except (AssertionError,KeyError,TypeError): rejected.append(path)
    assert len(rejected)==14
    print("PASS: I11 exact transition validated; 14 unsafe mutations rejected; 0 database writes")

if __name__ == "__main__": main()

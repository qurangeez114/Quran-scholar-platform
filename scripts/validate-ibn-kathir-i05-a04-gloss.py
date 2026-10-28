#!/usr/bin/env python3
"""Read-only A04 gloss preservation; no inferred author or physical payload."""
import copy,hashlib,json
from pathlib import Path
EXPECTED=json.loads("{\n  \"schema_version\": \"quranhikma-a04-gloss-review-v1\",\n  \"at\": \"2026-10-27T17:57:00-07:00\",\n  \"surah\": 108,\n  \"coverage_key\": \"108-I05-A04\",\n  \"status\": \"unattributed_gloss_annotation_staged_voice_hold_retained\",\n  \"basis\": {\n    \"file\": \"ibn-kathir-108-i05-a04-bounded-draft-2026-10-24.json\",\n    \"blob_sha\": \"b2f15364156a6f7e4b0356266e0df4f320f222b9\"\n  },\n  \"annotation\": {\n    \"kind\": \"textual_explanation_origin_unresolved\",\n    \"source_locator\": {\n      \"key\": \"explanatory_gloss\",\n      \"start\": 15155,\n      \"end\": 15182,\n      \"text\": \"يَعْنِي بِهِ الِاعْتِدَالَ.\",\n      \"sha256\": \"be466927f4c4c2bef87c0acb5b754bae97249b79347bfaf934ea8fdb1427a0b0\",\n      \"captured_entry_id\": 48457,\n      \"canonical_entry_id\": 48458,\n      \"offsets\": \"zero-based Unicode code points, half-open, unnormalized\"\n    },\n    \"statement_en\": \"The captured passage adds an explanation referring to standing upright.\",\n    \"translation_note\": \"al-itidal is rendered as standing upright in the immediate post-bowing context; this is an analytical paraphrase, not a quotation from the bounded English entry.\",\n    \"originating_identity\": null,\n    \"originating_number\": \"not_stated\",\n    \"referent_resolution\": \"The pronoun bihi points to preceding wording; the exact referential scope is not independently resolved.\"\n  },\n  \"roles\": {\n    \"Ata_al_Khurasani\": \"Named for preceding posture interpretation; gloss authorship not separately established.\",\n    \"Ibn_Abi_Hatim\": \"Named reporting authority in following clause; not established as gloss author.\",\n    \"Ibn_Kathir\": \"Current tafsir author; placement alone does not establish gloss authorship.\"\n  },\n  \"rejected_inferences\": [\n    \"Do not assign the gloss to Ata solely because his name precedes it.\",\n    \"Do not assign it to Ibn Kathir solely because it occurs in his tafsir.\",\n    \"Do not infer a group or a complete transmission chain.\",\n    \"Do not create a second posture command from this explanatory wording.\"\n  ],\n  \"representation_decision\": \"Preserve as a standalone staging annotation linked by coverage key and exact source locator. No physical proposition/voice row proposed until attribution representation is supported; A04 complete-coverage hold remains.\",\n  \"english_state\": \"absent_in_corresponding_bounded_transition_per_scope_audit\",\n  \"next_step\": \"Validate A04 gloss annotation and attribution limits, then reconcile with existing posture proposition while preserving unresolved voice hold; continue P01 bracket provenance research.\",\n  \"database_written\": false,\n  \"publication_ready\": false,\n  \"chapter_complete\": false\n}\n")
def validate(d):
    if d!=EXPECTED:raise ValueError("Reviewed gloss or attribution limits changed")
    loc=d["annotation"]["source_locator"]
    if len(loc["text"])!=loc["end"]-loc["start"] or hashlib.sha256(loc["text"].encode()).hexdigest()!=loc["sha256"]:raise ValueError("Arabic locator")
    if d["annotation"]["originating_identity"] is not None:raise ValueError("Invented originator")
def main():
    d=json.loads(Path("data/tafsir/staging/ibn-kathir-108-i05-a04-gloss-review-2026-10-27.json").read_text());validate(d)
    cases=[]
    for name in ("Ata al-Khurasani","Ibn Kathir","Ibn Abi Hatim"):
        x=copy.deepcopy(d);x["annotation"]["originating_identity"]=name;cases.append(x)
    for key in ("database_written","publication_ready","chapter_complete"):
        x=copy.deepcopy(d);x[key]=True;cases.append(x)
    x=copy.deepcopy(d);x["annotation"]["originating_number"]="plural";cases.append(x)
    x=copy.deepcopy(d);x["annotation"]["source_locator"]["start"]+=1;cases.append(x)
    x=copy.deepcopy(d);x["english_state"]="verified_translation";cases.append(x)
    x=copy.deepcopy(d);x["rejected_inferences"]=[];cases.append(x)
    x=copy.deepcopy(d);x["representation_decision"]="Publish as Ata's command";cases.append(x)
    for bad in cases:
        try:validate(bad)
        except ValueError:continue
        raise AssertionError("Unsafe gloss mutation accepted")
    print("PASS: A04 exact gloss and attribution uncertainty; 11 unsafe changes rejected")
if __name__=="__main__":main()

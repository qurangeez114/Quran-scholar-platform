#!/usr/bin/env python3
"""Read-only P01 captured brackets and provenance uncertainty guard."""
import copy,hashlib,json
from pathlib import Path
EXPECTED=json.loads("{\n  \"schema_version\": \"quranhikma-p01-bracket-provenance-review-v1\",\n  \"at\": \"2026-10-27T21:03:00-07:00\",\n  \"surah\": 108,\n  \"coverage_key\": \"108-I05-P01\",\n  \"status\": \"captured_bracket_annotation_provenance_unresolved\",\n  \"basis\": {\n    \"file\": \"ibn-kathir-108-i05-p01-bounded-draft-2026-10-25.json\",\n    \"blob_sha\": \"672bc1825d3bcd34efc7ee96af920bb21f8bd9bf\"\n  },\n  \"annotation\": {\n    \"source_locator\": {\n      \"key\": \"bracketed_assessment\",\n      \"start\": 15213,\n      \"end\": 15257,\n      \"text\": \"[كُلُّ هَذِهِ الْأَقْوَالِ غَرِيبَةٌ جِدًّا]\",\n      \"sha256\": \"646b8e92d3d0ef0b84e0e5223a9ab28570e0a3f8103b9434cf0760ac8b30c1ad\",\n      \"captured_entry_id\": 48457,\n      \"canonical_entry_id\": 48458,\n      \"offsets\": \"zero-based Unicode code points, half-open, unnormalized\"\n    },\n    \"literal_paraphrase\": \"All these statements are very strange.\",\n    \"attributed_author\": null,\n    \"editorial_status\": \"not_established\",\n    \"referent_scope\": \"these statements; exact set not independently delimited\",\n    \"technical_grading\": \"not_inferred\"\n  },\n  \"separate_authorial_preference\": {\n    \"locators\": [\n      {\n        \"key\": \"authorial_preference\",\n        \"start\": 15259,\n        \"end\": 15293,\n        \"text\": \"وَالصَّحِيحُ الْقَوْلُ الْأَوَّلُ،\",\n        \"sha256\": \"8e353b909eec14007bd04b2efd7333876010cf7c78e05a51ea98f000c216ba8a\",\n        \"captured_entry_id\": 48457,\n        \"canonical_entry_id\": 48458,\n        \"offsets\": \"zero-based Unicode code points, half-open, unnormalized\"\n      },\n      {\n        \"key\": \"preferred_meaning\",\n        \"start\": 15294,\n        \"end\": 15343,\n        \"text\": \"أَنَّ الْمُرَادَ بِالنَّحْرِ ذَبْحُ الْمَنَاسِكِ؛\",\n        \"sha256\": \"044373d563074353a850a356d836f1ce4d0c48fa6280ed3db44beea55d19046d\",\n        \"captured_entry_id\": 48457,\n        \"canonical_entry_id\": 48458,\n        \"offsets\": \"zero-based Unicode code points, half-open, unnormalized\"\n      }\n    ],\n    \"scope\": \"The unbracketed text prefers the first interpretation: sacrificial slaughter. Existing P01 candidate remains separate.\"\n  },\n  \"findings\": [\n    \"Brackets are present in the captured Arabic witness and must remain in exact source evidence.\",\n    \"Bracket punctuation alone cannot distinguish authorial text, an editor's supplement or capture formatting.\",\n    \"No independent edition or manuscript comparison was performed; neither interpolation nor authenticity established.\",\n    \"ghariba jiddan is preserved as evaluative language; do not convert it into a technical hadith grade or universal rejection.\",\n    \"No corresponding bounded English passage available for translation comparison.\"\n  ],\n  \"representation_decision\": \"Keep bracketed assessment as unattributed provenance annotation, not an attributed proposition or voice. Preserve mandatory P01 provenance hold; unbracketed preference is unaffected.\",\n  \"disagreement\": \"The preferred sacrificial-slaughter reading differs from the preceding hand-placement, hand-raising, qibla-facing and post-bowing posture interpretations.\",\n  \"next_step\": \"Validate bracket annotation, exact punctuation and limits; then design R02 explicit back-reference dependency without expanding unprinted chains.\",\n  \"database_written\": false,\n  \"publication_ready\": false,\n  \"chapter_complete\": false\n}\n")
def validate(d):
    if d!=EXPECTED:raise ValueError("Reviewed bracket annotation or limits changed")
    loc=d["annotation"]["source_locator"]
    if not(loc["text"].startswith("[") and loc["text"].endswith("]")):raise ValueError("Captured brackets removed")
    if len(loc["text"])!=loc["end"]-loc["start"] or hashlib.sha256(loc["text"].encode()).hexdigest()!=loc["sha256"]:raise ValueError("Arabic locator")
def main():
    d=json.loads(Path("data/tafsir/staging/ibn-kathir-108-i05-p01-bracket-review-2026-10-27.json").read_text());validate(d)
    cases=[]
    for k,v in (("attributed_author","Ibn Kathir"),("editorial_status","editor_interpolation_verified"),("technical_grading","weak_hadith"),("referent_scope","all interpretations universally rejected")):
        x=copy.deepcopy(d);x["annotation"][k]=v;cases.append(x)
    for k in ("database_written","publication_ready","chapter_complete"):
        x=copy.deepcopy(d);x[k]=True;cases.append(x)
    x=copy.deepcopy(d);x["annotation"]["source_locator"]["text"]=x["annotation"]["source_locator"]["text"][1:-1];cases.append(x)
    x=copy.deepcopy(d);x["findings"]=[];cases.append(x)
    x=copy.deepcopy(d);x["representation_decision"]="Publish as an authenticated authorial rejection";cases.append(x)
    x=copy.deepcopy(d);x["separate_authorial_preference"]={};cases.append(x)
    for bad in cases:
        try:validate(bad)
        except ValueError:continue
        raise AssertionError("Unsafe bracket mutation accepted")
    print("PASS: exact P01 brackets and provenance limits; 11 unsafe changes rejected")
if __name__=="__main__":main()

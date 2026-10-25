#!/usr/bin/env python3
"""Read-only P01 guard; bracket provenance remains unresolved."""
import argparse,copy,hashlib,json
from pathlib import Path
F="ibn-kathir-108-i05-p01-bounded-draft-2026-10-25.json"
EXPECTED="{\"schema_version\":\"quranhikma-i05-p01-bounded-draft-v1\",\"at\":\"2026-10-25T10:00:00-07:00\",\"surah\":108,\"coverage_key\":\"108-I05-P01\",\"status\":\"bounded_authorial_preference_bracket_provenance_unresolved\",\"basis\":{\"file\":\"ibn-kathir-108-i05-p01-preference-review-2026-10-25.json\",\"blob_sha\":\"cd551e697e180e3d4457ea248e16f74ebc8b6c78\"},\"candidate\":{\"propositions\":[{\"staging_key\":\"108-I05-P01-P\",\"claim_type_id\":17,\"statement_en\":\"Ibn Kathir identifies the first interpretation as correct: nahr means slaughtering sacrificial animals.\",\"source_type\":\"tafsir_entry\",\"tafsir_entry_id\":48458,\"speaker_type\":\"unspecified\",\"speaker_name\":\"Ibn Kathir\",\"assertion_mode\":\"narrator_commentary\",\"status\":\"active\",\"mufassir_own_position\":\"preferred\",\"verification_state\":\"source_language_located\",\"extraction_validity\":\"pending_source_verification\",\"attribution_fidelity\":\"accurate_paraphrase\",\"quranic_textual_support\":\"not_stated\",\"normative_polarity\":null,\"scope_generality\":null,\"extracted_by\":\"work-surah108-v1:i05-p01-draft\"}],\"voices\":[{\"proposition_ref\":\"108-I05-P01-P\",\"originating_voice_type\":\"exegete_own_view\",\"originating_voice_name\":null,\"reporting_work_id\":2,\"quoted_collection\":null}],\"evidence_units\":[{\"staging_key\":\"108-I05-P01-E\",\"unit_type\":\"single_named_attribution\",\"attributed_authority_name\":\"Ibn Kathir\",\"content_summary\":\"Ibn Kathir identifies the first interpretation as correct: nahr means slaughtering sacrificial animals.\",\"independence_state\":\"unknown\",\"independence_justification\":\"Single captured authorial context; no independent witness established.\",\"source_locator\":{\"captured_entry_id\":48457,\"canonical_entry_id\":48458,\"start\":15213,\"end\":15344,\"offsets\":\"zero-based Unicode code points, half-open, unnormalized\",\"text\":\"[كُلُّ هَذِهِ الْأَقْوَالِ غَرِيبَةٌ جِدًّا]  وَالصَّحِيحُ الْقَوْلُ الْأَوَّلُ، أَنَّ الْمُرَادَ بِالنَّحْرِ ذَبْحُ الْمَنَاسِكِ؛ \",\"sha256\":\"f40e83f70e0bd30bd683e1ec2bf97c822b23edc409a294ff948dc4a49c070ede\"},\"clause_keys\":[\"authorial_preference\",\"preferred_meaning\"]}],\"links\":[{\"proposition_ref\":\"108-I05-P01-P\",\"evidence_unit_ref\":\"108-I05-P01-E\",\"semantic_link_note\":\"Unbracketed authorial preference supports the sacrificial-slaughter interpretation; bracketed collective assessment excluded from attributed proposition and held separately. Correct expresses interpretive preference, not hadith authentication.\",\"linked_by\":\"work-surah108-v1:i05-p01-draft\"}],\"routes\":[]},\"unresolved_bracket_provenance\":{\"locator\":{\"key\":\"bracketed_assessment\",\"start\":15213,\"end\":15257,\"text\":\"[كُلُّ هَذِهِ الْأَقْوَالِ غَرِيبَةٌ جِدًّا]\",\"sha256\":\"646b8e92d3d0ef0b84e0e5223a9ab28570e0a3f8103b9434cf0760ac8b30c1ad\",\"captured_entry_id\":48457,\"canonical_entry_id\":48458,\"offsets\":\"zero-based Unicode code points, half-open, unnormalized\"},\"reason\":\"Square brackets retained as captured; authorial versus editorial provenance not independently verified.\",\"required_before_complete_coverage\":true},\"metadata\":{\"clause_locators\":[{\"key\":\"bracketed_assessment\",\"start\":15213,\"end\":15257,\"text\":\"[كُلُّ هَذِهِ الْأَقْوَالِ غَرِيبَةٌ جِدًّا]\",\"sha256\":\"646b8e92d3d0ef0b84e0e5223a9ab28570e0a3f8103b9434cf0760ac8b30c1ad\",\"captured_entry_id\":48457,\"canonical_entry_id\":48458,\"offsets\":\"zero-based Unicode code points, half-open, unnormalized\"},{\"key\":\"authorial_preference\",\"start\":15259,\"end\":15293,\"text\":\"وَالصَّحِيحُ الْقَوْلُ الْأَوَّلُ،\",\"sha256\":\"8e353b909eec14007bd04b2efd7333876010cf7c78e05a51ea98f000c216ba8a\",\"captured_entry_id\":48457,\"canonical_entry_id\":48458,\"offsets\":\"zero-based Unicode code points, half-open, unnormalized\"},{\"key\":\"preferred_meaning\",\"start\":15294,\"end\":15343,\"text\":\"أَنَّ الْمُرَادَ بِالنَّحْرِ ذَبْحُ الْمَنَاسِكِ؛\",\"sha256\":\"044373d563074353a850a356d836f1ce4d0c48fa6280ed3db44beea55d19046d\",\"captured_entry_id\":48457,\"canonical_entry_id\":48458,\"offsets\":\"zero-based Unicode code points, half-open, unnormalized\"}],\"english_state\":\"absent_in_corresponding_bounded_transition_per_scope_audit\",\"classification_note\":\"Compiler comment (17), narrator commentary and authorial preference; no universal rejection or technical hadith grading inferred.\",\"disagreement\":\"The preferred sacrificial-slaughter reading differs from the preceding hand-placement, hand-raising, qibla-facing and post-bowing posture interpretations.\",\"nonphysical_fields\":[\"staging_key\",\"proposition_ref\",\"evidence_unit_ref\",\"source_locator\",\"clause_keys\"]},\"remaining\":[\"Validate required candidate fields, exact evidence and bracket-provenance hold\",\"Add read-only CI checks; all adjacent coverage holds remain unfinished\"],\"database_written\":false,\"publication_ready\":false,\"chapter_complete\":false}"
def validate(d):
    e=json.loads(EXPECTED)
    for k in ('candidate','unresolved_bracket_provenance','metadata','basis'):
        if d.get(k)!=e[k]:raise ValueError('reviewed preference or hold changed')
    c=d['candidate'];p=c['propositions'][0];u=c['evidence_units'][0];l=c['links'][0]
    if c['routes'] or d['unresolved_bracket_provenance']['required_before_complete_coverage'] is not True:raise ValueError('hold or route')
    if l['proposition_ref']!=p['staging_key'] or l['evidence_unit_ref']!=u['staging_key']:raise ValueError('link')
    loc=u['source_locator']
    if hashlib.sha256(loc['text'].encode()).hexdigest()!=loc['sha256']:raise ValueError('context hash')
    for x in d['metadata']['clause_locators']:
        if loc['text'][x['start']-loc['start']:x['end']-loc['start']]!=x['text'] or hashlib.sha256(x['text'].encode()).hexdigest()!=x['sha256']:raise ValueError('clause')
    if any(d.get(k) is not False for k in ('database_written','publication_ready','chapter_complete')):raise ValueError('completion')
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--root',default='data/tafsir/staging');ap.add_argument('--self-test',action='store_true');a=ap.parse_args()
    d=json.loads((Path(a.root)/F).read_text());validate(d)
    mutations=[
      lambda b:b.pop('unresolved_bracket_provenance'),
      lambda b:b['unresolved_bracket_provenance'].update(required_before_complete_coverage=False),
      lambda b:b['candidate']['propositions'][0].update(statement_en='Ibn Kathir grades every preceding hadith as unusual.'),
      lambda b:b['candidate']['propositions'][0].update(speaker_name='Ibn Jarir'),
      lambda b:b['candidate']['propositions'][0].update(mufassir_own_position='reported_only'),
      lambda b:b['candidate']['evidence_units'][0]['clause_keys'].append('bracketed_assessment'),
      lambda b:b['candidate']['evidence_units'][0].pop('content_summary'),
      lambda b:b['candidate']['links'][0].update(evidence_unit_ref='crossed'),
      lambda b:b['candidate']['routes'].append({'invented':True}),
      lambda b:b['metadata'].update(english_state='present'),
      lambda b:b['metadata']['clause_locators'][0].update(text='brackets removed'),
      lambda b:b.update(publication_ready=True)]
    if a.self_test:
        for mutate in mutations:
            b=copy.deepcopy(d);mutate(b)
            try:validate(b)
            except ValueError:continue
            raise ValueError('unsafe mutation accepted')
    print(json.dumps(dict(status='PASS',rejected_cases=len(mutations) if a.self_test else 0,bracket_provenance_resolved=False,database_written=False)))
if __name__=='__main__':main()

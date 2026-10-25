#!/usr/bin/env python3
"""Read-only R02 preservation guard; dependency mapping remains unresolved."""
import argparse,copy,hashlib,json
from pathlib import Path
F="ibn-kathir-108-i05-r02-bounded-draft-2026-10-25.json"
EXPECTED="{\"schema_version\":\"quranhikma-i05-r02-bounded-draft-v1\",\"at\":\"2026-10-25T05:03:00-07:00\",\"surah\":108,\"coverage_key\":\"108-I05-R02\",\"status\":\"bounded_reporting_candidate_dependency_mapping_unresolved\",\"basis\":{\"review_blob_sha\":\"758f32743169e2261ffbc9bd8241c8c468b00b39\",\"design_blob_sha\":\"97059d00c25a8edb43ea99630951f134d954313e\"},\"candidate\":{\"propositions\":[{\"staging_key\":\"108-I05-R02-P\",\"claim_type_id\":17,\"statement_en\":\"Ibn Kathir states that al-Hakim likewise reported it in al-Mustadrak through Israil ibn Hatim, referring back with bihi.\",\"source_type\":\"tafsir_entry\",\"tafsir_entry_id\":48458,\"speaker_type\":\"unspecified\",\"speaker_name\":\"Ibn Kathir\",\"assertion_mode\":\"narrator_commentary\",\"status\":\"active\",\"mufassir_own_position\":\"preferred\",\"verification_state\":\"source_language_located\",\"extraction_validity\":\"pending_source_verification\",\"attribution_fidelity\":\"accurate_paraphrase\",\"quranic_textual_support\":\"not_stated\",\"normative_polarity\":null,\"scope_generality\":null,\"extracted_by\":\"work-surah108-v1:i05-r02-draft\"}],\"voices\":[{\"proposition_ref\":\"108-I05-R02-P\",\"originating_voice_type\":\"exegete_own_view\",\"originating_voice_name\":null,\"reporting_work_id\":2,\"quoted_collection\":null}],\"evidence_units\":[{\"staging_key\":\"108-I05-R02-E\",\"unit_type\":\"single_named_attribution\",\"attributed_authority_name\":\"Ibn Kathir\",\"content_summary\":\"Ibn Kathir states that al-Hakim likewise reported it in al-Mustadrak through Israil ibn Hatim, referring back with bihi. The bihi dependency points to R01; independent corroboration is not established.\",\"independence_state\":\"unknown\",\"independence_justification\":\"One captured report attribution with an explicit backward reference; no separately verified chain.\",\"source_locator\":{\"captured_entry_id\":48457,\"canonical_entry_id\":48458,\"start\":14936,\"end\":15035,\"offsets\":\"zero-based Unicode code points, half-open, unnormalized\",\"text\":\"وَهَكَذَا  رَوَاهُ الْحَاكِمُ فِي الْمُسْتَدْرَكِ، مِنْ حَدِيثِ إِسْرَائِيلَ بْنِ حَاتِمٍ، بِهِ. \\n\\n\",\"sha256\":\"108e9f4e052a6fbd719e7433c22e994acb772ac203e91f9183ec95f9754b396e\"},\"clause_keys\":[\"parallel_marker\",\"collector_collection\",\"named_node\",\"back_reference\"]}],\"links\":[{\"proposition_ref\":\"108-I05-R02-P\",\"evidence_unit_ref\":\"108-I05-R02-E\",\"semantic_link_note\":\"Supports Ibn Kathir's reporting statement only. Al-Hakim is collector, Israil ibn Hatim the named transmission node; bihi refers to R01. Physical dependency mapping remains unresolved; no authentication inferred.\",\"linked_by\":\"work-surah108-v1:i05-r02-draft\"}],\"routes\":[]},\"dependency\":{\"source_coverage_key\":\"108-I05-R02\",\"target_coverage_key\":\"108-I05-R01\",\"relation\":\"explicit_textual_back_reference\",\"supporting_clause_key\":\"back_reference\",\"expanded_chain\":[],\"independence_state\":\"unknown\"},\"unresolved_dependency_mapping\":{\"reason\":\"Approved physical representation and ID resolution for textual dependency have not been verified.\",\"required_before_publication\":true},\"metadata\":{\"clause_locators\":[{\"key\":\"parallel_marker\",\"start\":14936,\"end\":14945,\"text\":\"وَهَكَذَا\",\"sha256\":\"742e7f7760828f43b4e3fe664535bae6af3fb7009caaea8dbb48014881b519a9\",\"captured_entry_id\":48457,\"canonical_entry_id\":48458,\"offsets\":\"zero-based Unicode code points, half-open, unnormalized\"},{\"key\":\"collector_collection\",\"start\":14947,\"end\":14986,\"text\":\"رَوَاهُ الْحَاكِمُ فِي الْمُسْتَدْرَكِ،\",\"sha256\":\"e260e7444bcfc6881c0fcb435ca626daabe518c9c577169b8ff53569a0084850\",\"captured_entry_id\":48457,\"canonical_entry_id\":48458,\"offsets\":\"zero-based Unicode code points, half-open, unnormalized\"},{\"key\":\"named_node\",\"start\":14987,\"end\":15026,\"text\":\"مِنْ حَدِيثِ إِسْرَائِيلَ بْنِ حَاتِمٍ،\",\"sha256\":\"2bcc0856550069e4401b4bda96c9d8b925d37f87367e29926d298217d2bdf02b\",\"captured_entry_id\":48457,\"canonical_entry_id\":48458,\"offsets\":\"zero-based Unicode code points, half-open, unnormalized\"},{\"key\":\"back_reference\",\"start\":15027,\"end\":15032,\"text\":\"بِهِ.\",\"sha256\":\"733154d59059b00263926c8c37596d1f181d3a27f6503b95b9896768eb3c7f12\",\"captured_entry_id\":48457,\"canonical_entry_id\":48458,\"offsets\":\"zero-based Unicode code points, half-open, unnormalized\"}],\"english_state\":\"absent_in_corresponding_bounded_transition_per_scope_audit\",\"classification_note\":\"Compiler reporting commentary, claim type 17; preferred marks the author's own commentary, not authentication or preference for the reported hadith.\",\"collector\":\"al-Hakim\",\"collection\":\"al-Mustadrak\",\"collection_locator\":null,\"explicit_transmission_node\":\"Israil ibn Hatim\"},\"remaining\":[\"Draft bounded reporting statement with mandatory dependency hold\",\"Validate source hashes, roles, empty routes and forbidden-inference mutations\",\"Refresh schema and duplicate preflight before any integration\"],\"database_written\":false,\"publication_ready\":false,\"chapter_complete\":false}"
def validate(d):
    e=json.loads(EXPECTED)
    for k in ('candidate','dependency','unresolved_dependency_mapping','metadata','basis'):
        if d.get(k)!=e[k]: raise ValueError('reviewed attribution or dependency changed')
    c=d['candidate']
    if c['routes'] or d['dependency']['expanded_chain']:raise ValueError('invented chain')
    if d['unresolved_dependency_mapping']['required_before_publication'] is not True:raise ValueError('hold removed')
    p=c['propositions'][0];u=c['evidence_units'][0];l=c['links'][0]
    if l['proposition_ref']!=p['staging_key'] or l['evidence_unit_ref']!=u['staging_key']:raise ValueError('links')
    loc=u['source_locator']
    if hashlib.sha256(loc['text'].encode()).hexdigest()!=loc['sha256']:raise ValueError('context hash')
    for x in d['metadata']['clause_locators']:
        if loc['text'][x['start']-loc['start']:x['end']-loc['start']]!=x['text'] or hashlib.sha256(x['text'].encode()).hexdigest()!=x['sha256']:raise ValueError('clause')
    if any(d.get(k) is not False for k in ('database_written','publication_ready','chapter_complete')):raise ValueError('completion')
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--root',default='data/tafsir/staging');ap.add_argument('--self-test',action='store_true');a=ap.parse_args()
    d=json.loads((Path(a.root)/F).read_text());validate(d)
    mutations=[
      lambda b:b.pop('unresolved_dependency_mapping'),
      lambda b:b['unresolved_dependency_mapping'].update(required_before_publication=False),
      lambda b:b['dependency'].update(target_coverage_key='108-I05-A04'),
      lambda b:b['dependency']['expanded_chain'].append('Ali'),
      lambda b:b['candidate']['routes'].append({'invented':True}),
      lambda b:b['candidate']['propositions'][0].update(speaker_name='al-Hakim'),
      lambda b:b['candidate']['propositions'][0].update(statement_en='Al-Hakim authenticated the report.'),
      lambda b:b['candidate']['evidence_units'][0].update(independence_state='independent'),
      lambda b:b['candidate']['evidence_units'][0].pop('content_summary'),
      lambda b:b['candidate']['links'][0].update(evidence_unit_ref='crossed'),
      lambda b:b['metadata'].update(collection_locator='invented report number'),
      lambda b:b['metadata'].update(english_state='present'),
      lambda b:b['metadata']['clause_locators'][0].update(end=15035),
      lambda b:b.update(publication_ready=True)]
    if a.self_test:
        for mutate in mutations:
            b=copy.deepcopy(d);mutate(b)
            try:validate(b)
            except ValueError:continue
            raise ValueError('unsafe mutation accepted')
    print(json.dumps(dict(status='PASS',rejected_cases=len(mutations) if a.self_test else 0,dependency_mapping_resolved=False,database_written=False)))
if __name__=='__main__':main()

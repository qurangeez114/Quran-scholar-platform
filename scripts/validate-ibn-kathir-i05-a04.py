#!/usr/bin/env python3
"""Read-only preservation guard; gloss provenance remains unresolved."""
import argparse,copy,hashlib,json
from pathlib import Path
F="ibn-kathir-108-i05-a04-bounded-draft-2026-10-24.json"
EXPECTED="{\"candidate\":{\"propositions\":[{\"staging_key\":\"108-I05-A04-P\",\"claim_type_id\":14,\"statement_en\":\"Ibn Kathir reports from Ata al-Khurasani an interpretation of wanhar as raising and straightening the back after bowing and bringing the upper chest forward.\",\"source_type\":\"tafsir_entry\",\"tafsir_entry_id\":48458,\"speaker_type\":\"unspecified\",\"speaker_name\":\"Ata al-Khurasani\",\"assertion_mode\":\"explicit\",\"status\":\"active\",\"mufassir_own_position\":\"reported_only\",\"verification_state\":\"source_language_located\",\"extraction_validity\":\"pending_source_verification\",\"attribution_fidelity\":\"accurate_paraphrase\",\"quranic_textual_support\":\"not_stated\",\"normative_polarity\":null,\"scope_generality\":null,\"extracted_by\":\"work-surah108-v1:i05-a04-draft\"}],\"voices\":[{\"proposition_ref\":\"108-I05-A04-P\",\"originating_voice_type\":\"named_earlier_exegete\",\"originating_voice_name\":\"Ata al-Khurasani\",\"reporting_work_id\":2,\"quoted_collection\":null}],\"evidence_units\":[{\"staging_key\":\"108-I05-A04-E\",\"unit_type\":\"single_named_attribution\",\"attributed_authority_name\":\"Ata al-Khurasani\",\"content_summary\":\"Ibn Kathir reports from Ata al-Khurasani an interpretation of wanhar as raising and straightening the back after bowing and bringing the upper chest forward.\",\"independence_state\":\"unknown\",\"independence_justification\":\"One captured attribution context, not an independently established witness.\",\"source_locator\":{\"captured_entry_id\":48457,\"canonical_entry_id\":48458,\"start\":15035,\"end\":15213,\"offsets\":\"zero-based Unicode code points, half-open, unnormalized\",\"text\":\"وَعَنْ عَطَاءٍ الْخُرَاسَانِيِّ: ﴿وَانْحَرْ﴾ أَيْ: ارْفَعْ صُلْبَكَ بَعْدَ الرُّكُوعِ وَاعْتَدِلْ، وَأَبْرِزْ نَحْرَكَ، يَعْنِي بِهِ الِاعْتِدَالَ. رَوَاهُ ابْنُ أَبِي حَاتِمٍ.\\n\\n\",\"sha256\":\"d33851f292367ac269214f1e612470362d99f52edacbac9771ce6ac7e429415a\"},\"clause_keys\":[\"ata_attribution\",\"post_bowing_interpretation\"]}],\"links\":[{\"proposition_ref\":\"108-I05-A04-P\",\"evidence_unit_ref\":\"108-I05-A04-E\",\"semantic_link_note\":\"Ata attribution supports the post-bowing posture interpretation; explanatory gloss excluded from attributed statement and held separately.\",\"linked_by\":\"work-surah108-v1:i05-a04-draft\"}],\"routes\":[]},\"holds\":[{\"clause_key\":\"explanatory_gloss\",\"locator\":{\"key\":\"explanatory_gloss\",\"start\":15155,\"end\":15182,\"text\":\"يَعْنِي بِهِ الِاعْتِدَالَ.\",\"sha256\":\"be466927f4c4c2bef87c0acb5b754bae97249b79347bfaf934ea8fdb1427a0b0\",\"captured_entry_id\":48457,\"canonical_entry_id\":48458,\"offsets\":\"zero-based Unicode code points, half-open, unnormalized\"},\"reason\":\"Speaker not explicitly named; no separate authorial or transmitted attribution asserted.\",\"required_before_complete_coverage\":true}],\"metadata\":{\"clause_locators\":[{\"key\":\"ata_attribution\",\"start\":15035,\"end\":15067,\"text\":\"وَعَنْ عَطَاءٍ الْخُرَاسَانِيِّ:\",\"sha256\":\"2f1f85f8b8bc7385f60048ca36ae8ca6b61cb30a9eedab64aa334feff0bccce5\",\"captured_entry_id\":48457,\"canonical_entry_id\":48458,\"offsets\":\"zero-based Unicode code points, half-open, unnormalized\"},{\"key\":\"post_bowing_interpretation\",\"start\":15086,\"end\":15154,\"text\":\"ارْفَعْ صُلْبَكَ بَعْدَ الرُّكُوعِ وَاعْتَدِلْ، وَأَبْرِزْ نَحْرَكَ،\",\"sha256\":\"28bece016dafa437569c31923e5fa33461786b1079e79b456044e8ef0bf18c6a\",\"captured_entry_id\":48457,\"canonical_entry_id\":48458,\"offsets\":\"zero-based Unicode code points, half-open, unnormalized\"},{\"key\":\"explanatory_gloss\",\"start\":15155,\"end\":15182,\"text\":\"يَعْنِي بِهِ الِاعْتِدَالَ.\",\"sha256\":\"be466927f4c4c2bef87c0acb5b754bae97249b79347bfaf934ea8fdb1427a0b0\",\"captured_entry_id\":48457,\"canonical_entry_id\":48458,\"offsets\":\"zero-based Unicode code points, half-open, unnormalized\"},{\"key\":\"reporting_authority\",\"start\":15183,\"end\":15211,\"text\":\"رَوَاهُ ابْنُ أَبِي حَاتِمٍ.\",\"sha256\":\"b7048342929b6cec69d275077663dae3b8c0887ee4f52ffded0e082afc8dc03e\",\"captured_entry_id\":48457,\"canonical_entry_id\":48458,\"offsets\":\"zero-based Unicode code points, half-open, unnormalized\"}],\"english_state\":\"absent_in_corresponding_bounded_transition_per_scope_audit\",\"reporting_authority\":{\"name\":\"Ibn Abi Hatim\",\"clause_key\":\"reporting_authority\",\"role\":\"Named reporting authority; not originating interpreter and not a reconstructed chain.\",\"collection_locator\":null},\"nonphysical_fields\":[\"staging_key\",\"proposition_ref\",\"evidence_unit_ref\",\"source_locator\",\"clause_keys\"],\"remaining\":[\"Negative validation and read-only CI\",\"Resolve explanatory-gloss voice before complete coverage\",\"A03 anonymous hold and all ten adjacent coverage holds remain unfinished\"]}}"
def validate(d):
    e=json.loads(EXPECTED)
    if d['candidate']!=e['candidate'] or d['unresolved_gloss']!=e['holds'] or d['metadata']!=e['metadata']:raise ValueError('reviewed draft or mandatory hold changed')
    c=d['candidate']
    if len(c['propositions'])!=1 or len(c['voices'])!=1 or len(d['unresolved_gloss'])!=1:raise ValueError('partial inventory')
    if d['unresolved_gloss'][0]['clause_key']!='explanatory_gloss' or d['unresolved_gloss'][0]['required_before_complete_coverage'] is not True:raise ValueError('gloss hold')
    for p,u,l in zip(c['propositions'],c['evidence_units'],c['links']):
        if l['proposition_ref']!=p['staging_key'] or l['evidence_unit_ref']!=u['staging_key']:raise ValueError('links')
        loc=u['source_locator']
        if hashlib.sha256(loc['text'].encode()).hexdigest()!=loc['sha256']:raise ValueError('hash')
        for x in d['metadata']['clause_locators']:
            if loc['text'][x['start']-loc['start']:x['end']-loc['start']]!=x['text']:raise ValueError('slice')
    if any(d[k] is not False for k in ['database_written','publication_ready','chapter_complete']):raise ValueError('completion')
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--root',default='data/tafsir/staging');ap.add_argument('--self-test',action='store_true');a=ap.parse_args()
    d=json.loads((Path(a.root)/F).read_text());validate(d);cases=[]
    def bad(fn):
        b=copy.deepcopy(d);fn(b);cases.append(b)
    bad(lambda b:b['unresolved_gloss'].clear())
    bad(lambda b:b['unresolved_gloss'][0].update(required_before_complete_coverage=False))
    bad(lambda b:b['candidate']['propositions'][0].update(speaker_name='Ibn Abi Hatim'))
    bad(lambda b:b['candidate']['voices'][0].update(originating_voice_name='Ibn Kathir'))
    bad(lambda b:b['candidate']['propositions'][0].update(statement_en='Ata prescribes raising hands at opening prayer.'))
    bad(lambda b:b['candidate']['propositions'][0].update(statement_en=b['candidate']['propositions'][0]['statement_en']+' Ata explains this as uprightness.'))
    bad(lambda b:b['candidate']['links'][0].update(evidence_unit_ref='crossed'))
    bad(lambda b:b['candidate']['evidence_units'][0].pop('content_summary'))
    bad(lambda b:b['metadata'].update(english_state='present'))
    bad(lambda b:b['metadata']['clause_locators'][0].update(end=15213))
    bad(lambda b:b['metadata']['reporting_authority'].update(collection_locator='unverified edition'))
    bad(lambda b:b['candidate']['routes'].append({'invented':True}))
    bad(lambda b:b.update(publication_ready=True))
    if a.self_test:
        for b in cases:
            try:validate(b)
            except ValueError:continue
            raise ValueError('unsafe mutation accepted')
    print(json.dumps(dict(status='PASS',rejected_cases=len(cases) if a.self_test else 0,gloss_voice_resolved=False,database_written=False)))
if __name__=='__main__':main()

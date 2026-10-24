#!/usr/bin/env python3
"""Read-only guard of reviewed A02 attribution and exact evidence scope."""
import argparse,copy,hashlib,json
from pathlib import Path
F="ibn-kathir-108-i05-a02-physical-draft-2026-10-24.json"
EXPECTED="{\"candidate\":{\"propositions\":[{\"staging_key\":\"108-I05-A02-P\",\"claim_type_id\":14,\"statement_en\":\"Ibn Kathir reports from Abu Jafar al-Baqir an interpretation of wanhar as raising both hands at the opening of prayer.\",\"source_type\":\"tafsir_entry\",\"tafsir_entry_id\":48458,\"speaker_type\":\"unspecified\",\"speaker_name\":\"Abu Jafar al-Baqir\",\"assertion_mode\":\"explicit\",\"status\":\"active\",\"mufassir_own_position\":\"reported_only\",\"verification_state\":\"source_language_located\",\"extraction_validity\":\"pending_source_verification\",\"attribution_fidelity\":\"accurate_paraphrase\",\"quranic_textual_support\":\"not_stated\",\"normative_polarity\":null,\"scope_generality\":null,\"extracted_by\":\"work-surah108-v1:i05-a02-draft\"}],\"voices\":[{\"proposition_ref\":\"108-I05-A02-P\",\"originating_voice_type\":\"named_earlier_exegete\",\"originating_voice_name\":\"Abu Jafar al-Baqir\",\"reporting_work_id\":2,\"quoted_collection\":null}],\"evidence_units\":[{\"staging_key\":\"108-I05-A02-E\",\"unit_type\":\"single_named_attribution\",\"attributed_authority_name\":\"Abu Jafar al-Baqir\",\"content_summary\":\"Ibn Kathir reports from Abu Jafar al-Baqir an interpretation of wanhar as raising both hands at the opening of prayer.\",\"independence_state\":\"unknown\",\"independence_justification\":\"One captured attribution context; no independent witness established.\",\"source_locator\":{\"captured_entry_id\":48457,\"canonical_entry_id\":48458,\"start\":13788,\"end\":13894,\"offsets\":\"zero-based Unicode code points, half-open, unnormalized\",\"text\":\"وَعَنْ أَبِي جَعْفَرٍ الْبَاقِرِ: ﴿وَانْحَرْ﴾ يَعْنِي: ارْفَعِ الْيَدَيْنِ عِنْدَ افْتِتَاحِ الصَّلَاةِ.\\n\\n\",\"sha256\":\"8c76e922183dc69258fe2f0dd5ab61debad7f6b70f84ae70e6ec73be4484b348\"},\"clause_keys\":[\"baqir_attribution\",\"opening_prayer_interpretation\"]}],\"links\":[{\"proposition_ref\":\"108-I05-A02-P\",\"evidence_unit_ref\":\"108-I05-A02-E\",\"semantic_link_note\":\"Named al-Baqir attribution and interpretation of raising both hands at opening prayer; no Ali-specific criticism transferred.\",\"linked_by\":\"work-surah108-v1:i05-a02-draft\"}],\"routes\":[]},\"metadata\":{\"clause_locators\":[{\"key\":\"baqir_attribution\",\"start\":13788,\"end\":13821,\"text\":\"وَعَنْ أَبِي جَعْفَرٍ الْبَاقِرِ:\",\"sha256\":\"49bfcd0d47868f7e8d7e7f8d55170c93fa806de63afeb38fbe68aa6859485aba\",\"captured_entry_id\":48457,\"canonical_entry_id\":48458,\"offsets\":\"zero-based Unicode code points, half-open, unnormalized\"},{\"key\":\"opening_prayer_interpretation\",\"start\":13843,\"end\":13892,\"text\":\"ارْفَعِ الْيَدَيْنِ عِنْدَ افْتِتَاحِ الصَّلَاةِ.\",\"sha256\":\"056f403849277ad4961e63432056ee265b685806808b16bd11e99cc65bba09e9\",\"captured_entry_id\":48457,\"canonical_entry_id\":48458,\"offsets\":\"zero-based Unicode code points, half-open, unnormalized\"}],\"english_state\":\"absent_in_corresponding_bounded_transition_per_scope_audit\",\"route_state\":\"chain_not_printed_in_this_unit\",\"fidelity_notes\":[\"ارفع اليدين specifies both hands; عند افتتاح الصلاة limits this interpretation to the opening of prayer.\",\"This is an interpretation attributed to al-Baqir; the imperative inside it does not make Ibn Kathir its commanding speaker.\",\"Abu Jafar al-Baqir is distinct from Abu Jafar ibn Jarir named later; do not merge their identities.\",\"A01's immediately adjacent la yasihh criticism is not attached to this al-Baqir attribution.\",\"English statement is analytical paraphrase of Arabic, not quotation from corresponding abridged English witness.\"],\"nonphysical_fields\":[\"staging_key\",\"proposition_ref\",\"evidence_unit_ref\",\"source_locator\",\"clause_keys\"],\"id_handling\":\"Omit generated IDs; resolve physical foreign keys only within existing authorized publication workflow.\",\"remaining\":[\"Negative validator and CI\",\"Broader duplicate and live preflight before integration\",\"All ten adjacent coverage holds remain unfinished\"]}}"
def validate(d):
    e=json.loads(EXPECTED)
    if d['candidate']!=e['candidate'] or d['metadata']!=e['metadata']:raise ValueError('reviewed attribution or source scope changed')
    c=d['candidate'];p=c['propositions'][0];v=c['voices'][0];u=c['evidence_units'][0];l=c['links'][0]
    if v['proposition_ref']!=p['staging_key'] or l['proposition_ref']!=p['staging_key'] or l['evidence_unit_ref']!=u['staging_key']:raise ValueError('references')
    if not u['content_summary'] or not l['semantic_link_note'] or not l['linked_by']:raise ValueError('required fields')
    loc=u['source_locator']
    if hashlib.sha256(loc['text'].encode()).hexdigest()!=loc['sha256']:raise ValueError('context hash')
    for x in d['metadata']['clause_locators']:
        if loc['text'][x['start']-loc['start']:x['end']-loc['start']]!=x['text'] or hashlib.sha256(x['text'].encode()).hexdigest()!=x['sha256']:raise ValueError('clause slice')
    if any(d[k] is not False for k in ['database_written','publication_ready','chapter_complete']):raise ValueError('completion')
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--root',default='data/tafsir/staging');ap.add_argument('--self-test',action='store_true');a=ap.parse_args()
    d=json.loads((Path(a.root)/F).read_text());validate(d);cases=[]
    def bad(fn):
        b=copy.deepcopy(d);fn(b);cases.append(b)
    bad(lambda b:b['candidate']['propositions'][0].update(speaker_name='Ibn Jarir'))
    bad(lambda b:b['candidate']['propositions'][0].update(claim_type_id=4))
    bad(lambda b:b['candidate']['propositions'][0].update(statement_en='Raise hands at every stage of prayer.'))
    bad(lambda b:b['candidate']['propositions'][0].update(mufassir_own_position='rejected'))
    bad(lambda b:b['candidate']['voices'][0].update(originating_voice_type='exegete_own_view'))
    bad(lambda b:b['candidate']['evidence_units'][0].pop('content_summary'))
    bad(lambda b:b['candidate']['links'][0].pop('linked_by'))
    bad(lambda b:b['candidate']['links'][0].update(evidence_unit_ref='crossed'))
    bad(lambda b:b['metadata']['clause_locators'][1].update(end=13900))
    bad(lambda b:b['metadata'].update(english_state='present'))
    bad(lambda b:b['candidate']['routes'].append({'invented':True}))
    bad(lambda b:b.update(publication_ready=True))
    if a.self_test:
        for b in cases:
            try:validate(b)
            except ValueError:continue
            raise ValueError('unsafe mutation accepted')
    print(json.dumps(dict(status='PASS',rejected_cases=len(cases) if a.self_test else 0,database_written=False)))
if __name__=='__main__':main()

#!/usr/bin/env python3
"""Read-only exact A01 clause and attribution preservation guard."""
import argparse,copy,hashlib,json
from pathlib import Path
F="ibn-kathir-108-i05-a01-attribution-review-2026-10-23.json"
EXPECTED="{\"semantic_units\":[{\"key\":\"108-I05-A01-ALI\",\"speaker\":\"Ali\",\"voice\":\"reported_attribution\",\"statement\":\"The interpretation places the right hand over the left beneath the upper chest.\",\"attribution_status\":\"The captured text reports this from Ali, then says it does not hold.\",\"source_criticism_ref\":\"108-I05-A01-CRIT\"},{\"key\":\"108-I05-A01-CRIT\",\"speaker\":\"Ibn Kathir\",\"voice\":\"exegete_own_source_criticism\",\"statement\":\"The attribution to Ali does not hold.\",\"arabic_anchor\":\"وَلَا يَصِحُّ\",\"scope\":\"Immediately preceding Ali attribution; do not automatically extend to al-Shabi or all hand-placement interpretations.\",\"independent_authentication\":false},{\"key\":\"108-I05-A01-SHABI\",\"speaker\":\"al-Shabi\",\"voice\":\"reported_attribution\",\"statement\":\"A similar hand-placement interpretation is reported from al-Shabi.\",\"arabic_anchor\":\"وَعَنِ الشَّعْبِيِّ مِثْلَهُ\",\"scope\":\"Similar content referred back with mithlahu; no full chain printed here.\"}],\"english_state\":\"absent_in_corresponding_bounded_transition_per_scope_audit\",\"route_state\":\"No printed chain in this bounded unit; do not infer absence elsewhere.\",\"clause_locators\":[{\"key\":\"interpretation\",\"captured_entry_id\":48457,\"canonical_entry_id\":48458,\"start\":13653,\"end\":13713,\"text\":\"وَضْعُ الْيَدِ الْيُمْنَى عَلَى الْيُسْرَى تَحْتَ النَّحْرِ.\",\"sha256\":\"c3dc026a8b5b04e6ba6d6e7d58c11e4c4a1f4582dc291fbc9cace9287a5c7a7f\",\"offsets\":\"zero-based Unicode code points, half-open, unnormalized\"},{\"key\":\"ali_attribution\",\"captured_entry_id\":48457,\"canonical_entry_id\":48458,\"start\":13714,\"end\":13741,\"text\":\"يُرْوَى هَذَا عَنْ عَلِيٍّ،\",\"sha256\":\"f34b4eca0469adcc908171db925236b87cf85241533c0204661e17b8e2a6383c\",\"offsets\":\"zero-based Unicode code points, half-open, unnormalized\"},{\"key\":\"authorial_criticism\",\"captured_entry_id\":48457,\"canonical_entry_id\":48458,\"start\":13742,\"end\":13756,\"text\":\"وَلَا يَصِحُّ.\",\"sha256\":\"8aeaec8fe2d9dfc7d91147a39029daae4d71a9f4142c180db4b9107e83b04d73\",\"offsets\":\"zero-based Unicode code points, half-open, unnormalized\"},{\"key\":\"shabi_attribution\",\"captured_entry_id\":48457,\"canonical_entry_id\":48458,\"start\":13757,\"end\":13786,\"text\":\"وَعَنِ الشَّعْبِيِّ مِثْلَهُ.\",\"sha256\":\"50ff82c66e5120dc09e31fba9d85d228d1e1295c9e507f053fc972d2f595ce93\",\"offsets\":\"zero-based Unicode code points, half-open, unnormalized\"}],\"arabic_locator\":{\"captured_entry_id\":48457,\"canonical_entry_id\":48458,\"start\":13609,\"end\":13788,\"offsets\":\"zero-based Unicode code points, half-open, unnormalized\",\"text\":\"وَقِيلَ: الْمُرَادُ بِقَوْلِهِ: ﴿وَانْحَرْ﴾ وَضْعُ الْيَدِ الْيُمْنَى عَلَى الْيُسْرَى تَحْتَ النَّحْرِ. يُرْوَى هَذَا عَنْ عَلِيٍّ، وَلَا يَصِحُّ. وَعَنِ الشَّعْبِيِّ مِثْلَهُ.\\n\\n\",\"sha256\":\"7d648fab8115b3c6510efaf67fbc0e8ca87cb9658a4ac7c8147dbd29e767b3b3\"}}"
def validate(d):
    e=json.loads(EXPECTED)
    for k,v in e.items():
        if d[k]!=v:raise ValueError(k)
    context=d['arabic_locator']
    if hashlib.sha256(context['text'].encode()).hexdigest()!=context['sha256']:raise ValueError('context hash')
    for loc in d['clause_locators']:
        s,e=loc['start']-context['start'],loc['end']-context['start']
        if context['text'][s:e]!=loc['text'] or hashlib.sha256(loc['text'].encode()).hexdigest()!=loc['sha256']:raise ValueError('clause hash or slice')
    if any(d[k] is not False for k in ['database_written','publication_ready','chapter_complete']):raise ValueError('completion')
def main():
    p=argparse.ArgumentParser();p.add_argument('--root',default='data/tafsir/staging');p.add_argument('--self-test',action='store_true');a=p.parse_args()
    d=json.loads((Path(a.root)/F).read_text());validate(d);cases=[]
    def bad(fn):
        b=copy.deepcopy(d);fn(b);cases.append(b)
    bad(lambda b:b['semantic_units'][1].update(speaker='Ali'))
    bad(lambda b:b['semantic_units'][1].update(scope='All reports including al-Shabi'))
    bad(lambda b:b['semantic_units'][1].update(independent_authentication=True))
    bad(lambda b:b['semantic_units'][2].update(speaker='Ali'))
    bad(lambda b:b['clause_locators'][2].update(end=13786))
    bad(lambda b:b['clause_locators'][0].update(text='changed'))
    bad(lambda b:b.update(english_state='present'))
    bad(lambda b:b.update(route_state='invented chain'))
    bad(lambda b:b.update(publication_ready=True))
    if a.self_test:
        for b in cases:
            try:validate(b)
            except ValueError:continue
            raise ValueError('unsafe mutation accepted')
    print(json.dumps(dict(status='PASS',rejected_cases=len(cases) if a.self_test else 0,database_written=False)))
if __name__=='__main__':main()

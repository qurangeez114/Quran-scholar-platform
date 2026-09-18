#!/usr/bin/env python3
"""Hash-verified Jalalayn Arabic↔English fidelity grades for Qur'an 110-114. No model calls."""
import hashlib, json
import batch_tafsir_accuracy as db

VERSION='last-five-jalalayn-fidelity-v1'
EXPECTED={
(110,1):(55670,'d7fe6d51d55ddc0c059261425f4d2c2210206a36b79b2b3d07019fa2a78cce36',23680,'1162d656169b035c39e243841d3d852c41ff8dee91423ec2d351987860047d08'),
(110,2):(55671,'59f7aed74e3563cb9e93eea3e47af088adb1a669be13b08ccffb51cb416a4445',23681,'d1156ca0891100b503bcfdee88903010762187a3daf8055a19cc25ee984d93e7'),
(110,3):(55672,'e448a69fc1d1f467da258d916b6e801be17b8580d3741ad7d710413a1901fa55',23682,'e2c46037532cdb16abb93ab345c6ed3d153829a111380e2facd5d735dcd68037'),
(111,1):(55673,'3a4d682591daf4ebbc3f1ba93035af9121552ea46a4fb46c112e1148736d1c16',23683,'6a9a67b8a0b960794d6477bae59756a86e779c6ba55d865682c818454b24566a'),
(111,2):(55674,'dbb69d50210a2d149aa39ec65ba1f578efe8b3012855c4ee6a5ea37a5fdf9304',23684,'53d78cf18c194078f15350208adaa067501b2baecb75e50eed6da8b672a5ac1c'),
(111,3):(55675,'98c26bb7fa7a920bca9ece212d45850097bd98595e9491f920afdfe1f4b956bc',23685,'5c4e2361d7c5046a023f53a96746074881f6ded4209d8ea4a604f2ebee3c8a9f'),
(111,4):(55676,'22fa4b8cc123a02e917e4d6f9acc6913f1baed8a06978e2a92ebdb5c40e6d2a2',23686,'36fe51c34508dbf7aa5ee8357f153d298f14b11e08ed31ace30d0f34f6f1e930'),
(111,5):(55677,'94cfb524361152414cd3053972e4747ef180ca31bdedd59fe6388fdc4e9b260e',23729,'2bb30a040b4ba22471a992eb7dafa81b39595f39684500a1b76bb8c9cb462bd0'),
(112,1):(55678,'83c014ce1254f8852217285d8afa8ecdfbab4ef3ea6405aad6201e5fac94d3be',23730,'9b8ed100791eb29e98c5acaca32f00a9ffe2978e56798e3045ef514bcb201877'),
(112,2):(55679,'80da7b5c353ac5842d43929b6cb961b7e78034b90d29d6799de93dd8c5f50d1c',23731,'9cdcc8820849c01d869157e778d1ea83ea0b80e0ec619d0d4d2c40336dcec4e6'),
(112,3):(55680,'adc23cebf8c4a41e1c65844997055f9e69cd5d5e8afc32955aa2698892b2f41b',23732,'10868eeb513b36e8a1025deac4e7ee49499fdcfdaad191e110041fdc23ee6cb1'),
(112,4):(55681,'b9c2ccbb843c081989e91b6fc6c83534c3d6c91cd19adce6dc0bdd1b68b78240',23733,'61a87d2bc2f461bd064f5f3b85abfcf420d1cbfa9ab1511819ee18d840d81afd'),
(113,1):(55682,'528cc4b0ac61a3b0531803e168425d53ad5fc7f6e87dea18796181bacfee6674',23713,'a4499a516943b2c93978312d5e4a661628d1db6772277071e0d96506c98bc0ac'),
(113,2):(55683,'638f193f8905e406a2379388058b4f630b6e4c5512473378683c3f3c9c37dfd6',23714,'fac7c5b92bfc855a69c24a671da1d1ab1cb1518f3299bfabd830afb750460e96'),
(113,3):(55684,'a1a2377271e40cd1c070436ad2a8a1e93454eecf91519d32bdf9ee4c07806ebd',23715,'d1df437d63aa8e757e767309890d872b7999640d53f717c939c36ad34861f5d0'),
(113,4):(55685,'71d4793e8bb19ed44c190deb0eb6edd288f0d74b720c885f8ac449918e54f964',23716,'433c0bee0e729468e128f0ec617814bac90eea34f11dd868b34d73e44a09af96'),
(113,5):(55686,'dee8896a202539a04e946c9a4cf6bf679add79da5a784525cf1095def3725709',23717,'df1b48d1558e960b328020ade63201f170da3142d9de989acea5c38961573447'),
(114,1):(55687,'40a01bc3688de048e608bfbae2e80ddd3e846eb565b7b17112078b3630151737',23718,'b8e84091835f154d76b279c73b774386931058d037ff92c371f9ac88fbb547fc'),
(114,2):(55692,'963f1c59e95b385649dd0b25ad7cd481c40468d697c01cc6a9a8d1acdacdc374',23719,'62a16e06b7b47b28795f10efe2dd907e1842d540282223a5c8487415acba8dcb'),
(114,3):(55688,'2b1a60dcb0fc85bf80bf4343e3addf94832f3e8b121d409ec9a28210de1d559a',23720,'be2cd32393054d19277b65a6dafdcc98fc6203822a32942c9880dc89b93e0019'),
(114,4):(55689,'e29abbe864dce30e90c885d8531bdf1622b74107b720b91e72fcb70d3769ab8d',23721,'eee7016e28de9d744826a0f9fb584a234a9f5122e7b81c342f86ce9803aea785'),
(114,5):(55690,'eef489ca714b6ebc5a95a667e6658bbf1135d5937354a8245d9af652c6cbfef7',23722,'2a272e0254fd15c2e466ca84e727374723266357099eb8d21a6de2857306b0fe'),
(114,6):(55691,'7b21ee2fc035b40be470a908b6ee6dbdbb37866e100ffbf1a9f29d90c9916b73',23723,'127fbcf51a9a61337cb138474c29f92ebe92c1ed383509807d29bb1b0025c6ca')}

ISSUES={
(110,3):(9.0,0,0.5,0.5,'No major source unit is omitted.','The Arabic says to glorify while accompanied by praise; the English adds a continuity nuance and also calls this the final surah, a characterization absent from the stored Arabic.','Limited additions/nuance shifts; central claims are preserved.'),
(111,1):(8.0,2,0,0,'The opening report is omitted: the Prophet calls his people, Abu Lahab answers “Perish you—was it for this that you called us?”, and the verse is then said to have been revealed.','No additional material meaning reversal identified in the retained portion.','The omission removes the immediate narrative setting for tabbat.'),
(111,3):(8.0,0,2,0,'No major source clause is omitted.','The Arabic makes the flaming fire the eventual outcome/fitting end of Abu Lahab’s kunya; the English instead says the statement is the source of his nickname, reversing the direction of the explanation.','The wordplay is noticed, but the causal/temporal relation is misstated.'),
(111,4):(9.5,0,0.5,0,'No material omission identified.','The thorny plant al-saʿdān is rendered loosely as “cactus”; the interpretive point about thorny material in the Prophet’s path remains intact.','Minor lexical approximation.'),
(112,1):(8.5,1.5,0,0,'The Arabic opening report that the Prophet was asked about his Lord and that the verse was then revealed is absent from the English entry.','No material mistranslation identified in the retained grammatical explanation.','The omission removes the stated narrative context, not the grammar.'),
(114,6):(8.5,0,0,1.5,'No material omission identified in the stored Arabic commentary.','No material meaning change identified in the shared commentary itself.','After “God knows best,” the English continues with closing formulae not present in the stored Arabic entry; this is source-text overrun/addition.')}

GENERIC_ACCURATE='The paired English preserves the material interpretive claims of the stored Arabic entry without a material fidelity defect identified in this review.'

def main():
    if not db.SUPABASE_SERVICE_KEY:
        raise RuntimeError('SUPABASE_SERVICE_KEY required; no writes attempted')
    q={'sura':'gte.110','and':'(sura.lte.114)','scholar_key':'eq.jalalayn','language':'in.(ar,en)','select':'id,sura,aya,language,content','limit':'1000'}
    src=db.sb_get('tafsir_entries',q)
    assert len(src)==46, f'Expected 46 source rows, found {len(src)}'
    byid={r['id']:r for r in src}
    out=[]
    for key,(arid,arhash,enid,enhash) in sorted(EXPECTED.items()):
        ar,en=byid[arid],byid[enid]
        assert (ar['sura'],ar['aya'],ar['language'])==(key[0],key[1],'ar')
        assert (en['sura'],en['aya'],en['language'])==(key[0],key[1],'en')
        assert hashlib.sha256(ar['content'].encode()).hexdigest()==arhash, f'Arabic source changed {key}'
        assert hashlib.sha256(en['content'].encode()).hexdigest()==enhash, f'English source changed {key}'
        score,cov,meaning,integrity,omitted,mistranslated,concerns=ISSUES.get(key,(10.0,0,0,0,'No material omission identified.','No material meaning change identified.','No separate source-text integrity concern identified.'))
        assert abs(score-(10-cov-meaning-integrity))<1e-9
        verdict='Faithful verse-level rendering.' if score==10 else f'Fidelity score {score:g}/10 after source-based deductions.'
        notes={'method':'Exact stored Arabic↔English verse-pair fidelity review; differences count in the grade; theology is not graded.','source_ids':{'ar':arid,'en':enid},'deductions':{'coverage':cov,'meaning':meaning,'text_integrity':integrity},'review_version':VERSION}
        out.append({'sura':key[0],'aya':key[1],'scholar_key':'jalalayn','accuracy_score':score,'accurate_portions':GENERIC_ACCURATE,'omitted_content':omitted,'mistranslated_sections':mistranslated,'theological_concerns':concerns,'verdict':verdict,'arabic_excerpt':ar['content'],'english_excerpt':en['content'],'reviewed_by':VERSION,'confidence_level':'high','notes':json.dumps(notes,ensure_ascii=False)})
    params={'sura':'gte.110','and':'(sura.lte.114)','scholar_key':'eq.jalalayn','select':'*','limit':'1000'}
    existing=db.sb_get('tafsir_accuracy_analysis',params)
    have={(r['sura'],r['aya']):r for r in existing}
    assert len(have)==len(existing), 'Duplicate existing Jalalayn fidelity rows'
    inserts=[]
    for row in out:
        key=(row['sura'],row['aya']); old=have.get(key)
        if old is None: inserts.append(row); continue
        assert old.get('reviewed_by')==VERSION, f'Existing non-project Jalalayn review at {key}; refusing overwrite'
        for f in ('accuracy_score','accurate_portions','omitted_content','mistranslated_sections','theological_concerns','verdict','arabic_excerpt','english_excerpt','reviewed_by','confidence_level','notes'):
            assert old.get(f)==row.get(f), f'Existing current row differs at {key} field {f}'
    if inserts:
        db.request_json(db.SUPABASE_URL+'/rest/v1/tafsir_accuracy_analysis',method='POST',body=inserts,headers={**db.SB_HEADERS,'Prefer':'return=minimal'})
    public={'apikey':db.SUPABASE_ANON_KEY,'Authorization':'Bearer '+db.SUPABASE_ANON_KEY}
    url=db.SUPABASE_URL+'/rest/v1/tafsir_accuracy_analysis?'+db.urllib.parse.urlencode(params,safe='(),.*:')
    saved=db.request_json(url,headers=public)
    assert len(saved)==23, f'Expected 23 public rows, found {len(saved)}'
    idx={(r['sura'],r['aya']):r for r in saved}
    for row in out:
        act=idx[(row['sura'],row['aya'])]
        assert act.get('reviewed_by')==VERSION and float(act.get('accuracy_score'))==float(row['accuracy_score'])
    print(f'JALALAYN_FIDELITY_OK source_rows=46 reviews=23 inserted={len(inserts)} anon_verified=23 average={sum(r["accuracy_score"] for r in out)/23:.2f}')

if __name__=='__main__': main()

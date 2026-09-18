#!/usr/bin/env python3
"""Hash-verified al-Sa'di Arabic↔English fidelity grades for Qur'an 110-114. No model calls."""
import hashlib, json
import batch_tafsir_accuracy as db

VERSION="last-five-saadi-fidelity-v1"
EXPECTED={
(110,1):(36315,"a74cc25d2e2f66e24c1f6c40da40138ccccf36859e0264b354f16bfb3c2c0e3d",48129,"6bb806e6377586e7bc3af07baf20df5dd66608db62dacef683b12b21248f5ea4"),
(110,2):(36316,"2f6aabb189d3857ffbd2f67babca029ce8d846088cf40a92473ec835c7778ad5",48130,"d46057a72047129aac44adae9c9d3ec6cd580040c43e638e943f3da5ef6e596f"),
(110,3):(36317,"ddad655d6f4861e1ced4848deb8f8ad60fb6a1d0e8761c60bdde73e05516a3a7",48131,"5b6ecd8ad988f9624f5d1a651c95db82375b14565204bc1bbec9e775f31e3446"),
(111,1):(36318,"3613cf339fb83b2865607808afaf19287f6edce9dbeb78103629126b7eb66762",48132,"d2e8f79fd22e7c202a5f60e680c9cd70c971d72ebafdae2a7f430cd65499a01c"),
(111,2):(36319,"4e1898921847acc8dd59593ee63b948951b7b193078b6ae183abf8a0d0ca184f",48133,"955d483f399c741a8be247ad74a2b1eb677f2a9db10e2b45b0a25ef3c4e43e01"),
(111,3):(36320,"b3ec395c0f9053779dd00b2ee02b3cedad47dd0481ab540f3070ba53f38c96d3",48134,"07754c500507ac234a186a847fdf7066123d77223bb905296078d634b1c22f75"),
(111,4):(36321,"6e1098eb914ac8281160956851f7acad59785c38701c1336f819c0a249111263",48135,"1fd34b05fc3bab2829484720b20d6759ada519a0e4e686a136a95a9ece12f3cd"),
(111,5):(36322,"b3b83803a27f8a389a915cb16bc957e8e4e17012a07864b8c82bc59e73d2a930",48136,"d992597f0864d7c775bd85b644830c9284d5daf49b652656ac1540ca572c1aad"),
(112,1):(36323,"fdfc4d060360978cfc2be4bb468e004edd5c5a0bfc1b27bd440d9e3f341800ef",48137,"68404831c162b4224e2daf253c5c5b92c94570a7aafa720b2c4062c7a243f96e"),
(112,2):(36324,"776b4c30d55b75a1c287f3a76637d349522ae8749bb518c22363939e8aa4ab43",48138,"301b364a3d2a8424bdb635257e533fdfafce8213c166313834cf4955da30e893"),
(112,3):(36325,"a22804cd11a015c7255fb6879ba4d069111347bb3d59bd303bc1b9b73a85eacd",48139,"2362b2bac15e0d6de90b033171835a4f9ee323ccff3ae80bec6280fdda72eb1d"),
(112,4):(36326,"ca186288fe826899054998da0eb4c32ffa9a29e3898d8ddda5cb4312234d2be9",48140,"6e5b34c662827f990646f2fd3a01ccefaddd494cdd969db43b21969333026689"),
(113,1):(36307,"36355998a37335c5e5bc025a5e9bcc93eb653c0284c5622d4dbbf6c3457a559f",48124,"f79131d02d50322dc26ee813deb59f9ad26049649f85df8d5d4de54a0ead279c"),
(113,2):(36308,"65f598bbe617fc14fd7b674b04accec1fcfd3f63ebc0f62536d8fbea0d7c5753",48125,"da8440381cf3c04250f45135e44d2dba272f799b37c51bb3a4c1580ba6201088"),
(113,3):(36309,"ae9cbf126caa44282fbc2c738335451ef13db9cc120bd4eecdd18e653060bf4e",48126,"f9caf3f418fb2e778d70ebec99a5ce26726de832a211c387080fb0faf77fcca9"),
(113,4):(36310,"4266a1dd6bddd9291175cfa892dd5e69b002045e9aab0750f9cfb69f4d2f4457",48127,"1719e4956806ecaa022a14aa4a19bf9e10566789f4ebcfd61029f86026f74cee"),
(113,5):(36328,"e7aea0d17a0975f9aa0de1ddf71c1a9e212a7b297a12a6662b5837c454bd3513",48141,"ce5116f69935d81753786f98b8f37ce6a8ec0f0a88b51f8496603b43afb9a90b"),
(114,1):(36329,"8b7af846180374e87867fb87a9b551c2c587ef9b395393749c27a0260a985540",48142,"97e929356886868b3ff78a5250b6f2ec7a78db0bdf1782db1420b9c09f126059"),
(114,2):(36330,"8b7af846180374e87867fb87a9b551c2c587ef9b395393749c27a0260a985540",48143,"7def4ba065b46cf5a85f6d3c31cfce4dc291e8a0e7b8d8253920d57acf9831b0"),
(114,3):(36331,"8b7af846180374e87867fb87a9b551c2c587ef9b395393749c27a0260a985540",48144,"4a5c761ac7adc4139a4fa4f1590761e29ebb80d984a55b0cd87c65e9de84f890"),
(114,4):(36332,"8b7af846180374e87867fb87a9b551c2c587ef9b395393749c27a0260a985540",48145,"16ddba50129802e1e4e43443be1e1c1a3d90735b1397b4e24f646ce11d1642c0"),
(114,5):(36333,"8b7af846180374e87867fb87a9b551c2c587ef9b395393749c27a0260a985540",48146,"26e51cc4e60a7fd864bba3413d0ae2acd19bcb6139699c6a229e8b539f0bfdbe"),
(114,6):(36335,"8dfa31bcf39c923918b873f2eea4906871999cc859f6bbd65c7760f3f1e9e7e1",48147,"d8c513561c70259b21a9161035f0deac637a040abb3197635c92882d3940b9dd")}

def main():
    if not db.SUPABASE_SERVICE_KEY:
        raise RuntimeError("SUPABASE_SERVICE_KEY required; no writes attempted")
    q={"sura":"gte.110","and":"(sura.lte.114)","scholar_key":"eq.saadi","language":"in.(ar,en)","select":"id,sura,aya,language,content","limit":"1000"}
    src=db.sb_get("tafsir_entries",q)
    assert len(src)==46, f"Expected 46 source rows, found {len(src)}"
    byid={r["id"]:r for r in src}; rows=[]
    for key,(arid,arhash,enid,enhash) in sorted(EXPECTED.items()):
        ar,en=byid[arid],byid[enid]
        assert (ar["sura"],ar["aya"],ar["language"])==(key[0],key[1],"ar")
        assert (en["sura"],en["aya"],en["language"])==(key[0],key[1],"en")
        assert hashlib.sha256(ar["content"].encode()).hexdigest()==arhash, f"Arabic source changed {key}"
        assert hashlib.sha256(en["content"].encode()).hexdigest()==enhash, f"English source changed {key}"
        if key==(111,1):
            score=9.5
            omitted="No material omission identified."
            mistranslated="The Arabic parenthetical قبحه الله is a condemnation such as 'may Allah disgrace/make him ugly'; the English renders it 'may Allah curse him,' which is stronger and not lexically equivalent."
            concerns="Minor meaning-strengthening in a parenthetical condemnation; the surrounding interpretation is preserved."
            deductions={"coverage":0,"meaning":0.5,"text_integrity":0}
        else:
            score=10.0
            omitted="No material omission identified in this stored verse pair."
            mistranslated="No material meaning change identified in this stored verse pair."
            concerns="No separate source-text integrity concern identified."
            deductions={"coverage":0,"meaning":0,"text_integrity":0}
        notes={"method":"Exact stored Arabic↔English verse-pair fidelity review; translation differences count in the grade; theology is not graded.","source_ids":{"ar":arid,"en":enid},"deductions":deductions,"review_version":VERSION}
        rows.append({"sura":key[0],"aya":key[1],"scholar_key":"saadi","accuracy_score":score,
          "accurate_portions":"The paired English preserves the material interpretive claims of the stored Arabic entry.",
          "omitted_content":omitted,"mistranslated_sections":mistranslated,"theological_concerns":concerns,
          "verdict":"Faithful verse-level rendering." if score==10 else f"Fidelity score {score:g}/10 after source-based deductions.",
          "arabic_excerpt":ar["content"],"english_excerpt":en["content"],"reviewed_by":VERSION,"confidence_level":"high","notes":json.dumps(notes,ensure_ascii=False)})
    params={"sura":"gte.110","and":"(sura.lte.114)","scholar_key":"eq.saadi","select":"*","limit":"1000"}
    existing=db.sb_get("tafsir_accuracy_analysis",params); have={(r["sura"],r["aya"]):r for r in existing}
    assert len(have)==len(existing), "Duplicate existing Saadi fidelity rows"
    inserts=[]
    for row in rows:
        key=(row["sura"],row["aya"]); old=have.get(key)
        if old is None: inserts.append(row); continue
        assert old.get("reviewed_by")==VERSION, f"Existing non-project Saadi review at {key}; refusing overwrite"
        assert float(old.get("accuracy_score"))==float(row["accuracy_score"]), f"Current score differs at {key}"
    if inserts:
        db.request_json(db.SUPABASE_URL+"/rest/v1/tafsir_accuracy_analysis",method="POST",body=inserts,headers={**db.SB_HEADERS,"Prefer":"return=minimal"})
    public={"apikey":db.SUPABASE_ANON_KEY,"Authorization":"Bearer "+db.SUPABASE_ANON_KEY}
    url=db.SUPABASE_URL+"/rest/v1/tafsir_accuracy_analysis?"+db.urllib.parse.urlencode(params,safe="(),.*:")
    saved=db.request_json(url,headers=public)
    assert len(saved)==23, f"Expected 23 public rows, found {len(saved)}"
    idx={(r["sura"],r["aya"]):r for r in saved}
    for row in rows:
        act=idx[(row["sura"],row["aya"])]
        assert act.get("reviewed_by")==VERSION and float(act.get("accuracy_score"))==float(row["accuracy_score"])
    print(f'SAADI_FIDELITY_OK source_rows=46 reviews=23 inserted={len(inserts)} anon_verified=23 average={sum(r["accuracy_score"] for r in rows)/23:.2f}')

if __name__=="__main__": main()

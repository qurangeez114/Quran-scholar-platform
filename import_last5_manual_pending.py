#!/usr/bin/env python3
"""Manual, no-AI completion for the eight final pending tafsir source entries."""
import json, os, urllib.parse, urllib.request, urllib.error

SB="https://ylosytbxpzxzwfzjpaej.supabase.co"
KEY=os.environ["SUPABASE_SERVICE_KEY"]
HDR={"apikey":KEY,"Authorization":"Bearer "+KEY,"Content-Type":"application/json"}
TAG="work-last5-v1:manual-v1"
WORK_ID={"tabari":1,"ibn_kathir":2}
OWN={"tabari":"al-Ṭabarī","ibn_kathir":"Ibn Kathīr"}

# (sura, aya, scholar, tafsir_entry_id, statement_en, speaker_name, position)
DATA=[
(110,3,"tabari",5036,"The command to glorify the Lord with praise means to magnify Him with praise and thanks for fulfilling His promise.","al-Ṭabarī","preferred"),
(110,3,"tabari",5036,"The surah signals that Muhammad will soon join his Lord and experience death as the messengers before him did.","al-Ṭabarī","preferred"),
(110,3,"tabari",5036,"Ibn ʿAbbās interpreted the surah as announcing Muhammad's appointed term and impending death.","Ibn ʿAbbās","reported_only"),
(110,3,"tabari",5036,"ʿĀʾishah reported that near his death the Prophet frequently glorified God, sought forgiveness, and repented in response to this surah.","ʿĀʾishah","reported_only"),
(110,3,"tabari",5036,"The Prophet said God had given him a sign in his community and commanded him, when he saw it, to glorify God with praise and seek forgiveness; he identified the sign with this surah.","Prophet Muhammad","reported_only"),
(110,3,"tabari",5036,"Umm Salama reported that late in his life the Prophet frequently said 'Glory be to Allah and praise be to Him' because he had been commanded to do so by this surah.","Umm Salama","reported_only"),
(110,3,"tabari",5036,"A report from ʿAṭāʾ b. Yasār says the whole surah was revealed in Medina after the conquest of Mecca and people's entry into Islam, and that it announced the Prophet's death.","ʿAṭāʾ b. Yasār","reported_only"),
(110,3,"tabari",5036,"Mujāhid interpreted the command to seek forgiveness in this context as indicating that the Prophet would die when these signs occurred.","Mujāhid","reported_only"),
(110,3,"tabari",5036,"Al-Ṭabarī explains 'seek His forgiveness' as asking God to forgive one's sins.","al-Ṭabarī","preferred"),

(111,4,"tabari",5279,"Al-Ṭabarī reads the verse as saying that Abu Lahab and his wife, the carrier of firewood, will enter a blazing fire.","al-Ṭabarī","preferred"),
(111,4,"tabari",5279,"Al-Ṭabarī prefers the nominative reading ḥammālatu al-ḥaṭab because he considers it more eloquent and supported by the authoritative reciters.","al-Ṭabarī","preferred"),
(111,4,"tabari",5279,"Ibn ʿAbbās reported that Abu Lahab's wife carried thorns and threw them in the Prophet's path to injure him and his companions.","Ibn ʿAbbās","reported_only"),
(111,4,"tabari",5279,"Mujāhid interpreted 'carrier of firewood' as describing Abu Lahab's wife as one who went about spreading gossip or slander.","Mujāhid","reported_only"),
(111,4,"tabari",5279,"Qatādah interpreted the phrase as referring to her carrying reports from one person to another, that is, tale-bearing.","Qatādah","reported_only"),
(111,4,"tabari",5279,"Another reported interpretation says she mocked the Prophet for poverty and literally gathered firewood, so she was reproached by being described as a carrier of firewood.","Unspecified earlier interpreters","reported_only"),
(111,4,"tabari",5279,"Al-Ṭabarī prefers the interpretation that she literally carried thorns and placed them in the Prophet's path because he regards it as the most apparent meaning.","al-Ṭabarī","preferred"),

(112,2,"tabari",5282,"Al-Ṭabarī introduces al-Ṣamad as the worshipped One for whom alone worship is proper.","al-Ṭabarī","preferred"),
(112,2,"tabari",5282,"Ibn ʿAbbās is reported to have interpreted al-Ṣamad as the One who has no cavity.","Ibn ʿAbbās","reported_only"),
(112,2,"tabari",5282,"Mujāhid interpreted al-Ṣamad as the solid One who has no cavity.","Mujāhid","reported_only"),
(112,2,"tabari",5282,"Al-Shaʿbī interpreted al-Ṣamad as the One who neither eats food nor drinks.","al-Shaʿbī","reported_only"),
(112,2,"tabari",5282,"ʿIkrimah interpreted al-Ṣamad as the One from whom nothing comes out, who neither begets nor is born.","ʿIkrimah","reported_only"),
(112,2,"tabari",5282,"Abū al-ʿĀliyah interpreted God's not begetting or being born as implying that He neither dies nor leaves an inheritance.","Abū al-ʿĀliyah","reported_only"),
(112,2,"tabari",5282,"Abū Wāʾil interpreted al-Ṣamad as the master whose supremacy has reached completion.","Abū Wāʾil","reported_only"),
(112,2,"tabari",5282,"Ibn ʿAbbās is reported to have described al-Ṣamad as the master complete in lordship, honor, greatness, forbearance, wealth, might, knowledge and wisdom, qualities belonging uniquely to God.","Ibn ʿAbbās","reported_only"),
(112,2,"tabari",5282,"Al-Ḥasan and Qatādah are reported to have interpreted al-Ṣamad as the One who remains after His creation; Qatādah also glossed it as the everlasting.","Qatādah","reported_only"),
(112,2,"tabari",5282,"Al-Ṭabarī prefers the established Arabic lexical sense of al-Ṣamad: the master to whom people turn and above whom there is no one.","al-Ṭabarī","preferred"),
(112,2,"tabari",5282,"Al-Ṭabarī says that if the report from Ibn Buraydah's father defining al-Ṣamad as having no cavity were authentic, it would take precedence because the Prophet best knew what God intended.","al-Ṭabarī","preferred"),

(113,1,"ibn_kathir",48390,"Jābir and Ibn ʿAbbās are reported to have interpreted al-Falaq as the morning or daybreak.","Jābir and Ibn ʿAbbās","reported_only"),
(113,1,"ibn_kathir",48390,"Mujāhid, Saʿīd b. Jubayr, al-Ḥasan, Qatādah, Ibn Zayd and others are also reported to have interpreted al-Falaq as the morning.","Multiple earlier exegetes","reported_only"),
(113,1,"ibn_kathir",48390,"Al-Qurazī, Ibn Zayd and Ibn Jarīr connected al-Falaq with Qur'an 6:96, 'the Cleaver of the daybreak.'","al-Qurazī, Ibn Zayd and Ibn Jarīr","reported_only"),
(113,1,"ibn_kathir",48390,"Ubayy b. Kaʿb reported that although Ibn Masʿūd did not record the two Muʿawwidhatayn in his codex, Ubayy affirmed that the Prophet had received their recitation from Jibrīl.","Ubayy b. Kaʿb","reported_only"),
(113,1,"ibn_kathir",48390,"A report from ʿUqbah b. ʿĀmir says the Prophet described al-Falaq and al-Nās as verses revealed that night unlike anything previously seen.","ʿUqbah b. ʿĀmir","reported_only"),
(113,1,"ibn_kathir",48390,"A report from ʿUqbah b. ʿĀmir says the Prophet taught al-Falaq and al-Nās as two of the best surahs people recite and instructed him to recite them when sleeping and waking.","ʿUqbah b. ʿĀmir","reported_only"),

(113,2,"ibn_kathir",48391,"Ibn Kathīr explains 'from the evil of what He created' as seeking refuge from the evil of all created things.","Ibn Kathīr","preferred"),
(113,2,"ibn_kathir",48391,"Thābit al-Bunānī and al-Ḥasan al-Baṣrī included Hell, Iblīs and his progeny among the created things whose evil is covered by the verse.","Thābit al-Bunānī and al-Ḥasan al-Baṣrī","reported_only"),

(113,3,"ibn_kathir",48392,"Mujāhid interpreted ghāsiq as the night and its waqūb as the setting of the sun.","Mujāhid","reported_only"),
(113,3,"ibn_kathir",48392,"Ibn ʿAbbās, al-Ḥasan, Qatādah and others interpreted the verse as referring to the night when it advances with its darkness.","Multiple earlier exegetes","reported_only"),
(113,3,"ibn_kathir",48392,"Al-Zuhrī interpreted the ghāsiq as the sun when it sets.","al-Zuhrī","reported_only"),
(113,3,"ibn_kathir",48392,"Abū Hurayrah is reported to have interpreted the ghāsiq as the star.","Abū Hurayrah","reported_only"),
(113,3,"ibn_kathir",48392,"Ibn Zayd related an Arab belief connecting ghāsiq with the decline of the Pleiades and changes in illness and plague.","Ibn Zayd","reported_only"),
(113,3,"ibn_kathir",48392,"Ibn Jarīr reports another interpretation identifying the ghāsiq with the moon; Ibn Kathīr cites a report in which the Prophet pointed to the rising moon and told ʿĀʾishah to seek refuge from its evil when it becomes dark.","Ibn Jarīr / ʿĀʾishah","reported_only"),

(113,4,"ibn_kathir",48393,"Mujāhid, ʿIkrimah, al-Ḥasan, Qatādah and al-Ḍaḥḥāk interpreted 'the blowers in knots' as witches.","Multiple earlier exegetes","reported_only"),
(113,4,"ibn_kathir",48393,"Mujāhid explained that the witches perform their spells by blowing into knots.","Mujāhid","reported_only"),
(113,4,"ibn_kathir",48393,"A report from ʿĀʾishah in al-Bukhārī says the Prophet was bewitched until he imagined that he had relations with his wives although he had not.","ʿĀʾishah","reported_only"),
(113,4,"ibn_kathir",48393,"The same bewitchment report identifies Labīd b. al-Aʿṣam as the person who performed the magic using a comb and hair placed in a well called Dharwān.","ʿĀʾishah","reported_only"),
(113,4,"ibn_kathir",48393,"An account cited from al-Thaʿlabī says the magical object contained twelve knotted points pierced with needles and that the knots came undone as verses of the two protective surahs were recited.","al-Thaʿlabī","reported_only"),
(113,4,"ibn_kathir",48393,"Ibn Kathīr explicitly warns that al-Thaʿlabī's expanded bewitchment account is transmitted without an isnād, contains strangeness, and that part of it is strongly objectionable, although some portions have supporting reports.","Ibn Kathīr","preferred"),

(113,5,"ibn_kathir",11041,"In a ruqyah report, Jibrīl invokes God's protection and cure from the evil of every envious person and from the evil eye.","Jibrīl","reported_only"),
(113,5,"ibn_kathir",11041,"The expanded account cited from al-Thaʿlabī likewise includes Jibrīl's prayer for healing from an envier and the evil eye, but Ibn Kathīr criticizes the account as lacking an isnād and containing objectionable material.","al-Thaʿlabī / Ibn Kathīr","reported_only"),
]

def req(url,method="GET",body=None,headers=None):
    data=None if body is None else json.dumps(body,ensure_ascii=False).encode()
    q=urllib.request.Request(url,data=data,method=method,headers=headers or HDR)
    try:
        with urllib.request.urlopen(q,timeout=90) as r:
            s=r.read().decode()
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code} {e.read().decode(errors='replace')[:1500]}") from e
    return json.loads(s) if s.strip() else None

def get(table,params):
    return req(f"{SB}/rest/v1/{table}?"+urllib.parse.urlencode(params,safe="(),.*:")) or []

def post(table,body):
    h=dict(HDR); h["Prefer"]="return=representation"
    return req(f"{SB}/rest/v1/{table}","POST",body,h)

def main():
    ids=sorted({x[3] for x in DATA})
    src=get("tafsir_entries",{"select":"id,sura,aya,scholar_key","id":f"in.({','.join(map(str,ids))})","limit":"100"})
    byid={r["id"]:r for r in src}
    expected={(s,a,sch,eid) for s,a,sch,eid,*_ in DATA}
    observed={(byid[eid]["sura"],byid[eid]["aya"],byid[eid]["scholar_key"],eid) for eid in ids if eid in byid}
    if expected != observed:
        raise SystemExit(f"SOURCE_ID_MISMATCH expected={sorted(expected)} observed={sorted(observed)}")

    existing=get("propositions",{"select":"id,tafsir_entry_id,statement_en","extracted_by":f"like.{TAG}%","limit":"1000"})
    have={(r["tafsir_entry_id"],r["statement_en"]):r["id"] for r in existing}
    inserted=skipped=0
    for s,a,sch,eid,statement,speaker,position in DATA:
        key=(eid,statement)
        if key in have:
            skipped+=1
            continue
        p=post("propositions",{
            "claim_type_id":43,
            "statement_en":statement,
            "extracted_by":f"{TAG}:{s}:{sch}",
            "speaker_type":"unspecified",
            "speaker_name":speaker,
            "assertion_mode":"explicit",
            "status":"active",
            "source_type":"tafsir_entry",
            "tafsir_entry_id":eid,
            "extraction_validity":"verified",
            "verification_state":"source_language_proposition_verified",
            "attribution_fidelity":"accurate_paraphrase",
            "quranic_textual_support":"not_stated",
            "mufassir_own_position":position
        })[0]
        pid=p["id"]
        own=(speaker==OWN[sch])
        post("proposition_voice_chain",{
            "proposition_id":pid,
            "reporting_work_id":WORK_ID[sch],
            "originating_voice_type":"exegete_own_view" if own else "named_earlier_exegete",
            "originating_voice_name":OWN[sch] if own else speaker
        })
        ev=post("evidence_units",{
            "unit_type":"single_named_attribution",
            "attributed_authority_name":speaker,
            "content_summary":statement,
            "independence_state":"unknown"
        })[0]
        post("proposition_evidence",{
            "proposition_id":pid,
            "evidence_unit_id":ev["id"],
            "semantic_link_note":"Manual no-AI completion from the linked tafsir entry.",
            "linked_by":TAG
        })
        inserted+=1

    rows=get("propositions",{"select":"id,tafsir_entry_id,statement_en","extracted_by":f"like.{TAG}%","limit":"1000"})
    pids=[r["id"] for r in rows]
    voices=get("proposition_voice_chain",{"select":"proposition_id","proposition_id":f"in.({','.join(map(str,pids))})" if pids else "eq.-1","limit":"1000"})
    linked={v["proposition_id"] for v in voices}
    missing=[r["id"] for r in rows if r["id"] not in linked]
    if len(rows)!=len(DATA) or missing:
        raise SystemExit(f"POSTFLIGHT_FAIL rows={len(rows)} expected={len(DATA)} voice_missing={len(missing)}")
    print(f"MANUAL_PENDING_OK inserted={inserted} skipped={skipped} propositions={len(rows)} voices={len(linked)} source_entries={len(ids)}")

if __name__=="__main__":
    main()

"""Hand-curated isnad routes + transmitter identities for the three pilot families (2026-11-04).
Routes were re-read from the full Arabic isnad stored in each member's text_arabic (sunnah.com text).
identity_status stays 'candidate' unless a cited public source names the person for THIS chain
('source_checked'). 'basis' explains why; 'sources' lists citable references. Nothing here is invented:
where no source was checked the identity is a proposal and says so."""
import json,os
P=os.path.join(os.path.dirname(__file__),'..','pilot')
SH_4922=[{'work':'Ibn Ḥajar, Fatḥ al-Bārī, on Bukhārī 4922 (via hadithunlocked.com)','url':'https://hadithunlocked.com/sharh/bukhari-ibnhajar/bukhari:4922'},
         {'work':'al-ʿAynī, ʿUmdat al-Qārī, on Bukhārī 4922: «ويحيى هو ابن موسى البلخي، أو يحيى بن جعفر»','url':'https://hdith.com/encyclopedia/book/b-43/h/399701'},
         {'work':'Minḥat al-Bārī (Zakariyyā al-Anṣārī) on 4922: «(يحيى) أي: ابن موسى البلخي، أو ابن أبي جعفر»','url':'https://shamela.ws/book/18106/4767'}]
SH_4924=[{'work':'al-Qasṭallānī, Irshād al-Sārī on Bukhārī 4924: «(حرب) هو ابن شداد ... (حدثنا يحيى) هو ابن أبي كثير»','url':'https://shamela.ws/book/21715/3220'},
         {'work':'Ibn Ḥajar, Fatḥ al-Bārī (Bāb wa-rabbaka fa-kabbir), quoted in Jamharat al-ʿUlūm: «من طريق حرب بن شدّادٍ أيضًا عن يحيى بن أبي كثيرٍ»','url':'https://jamharah.net/showthread.php?t=11477'}]
SH_MUSNADI=[{'work':'al-ʿAynī, ʿUmdat al-Qārī: «وعبد الله بن محمد هو المسندي» for the same link (ʿAbd Allāh b. Muḥammad ← ʿAbd al-Razzāq ← Maʿmar ← al-Zuhrī), Bukhārī Kitāb al-Marḍā','url':'https://hdith.com/encyclopedia/book/b-43/h/401083'}]
# ---- Family 1 identity review (keys unchanged; routes were already hand-built) ----
F1={
 'harb':dict(name='Ḥarb b. Shaddād',identity_status='source_checked',basis='Named by al-Qasṭallānī and Ibn Ḥajar for this exact chain (Bukhārī 4924).',sources=SH_4924),
 'yahya_ak':dict(name='Yaḥyā b. Abī Kathīr',identity_status='source_checked',basis='Explicit in Bukhārī 4922 and Muslim 161d; named "Yaḥyā" only in 4924, where al-Qasṭallānī identifies him as Ibn Abī Kathīr.',sources=SH_4924),
 'ab_muh':dict(name='ʿAbd Allāh b. Muḥammad al-Musnadī',identity_status='source_checked',basis='Bukhārī\'s teacher ʿAbd Allāh b. Muḥammad ← ʿAbd al-Razzāq ← Maʿmar is identified as al-Musnadī by al-ʿAynī; the citation is on a parallel hadith with the identical link, not on 4925/4956/6982 themselves.',sources=SH_MUSNADI),
 'yahya_b':dict(name='Yaḥyā (b. Mūsā al-Balkhī or b. Jaʿfar al-Bīkandī; unresolved)',identity_status='candidate',basis='The commentators themselves give two candidates; hdith.com\'s isnad tool picks Yaḥyā b. Jaʿfar, which is an editorial choice, not a resolution. Both are reliable (thiqa) Bukhārī teachers, so the chain assessment is unaffected.',sources=SH_4922),
 'ibnbukayr':dict(identity_status='candidate',basis='Explicit "Yaḥyā b. Bukayr" in Bukhārī 3, 4925, 6982. In 4953 only "Yaḥyā ← al-Layth ← ʿUqayl ← Ibn Shihāb" appears; identification with Ibn Bukayr rests on the identical chain in 4925/3 (internal corroboration, no commentary quote checked).',sources=[{'work':'sunnah.com Bukhārī 3 (explicit name)','url':'https://sunnah.com/bukhari:3'},{'work':'sunnah.com Bukhārī 4953','url':'https://sunnah.com/bukhari:4953'}]),
 'abdallah_m':dict(name='ʿAbd Allāh (proposed: ʿAbd Allāh b. al-Mubārak)',identity_status='candidate',basis='Salmawayh ← "ʿAbd Allāh" ← Yūnus b. Yazīd (Bukhārī 4953). Ibn al-Mubārak is the usual Marwazī teacher of Salmawayh from Yūnus, but no commentary quote for 4953 was checked.',sources=[{'work':'sunnah.com Bukhārī 4953','url':'https://sunnah.com/bukhari:4953'}]),
}
# ---- Families 2 & 3: curated routes (replace auto-extracted chunks) ----
T={ # key: (display name, arabic pattern, role, basis)
 'hudba':('Hudba b. Khālid','هدبه بن خالد','collector_teacher','explicit'),
 'hammam':('Hammām b. Yaḥyā','همام بن يحيي|همام','follower','explicit in 3887; "Hammām" alone in 3207 with same teacher Hudba'),
 'qatada':('Qatāda b. Diʿāma','قتاده','successor','short form "Qatāda"; nasab not in text'),
 'anas':('Anas b. Mālik','انس بن مالك|انس|ابن مالك','companion','explicit; in Bukhārī 7517 only "Ibn Mālik" (Sharīk ← Anas)'),
 'malik_sasaa':('Mālik b. Ṣaʿṣaʿa','مالك بن صعصعه','companion','explicit'),
 'ibnbukayr':('Yaḥyā b. Bukayr','يحيي بن بكير','collector_teacher','explicit'),
 'layth':('al-Layth b. Saʿd','الليث','follower','short form'),
 'yunus':('Yūnus b. Yazīd al-Aylī','يونس','follower','short form; explicit "Yūnus b. Yazīd" in Ibn Mājah 1399'),
 'zuhri':('Muḥammad b. Muslim Ibn Shihāb al-Zuhrī','ابن شهاب|الزهري','successor','short form'),
 'abudharr':('Abū Dharr al-Ghifārī','ابو ذر','companion','kunya'),
 'abdan':('ʿAbdān (ʿAbd Allāh b. ʿUthmān al-Marwazī)','عبدان','collector_teacher','laqab; expansion is the standard one, not source-checked here'),
 'ibnmubarak':('ʿAbd Allāh (proposed: Ibn al-Mubārak)','عبد الله','follower','"ʿAbd Allāh" after ʿAbdān; proposal only'),
 'ahmad_salih':('Aḥmad b. Ṣāliḥ al-Miṣrī','احمد بن صالح','collector_teacher','explicit name; nisba not in text'),
 'anbasa':('ʿAnbasa b. Khālid','عنبسه','follower','short form; proposal'),
 'khalifa':('Khalīfa b. Khayyāṭ','خليفه','collector_teacher','short form; proposal'),
 'yazid_zuray':('Yazīd b. Zurayʿ','يزيد بن زريع','follower','explicit'),
 'said_aruba':('Saʿīd b. Abī ʿArūba','سعيد بن ابي عروبه|سعيد','follower','explicit in Tirmidhī 3346; "Saʿīd" alone in Bukhārī 3207 / Muslim 164a (proposal)'),
 'hisham_dast':('Hishām al-Dastuwāʾī','هشام الدستوائي|هشام','follower','explicit in Nasāʾī 448; "Hishām" alone in Bukhārī 3207 (proposal)'),
 'shayban':('Shaybān b. Farrūkh','شيبان بن فروخ','collector_teacher','explicit'),
 'hammad_salama':('Ḥammād b. Salama','حماد بن سلمه','follower','explicit'),
 'thabit':('Thābit al-Bunānī','ثابت البناني','successor','explicit'),
 'harmala':('Ḥarmala b. Yaḥyā al-Tujībī','حرمله بن يحيي','collector_teacher','explicit (al-Tujībī in Muslim, al-Miṣrī in Ibn Mājah: same man, proposal)'),
 'ibnwahb':('ʿAbd Allāh b. Wahb','ابن وهب|عبد الله بن وهب','follower','explicit'),
 'ibnmuthanna':('Muḥammad b. al-Muthannā','محمد بن المثني','collector_teacher','explicit'),
 'ibnabiadi':('Ibn Abī ʿAdī (Muḥammad b. Ibrāhīm)','ابن ابي عدي','follower','kunya-name; expansion is a proposal'),
 'yaqub_ibrahim':('Yaʿqūb b. Ibrāhīm al-Dawraqī','يعقوب بن ابراهيم','collector_teacher','explicit name; nisba proposal'),
 'yahya_qattan':('Yaḥyā b. Saʿīd al-Qaṭṭān','يحيي بن سعيد','follower','explicit name; al-Qaṭṭān is a proposal (teacher of Yaʿqūb from Hishām)'),
 'yunus_abdala':('Yūnus b. ʿAbd al-Aʿlā','يونس بن عبد الاعلي','collector_teacher','explicit'),
 'amr_hisham':('ʿAmr b. Hishām','عمرو بن هشام','collector_teacher','explicit'),
 'makhlad':('Makhlad (b. Yazīd al-Ḥarrānī, proposal)','مخلد','follower','short form'),
 'said_abdaziz':('Saʿīd b. ʿAbd al-ʿAzīz al-Tanūkhī','سعيد بن عبد العزيز','follower','explicit name'),
 'yazid_abimalik':('Yazīd b. Abī Mālik','يزيد بن ابي مالك','successor','explicit'),
 'ibnbashshar':('Muḥammad b. Bashshār (Bundār)','محمد بن بشار','collector_teacher','explicit'),
 'ghundar':('Muḥammad b. Jaʿfar (Ghundar, proposal)','محمد بن جعفر','follower','explicit name; laqab is a proposal'),
 'abdaziz_abdallah':('ʿAbd al-ʿAzīz b. ʿAbd Allāh al-Uwaysī','عبد العزيز بن عبد الله','collector_teacher','explicit name; nisba proposal'),
 'sulayman_bilal':('Sulaymān (proposed: b. Bilāl)','سليمان','follower','short form; proposal'),
 'sharik':('Sharīk b. ʿAbd Allāh b. Abī Namir','شريك بن عبد الله','successor','explicit name; nasab proposal'),
 # family 3
 'ibnabishayba':('Abū Bakr b. Abī Shayba','ابو بكر بن ابي شيبه','collector_teacher','explicit'),
 'abumuawiya':('Abū Muʿāwiya (Muḥammad b. Khāzim al-Ḍarīr)','ابو معاويه','follower','kunya'),
 'waki':('Wakīʿ b. al-Jarrāḥ','وكيع','follower','short form'),
 'amash':('Sulaymān al-Aʿmash','الاعمش','successor','laqab'),
 'ali_muhammad':('ʿAlī b. Muḥammad (al-Ṭanāfisī, proposal)','علي بن محمد','collector_teacher','explicit name; nisba proposal'),
 'ibrahim_nakhai':('Ibrāhīm al-Nakhaʿī','ابراهيم','successor','short form; proposal (standard al-Aʿmash ← Ibrāhīm ← al-Aswad)'),
 'aswad':('al-Aswad b. Yazīd','الاسود','successor','short form'),
 'aisha':('ʿĀʾisha bint Abī Bakr','عائشه','companion','explicit'),
 'israil':('Isrāʾīl b. Yūnus','اسرائيل','follower','short form'),
 'abuishaq':('Abū Isḥāq al-Sabīʿī','ابي اسحاق','successor','kunya; proposal'),
 'arqam':('al-Arqam b. Shuraḥbīl','الارقم بن شرحبيل','successor','explicit'),
 'ibnabbas':('ʿAbd Allāh b. ʿAbbās','ابن عباس','companion','explicit'),
 'nasr_ali':('Naṣr b. ʿAlī al-Jahḍamī','نصر بن علي الجهضمي','collector_teacher','explicit'),
 'abdallah_dawud':('ʿAbd Allāh b. Dāwūd al-Khuraybī','عبد الله بن داود','follower','explicit name (nisba proposal); was missing from the auto-extracted route of Ibn Mājah 1234'),
 'salama_nubayt':('Salama b. Nubayṭ','سلمه بن نبيط','follower','explicit'),
 'nuaym':('Nuʿaym b. Abī Hind','نعيم بن ابي هند','successor','explicit'),
 'nubayt':('Nubayṭ b. Sharīṭ','نبيط بن شريط','companion','explicit'),
 'salim_ubayd':('Sālim b. ʿUbayd','سالم بن عبيد','companion','explicit'),
 'yahya_yahya':('Yaḥyā b. Yaḥyā al-Naysābūrī','يحيي بن يحيي','collector_teacher','explicit name'),
 'musaddad':('Musaddad b. Musarhad','مسدد','collector_teacher','short form'),
 'ibnrafi':('Muḥammad b. Rāfiʿ','محمد بن رافع','collector_teacher','explicit'),
 'abd_humayd':('ʿAbd b. Ḥumayd','عبد بن حميد','collector_teacher','explicit'),
 'abdrazzaq':('ʿAbd al-Razzāq al-Ṣanʿānī','عبد الرزاق','follower','short form'),
 'mamar':('Maʿmar b. Rāshid','معمر','follower','short form'),
 'hamza':('Ḥamza b. ʿAbd Allāh b. ʿUmar','حمزه بن عبد الله','successor','explicit'),
 'ibnumar':('ʿAbd Allāh b. ʿUmar','ابيه','companion','"ʿan abīhi" after Ḥamza b. ʿAbd Allāh [b. ʿUmar] (Bukhārī 682)'),
 'husayn_ali':('Ḥusayn b. ʿAlī al-Juʿfī','حسين بن علي|حسين','follower','explicit in Muslim 420; "Ḥusayn" alone in Bukhārī 678 (proposal: same)'),
 'zaida':('Zāʾida b. Qudāma','زائده','follower','short form'),
 'abdmalik_umayr':('ʿAbd al-Malik b. ʿUmayr','عبد الملك بن عمير','successor','explicit'),
 'abuburda':('Abū Burda b. Abī Mūsā','ابي برده|ابو برده','successor','explicit in Bukhārī 3385'),
 'abumusa':('Abū Mūsā al-Ashʿarī','ابي موسي|عن ابيه','companion','explicit, or "ʿan abīhi" after Abū Burda b. Abī Mūsā (Bukhārī 3385; was missing from the auto route)'),
 'umar_hafs':('ʿUmar b. Ḥafṣ b. Ghiyāth','عمر بن حفص بن غياث','collector_teacher','explicit'),
 'hafs_ghiyath':('Ḥafṣ b. Ghiyāth','ابي','follower','"ḥaddathanī abī" from ʿUmar b. Ḥafṣ b. Ghiyāth'),
 'ishaq_nasr':('Isḥāq b. Naṣr','اسحاق بن نصر','collector_teacher','explicit'),
 'ay_yusuf':('ʿAbd Allāh b. Yūsuf al-Tinnīsī','عبد الله بن يوسف','collector_teacher','explicit name'),
 'malik_anas':('Mālik b. Anas','مالك بن انس|مالك','follower','explicit or short form'),
 'hisham_urwa':('Hishām b. ʿUrwa','هشام بن عروه','successor','explicit'),
 'urwa':('ʿUrwa b. al-Zubayr','عن ابيه|عروه بن الزبير','successor','explicit (3384) or "ʿan abīhi" after Hishām b. ʿUrwa'),
 'yahya_sulayman':('Yaḥyā b. Sulaymān al-Juʿfī','يحيي بن سليمان','collector_teacher','explicit name; nisba proposal'),
 'ismail_abiuways':('Ismāʿīl (proposed: b. Abī Uways)','اسماعيل','collector_teacher','short form; proposal (Bukhārī\'s usual "Ismāʿīl ← Mālik")'),
 'rabi_yahya':('al-Rabīʿ b. Yaḥyā al-Baṣrī','الربيع بن يحيي','collector_teacher','explicit'),
 'ibnala':('Muḥammad b. al-ʿAlāʾ','محمد بن العلاء','collector_teacher','explicit'),
 'ishaq_musa':('Isḥāq b. Mūsā al-Anṣārī','اسحاق بن موسي','collector_teacher','explicit (auto chunk had "حدثنا" fused into the name)'),
 'maan':('Maʿn b. ʿĪsā','معن','follower','short form; proposal'),
 'qutayba':('Qutayba b. Saʿīd','قتيبه بن سعيد','collector_teacher','explicit'),
 'badal':('Badal b. al-Muḥabbar','بدل بن المحبر','collector_teacher','explicit'),
 'shuba':('Shuʿba b. al-Ḥajjāj','شعبه','follower','short form'),
 'sad_ibrahim':('Saʿd b. Ibrāhīm','سعد بن ابراهيم','successor','explicit'),
}
R={ # reference -> routes (taḥwīl ح splits into separate routes)
 'bukhari:3887':[['hudba','hammam','qatada','anas','malik_sasaa']],
 'bukhari:7517':[['abdaziz_abdallah','sulayman_bilal','sharik','anas']],
 'bukhari:349':[['ibnbukayr','layth','yunus','zuhri','anas','abudharr']],
 'bukhari:3342':[['abdan','ibnmubarak','yunus','zuhri','anas','abudharr'],['ahmad_salih','anbasa','yunus','zuhri','anas','abudharr']],
 'bukhari:3207':[['hudba','hammam','qatada','anas','malik_sasaa'],['khalifa','yazid_zuray','said_aruba','qatada','anas','malik_sasaa'],['khalifa','yazid_zuray','hisham_dast','qatada','anas','malik_sasaa']],
 'muslim:162a':[['shayban','hammad_salama','thabit','anas']],
 'muslim:163':[['harmala','ibnwahb','yunus','zuhri','anas','abudharr']],
 'muslim:164a':[['ibnmuthanna','ibnabiadi','said_aruba','qatada','anas','malik_sasaa']],
 'nasai:448':[['yaqub_ibrahim','yahya_qattan','hisham_dast','qatada','anas','malik_sasaa']],
 'nasai:449':[['yunus_abdala','ibnwahb','yunus','zuhri','anas']],
 'nasai:450':[['amr_hisham','makhlad','said_abdaziz','yazid_abimalik','anas']],
 'ibnmajah:1399':[['harmala','ibnwahb','yunus','zuhri','anas']],
 'tirmidhi:3346':[['ibnbashshar','ghundar','said_aruba','qatada','anas','malik_sasaa'],['ibnbashshar','ibnabiadi','said_aruba','qatada','anas','malik_sasaa']],
 'ibnmajah:1232':[['ibnabishayba','abumuawiya','amash','ibrahim_nakhai','aswad','aisha'],['ibnabishayba','waki','amash','ibrahim_nakhai','aswad','aisha'],['ali_muhammad','waki','amash','ibrahim_nakhai','aswad','aisha']],
 'ibnmajah:1235':[['ali_muhammad','waki','israil','abuishaq','arqam','ibnabbas']],
 'ibnmajah:1234':[['nasr_ali','abdallah_dawud','salama_nubayt','nuaym','nubayt','salim_ubayd']],
 'muslim:418f':[['ibnabishayba','abumuawiya','amash','ibrahim_nakhai','aswad','aisha'],['ibnabishayba','waki','amash','ibrahim_nakhai','aswad','aisha'],['yahya_yahya','abumuawiya','amash','ibrahim_nakhai','aswad','aisha']],
 'bukhari:712':[['musaddad','abdallah_dawud','amash','ibrahim_nakhai','aswad','aisha']],
 'muslim:418e':[['ibnrafi','abdrazzaq','mamar','zuhri','hamza','aisha'],['abd_humayd','abdrazzaq','mamar','zuhri','hamza','aisha']],
 'muslim:420':[['ibnabishayba','husayn_ali','zaida','abdmalik_umayr','abuburda','abumusa']],
 'bukhari:664':[['umar_hafs','hafs_ghiyath','amash','ibrahim_nakhai','aswad','aisha']],
 'bukhari:678':[['ishaq_nasr','husayn_ali','zaida','abdmalik_umayr','abuburda','abumusa']],
 'bukhari:679':[['ay_yusuf','malik_anas','hisham_urwa','urwa','aisha']],
 'bukhari:682':[['yahya_sulayman','ibnwahb','yunus','zuhri','hamza','ibnumar']],
 'bukhari:716':[['ismail_abiuways','malik_anas','hisham_urwa','urwa','aisha']],
 'bukhari:7303':[['ismail_abiuways','malik_anas','hisham_urwa','urwa','aisha']],
 'bukhari:3385':[['rabi_yahya','zaida','abdmalik_umayr','abuburda','abumusa']],
 'nasai:833':[['ibnala','abumuawiya','amash','ibrahim_nakhai','aswad','aisha']],
 'tirmidhi:3672':[['ishaq_musa','maan','malik_anas','hisham_urwa','urwa','aisha']],
 'bukhari:713':[['qutayba','abumuawiya','amash','ibrahim_nakhai','aswad','aisha']],
 'bukhari:3384':[['badal','shuba','sad_ibrahim','urwa','aisha']],
}
def run():
    f=os.path.join(P,'beginning-of-revelation.json');d=json.load(open(f,encoding='utf8'))
    for k,v in F1.items(): d['transmitters'][k].update(v)
    for k,t in d['transmitters'].items(): t.setdefault('basis','name as written in the isnad; identity not source-checked'); t.setdefault('sources',[])
    json.dump(d,open(f,'w',encoding='utf8'),ensure_ascii=False,indent=1)
    for slug in ['isra-wal-miraj','final-illness-abu-bakr-prayer']:
        f=os.path.join(P,slug+'.json');d=json.load(open(f,encoding='utf8'))
        used=set()
        for m in d['members']:
            m['isnad_routes']=R[m['verified_reference']];used|={k for r in m['isnad_routes'] for k in r}
            m['isnad_note']=(m.get('isnad_note') or '')
            if m['isnad_note'].startswith('isnad not segmented'): m['isnad_note']=''
        d['transmitters']={k:dict(name=T[k][0],arabic_pattern=T[k][1],role=T[k][2],identity_status='candidate',basis=T[k][3],sources=[{'work':'sunnah.com isnad as stored','url':'https://sunnah.com/'+m['verified_reference']} for m in d['members'] if any(k in r for r in m['isnad_routes'])][:3]) for k in sorted(used)}
        d['isnad_method']='hand-curated from the full Arabic isnad (2026-11-04); taḥwīl (ح) split into routes; identities are candidate proposals unless a source is cited'
        json.dump(d,open(f,'w',encoding='utf8'),ensure_ascii=False,indent=1)
        print(slug,len(d['members']),'members',len(d['transmitters']),'transmitters')
if __name__=='__main__': run()

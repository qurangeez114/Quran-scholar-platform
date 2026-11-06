"""Batch-3 family specs (2026-11-05): man kadhaba ʿalayya (lying about the Prophet) and man raʾānī fī l-manām (seeing the Prophet in a dream).
Membership hand-scoped from corpus phrase searches; branches assigned by hand per record; every member must match sunnah.com text at ratio>=0.95."""
import json,sys,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from build_family import build,norm
import build_family as BF
BF.COL['Ahmed']='ahmad'; BF.S.setdefault('ahmad',{})
def load(p): return {r['id']:r for r in json.load(open(p))}
C1='../data/cand_kadhib.json'; r1=load(C1)
K={82462:'zubayr',85423:'zubayr',85437:'zubayr',85567:'zubayr',100258:'zubayr',84525:'uthman',84636:'ali',85107:'ali',119508:'ali',
   85568:'anas',109843:'anas',100254:'anas',85569:'salama',85570:'abu_hurayra',91422:'abu_hurayra',109844:'abu_hurayra',100256:'abu_hurayra',
   86709:'mughira',109845:'mughira',88775:'ibn_amr',118439:'ibn_amr',100252:'ibn_masud',118025:'ibn_masud',118429:'ibn_masud',
   100255:'jabir',100257:'abu_qatada',100259:'abu_said',109797:'abu_said',118734:'ibn_abbas'}
KM={'zubayr':['للزبير','لابي الزبير بن العوام'],'uthman':['عثمان بن عفان'],'ali':['عن علي، رضي','حدثنا علي بن ابي طالب','عن علي،'],'anas':['انس بن مالك','قال انس'],'salama':['عن سلمه'],
    'abu_hurayra':['ابي هريره'],'mughira':['المغيره'],'ibn_amr':['عبد الله بن عمرو'],'ibn_masud':['بن مسعود'],'jabir':['عن جابر'],'abu_qatada':['ابي قتاده'],'abu_said':['ابي سعيد'],'ibn_abbas':['ابن عباس']}
def form(n):
    for v,ph in (('kadhaba_mutaammidan','من كذب علي متعمدا'),('taammada_kadhiban','من تعمد علي كذبا'),('qala_ma_lam_aqul','ما لم اقل'),('kadhaba','من كذب علي')):
        if ph in n: return {'value':v,'lexical':True,'evidence':ph}
    return None
kadhib=dict(slug='lying-about-the-prophet',title='"Whoever Lies About Me Deliberately" (man kadhaba ʿalayya)',title_ar='من كذب عليّ متعمداً فليتبوأ مقعده من النار',narrative_group_id=None,family_type='statement',
 scope='Reports of the warning "whoever lies about me (deliberately), let him take his seat in the Fire", including the variant "whoever says about me what I did not say". Classically counted as mutawātir; here 13 companions in the six books and Musnad Aḥmad. Other hadith that merely share the ending "let him take his seat in the Fire" (standing for a man, false lineage, false oath, seeking knowledge for other than Allah, speaking about the Qurʾān without knowledge, lying about a dream) are different statements and excluded.',
 cands=C1,members=K,markers=KM,
 branches={'zubayr':'al-Zubayr b. al-ʿAwwām','uthman':'ʿUthmān b. ʿAffān','ali':'ʿAlī b. Abī Ṭālib','anas':'Anas b. Mālik','salama':'Salama b. al-Akwaʿ','abu_hurayra':'Abū Hurayra','mughira':'al-Mughīra b. Shuʿba','ibn_amr':'ʿAbd Allāh b. ʿAmr','ibn_masud':'ʿAbd Allāh b. Masʿūd','jabir':'Jābir b. ʿAbd Allāh','abu_qatada':'Abū Qatāda','abu_said':'Abū Saʿīd al-Khudrī','ibn_abbas':'Ibn ʿAbbās'},
 P={'k01_fire':('Let him take his seat in the Fire',['فليتبوا مقعده من النار'],None),
  'k02_form':('Wording of the offence',['من كذب علي','من تعمد علي كذبا','ما لم اقل'],form),
  'k03_deliberate':('"Deliberately" (mutaʿammidan / taʿammada) is stated',['متعمدا','تعمد'],None),
  'k04_narrator_doubt':('Narrator doubts the word "deliberately"',['حسبته قال متعمدا','احسبه قال'],None),
  'k05_reticence':('Companion explains why he narrates little',['ما يمنعك','ليمنعني','ما يمنعني','لا اسمعك','ما لك لا تحدث','ما لي لا اسمعك'],None),
  'k06_not_like_others':('"Lying about me is not like lying about anyone else"',['ليس ككذب علي احد'],None),
  'k07_convey':('"Convey from me even one verse" / "narrate from me, no harm"',['بلغوا عني','وحدثوا عني'],None),
  'k08_quran':('Linked warning about speaking on the Qurʾān by opinion',['في القران برايه'],None),
  'k09_names':('"Use my name, not my kunya" + dream clause (Abū Ḥuṣayn ← Abū Ṣāliḥ)',['ولا تكتنوا بكنيتي'],None)},
 excluded=[{'hadith_corpus_canonical_id':i,'reason':why,'relationship':'unrelated'} for i,why in ((84041,'Different statement: standing for a man'),(118530,'Different statement: standing for a man'),(88819,'Different statement: false lineage'),(98202,'Different statement: false oath at the pulpit'),(100480,'Different statement: knowledge for other than Allah'),(118425,'Different statement: knowledge for other than Allah'),(118733,'Different statement: speaking on the Qurʾān without knowledge'),(85120,'Different statement: lying about a dream'))],
 default=['bukhari:107','muslim:3','abudawud:3651'],probe={**{i:['ahmad:%d'%k for k in range(n,n+45)] for i,n in ((84525,439),(84636,550))},**{i:['ahmad:%d'%k for k in range(n+30,n+110)] for i,n in ((85107,1021),(85423,1337),(85437,1351))}},abridged_below=150)
C2='../data/cand_dream.json'; r2=load(C2)
D={83835:'abu_hurayra',85570:'abu_hurayra',91422:'abu_hurayra',92195:'abu_hurayra',99780:'abu_hurayra',108241:'abu_hurayra',108242:'abu_hurayra',
   92196:'anas',99779:'ibn_masud',118044:'ibn_masud',99781:'jabir',108245:'jabir',108246:'jabir',99782:'abu_said',99783:'abu_juhayfa',99784:'ibn_abbas'}
DM={'abu_hurayra':['ابي هريره','ابا هريره'],'anas':['عن انس'],'ibn_masud':['عن عبد الله'],'jabir':['جابر'],'abu_said':['ابي سعيد'],'abu_juhayfa':['عون بن ابي جحيفه، عن ابيه'],'ibn_abbas':['ابن عباس']}
def seen(n):
    for v,ph in (('saw_me','فقد راني'),('will_see_awake','فسيراني في اليقظه'),('as_if_awake','فكانما راني في اليقظه')):
        if ph in n: return {'value':v,'lexical':True,'evidence':ph}
    return None
dream=dict(slug='seeing-the-prophet-in-a-dream',title='"Whoever Sees Me in a Dream Has Seen Me"',title_ar='من رآني في المنام فقد رآني',narrative_group_id=None,family_type='statement',
 scope='Reports that whoever sees the Prophet in a dream has truly seen him because Satan cannot take his form. Seven companions in the six books. The clause also appears inside the Abū Ḥuṣayn ← Abū Ṣāliḥ ← Abū Hurayra composite (Bukhārī 110 / 6197), shared with the lying-about-the-Prophet family.',
 cands=C2,members=D,markers=DM,
 branches={'abu_hurayra':'Abū Hurayra','anas':'Anas b. Mālik','ibn_masud':'ʿAbd Allāh b. Masʿūd','jabir':'Jābir b. ʿAbd Allāh','abu_said':'Abū Saʿīd al-Khudrī','abu_juhayfa':'Abū Juḥayfa','ibn_abbas':'Ibn ʿAbbās'},
 P={'d01_seen':('Consequence of seeing him',['فقد راني','فسيراني في اليقظه','فكانما راني في اليقظه'],seen),
  'd02_satan':('Satan cannot take his form',['الشيطان لا يتمثل','للشيطان ان يتمثل','الشيطان لا يتخيل','للشيطان ان يتشبه','الشيطان لا يستطيع ان يتمثل','يتمثل الشيطان بي'],None),
  'd03_awake':('Mentions waking (al-yaqaẓa)',['اليقظه'],None),
  'd04_narrator_doubt':('Narrator is unsure between two wordings ("aw")',['او لكانما'],None),
  'd05_one_of_46':('Believer\u2019s dream is one of 46 parts of prophecy',['سته واربعين جزءا'],None),
  'd06_names':('"Use my name, not my kunya" + lying clause (composite)',['ولا تكتنوا بكنيتي'],None),
  'd07_dont_tell_bad':('Do not tell others when Satan plays with you in a dream',['بتلعب الشيطان'],None),
  'd08_ibn_sirin':('Ibn Sīrīn: "if he sees him in his (true) form"',['اذا راه في صورته'],None)},
 excluded=[],default=['bukhari:6993','muslim:2266a','tirmidhi:2276'],probe={83835:['abudawud:%d'%k for k in range(5015,5032)]},abridged_below=150)
if __name__=='__main__':
    out=sys.argv[1] if len(sys.argv)>1 else '/workspace/qsp-hce/hadith-engine/pilot/'
    for sp in (kadhib,dream):
        fam=build(sp); refs={m['verified_reference'] for m in fam['members']}
        fam['default_selection']=[r for r in sp['default'] if r in refs] or [m['verified_reference'] for m in fam['members'][:3]]
        json.dump(fam,open(out+sp['slug']+'.json','w'),ensure_ascii=False,indent=1)
        print('==',sp['slug'],len(fam['members']),'unverified',fam.get('unverified'),fam['default_selection'])

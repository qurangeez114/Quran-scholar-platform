"""Batch-2 family specs (2026-11-05): niyya, five pillars, farewell-pilgrimage sanctity sermon.
Membership hand-scoped from corpus phrase searches; every member must match sunnah.com text at ratio>=0.95."""
import json,sys,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from build_family import build,norm
from specs import pick_branch
import build_family as BF
BF.COL['Ahmed']='ahmad'; BF.S.setdefault('ahmad',{})
def load(p): return {r['id']:r for r in json.load(open(p))}
# ---- 1. Actions are by intentions ----
C1='../data/cand_niyya.json'; r1=load(C1)
O1=[('umar',['عمر بن الخطاب','سمعت عمر','عن عمر'])]
def niy_form(n):
    if 'انما الاعمال بالنيات' in n: return {'value':'innama_al_amal_bil_niyyat','lexical':True}
    if 'انما الاعمال بالنيه' in n: return {'value':'innama_al_amal_bil_niyya','lexical':True}
    if 'العمل بالنيه' in n: return {'value':'al_amal_bil_niyya','lexical':True}
    if 'الاعمال بالنيه' in n: return {'value':'al_amal_bil_niyya_pl','lexical':True}
    return None
niyya=dict(slug='actions-by-intentions',title='"Actions Are Only by Intentions" (ḥadīth al-niyya)',title_ar='إنما الأعمال بالنيات',narrative_group_id=None,family_type='statement',
 scope='All reports in the six books and Musnad Aḥmad of ʿUmar\u2019s sermon report "actions are by intentions … whoever emigrates for worldly gain or a woman". A famous gharīb (single-strand) hadith up to Yaḥyā b. Saʿīd al-Anṣārī; a test case for common-link analysis. 40 Nawawī, Riyāḍ al-Ṣāliḥīn and Mishkāt copies are derivative and excluded.',
 cands=C1,members={i:'umar' for i in r1},markers=dict(O1),branches={'umar':'ʿUmar b. al-Khaṭṭāb ← ʿAlqama ← Muḥammad b. Ibrāhīm ← Yaḥyā b. Saʿīd'},
 P={'n01_intentions':('Actions are (only) by intention(s)',['الاعمال بالنيه','الاعمال بالنيات','العمل بالنيه'],niy_form),
  'n02_each_person':('Each person has only what he intended',['لكل امرئ ما نوي','لامرئ ما نوي'],None),
  'n03_hijra_allah':('Whoever\u2019s hijra is to Allah and His Messenger, his hijra is to Allah and His Messenger',['فهجرته الي الله ورسوله'],None),
  'n04_hijra_dunya':('Hijra for worldly gain',['دنيا يصيبها','لدنيا يصيبها','الي دنيا'],None),
  'n05_woman':('Hijra to marry a woman',['امراه ينكحها','امراه يتزوجها','امراه'],None),
  'n06_pulpit':('ʿUmar said it while preaching / on the pulpit',['علي المنبر','يخطب'],None)},
 excluded=[{'hadith_corpus_canonical_id':i,'reason':'Later compilation quoting Bukhārī/Muslim; derivative','relationship':'derivative'} for i in (68870,36391,77730,76512)]+[{'hadith_corpus_canonical_id':1,'reason':'Duplicate corpus row of Bukhārī 1 (id 85461 used)','relationship':'duplicate'}],
 default=['bukhari:1','muslim:1907a','abudawud:2201'],probe={84248:['ahmad:%d'%n for n in range(160,176)],84370:['ahmad:%d'%n for n in range(280,306)]},abridged_below=250)
# ---- 2. Islam is built on five ----
C2='../data/cand_pillars.json'; r2=load(C2)
O2=[('ibn_umar',['ابن عمر','قال عبد الله'])]
def order(n):
    i=n.find('بني الاسلام'); s=n[i:i+400]
    pos={k:min([x for x in (s.find(v) for v in vs) if x>=0] or [-1]) for k,vs in (('hajj',['الحج','حج البيت']),('sawm',['صوم رمضان','صيام رمضان']))}
    pos={k:v for k,v in pos.items() if v>=0}
    if 'hajj' in pos and 'sawm' in pos: return {'value':'sawm_before_hajj' if pos['sawm']<pos['hajj'] else 'hajj_before_sawm','exclusive':True}
    return None
pillars=dict(slug='islam-built-on-five',title='"Islam Is Built on Five" (the five pillars)',title_ar='بني الإسلام على خمس',narrative_group_id=None,family_type='statement',
 scope='Reports of Ibn ʿUmar\u2019s "Islam is built on five". Includes contextual versions (Bukhārī 4312 / Nasāʾī on a man urging Ibn ʿUmar to fight) as complementary. The Jibrīl hadith is a different family. 40 Nawawī, Riyāḍ, Mishkāt and Shīʿī-collection parallels are out of scope for this pilot.',
 cands=C2,members={i:'ibn_umar' for i in r2},markers=dict(O2),branches={'ibn_umar':'ʿAbd Allāh b. ʿUmar'},
 P={'p01_built_on_five':('Islam is built on five',['بني الاسلام علي خمس'],None),
  'p02_shahada':('Testimony that there is no god but Allah (and Muḥammad is His Messenger)',['شهاده ان لا اله الا الله','ان يوحد الله','يعبد الله','الايمان بالله'],None),
  'p03_salat':('Establishing prayer',['اقام الصلاه','اقامه الصلاه'],None),
  'p04_zakat':('Paying zakāt',['ايتاء الزكاه','الزكاه'],None),
  'p05_sawm':('Fasting Ramaḍān',['صوم رمضان','صيام رمضان'],None),
  'p06_hajj':('Ḥajj',['الحج','حج البيت'],None),
  'p07_order':('Order of fasting and ḥajj',['الحج','حج البيت'],order),
  'p08_correction':('Ibn ʿUmar corrects a listener on the order ("no: fasting Ramaḍān and ḥajj")',['لا صيام رمضان','هكذا سمعته'],None)},
 excluded=[{'hadith_corpus_canonical_id':i,'reason':'Later compilation or out-of-scope collection','relationship':'derivative'} for i in (68872,72087,36393)],
 default=['bukhari:8','muslim:16a','tirmidhi:2609'],probe={},abridged_below=200)
# ---- 3. Farewell pilgrimage: sanctity of blood, wealth and honour ----
C3='../data/cand_farewell.json'; r3=load(C3)
O3=[('abu_bakra',['ابي بكره','ابو بكره',' بكره']),('jabir',['جابر بن عبد الله']),('ibn_abbas',['ابن عباس']),('ibn_umar',['ابن عمر','قال عبد الله']),('amr_ahwas',['عمرو بن الاحوص']),('abu_said',['ابي سعيد'])]
def which_day(n):
    import re as _re
    for v,ph in (('nahr','يوم النحر'),('hajj_akbar','يوم الحج الاكبر'),('arafa','عرفه'),('mina','بمني')):
        m=_re.search(r'(?:^|\s)(?:ب|و|ل)?'+ph+r'(?:\s|$)',n)
        if m: return {'value':v,'lexical':True,'evidence':ph}
    return None
farewell=dict(slug='farewell-pilgrimage-sanctity',title='Farewell Pilgrimage Sermon: "Your Blood and Your Wealth Are Sacred"',title_ar='خطبة حجة الوداع: إن دماءكم وأموالكم عليكم حرام',narrative_group_id=None,family_type='event',
 scope='Reports of the Farewell Pilgrimage sermon(s) containing "your blood and wealth (and honour) are sacred to you like the sanctity of this day of yours". Multiple companions (Abū Bakra, Ibn ʿAbbās, Ibn ʿUmar, Jābir, ʿAmr b. al-Aḥwaṣ, Abū Saʿīd). Jābir\u2019s long ḥajj narrative is complementary (one sermon element among many). Which day (ʿArafa vs. the Day of Sacrifice at Minā) is reported differently: a candidate harmonisation is that the theme was repeated, not a contradiction.',
 cands=C3,members={i:pick_branch(norm(r3[i]['text_arabic']),O3) for i in r3},markers=dict(O3),
 branches={'abu_bakra':'Abū Bakra (Nufayʿ b. al-Ḥārith)','jabir':'Jābir b. ʿAbd Allāh','ibn_abbas':'Ibn ʿAbbās','ibn_umar':'Ibn ʿUmar','amr_ahwas':'ʿAmr b. al-Aḥwaṣ','abu_said':'Abū Saʿīd al-Khudrī'},
 P={'w01_sanctity':('Blood and wealth are sacred like this day',['كحرمه يومكم هذا'],None),
  'w02_honour':('Honour (aʿrāḍ) is named with blood and wealth',['اعراضكم'],None),
  'w03_questions':('He asks "which day / month / land is this?"',['اي يوم هذا','اتدرون اي يوم'],None),
  'w04_day':('Day / place named',['يوم النحر','يوم الحج الاكبر','بمني','عرفه'],which_day),
  'w05_convey':('"Let the present convey to the absent"',['ليبلغ الشاهد الغائب','فليبلغ الشاهد'],None),
  'w06_no_kufr':('"Do not revert after me to disbelief, striking each other\u2019s necks"',['لا ترجعوا بعدي'],None),
  'w07_time_cycle':('Time has come round as on the day of creation',['الزمان قد استدار'],None),
  'w08_have_i_conveyed':('"Have I conveyed?" / "O Allah, bear witness"',['هل بلغت','اللهم اشهد'],None),
  'w09_riba_blood_jahiliyya':('Usury and blood-claims of Jāhiliyya abolished',['ربا الجاهليه','دم ربيعه','دماء الجاهليه'],None),
  'w10_women':('Counsel about women',['في النساء','بالنساء خيرا'],None),
  'w11_camel':('He sat on his camel (someone holding its rein)',['قعد علي بعيره','علي بعيره'],None)},
 excluded=[],default=['bukhari:67','bukhari:1739','muslim:1679a'],override={'tirmidhi:2159':'amr_ahwas'},probe={10540:['muslim:1218'],17057:['abudawud:%d'%n for n in range(1903,1909)],33263:['ibnmajah:%d'%n for n in range(3072,3078)],98934:['ibnmajah:%d'%n for n in range(3050,3060)],118871:['tirmidhi:%d'%n for n in range(3083,3092)]},abridged_below=400)
if __name__=='__main__':
    out=sys.argv[1] if len(sys.argv)>1 else '/workspace/qsp-hce/hadith-engine/pilot/'
    for sp in (niyya,pillars,farewell):
        fam=build(sp); refs={m['verified_reference'] for m in fam['members']}
        fam['default_selection']=[r for r in sp['default'] if r in refs] or [m['verified_reference'] for m in fam['members'][:3]]
        json.dump(fam,open(out+sp['slug']+'.json','w'),ensure_ascii=False,indent=1)
        print('==',sp['slug'],len(fam['members']),'unverified',fam.get('unverified'),'mismatch',sum(m['url_mismatch'] for m in fam['members']),fam['default_selection'])

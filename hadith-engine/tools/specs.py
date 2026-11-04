import json,re
from build_family import build,norm
ORD=[('السماء الدنيا',1),('السماء الثانيه',2),('السماء الثالثه',3),('السماء الرابعه',4),('السماء الخامسه',5),('السماء السادسه',6),('السماء السابعه',7)]
OW={'الثانيه':2,'الثالثه':3,'الرابعه':4,'الخامسه':5,'السادسه':6,'السابعه':7}
def heaven(name):
    ORDS='|'.join(OW)
    def f(n):
        if 'كيف منازلهم' in n and name!='ابراهيم': return None
        m=re.search(name+r'\s+(?:عليه السلام\s+)?في\s+(?:السماء\s+)?('+ORDS+')',n)
        if m: return {'value':'heaven_%d'%OW[m.group(1)],'exclusive':True,'evidence_rule':'name-in-ordinal'}
        m=re.search(r'في\s+(?:السماء\s+)?('+ORDS+r')\s+(?:\S+\s+){0,2}?'+name,n)
        if m: return {'value':'heaven_%d'%OW[m.group(1)],'exclusive':True,'evidence_rule':'ordinal-then-name'}
        if 'كيف منازلهم' in n: return None
        toks=[(mm.start(),OW.get(mm.group(1),1)) for mm in re.finditer('('+ORDS+'|السماء الدنيا)',n)]
        for i,(q,k) in enumerate(toks):
            end=min(q+260, toks[i+1][0] if i+1<len(toks) else len(n))
            if name in n[q:end]: return {'value':'heaven_%d'%k,'exclusive':True,'evidence_rule':'met-after-ordinal'}
        return None
    return f
def step(n):
    m=re.search(r'(?:فوضع|فحط|فوضعها|وضع|فحطها)\s+(?:الله\s+)?(?:عني\s+|عنهم\s+)?(عشرا|خمسا|شطرها)',n)
    return {'value':{'عشرا':'ten','خمسا':'five','شطرها':'half'}[m.group(1)],'evidence':m.group(0)} if m else None
def pick_branch(n,order):
    head=n[:600]
    for b,ms in order:
        if any(m in head for m in ms): return b
    return order[-1][0]
C='../data/cand_isra.json'; rows={r['id']:r for r in json.load(open(C))}
IM=[3902,7543,85805,88664,88534,102789,102793,102794,110382,110383,110384,97276,119130]
IORD=[('malik_sasaa',['مالك بن صعصعه']),('abu_dharr',['ابو ذر','ابي ذر','ابا ذر']),('anas',['انس بن مالك','انسا','انس'])]
isra=dict(slug='isra-wal-miraj',title="The Night Journey and Ascension (al-Isrāʾ wa-l-Miʿrāj)",title_ar='الإسراء والمعراج',narrative_group_id=2,family_type='event',
 scope='Full or partial narrations of the ascension through the heavens ending in the reduction of fifty prayers to five. Single-episode fragments (milk and wine, Moses praying in his grave, cupping) are out of scope for this pilot.',
 cands=C,members={i:pick_branch(norm(rows[i]['text_arabic']),IORD) for i in IM},markers=dict(IORD),
 branches={'malik_sasaa':'Anas ← Mālik b. Ṣaʿṣaʿa','abu_dharr':'Anas ← Abū Dharr','anas':'Anas (direct)'},
 P={'i01_start_hatim':('Journey begins at al-Ḥaṭīm / al-Ḥijr',['الحطيم','في الحجر'],None),
  'i02_sleep_wake':('He was between sleeping and waking',['بين النائم واليقظان'],None),
  'i03_roof_opened':('The roof of his house was opened (Mecca)',['فرج سقف بيتي','فرج عن سقف'],None),
  'i04_chest_washed':('Chest opened, heart washed with Zamzam',['زمزم'],None),
  'i05_buraq':('Mount (al-Burāq / a white beast)',['البراق','بدابه'],None),
  'i06_jerusalem':('Jerusalem (Bayt al-Maqdis) is named',['بيت المقدس'],None),
  'i07_before_revelation':('Said to occur before he received revelation',['قبل ان يوحي اليه'],None),
  'i08_idris':('Heaven in which Idrīs is met',['ادريس'],heaven('ادريس')),
  'i09_harun':('Heaven in which Hārūn is met',['هارون'],heaven('هارون')),
  'i10_musa':('Heaven in which Mūsā is met',['موسي'],heaven('موسي')),
  'i11_ibrahim':('Heaven in which Ibrāhīm is met',['ابراهيم'],heaven('ابراهيم')),
  'i12_yusuf':('Heaven in which Yūsuf is met',['يوسف'],heaven('يوسف')),
  'i13_sidra':('Sidrat al-Muntahā',['سدره المنتهي'],None),
  'i14_fifty_prayers':('Fifty prayers imposed, reduced to five',['خمسين صلاه'],None),
  'i15_reduction_step':('Size of each reduction',['شطرها','عشرا','خمسا'],step),
  'i16_rivers':('The Nile and Euphrates rivers',['النيل والفرات'],None),
  'i17_milk_wine':('Choice of milk over wine',['اللبن'],None),
  'i18_positions_unspecified':('Narrator says the prophets\u2019 stations were not fixed',['كيف منازلهم'],None)},
 excluded=[{'hadith_corpus_canonical_id':r['id'],'reason':'Phrase hit ("%s") but a single-episode fragment or commentary; out of pilot scope'%r['hits'][0],'relationship':'related_fragment'} for r in rows.values() if r['id'] not in IM],
 default=['bukhari:3887','bukhari:7517','muslim:162a'],probe={i:['muslim:%d%s'%(n,l) for n in (162,163,164,165) for l in 'abcde'] for i in (102789,102793,102794)}|{102793:['muslim:163','muslim:162b','muslim:162c','muslim:163a','muslim:163b'],97276:['ibnmajah:%d'%n for n in range(1395,1406)],119130:['tirmidhi:%d'%n for n in range(3340,3352)]},abridged_below=1200)
C2='../data/cand_ill.json'; rows2={r['id']:r for r in json.load(open(C2))}
FM=[i for i in rows2 if i!=78182]
FORD=[('aisha',['عائشه']),('salim_b_ubayd',['سالم بن عبيد']),('abu_musa',['ابي موسي','ابو موسي']),('ibn_umar',['عن ابيه','ابن عمر']),('ibn_abbas',['ابن عباس']),('hamza_mursal',['حمزه بن عبد الله'])]
def men(n):
    if 'العباس' in n and 'علي' in n: return {'value':'abbas_and_ali','exclusive':True}
    if 'بريره' in n: return {'value':'barira_and_nuba','exclusive':True}
    return None
def obj(n):
    v='asif' if 'اسيف' in n else 'raqiq' if 'رقيق' in n else 'weeping'
    return {'value':v,'lexical':True}
ill=dict(slug='final-illness-abu-bakr-prayer',title="The Prophet's Final Illness: Abū Bakr Leads the Prayer",title_ar='مرض النبي ﷺ وإمامة أبي بكر',narrative_group_id=None,family_type='event',
 scope='Reports from the final illness in which the Prophet orders that Abū Bakr lead the prayer. Riyāḍ al-Ṣāliḥīn 1670 is a later compilation quoting these and is excluded as derivative. Related narrative group 17 (age at death) concerns a different question and is not merged.',
 cands=C2,members={i:pick_branch(norm(rows2[i]['text_arabic']),FORD) for i in FM},markers=dict(FORD),
 branches={'aisha':'ʿĀʾisha','abu_musa':'Abū Mūsā al-Ashʿarī','ibn_umar':'Ibn ʿUmar','ibn_abbas':'Ibn ʿAbbās','hamza_mursal':'Ḥamza b. ʿAbd Allāh (mursal)','salim_b_ubayd':'Sālim b. ʿUbayd'},override={'muslim:420':'abu_musa','bukhari:678':'abu_musa','ibnmajah:1235':'ibn_abbas','ibnmajah:1234':'salim_b_ubayd','bukhari:682':'ibn_umar'},
 P={'f01_order':('Order: "Tell Abū Bakr to lead the people"',['مروا ابا بكر','مري ابا بكر','مروه'],None),
  'f02_objection':('Objection: Abū Bakr is tender-hearted / weeps',['اسيف','رقيق','البكاء'],obj),
  'f03_suggest_umar':('Suggestion that ʿUmar lead instead',['امرت عمر','فمر عمر'],None),
  'f04_hafsa':('Ḥafṣa is asked to repeat the objection',['حفصه'],None),
  'f05_sawahib_yusuf':('"You are the companions of Yūsuf"',['صواحب يوسف','صواحبات يوسف'],None),
  'f06_aisha_motive':('ʿĀʾisha states her real motive (people would see it as an ill omen)',['يتشاءم'],None),
  'f07_came_out_supported':('He came out supported between two men',['بين رجلين','يهادي'],None),
  'f08_men_named':('Who supported him',['بين رجلين','يهادي'],men),
  'f09_sat_beside':('He sat beside Abū Bakr',['جنب ابي بكر','يسار ابي بكر','الي جنبه'],None),
  'f10_abubakr_followed':('Abū Bakr followed the Prophet\u2019s prayer; people followed Abū Bakr',['يقتدي','ياتم','يصلي بصلاه'],None),
  'f11_bilal':('Bilāl calls him to prayer',['بلال'],None)},
 excluded=[{'hadith_corpus_canonical_id':78182,'reason':'Riyāḍ al-Ṣāliḥīn quotes the Bukhārī/Muslim report; derivative','relationship':'derivative'}],
 default=['bukhari:664','muslim:418f','ibnmajah:1235'],probe={i:['ibnmajah:%d'%n for n in range(1228,1240)] for i in (97109,97111,97112)}|{100906:['malik/9/%d'%n for n in range(80,96)]},abridged_below=500)
if __name__=='__main__':
    for sp in (isra,ill):
        fam=build(sp); refs={m['verified_reference'] for m in fam['members']}
        fam['default_selection']=[r for r in sp['default'] if r in refs] or [m['verified_reference'] for m in fam['members'][:3]]
        json.dump(fam,open('/workspace/qsp-hce/hadith-engine/pilot/%s.json'%sp['slug'],'w'),ensure_ascii=False,indent=1)
        print(sp['slug'],len(fam['members']),'mismatch',sum(m['url_mismatch'] for m in fam['members']))

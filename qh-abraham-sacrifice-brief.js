/* QuranHikma: Qur'an 37:101–113, sacrificial-son textual arguments.
 * Editorial data only. Classical scholars' dated positions live in Supabase's
 * classical_tafsir_positions, not here or in the pre-Islamic source table. */
(function(){
  'use strict';
  function tag(name,text,cls){
    const e=document.createElement(name);
    if(text!=null)e.textContent=String(text);
    if(cls)e.className=cls;
    return e;
  }
  function link(text,href){
    const a=tag('a',text);
    a.href=href;
    if(/^https:\/\//.test(href)){a.target='_blank';a.rel='noopener noreferrer';}
    return a;
  }
  function p(text,cls){return tag('p',text,cls);}
  const quranText=[
    {cite:'37:101',arabic:'فَبَشَّرْنَاهُ بِغُلَامٍ حَلِيمٍ',english:'Good news of a forbearing boy (ghulām ḥalīm). The son is not named here.',url:'/index.html?sura=37&aya=101'},
    {cite:'37:102–107',arabic:'إِنِّي أَرَىٰ فِي الْمَنَامِ أَنِّي أَذْبَحُكَ',english:'Abraham reports a dream, the son responds, and a great sacrifice ransoms him. These verses do not say Isaac or Ishmael.',url:'/index.html?sura=37&aya=102'},
    {cite:'37:112',arabic:'وَبَشَّرْنَاهُ بِإِسْحَاقَ نَبِيًّا مِنَ الصَّالِحِينَ',english:'Isaac is named only after the ransom episode, with news that he will be a prophet. Scholars disputed whether this is a separate birth-announcement or a later announcement of prophethood.',url:'/index.html?sura=37&aya=112'},
    {cite:'11:71',arabic:'فَبَشَّرْنَاهَا بِإِسْحَاقَ وَمِنْ وَرَاءِ إِسْحَاقَ يَعْقُوبَ',english:'Sarah receives the named promise of Isaac and, after Isaac, Jacob. The implication for the sacrifice is debated.',url:'/index.html?sura=11&aya=71'},
    {cite:'15:53 / 51:28',arabic:'إِنَّا نُبَشِّرُكَ بِغُلَامٍ عَلِيمٍ',english:'The angelic announcement describes a knowledgeable boy (ghulām ʿalīm). The same phrase is at 15:53 and 51:28 — not 51:53–54. Interpreting this as Isaac relies on the broader narrative.',url:'/index.html?sura=15&aya=53'}
  ];
  const argumentsCompared=[
    {
      side:'Argument for Ishmael',
      heading:'Two successive annunciations',
      claim:'The narrative first introduces an unnamed boy, completes the sacrifice episode, and then announces Isaac in 37:112. Ibn Taymiyyah and Ibn Kathīr argue that these are distinct sons, with the first identified as Ishmael.',
      limit:'The sequence alone does not explicitly call the first boy Ishmael. It is an exegetical inference, and other commentators understand the announcement in 37:112 as concerning Isaac’s prophethood rather than first birth.',
      source:'Ibn Taymiyyah, Majmūʿ al-Fatāwā, vol. 4, pp. 331–336',
      href:'https://www.islamweb.org/ar/library/content/22/421/'
    },
    {
      side:'Argument for Isaac',
      heading:'The same son, two kinds of good news',
      claim:'Al-Ṭabarī identifies the unnamed boy with Isaac, already announced elsewhere in the Qur’an. He interprets 37:112 as renewed news of Isaac’s future prophetic status after the trial, not the birth of a second child.',
      limit:'This reading supplies a named identity through commentary and cross-references, not through the wording of 37:102–107. Al-Ṭabarī’s preference is Isaac, even though he transmits both sets of reports.',
      source:'Al-Ṭabarī, Jāmiʿ al-Bayān, 37:107',
      href:'https://tafsir.app/tabari/37/107'
    },
    {
      side:'Argument for Ishmael',
      heading:'Ḥalīm compared with ʿalīm',
      claim:'37:101 says ghulām ḥalīm (forbearing boy), whereas 15:53 and 51:28 describe a ghulām ʿalīm (knowledgeable boy). Ibn Taymiyyah treats these different descriptions as supporting different sons.',
      limit:'Neither adjective is a proper name. Linguistic contrast is not a direct identification, and “knowledgeable boy” refers to Isaac by narrative interpretation, not by a name in these exact phrases.',
      source:'Ibn Taymiyyah, Majmūʿ al-Fatāwā, vol. 4, pp. 333–334',
      href:'https://www.islamweb.org/ar/library/content/22/421/'
    },
    {
      side:'Evidence classification',
      heading:'Makkah, Mina, geography and Israʾīliyyāt',
      claim:'Some Muslim commentators argue from the Kaaba, rites around Mina, and reports about the horns of the substitute ram. Others appeal to Genesis 22, which explicitly names Isaac. Claims of Jewish or Christian influence appear in later exegetical polemics.',
      limit:'Sacred geography and reported objects are not themselves archaeological proof of which son was intended. The label Israʾīliyyāt denotes a proposed transmission category, not a demonstrated borrowing pathway for each report.',
      source:'Al-Baghawī, Maʿālim al-Tanzīl 37:102',
      href:'https://quran.ksu.edu.sa/tafseer/baghawy/sura37-aya102.html'
    }
  ];
  function render(host){
    if(!host)return;
    host.replaceChildren();
    const summary=tag('div',null,'qh-sacr-summary');
    summary.append(
      tag('h3','The precise question is what the Qur’an says — and what commentators infer'),
      p('The account of the attempted sacrifice in 37:101–111 does not name the son. Different interpretations use the later mention of Isaac, the order of the narrative, other Qur’anic announcements and transmitted reports. These need to be compared separately rather than labeled an uncontested consensus.')
    );
    host.append(summary);
    const textHeading=tag('h3','Scriptural passages used in the debate','qh-sacr-subhead');
    host.append(textHeading);
    const verses=tag('div',null,'qh-sacr-verse-grid');
    quranText.forEach(v=>{
      const card=tag('article',null,'qh-sacr-verse');
      const heading=tag('h4');
      heading.append(link('Qur’an '+v.cite+' ↗',v.url));
      card.append(heading);
      const ar=tag('p',v.arabic,'qh-sacr-ar');ar.lang='ar';ar.dir='rtl';card.append(ar);
      card.append(p(v.english));
      verses.append(card);
    });
    host.append(verses);
    host.append(tag('h3','Competing arguments — and their limitations','qh-sacr-subhead'));
    const grid=tag('div',null,'qh-sacr-grid');
    argumentsCompared.forEach(a=>{
      const card=tag('article',null,'qh-sacr-argument');
      card.append(tag('span',a.side,'qh-sacr-category'));
      card.append(tag('h4',a.heading));
      card.append(p(a.claim));
      const l=p('Limitation: '+a.limit,'qh-sacr-limit');card.append(l);
      const ref=tag('div',null,'qh-sacr-ref');
      ref.append(link(a.source+' ↗',a.href));card.append(ref);
      grid.append(card);
    });
    host.append(grid);
    const context=tag('aside',null,'qh-sacr-context');
    context.append(tag('h3','Modern lecture used as a research guide, not as the primary text'));
    const ext=tag('p');
    ext.append(link('Yasir Qadhi — Library Chats E7 (2020)', 'https://www.youtube.com/watch?v=CANtmlGngiw'));
    context.append(ext);
    context.append(p('The lecture’s title and date have been checked. A full video transcript was not available, so details of the lecture supplied by readers remain secondary leads until checked against the relevant manuscripts, original tafsir passages and hadith chains. The commentator timeline below contains source-attributed records, not an assertion that every Companion or Successor personally held the reported view.'));
    host.append(context);
  }
  window.QHAbrahamSacrifice={render};
})();

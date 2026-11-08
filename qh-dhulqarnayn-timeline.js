/* QuranHikma | Dhul-Qarnayn: dated scholarly interpretations of Qur'an 18:83.
   Source-specific attributions; scholarly disagreement is not textual change.
   Rendered inside Al-Kahf Sources and the Stories research dossier. */
(function () {
  'use strict';
  const ENTRIES = [
    {
      year: 767, dates: 'c. 700–767 CE', scholar: 'Muqātil ibn Sulaymān',
      work: 'Tafsīr Muqātil ibn Sulaymān, on Qur’an 18:83',
      stance: 'alexander', stanceLabel: 'Identifies Alexander',
      position: 'His commentary glosses Dhul-Qarnayn as Alexander, using the expression “al-Iskandar Qayṣar.”',
      arabic: 'يعني الإسكندر قيصر',
      reasoning: 'He associates the title with reaching the eastern and western extremities. The gloss does not name the earlier book or person from which he learned the identification.',
      source: 'https://quran-tafsir.net/moqatel/sura18-aya83.html',
      sourceLabel: 'Read Muqātil’s Arabic tafsīr'
    },
    {
      year: 923, dates: '839–923 CE', scholar: 'Al-Ṭabarī',
      work: 'Jāmiʿ al-Bayān, on Qur’an 18:94',
      stance: 'reports', stanceLabel: 'Transmits Alexander identification',
      position: 'Preserves an account attributed to Wahb ibn Munabbih naming Dhul-Qarnayn Alexander. He also preserves an alternative name, Marzabān ibn Mardaba the Greek, in a report through Ibn Isḥāq.',
      arabic: 'وَكَانَ اسْمُهُ الْإِسْكَنْدَرَ',
      reasoning: 'This is an earlier report quoted in al-Ṭabarī’s tafsīr, not his own unequivocal identification. The Alexander report is transmitted through Ibn Isḥāq, from an unnamed intermediary, on the authority of Wahb ibn Munabbih; the attribution and its historical accuracy should not be conflated.',
      source: 'https://quran.ksu.edu.sa/tafseer/tabary/sura18-aya94.html',
      sourceLabel: 'Read al-Ṭabarī’s Alexander report at 18:94'
    },
    {
      year: 1210, dates: '1149–1210 CE', scholar: 'Fakhr al-Dīn al-Rāzī',
      work: 'Mafātīḥ al-Ghayb (al-Tafsīr al-Kabīr), on Qur’an 18:83',
      stance: 'alexander', stanceLabel: 'Favors Alexander son of Philip, with reservations',
      position: 'Calls the identification of Dhul-Qarnayn with Alexander son of Philip the most apparent of the reported interpretations, while also reporting a Himyarite ruler and an unidentified righteous servant as alternatives.',
      arabic: 'وَالْقَوْلُ الْأَوَّلُ أَظْهَرُ',
      reasoning: 'Al-Rāzī argues from the immense geographical reach attributed to Dhul-Qarnayn and to Alexander in the histories familiar to him. He explicitly notes a serious objection: Alexander was associated with Aristotle’s philosophy, which he cannot reconcile easily with the Qur’anic praise. His argument reflects medieval historical geography, not independent proof of identity.',
      source: 'https://quran-tafsir.net/alrazy/sura18-aya83.html',
      sourceLabel: 'Read al-Rāzī’s original argument and objection'
    },
    {
      year: 1273, dates: 'd. 1273 CE', scholar: 'Al-Qurṭubī',
      work: 'Al-Jāmiʿ li-Aḥkām al-Qurʾān, on Qur’an 18:83',
      stance: 'reports', stanceLabel: 'Records competing identifications',
      position: 'Recounts Alexander identifications alongside other accounts of who Dhul-Qarnayn was.',
      reasoning: 'Preserves older opinions and traditions in a compendium. The presence of an identification in a tafsīr does not by itself mean its author endorses it.',
      source: 'https://tafsir.app/qurtubi/18/83',
      sourceLabel: 'Read al-Qurṭubī’s Arabic tafsīr'
    },
    {
      year: 1286, dates: 'd. c. 1286 CE (date disputed)', scholar: 'Al-Bayḍāwī',
      work: 'Anwār al-Tanzīl wa-Asrār al-Taʾwīl, on Qur’an 18:83',
      stance: 'alexander', stanceLabel: 'Names Alexander',
      position: 'Introduces Dhul-Qarnayn as Alexander al-Rūmī, a form of the Alexander identification found in medieval exegesis.',
      reasoning: 'His brief naming of Alexander reflects a recognized exegetical tradition, but does not demonstrate an eyewitness chain to the historical Macedonian ruler.',
      source: 'https://tafsir.app/albaydawee/18/83',
      sourceLabel: 'Read al-Bayḍāwī’s Arabic tafsīr'
    },
    {
      year: 1373, dates: 'c. 1300–1373 CE', scholar: 'Ibn Kathīr',
      work: 'Tafsīr al-Qurʾān al-ʿAẓīm, on Qur’an 18:83',
      stance: 'rejects', stanceLabel: 'Rejects Alexander son of Philip',
      position: 'Distinguishes the Qur’anic righteous ruler from the later Macedonian Alexander son of Philip, whom he associates with Aristotle.',
      reasoning: 'He argues that the Qur’anic portrayal is incompatible with the historical Alexander as he understood him, and instead reports traditions of an earlier, believing figure. His alternative chronology remains a traditional claim.',
      source: 'https://tafsir.app/ibn-katheer/18/83',
      sourceLabel: 'Read Ibn Kathīr’s Arabic tafsīr'
    },
    {
      year: 1979, dates: '1903–1979 CE', scholar: 'Abul Aʿlā Mawdūdī',
      work: 'Tafhīm al-Qurʾān, commentary on Qur’an 18:83–98',
      stance: 'cyrus', stanceLabel: 'Considers Cyrus more plausible',
      position: 'Regards a connection with Cyrus the Great as more plausible than the traditional Alexander identification, while explicitly avoiding a final verdict.',
      reasoning: 'Contrasts the Qur’anic qualities and actions of the ruler with what is known of Alexander, and evaluates alternative ancient rulers against those criteria.',
      source: 'https://www.islamicstudies.info/tafheem.php?sura=18&to=96&verse=83',
      sourceLabel: 'Read Mawdūdī’s commentary'
    }
  ];
  const FILTERS = [
    ['all','All positions'],
    ['alexander','Identifies Alexander'],
    ['reports','Reports multiple views'],
    ['rejects','Rejects Macedonian Alexander'],
    ['cyrus','Cyrus considered']
  ];
  const styleId='qh-dq-scholar-timeline-css';
  function addStyle() {
    if (document.getElementById(styleId)) return;
    const style=document.createElement('style');
    style.id=styleId;
    style.textContent=[
      '.qh-dqt{--dqt-ink:#253c3c;--dqt-muted:#5e655f;--dqt-border:#d6c7a3;--dqt-gold:#b18a3e;--dqt-paper:#fffefa;color:var(--dqt-ink);background:var(--dqt-paper);border:1px solid var(--dqt-border);border-radius:14px;margin:20px 0;padding:clamp(16px,2.4vw,26px);box-shadow:0 5px 24px #071b1810;max-width:100%;font:400 15px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif}',
      '.qh-dqt *{box-sizing:border-box}.qh-dqt h3{font:750 clamp(20px,2.5vw,26px)/1.3 system-ui,sans-serif;margin:2px 0 9px;color:#134b47}.qh-dqt .qh-dqt-intro{max-width:80ch;font:400 15px/1.65 system-ui,sans-serif;margin:0 0 13px;color:#485d56}',
      '.qh-dqt .qh-dqt-filters{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 19px}.qh-dqt .qh-dqt-filter{padding:7px 10px;border-radius:18px;border:1px solid #baab86;background:#fff9e9;color:#284943;font:600 12px/1.35 system-ui,sans-serif;cursor:pointer}.qh-dqt .qh-dqt-filter[aria-pressed=true]{background:#104d49;color:#fff;border-color:#104d49}',
      '.qh-dqt .qh-dqt-list{list-style:none;margin:0;padding:0;display:grid;gap:0}.qh-dqt .qh-dqt-record{position:relative;display:grid;grid-template-columns:minmax(95px,135px) minmax(0,1fr);gap:16px;border-left:2px solid #cbad6d;margin:0 0 0 9px;padding:0 0 19px 22px}.qh-dqt .qh-dqt-record::before{content:"";position:absolute;top:10px;left:-6px;width:10px;height:10px;border-radius:50%;background:#bc9448;border:2px solid #fffbf1}',
      '.qh-dqt .qh-dqt-dates{font:750 13px/1.6 system-ui,sans-serif;color:#75602f;padding-top:9px}.qh-dqt .qh-dqt-card{padding:13px 16px;border:1px solid #d9cdb5;border-radius:11px;background:#fffefb;min-width:0}.qh-dqt .qh-dqt-card h4{color:#183d3a;font:750 18px/1.35 system-ui,sans-serif;margin:0 0 5px}.qh-dqt .qh-dqt-card p{font:400 15px/1.63 system-ui,sans-serif;margin:8px 0;color:#293d36}.qh-dqt .qh-dqt-card .qh-dqt-work{color:#677066;font-size:13px;margin:2px 0 7px}',
      '.qh-dqt .qh-dqt-label{display:inline-block;font:700 12px/1.4 system-ui,sans-serif;border-radius:12px;padding:4px 9px;background:#f1e9d5;color:#715a2b;margin:0 0 5px}.qh-dqt .qh-dqt-original{direction:rtl;text-align:right;font:500 22px/1.9 "Noto Naskh Arabic","Amiri",serif;padding:8px 12px;border-radius:8px;background:#fcf9ef}.qh-dqt .qh-dqt-card a{font:700 13px/1.5 system-ui,sans-serif;color:#096572;overflow-wrap:anywhere;text-decoration:underline;text-underline-offset:3px}.qh-dqt .qh-dqt-caution{margin:12px 0 0;padding-top:11px;border-top:1px solid #e4dac6;color:#5e635d;font-size:13px;line-height:1.6}',
      '@media(max-width:600px){.qh-dqt{padding:14px}.qh-dqt .qh-dqt-record{display:block;padding:0 0 14px 18px}.qh-dqt .qh-dqt-dates{display:block;padding:0 0 5px}.qh-dqt .qh-dqt-card{padding:12px}.qh-dqt .qh-dqt-card h4{font-size:16px}}'
    ].join('');
    document.head.appendChild(style);
  }
  function node(tag,cls,txt) {
    const el=document.createElement(tag);
    if(cls)el.className=cls;
    if(txt!=null)el.textContent=String(txt);
    return el;
  }
  function para(parent,label,text) {
    const p=node('p',null);
    if(label){const b=node('strong',null,label+' ');p.appendChild(b);}
    p.appendChild(document.createTextNode(text));
    parent.appendChild(p);
  }
  function render(target,options={}) {
    if (typeof target==='string')target=document.querySelector(target);
    if(!target)return false;
    addStyle();
    target.replaceChildren();
    target.classList.add('qh-dqt');
    target.setAttribute('aria-label','Chronology of Muslim scholarly interpretations of Dhul-Qarnayn');
    const title=node('h3',null,'Dhul-Qarnayn: scholarly interpretations through time');
    title.id='qh-dq-scholars';
    target.appendChild(title);
    target.appendChild(node('p','qh-dqt-intro',
      'From the 8th to the 20th century: who identified Dhul-Qarnayn with Alexander, who transmitted alternative reports, who rejected that identification, and why. Years are scholars’ lifetimes or approximate death dates—not dates of the original traditions.'));
    const controls=node('div','qh-dqt-filters');
    controls.setAttribute('role','group');
    controls.setAttribute('aria-label','Filter scholarly positions');
    const list=node('ol','qh-dqt-list');
    function draw(group) {
      list.replaceChildren();
      ENTRIES.filter(e=>group==='all'||e.stance===group).forEach((e)=>{
        const item=node('li','qh-dqt-record');
        item.appendChild(node('span','qh-dqt-dates',e.dates));
        const card=node('article','qh-dqt-card');
        card.appendChild(node('h4',null,e.scholar));
        card.appendChild(node('p','qh-dqt-work',e.work));
        card.appendChild(node('span','qh-dqt-label',e.stanceLabel));
        para(card,'Position:',e.position);
        if(e.arabic){const ar=node('p','qh-dqt-original',e.arabic);ar.lang='ar';ar.dir='rtl';card.appendChild(ar);}
        para(card,'Reasoning / evidence:',e.reasoning);
        const source=node('a',null,e.sourceLabel+' ↗');
        source.href=e.source;source.target='_blank';source.rel='noopener noreferrer';
        card.appendChild(source);
        item.appendChild(card);list.appendChild(item);
      });
    }
    FILTERS.forEach(([key,label])=>{
      const b=node('button','qh-dqt-filter',label);b.type='button';b.setAttribute('aria-pressed',key==='all'?'true':'false');
      b.addEventListener('click',()=>{
        controls.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
        draw(key);
      });
      controls.appendChild(b);
    });
    target.appendChild(controls);
    target.appendChild(list);
    const caution=node('p','qh-dqt-caution',
      'Method: positions are attributed to named works, with links to their commentaries. A scholar reporting a view is not necessarily endorsing it; the surviving texts also preserve disagreements within the same century. This is evidence of changing interpretation (tafsīr), not by itself evidence that Qur’an 18:83–98 changed. The Qur’an does not identify Dhul-Qarnayn as Alexander or Cyrus by name.');
    target.appendChild(caution);
    if(!options.compact){
      const a=node('a',null,'Explore the earlier literary sources and the historical analysis ↗');
      a.href='/history.html#dhul-qarnayn';a.style.cssText='display:inline-block;margin-top:10px;color:#096572;font-weight:700;';
      target.appendChild(a);
    }
    draw('all');
    return true;
  }
  window.QHDhulTimeline={render,entries:ENTRIES.map(e=>({scholar:e.scholar,dates:e.dates,stance:e.stance,work:e.work}))};
})();
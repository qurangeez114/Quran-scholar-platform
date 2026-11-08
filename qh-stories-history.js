/* QuranHikma: historical dossiers are sections of Stories, not independent stories.
   Public-source claims kept separate from later commentators and draft candidates. */
(function () {
  'use strict';
  const byId=id=>document.getElementById(id);
  function element(tag,content,className) {
    const n=document.createElement(tag);
    if(content!==undefined&&content!==null)n.textContent=String(content);
    if(className)n.className=className;
    return n;
  }
  function addParagraph(to,text,cls){const p=element('p',text,cls||'qh-hist-text');to.appendChild(p);return p;}
  function addLink(to,label,url) {
    try {
      const parsed=new URL(url,location.origin);
      if(parsed.protocol!=='https:'&&parsed.protocol!=='http:')return null;
      const a=element('a',label,'qh-hist-link');
      a.href=parsed.href;
      if(parsed.origin!==location.origin){a.target='_blank';a.rel='noopener noreferrer';}
      to.appendChild(a);
      return a;
    }catch(_){return null;}
  }

  // Research migration from former /history.html. Keep the exact source,
  // source date and what the text *doesn't* establish in view together.
  const dhulWitnesses=[
    {
      period:'c. AD 75–79 · Earlier than the Qur’an',
      title:'Josephus — The Jewish War, 7.7.4',
      summary:'Josephus recounts a mountain passage that he attributes to Alexander’s iron gates. Later the Alans used the route. This attests an Alexander-and-iron-gates tradition, but does not mention Gog and Magog or an iron-and-copper barrier.',
      verses:'Qur’an 18:96 (iron-gate motif); not all of the surrounding Qur’anic details.',
      difference:'Josephus attributes the gates to Alexander; the Qur’an calls the ruler Dhul-Qarnayn without naming Alexander. His report does not independently demonstrate that the historical Alexander actually built such a gate.',
      references:[['Read Josephus, Jewish War 7.7.4','https://pryr.app/library/josephus/wars-of-the-jews/book-7/']]
    },
    {
      period:'Commonly assigned to the early seventh century, often c. AD 629–630 · Date and redaction disputed',
      title:'Syriac Alexander Legend — Neṣḥānā d-Aleksandrōs',
      summary:'The legend identifies Alexander son of Philip, describes his horns, journeys to the world’s limits, a people exposed to the rising sun, and an iron-and-brass barrier against northern nations including Gog and Magog. The gate’s fate is tied to divine intervention.',
      verses:'Qur’an 18:83 (horned figure), 18:86 (western waters), 18:90 (sunrise), 18:94 (Gog and Magog), 18:96–97 (barrier), 18:98 (its eventual failure).',
      difference:'The Syriac legend names Alexander and contains Christian imperial prophecy absent from Qur’an 18:83–98. Its composition and revision dates remain debated; similar motifs do not establish a direct borrowing chain or unambiguous chronological priority.',
      references:[
        ['Read the Syriac Alexander Legend (Budge translation)','https://www.jasoncolavito.com/the-syriac-alexander-legend.html'],
        ['Corpus Coranicum: intertext for Qur’an 18:94','https://corpuscoranicum.org/en/verse-navigator/sura/18/verse/94/intertexts/1475']
      ],
      edition:'E. A. Wallis Budge, The History of Alexander the Great (1889), vol. II, especially pp. 151–154 for the gate.'
    }
  ];

  function renderDhulWitnesses(host) {
    if(!host)return;
    host.replaceChildren();
    const intro=element('p','Dating refers to approximate composition or manuscript evidence, not an asserted date for every event. These texts have different genres, and shared motifs are not in themselves proof of direct dependence.','qh-hist-intro');
    host.appendChild(intro);
    dhulWitnesses.forEach(row=>{
      const card=element('article',null,'qh-hist-card');
      card.appendChild(element('p',row.period,'qh-hist-era'));
      card.appendChild(element('h3',row.title));
      addParagraph(card,row.summary);
      addParagraph(card,'Verse comparisons: '+row.verses);
      addParagraph(card,'What differs: '+row.difference,'qh-hist-caution');
      if(row.edition)addParagraph(card,'Edition: '+row.edition,'qh-hist-edition');
      const links=element('div',null,'qh-hist-links');
      row.references.forEach(([label,url])=>addLink(links,label,url));
      card.appendChild(links);host.appendChild(card);
    });
  }

  function renderDhulAssessment(host) {
    if(!host)return;
    host.replaceChildren();
    const grid=element('div',null,'qh-hist-grid');
    const yes=element('article',null,'qh-hist-card');
    yes.appendChild(element('h3','What is documented'));
    addParagraph(yes,'Josephus records an Alexander iron-gate tradition long before Islam. The Syriac Alexander Legend shares a cluster of motifs with the Dhul-Qarnayn narrative. Muslim commentators subsequently proposed differing identifications of the Qur’anic figure.');
    const no=element('article',null,'qh-hist-card');
    no.appendChild(element('h3','What is not proven'));
    addParagraph(no,'These similarities alone do not establish a direct textual transmission into the Qur’an, and the Syriac legend’s dating is disputed. Diverse scholarly identifications document the history of interpretation, not a change in the Qur’anic text.');
    grid.append(yes,no);host.appendChild(grid);
    addParagraph(host,'Research method: Distinguish source composition, surviving manuscript, editorial translation and commentator date. A quotation of an earlier opinion does not automatically mean a scholar endorsed it. Source references are not independent historical eyewitness attestations.','qh-hist-method');
  }

  function renderGenericAssessment(host,storyName,verifiedCount,scholarsCount) {
    if(!host)return;
    host.replaceChildren();
    const grid=element('div',null,'qh-hist-grid');
    const yes=element('article',null,'qh-hist-card');
    yes.appendChild(element('h3','What is documented'));
    addParagraph(yes,verifiedCount
      ?verifiedCount+' checked verse-specific historical reference'+(verifiedCount===1?' is':'s are')+' linked to '+storyName+'. The source cards record exact locators, dates, shared elements and differences.'
      :'No checked verse-specific historical source association is currently available for '+storyName+'. That is a research gap, not evidence that no parallels exist.');
    const no=element('article',null,'qh-hist-card');
    no.appendChild(element('h3','What is not proven'));
    addParagraph(no,'Shared story elements do not on their own demonstrate direct borrowing, independent historical confirmation, or which text is historically accurate. Dating, genre and variant transmission must be assessed individually.');
    grid.append(yes,no);host.appendChild(grid);
    addParagraph(host,'Scholarly history: '+(scholarsCount
      ?scholarsCount+' source-attributed commentator position'+(scholarsCount===1?' is':'s are')+' cataloged for selected verses. Do not infer consensus from this partial selection.'
      :'A source-attributed chronological interpretation survey has not yet been published for this topic.')+
      ' The Qur’anic wording and later interpretation are displayed separately.','qh-hist-method');
  }

  function renderScholarPositions(host,positions) {
    if(!host)return;
    host.replaceChildren();
    const rows=Array.isArray(positions)?positions.slice():[];
    if(!rows.length){
      addParagraph(host,'No source-attributed commentator chronology has been published for this story yet. This is an unfinished research area, not evidence that scholars had no opinions.','qh-hist-empty');
      return;
    }
    function death(r){
      const m=String(r.century||'').match(/d\.\s*(?:ca\.\s*)?(\d{3,4})/i);
      return m?Number(m[1]):9999;
    }
    rows.sort((a,b)=>death(a)-death(b));
    const list=element('div',null,'qh-hist-timeline');
    rows.forEach(row=>{
      const card=element('article',null,'qh-hist-card');
      card.appendChild(element('p',row.century||'Date not established','qh-hist-era'));
      card.appendChild(element('h3',row.scholar||'Unnamed commentator'));
      addParagraph(card,row.madhhab_or_school||'Exegetical school','qh-hist-edition');
      addParagraph(card,row.interpretation||'Position not yet entered.');
      const details=element('details',null,'qh-hist-details');
      details.appendChild(element('summary','Work, evidence and original source'));
      addParagraph(details,row.tafsir_source||'Source not recorded.','qh-hist-edition');
      if(row.evidence_cited){
        addParagraph(details,row.evidence_cited,'qh-hist-citation');
        const match=String(row.evidence_cited).match(/https:\/\/[^\s;]+/);
        if(match)addLink(details,'Open cited commentary ↗',match[0].replace(/[.,)]+$/,''));
      }
      card.appendChild(details);list.appendChild(card);
    });
    host.appendChild(list);
  }

  function renderDhulTimeline(host) {
    if(!host)return;
    host.replaceChildren();
    if(window.QHDhulTimeline && typeof window.QHDhulTimeline.render==='function'){
      window.QHDhulTimeline.render(host);
    }else{
      addParagraph(host,'The source-linked chronology is loading or unavailable.','qh-hist-empty');
      addLink(host,'Open Qur’an 18:83 Sources','/index.html?sura=18&aya=83');
    }
  }

  // These records were previously at the bottom of history.html.
  // Reference-checked *staging* is not equivalent to a verified public verse record.
  async function renderResearchCandidates(host) {
    if(!host)return;
    host.replaceChildren(addParagraph(document.createDocumentFragment(),'Loading research candidates…','qh-hist-empty'));
    try {
      const ctrl=new AbortController();
      const timer=setTimeout(()=>ctrl.abort(),12000);
      let response;
      try{response=await fetch('/data/sources/staging/pending-research-2026-11-02.json',{cache:'no-cache',signal:ctrl.signal});}
      finally{clearTimeout(timer);}
      if(!response.ok)throw Error('HTTP '+response.status);
      const payload=await response.json();
      if(!Array.isArray(payload.records))throw Error('Unexpected candidate format');
      host.replaceChildren();
      const lead=element('p','Research candidates awaiting full verse-level verification. “Reference checked” in the staging file does not mean the association is approved for QuranHikma’s verified Sources tab.','qh-hist-intro');
      host.appendChild(lead);
      payload.records.forEach(row=>{
        const card=element('article',null,'qh-hist-card');
        card.appendChild(element('p',row.verification_status==='reference_checked'
          ?'Reference located · Verse-level review pending':'Awaiting primary-text verification','qh-hist-era'));
        card.appendChild(element('h3',row.story||'Unnamed research topic'));
        addParagraph(card,'Qur’an '+row.sura+':'+row.aya_range+' · Candidate: '+(row.candidate_source||'Unspecified'));
        if(row.shared)addParagraph(card,'Reported parallel: '+row.shared);
        if(row.differs)addParagraph(card,'Reported differences: '+row.differs,'qh-hist-caution');
        if(row.dating_note)addParagraph(card,'Dating note: '+row.dating_note,'qh-hist-edition');
        if(row.checked_against)addParagraph(card,'Verification trail: '+row.checked_against,'qh-hist-edition');
        if(Number.isInteger(Number(row.sura))&&Number.isInteger(parseInt(String(row.aya_range),10)))
          addLink(card,'Read relevant Qur’an passage ↗','/index.html?sura='+encodeURIComponent(row.sura)+'&aya='+encodeURIComponent(parseInt(String(row.aya_range),10)));
        host.appendChild(card);
      });
    }catch(error){
      host.replaceChildren();
      addParagraph(host,'Candidate research index temporarily unavailable. The verified story sources above remain accessible.','qh-hist-empty');
      console.warn('History candidates could not be loaded',error);
    }
  }

  window.QHStoryHistory={
    renderDhulWitnesses,
    renderDhulAssessment,
    renderGenericAssessment,
    renderScholarPositions,
    renderDhulTimeline,
    renderResearchCandidates
  };
})();

/* QuranHikma Story Source Dossier
   Additive, on-demand reading of *existing* verse-linked tafsir and hadith.
   Never treats a hadith link as independent historical verification.
   Leaves the original story comparison, colours, ordering and evaluations intact. */
(function () {
  'use strict';
  const LIMIT = 8;
  const state = { config:null, selected:null, serial:0,
    offsets:{tafsir:0,hadith:0}, done:{tafsir:false,hadith:false},
    counts:{tafsir:0,hadith:0} };
  const id = name => document.getElementById(name);
  const node = (tag, cls, value) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (value !== undefined) el.textContent = String(value);
    return el;
  };
  function para(parent,cls,value) { const el=node('p',cls,value); parent.appendChild(el);return el; }
  function safeLink(input) {
    if (!input) return null;
    try { const u=new URL(String(input));return ['https:','http:'].includes(u.protocol)?u.href:null; }
    catch { return null; }
  }
  function locationKey() {
    return state.config && state.selected
      ? 'qh_story_source_note_v1:'+state.config.story+':'+state.selected.sura+':'+state.selected.aya
      : null;
  }
  function saveNote() {
    const k=locationKey(); if (!k) return;
    try { localStorage.setItem(k,id('story-source-notes').value);id('story-source-note-status').textContent='Saved on this device.'; }
    catch { id('story-source-note-status').textContent='Unable to save locally. Copy your note before leaving.'; }
  }
  function exportNote() {
    if (!state.selected || !state.config) return;
    const payload={story:state.config.story,sura:state.selected.sura,aya:state.selected.aya,
      note:id('story-source-notes').value,exported_at:new Date().toISOString(),
      caution:'Personal research notes; source excerpts and authenticity have not been independently verified'};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const uri=URL.createObjectURL(blob);
    const a=node('a');a.href=uri;a.download='quranhikma-story-notes-'+payload.sura+'-'+payload.aya+'.json';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(uri),1000);
  }
  function status(text) { id('story-source-status').textContent=text; }
  function init(config) {
    if (!config || !/^https:\/\//.test(config.url||'') || !config.key || !Array.isArray(config.rows)) return;
    state.config = config;
    const open=id('story-source-dossier');
    if (open) open.querySelector('.story-source-story').textContent='Story: '+config.story.replace(/_/g,' ');
  }
  function setup() {
    if (!id('story-source-dossier')) return;
    id('story-source-close').addEventListener('click',()=>{
      id('story-source-dossier').hidden=true;
      if (state.selected) {
        const verse=id('story-ref-'+state.selected.sura+'-'+state.selected.aya);
        verse?.scrollIntoView({behavior:'smooth',block:'center'});
      }
    });
    for (const type of ['tafsir','hadith']) {
      id('story-source-more-'+type).addEventListener('click',()=>loadBatch(type));
    }
    id('story-source-save').addEventListener('click',saveNote);
    id('story-source-export').addEventListener('click',exportNote);
    if (window.QH_STORY_CONFIG) init(window.QH_STORY_CONFIG);
  }
  async function open(sura,aya) {
    if (!state.config && window.QH_STORY_CONFIG) init(window.QH_STORY_CONFIG);
    if (!state.config) return;
    sura=Number(sura);aya=Number(aya);
    if (!Number.isInteger(sura)||!Number.isInteger(aya)) return;
    const reference=state.config.rows.find(r=>Number(r.sura)===sura&&Number(r.aya)===aya);
    if (!reference) return;
    state.serial++;
    state.selected={sura,aya};
    state.offsets={tafsir:0,hadith:0};
    state.done={tafsir:false,hadith:false};
    state.counts={tafsir:0,hadith:0};
    id('story-source-dossier').hidden=false;
    id('story-source-reference').textContent='Qur\u2019an '+sura+':'+aya;
    id('story-source-event').textContent=reference.event_label||'Related story passage';
    status('Loading verse-linked source records. These are source candidates, not automatically verified historical facts.');
    for (const type of ['tafsir','hadith']) {
      id('story-source-list-'+type).replaceChildren();
      id('story-source-more-'+type).hidden=true;
      id('story-source-count-'+type).textContent='Loading…';
    }
    id('story-source-notes').value='';
    try {id('story-source-notes').value=localStorage.getItem(locationKey())||'';}catch{}
    id('story-source-note-status').textContent='Notes stay on this device until exported.';
    id('story-source-dossier').scrollIntoView({behavior:'smooth',block:'start'});
    await Promise.all([loadBatch('tafsir'),loadBatch('hadith')]);
  }
  async function loadBatch(type) {
    if (!state.config || !state.selected || state.done[type]) return;
    const serial=state.serial;
    const {sura,aya}=state.selected;
    const button=id('story-source-more-'+type);
    button.hidden=true;
    const list=id('story-source-list-'+type);
    const banner=id('story-source-count-'+type);
    const isTafsir=type==='tafsir';
    const table=isTafsir?'tafsir_entries':'hadith_corpus';
    const fields=isTafsir
      ?'id,scholar_key,scholar_name,source_name,source_url,language,content'
      :'id,collection,hadith_number,narrator,text_arabic,text_english,grade,grade_provenance,link_method,source_url';
    const filter=isTafsir?'sura=eq.'+sura+'&aya=eq.'+aya
      :'sura_id=eq.'+sura+'&aya_number=eq.'+aya;
    const offset=state.offsets[type];
    const endpoint=state.config.url+'/rest/v1/'+table+'?'+filter+
      '&select='+fields+'&order=id.asc&limit='+LIMIT+'&offset='+offset;
    banner.textContent='Loading '+(isTafsir?'commentary':'narrations')+'…';
    try {
      const response=await fetch(endpoint,{headers:{
        apikey:state.config.key,Authorization:'Bearer '+state.config.key,Prefer:'count=exact'
      }});
      if (!response.ok) throw new Error('HTTP '+response.status);
      const rows=await response.json();
      if (!Array.isArray(rows)) throw new Error('Invalid source data');
      if (serial!==state.serial) return;
      const totalMatch=/\/(\d+)$/.exec(response.headers.get('content-range')||'');
      const total=totalMatch?Number(totalMatch[1]):null;
      rows.forEach(r=>list.appendChild(isTafsir?tafsirCard(r):hadithCard(r)));
      state.offsets[type]+=rows.length;
      state.counts[type]=Math.max(state.counts[type],state.offsets[type]);
      state.done[type]=total!==null?state.offsets[type]>=total:rows.length<LIMIT;
      if (total===0 || (state.offsets[type]===0 && !rows.length)) {
        para(list,'story-source-empty',isTafsir
          ?'No Tafsīr entries are currently linked to this particular verse.'
          :'No Hadith records are directly linked to this verse in the corpus. This does not establish that no relevant narration exists.');
      }
      banner.textContent=(total===null?state.offsets[type]:total)+' '+(isTafsir?'Tafsīr records':'verse-linked Hadith records')+
        (state.done[type]?'':' · showing '+state.offsets[type]);
      button.hidden=state.done[type];
      status('Source records loaded. Qur\u2019anic text remains primary; Hadith and Tafsīr are separate attributed evidence layers.');
    }catch(err) {
      if (serial!==state.serial)return;
      banner.textContent='Unable to retrieve '+type+' records';
      para(list,'story-source-empty','A source query failed ('+err.message+'). Please retry.');
      button.hidden=false;
    }
  }
  function linkRow(card,url) {
    const target=safeLink(url);
    if (!target) return;
    const p=node('p','story-source-link');
    const a=node('a',null,'Open source reference ↗');
    a.href=target;a.target='_blank';a.rel='noopener noreferrer';p.appendChild(a);card.appendChild(p);
  }
  function tafsirCard(row) {
    const card=node('article','story-source-record');
    const top=node('div','story-source-record-top');
    top.appendChild(node('strong',null,row.scholar_name||row.scholar_key||'Unattributed commentary'));
    top.appendChild(node('span','story-source-meta',(row.language||'language unknown').toUpperCase()));
    card.appendChild(top);
    if (row.source_name) para(card,'story-source-meta','Source: '+row.source_name);
    const details=node('details','story-source-full');
    const sum=node('summary',null,'Read full commentary (attributed interpretation)');
    details.appendChild(sum);
    const body=node('div','story-source-text',row.content||'No commentary text stored.');
    if (row.language==='ar') {body.dir='rtl';body.lang='ar';body.classList.add('arabic-source');}
    details.appendChild(body);
    card.appendChild(details);
    linkRow(card,row.source_url);
    return card;
  }
  function hadithCard(row) {
    const card=node('article','story-source-record');
    const top=node('div','story-source-record-top');
    top.appendChild(node('strong',null,(row.collection||'Hadith corpus')+
      (row.hadith_number?' · '+row.hadith_number:'')));
    card.appendChild(top);
    if (row.narrator) para(card,'story-source-meta','Narrator as catalogued: '+row.narrator);
    para(card,'story-source-grade','Corpus grade: '+(row.grade||'not recorded')+
      (row.grade_provenance?' · Grade provenance: '+row.grade_provenance:' · Not independently verified here'));
    if (row.link_method) para(card,'story-source-meta','Link method: '+row.link_method);
    const details=node('details','story-source-full');
    const summary=node('summary',null,'Read full narration (separate from the Qur\u2019anic account)');
    details.appendChild(summary);
    if (row.text_arabic) {
      const ar=node('div','story-source-text arabic-source',row.text_arabic);
      ar.dir='rtl'; ar.lang='ar';details.appendChild(ar);
    }
    if (row.text_english)details.appendChild(node('div','story-source-text',row.text_english));
    if (!row.text_english&&!row.text_arabic)para(details,'story-source-empty','Text not available in this record.');
    card.appendChild(details);
    linkRow(card,row.source_url);
    return card;
  }
  window.QHStorySources={init,open};
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',setup);
  else setup();
})();

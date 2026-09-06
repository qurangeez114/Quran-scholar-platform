// QuranHikma — Tafsir comparison renderer
(function(){
'use strict';
const BASELINE=[['tabari','al-Ṭabarī'],['ibn_kathir','Ibn Kathīr'],['qurtubi','al-Qurṭubī'],['jalalayn','al-Jalālayn'],['saadi','al-Saʿdī'],['ibn_abbas','Tanwīr al-Miqbās (attributed to Ibn ʿAbbās)']];
const NAMES=Object.fromEntries(BASELINE);
const VERIFIED={
 '3:55':{
  question:'What does “mutawaffīka” mean concerning Jesus?',
  note:'The completed pilot preserves competing explanations rather than forcing them into one harmonized reading. Where a source transmits more than one report, the UI keeps those reports separate.',
  views:[
   {title:'Jesus was caused to die',count:1,scholars:['ibn_abbas'],text:'The attributed Ibn ʿAbbās material preserves a report reading the expression as death before the raising.'},
   {title:'Jesus was taken without death at that point',count:1,scholars:['ibn_abbas'],text:'The same attributed source also preserves a competing no-death reading and marks that report as the correct report in the pilot data.'}
  ],
  alertLabel:'Competing transmitted reports',
  special:'These two cards are not counted as two scholars. They are two distinct transmitted explanations preserved under the attributed Ibn ʿAbbās source. The comparison therefore shows report-level disagreement without falsely turning it into scholar-level voting.',
  statuses:{
   ibn_abbas:['Preserves a death reading for mutawaffīka','Also preserves a competing no-death reading','Pilot classification keeps both routes separate; the no-death report is marked as the correct report in that source record','Attribution of Tanwīr al-Miqbās to Ibn ʿAbbās is disputed']
  }
 },
 '18:65':{
  question:'Was al-Khiḍr a prophet?',
  note:'This is a verified explicit disagreement in the project research. The cards distinguish the commentators’ adopted conclusions rather than merely counting transmitted reports.',
  views:[
   {title:'Al-Khiḍr was a prophet',count:1,scholars:['qurtubi'],text:'Al-Qurṭubī presents prophethood as the correct position.'},
   {title:'Al-Khiḍr was not a prophet',count:1,scholars:['saadi'],text:'Al-Saʿdī takes the opposite position and presents al-Khiḍr as not being a prophet.'}
  ],
  alertLabel:'Explicit disagreement',
  special:'Al-Qurṭubī and al-Saʿdī reach opposite conclusions on the same question. Project classification: explicit_disagreement.',
  statuses:{
   qurtubi:['Adopted/correct view: al-Khiḍr was a prophet','Relationship: explicit disagreement with al-Saʿdī'],
   saadi:['Adopted/correct view: al-Khiḍr was not a prophet','Relationship: explicit disagreement with al-Qurṭubī']
  }
 },
 '19:28':{
  question:'Who is “Aaron” in “O sister of Aaron”?',
  note:'Counts mean sources preserving an interpretation, not votes for what each commentator personally believed.',
  views:[
   {title:'Righteousness / resemblance',count:5,scholars:['tabari','ibn_kathir','qurtubi','jalalayn','ibn_abbas'],text:'Mary is linked to a righteous Aaron through resemblance in worship, chastity, righteousness, or communal naming language.'},
   {title:'Contemporary brother named Aaron',count:3,scholars:['qurtubi','saadi','ibn_abbas'],text:'These sources preserve a reading in which Aaron is a real person from Mary’s own generation. Al-Saʿdī presents this as the apparent reading and distinguishes him from Aaron, brother of Moses.'},
   {title:'Lineage / descent from Aaron',count:3,scholars:['tabari','ibn_kathir','qurtubi'],text:'Mary is associated with Aaron, brother of Moses, through descent or broader ancestral/tribal kinship language.'},
   {title:'Wicked-man comparison',count:2,scholars:['ibn_kathir','ibn_abbas'],text:'A minority transmitted report says Aaron was a wicked man and Mary was compared with him. Preservation of the report does not mean the commentator adopts it.'}
  ],
  alertLabel:'Rejected-report safeguard',
  special:'Ibn Kathīr also transmits a claim that Mary was literally the sister of Moses and Aaron, but explicitly rejects it as “خطأ محض” (a clear error). It is therefore classified as rejected, not as Ibn Kathīr’s belief.',
  statuses:{
   tabari:['Preserves righteous-Aaron/resemblance explanation','Preserves naming-practice evidence','Preserves lineage interpretation'],
   ibn_kathir:['Principal gloss: resemblance in worship — “أي يا شبيهة هارون في العبادة”','Preserves lineage report','Preserves wicked-man report as an alternative','Explicitly rejects literal sister-of-Moses/Aaron report — “وهذا خطأ محض”'],
   qurtubi:['Preserves resemblance interpretation','Preserves lineage interpretation','Preserves real contemporary brother interpretation'],
   jalalayn:['States righteous-Aaron / chastity-resemblance interpretation'],
   saadi:['Apparent/stated reading: real brother — “الظاهر أنه أخوها حقيقة”','Explicitly distinguishes him from Aaron, brother of Moses'],
   ibn_abbas:['Attributed work preserves righteous-Aaron report','Preserves competing wicked-Aaron report','Preserves paternal-brother report','Attribution of Tanwīr al-Miqbās to Ibn ʿAbbās is disputed']
  }
 }
};
function esc(v=''){return String(v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));}
function styles(){if(document.getElementById('qh-tc-css'))return;const s=document.createElement('style');s.id='qh-tc-css';s.textContent=`.qh-tc{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1d1b18}.qh-sem{background:#fff9e9;border:1px solid #e4d3a7;border-radius:14px;padding:13px;margin:10px 0}.qh-sem h3{margin:0 0 5px}.qh-note{font-size:11px;color:#665f53;line-height:1.45}.qh-views{display:grid;gap:8px;margin:10px 0}.qh-view{border:1px solid #e5d8ba;border-radius:11px;background:#fff;padding:10px;cursor:pointer;text-align:left;width:100%}.qh-view b{display:block}.qh-bar{height:7px;background:#eee6d8;border-radius:8px;overflow:hidden;margin:7px 0 4px}.qh-fill{height:100%;background:#b8902a}.qh-detail{display:none;font-size:12px;line-height:1.5;padding-top:7px}.qh-view.open .qh-detail{display:block}.qh-warn{background:#fff1ed;border-left:3px solid #a95d48;padding:9px;font-size:11px;line-height:1.45;margin-top:8px}.qh-status{margin:8px 0 12px;padding:9px;background:#f7f3e8;border-radius:9px;font-size:11px;line-height:1.5}.qh-card{border:1px solid #e1d8c6;border-radius:12px;margin:9px 0;overflow:hidden}.qh-card summary{padding:11px;font-weight:800;cursor:pointer;background:#fbf7ed}.qh-body{padding:11px}.qh-lang{font-size:10px;font-weight:800;color:#8b6d23;margin:8px 0 3px}.qh-text{white-space:pre-wrap;line-height:1.6;font-size:13px}.qh-text.ar{direction:rtl;text-align:right;font-size:17px}.qh-pill{display:inline-block;border:1px solid #dfcfaa;border-radius:999px;padding:3px 6px;margin:2px;font-size:10px}@media(min-width:700px){.qh-views{grid-template-columns:1fr 1fr}}`;document.head.appendChild(s);}
async function fetchRows(sura,aya){const fn=window.sbFetch||(typeof sbFetch==='function'?sbFetch:null);if(!fn)throw new Error('Database helper unavailable');return await fn('tafsir_entries',{sura:`eq.${sura}`,aya:`eq.${aya}`,select:'scholar_key,language,content',order:'scholar_key.asc,language.asc'});}
function semanticBlock(sura,aya){const d=VERIFIED[`${sura}:${aya}`];if(!d)return'';return `<section class="qh-sem"><h3>${esc(d.question)}</h3><div class="qh-note">${esc(d.note)}</div><div class="qh-views">${d.views.map(v=>`<button class="qh-view" type="button" onclick="this.classList.toggle('open')"><b>${esc(v.title)}</b><div class="qh-bar"><div class="qh-fill" style="width:${Math.round(v.count/6*100)}%"></div></div><span>${v.count} of 6 baseline sources</span><div class="qh-detail">${esc(v.text)}<br><br><b>Source${v.scholars.length===1?'':'s'}:</b> ${v.scholars.map(k=>esc(NAMES[k])).join(' · ')}</div></button>`).join('')}</div><div class="qh-warn"><b>${esc(d.alertLabel||'Research note')}:</b> ${esc(d.special)}</div></section>`;}
async function render(container,sura,aya){const el=typeof container==='string'?document.querySelector(container):container;if(!el)throw new Error('Comparison container not found');styles();el.classList.add('qh-tc');el.innerHTML=semanticBlock(sura,aya)+'<div class="qh-note">Loading full stored tafsīr texts…</div>';try{const rows=await fetchRows(Number(sura),Number(aya))||[];const grouped={};rows.forEach(r=>(grouped[r.scholar_key]??=[]).push(r));const verified=VERIFIED[`${sura}:${aya}`];let html=semanticBlock(sura,aya);html+=`<div class="qh-note"><b>${Object.keys(grouped).length}</b> scholar records loaded from the tafsīr database. Open a scholar to inspect the stored source text.</div>`;for(const [key,name] of BASELINE){if(!grouped[key])continue;html+=`<details class="qh-card"><summary>${esc(name)}</summary><div class="qh-body">`;if(verified?.statuses[key])html+=`<div class="qh-status"><b>Comparison classification</b><br>${verified.statuses[key].map(x=>'• '+esc(x)).join('<br>')}</div>`;const by={};for(const r of grouped[key]){if(!by[r.language]||String(r.content||'').length>String(by[r.language].content||'').length)by[r.language]=r;}for(const lang of Object.keys(by).sort(a=>a==='ar'?-1:1)){html+=`<div class="qh-lang">${esc(lang.toUpperCase())}</div><div class="qh-text ${lang==='ar'?'ar':''}">${esc(by[lang].content||'')}</div>`;}html+='</div></details>';}if(!rows.length)html+='<div class="qh-note">No stored tafsīr text returned for this verse.</div>';el.innerHTML=html;return{rows:rows.length,scholars:Object.keys(grouped).length,verifiedComparison:!!verified};}catch(e){el.innerHTML=semanticBlock(sura,aya)+`<div class="qh-warn">Full tafsīr text could not load: ${esc(e.message||e)}</div>`;throw e;}}
window.QuranHikmaTafsirComparison={render,fetchRows,verified:VERIFIED};
})();
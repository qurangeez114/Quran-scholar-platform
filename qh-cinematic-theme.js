/* Qur'an Hikma — a consistent cinematic research identity across content pages.
   Purely presentational. Do not move, cover, or alter active reader/search panels. */
(function(){
  'use strict';
  if (window.__qhCinematic) return;
  window.__qhCinematic=true;

  var file=location.pathname.split('/').pop().toLowerCase() || 'index.html';
  // Tools/admin consoles deliberately retain their dense workspace layout.
  var exclude=/^(?:404|test-|debug|qhikma-debug|seed-|admin-|translation-upload|populate|populator|repair|check-|verify-|deployment-test|madhhab-seed|madhhab-test|tafsir-ui-preview|theme-seeder|sample-video|full-test|grade-|ui\.html)/;
  if(exclude.test(file)||location.pathname.indexOf('/admin/')!==-1) return;

  var groups={
    'index.html':['Qur’an Reader','Explore scripture with connected research tools','quran','future'],
    'themes.html':['Themes & Concepts','Trace recurring themes across verses, commentary and historical sources','themes','future'],
    'theme-analysis.html':['Theme Analysis','Explore every connection from verse to evidence','themes','future'],
    'theme-reader.html':['Theme Reader','Follow a theme verse by verse','themes','archive'],
    'research.html':['Research Discovery','Search, compare and trace claims back to their sources','research','future'],
    'research-classic.html':['Research Workspace','Explore textual evidence using connected research tools','research','future'],
    'stories.html':['Stories & Comparative Scripture','Examine narrative parallels, differences and transmission','stories','archive'],
    'history.html':['Historical Sources','Trace the earliest attested evidence and contextual parallels','history','archive'],
    'quran-crossref.html':['Cross-References','See connected passages and interpretive parallels','sources','archive'],
    'qiraat-comparison.html':['Qirāʾāt & Riwayāt','Compare readings, word forms and interpretive implications','qiraat','archive'],
    'contradiction.html':['Textual Tensions','Investigate contested claims with both sides of the evidence','tensions','future'],
    'narrative-comparison.html':['Narrative Comparison','Read accounts side by side with source references','stories','archive'],
    'narrative-comparisons-index.html':['Comparative Narratives','Find stories across literary traditions','stories','archive'],
    'knowledge-graph.html':['Knowledge Graph','Explore relationships between texts, topics and history','graph','future'],
    'madhhab.html':['Madhhab & Fiqh','Compare legal schools, doctrines and original evidence','fiqh','archive'],
    'muhammad.html':['Muhammad Research','Examine biography, sources and scholarly perspectives','history','archive'],
    'sira.html':['Sīrah & Chronology','Explore events, primary texts and historical timelines','history','archive'],
    'campaigns.html':['Campaigns & History','Investigate chronology, participants and original reports','history','archive'],
    'campaign-detail.html':['Campaign Dossier','Compare source reports and historical claims','history','archive'],
    'tafsir-fidelity.html':['Tafsīr Fidelity','Distinguish original scholarly commentary from modern analysis','sources','archive'],
    'tafsir-comparison-live.html':['Tafsīr Comparison','Read scholars and source evidence side by side','sources','archive'],
    'narrations.html':['Hadith & Narrations','Explore the hadith collections with source-based research','sources','archive'],
    'narration.html':['Hadith Evidence','Trace wording, context and connected reports','sources','archive'],
    'books.html':['Texts & Books','Browse scholarly works and source editions','books','archive'],
    'fatwas.html':['Fatwā Research','Compare legal opinions with their documentary evidence','fiqh','archive'],
    'concept.html':['Concept Explorer','Follow a concept through texts and interpretations','themes','future'],
    'courses.html':['Qur’an Hikma School','Structured study, critical inquiry and research skills','school','future'],
    'course.html':['Course Workspace','Study with sources, lessons and research materials','school','future'],
    'lesson.html':['Learning Lab','Connect course material to historical and textual evidence','school','future'],
    'academic-hub.html':['Academic Hub','Research, collaborate and learn','school','future'],
    'faculty.html':['Faculty & Scholars','Teaching, discussion and original source research','people','future'],
    'faculty-profile.html':['Faculty Profile','Explore courses and scholarly research','people','future'],
    'my-pages.html':['My Pages','Organize your sources, notes and lecture preparation','books','archive'],
    'my-research.html':['My Research','Private collections, citations and saved discoveries','books','archive'],
    'presentation.html':['Presentation Studio','Turn verified research into clear teaching materials','school','future'],
    'methodology.html':['Research Methodology','Transparent evidence, careful attribution, balanced conclusions','research','future'],
    'account.html':['Your Research Account','Return to your saved research and learning','people','future'],
    'login.html':['Research Access','Sign in to continue your academic work','people','future'],
    'marketplace.html':['Community Marketplace','Share books, tools and resources for learning','people','future'],
    'donate.html':['Support Research','Help develop an open and academically rigorous platform','people','future'],
    'advertise.html':['Partnerships & Support','Support educational research and public scholarship','people','future']
  };
  function classify(){
    if(groups[file])return groups[file];
    if(/(?:course|class|student|instructor|faculty|quiz|school|lesson)/.test(file))return ['Learning & Teaching','A connected academic environment for study and instruction','school','future'];
    if(/(?:research|page|saved|presentation)/.test(file))return ['Research Workspace','Explore, organize and cite your source materials','research','future'];
    if(/(?:verse|quran|tafsir|crossref|narration|hadith)/.test(file))return ['Textual Research','Analyze scripture and its source traditions','sources','archive'];
    if(/(?:theme|concept|graph|comparison)/.test(file))return ['Comparative Research','Connect topics, readings and evidence','graph','future'];
    if(/(?:history|story|sira|campaign)/.test(file))return ['Historical Inquiry','Explore events and their textual witnesses','history','archive'];
    return ['Qur’an Hikma','Research • Compare • Analyze • Verify • Explore','research','future'];
  }
  var meta=classify();
  document.body.classList.add('qh-cinema');
  document.body.dataset.qhCinemaArt=meta[2];
  if(file==='contradiction.html'||file==='knowledge-graph.html') document.body.classList.add('qh-scene-dark');

  var ICON={
    quran:'<path d="M120 68Q96 54 56 61v73q44-9 64 16q20-25 64-16V61q-39-7-64 7Z"/><path d="M120 68v82M69 83q23-4 39 4M69 101q23-4 39 4M132 87q17-8 39-4M132 105q17-8 39-4"/>',
    research:'<circle cx="105" cy="91" r="35"/><path d="m129 118 35 36M85 91h40M105 71v40M72 56l17-19M155 61l22-13"/>',
    themes:'<circle cx="120" cy="88" r="15"/><circle cx="66" cy="48" r="12"/><circle cx="173" cy="58" r="12"/><circle cx="77" cy="143" r="12"/><circle cx="178" cy="141" r="12"/><path d="M107 80 75 56m60 0 28-4m-77 81 25-33m28 0 29 31"/>',
    sources:'<path d="m69 63 90-17 22 87-91 17z"/><path d="m59 77 84-16 22 84-86 18zM88 97l43-8m-38 27 44-8m-39 28 44-8"/>',
    stories:'<path d="M58 141q32-19 62 2 31-22 63-2V62q-36-14-63 10Q87 48 58 62Z"/><path d="M120 73v71M77 88q15-3 29 4m-29 16q16-3 29 4m28-19q14-7 30-5m-30 24q14-7 30-5"/>',
    history:'<path d="M50 139h140M63 139V91m38 48V58m38 81V77m38 62V43"/><circle cx="63" cy="91" r="9"/><circle cx="101" cy="58" r="9"/><circle cx="139" cy="77" r="9"/><circle cx="177" cy="43" r="9"/><path d="m63 91 38-33 38 19 38-34"/>',
    qiraat:'<path d="M49 95h19l12-34 17 71 20-90 23 103 17-68 15 18h23"/><path d="M57 156h126M57 36h126"/>',
    tensions:'<path d="M120 46v96M82 63h77M65 63l-24 47h48L65 63Zm110 0-24 47h48l-24-47ZM94 146h52M105 133h30"/><circle cx="120" cy="40" r="7"/>',
    graph:'<circle cx="120" cy="93" r="16"/><circle cx="67" cy="45" r="13"/><circle cx="182" cy="58" r="13"/><circle cx="185" cy="143" r="13"/><circle cx="76" cy="152" r="13"/><circle cx="120" cy="28" r="8"/><path d="m106 81-30-27m59 2 34-3m3 78-36-26m-32 0-20 34m37-63V36"/>',
    fiqh:'<path d="M120 36v122M70 62h100M59 62l-26 51h52L59 62Zm122 0-26 51h52l-26-51ZM92 160h57M104 143h33"/>',
    books:'<path d="M62 54h107v26H62zM74 86h105v25H74zM55 118h116v28H55z"/><path d="M76 66h76m-65 33h78m-93 33h81"/>',
    school:'<path d="m120 46-80 42 80 42 80-42zM73 108v39q47 30 95 0v-39M200 88v60"/>',
    people:'<circle cx="120" cy="65" r="20"/><path d="M80 142c0-28 19-43 40-43s40 15 40 43M68 107c-19 3-26 18-28 35M172 107c17 4 25 18 28 35"/><circle cx="65" cy="80" r="14"/><circle cx="175" cy="80" r="14"/>'
  };
  function createArt(key){
    var svg=document.createElement('div');
    svg.className='qh-cinema-banner__art';svg.setAttribute('aria-hidden','true');
    svg.innerHTML='<svg viewBox="0 0 240 190" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="qhGlow"><stop stop-color="#1daada" stop-opacity=".52"/><stop offset="1" stop-color="#1daada" stop-opacity="0"/></radialGradient></defs>'+
      '<circle cx="120" cy="95" r="93" fill="url(#qhGlow)"/><g class="qh-orbit" fill="none" stroke="#49bdeb" stroke-width="1" opacity=".42"><ellipse cx="120" cy="90" rx="112" ry="59" transform="rotate(-17 120 90)"/><ellipse cx="120" cy="90" rx="112" ry="59" transform="rotate(23 120 90)"/></g>'+
      '<g fill="none" stroke="#f8d18a" stroke-width="3.1" stroke-linejoin="round" stroke-linecap="round" class="qh-pulse">'+(ICON[key]||ICON.research)+'</g>'+
      '<g fill="#5fd6ff"><circle cx="38" cy="37" r="3"/><circle cx="202" cy="129" r="3"/><circle cx="94" cy="13" r="2.5"/><circle cx="192" cy="30" r="2"/></g></svg>';
    return svg;
  }
  function addBanner(where, before){
    if(!where||document.querySelector('.qh-cinema-banner')) return;
    var banner=document.createElement('section');
    banner.className='qh-cinema-banner no-motion';
    banner.dataset.art=meta[2];banner.dataset.scene=meta[3];
    banner.setAttribute('aria-label',meta[0]+' visual introduction');
    var copy=document.createElement('div');copy.className='qh-cinema-banner__copy';
    var kicker=document.createElement('span');kicker.className='qh-cinema-banner__eyebrow';kicker.textContent='Qur’an Hikma · Research Lab';
    var title=document.createElement('strong');title.className='qh-cinema-banner__title';title.textContent=meta[0];
    var desc=document.createElement('span');desc.className='qh-cinema-banner__desc';desc.textContent=meta[1];
    copy.append(kicker,title,desc);banner.append(copy,createArt(meta[2]));
    if(before) where.insertBefore(banner,before); else where.prepend(banner);
  }
  // The existing homepage animation IS the hero. Never duplicate it.
  if(file==='index.html')return;
  // Fixed-height study apps: art belongs in existing chrome, not above tools.
  if(['stories.html','knowledge-graph.html','quran-crossref.html','theme-analysis.html','theme-reader.html','verse-detail.html','narration.html'].includes(file)){
    document.body.classList.add('qh-cinema-compact');return;
  }
  if(['courses.html','course.html','student-dashboard.html','instructor-dashboard.html'].includes(file)){
    var header=document.querySelector('.header');
    if(header){header.classList.add('qh-cinema-existing-hero');return;}
  }
  // Place artwork ahead of existing hero copy; never insert inside search forms.
  var hero=document.querySelector('.main-content > .hero')||document.querySelector('.hero');
  if(hero&&hero.parentElement){addBanner(hero.parentElement,hero);return;}
  if(file==='themes.html'){
    var controls=document.querySelector('.controls');if(controls){addBanner(controls.parentElement,controls);return;}
  }
  // Generic public pages: keep existing fixed navs and user-workspaces intact.
  var content=document.querySelector('main:not(.modal):not(.panel)');
  if(content&&content.clientWidth>0&&!/^(?:account|login|student|instructor|my-|faculty-)/.test(file)){
    addBanner(content,null);return;
  }
  document.body.classList.add('qh-cinema-compact');
})();
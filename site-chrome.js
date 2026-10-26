/* Shared page chrome: adds the bottom menu and the 🕐 History button to any
   page that doesn't already have them, and loads the History modal if the
   page didn't. Safe to include on every page (idempotent). */
(function () {
  'use strict';
  // Site-wide motion layer (site-motion.js). Idempotent; respects reduced motion.
  if (!document.querySelector('script[src$="site-motion.js"]') && !window.__qhMotion) {
    var __m = document.createElement('script'); __m.src = '/site-motion.js'; __m.defer = true;
    document.head.appendChild(__m);
  }
  var NAV = [
    ['index.html','📖','Quran'],['my-pages.html','🗃️','My Page'],['campaigns.html','⚔️','Campaigns'],['research.html','🔬','Research'],
    ['themes.html','🗂️','Themes'],['madhhab.html','⚖️','Madhhab'],['sira.html','🕌','Sīra'],
    ['stories.html','📚','Stories'],['books.html','📕','Books'],['fatwas.html','🧾','Fatwa'],['narrations.html','🧵','Narrations'],
    ['marketplace.html','🛒','Market'],['muhammad.html','☪️','Muhammad'],['contradiction.html','⚡','Tensions'],
    ['knowledge-graph.html','🕸️','Graph'],['my-research.html','🗄️','Saved']
  ];
  function file() { var f = location.pathname.split('/').pop(); return f || 'index.html'; }

  function loadModal() {
    if (typeof window.qhikmaOpenModal === 'function' || document.getElementById('qh-modal-js')) return;
    var s = document.createElement('script'); s.id = 'qh-modal-js'; s.src = '/activity-history.js'; document.head.appendChild(s);
    if (!document.querySelector('link[href$="activity-history.css"]')) {
      var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '/activity-history.css'; document.head.appendChild(l);
    }
  }

  var PARENT = {'campaign-detail.html':'campaigns.html','verse-detail.html':'index.html','narration.html':'narrations.html','theme-reader.html':'themes.html','theme-analysis.html':'themes.html','study_page.html':'index.html','qiraat-comparison.html':'index.html','quran-crossref.html':'index.html'};
  function navHtml() {
    var cur = PARENT[file()] || file();
    return NAV.map(function (n) {
      return '<a class="bnav-btn' + (n[0] === cur ? ' active' : '') + '" href="/' + n[0] + '"' + (n[0] === cur ? ' aria-current="page"' : '') + '><span class="bni">' + n[1] + '</span><span>' + n[2] + '</span></a>';
    }).join('');
  }

  function addNav() {
    // Centralized, consistent navigation: overrides legacy page-specific nav markup
    // without allowing multiple bars to overlap.
    var st = document.getElementById('qh-unified-nav-style');
    if (!st) {
      st = document.createElement('style'); st.id = 'qh-unified-nav-style';
      st.textContent =
        '#bottom-nav{position:fixed!important;bottom:0!important;left:0!important;right:0!important;top:auto!important;width:100%!important;height:42px!important;min-height:42px!important;background:#FDFAF4!important;border-top:1px solid #D4C7AA!important;display:flex!important;flex-direction:row!important;z-index:2147483000!important;overflow-x:auto!important;overflow-y:hidden!important;scrollbar-width:none!important;box-shadow:0 -2px 9px rgba(0,0,0,.12)!important;padding:0!important;margin:0!important;white-space:nowrap!important;}' +
        '#bottom-nav::-webkit-scrollbar{display:none!important}' +
        '#bottom-nav .bnav-btn{box-sizing:border-box!important;flex:0 0 54px!important;min-width:54px!important;max-width:54px!important;width:54px!important;height:42px!important;min-height:42px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:1px!important;padding:2px 1px!important;margin:0!important;background:transparent!important;border:0!important;border-right:1px solid #EEE5D7!important;border-radius:0!important;color:#524a3b!important;font:600 8px/1.1 Arial,sans-serif!important;letter-spacing:0!important;text-transform:none!important;text-decoration:none!important;text-align:center!important;overflow:hidden!important;white-space:nowrap!important;cursor:pointer!important;}' +
        '#bottom-nav .bnav-btn .bni{font-size:14px!important;line-height:16px!important;display:block!important;margin:0!important}' +
        '#bottom-nav .bnav-btn.active{background:#F3E8CF!important;color:#754e0c!important;box-shadow:inset 0 3px #886a1f!important}' +
        '#bottom-nav .bnav-btn:focus-visible{outline:2px solid #9c742a!important;outline-offset:-3px!important}' +
        'body{padding-bottom:max(49px,env(safe-area-inset-bottom))!important}' +
        '#bnav,.fatwa-bottom-nav{display:none!important}' +
        '@media(min-width:900px){#bottom-nav .bnav-btn{flex-basis:56px!important;min-width:56px!important;max-width:56px!important;width:56px!important}}';
      document.head.appendChild(st);
    }
    var existing = document.getElementById('bottom-nav');
    if (!existing) { existing=document.createElement('nav');existing.id='bottom-nav';document.body.appendChild(existing); }
    existing.setAttribute('aria-label','QuranHikma site navigation');
    existing.innerHTML=navHtml();
    // Make the newly active item visible on narrow screens.
    var active=existing.querySelector('.active');
    if (active && active.offsetLeft > existing.clientWidth-90) {
      existing.scrollLeft=Math.max(0,active.offsetLeft-existing.clientWidth/2+40);
    }
  }

  function addClock() {
    if (document.querySelector('[onclick*="qhikmaOpenModal"], #qhist-badge, #qh-clock-btn')) return;
    var b = document.createElement('button');
    b.id = 'qh-clock-btn'; b.type = 'button'; b.title = 'Activity History'; b.textContent = '🕐';
    b.setAttribute('aria-label', 'Activity History');
    b.style.cssText = 'background:none;border:1px solid #E8C97B;border-radius:50%;width:36px;height:36px;cursor:pointer;font-size:18px;color:#C9A84C;display:flex;align-items:center;justify-content:center;flex-shrink:0;';
    b.onclick = function () { if (window.qhikmaOpenModal) window.qhikmaOpenModal(); };
    var h = document.querySelector('header');
    if (h) { h.appendChild(b); }
    else { b.style.cssText += 'position:fixed;top:10px;right:10px;z-index:9998;background:#FDFAF4;'; document.body.appendChild(b); }
  }

  function addAccount() {
    if (document.getElementById('qh-account-btn')) return;
    var a = document.createElement('a');
    a.id = 'qh-account-btn'; a.href = '/account.html'; a.title = 'Log in / My account';
    a.textContent = '👤'; a.setAttribute('aria-label', 'Log in or open your account');
    a.style.cssText = 'text-decoration:none;border:1px solid #E8C97B;border-radius:50%;width:36px;height:36px;font-size:18px;color:#C9A84C;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:none;';
    var h = document.querySelector('header');
    if (h) { h.appendChild(a); }
    else { a.style.cssText += 'position:fixed;top:10px;right:56px;z-index:9998;background:#FDFAF4;'; document.body.appendChild(a); }
  }

  function addSchoolNav() {
    var path = location.pathname.charAt(0)==='/' ? location.pathname.slice(1) : location.pathname;
    if (!["courses.html","course.html","lesson.html","student-dashboard.html","instructor-dashboard.html","faculty.html","faculty-profile.html","faculty-admin.html","apply.html","academic-hub.html","account.html","login.html","my-pages.html","my-research.html","quiz-results.html","sample-course.html","sample-video-class.html","admin-dashboard.html","admin-users.html","admin-evaluation-manager.html","instructor-welcome.html","student-welcome.html","admin/lms.html","admin/courses.html","admin/lesson-manager.html","admin/quiz-builder.html","admin/grading.html","admin/bulk-enrollment.html","admin/analytics.html","admin/deleted-accounts.html"].includes(path)) return;
    if (document.getElementById('qh-school-topnav')) return;
    var s = document.createElement('style');
    s.id='qh-school-topnav-css';
    s.textContent =
      '#qh-school-topnav{min-width:0;max-width:100%;box-sizing:border-box;position:sticky;top:0;z-index:10001;background:#fbf8f0;border-bottom:1px solid #d9cdb7;box-shadow:0 2px 7px #1c211914;font:500 13px/1.4 Arial,sans-serif;color:#382f24}' +
      '#qh-school-topnav .qh-school-inner{max-width:1400px;margin:auto;display:flex;align-items:center;gap:4px;padding:6px 14px;overflow-x:auto;scrollbar-width:thin}' +
      '#qh-school-topnav .qh-school-brand{font-weight:750;color:#694a20;text-decoration:none;white-space:nowrap;padding:8px 11px;margin-right:12px;border-right:1px solid #ddd0b7}' +
      '#qh-school-topnav details{position:relative;flex:0 0 auto}' +
      '#qh-school-topnav summary,#qh-school-topnav .qh-school-link{display:inline-flex;align-items:center;gap:6px;padding:9px 12px;border-radius:6px;color:#3f372d;text-decoration:none;white-space:nowrap;cursor:pointer;list-style:none;font-weight:600}' +
      '#qh-school-topnav summary::-webkit-details-marker{display:none}' +
      '#qh-school-topnav summary::after{content:"⌄";font-size:14px;color:#866c3f}' +
      '#qh-school-topnav summary:hover,#qh-school-topnav .qh-school-link:hover,#qh-school-topnav details[open]>summary{background:#f0e6d3}' +
      '#qh-school-topnav .qh-school-menu{position:fixed;z-index:10002;min-width:220px;max-width:calc(100vw - 24px);max-height:min(65vh,500px);overflow-y:auto;background:#fff;border:1px solid #ded0b8;border-radius:9px;padding:6px;box-shadow:0 12px 30px #20201b28}' +
      '#qh-school-topnav .qh-school-menu a{display:block;text-decoration:none;border-radius:5px;padding:10px 12px;color:#393126;white-space:normal;font-size:13px}' +
      '#qh-school-topnav .qh-school-menu a:hover,#qh-school-topnav .qh-school-menu a:focus-visible{background:#f7eddb;color:#653e06}' +
      '#qh-school-topnav .qh-current{color:#855b1a!important;background:#f5ead5}' +
      '@media(max-width:650px){#qh-school-topnav .qh-school-inner{padding:3px 7px;gap:0}#qh-school-topnav .qh-school-brand{padding:8px 7px;margin-right:5px;font-size:12px}#qh-school-topnav summary,#qh-school-topnav .qh-school-link{padding:8px 9px;font-size:12px}}';
    document.head.appendChild(s);
    var root = document.createElement('nav'); root.id='qh-school-topnav'; root.setAttribute('aria-label','School navigation');
    var groups = [
      ['Explore',[['Courses','/courses.html'],['Sample class','/sample-video-class.html'],['Apply to study','/apply.html'],['Faculty directory','/faculty.html']]],
      ['My Learning',[['Student dashboard','/student-dashboard.html'],['My courses','/academic-hub.html?tab=courses'],['Learning groups','/academic-hub.html?tab=groups'],['Live classes','/academic-hub.html?tab=live'],['Quiz results','/quiz-results.html']]],
      ['Teaching',[['Instructor dashboard','/instructor-dashboard.html'],['Manage courses','/admin/courses.html'],['Lesson manager','/admin/lesson-manager.html'],['Quiz builder','/admin/quiz-builder.html'],['Grading','/admin/grading.html'],['Faculty profile','/faculty-profile.html']]],
      ['Community',[['Faculty','/faculty.html'],['Messages','/academic-hub.html?tab=messages'],['Research workspace','/my-research.html']]],
      ['Administration',[['Admin dashboard','/admin-dashboard.html'],['School administration','/admin/lms.html'],['Student applications','/admin/lms.html'],['Manage users','/admin-users.html'],['Analytics','/admin/analytics.html']]]
    ];
    var inner=document.createElement('div');inner.className='qh-school-inner';
    var brand=document.createElement('a');brand.className='qh-school-brand';brand.href='/courses.html';brand.textContent='QuranHikma School';inner.appendChild(brand);
    groups.forEach(function(g){var d=document.createElement('details'),sm=document.createElement('summary'),m=document.createElement('div');sm.textContent=g[0];m.className='qh-school-menu';m.hidden=false;g[1].forEach(function(link){var a=document.createElement('a');a.href=link[1];a.textContent=link[0];if((location.pathname+location.search)===link[1] || (location.pathname===link[1] && !location.search))a.classList.add('qh-current');m.appendChild(a);});d.appendChild(sm);d.appendChild(m);d.addEventListener('toggle',function(){if(d.open){root.querySelectorAll('details').forEach(function(other){if(other!==d)other.open=false;});var rect=sm.getBoundingClientRect();m.style.top=Math.min(rect.bottom+4,window.innerHeight-75)+'px';m.style.left=Math.max(8,Math.min(rect.left,window.innerWidth-236))+'px';}});inner.appendChild(d);});
    var account=document.createElement('a');account.href='/account.html';account.className='qh-school-link';account.textContent='Account';inner.appendChild(account);
    root.appendChild(inner);document.body.insertBefore(root,document.body.firstChild);
    document.addEventListener('click',function(e){if(!root.contains(e.target))root.querySelectorAll('details').forEach(function(d){d.open=false;});});
    document.addEventListener('keydown',function(e){if(e.key==='Escape')root.querySelectorAll('details').forEach(function(d){d.open=false;});});
  }

  function init() { loadModal(); addSchoolNav(); addNav(); setTimeout(addClock, 400); setTimeout(addAccount, 400);
    if (['/course.html','/lesson.html','/student-dashboard.html','/instructor-dashboard.html','/academic-hub.html'].includes(location.pathname) && !document.getElementById('qh-learning-activity-script')) {
      var tracker=document.createElement('script');tracker.id='qh-learning-activity-script';tracker.type='module';tracker.src='/accounts/learning-activity.js';document.head.appendChild(tracker);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

// Optional membership; public browsing is never blocked by signup.
(async function () {
  'use strict';
  if (location.pathname.startsWith('/admin/') || /\/(account|my-research|student-dashboard|lesson)(\.html)?\/?$/.test(location.pathname)) return;
  if (document.getElementById('qh-membership')) return;
  try {
    const guest = await import('/accounts/guest-days.js');
    if (document.getElementById('qh-membership')) return;
    let storage;try{storage=localStorage;}catch{storage={getItem:()=>null,setItem:()=>{}};}
    const style = document.createElement('style');
    style.textContent = '#qh-membership{box-sizing:border-box;background:#f5f3ea;color:#193c32;padding:12px 20px;border-bottom:1px solid #ccd9d2;font:15px/1.5 system-ui;display:flex;flex-wrap:wrap;align-items:center;gap:12px}#qh-membership a{color:#245d4b;text-decoration:underline}#qh-membership button{background:transparent;color:#193c32;border:1px solid #245d4b;border-radius:6px;padding:6px 10px;cursor:pointer}#qh-membership p{margin:0;flex:1 1 240px}';
    document.head.append(style);
    const bar = document.createElement('nav');
    bar.id = 'qh-membership';
    bar.setAttribute('aria-label','Account and guest access');
    function link(text, href) { const a=document.createElement('a'); a.textContent=text; a.href=href; return a; }
    const text = document.createElement('p');
    function renderGuest() {
      const state = guest.recordDay(storage);
      text.textContent = state.shouldRemind ? 'You have explored on five different days. Create a free account to save private research and join classes. You can keep browsing as a guest.' : 'Explore freely as a guest. An account lets you save private research and join classes.';
      bar.replaceChildren(text, link('Log in','/account.html'),link('Create free account','/account.html?mode=signup'));
      if(state.shouldRemind) {
        const dismiss=document.createElement('button'); dismiss.textContent='Continue as guest';
        dismiss.onclick=()=>{guest.dismissToday(storage);text.textContent='Guest browsing continues. You can create an account whenever you are ready.';dismiss.remove();};
        bar.append(dismiss);
      }
    }
    renderGuest();
    document.body.prepend(bar);
    try {
      const {db} = await import('/accounts/client.js');
      function signedIn(session) {
        if(!session) { renderGuest(); return; }
        bar.replaceChildren(link('My Research','/my-research.html'),link('My Learning','/student-dashboard.html'),link('My Account','/account.html'));
      }
      signedIn((await db.auth.getSession()).data.session);
      db.auth.onAuthStateChange((_event,session)=>signedIn(session));
    } catch {}
  } catch { /* Browser restrictions must never stop public browsing. */ }
})();

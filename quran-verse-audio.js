/* Shared prerecorded Arabic verse audio across pages and dynamic popups. */
(function(){
 if(window.qhVerseAudioInstalled)return;window.qhVerseAudioInstalled=true;
 const lengths=[0,7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,38,49,29,18,45,60,49,62,64,78,96,29,22,18,12,12,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,5,4,5,6];
 let playing=null;const audio=new Audio();audio.preload='none';
 function reset(){if(playing){playing.textContent='▶ Arabic audio';playing.setAttribute('aria-pressed','false');}playing=null;}
 audio.addEventListener('ended',reset);audio.addEventListener('error',()=>{if(playing)playing.title='Audio could not load. Tap to retry.';reset();});
 function add(host,s,a){s=Number(s);a=Number(a);if(!host||!lengths[s]||a<1||a>lengths[s])return;
 const key=s+':'+a;if(host.querySelector('[data-qh-audio="'+key+'"],.simple-recitation-btn'))return;
 if(document.querySelector('.simple-recitation-btn[aria-label="Play plain audio for verse '+key+'"]'))return;
 const b=document.createElement('button');b.type='button';b.dataset.qhAudio=key;b.textContent='▶ Arabic audio';b.setAttribute('aria-label','Play Arabic audio for Qur’an '+key);b.setAttribute('aria-pressed','false');b.style.cssText='margin:6px;padding:6px 10px;border:1px solid #b8902a;border-radius:7px;background:#fdf8ee;color:#77581a;cursor:pointer;font:inherit';
 b.onclick=e=>{e.preventDefault();e.stopPropagation();if(playing===b&&!audio.paused){audio.pause();reset();return;}audio.pause();reset();if(window._simpleRecitationAudio)window._simpleRecitationAudio.pause();playing=b;audio.src='/audio/simple-recitation/'+String(s).padStart(3,'0')+'_'+String(a).padStart(3,'0')+'.mp3';b.textContent='⏸ Pause';b.setAttribute('aria-pressed','true');audio.play().catch(reset);};host.appendChild(b);}
 function scan(){
 document.querySelectorAll('[data-sura-id][data-aya-number],[data-sura][data-aya]').forEach(el=>add(el,el.dataset.suraId||el.dataset.sura,el.dataset.ayaNumber||el.dataset.aya));
 document.querySelectorAll('[onclick]').forEach(el=>{if(el.closest('button')||el.dataset.qhAudio)return;const m=el.getAttribute('onclick').match(/(?:openSocialCard|openVersePopup|showVersePopup|jumpToVerse)\s*\(\s*(\d+)\s*,\s*(\d+)/);if(m)add(el.tagName==='A'?el.parentElement:el,m[1],m[2]);});
 for(const name of ['openSocialCard','openVersePopup','showVersePopup']){
 const f=window[name];if(typeof f!=='function'||f.qhWrapped)continue;
 const wrapped=function(s,a,...args){const result=f.call(this,s,a,...args);Promise.resolve(result).then(()=>{const host=document.querySelector('#scCardOverlay,#scModal,#versePopupModal');if(host){host.querySelectorAll('[data-qh-audio]').forEach(b=>b.remove());add(host,s,a);}scan();}).catch(()=>{});return result;};wrapped.qhWrapped=true;window[name]=wrapped;
 }}
 let queued=false;const observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;scan();});});
 function start(){scan();observer.observe(document.body,{childList:true,subtree:true});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
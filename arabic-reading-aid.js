/* QuranHikma Arabic reading aid: keep Arabic shaping intact.
 * Harakat guides are separate annotations; never split sacred text into spans. */
(function(){
'use strict';
const KEY='qh_arabic_reading_aid';
const MARKS={
 '\u064e':['Fatḥa','#c43839'], '\u064f':['Ḍamma','#246ec2'], '\u0650':['Kasra','#238348'],
 '\u0652':['Sukūn','#66717c'], '\u0651':['Shadda','#b75a19'],
 '\u064b':['Tanwīn fatḥ','#813f9b'], '\u064c':['Tanwīn ḍamm','#813f9b'], '\u064d':['Tanwīn kasr','#813f9b'],
 '\u0653':['Madd','#087f83'], '\u0670':['Dagger alif','#087f83']
};

// Restore word-level dictionary access in NORMAL verse view.
// Preserve Arabic codepoints and orthographic marks; do not alter shaping inside words.
function makeNormalWordsTappable(){
 document.querySelectorAll('.verse-arabic.lang-arabic[data-wbw="off"][id^="arabic-"]').forEach(verse=>{
  if(verse.querySelector('.qh-tappable-word'))return;
  const match=/^arabic-(\d+)-(\d+)$/.exec(verse.id);
  if(!match)return;
  const sura=Number(match[1]),aya=Number(match[2]);
  const raw=verse.dataset.rawArabic || verse.textContent;
  if(!raw.trim())return;
  const fragment=document.createDocumentFragment();
  const tokens=raw.split(/(\s+)/);
  let index=0;
  tokens.forEach(token=>{
   if(!token)return;
   if(/^\s+$/.test(token)){fragment.append(document.createTextNode(token));return;}
   index++;
   const word=document.createElement('span');
   word.className='qh-tappable-word';
   word.dataset.qhWordPos=String(index);
   word.textContent=token;
   word.setAttribute('role','button');
   word.tabIndex=0;
   word.setAttribute('aria-label','Study and pronounce '+token);
   const position=index;
   const open=event=>{
    event.stopPropagation();
    if(typeof window.openWordStudy==='function')window.openWordStudy(token,sura,aya,position);
   };
   word.addEventListener('click',open);
   word.addEventListener('keydown',event=>{
    if(event.key==='Enter'||event.key===' '){event.preventDefault();open(event);}
   });
   fragment.append(word);
  });
  verse.replaceChildren(fragment);
 });
}


// Hover-to-pronounce: desktop only, with a short dwell and one audio at a time.
// Browsers may require a first user interaction before allowing sound.
const HOVER_KEY='qh_hover_pronunciation';
let hoverEnabled=true;
try{hoverEnabled=localStorage.getItem(HOVER_KEY)!=='0';}catch(_){}
let hoverTimer=null,hoverAudio=null,hoverLast='',hoverLastAt=0;
function stopHoverSound(){
 if(hoverTimer){clearTimeout(hoverTimer);hoverTimer=null;}
 if(hoverAudio){hoverAudio.pause();hoverAudio.removeAttribute('src');hoverAudio=null;}
}
function pronounceHover(el,sura,aya,pos){
 if(!hoverEnabled||!window.matchMedia('(hover: hover) and (pointer: fine)').matches)return;
 if(!Number.isInteger(pos)||pos<1)return;
 if(hoverTimer)clearTimeout(hoverTimer);
 hoverTimer=setTimeout(()=>{
  hoverTimer=null;
  const identifier=sura+':'+aya+':'+pos;
  if(identifier===hoverLast&&Date.now()-hoverLastAt<1100)return;
  stopHoverSound();
  hoverLast=identifier;hoverLastAt=Date.now();
  const file=[sura,aya,pos].map(n=>String(n).padStart(3,'0')).join('_')+'.mp3';
  const audio=new Audio('https://audio.qurancdn.com/wbw/'+file);
  hoverAudio=audio;audio.preload='auto';
  audio.play().catch(()=>{if(hoverAudio===audio)hoverAudio=null;});
  audio.addEventListener('ended',()=>{if(hoverAudio===audio)hoverAudio=null;},{once:true});
 },280);
}
function addHoverControls(){
 document.querySelectorAll('.wbw-toggle-btn').forEach(wordButton=>{
  if(wordButton.parentNode.querySelector('.qh-hover-audio-btn'))return;
  const button=document.createElement('button');button.type='button';
  button.className='qh-hover-audio-btn';button.setAttribute('aria-pressed',String(hoverEnabled));
  const refresh=()=>{button.textContent=hoverEnabled?'🔊 Hover sound: On':'🔇 Hover sound: Off';button.setAttribute('aria-pressed',String(hoverEnabled));};
  button.addEventListener('click',()=>{hoverEnabled=!hoverEnabled;try{localStorage.setItem(HOVER_KEY,hoverEnabled?'1':'0');}catch(_){}if(!hoverEnabled)stopHoverSound();refresh();});
  refresh();wordButton.insertAdjacentElement('afterend',button);
 });
}
function wireHover(){
 document.querySelectorAll('.qh-tappable-word,.wbw-word').forEach(el=>{
  if(el.dataset.qhHoverAudio)return;
  const card=el.closest('.verse-arabic');
  const found=card&&/^arabic-(\d+)-(\d+)$/.exec(card.id);
  const sura=Number(el.dataset.sura||(found&&found[1]));
  const aya=Number(el.dataset.aya||(found&&found[2]));
  const pos=Number(el.dataset.pos||el.dataset.qhWordPos);
  if(!(sura>0&&aya>0&&pos>0))return;
  el.dataset.qhHoverAudio='1';
  el.addEventListener('mouseenter',()=>pronounceHover(el,sura,aya,pos));
  el.addEventListener('mouseleave',()=>{if(hoverTimer){clearTimeout(hoverTimer);hoverTimer=null;}});
 });
}

let active=false;
try{active=localStorage.getItem(KEY)==='1';}catch(_){}
function guides(){
 if(!active)return;
 document.querySelectorAll('.wbw-word').forEach(card=>{
  if(card.querySelector('.qh-harakat-guide'))return;
  const source=card.querySelector('.wbw-arabic');
  if(!source)return;
  const symbols=Array.from(source.textContent||'').filter(ch=>MARKS[ch]);
  if(!symbols.length)return;
  const guide=document.createElement('span');
  guide.className='qh-harakat-guide';guide.setAttribute('dir','rtl');
  guide.setAttribute('aria-label','Vowel mark guide');
  symbols.forEach(mark=>{
   const span=document.createElement('span'),data=MARKS[mark];
   span.textContent=mark;span.title=data[0];span.style.color=data[1];
   span.setAttribute('aria-label',data[0]);guide.append(span);
  });
  card.append(guide);
 });
}
function render(){
 document.body.classList.toggle('qh-reading-aid',active);
 document.querySelectorAll('.qh-reading-aid-btn').forEach(btn=>{
  const label=active?'🎨 Vowels: On':'🎨 Vowels: Off';
  if(btn.textContent!==label)btn.textContent=label;
  btn.setAttribute('aria-pressed',String(active));
 });
 if(active)guides();
}
function addButtons(){
 makeNormalWordsTappable();
 addHoverControls();
 wireHover();
 document.querySelectorAll('.wbw-toggle-btn').forEach(wordButton=>{
  if(wordButton.parentNode.querySelector('.qh-reading-aid-btn'))return;
  const button=document.createElement('button');
  button.type='button';button.className='qh-reading-aid-btn';
  button.title='Show color-coded vowel mark guides without modifying Arabic letters';
  button.addEventListener('click',()=>{
   active=!active;
   try{localStorage.setItem(KEY,active?'1':'0');}catch(_){}
   render();
  });
  wordButton.insertAdjacentElement('afterend',button);
 });
}
let pending=false;
const update=()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;addButtons();render();});};
function init(){
 const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';stylesheet.href='/arabic-reading-aid.css';
 document.head.append(stylesheet);
 update();
 const observer=new MutationObserver(update);
 observer.observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

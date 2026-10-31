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
  const match=/^arabic-(\\d+)-(\\d+)$/.exec(verse.id);
  if(!match)return;
  const sura=Number(match[1]),aya=Number(match[2]);
  const raw=verse.dataset.rawArabic || verse.textContent;
  if(!raw.trim())return;
  const fragment=document.createDocumentFragment();
  const tokens=raw.split(/(\\s+)/);
  let index=0;
  tokens.forEach(token=>{
   if(!token)return;
   if(/^\\s+$/.test(token)){fragment.append(document.createTextNode(token));return;}
   index++;
   const word=document.createElement('span');
   word.className='qh-tappable-word';
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

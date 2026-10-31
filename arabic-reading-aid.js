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
  btn.textContent=active?'🎨 Vowels: On':'🎨 Vowels: Off';
  btn.setAttribute('aria-pressed',String(active));
 });
 if(active)guides();
}
function addButtons(){
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

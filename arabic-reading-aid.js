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
   word.setAttribute('aria-label','Pronounce '+token+' or open its dictionary');
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


// Touch interaction: the Arabic text stays continuous and uncluttered.
// A tap pronounces that word; a long press (or a temporary action) opens its dictionary.
// Desktop hover and keyboard access are deliberately preserved.
function mobilePointer(){
 return !!(window.matchMedia&&window.matchMedia('(pointer: coarse), (hover: none)').matches);
}
let mobilePlaybackId=0;
let mobileActionPopover=null;
function hideMobileWordActions(){
 if(mobileActionPopover){mobileActionPopover.remove();mobileActionPopover=null;}
}
function showMobileWordActions(el,word,sura,aya,pos){
 hideMobileWordActions();
 const menu=document.createElement('div');
 menu.className='qh-word-actions-popover';
 menu.setAttribute('role','group');
 menu.setAttribute('aria-label','Actions for '+word);
 const dictionary=document.createElement('button');
 dictionary.type='button';
 dictionary.className='qh-word-dictionary-action';
 dictionary.textContent='📖 Dictionary';
 dictionary.setAttribute('aria-label','Open dictionary for '+word);
 dictionary.addEventListener('click',event=>{
  event.preventDefault();event.stopPropagation();
  hideMobileWordActions();
  if(typeof window.openWordStudy==='function')window.openWordStudy(word,sura,aya,pos);
 });
 menu.append(dictionary);
 document.body.append(menu);
 mobileActionPopover=menu;
 const bounds=el.getBoundingClientRect();
 const width=menu.offsetWidth||136;
 const height=menu.offsetHeight||40;
 const left=Math.max(8,Math.min(bounds.left+bounds.width/2-width/2,window.innerWidth-width-8));
 const top=bounds.top-height-8>8?bounds.top-height-8:Math.min(window.innerHeight-height-8,bounds.bottom+8);
 menu.style.left=left+'px';
 menu.style.top=Math.max(8,top)+'px';
}
document.addEventListener('pointerdown',event=>{
 if(mobileActionPopover&&!mobileActionPopover.contains(event.target)&&!event.target.closest('.qh-tappable-word,.wbw-word'))hideMobileWordActions();
},true);
document.addEventListener('scroll',hideMobileWordActions,true);
function playWordPronunciation(el,sura,aya,pos){
 const request=++mobilePlaybackId;
 stopHoverSound();
 if(window.speechSynthesis)window.speechSynthesis.cancel();
 document.querySelectorAll('.qh-audio-playing').forEach(node=>node.classList.remove('qh-audio-playing'));
 el.classList.add('qh-audio-playing');
 const reset=()=>{if(request===mobilePlaybackId)el.classList.remove('qh-audio-playing');};
 const word=el.dataset.qhWordText||el.dataset.word||(el.querySelector('.wbw-arabic')||el).textContent.trim();
 const file=[sura,aya,pos].map(n=>String(n).padStart(3,'0')).join('_')+'.mp3';
 const audio=new Audio('https://audio.qurancdn.com/wbw/'+file);
 hoverAudio=audio;
 let started=false,failed=false;
 let timeout=null;
 const fallback=()=>{
  if(request!==mobilePlaybackId||failed||started)return;
  failed=true;
  if(timeout)clearTimeout(timeout);
  audio.pause();audio.removeAttribute('src');
  if(hoverAudio===audio)hoverAudio=null;
  if(!('speechSynthesis' in window)||typeof SpeechSynthesisUtterance==='undefined'){reset();return;}
  const utterance=new SpeechSynthesisUtterance(word);
  const voice=window.speechSynthesis.getVoices().find(v=>/^ar(?:-|$)/i.test(v.lang));
  if(voice)utterance.voice=voice;
  utterance.lang=voice?voice.lang:'ar-SA';utterance.rate=0.8;
  utterance.onend=reset;utterance.onerror=reset;
  try{window.speechSynthesis.speak(utterance);}catch(_){reset();}
 };
 audio.addEventListener('playing',()=>{started=true;if(timeout)clearTimeout(timeout);},{once:true});
 audio.addEventListener('ended',reset,{once:true});
 audio.addEventListener('error',fallback,{once:true});
 timeout=setTimeout(fallback,6000);
 try{const promise=audio.play();if(promise&&typeof promise.catch==='function')promise.catch(fallback);}
 catch(_){fallback();}
}
function addMobileWordActions(){
 document.querySelectorAll('.qh-tappable-word,.wbw-word').forEach(el=>{
  if(el.dataset.qhMobileActions)return;
  const verse=el.closest('.verse-arabic');
  const match=verse&&/^arabic-(\d+)-(\d+)$/.exec(verse.id);
  const sura=Number(el.dataset.sura||(match&&match[1]));
  const aya=Number(el.dataset.aya||(match&&match[2]));
  const pos=Number(el.dataset.pos||el.dataset.qhWordPos);
  if(!(sura>0&&aya>0&&pos>0))return;
  el.dataset.qhMobileActions='1';
  const word=el.dataset.word||(el.querySelector('.wbw-arabic')||el).textContent.trim();
  el.dataset.qhWordText=word;
  el.setAttribute('aria-label','Arabic '+word+'. Tap to pronounce, hold for dictionary.');
  let holdTimer=null,held=false,startX=0,startY=0;
  const cancelHold=()=>{if(holdTimer){clearTimeout(holdTimer);holdTimer=null;}};
  const dictionary=()=>{
   hideMobileWordActions();
   if(typeof window.openWordStudy==='function')window.openWordStudy(word,sura,aya,pos);
  };
  el.addEventListener('pointerdown',event=>{
   if(!mobilePointer()||event.button>0)return;
   cancelHold();held=false;
   startX=event.clientX;startY=event.clientY;
   holdTimer=setTimeout(()=>{holdTimer=null;held=true;dictionary();},520);
  });
  el.addEventListener('pointermove',event=>{
   if(Math.abs(event.clientX-startX)>12||Math.abs(event.clientY-startY)>12)cancelHold();
  });
  el.addEventListener('pointerup',cancelHold);
  el.addEventListener('pointercancel',cancelHold);
  el.addEventListener('pointerleave',cancelHold);
  el.addEventListener('contextmenu',event=>{
   if(!mobilePointer())return;
   event.preventDefault();event.stopPropagation();
   cancelHold();
   if(!held){held=true;dictionary();}
  });
  // Capture prevents the existing inline dictionary handlers from also firing on mobile.
  el.addEventListener('click',event=>{
   if(!mobilePointer())return;
   event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
   if(held){held=false;return;}
   playWordPronunciation(el,sura,aya,pos);
   showMobileWordActions(el,word,sura,aya,pos);
  },true);
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
 addMobileWordActions();
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
 const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';stylesheet.href='/arabic-reading-aid.css?v=mobile-flow-3';
 document.head.append(stylesheet);
 update();
 const observer=new MutationObserver(update);
 observer.observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

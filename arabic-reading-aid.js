/* QuranHikma Arabic reading aid: keep Arabic shaping intact.
 * Harakat guides are separate annotations; never split sacred text into spans. */
(function(){
'use strict';
const KEY='qh_colored_harakat_v2';
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
   // Standalone waqf/pause signs (e.g. ۚ ۗ) are not spoken words.
   // They stay visible but MUST NOT consume an audio position.
   if(!/[\u0621-\u063A\u0641-\u064A\u066E-\u066F\u0671-\u06D3\u06FA-\u06FC]/.test(token)){
    fragment.append(document.createTextNode(token));
    return;
   }
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


// Desktop hover pronunciation: delegated events survive verse re-rendering.
// A single reusable player plus explicit click-to-enable addresses browser autoplay rules.
const HOVER_KEY='qh_hover_pronunciation';
let hoverEnabled=true;
try{hoverEnabled=localStorage.getItem(HOVER_KEY)!=='0';}catch(_){}
let hoverTimer=null,hoverErrorTimer=null,hoverAudio=null,hoverPlayer=null;
let hoverTarget=null,hoverSequence=0,hoverArmed=false,hoverBlocked=false;
let hoverListenersInstalled=false,hoverLastError='';
function hoverWordInfo(el){
 if(!el)return null;
 const card=el.closest('.verse-arabic');
 const found=card&&/^arabic-(\d+)-(\d+)$/.exec(card.id);
 const sura=Number(el.dataset.sura||(found&&found[1]));
 const aya=Number(el.dataset.aya||(found&&found[2]));
 const pos=Number(el.dataset.pos||el.dataset.qhWordPos);
 const word=el.dataset.word||el.dataset.qhWordText||(el.querySelector('.wbw-arabic')||el).textContent.trim();
 if(!(sura>0&&aya>0&&pos>0&&word))return null;
 return {el,sura,aya,pos,word};
}
function showHoverState(){
 document.querySelectorAll('.qh-hover-audio-btn').forEach(btn=>{
  let label;
  if(!hoverEnabled)label='🔇 Hover: Off';
  else if(hoverBlocked||!hoverArmed)label='🔈 Enable hover sound';
  else if(hoverLastError)label='⚠️ Audio unavailable · Retry';
  else label='🔊 Hover: On';
  if(btn.textContent!==label)btn.textContent=label;
  btn.setAttribute('aria-pressed',String(hoverEnabled&&hoverArmed&&!hoverBlocked));
  btn.title=hoverEnabled&&!hoverArmed
   ?'Click once to enable browser audio. A test word will play.'
   :'Hover an Arabic word to hear it; click to turn off or retry.';
 });
}
function getHoverPlayer(){
 if(!hoverPlayer){hoverPlayer=new Audio();hoverPlayer.preload='auto';}
 return hoverPlayer;
}
function stopHoverSound(){
 hoverSequence++;
 if(hoverTimer){clearTimeout(hoverTimer);hoverTimer=null;}
 if(hoverErrorTimer){clearTimeout(hoverErrorTimer);hoverErrorTimer=null;}
 if(hoverPlayer){try{hoverPlayer.pause();}catch(_){}}
 // Mobile uses a separate player, sharing the existing cancellation entrypoint.
 if(hoverAudio){try{hoverAudio.pause();hoverAudio.removeAttribute('src');}catch(_){}hoverAudio=null;}
}
function speakHoverFallback(word,request){
 if(request!==hoverSequence)return;
 if(!('speechSynthesis' in window)||typeof SpeechSynthesisUtterance==='undefined'){
  hoverLastError='no-audio';showHoverState();return;
 }
 try{
  window.speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(word);
  const voice=window.speechSynthesis.getVoices().find(v=>/^ar(?:-|$)/i.test(v.lang));
  if(voice)utterance.voice=voice;
  utterance.lang=voice?voice.lang:'ar-SA';utterance.rate=0.8;
  utterance.onerror=()=>{if(request===hoverSequence){hoverLastError='speech-failed';showHoverState();}};
  window.speechSynthesis.speak(utterance);
  hoverLastError='';showHoverState();
 }catch(_){hoverLastError='speech-failed';showHoverState();}
}
function playHoverWord(info){
 if(!hoverEnabled)return;
 const request=++hoverSequence;
 if(hoverErrorTimer){clearTimeout(hoverErrorTimer);hoverErrorTimer=null;}
 const player=getHoverPlayer();
 try{player.pause();}catch(_){}
 hoverLastError='';hoverBlocked=false;
 const file=[info.sura,info.aya,info.pos].map(n=>String(n).padStart(3,'0')).join('_')+'.mp3';
 const url='https://audio.qurancdn.com/wbw/'+file;
 let failed=false,playing=false;
 const fallback=(error)=>{
  if(failed||request!==hoverSequence||playing)return;
  failed=true;
  if(hoverErrorTimer){clearTimeout(hoverErrorTimer);hoverErrorTimer=null;}
  if(error&&error.name==='NotAllowedError'){
   hoverBlocked=true;hoverArmed=false;showHoverState();
   return;
  }
  speakHoverFallback(info.word,request);
 };
 player.onerror=()=>fallback(new Error('audio-load-failed'));
 player.onplaying=()=>{
  if(request!==hoverSequence)return;
  playing=true;hoverArmed=true;hoverBlocked=false;hoverLastError='';
  if(hoverErrorTimer){clearTimeout(hoverErrorTimer);hoverErrorTimer=null;}
  showHoverState();
 };
 player.onended=()=>{if(request===hoverSequence)showHoverState();};
 player.src=url;
 hoverErrorTimer=setTimeout(()=>fallback(new Error('audio-timeout')),5500);
 try{
  const result=player.play();
  if(result&&typeof result.catch==='function')result.catch(fallback);
 }catch(error){fallback(error);}
}
function pronounceHover(info){
 if(!hoverEnabled||!window.matchMedia('(hover: hover) and (pointer: fine)').matches)return;
 if(hoverTimer){clearTimeout(hoverTimer);hoverTimer=null;}
 hoverTimer=setTimeout(()=>{
  hoverTimer=null;
  if(hoverTarget!==info.el||!info.el.isConnected)return;
  playHoverWord(info);
 },180);
}
function addHoverControls(){
 document.querySelectorAll('.wbw-toggle-btn').forEach(wordButton=>{
  if(wordButton.parentNode.querySelector('.qh-hover-audio-btn'))return;
  const btn=document.createElement('button');
  btn.type='button';btn.className='qh-hover-audio-btn';
  btn.addEventListener('click',()=>{
   // First click explicitly primes the same media element used by hover.
   if(!hoverEnabled||!hoverArmed||hoverBlocked||hoverLastError){
    hoverEnabled=true;hoverBlocked=false;hoverLastError='';
    try{localStorage.setItem(HOVER_KEY,'1');}catch(_){}
    playHoverWord(hoverWordInfo(hoverTarget)||{sura:1,aya:1,pos:1,word:'بِسْمِ'});
   }else{
    hoverEnabled=false;hoverArmed=false;hoverBlocked=false;
    try{localStorage.setItem(HOVER_KEY,'0');}catch(_){}
    stopHoverSound();
   }
   showHoverState();
  });
  wordButton.insertAdjacentElement('afterend',btn);
 });
 showHoverState();
}
function wireHover(){
 if(hoverListenersInstalled)return;
 hoverListenersInstalled=true;
 document.addEventListener('pointerover',event=>{
  if(event.pointerType&&event.pointerType!=='mouse')return;
  const el=event.target.closest&&event.target.closest('.qh-tappable-word,.wbw-word');
  if(!el||!el.closest('.verse-arabic'))return;
  if(event.relatedTarget&&el.contains(event.relatedTarget))return;
  const info=hoverWordInfo(el);
  if(!info)return;
  hoverTarget=el;
  pronounceHover(info);
 },true);
 document.addEventListener('pointerout',event=>{
  if(event.pointerType&&event.pointerType!=='mouse')return;
  const el=event.target.closest&&event.target.closest('.qh-tappable-word,.wbw-word');
  if(!el||hoverTarget!==el)return;
  if(event.relatedTarget&&el.contains(event.relatedTarget))return;
  hoverTarget=null;
  if(hoverTimer){clearTimeout(hoverTimer);hoverTimer=null;}
 },true);
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden){hoverTarget=null;stopHoverSound();}
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

let active=true;
try{const stored=localStorage.getItem(KEY);if(stored!==null)active=stored==='1';}catch(_){}
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
 // No detached harakat rows: color accents appear on actual rendered words.
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
  button.title='Show colored fatḥa, ḍamma, kasra, sukūn, shadda, tanwīn and madd directly on Arabic words';
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
 const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';stylesheet.href='/arabic-reading-aid.css?v=colored-vowels-v3';
 document.head.append(stylesheet);
 update();
 const observer=new MutationObserver(update);
 observer.observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

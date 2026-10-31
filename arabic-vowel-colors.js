/* QuranHikma colorized harakat overlay.
 * The unmodified Arabic stays in the DOM for speech, copy, dictionary, and shaping.
 * Only glyph pixels belonging to diacritics are tinted in a visual canvas.
 */
(function(){
'use strict';
const TYPES={
 '\u064e':'fatha','\u064f':'damma','\u0650':'kasra','\u0652':'sukun',
 '\u0651':'shadda','\u064b':'tanwin','\u064c':'tanwin','\u064d':'tanwin',
 '\u0653':'madd','\u0670':'madd'
};
const COLORS={
 fatha:'#c62828',damma:'#1769aa',kasra:'#168449',sukun:'#66727c',
 shadda:'#cf681b',tanwin:'#813e99',madd:'#007b85'
};
let fontReady=false,watch=null,watched=new WeakSet(),jobs=new Set(),tick=null;
const enabled=()=>document.body.classList.contains('qh-reading-aid');
const wordText=el=>Array.from(el.childNodes).filter(n=>n.nodeType===3).map(n=>n.textContent).join('');
function renderWord(el){
 if(!enabled()||!fontReady||!el.isConnected||el.dataset.qhColorized==='1')return;
 const word=wordText(el);
 if(!word||!Array.from(word).some(c=>TYPES[c]))return;
 const rect=el.getBoundingClientRect();
 if(rect.width<4||rect.height<5)return;
 const st=getComputedStyle(el);
 const font=[st.fontStyle,st.fontWeight,st.fontSize,st.fontFamily].join(' ');
 const ratio=Math.min(window.devicePixelRatio||1,2);
 const width=Math.min(2500,Math.ceil(rect.width*ratio));
 const height=Math.min(420,Math.ceil(rect.height*ratio));
 try {
  const render=text=>{
   const c=document.createElement('canvas');c.width=width;c.height=height;
   const ctx=c.getContext('2d',{willReadFrequently:true});
   if(!ctx)throw new Error('Canvas unsupported');
   ctx.scale(ratio,ratio);
   ctx.direction='rtl';ctx.textAlign='center';ctx.textBaseline='alphabetic';
   ctx.font=font;ctx.fillStyle='#202320';
   const metric=ctx.measureText(word);
   const baseline=(rect.height+metric.actualBoundingBoxAscent-metric.actualBoundingBoxDescent)/2;
   ctx.fillText(text,rect.width/2,baseline);
   return ctx.getImageData(0,0,width,height);
  };
  const full=render(word);
  const classes=[...new Set(Array.from(word).map(c=>TYPES[c]).filter(Boolean))];
  const erased=classes.map(type=>({
   type,data:render(Array.from(word).filter(c=>TYPES[c]!==type).join('')).data
  }));
  const rgb={};
  classes.forEach(type=>{
   const hex=COLORS[type].substring(1);
   rgb[type]=[0,2,4].map(k=>parseInt(hex.substring(k,k+2),16));
  });
  for(let n=0;n<full.data.length;n+=4){
   let best=34,kind=null;
   erased.forEach(layer=>{
    const difference=full.data[n+3]-layer.data[n+3];
    if(difference>best){best=difference;kind=layer.type;}
   });
   if(kind){
    const color=rgb[kind];
    full.data[n]=color[0];
    full.data[n+1]=color[1];
    full.data[n+2]=color[2];
   }
  }
  const overlay=document.createElement('canvas');
  overlay.width=width;overlay.height=height;
  overlay.className='qh-vowel-overlay';
  overlay.setAttribute('aria-hidden','true');
  const draw=overlay.getContext('2d');
  if(!draw)return;
  draw.putImageData(full,0,0);
  el.appendChild(overlay);
  el.dataset.qhColorized='1';
  el.classList.add('qh-colorized-word');
 }catch(err){
  // Never hide Arabic when drawing is unsupported.
  console.warn('QuranHikma: standard Arabic fallback',err);
 }
}
function drawBatch(){
 tick=null;
 if(!enabled()||!fontReady){jobs.clear();return;}
 let i=0;
 for(const el of jobs){
  jobs.delete(el);
  renderWord(el);
  if(++i===3)break;
 }
 if(jobs.size)tick=requestAnimationFrame(drawBatch);
}
function queue(el){
 if(!fontReady||!enabled()||el.dataset.qhColorized==='1')return;
 jobs.add(el);
 if(tick===null)tick=requestAnimationFrame(drawBatch);
}
function scan(){
 if(!fontReady||!enabled())return;
 document.querySelectorAll(
  '.verse-arabic.lang-arabic[data-wbw="off"] .qh-tappable-word,'+
  '.verse-arabic.lang-arabic[data-wbw="on"] .wbw-arabic'
 ).forEach(el=>{
  if(el.dataset.qhColorized==='1'||watched.has(el))return;
  if(!Array.from(wordText(el)).some(c=>TYPES[c]))return;
  watched.add(el);
  if(watch)watch.observe(el);else queue(el);
 });
}
function clear(){
 jobs.clear();
 if(watch)watch.disconnect();
 watched=new WeakSet();
 document.querySelectorAll('.qh-colorized-word').forEach(el=>{
  el.querySelectorAll(':scope > .qh-vowel-overlay').forEach(node=>node.remove());
  el.classList.remove('qh-colorized-word');
  delete el.dataset.qhColorized;
 });
}
let scheduled=false;
function update(){
 if(scheduled)return;
 scheduled=true;
 requestAnimationFrame(()=>{
  scheduled=false;
  if(enabled())scan();else if(document.querySelector('.qh-colorized-word'))clear();
 });
}
function init(){
 if('IntersectionObserver' in window){
  watch=new IntersectionObserver(entries=>{
   entries.forEach(entry=>{
    if(entry.isIntersecting){watch.unobserve(entry.target);queue(entry.target);}
   });
  },{rootMargin:'200px 0px'});
 }
 // Load the current stylesheet's web font before rasterizing.
 const load=document.fonts
  ?Promise.all([
    document.fonts.load('400 36px "Noto Naskh Arabic"'),
    document.fonts.load('700 36px "Noto Naskh Arabic"')
   ]):Promise.resolve();
 load.catch(()=>{}).finally(()=>{fontReady=true;update();});
 new MutationObserver(update).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
 window.addEventListener('resize',()=>{
  if(!enabled())return;
  clear();update();
 },{passive:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

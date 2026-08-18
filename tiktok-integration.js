/* TikTok Content Posting integration for QuranHikma Create & Share.
   Uses TikTok Login Kit + Upload API (draft/inbox flow). No client secret is exposed here. */
(function(){
  'use strict';

  const API = {
    session: '/api/tiktok/session',
    auth: '/api/tiktok/auth',
    init: '/api/tiktok/upload-init',
    status: '/api/tiktok/status',
    disconnect: '/api/tiktok/disconnect'
  };

  let lastSession = null;
  let modal = null;

  function qs(id){ return document.getElementById(id); }
  function esc(s){ return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function injectStyles(){
    if(qs('tiktok-integration-style')) return;
    const style=document.createElement('style');
    style.id='tiktok-integration-style';
    style.textContent=`
      .qh-tt-btn{padding:10px 12px;border:0;border-radius:8px;background:#111;color:#fff;font-size:13px;font-weight:800;cursor:pointer}
      .qh-tt-btn:disabled{opacity:.5;cursor:not-allowed}
      .qh-tt-secondary{background:#fff;color:#111;border:1.5px solid #ccc}
      #qh-tt-modal{position:fixed;inset:0;z-index:100500;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;font-family:Inter,Arial,sans-serif}
      #qh-tt-card{background:#fff;border-radius:16px;width:min(92vw,440px);max-height:90vh;overflow:auto;padding:18px;box-shadow:0 12px 48px rgba(0,0,0,.3)}
      #qh-tt-card h3{margin:0;font-size:18px}.qh-tt-row{display:flex;gap:8px;align-items:center}.qh-tt-grow{flex:1}
      #qh-tt-preview{display:block;max-height:46vh;max-width:100%;margin:12px auto;border-radius:10px;background:#eee}
      #qh-tt-status{font-size:12px;color:#665b45;line-height:1.45;margin-top:8px}
    `;
    document.head.appendChild(style);
  }

  async function getSession(){
    const r=await fetch(API.session,{credentials:'same-origin',cache:'no-store'});
    const d=await r.json().catch(()=>({}));
    lastSession=d;
    return d;
  }

  function currentReturn(){
    return location.pathname + location.search + location.hash;
  }

  function connect(){
    location.href = API.auth + '?return=' + encodeURIComponent(currentReturn());
  }

  function cleanTikTokCanvas(){
    const src=qs('socialCanvasMain');
    if(!src || !src.width || !src.height) throw new Error('Create the social card first.');
    // TikTok Content Posting rules prohibit app branding/watermarks. QuranHikma's
    // normal card footer contains quranhikma.com, so the API export crops only
    // that footer while preserving the verse content.
    const footerCrop=Math.max(90, Math.round(src.width * 0.12));
    const h=Math.max(360, src.height-footerCrop);
    const out=document.createElement('canvas');
    out.width=src.width; out.height=h;
    out.getContext('2d').drawImage(src,0,0,src.width,h,0,0,out.width,out.height);
    return out;
  }

  async function canvasToVideo(canvas, seconds=3){
    if(!window.MediaRecorder || !canvas.captureStream) throw new Error('This browser cannot create a TikTok-ready video. Use the normal Share button instead.');
    const candidates=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];
    const mime=candidates.find(x=>!MediaRecorder.isTypeSupported || MediaRecorder.isTypeSupported(x));
    if(!mime) throw new Error('This browser does not support WebM recording.');

    const work=document.createElement('canvas');
    work.width=canvas.width; work.height=canvas.height;
    const ctx=work.getContext('2d');
    const stream=work.captureStream(30);
    const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:2400000});
    const chunks=[];
    recorder.ondataavailable=e=>{if(e.data && e.data.size) chunks.push(e.data);};
    const stopped=new Promise((resolve,reject)=>{
      recorder.onstop=resolve;
      recorder.onerror=e=>reject(e.error||new Error('Video recording failed.'));
    });
    recorder.start(250);

    const fps=30, frames=Math.ceil(seconds*fps);
    for(let i=0;i<frames;i++){
      // Tiny Ken Burns motion makes sure browsers emit a normal 30fps video
      // rather than a one-frame still stream.
      const p=i/Math.max(1,frames-1), scale=1+0.012*p;
      const w=canvas.width/scale, h=canvas.height/scale;
      const sx=(canvas.width-w)/2, sy=(canvas.height-h)/2;
      ctx.clearRect(0,0,work.width,work.height);
      ctx.drawImage(canvas,sx,sy,w,h,0,0,work.width,work.height);
      await new Promise(r=>setTimeout(r,1000/fps));
    }
    recorder.stop();
    await stopped;
    stream.getTracks().forEach(t=>t.stop());
    const blob=new Blob(chunks,{type:mime.split(';')[0]});
    if(!blob.size) throw new Error('The generated video was empty.');
    return blob;
  }

  function setStatus(text, bad=false){
    const el=qs('qh-tt-status');
    if(el){ el.textContent=text; el.style.color=bad?'#a52323':'#665b45'; }
  }

  async function pollStatus(publishId){
    for(let i=0;i<8;i++){
      await new Promise(r=>setTimeout(r,2500));
      const r=await fetch(API.status+'?publish_id='+encodeURIComponent(publishId),{credentials:'same-origin',cache:'no-store'});
      const d=await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(d.error||'Could not check TikTok upload status.');
      const st=d.status || '';
      if(st==='FAILED') throw new Error(d.fail_reason || 'TikTok processing failed.');
      if(['PUBLISH_COMPLETE','SEND_TO_USER_INBOX'].includes(st)) return st;
      setStatus(st ? `TikTok status: ${st}` : 'TikTok is processing the upload…');
    }
    return 'PROCESSING';
  }

  async function sendToTikTok(){
    const btn=qs('qh-tt-send');
    if(!qs('qh-tt-consent')?.checked){ setStatus('Confirm that you want to send this content to TikTok first.',true); return; }
    try{
      btn.disabled=true;
      setStatus('Creating a TikTok-ready video…');
      const canvas=cleanTikTokCanvas();
      const video=await canvasToVideo(canvas,3);
      setStatus(`Preparing upload (${(video.size/1024/1024).toFixed(1)} MB)…`);
      const initRes=await fetch(API.init,{
        method:'POST',credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({video_size:video.size,mime_type:video.type||'video/webm'})
      });
      const init=await initRes.json().catch(()=>({}));
      if(!initRes.ok || !init.upload_url) throw new Error(init.error||'TikTok did not return an upload URL.');

      setStatus('Uploading to TikTok…');
      const up=await fetch(init.upload_url,{
        method:'PUT',
        headers:{
          'Content-Type':video.type||'video/webm',
          'Content-Range':`bytes 0-${video.size-1}/${video.size}`
        },
        body:video
      });
      if(!up.ok) throw new Error(`TikTok media upload failed (${up.status}).`);

      setStatus('Upload received. TikTok is processing it…');
      const state=await pollStatus(init.publish_id);
      if(state==='SEND_TO_USER_INBOX' || state==='PUBLISH_COMPLETE'){
        setStatus('Sent to TikTok. Open your TikTok inbox notification to review, edit, and publish it.');
      }else{
        setStatus('Sent to TikTok. Processing may continue for a few minutes; check your TikTok inbox.');
      }
    }catch(err){
      console.error('TikTok upload failed',err);
      setStatus(err.message||'TikTok upload failed.',true);
    }finally{
      if(btn) btn.disabled=false;
    }
  }

  async function showModal(){
    injectStyles();
    if(typeof window.setSocialFormatMain==='function'){
      try{ window.setSocialFormatMain('story'); }catch(_){}
      await new Promise(r=>setTimeout(r,60));
    }
    let preview='';
    try{ preview=cleanTikTokCanvas().toDataURL('image/jpeg',.9); }catch(_){}
    let session;
    try{ session=await getSession(); }catch(_){ session={connected:false}; }

    if(modal) modal.remove();
    modal=document.createElement('div');
    modal.id='qh-tt-modal';
    const user=session.user;
    modal.innerHTML=`
      <div id="qh-tt-card">
        <div class="qh-tt-row">
          <h3 class="qh-tt-grow">TikTok</h3>
          <button class="qh-tt-btn qh-tt-secondary" id="qh-tt-close">✕</button>
        </div>
        ${preview?`<img id="qh-tt-preview" src="${preview}" alt="TikTok upload preview">`:''}
        ${session.connected?`
          <div style="font-size:13px;margin:8px 0">${user?.avatar_url?`<img src="${esc(user.avatar_url)}" style="width:28px;height:28px;border-radius:50%;vertical-align:middle;margin-right:7px">`:''}
          Connected${user?.display_name?` as <strong>${esc(user.display_name)}</strong>`:''}.</div>
          <label style="display:flex;gap:8px;align-items:flex-start;font-size:12px;margin:12px 0">
            <input type="checkbox" id="qh-tt-consent" style="margin-top:2px">
            <span>I want to send this preview to my TikTok account. TikTok will place it in my inbox so I can review/edit it before publishing.</span>
          </label>
          <div class="qh-tt-row">
            <button class="qh-tt-btn qh-tt-grow" id="qh-tt-send">Send to TikTok</button>
            <button class="qh-tt-btn qh-tt-secondary" id="qh-tt-disconnect">Disconnect</button>
          </div>
        `:`
          <p style="font-size:13px;line-height:1.5">Connect your TikTok account to send the current Create & Share card into TikTok. Add your caption, sound, and final edits inside TikTok before publishing.</p>
          <button class="qh-tt-btn" id="qh-tt-connect" style="width:100%">Connect TikTok</button>
        `}
        <div id="qh-tt-status">${session.connected?'Your normal QuranHikma card is not changed. The TikTok API copy removes the site footer because TikTok forbids app watermarks/branding in posted media.':''}</div>
      </div>`;
    document.body.appendChild(modal);
    qs('qh-tt-close').onclick=()=>{modal.remove();modal=null;};
    modal.onclick=e=>{if(e.target===modal){modal.remove();modal=null;}};
    if(qs('qh-tt-connect')) qs('qh-tt-connect').onclick=connect;
    if(qs('qh-tt-send')) qs('qh-tt-send').onclick=sendToTikTok;
    if(qs('qh-tt-disconnect')) qs('qh-tt-disconnect').onclick=async()=>{
      await fetch(API.disconnect,{method:'POST',credentials:'same-origin'});
      showModal();
    };
  }

  function addButton(){
    const canvas=qs('socialCanvasMain');
    if(!canvas) return false;
    const wrap=canvas.parentElement?.nextElementSibling;
    if(!wrap || qs('qh-tiktok-open')) return !!qs('qh-tiktok-open');
    const btn=document.createElement('button');
    btn.id='qh-tiktok-open';
    btn.className='qh-tt-btn';
    btn.style.flex='1';
    btn.textContent='🎵 Send to TikTok';
    btn.onclick=showModal;
    wrap.appendChild(btn);
    return true;
  }

  function handleOAuthResult(){
    const u=new URL(location.href);
    const result=u.searchParams.get('tiktok');
    if(!result) return;
    const reason=u.searchParams.get('reason');
    u.searchParams.delete('tiktok'); u.searchParams.delete('reason');
    history.replaceState({},'',u.pathname+(u.searchParams.toString()?'?'+u.searchParams.toString():'')+u.hash);
    setTimeout(()=>{
      if(result==='connected') alert('TikTok connected. Open Create & Share and choose Send to TikTok.');
      else if(result==='error') alert('TikTok connection failed'+(reason?': '+reason:'.'));
    },50);
  }

  handleOAuthResult();
  injectStyles();
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',addButton);
  else addButton();
  new MutationObserver(addButton).observe(document.documentElement,{childList:true,subtree:true});

  window.qhTikTok={show:showModal,getSession};
})();

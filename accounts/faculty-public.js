import {db} from './client.js';
const $=id=>document.getElementById(id);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fields=[['biography','faculty-bio'],['credentials','faculty-credentials'],
 ['research_interests','faculty-research'],['publications','faculty-publications'],
 ['teaching_languages','faculty-languages'],['office_hours','faculty-hours']];
const links=[['website_url','Website'],['orcid_url','ORCID'],['google_scholar_url','Google Scholar'],
 ['linkedin_url','LinkedIn'],['youtube_url','YouTube'],['facebook_url','Facebook'],
 ['instagram_url','Instagram'],['x_url','X']];
const linkSafe=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}};
const setStatus=(message,error=false)=>{
 $('faculty-public-status').textContent=message;
 $('faculty-public-status').className='status'+(error?' error':'');
};
const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=String(text);return el;};
function setImage(host,url,name){
 host.replaceChildren();
 const safe=linkSafe(url);
 if(!safe){host.textContent='◯';return;}
 const img=make('img','portrait');
 img.src=safe;img.alt='Portrait of '+name;img.loading='lazy';
 img.addEventListener('error',()=>{host.replaceChildren();host.textContent='◯';});
 host.appendChild(img);
}
function addLink(host,value,label){
 const href=linkSafe(value);if(!href)return;
 const anchor=make('a','',label+' ↗');
 anchor.href=href;anchor.target='_blank';anchor.rel='noopener noreferrer';
 host.appendChild(anchor);
}
function showDetail(profile){
 $('faculty-directory-heading').hidden=true;$('directory-controls').hidden=true;
 $('faculty-directory').hidden=true;$('faculty-detail').hidden=false;
 $('faculty-name').textContent=profile.display_name;
 $('faculty-headline').textContent=profile.headline||'Instructor';
 $('faculty-affiliation').textContent=[profile.academic_affiliation,profile.city,profile.country].filter(Boolean).join(' · ');
 const badge=$('faculty-credential-badge');
 badge.textContent=profile.credential_status==='verified'?'Credentials verified by QuranHikma':
   profile.credential_status==='not_verified'?'Credentials not verified':'Credentials self-reported / not reviewed';
 badge.className='badge'+(profile.credential_status==='verified'?' verified':
   profile.credential_status==='not_verified'?' warning':'');
 setImage($('faculty-portrait'),profile.portrait_url,profile.display_name);
 const socials=$('faculty-socials');socials.replaceChildren();
 for(const [key,label] of links)addLink(socials,profile[key],label);
 addLink(socials,profile.support_url,'Voluntary support / donate');
 $('faculty-support-note').hidden=!linkSafe(profile.support_url);
 for(const [key,elementId] of fields){
   const wrap=$(elementId);wrap.hidden=!profile[key];
   wrap.querySelector('p').textContent=profile[key]||'';
 }
 document.title=profile.display_name+' · QuranHikma Faculty';
 setStatus('Published faculty profile. Qualifications not explicitly labeled verified are self-reported.');
}
let all=[];
function renderDirectory(){
 const needle=$('directory-search').value.trim().toLocaleLowerCase();
 const visible=all.filter(p=>[p.display_name,p.headline,p.academic_affiliation,p.research_interests].join(' ').toLocaleLowerCase().includes(needle));
 const root=$('faculty-directory');root.replaceChildren();
 for(const p of visible){
   const card=make('a','faculty-card');card.href='/faculty.html?id='+encodeURIComponent(p.user_id);
   const h=make('h3','',p.display_name);card.appendChild(h);
   card.appendChild(make('p','muted',p.headline||'Instructor'));
   if(p.academic_affiliation)card.appendChild(make('p','muted',p.academic_affiliation));
   const credential=make('span','badge'+(p.credential_status==='verified'?' verified':''),
     p.credential_status==='verified'?'Verified credentials':'Credentials self-reported');
   card.appendChild(credential);root.appendChild(card);
 }
 if(!visible.length)root.appendChild(make('p','muted','No published instructors match this search.'));
 $('directory-count').textContent=visible.length+' faculty profiles';
}
async function start(){
 const id=new URLSearchParams(location.search).get('id');
 if(id&&!uuid.test(id)){setStatus('Invalid faculty profile identifier.','error');return;}
 let query=db.from('qh_faculty_directory').select('*');
 if(id)query=query.eq('user_id',id);
 else query=query.order('display_name');
 const {data,error}=await query;
 if(error){setStatus('Faculty records are unavailable at the moment.',true);return;}
 if(id){if(!data?.length){setStatus('This profile is not published or not available.',true);return;}showDetail(data[0]);return;}
 all=data||[];$('directory-controls').hidden=false;$('faculty-directory').hidden=false;
 $('directory-search').addEventListener('input',renderDirectory);
 renderDirectory();setStatus(all.length?'Showing published faculty profiles.':'No published faculty profiles are available yet.');
}
start().catch(()=>setStatus('Faculty profiles could not be loaded.',true));

import {db} from './client.js';
import {lmsRequest} from './lms-access.js';
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
function showDetail(profile,{privatePreview=false,editorUrl=null}={}){
 $('faculty-directory-heading').hidden=true;$('directory-controls').hidden=true;
 $('faculty-directory').hidden=true;$('faculty-staff-panel').hidden=true;$('faculty-detail').hidden=false;
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
 $('faculty-private-preview').hidden=!privatePreview;
 if(privatePreview){
   const edit=$('faculty-private-edit');
   edit.href=editorUrl||'/faculty.html';
   edit.hidden=!editorUrl;
 }
 document.title=profile.display_name+' · QuranHikma Faculty';
 setStatus(privatePreview
   ?'Private preview: this instructor profile is not publicly published.'
   :'Published faculty profile. Qualifications not explicitly labeled verified are self-reported.');
}
async function showPrivateProfile(id){
 // Unpublished records must never be queried through the public faculty view.
 // The server authorizes only the owner or the instructor reviewing their own record.
 const {data,error}=await db.auth.getSession();
 if(error||!data?.session){setStatus('This instructor profile is not publicly available.',true);return;}
 try{
   const response=await lmsRequest('faculty_get',{user_id:id});
   if(response?.account?.user_id!==id||response.account.role!=='instructor')
     throw Error('No access to this faculty profile');
   const profile={...response.account,...(response.profile||{})};
   showDetail(profile,{
     privatePreview:true,
     editorUrl:response.editable?(response.account.user_id===data.session.user?.id
       ?'/faculty-profile.html':'/faculty-admin.html?id='+encodeURIComponent(id)):null
   });
 }catch{
   setStatus('This instructor profile is not publicly available.',true);
 }
}
let all=[],staffDrafts=[];
function renderStaffDirectory(){
 const panel=$('faculty-staff-panel');
 const root=$('faculty-staff-grid');root.replaceChildren();
 const needle=$('directory-search').value.trim().toLocaleLowerCase();
 const shown=staffDrafts.filter(p=>[p.display_name,p.headline,p.academic_affiliation,p.city,p.country]
   .join(' ').toLocaleLowerCase().includes(needle));
 panel.hidden=!staffDrafts.length;
 for(const p of shown){
   const card=make('article','faculty-card faculty-private-card');
   const heading=make('h3');
   const name=make('a','faculty-staff-name',p.display_name||'Instructor');
   name.href='/faculty.html?id='+encodeURIComponent(p.user_id);
   name.setAttribute('aria-label','View instructor profile: '+(p.display_name||'Instructor'));
   heading.appendChild(name);card.appendChild(heading);
   card.appendChild(make('p','muted',p.headline||'Professional profile not yet completed'));
   if(p.academic_affiliation)card.appendChild(make('p','muted',p.academic_affiliation));
   const label=!p.active?'Inactive account':p.is_published?'Public profile':'Draft · staff only';
   card.appendChild(make('span','badge warning',label));
   const edit=make('a','faculty-edit-action','Edit instructor');
   edit.href='/faculty-admin.html?id='+encodeURIComponent(p.user_id);
   // Instructors can only edit their own record. The server returns one record
   // to instructors and all records to the owner; route decision is based on identity.
   if(p.user_id===staffSessionUserId)edit.href='/faculty-profile.html';
   card.appendChild(edit);
   root.appendChild(card);
 }
 if(!shown.length)root.appendChild(make('p','muted','No instructor records match this search.'));
}
let staffSessionUserId=null;
async function loadStaffDirectory(){
 if(!db.auth?.getSession)return 0;
 try{
   const {data,error}=await db.auth.getSession();
   if(error||!data?.session)return 0;
   staffSessionUserId=data.session.user?.id||null;
   const records=await lmsRequest('faculty_staff_list');
   if(!Array.isArray(records))return 0;
   staffDrafts=records.filter(p=>!p.is_published||!p.active);
   renderStaffDirectory();
   return staffDrafts.length;
 }catch{
   // Public directory works independently; never expose staff records on auth failure.
   staffDrafts=[];
   $('faculty-staff-panel').hidden=true;
   return 0;
 }
}
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
 renderStaffDirectory();
 $('directory-count').textContent=visible.length+' public faculty profiles'+
   (staffDrafts.length?' · '+staffDrafts.length+' staff-only records':'');
}
async function start(){
 const id=new URLSearchParams(location.search).get('id');
 if(id&&!uuid.test(id)){setStatus('Invalid faculty profile identifier.','error');return;}
 let query=db.from('qh_faculty_directory').select('*');
 if(id)query=query.eq('user_id',id);
 else query=query.order('display_name');
 const {data,error}=await query;
 if(error){setStatus('Faculty records are unavailable at the moment.',true);return;}
 if(id){if(!data?.length){await showPrivateProfile(id);return;}showDetail(data[0]);return;}
 all=data||[];$('directory-controls').hidden=false;$('faculty-directory').hidden=false;
 $('directory-search').addEventListener('input',renderDirectory);
 const staffCount=await loadStaffDirectory();
 renderDirectory();
 setStatus(all.length?'Showing published faculty profiles.':
   staffCount?'No public faculty profiles are published yet. Registered instructors appear below for authorized staff only.':
   'No faculty profiles have been published yet. Instructor profiles will appear after they are completed and published.');
}
start().catch(()=>setStatus('Faculty profiles could not be loaded.',true));

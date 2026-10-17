import {db} from './client.js';
import {lmsRequest} from './lms-access.js';

const $=id=>document.getElementById(id);
const form=$('faculty-form');
const isAdmin=document.body.dataset.facultyMode==='admin';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fields=['display_name','headline','academic_affiliation','portrait_url','country','city','credentials',
 'biography','research_interests','teaching_languages','publications','office_hours','website_url',
 'orcid_url','google_scholar_url','linkedin_url','youtube_url','facebook_url','instagram_url','x_url','support_url'];
let saved=null,targetId=null,busy=false;
const setStatus=(message,kind='')=>{
 $('faculty-status').textContent=message;
 $('faculty-status').className='status'+(kind?' '+kind:'');
};
const setElement=(name,value)=>{const field=form.elements.namedItem(name);if(field)field.value=value??'';};
function showRecord(result){
 saved=result;
 const a=result.account||{},p=result.profile||{};
 for(const name of fields)setElement(name,name in p?p[name]:a[name]);
 if(isAdmin){
   setElement('email',a.email);
   setElement('credential_status',p.credential_status||'unreviewed');
   $('confirm-email').checked=false;$('confirm-review').checked=false;
 }
 form.elements.namedItem('is_published').checked=!!p.is_published;
 $('faculty-side-name').textContent=a.display_name||'Instructor';
 $('faculty-verified').textContent=p.credential_status==='verified'?'Credentials verified':
   p.credential_status==='not_verified'?'Credentials not verified':'Credentials not yet reviewed';
 $('faculty-verified').className='badge'+(p.credential_status==='verified'?' verified':
   p.credential_status==='not_verified'?' warning':'');
 $('faculty-publicity').textContent=p.is_published?'Published faculty profile':'Unpublished draft profile';
 const link=$('faculty-public-link');
 link.hidden=!p.is_published||!a.active;
 link.href='/faculty.html?id='+encodeURIComponent(a.user_id);
}
function payload(){
 const values=Object.fromEntries(new FormData(form));
 values.is_published=form.elements.namedItem('is_published').checked;
 if(isAdmin){
   values.user_id=targetId;
   values.confirm_email_change=$('confirm-email').checked;
   values.confirm_credential_review=$('confirm-review').checked;
   const changedEmail=String(values.email||'').trim().toLowerCase()!==String(saved?.account?.email||'').toLowerCase();
   if(changedEmail&&!values.confirm_email_change)
     throw Error('Confirm the sign-in email change before saving.');
   if(values.credential_status==='verified'&&!values.confirm_credential_review&&
     (values.credentials!==String(saved?.profile?.credentials||'')||
      values.academic_affiliation!==String(saved?.profile?.academic_affiliation||'')||
      saved?.profile?.credential_status!=='verified'))
     throw Error('Review the credentials and confirm evidence before setting verified.');
 }
 return values;
}
async function save(event){
 event.preventDefault();
 if(busy)return;
 if(!form.reportValidity())return;
 let values;try{values=payload();}catch(e){setStatus(e.message,'error');return;}
 busy=true;$('faculty-save').disabled=true;setStatus('Saving faculty information…');
 try{
   const response=await lmsRequest(isAdmin?'faculty_admin_save':'faculty_save',values);
   showRecord({account:response.account,profile:response.profile});
   setStatus(response.message||'Changes saved.','success');
 }catch(e){setStatus('Changes were not saved: '+e.message,'error');}
 finally{busy=false;$('faculty-save').disabled=false;}
}
form.addEventListener('submit',save);
$('faculty-revert').addEventListener('click',()=>{
 if(!saved)return;
 showRecord(saved);setStatus('Unsaved changes discarded.','success');
});
window.addEventListener('beforeunload',event=>{
 if(!saved||busy)return;
 // Standard browser confirmation protects unsaved faculty edits.
 let now;try{now=payload();}catch{return;}
 const baseline={...saved.profile,...saved.account};
 const differs=fields.some(k=>String(now[k]||'')!==String(baseline[k]||''))||
   now.is_published!==!!saved.profile?.is_published||
   (isAdmin&&(now.email!==saved.account.email||now.credential_status!==(saved.profile?.credential_status||'unreviewed')));
 if(differs){event.preventDefault();event.returnValue='';}
});
async function start(){
 const {data,error}=await db.auth.getSession();
 if(error||!data.session){setStatus('Sign in to access faculty profile settings.','error');return;}
 const session=await lmsRequest('session');
 if(isAdmin&&session.role!=='owner'){setStatus('Only administrators can edit another instructor account.','error');return;}
 if(!isAdmin&&session.role!=='instructor'){setStatus('An active instructor account is required.','error');return;}
 if(session.account?.must_change_password){setStatus('Change your temporary password first from your dashboard.','error');return;}
 targetId=isAdmin?new URLSearchParams(location.search).get('id'):data.session.user.id;
 if(!uuid.test(targetId||'')){setStatus('Select an instructor from the Admin Page to edit their profile.','error');return;}
 saved=await lmsRequest('faculty_get',isAdmin?{user_id:targetId}:{});
 if(!saved?.account){setStatus('Instructor record not found.','error');return;}
 showRecord(saved);
 $('faculty-app').hidden=false;
 setStatus('Ready. Your edits are saved only when you select Save faculty profile.');
}
start().catch(error=>setStatus('Could not open faculty settings: '+error.message,'error'));

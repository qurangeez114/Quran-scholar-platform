import {db} from './client.js';
import {lmsRequest} from './lms-access.js';
const $=id=>document.getElementById(id);
const element=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(cls)n.className=cls;return n;};
const append=(parent,child)=>{parent.appendChild(child);return child;};
const status=(text,error=false)=>{$('admissions-admin-status').textContent=text;$('admissions-admin-status').dataset.error=String(error);};
const friendly={
 quranic_studies:'Qur’anic Studies & Tafsīr',hadith_and_history:'Hadith & History',
 comparative_scripture:'Comparative Scripture',arabic_languages:'Arabic & Languages',
 independent_research:'Independent Research',general_learning:'General Learning'
};
const statuses=['submitted','under_review','waitlisted','accepted','declined'];
let loading=false,instructors=null;
async function refresh(){
 if(loading)return;loading=true;
 const button=$('admissions-refresh');button.disabled=true;
 status('Loading private application records…');
 try{
  const rows=await lmsRequest('school_applications_list',{status:$('admissions-filter').value});
  if(!instructors){try{instructors=await lmsRequest('school_application_instructors');}catch{instructors=[];}}
  const root=$('admissions-admin-list');root.replaceChildren();
  if(!Array.isArray(rows))throw Error('Applications response unavailable');
  for(const app of rows){
   const box=append(root,element('article',undefined,'admissions-admin-card'));
   const heading=append(box,element('div',undefined,'admissions-admin-card-top'));
   append(heading,element('h3',app.full_name));
   append(heading,element('span',app.status.replaceAll('_',' '),'admissions-admin-badge'));
   const meta=append(box,element('p',undefined,'admissions-admin-meta'));
   meta.textContent=(app.email||'')+' · '+(app.city||app.country||'Location not provided')+
    ' · '+(friendly[app.program_interest]||app.program_interest||'Program not selected')+
    ' · '+(app.submitted_at?new Date(app.submitted_at).toLocaleDateString():'Date unavailable');
   const summary=append(box,element('details'));
   append(summary,element('summary','Read applicant responses'));
   const body=append(summary,element('div',undefined,'admissions-admin-detail'));
   for(const [name,value] of [
    ['Area of interest',friendly[app.program_interest]||app.program_interest],
    ['Learning goal',app.learning_goal],['Academic background',app.academic_background||'Not supplied'],
    ['Education level',app.education_level],['Teaching language',app.preferred_language],
    ['Study format',app.attendance_mode],['Location',[app.city,app.country].filter(Boolean).join(', ')||'Not supplied']
   ]){
    const line=append(body,element('p'));
    append(line,element('strong',name+': '));
    append(line,document.createTextNode(value||'Not supplied'));
   }
   const classes=append(box,element('p',undefined,'admissions-admin-meta'));
   classes.textContent='Requested classes: '+((app.requested_courses||[]).map(c=>c.title).join(', ')||'none selected');
   if(app.status==='accepted'){
    const assignBox=append(box,element('div',undefined,'admissions-admin-review'));
    append(assignBox,element('p',app.instructor_id?'Assigned instructor: '+(app.instructor_name||'Instructor'):'Not yet assigned to an instructor','admissions-admin-hint'));
    const pickLabel=append(assignBox,element('label',app.instructor_id?'Reassign to':'Assign to'));
    const pick=append(pickLabel,element('select'));
    append(pick,element('option','Choose an instructor')).value='';
    for(const t of instructors||[]){
     if(t.user_id===app.instructor_id)continue;
     append(pick,element('option',t.name)).value=t.user_id;
    }
    const go=append(assignBox,element('button',app.instructor_id?'Reassign':'Assign'));go.type='button';
    go.addEventListener('click',async()=>{
     if(!pick.value){status('Choose an instructor first.',true);return;}
     go.disabled=true;
     try{
      const result=await lmsRequest('school_application_assign',{
       application_id:app.id,instructor_id:pick.value,mode:app.instructor_id?'reassign':'assign'});
      status(result.notice||'Instructor assigned.');
      loading=false;await refresh();
     }catch(error){status(error.message||'Unable to assign instructor',true);}
     finally{go.disabled=false;}
    });
   }
   if(app.status==='accepted'){
    const offerBox=append(box,element('div',undefined,'admissions-admin-review'));
    const offers=app.offers||[];
    if(offers.length){
     append(offerBox,element('p','Offers:','admissions-admin-hint'));
     const ul=append(offerBox,element('ul'));
     const label={offered:'waiting for reply',accepted:'accepted ✓',declined:'declined',closed:'closed (taken by another)',withdrawn:'withdrawn'};
     for(const o of offers){
      const li=append(ul,element('li',o.instructor_name+' — '+(label[o.status]||o.status)));
      if(o.status==='offered'){
       const w=append(li,element('button','Withdraw'));w.type='button';w.style.marginLeft='8px';
       w.addEventListener('click',async()=>{w.disabled=true;
        try{const r=await lmsRequest('school_application_offer_withdraw',{application_id:app.id,instructor_id:o.instructor_id});
         status(r.notice||'Offer withdrawn.');loading=false;await refresh();}
        catch(error){status(error.message||'Unable to withdraw offer',true);w.disabled=false;}});
      }
     }
    }
    if(!app.instructor_id){
     const multiLabel=append(offerBox,element('label','Offer to several instructors (first to accept gets the student)'));
     const multi=append(multiLabel,element('select'));multi.multiple=true;multi.size=Math.min(6,Math.max(2,(instructors||[]).length));
     const open=new Set(offers.filter(o=>o.status==='offered').map(o=>o.instructor_id));
     for(const t of instructors||[]){if(open.has(t.user_id))continue;append(multi,element('option',t.name)).value=t.user_id;}
     append(offerBox,element('p','Hold Ctrl (Windows) or ⌘ (Mac) to pick more than one.','admissions-admin-hint'));
     const offerBtn=append(offerBox,element('button','Offer to selected'));offerBtn.type='button';
     offerBtn.addEventListener('click',async()=>{
      const ids=[...multi.selectedOptions].map(o=>o.value);
      if(!ids.length){status('Select at least one instructor to offer to.',true);return;}
      offerBtn.disabled=true;
      try{const r=await lmsRequest('school_application_offer',{application_id:app.id,instructor_ids:ids});
       status(r.notice||'Offers sent.');loading=false;await refresh();}
      catch(error){status(error.message||'Unable to send offers',true);}
      finally{offerBtn.disabled=false;}
     });
    }
   }
   const form=append(box,element('form',undefined,'admissions-admin-review'));
   const label=append(form,element('label','Review status'));
   const sel=append(label,element('select'));sel.name='status';
   for(const name of statuses){
    const option=append(sel,element('option',name.replaceAll('_',' ')));option.value=name;
    if(name===app.status)option.selected=true;
   }
   const noteLabel=append(form,element('label','Internal review note'));
   const note=append(noteLabel,element('textarea'));note.name='note';note.maxLength=2500;note.rows=2;note.value=app.reviewer_note||'';
   const save=append(form,element('button','Save review'));save.type='submit';
   append(form,element('p','Accepting sends the applicant a welcome email listing their requested classes (when email is configured).','admissions-admin-hint'));
   form.addEventListener('submit',async event=>{
    event.preventDefault();save.disabled=true;
    try{
     const result=await lmsRequest('school_application_review',{
      application_id:app.id,status:sel.value,note:note.value
     });
     status(result.notice||'Application review saved.');
     // The previous refresh is still running until its handler returns;
     // unlock before reloading the updated application status.
     loading=false;
     await refresh();
    }catch(error){status(error.message||'Unable to save admissions review',true);}
    finally{save.disabled=false;}
   });
  }
  if(!rows.length)append(root,element('p','No school applications match this filter.','admissions-admin-empty'));
  status(rows.length+' application'+(rows.length===1?'':'s')+' shown. Only administrators can access these records.');
 }catch(error){status('Admissions could not be loaded: '+(error.message||'Try again'),true);}
 finally{button.disabled=false;loading=false;}
}
async function init(){
 const {data}=await db.auth.getSession();
 if(!data?.session)return;
 const session=await lmsRequest('session');
 if(session.role!=='owner'||session.account?.must_change_password)return;
 $('admissions-admin').hidden=false;
 $('admissions-filter').addEventListener('change',refresh);
 $('admissions-refresh').addEventListener('click',refresh);
 await refresh();
}
init().catch(()=>{/* Never show admissions data on failed role verification. */});

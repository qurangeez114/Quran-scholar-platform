import {db} from './client.js';
import {lmsRequest} from './lms-access.js';
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let snapshot,state;
const status=text=>$('status').textContent=text;
const person=id=>snapshot.people.find(p=>p.user_id===id);
const name=id=>person(id)?.display_name||person(id)?.email||id;
const instructorLink=(id,label)=>{
  // IDs originate from the authenticated dashboard snapshot; never insert them unescaped.
  const text=esc(label||name(id));
  return '<a class="faculty-name-link" href="/faculty.html?id='+encodeURIComponent(id)+'" title="View instructor profile: '+text+'">'+text+'</a>';
};
const course=id=>snapshot.courses.find(c=>c.id===id);
const quiz=id=>snapshot.quizzes.find(q=>q.id===id);
const lesson=id=>snapshot.lessons.find(l=>l.id===id);
const courseAttempts=(uid,cid)=>snapshot.attempts.filter(a=>a.user_id===uid&&lesson(quiz(a.quiz_id)?.lesson_id)?.course_id===cid);
function options(select,rows,value,label,placeholder){
 const previous=select.value;select.innerHTML=(placeholder?`<option value="">${esc(placeholder)}</option>`:'')+rows.map(row=>`<option value="${esc(value(row))}">${esc(label(row))}</option>`).join('');
 if([...select.options].some(o=>o.value===previous))select.value=previous;
}
function roleForm(){
 const student=$('provision-form').elements.role.value==='student';
 $('course-label').hidden=!student;$('provision-form').elements.course_id.required=student;
 $('provision-submit').textContent=student?'Enroll student':'Authorize instructor';
}
function filteredCourses(){return snapshot.courses.filter(c=>(!$('instructor-filter').value||c.created_by===$('instructor-filter').value)&&(!$('class-filter').value||c.id===$('class-filter').value));}
function render(){
 const owner=state.role==='owner';
 $('title').textContent=owner?'Admin Page':'Instructor Dashboard';
 $('instructors-panel').hidden=!owner;$('role-label').hidden=!owner;$('instructor-filter').parentElement.hidden=!owner;
 $('profile-panel').hidden=owner;
 if(!owner){$('provision-form').elements.role.value='student';$('provision-title').textContent='Enroll a student in your class';}
 roleForm();
 const instructors=snapshot.accounts.filter(a=>a.role==='instructor');
 $('metrics').innerHTML=[['Instructors',owner?instructors.length:1],['Classes',snapshot.courses.length],['Students',new Set(snapshot.enrollments.map(e=>e.user_id)).size],['Saved quiz attempts',snapshot.attempts.length]].map(([label,count])=>`<div><strong>${count}</strong>${label}</div>`).join('');
 options($('provision-form').elements.course_id,snapshot.courses,c=>c.id,c=>c.title,'Select a class');
 options($('class-filter'),snapshot.courses,c=>c.id,c=>c.title,'All classes');
 const creatorIds=[...new Set(snapshot.courses.map(c=>c.created_by).concat(instructors.map(i=>i.user_id)))];
 options($('instructor-filter'),creatorIds,id=>id,id=>name(id),'All instructors');
 options($('country-filter'),[...new Set(instructors.map(i=>i.country).filter(Boolean))].sort(),v=>v,v=>v,'All countries');
 const eligible=instructors.filter(i=>!$('country-filter').value||i.country===$('country-filter').value);
 options($('city-filter'),[...new Set(eligible.map(i=>i.city).filter(Boolean))].sort(),v=>v,v=>v,'All cities');
 const term=$('search').value.toLowerCase();
 const visible=instructors.filter(i=>(`${i.display_name} ${i.email}`).toLowerCase().includes(term)&&(!$('country-filter').value||i.country===$('country-filter').value)&&(!$('city-filter').value||i.city===$('city-filter').value)).sort((a,b)=>String(a[$('sort').value]).localeCompare(String(b[$('sort').value])));
 $('instructors').innerHTML=visible.map(i=>`<article class="card"><h3>${instructorLink(i.user_id,i.display_name)}</h3><p>${esc(i.email)}</p><p>${esc(i.city||'City not set')}, ${esc(i.country||'Country not set')}</p><p>${i.active?'Active':'Suspended'} · ${i.must_change_password?'Password change pending':'Account ready'}</p><a href="/faculty-admin.html?id=${encodeURIComponent(i.user_id)}" class="faculty-edit-link">Edit account &amp; faculty profile</a> <button type="button" data-view="${i.user_id}">View classes and students</button> <button type="button" data-invite="${i.user_id}" ${i.active?'':'disabled title="Restore the account before inviting"'}>Resend invitation email</button> <button type="button" data-toggle="${i.user_id}" data-active="${i.active}">${i.active?'Suspend access':'Restore access'}</button></article>`).join('')||'<p>No matching instructors.</p>';
 const courses=filteredCourses(),ids=new Set(courses.map(c=>c.id));
 $('classes').innerHTML=courses.map(c=>`<article class="card"><h3>${esc(c.title)}</h3><p>${instructorLink(c.created_by)} · ${c.is_published?'Published':'Draft'}</p><p>${snapshot.enrollments.filter(e=>e.course_id===c.id).length} enrolled students</p><a href="/admin/lesson-manager.html?course=${c.id}">Lessons</a><a href="/course.html?course=${c.id}&preview=1">Preview as student</a><a href="/admin/grading.html?tab=quizzes&course=${c.id}">Results</a></article>`).join('')||'<p>No matching classes.</p>';
 const studentTerm=$('student-search').value.toLowerCase();
 const matches=id=>`${name(id)} ${person(id)?.email||''}`.toLowerCase().includes(studentTerm);
 $('students').innerHTML=snapshot.enrollments.filter(e=>ids.has(e.course_id)&&matches(e.user_id)).map(e=>{
 const attempts=courseAttempts(e.user_id,e.course_id),best=attempts.reduce((b,a)=>!b||a.score>b.score?a:b,null),latest=attempts[0];
 const total=snapshot.lessons.filter(l=>l.course_id===e.course_id).length;
 const done=snapshot.progress.filter(p=>p.user_id===e.user_id&&p.course_id===e.course_id&&p.completed).length;
 const work=snapshot.submissions.filter(s=>s.user_id===e.user_id&&snapshot.assignments.some(a=>a.id===s.assignment_id&&lesson(a.lesson_id)?.course_id===e.course_id)).length;
 return `<tr><td>${esc(name(e.user_id))}<br>${esc(person(e.user_id)?.email)}</td><td>${esc(course(e.course_id)?.title)}</td><td>${instructorLink(course(e.course_id)?.created_by)}</td><td>${total?Math.round(done/total*100):0}% (${done}/${total})</td><td>${latest?`${latest.score}% · ${latest.passed?'Passed':'Not passed'}`:'—'}</td><td>${best?`${best.score}% · ${best.passed?'Passed':'Not passed'}`:'—'}</td><td>${work}</td><td><button type="button" data-invite-student="${e.user_id}" data-course="${e.course_id}">Resend login email</button></td></tr>`;
 }).join('')||'<tr><td colspan="8">No enrolled students match these filters.</td></tr>';
 $('attempts').innerHTML=snapshot.attempts.filter(a=>ids.has(lesson(quiz(a.quiz_id)?.lesson_id)?.course_id)&&matches(a.user_id)).map(a=>{
 const l=lesson(quiz(a.quiz_id)?.lesson_id);return `<tr><td>${esc(name(a.user_id))}</td><td>${esc(course(l?.course_id)?.title)}<br>${esc(l?.title)}</td><td>${a.score}%</td><td>${a.passed?'Passed':'Not passed'}</td><td>${esc(new Date(a.submitted_at).toLocaleString())}</td><td><details><summary>Submitted answers</summary><pre>${esc(JSON.stringify(a.answers,null,2))}</pre></details></td></tr>`;
 }).join('')||'<tr><td colspan="6">No saved quiz attempts match these filters.</td></tr>';
}
async function refresh(){snapshot=await lmsRequest('dashboard');render();status('Dashboard updated.');}
async function submit(form,action){
 const button=form.querySelector('button');button.disabled=true;
 try{const values=Object.fromEntries(new FormData(form));const result=await lmsRequest(action,values);form.elements.temporaryPassword&&(form.elements.temporaryPassword.value='');await refresh();status(result.message||'Saved.');}
 catch(e){status(e.message);}finally{button.disabled=false;}
}
$('provision-form').onsubmit=e=>{e.preventDefault();return submit(e.currentTarget,'provision');};
$('provision-form').elements.role.onchange=roleForm;
$('password-form').onsubmit=async e=>{
 e.preventDefault();const form=e.currentTarget,values=Object.fromEntries(new FormData(form));
 if(values.newPassword!==values.confirmPassword)return status('New passwords do not match.');
 form.querySelector('button').disabled=true;
 try{await lmsRequest('change_password',values);form.reset();await db.auth.refreshSession();if(state.role==='student'){location.replace('/student-dashboard.html');return;}await start();}
 catch(error){status(error.message);}finally{form.querySelector('button').disabled=false;}
};
for(const id of ['search','country-filter','city-filter','sort','instructor-filter','class-filter','student-search'])$(id).addEventListener('input',()=>{if(id==='country-filter')$('city-filter').value='';render();});
$('refresh').onclick=()=>refresh().catch(e=>status(e.message));
$('students').onclick=async e=>{
 const invite=e.target.closest('[data-invite-student]');
 if(!invite)return;
 invite.disabled=true;status('Requesting student sign-in email…');
 try{
  const result=await lmsRequest('resend_student_invite',{
   user_id:invite.dataset.inviteStudent,course_id:invite.dataset.course
  });
  status(result.message||'Student invitation email requested.');
 }catch(error){status('Student email could not be requested: '+error.message);}
 finally{invite.disabled=false;}
};
$('instructors').onclick=async e=>{
 const view=e.target.closest('[data-view]');if(view){$('instructor-filter').value=view.dataset.view;$('class-filter').value='';render();$('classes').scrollIntoView({behavior:'smooth'});return;}
 const invite=e.target.closest('[data-invite]');if(invite){
  invite.disabled=true;status('Requesting instructor email…');
  try{const result=await lmsRequest('resend_instructor_invite',{user_id:invite.dataset.invite});status(result.message||'Invitation email requested.');}
  catch(error){status('Could not send invitation: '+error.message);}
  finally{invite.disabled=false;}
  return;
 }
 const toggle=e.target.closest('[data-toggle]');if(!toggle)return;
 toggle.disabled=true;try{await lmsRequest('set_instructor_active',{user_id:toggle.dataset.toggle,active:toggle.dataset.active!=='true'});await refresh();}catch(error){status(error.message);toggle.disabled=false;}
};
async function start(){
 $('dashboard').hidden=true;$('password-panel').hidden=true;
 const {data}=await db.auth.getSession();if(!data.session){status('Sign in through My Account to continue.');return;}
 state=await lmsRequest('session');
 if(state.account?.must_change_password){$('password-panel').hidden=false;status('Set your own password to continue.');return;}
 if(!['owner','instructor'].includes(state.role)){status('This page is for authorized instructors and the owner.');return;}
 await refresh();$('dashboard').hidden=false;
}
start().catch(e=>status(e.message));

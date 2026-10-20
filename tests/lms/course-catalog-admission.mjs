import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {parseHTML} from 'linkedom';
import {transform} from 'esbuild';

const catalogHTML=readFileSync('courses.html','utf8');
const courseHTML=readFileSync('course.html','utf8');
const enrolledId='10000000-0000-4000-8000-000000000001';
const pendingId='10000000-0000-4000-8000-000000000002';
const availableId='10000000-0000-4000-8000-000000000003';
const source=[
 {id:enrolledId,title:'Enrolled Class',description:'Learner has joined'},
 {id:pendingId,title:'Pending Class',description:'Instructor reviewing request'},
 {id:availableId,title:'Research <img src=x onerror=alert(1)>',description:'Not yet enrolled'}
];
const catalogSrc=catalogHTML.split('<script type="module">')[1]?.split('</script>')[0]
 .replace(/^\s*import .*?;\s*$/gm,'');
assert.ok(catalogSrc,'Catalog script must exist');
await transform(catalogSrc,{loader:'js',format:'esm'});
const {document,window}=parseHTML(catalogHTML);
const nav={href:''};
const invocations=[];
const fakeAuth={
 auth:{getSession:async()=>({data:{session:{user:{id:'student',email:'student@example.invalid'}}}})},
 functions:{invoke:async(_,data)=>{
  invocations.push(data.body);
  if(data.body.action==='enrollment_requests'){
   return{data:{student_requests:[{course_id:pendingId,status:'pending'}]},error:null};
  }
  return{data:{},error:null};
 }}
};
const getEnrollment=async id=>id===enrolledId?{user_id:'student',course_id:id}:null;
const enrollInCourse=async id=>{assert.equal(id,availableId);return{request_submitted:true,status:'pending'};};
await runInNewContext('(async()=>{'+catalogSrc+'})()',{
 document,location:nav,supabase:fakeAuth,getCourses:async()=>source,
 getEnrollment,enrollInCourse,setTimeout:()=>0,console,Map
});
const cards=[...document.querySelectorAll('.course-card')];
assert.equal(cards.length,3);
assert.equal(cards[0].querySelector('button').textContent,'Open class');
assert.equal(cards[1].querySelector('button').textContent,'View enrollment request');
assert.equal(cards[2].querySelector('button').textContent,'Request admission');
assert.equal(cards[1].querySelector('.course-meta').textContent,'Awaiting instructor approval');
assert.equal(document.querySelectorAll('img').length,0,'Catalog must not inject untrusted course titles into HTML');
for(const c of cards){
 assert.ok(c.querySelector('a.course-detail-link[href^="/course.html?course="]'),
  'Every class requires a working course detail link');
}
cards[0].querySelector('button').dispatchEvent(new window.Event('click'));
assert.equal(nav.href,'/course.html?course='+enrolledId,'Approved students open their class');
nav.href='';
cards[1].querySelector('button').dispatchEvent(new window.Event('click'));
assert.equal(nav.href,'/academic-hub.html?tab=courses','Pending students go to request management');
nav.href='';
cards[2].querySelector('button').dispatchEvent(new window.Event('click'));
await new Promise(r=>setTimeout(r,20));
assert.equal(document.querySelectorAll('.course-card')[2].querySelector('button').textContent,
 'View enrollment request','Request button must update to pending, not enrolled');
assert.equal(invocations.filter(x=>x.action==='enrollment_requests').length,1,
 'Request status fetched once, not once per card');
assert.match(document.getElementById('alertContainer').textContent,/after the receiving instructor approves/);
assert.doesNotMatch(catalogSrc,/Math\.random\(/,'Never invent lesson counts');
assert.doesNotMatch(catalogSrc,/Successfully enrolled in course!/,'No false admission confirmation');

// The course detail page must distinguish missing permission from missing content.
const {document:courseDocument}=parseHTML(courseHTML);
const rStart=courseHTML.indexOf('    function renderLessons() {'),rEnd=courseHTML.indexOf('    async function loadMaterials()',rStart);
assert.ok(rStart>0&&rEnd>rStart);
const renderCode=courseHTML.slice(rStart,rEnd);
function renderCase({enrollment=null,enrollmentRequest=null,includedByInstructor=null,lessons=[]}){
 const context={document:courseDocument,enrollment,enrollmentRequest,
 includedByInstructor,preview:false,lessons,esc:v=>String(v)};
 runInNewContext(renderCode+';renderLessons()',context);
 return courseDocument.getElementById('lessonsList').textContent;
}
assert.match(renderCase({enrollmentRequest:{status:'pending'}}),/Waiting for instructor approval/);
assert.match(renderCase({enrollmentRequest:{status:'pending'}}),/once the receiving instructor approves/);
assert.match(renderCase({enrollmentRequest:{status:'consent_pending'}}),/Your confirmation is needed/);
assert.match(renderCase({}),/Class lessons require enrollment/);
assert.match(renderCase({enrollment:{id:'enrolled'},lessons:[]}),/No lessons have been published/);
const gStart=courseHTML.indexOf('    window.goToLesson = function(lessonId) {');
const gEnd=courseHTML.indexOf('    window.handleAction = function()',gStart);
assert.ok(gStart>0&&gEnd>gStart);
const ctx={window:{location:{href:''}},enrollment:null,preview:false,
 includedByInstructor:{id:pendingId},showAlert:()=>{throw Error('Wrongly blocked included lessons')},encodeURIComponent};
runInNewContext(courseHTML.slice(gStart,gEnd),ctx);
ctx.window.goToLesson(availableId);
assert.equal(ctx.window.location.href,'/lesson.html?lesson='+availableId,
 'Students authorized via instructor course inclusion must be able to open linked lessons');
console.log('PASS: class detail links, pending admission status, no false enrollment, safe course titles, awaiting-approval lesson gate and authorized lesson navigation.');

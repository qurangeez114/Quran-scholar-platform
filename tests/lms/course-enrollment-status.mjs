import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const html=readFileSync('course.html','utf8');
const from=html.indexOf('    function updateUI() {');
const end=html.indexOf('    window.enrollInCourse = async function()',from);
assert.ok(from>=0&&end>from,'Course status UI function must exist');
const code=html.slice(from,end);
assert.match(html,/action:'enrollment_requests'/,'Page fetches student requests from the protected API');
assert.match(html,/\['pending','consent_pending'\]/,'Both approval and consent states are handled');
assert.match(code,/View Enrollment Request/);
assert.ok(code.includes('/academic-hub.html?tab=courses'));
function check(request,expectedStatus,expectedLabel,redirect){
 const elements=Object.fromEntries(['actionBtn','enrollmentStatus','progressCard','certificateSection'].map(id=>
  [id,{textContent:'',disabled:false,onclick:null,style:{}}]));
 const window={location:{href:''}};
 const enrollment=null,preview=false,lessons=[],progress=[],enrollmentRequest=request,includedByInstructor=null;
 const currentUser={id:'10000000-0000-4000-8000-000000000001'};
 const context={document:{getElementById:id=>elements[id]},window,enrollment,preview,lessons,progress,includedByInstructor,
  enrollmentRequest,currentUser,console,enrollInCourse:()=>{}};
 runInNewContext(code+'; updateUI();',context);
 assert.equal(elements.enrollmentStatus.textContent,expectedStatus);
 assert.equal(elements.actionBtn.textContent,expectedLabel);
 assert.equal(elements.actionBtn.disabled,false);
 assert.equal(typeof elements.actionBtn.onclick,'function');
 if(redirect){
   elements.actionBtn.onclick();
   assert.equal(window.location.href,'/academic-hub.html?tab=courses');
 }else{
   assert.equal(window.location.href,'');
 }
}
check({status:'pending'},'Admission request pending instructor approval','View Enrollment Request',true);
check({status:'consent_pending'},'Instructor recommendation — your confirmation required','View Enrollment Request',true);
check(null,'Not enrolled','📚 Request Enrollment',false);
console.log('PASS: course action reflects pending admission, required consent and new-request state without duplicate enrollment.');

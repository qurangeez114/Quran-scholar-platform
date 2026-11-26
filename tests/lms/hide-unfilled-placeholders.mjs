import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createContext, runInContext} from 'node:vm';

const TBP='To be provided by QuranHikma';
const publicPages=[
  'calendar.html','catalog.html','certificate.html','policies.html',
  'student-handbook.html','syllabus.html','transcript.html','apply.html',
  'contact.html','faculty.html','courses.html','course.html'
];
for(const f of publicPages){
  const html=readFileSync(f,'utf8');
  assert.doesNotMatch(html,new RegExp(TBP),f+' still shows the placeholder');
  assert.doesNotMatch(html,/class="tbp"/,f+' still styles a placeholder');
}

const catalog=readFileSync('catalog.html','utf8');
assert.match(catalog,/INSTITUTION\.catalogYear/);
assert.match(catalog,/row\('Catalog year'/);
assert.match(catalog,/row\('Institutional accreditation'/);
assert.match(catalog,/row\('Credit-hour definition'/);
assert.match(catalog,/meta\('Credit'/);
assert.match(catalog,/Related policies/);

const calendar=readFileSync('calendar.html','utf8');
assert.match(calendar,/Term dates have not been published yet/);
assert.match(calendar,/href="\/student-handbook\.html#calendar"/);
assert.doesNotMatch(calendar,/<td>Term start<\/td>/);

const handbook=readFileSync('student-handbook.html','utf8');
assert.match(handbook,/Term dates have not been published yet/);
assert.match(handbook,/Minimum age:\s*18/);
assert.match(handbook,/QuranHikma makes no accreditation claim unless it is stated here/);
assert.match(handbook,/id="calendar"/);
assert.match(handbook,/id="admissions"/);

const policies=readFileSync('policies.html','utf8');
assert.match(policies,/id="refund"/);
assert.match(policies,/refund schedule will be published before enrollment/);
assert.doesNotMatch(policies,/Before the course start date/);
assert.match(policies,/The minimum grade to earn a certificate is stated in each course syllabus/);

const certificate=readFileSync('certificate.html','utf8');
assert.match(certificate,/Certificates record completion of a QuranHikma online course/);
assert.match(certificate,/INSTITUTION\.certificateCredit/);

const transcript=readFileSync('transcript.html','utf8');
assert.match(transcript,/Unofficial record/);
assert.doesNotMatch(transcript,/<th>Credit<\/th>/);
assert.match(transcript,/log in/);

const editor=readFileSync('admin/syllabus-editor.html','utf8');
assert.match(editor,/Leave a field empty to hide it on the catalog and syllabus until it is filled/);
assert.doesNotMatch(editor,new RegExp(TBP));

const raw=readFileSync('academic/academic.js','utf8');
const start=raw.indexOf('export const INSTITUTION=');
const end=raw.indexOf('export async function rest');
const js=raw.slice(start,end).replaceAll('export function ','function ').replaceAll('export const ','var ');
const ctx=createContext({String,Array,Object});
runInContext(js+'\nthis.INSTITUTION=INSTITUTION;this.filled=filled;this.val=val;this.row=row;this.tbp=tbp;this.meta=meta;',ctx);
assert.equal(ctx.INSTITUTION.catalogYear,'');
assert.equal(ctx.INSTITUTION.accreditation,'');
assert.equal(ctx.INSTITUTION.creditHourDefinition,'');
assert.equal(ctx.val(''),'');
assert.equal(ctx.val(null),'');
assert.equal(ctx.val('2026–27'),'2026–27');
assert.equal(ctx.tbp('anything'),'');
assert.equal(ctx.row('Catalog year',''),'');
assert.match(ctx.row('Catalog year','2026–27'),/<th scope="row">Catalog year<\/th><td>2026–27<\/td>/);
assert.equal(ctx.meta('Credit',''),'');
assert.match(ctx.meta('Credit','3 hours'),/Credit:.*3 hours/);

// No leftover placeholder text in other public HTML at the repo root or academic/.
const skip=new Set(['index-1.html']);
for(const f of readdirSync('.').filter(n=>n.endsWith('.html'))){
  if(skip.has(f)) continue;
  const html=readFileSync(f,'utf8');
  assert.doesNotMatch(html,new RegExp(TBP),f+' at repo root still shows the placeholder');
}

console.log('PASS: unfilled institutional fields are hidden until values are provided, and public pages no longer show “To be provided by QuranHikma”.');

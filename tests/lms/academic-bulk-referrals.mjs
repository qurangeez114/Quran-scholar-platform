import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const src=readFileSync('courses-api.js','utf8');
const first=src.indexOf('export async function bulkEnrollStudents(');
const last=src.indexOf('export async function enrollInCourse(',first);
assert.ok(first>0&&last>first,'Existing bulk helper is present');
const code=src.slice(first,last).replace('export async function ','async function ');
assert.doesNotMatch(code,/\.from\('qh_enrollments'\)/,'Bulk helper cannot directly create enrollment records');
const teacher='10000000-0000-4000-8000-000000000001';
const course='20000000-0000-4000-8000-000000000002';
const courseObj={id:course,created_by:'10000000-0000-4000-8000-000000000004',visibility:'public',is_published:true,access_closes_at:null};
const requests=[];
let unknown=[];
const supabase={
 auth:{getUser:async()=>({data:{user:{id:teacher}},error:null})},
 from(table){
  assert.ok(['qh_courses','qh_profiles'].includes(table),'Only course and profile lookups are permitted');
  return {
   select(){return this;},eq(key,val){
    this.table=table;this.key=key;this.value=val;return this;
   },
   async maybeSingle(){
    if(this.table==='qh_courses')return{data:courseObj,error:null};
    return{data:unknown.includes(this.value)?null:{user_id:'10000000-0000-4000-8000-000000000003'},error:null};
   }
  };
 },
 functions:{invoke:async(name,{body})=>{
  assert.equal(name,'academic-hub');
  assert.equal(body.action,'enrollment_request');
  requests.push(body);
  return{data:{id:'30000000-0000-4000-8000-000000000001',status:'consent_pending'},error:null};
 }}
};
const bulk=runInNewContext('(function(){'+code+';return bulkEnrollStudents})()',{supabase,Date,Error});
let result=await bulk(course,[' Student@Example.org ','bad address','absent@example.org']);
assert.equal(result.successful.length,2);
assert.equal(result.failed.length,1);
assert.equal(result.successful[0].email,'student@example.org');
assert.equal(result.successful[0].status,'consent_pending');
assert.equal(result.successful[0].enrollmentId,null);
assert.equal(requests.length,2);
assert.ok(requests.every(r=>r.student_id==='10000000-0000-4000-8000-000000000003'));
assert.ok(result.successful.every(r=>r.notice.includes('student consent')));
const count=requests.length;
courseObj.created_by=teacher;
await assert.rejects(bulk(course,['student@example.org']),/instructor roster invitation/);
assert.equal(requests.length,count,'Own-class bulk helper must never silently enroll');
courseObj.created_by='10000000-0000-4000-8000-000000000004';
courseObj.access_closes_at='2020-01-01T00:00:00Z';
await assert.rejects(bulk(course,['student@example.org']),/closed or unpublished/);
assert.equal(requests.length,count);
console.log('PASS: bulk helper uses only pending student-consent requests, never inserts enrollments; own and expired courses rejected.');

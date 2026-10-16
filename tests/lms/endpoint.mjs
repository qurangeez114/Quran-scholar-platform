import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
const owner='10000000-0000-4000-8000-000000000001',teacher='10000000-0000-4000-8000-000000000002',student='10000000-0000-4000-8000-000000000003',pending='10000000-0000-4000-8000-000000000004';
const a='20000000-0000-4000-8000-000000000001',b='20000000-0000-4000-8000-000000000002';
const tables={qh_staff_members:[{user_id:owner}],qh_lms_accounts:[{user_id:teacher,role:'instructor',active:true,must_change_password:false},{user_id:pending,role:'instructor',active:true,must_change_password:true}],qh_courses:[{id:a,created_by:teacher,title:'A'},{id:b,created_by:owner,title:'B'}],qh_enrollments:[],qh_lessons:[],qh_quizzes:[],qh_quiz_answers:[],qh_student_progress:[],qh_assignments:[],qh_assignment_submissions:[]};
let created=0,passwordUpdates=0;
const users=[owner,teacher,student,pending].map(id=>({id,email:id+'@example.invalid'}));
class Query{
 constructor(table){this.table=table;this.filters=[];this.operation='select';this.singleRow=false;}
 select(){return this;}eq(k,v){this.filters.push(r=>r[k]===v);return this;}in(k,values){this.filters.push(r=>values.includes(r[k]));return this;}order(){return this;}maybeSingle(){this.singleRow=true;return this;}single(){this.singleRow=true;return this;}
 update(values){this.operation='update';this.values=values;return this;}upsert(values){this.operation='upsert';this.values=values;return this;}
 then(resolve,reject){try{
 let rows=(tables[this.table]||[]).filter(r=>this.filters.every(f=>f(r)));
 if(this.operation==='update')rows.forEach(r=>Object.assign(r,this.values));
 if(this.operation==='upsert'){let match=(tables[this.table]||[]).find(r=>r.user_id===this.values.user_id&&(!this.values.course_id||r.course_id===this.values.course_id));if(match)Object.assign(match,this.values);else {match={...this.values};tables[this.table].push(match);}rows=[match];}
 return Promise.resolve({data:this.singleRow?rows[0]||null:rows,error:null}).then(resolve,reject);
 }catch(e){return Promise.reject(e).then(resolve,reject);}}
}
const client={from:table=>new Query(table),auth:{getUser:async token=>({data:{user:users.find(u=>u.id===token)||null},error:null}),signInWithPassword:async()=>({error:null}),signOut:async()=>({error:null}),admin:{listUsers:async()=>({data:{users},error:null}),createUser:async values=>{created++;const user={id:crypto.randomUUID(),email:values.email};users.push(user);return {data:{user},error:null};},updateUserById:async()=>{passwordUpdates++;return {error:null};},getUserById:async id=>({data:{user:users.find(u=>u.id===id)},error:null})}}};
let handler;
let source=(await transform(await readFile(new URL('../../supabase/functions/lms-admin/index.ts',import.meta.url),'utf8'),{loader:'ts',format:'esm'})).code;source=source.replace(/^import .*\n/,'');
runInNewContext(source,{createClient:()=>client,Deno:{env:{get:()=>''},serve:fn=>handler=fn},Response,Request,console});
const call=async(id,body)=>{const headers={'Content-Type':'application/json'};if(id)headers.Authorization='Bearer '+id;const response=await handler(new Request('https://test.invalid',{method:'POST',headers,body:JSON.stringify(body)}));return {status:response.status,data:await response.json()};};
assert.equal((await call(null,{action:'dashboard'})).status,401);
assert.equal((await call(student,{action:'dashboard'})).status,403);
assert.equal((await call(pending,{action:'dashboard'})).status,403);
assert.equal((await call(teacher,{action:'provision',role:'instructor'})).status,403);
assert.equal((await call(teacher,{action:'provision',role:'student',course_id:b})).status,403);
assert.equal((await call(teacher,{action:'set_instructor_active',user_id:pending,active:false})).status,403);
const dash=await call(teacher,{action:'dashboard'});assert.equal(dash.status,200);assert.equal(dash.data.courses.length,1);assert.equal(dash.data.courses[0].id,a);
const enroll=await call(teacher,{action:'provision',role:'student',course_id:a,email:users[2].email,display_name:'Existing student'});assert.equal(enroll.status,200);assert.equal(enroll.data.created,false);assert.equal(passwordUpdates,0);assert.equal(created,0);
const provision=await call(owner,{action:'provision',role:'instructor',email:'new@example.invalid',display_name:'New instructor',temporaryPassword:'Temporary-example-123',country:'Eritrea',city:'Asmara'});assert.equal(provision.status,200);assert.equal(created,1);assert.equal(tables.qh_lms_accounts.at(-1).must_change_password,true);assert.equal(tables.qh_staff_members.length,1);
assert.equal((await call(pending,{action:'change_password',currentPassword:'same-password-123',newPassword:'same-password-123'})).status,400);
const change=await call(pending,{action:'change_password',currentPassword:'temp-password-123',newPassword:'new-password-123'});assert.equal(change.status,200);assert.equal(tables.qh_lms_accounts.find(a=>a.user_id===pending).must_change_password,false);
assert.equal((await call(owner,{action:'set_instructor_active',user_id:teacher,active:false})).status,200);
assert.equal((await call(teacher,{action:'dashboard'})).status,403);
console.log('PASS: endpoint authentication, instructor scope, account creation, password gate, suspension, and existing-password preservation.');

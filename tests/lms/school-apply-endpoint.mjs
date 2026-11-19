import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {transform} from 'esbuild';
const src=readFileSync('supabase/functions/school-apply/index.ts','utf8');
const compiled=(await transform(src,{loader:'ts',format:'esm'})).code.replace(/^import\s+.*?;\s*$/gm,'');
const records=[];
let handler,serviceReads=0;
class Query {
 constructor(table){this.table=table;this.filters=[];this.inserted=null;}
 select(){return this;}
 eq(k,v){this.filters.push(x=>x[k]===v);return this;}
 gte(k,v){this.filters.push(x=>x[k]>=v);return this;}
 limit(){return this;}
 insert(row){this.inserted=row;return this;}
 single(){
   const row={id:'30000000-0000-4000-8000-000000000001',...this.inserted,submitted_at:new Date().toISOString()};
   records.push(row);return Promise.resolve({data:{id:row.id},error:null});
 }
 then(callback){serviceReads++;return Promise.resolve({data:records.filter(x=>this.filters.every(f=>f(x))),error:null}).then(callback);}
}
const service={from:table=>{assert.equal(table,'qh_school_applications');return new Query(table);}};
runInNewContext(compiled,{
 createClient:()=>service,Deno:{env:{get:()=>''},serve:fn=>handler=fn},
 Request,Response,Date,JSON,URL,Number,Array,Error,console
});
const base={
 full_name:'Application Student',email:'student@example.invalid',country:'US',city:'Burbank',
 program_interest:'quranic_studies',learning_goal:'I want to research classical source evidence.',
 education_level:'secondary',preferred_language:'English',attendance_mode:'either',
 academic_background:'Independent reading',privacy_consent:true,
 date_of_birth:'1990-06-15'
};
async function submit(override={},options={}){
 const headers={'Content-Type':'application/json'};
 if(options.origin)headers.Origin=options.origin;
 const res=await handler(new Request('https://service.invalid/functions/v1/school-apply',
  {method:'POST',headers,body:JSON.stringify({...base,...override})}));
 return{code:res.status,data:await res.json()};
}
let r=await submit({privacy_consent:false});assert.equal(r.code,400);
r=await submit({email:'bad address'});assert.equal(r.code,400);
r=await submit({learning_goal:'short'});assert.equal(r.code,400);
r=await submit({organization_website:'https://bot.test'});assert.equal(r.code,400);
r=await submit({program_interest:'unsupported'});assert.equal(r.code,400);
r=await submit({}, {origin:'https://attacker.invalid'});assert.equal(r.code,403);
assert.equal(records.length,0,'Invalid applications must never be stored');
r=await submit();assert.equal(r.code,201,JSON.stringify(r.data));
assert.equal(r.data.received,true);
assert.equal(records.length,1);
assert.equal(records[0].email,'student@example.invalid');
assert.equal(records[0].privacy_consent,true);
r=await submit();assert.equal(r.code,200,'Repeated email should be rate-limited');
assert.equal(records.length,1);
assert.ok(!('reference' in r.data),'Duplicate email must never disclose existing application ID');
r=await submit({email:'second@example.invalid'});assert.equal(r.code,201);
assert.equal(records.length,2);
assert.ok(serviceReads>=2);
assert.equal(records[0].date_of_birth,'1990-06-15');
assert.equal(records[0].age_at_submission>=18,true);
assert.equal(records[0].guardian_consent,false);
assert.equal(records[0].guardian_name,'');
assert.equal(records[0].phone,'');

const minorDob=(new Date().getUTCFullYear()-16)+'-01-01';
r=await submit({email:'minor-plain@example.invalid',date_of_birth:minorDob});
assert.equal(r.code,400,'Applicants under 18 must be rejected');
assert.match(String(r.data.error||''),/at least 18 years old/i);
assert.equal(records.length,2,'Rejected minor application must not be stored');

r=await submit({email:'minor-with-guardian@example.invalid',date_of_birth:minorDob,
 guardian_name:'Parent Example',guardian_email:'parent@example.invalid',guardian_consent:true});
assert.equal(r.code,400,'Guardian details do not override the minimum age of 18');
assert.match(String(r.data.error||''),/at least 18 years old/i);
assert.equal(records.length,2);

r=await submit({email:'future@example.invalid',date_of_birth:'2999-01-01'});
assert.equal(r.code,400);
assert.equal(records.length,2);

r=await submit({email:'adult-phone@example.invalid',date_of_birth:'1990-06-15',phone:'+1 555 0100'});
assert.equal(r.code,201,JSON.stringify(r.data));
assert.equal(records[2].phone,'+1 555 0100');
assert.equal(records[2].age_at_submission>=18,true);
assert.equal(records[2].guardian_name,'');
assert.equal(records[2].guardian_consent,false);

r=await submit({email:'adult-nophone@example.invalid',date_of_birth:'1990-06-15'});
assert.equal(r.code,201);
assert.equal(records[3].phone,'');

console.log('PASS: unauthenticated applications require consent, validate fields, reject bots, protect duplicate details, reject applicants under 18, accept optional phone, and accept genuine adult student interest.');

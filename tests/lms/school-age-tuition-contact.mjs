import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext, runInContext} from 'node:vm';

const src=readFileSync('accounts/tuition.js','utf8').replaceAll('export function ','function ');
const ctx=createContext({Intl,Number,String,Error,Math});
runInContext(src+'\nthis.formatTuition=formatTuition;this.tuitionFieldsFromInput=tuitionFieldsFromInput;this.isPaidTuition=isPaidTuition;',ctx);
const {formatTuition,tuitionFieldsFromInput,isPaidTuition}=ctx;

assert.equal(formatTuition({}),'Free');
assert.equal(formatTuition({tuition_type:'free'}),'Free');
assert.equal(formatTuition({tuition_type:'paid',tuition_amount:25,tuition_currency:'USD'}),'$25.00');
assert.equal(isPaidTuition({tuition_type:'paid',tuition_amount:0}),false);
const paid=tuitionFieldsFromInput('paid','40','usd');
assert.equal(paid.tuition_type,'paid');
assert.equal(paid.tuition_amount,40);
assert.equal(paid.tuition_currency,'USD');
assert.equal(paid.tuition,'$40.00');
const free=tuitionFieldsFromInput('free','99','EUR');
assert.equal(free.tuition_type,'free');
assert.equal(free.tuition_amount,null);
assert.equal(free.tuition,'Free');
assert.throws(()=>tuitionFieldsFromInput('paid','0','USD'),/greater than 0/);
assert.throws(()=>tuitionFieldsFromInput('paid','10','US'),/3-letter/);

const handbook=readFileSync('student-handbook.html','utf8');
assert.match(handbook,/Minimum age:\s*18/);
assert.doesNotMatch(handbook,/Minimum age:[\s\S]{0,40}To be provided by QuranHikma/);
assert.match(handbook,/Tuition is set by the instructor for each course/);

const policies=readFileSync('policies.html','utf8');
assert.match(policies,/Minimum age to enroll is 18/);
assert.match(policies,/Tuition is set by the instructor for each course/);
assert.match(policies,/id="refund"/);
assert.match(policies,/To be provided by QuranHikma/);

const contact=readFileSync('contact.html','utf8');
assert.match(contact,/>Email<\/td><td><span class="tbp">To be provided by QuranHikma<\/span>/);
assert.match(contact,/>Phone<\/td><td><span class="tbp">To be provided by QuranHikma<\/span>/);

const courses=readFileSync('admin/courses.html','utf8');
assert.match(courses,/id="courseTuitionType"/);
assert.match(courses,/>Free</);
assert.match(courses,/id="editTuitionType"/);
assert.match(courses,/tuitionFieldsFromInput/);

const catalog=readFileSync('catalog.html','utf8');
assert.match(catalog,/formatTuition/);
assert.match(catalog,/<strong>Tuition:<\/strong>/);

const coursePage=readFileSync('course.html','utf8');
assert.match(coursePage,/id="courseTuition"/);
assert.match(coursePage,/formatTuition/);

const list=readFileSync('courses.html','utf8');
assert.match(list,/Tuition: '\+courseTuitionLabel\(course\)/);

console.log('PASS: minimum age 18 copy, instructor tuition helper and UI, contact values remain unset.');

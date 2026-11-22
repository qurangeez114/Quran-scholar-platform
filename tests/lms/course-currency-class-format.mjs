import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext, runInContext} from 'node:vm';

const load=(file,names)=>{
  const src=readFileSync(file,'utf8').replaceAll('export function ','function ').replaceAll('export const ','var ');
  const ctx=createContext({Intl,Number,String,Error,Math,Array,Object});
  runInContext(src+'\n'+names.map(n=>'this.'+n+'='+n+';').join(''),ctx);
  return ctx;
};
const t=load('accounts/tuition.js',['TUITION_CURRENCIES','currencyOptionsHTML','formatTuition','tuitionFieldsFromInput']);
const codes=t.TUITION_CURRENCIES.map(([c])=>c);
for(const c of ['USD','EUR','GBP','CAD','AUD','SAR','AED','QAR','KWD','EGP','TRY','MYR','IDR','PKR','INR','NGN','KES','ETB','ERN'])
  assert.ok(codes.includes(c),c+' offered');
assert.equal(new Set(codes).size,codes.length,'no duplicate currencies');
for(const c of codes){assert.match(c,/^[A-Z]{3}$/);new Intl.NumberFormat('en-US',{style:'currency',currency:c}).format(1);}
assert.match(t.currencyOptionsHTML('EUR'),/<option value="EUR" selected>/);
assert.match(t.currencyOptionsHTML('XYZ'),/<option value="XYZ" selected>/,'keeps an existing unlisted code');
assert.equal(t.formatTuition({tuition_type:'paid',tuition_amount:30,tuition_currency:'EUR'}),'€30.00');
assert.equal(t.tuitionFieldsFromInput('paid','15','gbp').tuition_currency,'GBP');

const f=load('accounts/class-format.js',['CLASS_FORMATS','classFormatLabel','normalizeClassFormat','isMissingClassFormatColumn']);
assert.equal(JSON.stringify(f.CLASS_FORMATS.map(([v])=>v)),JSON.stringify(['video_text','video','text','live','audio','blended']));
assert.equal(f.classFormatLabel('video_text'),'Video + text');
assert.equal(f.classFormatLabel(null),'');
assert.equal(f.normalizeClassFormat(''),null);
assert.equal(f.normalizeClassFormat('live'),'live');
assert.throws(()=>f.normalizeClassFormat('hologram'),/class format/);
assert.equal(f.isMissingClassFormatColumn({code:'PGRST204',message:"Could not find the 'class_format' column of 'qh_courses' in the schema cache"}),true);
assert.equal(f.isMissingClassFormatColumn({code:'23514',message:'violates check constraint "qh_courses_class_format_check"'}),false);

const mig=readFileSync('supabase/migrations/20261121170000_course_class_format_and_currency_code.sql','utf8');
for(const [v] of f.CLASS_FORMATS)assert.match(mig,new RegExp("'"+v+"'"));
assert.match(mig,/\^\[A-Z\]\{3\}\$/);

const admin=readFileSync('admin/courses.html','utf8');
assert.match(admin,/<select id="courseTuitionCurrency">/);
assert.match(admin,/<select id="editTuitionCurrency">/);
assert.match(admin,/<select id="courseClassFormat">/);
assert.match(admin,/<select id="editClassFormat">/);
assert.doesNotMatch(admin,/return courseTuitionLabel\(course\)/,'no self-recursion in tuition label');
assert.match(readFileSync('admin/syllabus-editor.html','utf8'),/<select id="tuition_currency">/);
for(const p of ['catalog.html','course.html','courses.html','syllabus.html'])
  assert.match(readFileSync(p,'utf8'),/classFormatLabel\(/,p+' shows class format');
const lm=readFileSync('admin/lesson-manager.html','utf8');
assert.match(lm,/<option value="video">Video \+ text notes<\/option>/);
console.log('course currency and class format: ok');

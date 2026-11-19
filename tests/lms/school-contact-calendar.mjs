import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const TBP='To be provided by QuranHikma';
const contact=readFileSync('contact.html','utf8');
const calendar=readFileSync('calendar.html','utf8');
const footer=readFileSync('academic/academic.js','utf8');
const handbook=readFileSync('student-handbook.html','utf8');
const policies=readFileSync('policies.html','utf8');
assert.match(contact,/<h1>Contact QuranHikma<\/h1>/);
assert.match(contact,/>Email<\/td><td><span class="tbp">To be provided by QuranHikma<\/span>/);
assert.match(contact,/>Phone<\/td><td><span class="tbp">To be provided by QuranHikma<\/span>/);
assert.match(contact,/>Hours<\/td><td><span class="tbp">To be provided by QuranHikma<\/span>/);
assert.doesNotMatch(contact,/mailto:/i);
assert.equal((contact.match(/To be provided by QuranHikma/g)||[]).length>=3,true);
assert.match(calendar,/<h1>Academic calendar<\/h1>/);
for(const event of ['Term start','Enrollment deadline','Last day to withdraw with full refund','Last day to withdraw (grade of W)','Final assessments due','Grades posted','Institutional holidays']){
 assert.ok(calendar.includes(event),event+' missing');
}
assert.equal((calendar.match(/To be provided by QuranHikma/g)||[]).length>=7,true);
assert.doesNotMatch(calendar,/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+20\d\d/);
assert.match(footer,/\['Academic Calendar','\/calendar\.html'\]/);
assert.match(footer,/\['Contact','\/contact\.html'\]/);
assert.match(handbook,/href="\/calendar\.html"/);
assert.match(handbook,/href="\/contact\.html"/);
assert.match(policies,/href="\/contact\.html"/);
assert.match(calendar,/href="\/contact\.html"/);
console.log('PASS: contact and calendar pages use institutional placeholders, and footer, handbook and policies link to them.');

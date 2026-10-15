import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const {JSDOM}=await import(process.env.JSDOM_MODULE||'jsdom');
const html=await readFile(new URL('../sample-course.html',import.meta.url),'utf8');
const dom=new JSDOM(html,{url:'https://quranhikma.com/sample-course.html',runScripts:'dangerously',beforeParse(w){w.confirm=()=>true;w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};}});
const d=dom.window.document;const click=id=>{assert(d.getElementById(id),id);d.getElementById(id).click();};
const submit=id=>d.getElementById(id).dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
d.getElementById('name').value='Practice Student';submit('enroll');assert.match(d.getElementById('learner').textContent,/Practice Student/);
click('complete');click('save-excerpt');assert.match(d.getElementById('page-body').value,/Fictional Town Record/);
d.getElementById('page-title').value='Evidence and Interpretation';submit('page-form');assert.match(d.getElementById('notice').textContent,/Page saved/);
click('make-deck');assert.equal(d.querySelectorAll('[data-title]').length,3);click('present');assert.equal(d.getElementById('present-dialog').open,true);click('next-slide');assert.match(d.getElementById('slide-counter').textContent,/2 \/ 3/);click('close-slides');
d.querySelector('[data-view="quiz"]').click();assert.equal(d.getElementById('start-final').disabled,true);click('start-practice');
const originalQuestion=d.querySelector('legend').textContent;
submit('quiz-form');assert.match(d.getElementById('answer-feedback').textContent,/Not answered/);assert.match(d.getElementById('answer-feedback').textContent,/original document/);assert.equal(d.querySelector('input[name="answer"]').disabled,true);
d.querySelector('[data-view="page"]').click();d.querySelector('[data-view="quiz"]').click();assert.match(d.getElementById('answer-feedback').textContent,/Not answered/,'review survives navigation');click('next-question');
d.querySelector('input[value="0"]').checked=true;submit('quiz-form');assert.match(d.getElementById('answer-feedback').textContent,/Why this answer is incorrect/);assert.match(d.getElementById('answer-feedback').textContent,/without a reference/);click('next-question');
click('explain-answer');assert.match(d.getElementById('answer-feedback').textContent,/Correct answer/);click('next-question');
for(const value of [1,2]){d.querySelector('input[value="'+value+'"]').checked=true;submit('quiz-form');assert.match(d.getElementById('answer-feedback').textContent,/Why it is correct/);click('next-question');}
assert.match(d.getElementById('content').textContent,/practice score does not determine/);click('next-final');assert.notEqual(d.querySelector('legend').textContent,originalQuestion,'final question reworded');
for(const value of [2,0,1,2,1]){d.querySelector('input[value="'+value+'"]').checked=true;submit('quiz-form');click('next-question');}
assert.match(d.getElementById('content').textContent,/80%/);assert.match(d.getElementById('content').textContent,/Not passed yet/);assert.equal(d.getElementById('progress').value,3,'80 percent no longer passes');
click('results');assert.match(d.getElementById('content').textContent,/Best final score: 80%/);assert.match(d.getElementById('content').textContent,/Final status: Not passed/);
d.querySelector('[data-view="quiz"]').click();click('start-final');assert.notEqual(d.querySelector('legend').textContent,originalQuestion);
for(const value of [0,1,2,0,2]){d.querySelector('input[value="'+value+'"]').checked=true;submit('quiz-form');click('next-question');}
assert.match(d.getElementById('content').textContent,/100%/);assert.match(d.getElementById('content').textContent,/Passed — understanding demonstrated/);click('results');assert.match(d.getElementById('content').textContent,/Best final score: 100%/);
const saved=JSON.parse(dom.window.localStorage.getItem('qh-sample-course-v1'));assert.equal(saved.attempts.length,3);assert.equal(saved.slides.length,3);assert.equal(saved.page.title,'Evidence and Interpretation');assert.equal(d.getElementById('progress').value,4);
console.log('PASS: enrollment, notes, slides, unanswered feedback, wrong-answer rationale, locked responses, persisted review, reworded final, 80% fail, 100% pass, retry variants, separate practice/final grades and progress.');dom.window.close();

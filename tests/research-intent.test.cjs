const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const intent=require('../research-intent.js');
test('user-controlled subject filters and search modes are allowlisted',()=>{
 assert.equal(intent.focusAllowed('people'),'people');
 assert.equal(intent.focusAllowed('places'),'places');
 assert.equal(intent.focusAllowed('nature'),'nature');
 assert.equal(intent.focusAllowed('bad'),'all');
 assert.equal(intent.modeAllowed('meaning'),'meaning');
 assert.equal(intent.modeAllowed('bad'),'keyword');
});
test('a description of a mosque cleaner maps to evidence terms, not an invented citation',()=>{
 const plan=intent.plan('A woman used to clean the mosque and later died');
 assert.deepEqual(plan.terms,['woman','sweep','mosque','died']);
 assert.ok(plan.changes.some(c=>c.includes('approximate')));
});
test('a paraphrase of faces changing color keeps the distinguishing concept',()=>{
 const plan=intent.plan('People whose faces became dark on judgment day');
 assert.ok(plan.terms.includes('face'));
 assert.ok(plan.terms.includes('black'));
 assert.ok(plan.terms.includes('judgment'));
 assert.ok(!plan.terms.includes('became'));
});
test('preserves Arabic rather than making an ungrounded English paraphrase',()=>{
 const plan=intent.plan('وجوههم سوداء');
 assert.equal(plan.query,'وجوههم سوداء');
 assert.equal(plan.limited,true);
});
test('search page wires controls without changing the original keyword reference branch',()=>{
 const html=fs.readFileSync('research.html','utf8');
 const smart=fs.readFileSync('research-smart.js','utf8');
 assert.match(html,/data-focus="people"/);
 assert.match(html,/data-focus="places"/);
 assert.match(html,/data-focus="nature"/);
 assert.match(html,/data-mode="meaning"/);
 assert.match(html,/research-intent\.js/);
 assert.match(html,/research-smart\.js/);
 assert.match(smart,/qh_research_focus_search/);
 assert.match(smart,/qh_research_meaning_search/);
 assert.match(smart,/legacySearch\(q\)/);
 assert.match(smart,/hadithReference\(/);
});

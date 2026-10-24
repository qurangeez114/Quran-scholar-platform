const {test}=require('node:test'),assert=require('node:assert/strict');
const ui=require('../hadith-connections.js');
const report={id:12,collection:'Sahih Muslim',number:'4302',external_reference:'1695b',source_url:'https://sunnah.com/muslim:1695b',grade:'Sahih',text:'A sample stored passage.'};
test('different edition numbers remain explicit',()=>{const html=ui.report(report);assert.match(html,/local record: 4302/);assert.match(html,/Publisher numbering: 1695b/);assert.match(html,/hadith=12/);});
test('group comparisons are not represented as contradictions of the current report',()=>{const html=ui.render({found:true,similar:[report],comparisons:[{type:'Outcome contradiction',summary:'Different descriptions',review_status:'draft',involves_current:false,a:report,b:{...report,id:13}}]});assert.match(html,/No direct contradictory comparison is linked/);assert.match(html,/Disagreements among related accounts/);assert.match(html,/draft catalogue assessment/);assert.match(html,/not automatically contradictions/);});
test('direct comparisons are distinguished from group context',()=>{const html=ui.render({found:true,similar:[],comparisons:[{involves_current:true,a:report,b:{...report,id:13},review_status:'draft'}]});assert.match(html,/Comparisons involving this exact report/);assert.doesNotMatch(html,/No direct contradictory comparison is linked/);});
test('automatic similarity never becomes a contradiction label',()=>{const html=ui.render({found:true,similar:[{...report,match_type:'word_overlap'}],comparisons:[]});assert.match(html,/Automatic word match/);assert.match(html,/have not been classified as contradictions/);});
test('empty comparisons do not establish absence',()=>{const html=ui.render({found:true,similar:[],comparisons:[]});assert.match(html,/does not establish that none exists/);});
test('untrusted database text and links cannot inject executable HTML',()=>{const html=ui.report({...report,collection:'<script>alert(1)</script>',source_url:'javascript:alert(1)',text:'<img src=x onerror=alert(1)>text'});assert.doesNotMatch(html,/<script>|onerror=|javascript:/);assert.equal(ui.safeURL('https://user:pass@example.com'),null);});
test('lookup is lazy and repeated opens reuse one request',async()=>{
 let calls=0;const api=ui.init({rpc:async()=>{calls++;return {found:true,similar:[],comparisons:[]};}});
 const host={dataset:{hadithId:'19579'},setAttribute(){},innerHTML:''};await api.load(host);await api.load(host);assert.equal(calls,1);assert.equal(host.dataset.loaded,'true');
});

test('recorded grading objects display assessors rather than object placeholders',()=>{const html=ui.grading([{name:'Assessor A',grade:'Sahih'},{name:'Assessor B',grade:'Hasan'}]);assert.match(html,/Assessor A: Sahih/);assert.match(html,/Assessor B: Hasan/);assert.doesNotMatch(html,/object Object/);});

test('comparison extracts preserve the recorded quotation form',()=>{const html=ui.render({found:true,similar:[],comparisons:[{involves_current:false,points:[{a_en:'Report A evidence',b_en:'Report B evidence',a_form:'verbatim',b_form:'condensed'}]}]});assert.match(html,/Report A evidence/);assert.match(html,/Report B evidence/);assert.match(html,/Extract B · condensed/);assert.match(html,/not verbatim quotations/);});

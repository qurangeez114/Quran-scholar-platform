const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../hadith-engine/hadith-comparison-engine.js');
const fam=require('../hadith-engine/pilot/beginning-of-revelation.json');
const an=require('../hadith-engine/pilot/analysis.json');
const cc=require('../hadith-engine/pilot/conclusions.json');

test('normalisation strips diacritics and unifies alif/ta marbuta/ya',()=>{
  assert.equal(E.normalizeArabic('أَوَّلُ مَا بُدِئَ بِهِ رَسُولُ اللَّهِ'),'اول ما بدئ به رسول الله');
  assert.equal(E.normalizeArabic('خَدِيجَةَ عَلَى'),'خديجه علي');
});
test('matching: identical texts score 1, disjoint score 0',()=>{
  assert.equal(E.similarity('ما انا بقارئ','مَا أَنَا بِقَارِئٍ'),1);
  assert.equal(E.similarity('ما انا بقارئ','زملوني زملوني'),0);
});
test('alignment reports additions and omissions exactly',()=>{
  const r=E.align('فرجع الي خديجه يرجف فؤاده','فرجع الي خديجه');
  assert.deepEqual(r.ops.map(o=>o.op),['equal','delete']);assert.equal(r.ops[1].words.join(' '),'يرجف فؤاده');
});
test('isnad/matn split stays a candidate',()=>{
  const s=E.splitIsnadMatn('حدثنا يحيي بن بكير قال حدثنا الليث عن عقيل عن ابن شهاب عن عروه بن الزبير عن عائشه ام المؤمنين انها قالت اول ما بدئ به',['عائشه']);
  assert.match(s.matn,/^اول ما بدئ به/);assert.equal(s.status,'candidate');
});
test('omission alone is NEVER a contradiction (exhaustive over statuses)',()=>{
  for(const st of ['affirms','negates']) for(const v of [undefined,'x']) for(const ex of [false,true]){
    const c={p:{status:st,value:v,exclusive:ex,interpretation:ex?'reading':undefined}};
    for(const [a,b] of [[c,{}],[{},c],[c,{p:{status:'absent'}}]]){
      const r=E.classifyRelationship({similarity:0.5,claimsA:a,claimsB:b});
      assert.ok(!/contradiction/.test(r.label),JSON.stringify([a,b,r.label]));
      assert.equal(r.differences[0].kind,'omission');
    }
  }
});
test('three-vs-two attendees: count without exclusivity is divergent, explicit "only two" is apparent contradiction',()=>{
  assert.equal(E.classifyRelationship({similarity:.6,claimsA:{n:{status:'affirms',value:3}},claimsB:{n:{status:'affirms',value:2}}}).label,'divergent');
  assert.equal(E.classifyRelationship({similarity:.6,claimsA:{n:{status:'affirms',value:3,exclusive:true}},claimsB:{n:{status:'affirms',value:2,exclusive:true}}}).label,'apparent_contradiction');
  assert.equal(E.classifyRelationship({similarity:.6,claimsA:{n:{status:'affirms'}},claimsB:{n:{status:'negates'}}}).label,'direct_contradiction');
});
test('wording variants are not divergence; low-overlap with no shared claim is unrelated',()=>{
  assert.equal(E.classifyRelationship({similarity:.9,claimsA:{k:{status:'affirms',value:'a',lexical:true}},claimsB:{k:{status:'affirms',value:'b',lexical:true}}}).label,'similar');
  assert.equal(E.classifyRelationship({similarity:.1,claimsA:{x:{status:'affirms'}},claimsB:{y:{status:'affirms'}}}).label,'unrelated');
  assert.equal(E.classifyRelationship({similarity:.99,claimsA:{x:{status:'affirms'}},claimsB:{x:{status:'affirms'}}}).label,'identical');
});
test('every automatic result is a candidate and promotion needs reviewer + evidence + checked source',()=>{
  assert.equal(E.classifyRelationship({similarity:1}).verification_status,'candidate');
  const rec={verification_status:'candidate'};
  assert.equal(E.canPromote(rec,{to:'analysis_reviewed'}),false);
  assert.equal(E.canPromote(rec,{to:'analysis_reviewed',reviewer:'R',evidence:['bukhari:3']}),false);
  assert.equal(E.canPromote(rec,{to:'analysis_reviewed',reviewer:'R',evidence:['bukhari:3'],source_checked:true}),true);
  an.relationships.forEach(r=>assert.equal(r.verification_status,'candidate'));
  cc.conclusions.forEach(c=>assert.equal(c.status,'candidate'));
});
test('common link detection',()=>{
  const ch={a:[['x','z','c']],b:[['y','z','c']],d:[['w','q','c2']]};
  assert.equal(E.commonLink({a:ch.a,b:ch.b}).transmitter,'z');assert.equal(E.commonLink(ch),null);
  assert.deepEqual(E.sharedTransmitters({a:ch.a,b:ch.b}).map(s=>s.transmitter).sort(),['c','z']);
});
test('pilot: every member text was verified against sunnah.com and every claim evidence occurs in its Arabic',()=>{
  assert.equal(fam.members.length,22);
  for(const m of fam.members){
    assert.ok(m.text_match_ratio>=0.99,m.verified_reference);assert.match(m.verified_url,/^https:\/\/sunnah\.com\/(bukhari|muslim|tirmidhi):\d+[a-z]?$/);
    const n=E.normalizeArabic(m.text_arabic);
    for(const [p,c] of Object.entries(m.claims)) assert.ok(n.includes(c.evidence),m.verified_reference+' '+p);
    assert.deepEqual(m.isnad_check,[],m.verified_reference);
  }
  assert.equal(new Set(fam.members.map(m=>m.hadith_corpus_canonical_id)).size,22,'no duplicate records');
  assert.ok(!fam.members.some(m=>m.hadith_corpus_canonical_id===7992),'exact duplicate excluded');
});
test('pilot: Jabir vs Aisha "first revealed" is an apparent (not direct) contradiction; Hebrew/Arabic is divergent',()=>{
  const r=an.relationships.find(r=>r.a==='bukhari:3'&&r.b==='bukhari:4922');assert.equal(r.label,'apparent_contradiction');
  const v=an.relationships.find(r=>r.a==='bukhari:3'&&r.b==='muslim:160a');assert.ok(v.differences.some(d=>d.proposition==='p10_waraqa_script'&&d.kind==='divergent'));
  const ab=an.relationships.find(r=>r.a==='bukhari:3'&&r.b==='bukhari:4955');assert.equal(ab.label,'omission');
  assert.equal(an.transmission.aisha.common_link.transmitter,'zuhri');assert.equal(an.transmission.jabir.common_link.transmitter,'abusalama');
});
test('pilot: conclusions cite only family members; no English translation text is stored',()=>{
  const refs=new Set(fam.members.map(m=>m.verified_reference));
  cc.conclusions.forEach(c=>c.citations.forEach(x=>assert.ok(refs.has(x),x)));
  fam.members.forEach(m=>assert.equal(m.text_english,undefined));
});
test('rendered strings are escaped and unsafe URLs rejected',()=>{
  assert.equal(E.esc('<img onerror=x>'),'&lt;img onerror=x&gt;');assert.equal(E.safeURL('javascript:alert(1)'),null);assert.equal(E.safeURL('http://x.com'),null);
});

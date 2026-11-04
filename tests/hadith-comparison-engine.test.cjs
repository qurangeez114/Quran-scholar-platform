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

// ---- Additional pilot families (generic builder) ----
const FAMS=['isra-wal-miraj','final-illness-abu-bakr-prayer'].map(s=>({s,fam:require('../hadith-engine/pilot/'+s+'.json'),an:require('../hadith-engine/pilot/'+s+'.analysis.json'),cc:require('../hadith-engine/pilot/'+s+'.conclusions.json')}));
test('families: every member verified against sunnah.com (ratio>=0.95), evidence occurs in Arabic, no duplicates, no English',()=>{
  for(const {s,fam,cc} of FAMS){
    assert.ok(fam.members.length>=10,s);
    for(const m of fam.members){
      assert.ok(m.text_match_ratio>=0.95,s+' '+m.verified_reference);
      assert.match(m.verified_url,/^https:\/\/sunnah\.com\/(bukhari|muslim|tirmidhi|nasai|abudawud|ibnmajah):\d+[a-z]?$/);
      assert.ok(fam.branches[m.branch],m.verified_reference+' branch');
      const n=E.normalizeArabic(m.text_arabic);
      for(const [p,c] of Object.entries(m.claims)) assert.ok(n.includes(c.evidence),s+' '+m.verified_reference+' '+p);
      assert.equal(m.text_english,undefined);
    }
    assert.equal(new Set(fam.members.map(m=>m.hadith_corpus_canonical_id)).size,fam.members.length,s+' duplicates');
    const refs=new Set(fam.members.map(m=>m.verified_reference));
    cc.conclusions.forEach(c=>{c.citations.forEach(x=>assert.ok(refs.has(x),s+' cites '+x));assert.equal(c.status,'candidate');});
  }
});
test('families: all computed relationships are candidates and omission is never a contradiction',()=>{
  for(const {an} of FAMS){
    an.relationships.forEach(r=>{assert.equal(r.verification_status,'candidate');
      r.differences.forEach(d=>{if(d.a==='absent'||d.b==='absent'||/^silent/.test(d.a)||/^silent/.test(d.b)) assert.ok(!/contradiction/.test(d.kind),r.a+' '+r.b+' '+d.proposition);});});
  }
});
test('isra: Malik b. Sasaa branch converges on Qatada; heaven placements differ from Sharik (apparent contradiction)',()=>{
  const {fam,an}=FAMS[0];
  assert.equal(an.transmission.branches.malik_sasaa.common_link.transmitter,'qatada');
  const r=an.relationships.find(r=>(r.a==='bukhari:3887'&&r.b==='bukhari:7517'));
  assert.ok(r.differences.some(d=>d.proposition==='i11_ibrahim'&&d.kind==='apparent_contradiction'));
  const ad=fam.members.find(m=>m.verified_reference==='bukhari:349');
  assert.equal(ad.claims.i08_idris,undefined,'Abu Dharr route leaves Idris unplaced (omission, not a claim)');
});
test('illness: objection wording asif/raqiq is a wording variant, not a contradiction',()=>{
  const {an}=FAMS[1];
  const r=an.relationships.find(r=>[r.a,r.b].includes('bukhari:712')&&[r.a,r.b].includes('bukhari:678'));
  const d=r.differences.find(d=>d.proposition==='f02_objection');assert.equal(d.kind,'wording_variant');
  assert.ok(!an.relationships.some(r=>/contradiction/.test(r.label)));
});

// --- Narrator identity review (2026-11-04) ---
{
  const fsx = require('fs'), px = require('path');
  const load = s => JSON.parse(fsx.readFileSync(px.join(__dirname, '..', 'hadith-engine', 'pilot', s + '.json'), 'utf8'));
  const norm = s => s.replace(/[\u064B-\u0652\u0670\u0640]/g, '').replace(/[إأآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
  for (const slug of ['beginning-of-revelation', 'isra-wal-miraj', 'final-illness-abu-bakr-prayer']) {
    const fam = load(slug);
    test(slug + ': every route key resolves to a transmitter with a basis', () => {
      for (const m of fam.members) for (const r of m.isnad_routes) for (const k of r) {
        assert.ok(fam.transmitters[k], m.verified_reference + ' missing ' + k);
        assert.ok(fam.transmitters[k].basis, k + ' has no basis');
      }
    });
    test(slug + ': source_checked identities always cite a URL', () => {
      for (const [k, t] of Object.entries(fam.transmitters)) if (t.identity_status === 'source_checked')
        assert.ok((t.sources || []).length && t.sources.every(s => /^https:\/\//.test(s.url)), k);
    });
    if (slug !== 'beginning-of-revelation') test(slug + ': every curated route has its transmitters in the Arabic isnad text', () => {
      for (const m of fam.members) { const txt = norm(m.text_arabic);
        for (const r of m.isnad_routes) for (const k of r) {
          const pats = fam.transmitters[k].arabic_pattern.split('|');
          assert.ok(pats.some(p => txt.includes(p)), m.verified_reference + ': ' + k + ' pattern not in text');
        } }
    });
  }
  test('ambiguous names: Harb and ʿAbd Allāh b. Muḥammad source-checked, Yaḥyā (4922) stays candidate', () => {
    const t = load('beginning-of-revelation').transmitters;
    assert.strictEqual(t.harb.identity_status, 'source_checked');
    assert.strictEqual(t.ab_muh.identity_status, 'source_checked');
    assert.strictEqual(t.yahya_b.identity_status, 'candidate');
    assert.strictEqual(t.abdallah_m.identity_status, 'candidate');
  });
}

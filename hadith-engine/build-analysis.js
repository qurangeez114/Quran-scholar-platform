// Regenerates pilot/analysis.json from pilot/beginning-of-revelation.json (deterministic, no network).
const fs=require('fs'),E=require('./hadith-comparison-engine.js');
const fam=JSON.parse(fs.readFileSync(__dirname+'/pilot/beginning-of-revelation.json','utf8'));
const by=r=>fam.members.find(m=>m.verified_reference===r);
const matn=m=>E.splitIsnadMatn(m.text_arabic,m.companion==='aisha'?['عائشه']:['جابر بن عبد الله','جابر']).matn;
const pairs=[['bukhari:3','muslim:160a'],['bukhari:3','bukhari:6982'],['bukhari:3','bukhari:4953'],['bukhari:3','bukhari:4955'],
 ['bukhari:3','muslim:160b'],['bukhari:3','bukhari:3392'],['bukhari:4','bukhari:4954'],['bukhari:4925','tirmidhi:3325'],['bukhari:4922','muslim:161d'],
 ['bukhari:3','bukhari:4922'],['bukhari:3','bukhari:4'],['bukhari:4926','bukhari:3238']];
const rel=pairs.map(([a,b])=>{const A=by(a),B=by(b);const r=E.classifyRelationship({matnA:matn(A),matnB:matn(B),claimsA:A.claims,claimsB:B.claims});
 return {a,b,...r,differences:r.differences.filter(d=>d.kind!=='agreement').map(d=>({proposition:d.proposition,kind:d.kind,a:d.a.status+(d.a.value?':'+d.a.value:''),b:d.b.status+(d.b.value?':'+d.b.value:'')})),
  agreements:r.differences.filter(d=>d.kind==='agreement').map(d=>d.proposition)};});
const chains={};fam.members.forEach(m=>chains[m.verified_reference]=m.isnad_routes);
const sub=k=>Object.fromEntries(Object.entries(chains).filter(([r])=>by(r).branch===k));
const out={generated_by:'hadith-engine/build-analysis.js',method:'hce-rules-v1',relationships:rel,
 transmission:{all:{shared:E.sharedTransmitters(chains),common_link:E.commonLink(chains)},aisha:{shared:E.sharedTransmitters(sub('A')),common_link:E.commonLink(sub('A'))},
  jabir:{shared:E.sharedTransmitters(sub('J')),common_link:E.commonLink(sub('J'))}}};
fs.writeFileSync(__dirname+'/pilot/analysis.json',JSON.stringify(out,null,1));
console.log(rel.map(r=>`${r.a} vs ${r.b}: ${r.label} sim=${r.similarity} [${r.differences.map(d=>d.proposition.slice(0,3)+':'+d.kind).join(', ')}]`).join('\n'));
console.log('common link all:',out.transmission.all.common_link,'A:',out.transmission.aisha.common_link,'J:',out.transmission.jabir.common_link);

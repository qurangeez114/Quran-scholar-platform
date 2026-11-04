// Regenerates pilot/<slug>.analysis.json for families built by the generic builder (all member pairs; deterministic, no network).
// Usage: node build-family-analysis.js isra-wal-miraj final-illness-abu-bakr-prayer
const fs=require('fs'),E=require('./hadith-comparison-engine.js');
for(const slug of process.argv.slice(2)){
 const fam=JSON.parse(fs.readFileSync(__dirname+'/pilot/'+slug+'.json','utf8'));
 const matn=m=>E.splitIsnadMatn(m.text_arabic,fam.companion_markers[m.branch]||[]).matn;
 const M=fam.members,rel=[];
 for(let i=0;i<M.length;i++)for(let j=i+1;j<M.length;j++){const A=M[i],B=M[j];
  const r=E.classifyRelationship({matnA:matn(A),matnB:matn(B),claimsA:A.claims,claimsB:B.claims});
  rel.push({a:A.verified_reference,b:B.verified_reference,...r,differences:r.differences.filter(d=>d.kind!=='agreement').map(d=>({proposition:d.proposition,kind:d.kind,a:d.a.status+(d.a.value?':'+d.a.value:''),b:d.b.status+(d.b.value?':'+d.b.value:'')})),
   agreements:r.differences.filter(d=>d.kind==='agreement').map(d=>d.proposition)});}
 const chains={};M.forEach(m=>{if(m.isnad_routes.length)chains[m.verified_reference]=m.isnad_routes;});
 const branches={};Object.keys(fam.branches).forEach(b=>{const sub=Object.fromEntries(Object.entries(chains).filter(([r])=>M.find(m=>m.verified_reference===r).branch===b));
  if(Object.keys(sub).length)branches[b]={reports:Object.keys(sub).length,shared:E.sharedTransmitters(sub),common_link:E.commonLink(sub)};});
 const counts={};rel.forEach(r=>counts[r.label]=(counts[r.label]||0)+1);
 const out={generated_by:'hadith-engine/build-family-analysis.js',method:'hce-rules-v1',family:slug,label_counts:counts,relationships:rel,
  transmission:{all:{shared:E.sharedTransmitters(chains),common_link:E.commonLink(chains)},branches}};
 fs.writeFileSync(__dirname+'/pilot/'+slug+'.analysis.json',JSON.stringify(out,null,1));
 console.log(slug,M.length,'members',rel.length,'pairs',JSON.stringify(counts),'common link all:',JSON.stringify(out.transmission.all.common_link));
 Object.entries(branches).forEach(([b,v])=>console.log('  ',b,v.reports,JSON.stringify(v.common_link)));
}

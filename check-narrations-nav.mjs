#!/usr/bin/env node
// Verifies the narrations index lists every comparison and that each one
// opens a detail page with content. Exits non-zero if any link is dead.

const SB='https://ylosytbxpzxzwfzjpaej.supabase.co/rest/v1';
const H={apikey:process.argv[2],Authorization:'Bearer '+process.argv[2]};
const api=async p=>{const r=await fetch(SB+'/'+p,{headers:H});if(!r.ok)throw new Error(r.status);return r.json();};
const idx=await api('narrative_dossier_reader?select=group_slug,group_title,dossier_title&order=dossier_slug,sequence_order');
console.log(`index lists ${idx.length} comparisons across ${new Set(idx.map(r=>r.dossier_title)).size} sections\n`);
let bad=0;
for(const r of idx){
  const [i,v,d]=await Promise.all([
    api('narrative_dossier_reader?select=group_title&group_slug=eq.'+encodeURIComponent(r.group_slug)),
    api('narrative_version_reader?select=id&group_slug=eq.'+encodeURIComponent(r.group_slug)),
    api('narrative_divergence_reader?select=point_id&group_slug=eq.'+encodeURIComponent(r.group_slug))
  ]);
  const pts=d.filter(x=>x.point_id).length;
  const ok=i.length&&v.length;
  if(!ok) bad++;
  console.log(`  ${ok?'OK ':'FAIL'}  narration.html?group=${r.group_slug}  (${v.length} versions, ${pts} points)`);
}
// cross-links must resolve to real pages
const links=await api('narrative_group_link_reader?select=from_slug,to_slug');
const slugs=new Set(idx.map(r=>r.group_slug));
const broken=links.filter(l=>!slugs.has(l.to_slug));
console.log(`\ncross-links: ${links.length}, broken: ${broken.length}`);
process.exitCode = (bad||broken.length)?1:0;

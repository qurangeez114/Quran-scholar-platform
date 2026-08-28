#!/usr/bin/env node
/**
 * check-narrations-render.mjs — verify narrations.html can render every
 * dossier, group, version and comparison point currently in the database.
 *
 * The page reads several fields that are optional in the schema. If one is
 * missing the page renders a blank panel rather than failing, so nothing
 * surfaces. This walks the same endpoints the page walks and reports any
 * row that would render incomplete.
 *
 * Run:  node check-narrations-render.mjs <anon-key>
 * Exit: 0 if every row renders, 1 otherwise.
 */

const SB='https://ylosytbxpzxzwfzjpaej.supabase.co/rest/v1';
const KEY=process.argv[2];
const H={apikey:KEY,Authorization:'Bearer '+KEY};
const api=async p=>{const r=await fetch(SB+'/'+p,{headers:H}); if(!r.ok) throw new Error(r.status+' '+p); return r.json();};

const problems=[];
const rows=await api('narrative_dossier_reader?select=*&order=dossier_slug.asc,sequence_order.asc');
console.log(`dossiers: ${new Set(rows.map(r=>r.dossier_slug)).size}, groups: ${rows.length}`);

for(const r of rows){
  for(const f of ['question','summary','method_note','group_title','role_in_dossier','historical_core'])
    if(!r[f]) problems.push(`[index] ${r.group_slug}: missing ${f}`);
}

for(const g of rows){
  const slug=encodeURIComponent(g.group_slug);
  const [vers,divs]=await Promise.all([
    api(`narrative_version_reader?select=*&group_slug=eq.${slug}&order=sequence_order`),
    api(`narrative_divergence_reader?select=*&group_slug=eq.${slug}&order=severity.desc`)
  ]);
  if(!vers.length) problems.push(`[detail] ${g.group_slug}: NO VERSIONS`);
  for(const v of vers){
    for(const f of ['source_collection','source_reference','narrator','version_summary'])
      if(!v[f]) problems.push(`[version] ${g.group_slug} seq${v.sequence_order}: missing ${f}`);
    if(!v.text_arabic && !v.text_english)
      problems.push(`[version] ${g.group_slug} seq${v.sequence_order}: NO TEXT resolved`);
    if(v.grade_disputed && (!v.alternate_grade||!v.alternate_reference))
      problems.push(`[version] ${g.group_slug} seq${v.sequence_order}: disputed but no alternate`);
  }
  const pts=divs.filter(d=>d.point_id);
  if(!pts.length) problems.push(`[detail] ${g.group_slug}: no comparison POINTS (cards render empty)`);
  for(const d of pts){
    for(const f of ['category','arabic_a','arabic_b','analysis','significance'])
      if(!d[f]) problems.push(`[point] ${g.group_slug} pt${d.point_id}: missing ${f}`);
    const sv=d.point_severity||d.severity;
    if(!(sv>=1&&sv<=5)) problems.push(`[point] ${g.group_slug} pt${d.point_id}: severity ${sv} out of range`);
    if(!d.source_a||!d.source_b) problems.push(`[point] ${g.group_slug} pt${d.point_id}: missing a source label`);
  }
}
process.exitCode = problems.length ? 1 : 0;
console.log(problems.length?`\n${problems.length} PROBLEMS:\n`+problems.join('\n'):'\nNo render problems found.');

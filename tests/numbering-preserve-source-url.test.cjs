const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const keep=new Set(read('scripts/numbering/preserve_source_url_20261104.csv').trim().split('\n').slice(1).map(l=>l.split(',')[0]));
const idsIn=(sql,re)=>new Set([...sql.matchAll(re)].map(m=>m[1]));
test('preserve list is non-empty and numeric',()=>{assert.ok(keep.size>0);for(const id of keep)assert.match(id,/^\d+$/);});
test('source_url update script never targets a row corrected on 2026-11-04',()=>{
  const sql=read('scripts/numbering/APPROVAL_REQUIRED_update_canonical_numbers.sql');
  const ids=idsIn(sql,/^\((\d+),'https:\/\/sunnah\.com/gm);assert.ok(ids.size>0);
  for(const id of keep)assert.ok(!ids.has(id),`id ${id} would be overwritten`);
  assert.match(sql,/c\.source_url is not distinct from f\.old_url/);
});
test('renumbering migration does not renumber a row whose source_url was corrected',()=>{
  const sql=read('supabase/migrations/20261103140000_hadith_renumber_sunnah_com.sql');
  const ids=idsIn(sql,/^\((\d+),'[^']*'\)/gm);assert.ok(ids.size>0);
  for(const id of keep)assert.ok(!ids.has(id),`id ${id} would be renumbered`);
  assert.doesNotMatch(sql,/set\s+source_url/i);
});

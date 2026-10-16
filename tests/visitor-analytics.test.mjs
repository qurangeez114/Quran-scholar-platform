import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('collector parses and uses write-only tracking RPC',()=>{
 const js=read('behavior-collector.js');
 assert.doesNotThrow(()=>new Function(js));
 assert.match(js,/\/rest\/v1\/rpc\/qh_behavior_ingest/);
 assert.match(js,/sessionStorage/);
 assert.match(js,/data\.session\.access_token/);
 assert.match(js,/window\.QHikmaVisitorGeo/);
 assert.doesNotMatch(js,/rest\/v1\/behavior_sessions\?/);
 assert.doesNotMatch(js,/ipapi\.co/);
});
test('owner report parses and does not request the privileged service key',()=>{
 const html=read('behavior.html');
 const source=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(source,'report module script exists');
 const parsed=source.replace(/^import\s+[^;]+;\s*/,'');
 assert.doesNotThrow(()=>new Function('return (async()=>{'+parsed+'\n})'));
 assert.match(source,/db\.rpc\('qh_is_staff'\)/);
 assert.match(source,/behavior_sessions/);
 assert.match(source,/behavior_events/);
 assert.match(source,/Signed-in sessions/);
 assert.doesNotMatch(html,/service.role key|service-role key|Bearer .*key/i);
});
test('edge context provides approximate city and country before visitor code',()=>{
 const source=read('netlify/edge-functions/donate-inject.ts');
 assert.match(source,/context\.geo\?\.city/);
 assert.match(source,/context\.geo\?\.country\?\.name/);
 assert.ok(source.indexOf('window.QHikmaVisitorGeo')<source.indexOf("injectScript('/behavior-collector.js')"));
});
test('collector is write-only while owner controls record reads',()=>{
 const sql=read('supabase/migrations/20261016_visitor_analytics_secure_ingest.sql');
 assert.match(sql,/revoke all on public\.behavior_sessions from anon, authenticated/i);
 assert.match(sql,/using \(public\.qh_is_staff\(\)\)/i);
 assert.match(sql,/v_uid uuid := auth\.uid\(\)/);
 assert.match(sql,/security definer set search_path=''/);
});

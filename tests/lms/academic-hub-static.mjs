import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transform} from 'esbuild';
import {parseHTML} from 'linkedom';
const read=p=>readFileSync(p,'utf8');
const api=read('supabase/functions/academic-hub/index.ts');
const js=read('accounts/academic-hub.js');
const html=read('academic-hub.html');
const sql=read('supabase/migrations/20261017_academic_collaboration.sql');
const course=read('courses-api.js');
const coursePage=read('course.html');

await transform(api,{loader:'ts',format:'esm'});
await transform(js,{loader:'js',format:'esm'});
for(const action of [
 'hub_overview','faculty_message_send','faculty_message_list','faculty_media_prepare',
 'media_open','block_contact','blocked_contacts','faculty_report_message','course_settings','enrollment_request',
 'enrollment_requests','enrollment_decide','enrollment_consent','enrollment_cancel',
 'package_create','package_add','package_remove','package_list','peer_discovery',
 'group_classmates','group_browse','group_create','group_invite','group_join_request',
 'group_requests','group_decide','group_cancel_request','group_leave','group_transfer','group_members',
 'group_posts','group_post','group_media_prepare','group_report','live_list',
 'live_create','live_read','live_message','live_react','live_manage','live_moderate'
]){
 assert.ok(api.includes("'"+action+"'"),'Missing protected API action: '+action);
 assert.ok(js.includes("'"+action+"'"),'Missing client control handler: '+action);
}
const {document}=parseHTML(html);
for(const id of [
 'courses-refresh','course-catalog','referral-form','referral-student','referral-course',
 'course-settings-form','settings-course','settings-deadline','settings-clear',
 'faculty-grid','blocked-refresh','blocked-contacts-list','my-enrollment-requests','instructor-enrollment-requests','faculty-message-form',
 'faculty-recipient','faculty-attachment','faculty-inbox-refresh','faculty-conversation',
 'group-list','group-create-form','group-requests','group-conversation-panel',
 'group-invite-form','group-invite-person','group-transfer-form','group-transfer-person',
 'group-post-form','group-attachment','group-leave','group-refresh','peer-opt-in',
 'package-create-form','package-add-form','package-list','package-course','package-picker',
 'live-list','live-course','live-create-form','live-room','live-title','live-state',
 'live-start','live-end','live-pause','live-chat','live-reaction-summary','live-chat-form'
]){
 assert.ok(document.getElementById(id),'Missing linked UI control: '+id);
}
const files=new Set(['admin/lms.html','instructor-dashboard.html','student-dashboard.html']);
for(const file of files){
 const s=read(file);
 assert.ok(s.includes('academic-hub.html'),file+' needs the collaboration entry link');
 assert.ok(s.includes('faculty.html'),file+' needs the faculty directory');
}
assert.ok(course.includes("action:'enrollment_request'"),'Legacy enroll route must request approval');
assert.ok(!/from\('qh_enrollments'\)[\s\S]{0,120}\.insert\(/.test(course.match(/export async function enrollInCourse[\s\S]*?export async function getEnrollments/)?.[0]||''),
 'Legacy direct enrollment insertion must be removed');
assert.match(coursePage,/Request Enrollment/);
for(const table of [
 'qh_academic_enrollment_requests','qh_academic_contact_settings','qh_academic_messages',
 'qh_academic_message_blocks','qh_academic_message_reports','qh_academic_study_groups',
 'qh_academic_group_members','qh_academic_group_requests','qh_academic_group_posts',
 'qh_academic_group_reports','qh_academic_packages','qh_academic_package_items',
 'qh_academic_live_classes','qh_academic_live_chat','qh_academic_live_reactions'
]){
 assert.ok(sql.includes('create table if not exists public.'+table),'Missing SQL table '+table);
 assert.ok(sql.includes('alter table public.'+table+' enable row level security'),
   'Missing RLS for '+table);
}
assert.match(sql,/grant all on public\.qh_academic_live_classes[\s\S]*?to service_role/);
assert.ok(!sql.includes('grant select on public.qh_academic_messages to anon'));
assert.ok(sql.includes('public.qh_academic_approve_enrollment'));
assert.ok(sql.includes('public.qh_academic_accept_group'));
assert.ok(sql.includes('public.qh_academic_transfer_group'));
assert.ok(sql.includes("and (access_closes_at is null or access_closes_at>now())"),
 'Course read policy must enforce expiration');
assert.ok(sql.includes('qh_lms_private.can_learn(course_id)'),
 'Progress updates must enforce course expiration');
assert.ok(sql.includes("'qh-academic-media',false,26214400"),
 'Audio/video bucket must remain private and size-limited');
assert.ok(api.includes('createSignedUploadUrl')&&api.includes('createSignedUrl'));
assert.match(api,/Join this group before opening media/);
assert.match(api,/Only members may access group conversations/);
assert.match(api,/Student has not opted in to group invitations/);
assert.match(api,/Only the receiving teacher may review this request/);
assert.match(api,/if\(session\.status!=='live'\)/);
assert.match(api,/if\(session\.chat_paused&&!owns\(course\)\)/);
assert.match(js,/setInterval\(/);
assert.match(js,/clearInterval\(/);
assert.match(js,/Recent reactions/);
console.log('PASS: every academic action wired, accessible control IDs, all three dashboard links, secure storage/permissions, class expiration, live updates.');

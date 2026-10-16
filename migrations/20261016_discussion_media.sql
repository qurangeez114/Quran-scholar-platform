-- Restore course discussions: real RLS, replies, reactions and private media.
-- Frontend must use the SAME Supabase project as accounts/client.js.
-- qh_lms_private.can_learn enforces current enrollment and account status.

alter table public.qh_discussion_threads enable row level security;
alter table public.qh_discussion_posts enable row level security;

create policy "discussion_threads_read" on public.qh_discussion_threads
 for select to authenticated
 using (exists (
   select 1 from public.qh_lessons l
   where l.id=lesson_id and qh_lms_private.can_learn(l.course_id)
 ));
create policy "discussion_threads_insert" on public.qh_discussion_threads
 for insert to authenticated
 with check (user_id=(select auth.uid())
   and length(trim(title)) between 3 and 180
   and exists (select 1 from public.qh_lessons l
       where l.id=lesson_id and qh_lms_private.can_learn(l.course_id)));

create policy "discussion_posts_read" on public.qh_discussion_posts
 for select to authenticated
 using (exists (
   select 1 from public.qh_discussion_threads t
   join public.qh_lessons l on l.id=t.lesson_id
   where t.id=thread_id and qh_lms_private.can_learn(l.course_id)
 ));
create policy "discussion_posts_insert" on public.qh_discussion_posts
 for insert to authenticated
 with check (user_id=(select auth.uid())
   and length(content)<=8000
   and exists (select 1 from public.qh_discussion_threads t
      join public.qh_lessons l on l.id=t.lesson_id
      where t.id=thread_id and qh_lms_private.can_learn(l.course_id)));

-- Likes are deliberately distinct from replies; users can only manage their own.
create table if not exists public.qh_post_likes (
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references public.qh_discussion_posts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 unique(post_id,user_id)
);
create index if not exists qh_post_likes_post_idx on public.qh_post_likes(post_id);
alter table public.qh_post_likes enable row level security;
create policy "discussion_likes_read" on public.qh_post_likes
 for select to authenticated
 using (exists (select 1 from public.qh_discussion_posts p
 join public.qh_discussion_threads t on t.id=p.thread_id
 join public.qh_lessons l on l.id=t.lesson_id
 where p.id=post_id and qh_lms_private.can_learn(l.course_id)));
create policy "discussion_likes_insert" on public.qh_post_likes
 for insert to authenticated
 with check (user_id=(select auth.uid())
 and exists (select 1 from public.qh_discussion_posts p
 join public.qh_discussion_threads t on t.id=p.thread_id
 join public.qh_lessons l on l.id=t.lesson_id
 where p.id=post_id and qh_lms_private.can_learn(l.course_id)));
create policy "discussion_likes_delete" on public.qh_post_likes
 for delete to authenticated
 using (user_id=(select auth.uid()));

-- A media item belongs to a post and its author. Keep raw object paths private.
create table if not exists public.qh_discussion_attachments (
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references public.qh_discussion_posts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 object_path text not null unique,
 file_name text not null,
 media_type text not null check (media_type in ('image','audio','video')),
 mime_type text not null,
 file_size bigint not null check (file_size between 1 and 26214400),
 created_at timestamptz not null default now(),
 check (length(file_name) between 1 and 180)
);
create index if not exists qh_discussion_attachments_post_idx on public.qh_discussion_attachments(post_id);
alter table public.qh_discussion_attachments enable row level security;
create policy "discussion_attachments_read" on public.qh_discussion_attachments
 for select to authenticated
 using (exists (select 1 from public.qh_discussion_posts p
   join public.qh_discussion_threads t on t.id=p.thread_id
   join public.qh_lessons l on l.id=t.lesson_id
   where p.id=post_id and qh_lms_private.can_learn(l.course_id)));
create policy "discussion_attachments_insert" on public.qh_discussion_attachments
 for insert to authenticated
 with check (
 user_id=(select auth.uid())
 and split_part(object_path,'/',4)=(select auth.uid())::text
 and exists (
   select 1 from public.qh_discussion_posts p
   join public.qh_discussion_threads t on t.id=p.thread_id
   join public.qh_lessons l on l.id=t.lesson_id
   where p.id=post_id and p.user_id=(select auth.uid())
   and qh_lms_private.can_learn(l.course_id)
   and split_part(object_path,'/',1)=l.course_id::text
   and split_part(object_path,'/',2)=l.id::text
   and split_part(object_path,'/',3)=t.id::text
 )
);

-- A private media bucket: upload MIME allowlist, per-object 25 MiB cap.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('qh-discussion-media','qh-discussion-media',false,26214400,
 array['image/jpeg','image/png','image/webp','image/gif',
       'audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/x-wav','audio/ogg','audio/webm',
       'video/mp4','video/webm','video/quicktime'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,
 allowed_mime_types=excluded.allowed_mime_types;

-- Object path: course_uuid/lesson_uuid/thread_uuid/author_uuid/random_filename
-- Authorization is checked against the actual lesson and thread, not path alone.
create policy "discussion_media_read" on storage.objects
 for select to authenticated
 using (bucket_id='qh-discussion-media'
   and exists (select 1 from public.qh_discussion_threads t
     join public.qh_lessons l on l.id=t.lesson_id
     where t.id::text=(storage.foldername(name))[3]
     and l.id::text=(storage.foldername(name))[2]
     and l.course_id::text=(storage.foldername(name))[1]
     and qh_lms_private.can_learn(l.course_id)));
create policy "discussion_media_upload" on storage.objects
 for insert to authenticated
 with check (bucket_id='qh-discussion-media'
   and (storage.foldername(name))[4]=(select auth.uid())::text
   and exists (select 1 from public.qh_discussion_threads t
     join public.qh_lessons l on l.id=t.lesson_id
     where t.id::text=(storage.foldername(name))[3]
     and l.id::text=(storage.foldername(name))[2]
     and l.course_id::text=(storage.foldername(name))[1]
     and qh_lms_private.can_learn(l.course_id)));
create policy "discussion_media_delete_own" on storage.objects
 for delete to authenticated
 using (bucket_id='qh-discussion-media'
   and (storage.foldername(name))[4]=(select auth.uid())::text
   and owner_id=(select auth.uid())::text);

grant select,insert on public.qh_discussion_threads to authenticated;
grant select,insert on public.qh_discussion_posts to authenticated;
grant select,insert,delete on public.qh_post_likes to authenticated;
grant select,insert on public.qh_discussion_attachments to authenticated;

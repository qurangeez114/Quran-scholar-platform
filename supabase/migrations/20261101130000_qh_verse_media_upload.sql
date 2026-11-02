-- Verse discussion media uploads (bucket qh-verse-media, private).
-- Stores a storage path per post; viewers get short-lived signed links for visible posts only.

alter table public.qh_verse_discussions add column if not exists media_path text;

alter table public.qh_verse_discussions drop constraint if exists qh_verse_discussions_media_path_shape;
alter table public.qh_verse_discussions add constraint qh_verse_discussions_media_path_shape check (
  media_path is null or (
    media_type in ('image','video')
    and media_url is null
    and split_part(media_path, '/', 1) = author_id::text
    and split_part(media_path, '/', 2) = sura_id::text
    and split_part(media_path, '/', 3) = aya_number::text
    and split_part(media_path, '/', 4) <> ''
  )
);

drop policy if exists verse_media_read_published on storage.objects;
create policy verse_media_read_published on storage.objects
for select to anon, authenticated
using (
  bucket_id = 'qh-verse-media'
  and exists (
    select 1 from public.qh_verse_discussions d
    where d.is_hidden = false and d.media_path = storage.objects.name
  )
);

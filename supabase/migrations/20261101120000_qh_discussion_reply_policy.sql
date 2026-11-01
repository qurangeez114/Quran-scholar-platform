-- Fix the reply insert policy on qh_verse_discussions.
-- The previous check compared the table with itself (p.id = p.parent_id, p.sura_id = p.sura_id, ...),
-- so no row could satisfy it and every reply was rejected by RLS.
-- The corrected check requires a reply's parent to be a visible post on the same sura and aya.

drop policy if exists "Signed in members can post own discussions" on public.qh_verse_discussions;

create policy "Signed in members can post own discussions"
on public.qh_verse_discussions
for insert
to authenticated
with check (
  (select auth.uid()) = author_id
  and is_hidden = false
  and (
    parent_id is null
    or exists (
      select 1
      from public.qh_verse_discussions p
      where p.id = qh_verse_discussions.parent_id
        and p.sura_id = qh_verse_discussions.sura_id
        and p.aya_number = qh_verse_discussions.aya_number
        and p.is_hidden = false
    )
  )
);

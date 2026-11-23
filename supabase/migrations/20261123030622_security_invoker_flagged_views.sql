-- Security advisor errors (security_definer_view): four public views ran with
-- their owner's rights, so they bypassed row security on the tables underneath.
-- Each view now runs with the reader's rights. What each one keeps showing:

-- 1. hadith_corpus_canonical: public hadith text, read by the research search
--    (book_rows, qh_research_hadith_book_rows), presentation.html and the
--    hadith-family pages. hadith_corpus already allows public reads; the view
--    also needs readers to see hadith_text_duplicates (policy htd_read already
--    allows everyone to read it; only the table grant was missing).
grant select on public.hadith_text_duplicates to anon, authenticated;
alter view public.hadith_corpus_canonical set (security_invoker = on);

-- 2. hadith_verse_links_combined: internal comparison of live links with the
--    private CSV import table. No page reads it; it exposed the private CSV
--    rows to everyone. Staff/service access only.
alter view public.hadith_verse_links_combined set (security_invoker = on);
revoke select on public.hadith_verse_links_combined from anon, authenticated;

-- 3. chain_shape_keys: internal isnad research view over tables with no public
--    read policy. No page reads it. Staff/service access only.
alter view public.chain_shape_keys set (security_invoker = on);
revoke select on public.chain_shape_keys from anon, authenticated;

-- 4. qh_faculty_directory: the public faculty directory (accounts/faculty-public.js).
--    It must keep showing published, active instructors to guests without opening
--    qh_lms_accounts or qh_instructor_profiles. The filtered read moves into a
--    SECURITY DEFINER function in a schema the API does not expose, and the view
--    calls it with the reader's rights.
create schema if not exists qh_directory;
revoke all on schema qh_directory from public;
grant usage on schema qh_directory to anon, authenticated;

create or replace function qh_directory.published_faculty()
returns table (
  user_id uuid, display_name text, city text, country text, support_url text,
  headline text, biography text, credentials text, academic_affiliation text,
  research_interests text, teaching_languages text, publications text,
  office_hours text, portrait_url text, website_url text, orcid_url text,
  google_scholar_url text, linkedin_url text, youtube_url text, facebook_url text,
  instagram_url text, x_url text, credential_status text, updated_at timestamptz)
language sql stable security definer
set search_path = ''
as $$
  select p.user_id, a.display_name, a.city, a.country, a.support_url,
         p.headline, p.biography, p.credentials, p.academic_affiliation,
         p.research_interests, p.teaching_languages, p.publications,
         p.office_hours, p.portrait_url, p.website_url, p.orcid_url,
         p.google_scholar_url, p.linkedin_url, p.youtube_url, p.facebook_url,
         p.instagram_url, p.x_url, p.credential_status, p.updated_at
  from public.qh_instructor_profiles p
  join public.qh_lms_accounts a on a.user_id = p.user_id
  where p.is_published = true and a.active = true and a.role = 'instructor'
$$;
revoke all on function qh_directory.published_faculty() from public;
grant execute on function qh_directory.published_faculty() to anon, authenticated;

create or replace view public.qh_faculty_directory
with (security_invoker = on, security_barrier = true) as
  select * from qh_directory.published_faculty();
revoke all on public.qh_faculty_directory from public, anon, authenticated;
grant select on public.qh_faculty_directory to anon, authenticated;
comment on view public.qh_faculty_directory is 'Only explicitly published active faculty profiles; no login email or private records.';

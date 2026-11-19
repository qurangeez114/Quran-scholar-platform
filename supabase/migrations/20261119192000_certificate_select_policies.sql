-- qh_issue_certificate writes certificates as a security definer, and
-- qh_verify_certificate can look one up by code. RLS was left enabled on
-- qh_certificates with no SELECT policy, so /transcript.html and
-- getCertificates() returned no rows for the student who had just earned one.

alter table public.qh_certificates enable row level security;

drop policy if exists qh_certificates_select_own on public.qh_certificates;
create policy qh_certificates_select_own
  on public.qh_certificates
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists qh_certificates_select_manage on public.qh_certificates;
create policy qh_certificates_select_manage
  on public.qh_certificates
  for select
  to authenticated
  using (
    public.qh_is_staff()
    or qh_lms_private.can_manage_course(course_id)
  );

grant select on public.qh_certificates to authenticated;
revoke insert, update, delete on public.qh_certificates from anon, authenticated;

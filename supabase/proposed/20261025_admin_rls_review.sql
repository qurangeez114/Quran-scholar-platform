-- PROPOSED — review before running. Not applied by this PR.
-- Findings from read-only anon-key probes on 2026-10-25:
--   ads:      anon SELECT returns every column incl. advertiser `email` (PII) and non-active rows.
--   users:    anon SELECT returns 200 [] (RLS likely on with no matching policy; confirm).
--   qh_lms_accounts, qh_profiles, qh_school_applications, qh_research: anon denied (good).

-- 1) ads: expose only active ads, and only public columns, to anon.
alter table public.ads enable row level security;
drop policy if exists ads_public_read on public.ads;
create policy ads_public_read on public.ads for select to anon, authenticated
  using (status = 'active');
revoke select on public.ads from anon;
grant select (id, business_name, ad_text, link_url, image_url, status, starts_at, ends_at) on public.ads to anon;

-- 2) users: make sure only the owner/staff can read it.
alter table public.users enable row level security;
-- Example, adapt to your staff check:
-- create policy users_staff_read on public.users for select to authenticated using (public.qh_is_staff());

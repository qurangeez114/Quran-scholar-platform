# Sources publication gate — review-only migration plan (2026-11-14)

Status: **NOT APPROVED FOR PRODUCTION**. This is a concrete, nonexecuted migration and verification plan. Do not run until editor authorization and all dependent consumers have been tested.

## Confirmed baseline
- `public.ancient_sources` has `verification_status`; 34 verified and 5 nonverified rows at read-only check.
- Existing public SELECT RLS policy is permissive `USING (true)`; anon and authenticated have SELECT grants.
- `public.story_sources` has 149 records but **no per-record verification field**, and is independently publicly readable. Changing ancient_sources alone cannot protect story_sources.
- `qh_verified_verse_story_sources` is a `security_invoker` view; its filtering does not block direct base-table queries.

## Proposed ancient_sources migration (DO NOT APPLY UNTIL CHECKLIST COMPLETE)
```sql
BEGIN;
-- Confirm exact policy name and role grants again immediately before deployment.
DROP POLICY IF EXISTS "public read ancient_sources" ON public.ancient_sources;
CREATE POLICY "public read verified ancient_sources"
  ON public.ancient_sources
  FOR SELECT TO anon, authenticated
  USING (verification_status = 'verified');
-- Do not COMMIT until explicit editor policy exists and role tests pass.
ROLLBACK;
```

**Important:** The example above deliberately ends in ROLLBACK. Adding this as another permissive policy without dropping the old USING(true) policy would not protect any rows. The actual migration must explicitly preserve editorial access for authorized researchers, using a reviewed editor-authorization mechanism (not simply all authenticated users). Supabase service_role normally bypasses RLS, but that is not a substitute for an editor policy.

## Required pre-deployment checks
1. Re-read pg_policies, table grants, security-invoker/definer views, and relevant RPCs immediately before deployment; check other PRs and migrations for conflicting changes.
2. Inventory all `ancient_sources` and `story_sources` readers, including Stories/History pages, edge functions, and snapshot generation.
3. Define and test an authenticated **editor-only** predicate from existing trusted claims/membership, with deny-by-default behavior. Never expose service_role secrets in the browser.
4. Establish explicit `story_sources` review/publication status and a verified-only public read path. Backfill **unreviewed**, not verified; preserve existing data and stable story IDs.
5. In a staging database, impersonate `anon`, ordinary `authenticated`, authorized editor, and service role; test that five nonverified ancient sources are invisible to public roles and visible only to authorized editors; test 34 verified rows remain available.
6. Verify `story_sources` unpublished rows cannot be accessed directly, through joins/views or RPCs. Check the ten flagged records 131, 132, 142–149.
7. Test verse Sources cards, story ↔ verse navigation, history dossiers, and mobile fallback; preserve existing audio and all live research rows.
8. Obtain review/approval, apply migration through Supabase migration workflow, test production role-specific reads, and record rollback SQL and exact deployed commit.

## Rollback outline
Only after saving the exact original policy definitions and confirming no concurrent changes: restore the prior policy and remove the new one through a reviewed migration. Restoring USING(true) reopens nonverified data, so prefer fixing forward if possible. No production change was made by this document.

## Research workflow
Keep per-ayah screening and primary-text verification distinct. Do not treat the 149 story_sources rows as verified; do not promote the 10 flagged rows without precise original passage, critical edition, date, and stable link. Resume earliest *confirmed* uncovered ayat only after reconciling main and overlapping PRs.

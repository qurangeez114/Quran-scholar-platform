# Global Equb read-only production schema check — 2026-11-04

**Scope:** authorized Lovable Cloud project `ef150d64-a083-4c8d-b68a-6660524e17e6`, Supabase project `plipfiqqhwsxuzbutskk`. Read-only queries against PostgreSQL catalogs; **no data rows retrieved or modified**.

## Confirmed observations

- Production currently has 11 public base tables: `activity_log`, `contributions`, `equb_groups`, `equb_rounds`, `group_invites`, `group_members`, `group_terms`, `invite_responses`, `notifications`, `profiles`, `term_acceptances`.
- Review migration `0004_rules_and_lifecycle.sql` has **not** added its lifecycle tables or functions to the live public schema. The live schema is not equivalent to the review-staging schema.
- `has_function_privilege('anon', oid, 'EXECUTE')` returned **true** for these observed `SECURITY DEFINER` RPCs:
  - `public._terms_snapshot(uuid)`
  - `public.confirm_contribution(uuid)`
  - `public.create_circle(jsonb)`
  - `public.record_contribution(uuid,uuid,numeric,text)`
- `public._terms_snapshot(uuid)` function body directly constructs and returns a JSON object from `public.equb_groups` selected by supplied group UUID, without an explicit membership or `auth.uid()` check. It exposes group terms including eligibility, missed-payment, dispute, and dropout rules. Anonymous EXECUTE privilege creates a potential private-terms disclosure if a group UUID is known.
- These queries do **not** establish that the other RPCs permit unauthorized writes: internal permission checks must also be inspected.

## Priority and mitigation

1. Treat `_terms_snapshot` anonymous execution as a **confirmed authorization configuration defect**, with a possible data exposure conditional on knowledge of a group UUID. Do not attempt to retrieve private group rows to demonstrate it.
2. Follow the least-privilege fixes in review migration `0003_review_security_and_lifecycle.sql`, but **do not apply these migrations blindly**: take a full backup and compare current live functions, grants, constraints, tables and RLS policies to migration preconditions using a staging clone.
3. Verify privilege hardening in staging as *anon*, *authenticated outsider*, *member*, and *organizer*, and preserve legitimate invite previews and terms acceptance.
4. Apply only after explicit production authorization and verified rollback; regenerate Supabase types before releasing 0004 UI. Keep `VITE_EQUB_LIFECYCLE_V2_STAGING` off in production until then.

## Reproduction SQL (read-only)

```sql
select p.proname, pg_get_function_identity_arguments(p.oid) args,
       p.prosecdef security_definer,
       has_function_privilege('anon', p.oid, 'EXECUTE') anon_executable
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('_terms_snapshot','confirm_contribution',
                   'create_circle','record_contribution',
                   'consent_to_verify','complete_circle','circle_reconciliation')
order by p.proname;

select pg_get_functiondef('public._terms_snapshot(uuid)'::regprocedure);
```

This check is deliberately narrow and does not replace a complete independent staging audit or penetration test.

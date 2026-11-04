# Equb migration verification checklist — staged rollout ONLY

**Production change authorization:** None. This document does not authorize an application or a migration.

## 1. Gather read-only evidence

On a staging clone of the **Global Equb** Lovable database, execute `db-review/preflight/read_only_schema_audit.sql`. Compare with `drizzle/migrations/0000_migration.sql` through `0002_circle_terms_and_ethics.sql` and the proposed `db-review/migrations/0003*`/`0004*`.

Do not treat the historical Drizzle migrations as a current production schema-only dump. Check signatures, trigger definitions, RLS expressions, indexes, constraints, grants, table columns, and enum types before migrations.

**Previously confirmed on production (read-only, Nov 4):** 11 core public tables; `anon` can execute `public._terms_snapshot(uuid)` and several other SECURITY DEFINER functions. The definition of `_terms_snapshot` contains no membership check and directly reads a group by supplied UUID. This is a priority permission finding. Do not attempt to enumerate real private group UUIDs.

## 2. Apply to disposable staging clone only

- Back up the **Equb** database through the authorized owner/admin workflow; retain a tested restore path.
- Use a disposable clone as close as possible to production PostgreSQL and Supabase roles.
- Compare live/staging schema against 0003 preconditions. Resolve drift rather than editing production by trial and error.
- Rehearse 0003; verify no anonymous execution on internal helper functions, especially `_terms_snapshot`.
- Rehearse 0004; verify its prechecks against existing records and proper RLS on the five new tables.
- Confirm no authenticated outsider can see group membership, terms, contributions or dispute data.

## 3. Test real roles and edge cases

Use fresh synthetic accounts only: one organizer, four members, one outsider. Use fixed-value test payments **recorded off-platform** (do not transfer actual funds).

| Scenario | Required observation |
|---|---|
| Invite and accept terms | Every member sees and accepts an immutable terms version |
| Outsider views private circle | Denied |
| Anonymous calls `_terms_snapshot` | Denied |
| Organizer pays own round | Cannot independently verify own contribution |
| Member verifier opt-in/out | Changes future authority but not past audit records |
| Simultaneous contribution retries | Exactly one row, idempotent success |
| Duplicate payout-order IDs | Rejected |
| Incorrect / partial contribution | Rejected as designed |
| Late unverified contribution | Marked missed in group's timezone |
| Dispute open on contribution | Blocks the relevant round payout |
| Dispute resolution | Requires independent eligible verifier, appends audit event |
| Attempt early termination | Cannot complete without all member consents |
| Full five-member cycle | All five payout rounds, 25 confirmed member contributions |
| Final completion | Only when every payout acknowledged, no misses/disputes, correct reconciliation |
| Post-termination or completion writes | Rejected |

After migration, regenerate `src/integrations/supabase/types.ts`, regenerate `src/routeTree.gen.ts`, and remove staging adapter casts. Keep `VITE_EQUB_LIFECYCLE_V2_STAGING` disabled outside the tested staging clone.

## 4. Review before production

- All GitHub Actions UI/typecheck/build and PostgreSQL 17 tests pass with logs available.
- Security review signs off on SQL SECURITY DEFINER ownership/search_path, default PUBLIC execute grants, role grants, and all RLS policies.
- Confirm the backend state and frontend types point to the **same** staging schema.
- Document data migration prechecks and verified rollback from **full database backup**, not only grants rollback.
- Independent owner explicitly approves production cutover. Run in a maintenance window; verify afterward.
- Do not merge Equb review into QuranHikma main, and do not use the QuranHikma Netlify preview as proof of Equb functionality.

## Current hard blockers

As of the last check, the GitHub connector had returned **no executed Equb CI runs**, and the Netlify preview status was failing or pending, depending on the commit. The new migration-0004 UI is intentionally default-off. There is no staging sign-off, no five-member browser test, and no production authorization.

**No real payments, custody, or regulated money services are built.**

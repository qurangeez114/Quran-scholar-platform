# Global Equb database review (offline, not applied)

Status: review only. Nothing here has been applied to any live database.

## What is here
- `migrations/0003_review_security_and_lifecycle.sql`: proposed fixes on top of `drizzle/migrations` 0000–0002.
- `migrations/0003_rollback_grants.sql`: restores the old EXECUTE grants. It cannot restore old function bodies, so use a backup for a full rollback.
- `tests/lifecycle.test.mjs`: 28 tests (23 pass, 5 TODO) run against a real local Postgres.
- `tests/supabase-stub.sql`: minimal Supabase-like roles, `auth.uid()`, and default function grants.

## Run the tests
```
cd db-review && npm install
npx node tests/start-local-postgres.mjs     # keep running in another terminal (port 54329)
npm run test:baseline   # existing migrations only: expect 10 failures (the defects)
npm run test:review     # with 0003: expect 0 failures, 5 TODO
```

## Verified against the source (not just the audit)
| Audit claim | Result |
|---|---|
| Functions executable by anon | Confirmed. Revoking from `anon` alone did not work because `PUBLIC` keeps EXECUTE by default. |
| `_terms_snapshot` leaks private terms | Confirmed: anon could call it with a group ID. |
| Contribution race causes unique-constraint error | Reproduced: 3 simultaneous submissions raised `duplicate key`. Fixed by locking the round. |
| Organizer can satisfy both confirmations | Confirmed. Fixed: payer confirms payment, a different organizer confirms receipt. |
| Duplicate IDs accepted in payout order | Confirmed. Fixed. |
| `create_group` UI bug | Already fixed in this source: `groups.new.tsx` calls `create_circle`. `create_group` is only a legacy stub. |

## Migration 0003 summary
1. Revokes EXECUTE from `PUBLIC`, `anon`, and `authenticated` on every public function, then grants signed-in member RPCs back to `authenticated`.
2. `record_contribution`: locks the round, serialises concurrent submissions, treats identical retries as no-ops, never changes confirmed records.
3. `confirm_contribution`: a payer cannot also supply the organizer confirmation for their own payment.
4. `set_payout_order`: rejects duplicates, nulls, and non-members. Locked once a schedule or group activation exists.
5. `generate_schedule`: locks the group row. Refuses completed circles.
6. `record_payout`: requires every member's contribution to be confirmed by both payer and organizer.
7. `accept_current_terms`: fails explicitly if the terms row is missing.

## Open decisions (need your answer before applying)
1. **Organizer-paid rounds.** With one organizer, the organizer's own payment can never get an independent confirmation, so that round cannot be paid out. Options: add a promote-to-organizer flow, or let another member confirm receipt. The test suite promotes a member directly as a fixture only.
2. **Recipient contributes.** Payout = contribution × members, so the recipient is counted. Confirm this matches your rules.
3. **Amount check.** Contributions are not yet required to equal the group's fixed contribution amount. I did not add this because it could block existing flows.
4. **`is_group_member(group, user)`** takes any user ID and reveals membership. Policies need it, so it stays executable. Tightening needs a policy change.

## Not built yet (brief items 9–10)
Missed-contribution detection, disputes, early termination, and completion/final reconciliation. These are TODO tests, not implemented code.

## Applying to Lovable Cloud (only after approval)
1. Take a full backup of the Equb database through Lovable, and record the timestamp.
2. Apply `0003` in a transaction to a staging copy, run the tests against it, and check the output.
3. Apply to production in a maintenance window. Verify with `has_function_privilege('anon', ...)` (should be false for all public functions).
4. Rollback: restore the backup. For grants only, run `0003_rollback_grants.sql`.

## Limits of this evidence
- Tested on Postgres 18 locally. Supabase runs Postgres 17, so behaviour may differ slightly.
- Supabase's real auth schema and default grants are approximated in `supabase-stub.sql`.
- The concurrency tests show the race is fixed on this database. They are not a load test.
- The `app-routing` test fails before and after these changes because `src/assets/hero-community.jpg` is missing from the handoff. That is not caused by this work.

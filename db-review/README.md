# Global Equb database review (offline; nothing applied to any live database)

Status: migrations 0003 and 0004 are review-only. Do not apply to production until they are reviewed and tested against an accurate staging copy of the live database.

## Files
- `migrations/0003_review_security_and_lifecycle.sql`: least-privilege EXECUTE, contribution concurrency lock, exactly-once payout order, schedule locking.
- `migrations/0004_rules_and_lifecycle.sql`: business rules and lifecycle (below). Builds on 0003.
- `migrations/0003_rollback_grants.sql`: restores the pre-0003 EXECUTE grants only. Function bodies need the pre-apply backup.
- `tests/lifecycle.test.mjs`: 48 tests against a real local Postgres.
- `tests/supabase-stub.sql`: minimal Supabase-like roles, `auth.uid()`, default grants.

## Run the tests
```
cd db-review && npm install
npx node tests/start-local-postgres.mjs     # keep running (port 54329)
npm run test:review                          # expect: 48 pass, 0 fail
```
Tested on Postgres 18 locally. Supabase runs 17, so behaviour may differ slightly.

## Business rules (as confirmed)
1. **Every member contributes every round, including the recipient.** Enforced: payout needs all members' contributions confirmed (tested per round).
2. **No self-verification.** A payer confirms their own payment. Receipt is verified by a *different* authorized member: an organizer, or a member who opted in with `consent_to_verify`. `withdraw_verifier_consent` revokes it. Nobody is promoted automatically. The verifier's identity is stored on the contribution and in the audit log.
3. **Agreed amount only.** Every contribution must equal the group's contribution amount. Partial payments are refused with an explicit message. A future partial-payment design needs a balance ledger; partial amounts must never be marked fully paid.
4. **Membership information is restricted.** `is_group_member` and `is_group_organizer` (two-argument helpers that accept any user ID) are no longer executable by signed-in users. RLS policies now use `is_my_group` and `is_my_organizer`, which only check the caller. Tests confirm members see their circle and outsiders do not.

## Lifecycle features
- **Missed contributions:** `refresh_missed_contributions` (members). A payment is missed once the due date has passed in the circle's timezone and it is not fully verified. Detection is idempotent. A miss clears when the payment is verified later.
- **Disputes:** `open_dispute` (payer, round recipient, or organizer). An open dispute blocks that round's payout. `resolve_dispute` requires an independent verifier who is not the opener or the disputed payer. Opener can `withdraw_dispute`. Events are append-only.
- **Early termination:** `request_termination` (organizer) needs every member's consent (`consent_termination`). When all consent, the circle becomes `terminated`. Contributions, payouts, and rescheduling are refused.
- **Completion and reconciliation:** `complete_circle` (organizer) requires every round paid and acknowledged, every contribution verified, and no open disputes or misses. `circle_reconciliation` (members) shows each member's contributions, payouts, and net position. A completed circle nets to zero.
- **Audit trail:** `activity_log` and `dispute_events` reject UPDATE and DELETE.

## Open decisions (not blocking tests)
1. **Organizer-as-payer with no consenting verifier.** That payment can't be verified, so the round can't pay out until a member consents. This is intended under rule 2; the UI should say so.
2. **Partial payments.** Not supported. Needs a product decision and a balance ledger.
3. **Dispute outcomes.** Resolution keeps the contribution as recorded. "Payment was not received" disputes need a separate correction process, which is not built.
4. **Member withdrawal before completion.** Not built. Only organizer-requested early termination exists.

## Before applying to any live database
1. Take a full backup of the Equb database through Lovable and record the time.
2. Create a staging copy from that backup. Confirm its RLS policies, functions, and grants match what the migrations assume. The live schema may differ from the handoff migrations.
3. Run the test suite against staging. Also run `has_function_privilege('anon', ...)` checks on every public function. Expect false.
4. Apply 0003 then 0004 in a maintenance window. The precheck in 0004 stops if live data breaks the amount rule.
5. Rollback: restore the backup. For grants only, run `0003_rollback_grants.sql`.
6. Regenerate `src/integrations/supabase/types.ts` after applying. The new RPCs are not in the current types.

## Limits
- `supabase-stub.sql` approximates Supabase's auth schema and default grants. It is not the real image.
- Concurrency tests show the races are closed on this database. They are not load tests.
- App UI is not changed here. The group-detail page is still missing from the handoff.
- The `app-routing` test fails before and after these changes because `src/assets/hero-community.jpg` is missing from the handoff.

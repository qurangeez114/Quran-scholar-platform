# Global Equb UI — review only (not deployed)

This branch is based on `review/equb-backend-0003`, **not** QuranHikma main. Do **not** merge this branch into QuranHikma main. No live Equb database changes have been made.

## Current implementation

- `src/routes/_authenticated/groups.$groupId.tsx`: circle detail, terms snapshot, members, rounds, off-platform contribution/payout records, activity history.
- `src/components/verifier-consent-panel.tsx`: voluntary verifier opt-in and withdrawal, independent of payer.
- `src/components/missed-and-disputes.tsx`: missed contributions, payout-blocking disputes, event history, notes, withdrawals, independent resolution.
- `src/components/circle-lifecycle.tsx`: unanimous early termination, completion, per-member reconciliation.
- `src/lib/verification.ts`, `src/lib/disputes.ts`, `src/lib/lifecycle.ts`: UI-only eligibility hints; **not a security boundary**. Corresponding tests exist in `src/test/`.
- `tsconfig.json` recovered from Lovable; missing homepage image reference replaced with an illustrative CSS/HTML panel.
- `.github/workflows/global-equb-review.yml` added for no-deployment TypeScript, Vitest and build checks. No successful workflow run confirmed so far.

## Critical feature flag

Review migration 0004 has NOT been applied to production. The new verifier, disputes/missed contributions, termination and reconciliation panels and their queries are **disabled by default** using:

```env
VITE_EQUB_LIFECYCLE_V2_STAGING=true
```

Set the variable **only on a validated staging clone** of Global Equb **after** applying and testing migrations 0003 then 0004, verifying RLS and grants, and regenerating Supabase types. Do not enable the flag in production before rollout approval. A Vite flag is not an authorization boundary and must never substitute for database RLS.

## Required release gates

1. Create accurate staging clone of the **Equb** database, never the QuranHikma database; take production backup first.
2. Compare live schema with Drizzle migrations and Claude's review-only migrations 0003 and 0004; resolve drift rather than applying blindly.
3. Apply/test in staging; verify permission grants, signed-out requests, membership isolation, concurrent contribution/report calls, independent verification and dispute resolution. The full five-member financial cycle must pass.
4. Regenerate `src/integrations/supabase/types.ts` from staging; remove temporary RPC/type adapter assertions from lifecycle components.
5. Let TanStack Router regenerate `src/routeTree.gen.ts`. Type-check, run all Vitest tests, run the app build and browser flows. Status is **unverified**, not passing.
6. Review effect of Netlify checks from this repository: a Netlify preview status reported **failure** on the UI branch as of Nov 4. This does not prove a production deploy occurred.
7. Audit completion UX: server RPCs are authoritative, not the client-side completion button. Do not allow completed circle until outstanding disputes and misses are resolved.
8. Review content, accessible labels, mobile layout, consent messaging, actual externally confirmed transfers vs reported payments, and disputes about nonreceipt.
9. Keep review-only backend and UI code out of QuranHikma main and production Equb until explicitly approved.

No real money transfers, custody or provider confirmations are implemented.

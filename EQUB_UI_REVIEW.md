# Review-only Global Equb UI follow-up

This UI branch is based on `review/equb-backend-0003`, **NOT** QuranHikma main. Never merge this into QuranHikma main.

## Added
`src/routes/_authenticated/groups.$groupId.tsx` — private, authenticated group detail page:
- Read-only group, member, term, and schedule displays, using existing RLS-bound queries
- Per-round reported vs verified totals, member confirmation action, and payout acknowledgements
- Organizer invite, schedule, and off-platform contribution/payout recording actions, using existing RPCs
- Loading/denied/error states and mobile-compatible layout

## Still to do before publication
- **Build and run route tests.** Lovable workspace is out of credits; no local project build was possible from this connected interface.
- **Regenerate** the TanStack Router route tree and Supabase types when integrating into the actual Lovable project.
- The branch includes review-only migrations 0003/0004 inherited from the backend branch. They are NOT deployed.
- Integrate 0004 opt-in independent verifier consent, disputes, missed contributions, termination, and final reconciliation with generated types and RLS verification.
- Read actual published `group_terms` snapshot rather than displaying a projection of mutable `equb_groups` attributes.
- Test all user roles against staging database, especially organizer-payer dual confirmation prevention.
- Correct UX for concurrent mutation errors; only server-side functions decide actual eligibility.

No live Supabase data was changed. No actual funds are transferred.
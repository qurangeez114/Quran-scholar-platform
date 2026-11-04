# Equb source handoff for Claude
This is an isolated review-only branch, NOT part of QuranHikma. Do NOT merge this branch to main.
Project plipfiqqhwsxuzbutskk, Lovable project ef150d64-a083-4c8d-b68a-6660524e17e6.
These files were read from Lovable source commit d4f5d04fcf5143ed87288301290b006e78f8f23d.
The project uses Drizzle migrations (not supabase/migrations). Live schema evolved beyond these historical migrations; this is not a comprehensive pg_dump.
No credentials, .env or personal records are included.
Read migration SQL, TypeScript types, lib/api, lib/equb and routes. Create reviewable offline SQL fixes and tests; never change live DB without approval.
Known: group-detail route missing. UI calls create_group RPC which now raises an intentional 'update app' exception, while create_circle supports full written terms. Some SECURITY DEFINER RPCs allow EXECUTE to anon; inspect security. Contribution has unique(round_id,payer_id), but concurrency and payout-order validation require further audit.
Lovable DB MCP read-only audit confirmed RLS enabled on 11 public tables; no changes were made.

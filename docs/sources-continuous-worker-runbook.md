# QuranHikma Sources — resumable near-continuous screening worker

## Live deployment / verified state (2026-11-04)

- Project: `ylosytbxpzxzwfzjpaej`
- **Applied migration:** `qh_sources_continuous_queue_20261104` — database tables and three atomic queue functions.
- **Applied network extension:** `pg_net` enabled and confirmed via migration `qh_sources_enable_pg_net_20261104` (no cron jobs created).
- **Deployed Edge Function:** `qh-sources-worker`, version 1, JWT verification ON.
- **Database verified:** 6,236 unique verse keys; 6,199 awaiting initial AI screening, 37 already preliminarily screened in earlier GitHub research batches (1:1–7, 2:1–30). The 37 existing screenings are marked `externally_screened`, not scholarly verified. 0 new drafts.
- **Security verified:** `anon` and `authenticated` cannot read queue/drafts or call queue-claim RPC. No change to public `ancient_sources` or Stories.
- **Tests:** seven contract tests pass.
- **Critical status: NOT ACTIVE AS A REPEATING WORKER.** No AI API key is known to be configured, no Vault secrets are present, and no cron trigger has been scheduled. Do not claim 24/7 automatic screening or publication until activation and a real test run succeed.
- Existing ChatGPT hourly research automation is separate and remains enabled. Avoid counting its results twice.

## Operating architecture

1. `qh_source_work_queue` contains one row for each verse in canonical `public.ayas`.
2. An authenticated service-only Edge Function acquires one pending verse atomically with `qh_source_claim`, using row locks and a four-minute lease. Expired leases can be reclaimed, up to five attempts.
3. The function sends verse text (Arabic and English) to a configured OpenAI Responses API model with structured output and restrictive comparative-research instructions.
4. It records **unverified AI triage ONLY** in the private `qh_source_screening_drafts` table. No AI output is a primary-text verification. A separate primary-source examination and human/editorial review must precede any public association. Strong narrative comparisons should be expanded into documented Stories/History dossiers.
5. On failure, the lease is released for bounded backoff/retry; excess attempts end in `failed`, requiring diagnosis. One verse per invocation, limited daily draft count (default 60; maximum 120). A one-minute cron trigger produces near-continuous *scheduled* work with retry gaps, not uninterrupted real-time processing.
6. Human review, source verification, publication, and academic completeness are **distinct from** preliminary AI coverage. Do not count seeded queue items as reviewed.

## Secure activation checklist (not yet performed)

- In **Supabase → Edge Functions → Secrets** for project `ylosytbxpzxzwfzjpaej`, set a dedicated billed AI provider API secret called `OPENAI_API_KEY`. **Never paste any secret into chat or Git.** Optional `QH_RESEARCH_MODEL` and `QH_MAX_DAILY_SCREENS` control model and cost cap. The provider account may incur charges and needs spending limits.
- `pg_net`, `pg_cron` and Vault are already installed; do not re-install or overwrite existing schedules.
- In Supabase Vault, securely store `qh_sources_project_url` (the project URL) and `qh_sources_service_role_jwt` (the **legacy service-role JWT** available through your authorized project dashboard, **not** the previously pasted `sbp_` personal access token). Keep the JWT only in Vault; rotate as appropriate. The worker requires that service-role JWT on the Authorization header, and is deployed with `verify_jwt: true`.
- Once both credentials and the AI key exist, invoke the worker **once** using an authorized server-side service-role request; confirm it creates one `unverified` draft, and no `ancient_sources` row. Do not use anonymous/public keys.
- Only after successful smoke tests, run `database/qh_sources_worker_cron_activation.sql` in Supabase SQL Editor to invoke the worker every minute.
- Monitor the queue counts, provider spend, `cron.job_run_details`, and Edge Function logs. Pause with `select cron.unschedule('qh_sources_worker_every_minute');` if errors or costs rise.
- For a failure to activate, leave cron disabled and document the blocker; do not silently publish source candidates.

## Monitoring

```sql
select state, count(*) from public.qh_source_work_queue group by state order by state;
select count(*) from public.qh_source_screening_drafts;
select count(*) from public.ancient_sources where verification_status = 'verified';
select jobname,schedule,active from cron.job where jobname='qh_sources_worker_every_minute';
```

## Source-critical quality gate

A candidate must cite a real text with exact chapter/section, edition/translation, manuscript/date caveats, substantively comparable passages, meaningful differences, and alternative scholarly explanations. Topic-only commonalities are better suited to Cross-References. **No model output may be automatically promoted to `verified`.** Uncertainty about historical dating or literary dependence must be explicit. This is a preliminary screening pipeline, not proof that every verse has been fully academically assessed.

## Next engineering work

Create the source-verification/editorial review workflow and bibliographic audit trail, integrate qualified verified candidates with per-ayah Sources and Stories/History pages, and design alerts/monitoring. Prevent duplicates with the existing GitHub research checkpoints and the hourly ChatGPT automation. Do not attempt to publish all AI-generated suggestions.

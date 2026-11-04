-- Activation template. Run ONLY after both Vault secrets exist and
-- OPENAI_API_KEY has been set under Edge Function Secrets.
-- Do not paste secret values into this SQL file or commit them to Git.
-- qh_sources_project_url: https://<project-ref>.supabase.co
-- qh_sources_service_role_jwt: LEGACY Supabase service-role JWT,
-- not a Supabase personal access token (sbp_...) or publishable key.
--
-- Provision both via authorized secure Vault UI/API, not in chat.
-- If already scheduled this name, cron.schedule updates its definition.
do $check$
begin
  if not exists(select 1 from pg_extension where extname='pg_net') then
    raise exception 'Install pg_net first';
  end if;
  if not exists(select 1 from vault.secrets where name='qh_sources_project_url')
    or not exists(select 1 from vault.secrets where name='qh_sources_service_role_jwt') then
    raise exception 'Missing securely stored Vault secrets';
  end if;
end
$check$;

select cron.schedule(
  'qh_sources_worker_every_minute',
  '* * * * *',
  $job$
    select net.http_post(
      url:=(select decrypted_secret from vault.decrypted_secrets where name='qh_sources_project_url')
            || '/functions/v1/qh-sources-worker',
      headers:=jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer ' ||
          (select decrypted_secret from vault.decrypted_secrets where name='qh_sources_service_role_jwt')
      ),
      body:='{}'::jsonb,
      timeout_milliseconds:=120000
    );
  $job$
);

-- Pause: select cron.unschedule('qh_sources_worker_every_minute');
-- Monitor: select jobid,active,schedule from cron.job where jobname='qh_sources_worker_every_minute';
-- Errors: select * from cron.job_run_details where jobid =
-- (select jobid from cron.job where jobname='qh_sources_worker_every_minute')
-- order by start_time desc limit 20;

alter table public.qh_lms_accounts add column if not exists support_url text;
alter table public.qh_lms_accounts add constraint qh_lms_support_url_length check (support_url is null or length(support_url) <= 600);
comment on column public.qh_lms_accounts.support_url is 'Optional instructor-owned hosted payment/support URL; validated by lms-admin. Does not grant learning access.';

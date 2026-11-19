-- PostgREST could not choose between the historical 3-argument
-- qh_grade_quiz and the 4-argument version added in
-- 20261119190000 (p_save has a default). Keep only the 4-argument
-- function; calls that omit p_save use the default.
drop function if exists public.qh_grade_quiz(uuid, jsonb, text);
grant execute on function public.qh_grade_quiz(uuid, jsonb, text, boolean) to authenticated;
revoke all on function public.qh_grade_quiz(uuid, jsonb, text, boolean) from public, anon;

-- One submission per student per assignment, written through a checked RPC.
-- Students may not UPDATE submissions directly (that would let them edit grades),
-- so resubmission replaces the work but preserves any existing grade/feedback.
create or replace function public.qh_submit_assignment(
  p_assignment uuid, p_content text, p_file_url text default null, p_file_name text default null
) returns public.qh_assignment_submissions
language plpgsql security definer set search_path to '' as $fn$
declare
  me uuid := auth.uid();
  course uuid;
  existing public.qh_assignment_submissions%rowtype;
  saved public.qh_assignment_submissions%rowtype;
begin
  if me is null then raise exception 'Not authenticated' using errcode='28000'; end if;
  if p_content is null or length(trim(p_content))=0 then raise exception 'Submission text is required'; end if;
  if length(p_content)>200000 then raise exception 'Submission is too long'; end if;
  select l.course_id into course from public.qh_assignments a
    join public.qh_lessons l on l.id=a.lesson_id where a.id=p_assignment;
  if course is null then raise exception 'Assignment not found'; end if;
  if not qh_lms_private.can_learn(course) then raise exception 'Class enrollment required' using errcode='42501'; end if;
  -- Prefer the graded copy if duplicates already exist, else the newest one.
  select * into existing from public.qh_assignment_submissions
   where assignment_id=p_assignment and user_id=me
   order by (grade is not null) desc, submitted_at desc nulls last limit 1 for update;
  if found then
    update public.qh_assignment_submissions
       set content=p_content,file_url=p_file_url,file_name=p_file_name,submitted_at=now()
     where id=existing.id returning * into saved;
  else
    insert into public.qh_assignment_submissions(assignment_id,user_id,content,file_url,file_name)
    values (p_assignment,me,p_content,p_file_url,p_file_name) returning * into saved;
  end if;
  return saved;
end $fn$;
revoke all on function public.qh_submit_assignment(uuid,text,text,text) from public,anon;
grant execute on function public.qh_submit_assignment(uuid,text,text,text) to authenticated,service_role;

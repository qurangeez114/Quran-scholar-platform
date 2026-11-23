-- Records nine course-system migrations that were applied to the live database
-- by hand (SQL editor) and so were never written to supabase_migrations.schema_migrations.
-- It only inserts history rows; it runs none of the migrations again. The SQL of each
-- one is the repo file named in its statements column.
-- Applied live 2026-11-23. Safe to re-run: existing versions are skipped.
insert into supabase_migrations.schema_migrations (version, name, statements, created_by)
values
  ('20261116130000', 'publish_requires_syllabus', array['-- applied by hand; SQL is in supabase/migrations/20261116130000_publish_requires_syllabus.sql'], 'record-history-2026-11-23'),
  ('20261117090000', 'owner_manage_all_courses', array['-- applied by hand; SQL is in supabase/migrations/20261117090000_owner_manage_all_courses.sql'], 'record-history-2026-11-23'),
  ('20261117100000', 'issue_certificate_server_side', array['-- applied by hand; SQL is in supabase/migrations/20261117100000_issue_certificate_server_side.sql'], 'record-history-2026-11-23'),
  ('20261119120000', 'school_application_guardian_consent', array['-- applied by hand; SQL is in supabase/migrations/20261119120000_school_application_guardian_consent.sql'], 'record-history-2026-11-23'),
  ('20261119140000', 'course_tuition_and_application_phone', array['-- applied by hand; SQL is in supabase/migrations/20261119140000_course_tuition_and_application_phone.sql'], 'record-history-2026-11-23'),
  ('20261119190000', 'sync_quiz_keys_and_server_grade_only', array['-- applied by hand; SQL is in supabase/migrations/20261119190000_sync_quiz_keys_and_server_grade_only.sql'], 'record-history-2026-11-23'),
  ('20261119191000', 'drop_qh_grade_quiz_3arg_overload', array['-- applied by hand; SQL is in supabase/migrations/20261119191000_drop_qh_grade_quiz_3arg_overload.sql'], 'record-history-2026-11-23'),
  ('20261119192000', 'certificate_select_policies', array['-- applied by hand; SQL is in supabase/migrations/20261119192000_certificate_select_policies.sql'], 'record-history-2026-11-23'),
  ('20261121170000', 'course_class_format_and_currency_code', array['-- applied by hand; SQL is in supabase/migrations/20261121170000_course_class_format_and_currency_code.sql'], 'record-history-2026-11-23')
on conflict (version) do nothing;

-- Records 22 older repo migrations (Oct 16 to Nov 19) in supabase_migrations.schema_migrations
-- under the version in their repo file name, so a CLI push never tries to run them again.
-- It only inserts history rows; it runs none of the migrations.
-- Each one was checked against the live database first:
--   * 14 files were already recorded under another version (applied through a tool that
--     stamps its own time); their SQL matches the history copy, ignoring whitespace and comments.
--   * 13 files were never recorded; their tables, columns, functions, trigger and seed rows
--     are all live.
-- Versions 20261016, 20261017 and 20261021 are each shared by several files, so each gets one row
-- naming all its files.
-- Left out (not applied live): 20261103130000_hadith_variants_sunnah_com_numbering
-- (file inserts 28,580 rows; 282 exist) and 20261103140000_hadith_renumber_sunnah_com
-- (its mapping and backup tables do not exist).
-- Applied live 2026-11-23. Safe to re-run: existing versions are skipped.
insert into supabase_migrations.schema_migrations (version, name, statements, created_by)
values
  ('20261016', 'instructor_invitation_password_reset+visitor_analytics_secure_ingest', array['-- SQL is in supabase/migrations/20261016_instructor_invitation_password_reset.sql (already in history as 20261016194212, same SQL)', '-- SQL is in supabase/migrations/20261016_visitor_analytics_secure_ingest.sql (already in history as 20261016205041, same SQL)'], 'record-history-2026-11-23'),
  ('20261016182333', 'lms_instructor_management', array['-- SQL is in supabase/migrations/20261016182333_lms_instructor_management.sql (already in history as 20261016185041, same SQL)'], 'record-history-2026-11-23'),
  ('20261017', 'academic_collaboration+academic_group_owner_integrity+faculty_course_reuse+faculty_profiles', array['-- SQL is in supabase/migrations/20261017_academic_collaboration.sql (already in history as 20261017214146, same SQL)', '-- SQL is in supabase/migrations/20261017_academic_group_owner_integrity.sql (already in history as 20261017220052, same SQL)', '-- SQL is in supabase/migrations/20261017_faculty_course_reuse.sql (already in history as 20261017230153, same SQL)', '-- SQL is in supabase/migrations/20261017_faculty_profiles.sql (already in history as 20261017184152, same SQL)'], 'record-history-2026-11-23'),
  ('20261020', 'school_admissions', array['-- SQL is in supabase/migrations/20261020_school_admissions.sql (already in history as 20261020184117, same SQL)'], 'record-history-2026-11-23'),
  ('20261021', 'school_application_assignment+submit_assignment_rpc', array['-- SQL is in supabase/migrations/20261021_school_application_assignment.sql', '-- SQL is in supabase/migrations/20261021_submit_assignment_rpc.sql'], 'record-history-2026-11-23'),
  ('20261022', 'school_application_offers', array['-- SQL is in supabase/migrations/20261022_school_application_offers.sql'], 'record-history-2026-11-23'),
  ('20261101120000', 'qh_discussion_reply_policy', array['-- SQL is in supabase/migrations/20261101120000_qh_discussion_reply_policy.sql (already in history as 20261101185049, same SQL)'], 'record-history-2026-11-23'),
  ('20261101130000', 'qh_verse_media_upload', array['-- SQL is in supabase/migrations/20261101130000_qh_verse_media_upload.sql (already in history as 20261102072545, same SQL)'], 'record-history-2026-11-23'),
  ('20261103120000', 'hadith_comparison_engine_schema', array['-- SQL is in supabase/migrations/20261103120000_hadith_comparison_engine_schema.sql'], 'record-history-2026-11-23'),
  ('20261103120100', 'hadith_family_seed_beginning_of_revelation', array['-- SQL is in supabase/migrations/20261103120100_hadith_family_seed_beginning_of_revelation.sql'], 'record-history-2026-11-23'),
  ('20261103120200', 'hadith_family_seed_isra_wal_miraj', array['-- SQL is in supabase/migrations/20261103120200_hadith_family_seed_isra_wal_miraj.sql'], 'record-history-2026-11-23'),
  ('20261103120300', 'hadith_family_seed_final_illness_abu_bakr_prayer', array['-- SQL is in supabase/migrations/20261103120300_hadith_family_seed_final_illness_abu_bakr_prayer.sql'], 'record-history-2026-11-23'),
  ('20261104120000', 'hadith_transmitter_identity_review', array['-- SQL is in supabase/migrations/20261104120000_hadith_transmitter_identity_review.sql'], 'record-history-2026-11-23'),
  ('20261105120101', 'hadith_family_seed_actions_by_intentions', array['-- SQL is in supabase/migrations/20261105120101_hadith_family_seed_actions_by_intentions.sql'], 'record-history-2026-11-23'),
  ('20261105120102', 'hadith_family_seed_islam_built_on_five', array['-- SQL is in supabase/migrations/20261105120102_hadith_family_seed_islam_built_on_five.sql'], 'record-history-2026-11-23'),
  ('20261105120103', 'hadith_family_seed_farewell_pilgrimage_sanctity', array['-- SQL is in supabase/migrations/20261105120103_hadith_family_seed_farewell_pilgrimage_sanctity.sql'], 'record-history-2026-11-23'),
  ('20261105130101', 'hadith_family_seed_lying_about_the_prophet', array['-- SQL is in supabase/migrations/20261105130101_hadith_family_seed_lying_about_the_prophet.sql'], 'record-history-2026-11-23'),
  ('20261105130102', 'hadith_family_seed_seeing_the_prophet_in_a_dream', array['-- SQL is in supabase/migrations/20261105130102_hadith_family_seed_seeing_the_prophet_in_a_dream.sql'], 'record-history-2026-11-23'),
  ('20261108084500', 'speed_up_research_hadith_book_rows', array['-- SQL is in supabase/migrations/20261108084500_speed_up_research_hadith_book_rows.sql (already in history as 20261108164904, same SQL)'], 'record-history-2026-11-23'),
  ('20261116090000', 'enforce_course_publish_readiness', array['-- SQL is in supabase/migrations/20261116090000_enforce_course_publish_readiness.sql (already in history as 20261119174914, same SQL)'], 'record-history-2026-11-23'),
  ('20261119090000', 'presentation_projects_private_per_user', array['-- SQL is in supabase/migrations/20261119090000_presentation_projects_private_per_user.sql (already in history as 20261119021805, same SQL)'], 'record-history-2026-11-23'),
  ('20261119200000', 'lock_down_open_writes', array['-- SQL is in supabase/migrations/20261119200000_lock_down_open_writes.sql (already in history as 20261119202434, same SQL)'], 'record-history-2026-11-23')
on conflict (version) do nothing
returning version, name;

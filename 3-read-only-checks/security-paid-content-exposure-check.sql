-- security-paid-content-exposure-check.sql  (v2, 2026-11-01)  READ-ONLY. Changes nothing.
-- Question: using only the public (anon) key, or any ordinary signed-in account, which tables can be read, and how many rows?
-- v2 runs as ONE block and shows the answer as an "error" message, because the Supabase editor runs each
-- statement separately and loses temporary tables. The red error box IS the result. Nothing is saved.
-- If Supabase offers "Run and enable RLS", choose "Run without RLS".
-- Reading it:  table: anon=<rows or blocked> member=<rows or blocked>
-- A number for anon on paid lessons, answer keys, applications, messages, appraisals or profiles = a hole. Public job listings are fine.

do $$
declare
  t text; n bigint; a text; m text; out text := ''; flags text := '';
  tables text[] := array[
    'courses','course_lessons','course_questions','course_answers','course_enrollments','course_certificates',
    'books','book_chapters','book_audio_segments',
    'assessments','assessment_questions','assessment_answers','assessment_results','career_aptitude_questions',
    'jobs','external_jobs','job_applications','job_alerts',
    'profiles','profiles_private','messages','support_tickets','admin_inbox_messages',
    'appraisal_orgs','appraisal_cycles','appraisal_reviews','appraisal_content',
    'workforce_profiles','workforce_listings','virtual_assistants','user_credits','credit_ledger',
    'system_config','audit_logs','analytics_sessions','page_views','blocked_ips','verified_employer_sources'
  ];
begin
  foreach t in array tables loop
    if to_regclass('public.' || quote_ident(t)) is null then continue; end if;
    begin
      execute 'set local role anon';
      execute format('select count(*) from public.%I', t) into n;
      a := n::text;
    exception when others then a := 'blocked';
    end;
    reset role;
    begin
      execute 'set local role authenticated';
      execute format('select count(*) from public.%I', t) into n;
      m := n::text;
    exception when others then m := 'blocked';
    end;
    reset role;
    out := out || E'\n' || t || ': anon=' || a || ' member=' || m;
    if a not in ('blocked','0') then flags := flags || E'\n  ANYONE CAN READ: ' || t;
    elsif m not in ('blocked','0') then flags := flags || E'\n  any signed-in member can read: ' || t;
    end if;
  end loop;
  raise exception E'EXPOSURE RESULT\nFLAGS:%\n\nALL TABLES:%', coalesce(nullif(flags,''), ' none'), out;
end $$;

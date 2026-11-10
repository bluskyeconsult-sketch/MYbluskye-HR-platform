-- 20-fix-function-warnings.sql   Safe to run more than once.
-- Fixes the Supabase security-lint warnings about functions:
--  A) Stops the public (not signed in) from being able to call admin-only functions.
--     Admin tools keep working: signed-in admins can still call them (each one also checks admin inside).
--  B) job_post_refund_on_reject is a trigger only; nobody should call it directly.
--  C) Fixes the search path on your own functions so they cannot be tricked into using a look-alike object.
-- Deliberately NOT touched: get_public_jobs, register_status, check_employer_register (meant to be public),
-- and is_staff, is_super_admin, is_engagement_party (your access rules depend on them).

do $$
declare r record;
begin
  -- A) admin-only functions: no public/anon access; signed-in users keep access (admin check is inside)
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('_is_register_admin','load_register_entries','finish_register_load','rematch_jobs_to_registers')
  loop
    execute format('revoke execute on function %s from public, anon', r.sig);
    execute format('grant execute on function %s to authenticated, service_role', r.sig);
  end loop;

  -- B) trigger-only function: nobody calls it directly (the trigger still fires normally)
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'job_post_refund_on_reject'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
  end loop;

  -- C) fixed search path on our own functions
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('is_care_role','infer_job_country','jobs_set_care_role','normalize_employer_name',
                        'jobs_match_register','register_status','check_employer_register',
                        'appraisal_lock_updates','appraisal_lock_deletes')
  loop
    execute format('alter function %s set search_path = public, pg_temp', r.sig);
  end loop;
end $$;

-- Proof table (should list the fixed functions; anon_can_run must be false for all except none)
select p.proname as function_name,
       has_function_privilege('anon', p.oid, 'execute') as anon_can_run,
       has_function_privilege('authenticated', p.oid, 'execute') as signed_in_can_run,
       coalesce(array_to_string(p.proconfig, ','), 'NOT SET') as search_path
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('_is_register_admin','load_register_entries','finish_register_load','rematch_jobs_to_registers',
                    'job_post_refund_on_reject','is_care_role','infer_job_country','jobs_set_care_role',
                    'normalize_employer_name','jobs_match_register','register_status','check_employer_register',
                    'appraisal_lock_updates','appraisal_lock_deletes')
order by 1;

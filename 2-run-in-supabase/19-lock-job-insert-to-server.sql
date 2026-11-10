-- lock-job-insert-to-server.sql  (2026-10-23)
-- RUN THIS LAST, ONLY AFTER the new Post Job page and the server files are live and a test post has worked.
--
-- Why: add-jobs-owner-column.sql let any signed-in member insert a pending job straight from the browser, which
-- skips the plan check, the 20-a-month limit and the new pay-per-post credits. This removes that door. From now on
-- jobs are submitted through the server (job-post-create), which does the checks and writes the job itself.
-- Existing jobs, employers reading their own jobs, editing, and admin tools are not affected.
--
-- To undo (if posting stops working): run add-jobs-owner-column.sql again, which recreates the first policy.
-- If something else of yours inserted jobs through jobs_insert_employer, tell me what and I will move it to the server.

drop policy if exists "Employers insert own pending jobs" on public.jobs;
-- Found by the 2026-10-23 security check: a second, older rule also lets any visitor save a job straight from the
-- browser as long as employer_id is their own id. It is removed too. (Admins keep full access through
-- "Admins manage all jobs", and the server uses the service key, so neither is affected.)
drop policy if exists "jobs_insert_employer" on public.jobs;
notify pgrst, 'reload schema';

-- Check (read only): any other policy that still lets ordinary members insert into jobs? Expect only admin/system ones.
select policyname, cmd, roles, with_check
from pg_policies where schemaname = 'public' and tablename = 'jobs' and cmd in ('INSERT', 'ALL');

-- 23-create-data-freshness.sql   Safe to run more than once.
-- Powers the admin "Keep Up To Date" page and pop-up reminder.
-- It lists everything on the site that goes out of date, when it was last updated or confirmed, and whether it is due.
--  * AUTOMATIC items read their date from the data itself (employer lists, compliance rules, pricing, job feed).
--  * MANUAL items are things only you can check (gov.uk rules, legal pages, AI chat facts). You press "I checked this today".
-- Only admins can read or change any of it.

create table if not exists public.admin_review_items (
  key text primary key,
  title text not null,
  why text not null,
  how_to text not null,
  fix_path text,
  max_age_days integer not null check (max_age_days > 0),
  last_checked_on date,
  last_checked_by uuid,
  sort_order integer not null default 100
);
alter table public.admin_review_items enable row level security;
revoke all on public.admin_review_items from anon;
drop policy if exists "review_items_admin_only" on public.admin_review_items;
create policy "review_items_admin_only" on public.admin_review_items for all to authenticated
  using (public._is_register_admin()) with check (public._is_register_admin());

insert into public.admin_review_items (key, title, why, how_to, fix_path, max_age_days, sort_order) values
 ('uk-immigration-rules','UK immigration rules shown on the site and in the AI chat',
  'Visa routes, salary thresholds, fees and settlement rules change often. Out of date advice can harm people and expose you legally.',
  'Open gov.uk (Skilled Worker, care worker route, settlement and fees pages). Compare with the Country Rules page and the AI chat facts. If anything changed, tell Claude what changed so the files can be updated, then press "I checked this today".',
  '/admin/compliance-rules', 60, 10),
 ('ai-chat-facts','Facts written into the AI chat (fees, thresholds, route closures)',
  'The AI chat has immigration facts written into its instructions in the code. They do not update themselves.',
  'Ask Claude to review the AI chat immigration facts against current official sources and send you the updated api/index.js. Then press "I checked this today".',
  null, 60, 20),
 ('care-relocation-content','Care Relocation page: Canada, Australia, New Zealand and Ireland rules',
  'Employer list rules, eligibility and processing details differ by country and change.',
  'Read the Care Relocation page against each country''s official immigration site. Note anything that changed and send it to Claude to update. Then press "I checked this today".',
  null, 90, 30),
 ('legal-pages','Terms, Privacy and Cookie pages',
  'Laws, your services and your suppliers change. These pages must match what you actually do.',
  'Read each page. If you added a service, supplier or country since the last review, send the changes to Claude to update the wording. Consider a solicitor review once a year.',
  null, 180, 40),
 ('pricing-and-plans','Pricing page, plans and Stripe prices',
  'Prices on the site, in the database and in Stripe must agree, and any free-pilot wording must be true.',
  'Compare the Pricing page with your Stripe products. Check that the free-pilot messages still match your testing-mode setting.',
  '/admin/geo-pricing', 90, 50),
 ('jooble-permission','Jooble written permission to display its listings',
  'Jooble listings are held back until Jooble confirms in writing that they may be shown.',
  'Check your email for Jooble''s written reply. If you have it, save it and tell Claude so the hold can be lifted. Press "I checked this today" when you have looked.',
  '/admin/external-jobs', 30, 60),
 ('security-checks','Security checks: Supabase security lint and the exposure checks',
  'New tables, policies and code can reopen a gap. A regular check catches it early.',
  'In Supabase run the Security Advisor, then run security-paid-content-exposure-check.sql and send any red results to Claude. Press "I checked this today".',
  null, 30, 70),
 ('keys-and-access','API keys, email and payment access',
  'Old keys and unused admin accounts are a common way in.',
  'In Vercel and Supabase, remove unused keys and people. Rotate the email, AI and payment keys if anyone who had them has left. Never paste a key into a chat.',
  null, 180, 80),
 ('accreditation-claims','Claims about accreditation, CPD or certificates',
  'You must not say a course is accredited until it is. Claims must match your current status.',
  'Search the site for the words accredited, CPD and certified. Each claim must be true today. Press "I checked this today".',
  null, 90, 90)
on conflict (key) do nothing;

create or replace function public.admin_freshness()
returns table (key text, title text, source text, last_updated date, max_age_days integer, days_old integer,
               status text, why text, how_to text, fix_path text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare d date;
begin
  if not public._is_register_admin() then raise exception 'Admins only'; end if;

  -- AUTOMATIC: official employer lists (one row per list)
  return query
    select 'register-' || r.key, 'Official employer list: ' || r.title, 'automatic', r.loaded_on, case when r.country_code = 'GB' then 45 else 150 end,
           case when r.loaded_on is null then null else (current_date - r.loaded_on) end,
           case when r.loaded_on is null then 'never loaded'
                when current_date - r.loaded_on > (case when r.country_code = 'GB' then 45 else 150 end) then 'overdue'
                when current_date - r.loaded_on > (case when r.country_code = 'GB' then 35 else 120 end) then 'due soon' else 'ok' end,
           'Jobs and the employer check on the Care Relocation page use this list. An old list can badge an employer whose approval has ended.',
           'Download the newest official file, save it as CSV, and load it at Admin > Employer Lists.',
           '/admin/employer-registers'
    from public.employer_registers r where r.is_active;

  -- AUTOMATIC: compliance rules (oldest review date)
  if to_regclass('public.country_service_rules') is not null then
    execute 'select min(last_reviewed) from public.country_service_rules' into d;
    return query select 'compliance-rules'::text, 'Country compliance rules (oldest row reviewed)'::text, 'automatic'::text, d, 180,
      case when d is null then null else (current_date - d) end,
      case when d is null then 'never checked' when current_date - d > 180 then 'overdue' when current_date - d > 144 then 'due soon' else 'ok' end,
      'These rules decide what the platform tells people about each country''s legal requirements.'::text,
      'Review each country row against official sources, update the text and set its review date.'::text,
      '/admin/compliance-rules'::text;
  end if;

  -- AUTOMATIC: regional pricing
  if to_regclass('public.price_bands') is not null then
    execute 'select max(updated_at)::date from public.price_bands' into d;
    return query select 'regional-pricing'::text, 'Regional price bands'::text, 'automatic'::text, d, 180,
      case when d is null then null else (current_date - d) end,
      case when d is null then 'never checked' when current_date - d > 180 then 'overdue' when current_date - d > 144 then 'due soon' else 'ok' end,
      'Prices by region should follow exchange rates and your costs.'::text,
      'Review the bands and save, even if nothing changes, so the date moves.'::text,
      '/admin/geo-pricing'::text;
  end if;

  -- AUTOMATIC: UK sponsor register / verified employers
  if to_regclass('public.verified_employer_sources') is not null then
    execute 'select max(updated_at)::date from public.verified_employer_sources' into d;
    return query select 'verified-sponsors'::text, 'Verified sponsor employers (UK sponsor register import)'::text, 'automatic'::text, d, 60,
      case when d is null then null else (current_date - d) end,
      case when d is null then 'never loaded' when current_date - d > 60 then 'overdue' when current_date - d > 45 then 'due soon' else 'ok' end,
      'The licensed sponsor register changes constantly. Employers can lose their licence.'::text,
      'Download the latest register of licensed sponsors from gov.uk and import it at Admin > Employer Sources.'::text,
      '/admin/employer-sources'::text;
  end if;

  -- AUTOMATIC: job feeds are still arriving
  if to_regclass('public.external_jobs') is not null then
    execute 'select max(created_at)::date from public.external_jobs' into d;
    return query select 'job-feeds'::text, 'Job feeds: newest job collected'::text, 'automatic'::text, d, 4,
      case when d is null then null else (current_date - d) end,
      case when d is null then 'never loaded' when current_date - d > 4 then 'overdue' when current_date - d > 3 then 'due soon' else 'ok' end,
      'If no new jobs arrive, a feed has probably broken and the board goes stale.'::text,
      'Open External Jobs, use Test Feeds, and check the Vercel logs for the scheduled job.'::text,
      '/admin/external-jobs'::text;
  end if;

  -- MANUAL items
  return query
    select i.key, i.title, 'manual', i.last_checked_on, i.max_age_days,
           case when i.last_checked_on is null then null else (current_date - i.last_checked_on) end,
           case when i.last_checked_on is null then 'never checked'
                when current_date - i.last_checked_on > i.max_age_days then 'overdue'
                when current_date - i.last_checked_on > (i.max_age_days * 0.8) then 'due soon' else 'ok' end,
           i.why, i.how_to, i.fix_path
    from public.admin_review_items i order by i.sort_order;
end $$;

create or replace function public.admin_mark_reviewed(p_key text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public._is_register_admin() then raise exception 'Admins only'; end if;
  update public.admin_review_items set last_checked_on = current_date, last_checked_by = auth.uid() where key = p_key;
  if not found then raise exception 'Unknown item'; end if;
end $$;

revoke execute on function public.admin_freshness() from public, anon;
revoke execute on function public.admin_mark_reviewed(text) from public, anon;
grant execute on function public.admin_freshness() to authenticated;
grant execute on function public.admin_mark_reviewed(text) to authenticated;

-- Proof: the manual items now being tracked (the page itself shows the full list)
select key, title, max_age_days, last_checked_on from public.admin_review_items order by sort_order;

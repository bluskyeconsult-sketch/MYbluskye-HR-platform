-- 26: Add the UK register of licensed sponsors as a third official list (Admin > Employer Lists).
-- Safe to run more than once. Does not touch verified_employer_sources (Employer Sources).

insert into public.employer_registers (key, country_code, title, source_url, proves, caveat) values
 ('uk-licensed-sponsors', 'GB', 'United Kingdom: register of licensed sponsors (Home Office, gov.uk)',
  'https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers',
  'The employer held a Home Office sponsor licence for workers when the list was downloaded.',
  'A licence is not a job offer and does not mean the employer can sponsor your role. Licences are suspended or revoked, and the routes open to new sponsored workers change (the overseas care worker route closed to new applicants in July 2025). Check the live register and gov.uk before you accept any offer.')
on conflict (key) do nothing;

-- Tighten admin check: the old version also allowed any call with no logged-in user.
create or replace function public._is_register_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(auth.role(), '') = 'service_role'
      or exists (select 1 from public.profiles where id = auth.uid() and user_type in ('admin','super_admin'))
$$;

-- Faster re-match: only touches jobs whose answer actually changes (UK has many jobs).
create or replace function public.rematch_jobs_to_registers(p_country text default null) returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare n integer;
begin
  if not public._is_register_admin() then raise exception 'Admins only'; end if;
  with calc as (
    select j.id,
           (select reg.title from public.employer_register_entries e join public.employer_registers reg on reg.key = e.register_key
             where reg.is_active and reg.loaded_on is not null and reg.country_code = j.country_code
               and e.name_norm = public.normalize_employer_name(j.company) and e.name_norm <> '' limit 1) as t,
           (select reg.loaded_on from public.employer_register_entries e join public.employer_registers reg on reg.key = e.register_key
             where reg.is_active and reg.loaded_on is not null and reg.country_code = j.country_code
               and e.name_norm = public.normalize_employer_name(j.company) and e.name_norm <> '' limit 1) as d
    from public.jobs j
    where coalesce(j.company,'') <> '' and j.country_code is not null and (p_country is null or j.country_code = p_country)
  )
  update public.jobs j set register_match = c.t, register_checked_on = c.d
  from calc c where c.id = j.id and (j.register_match is distinct from c.t or j.register_checked_on is distinct from c.d);
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public._is_register_admin() from public, anon;
revoke execute on function public.rematch_jobs_to_registers(text) from public, anon;
grant execute on function public._is_register_admin() to authenticated, service_role;
grant execute on function public.rematch_jobs_to_registers(text) to authenticated, service_role;

select key, country_code, loaded_on, row_count from public.employer_registers order by key;

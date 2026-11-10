-- 25-create-lmia-explorer.sql   Safe to run more than once.
-- A PRIVATE data store for the Canada LMIA list, for the admin-only "LMIA Explorer" page.
-- Nobody but admins can read or change it. Visitors and ordinary members are blocked at the database itself,
-- so it stays private even if someone bypasses the website and talks to the database directly.
-- One row per employer + occupation per quarter, exactly as the government publishes it.

create table if not exists public.lmia_records (
  id bigint generated always as identity primary key,
  quarter text not null,
  province text,
  stream text,
  employer text not null,
  address text,
  occupation_code text,
  occupation_title text,
  care_role boolean not null default false,
  incorporation text,
  lmias_approved integer,
  positions_approved integer,
  loaded_at timestamptz not null default now()
);
create index if not exists idx_lmia_quarter on public.lmia_records (quarter);
create index if not exists idx_lmia_province on public.lmia_records (quarter, province);
create index if not exists idx_lmia_positions on public.lmia_records (quarter, positions_approved desc);
create index if not exists idx_lmia_employer_lower on public.lmia_records (lower(employer));

alter table public.lmia_records enable row level security;
revoke all on public.lmia_records from anon;
drop policy if exists "lmia_admin_only" on public.lmia_records;
create policy "lmia_admin_only" on public.lmia_records for all to authenticated
  using (public._is_register_admin()) with check (public._is_register_admin());

-- Loads one batch of rows (the page sends 2,000 at a time). The first batch can replace the whole quarter.
create or replace function public.admin_load_lmia_rows(p_quarter text, p_rows jsonb, p_replace boolean default false)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare n integer;
begin
  if not public._is_register_admin() then raise exception 'Admins only'; end if;
  if p_quarter is null or length(trim(p_quarter)) = 0 then raise exception 'A quarter label is required'; end if;
  if p_replace then delete from public.lmia_records where quarter = p_quarter; end if;
  insert into public.lmia_records (quarter, province, stream, employer, address, occupation_code, occupation_title, care_role, incorporation, lmias_approved, positions_approved)
  select p_quarter, nullif(r->>'province',''), nullif(r->>'stream',''), r->>'employer', nullif(r->>'address',''),
         nullif(r->>'occupation_code',''), nullif(r->>'occupation_title',''), coalesce((r->>'care_role')::boolean, false),
         nullif(r->>'incorporation',''), nullif(r->>'lmias_approved','')::integer, nullif(r->>'positions_approved','')::integer
  from jsonb_array_elements(p_rows) r
  where coalesce(trim(r->>'employer'),'') <> '';
  get diagnostics n = row_count;
  return n;
end $$;

-- Totals and breakdowns for one quarter (or all quarters when none is given). Admins only.
create or replace function public.admin_lmia_summary(p_quarter text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare out jsonb;
begin
  if not public._is_register_admin() then raise exception 'Admins only'; end if;
  select jsonb_build_object(
    'quarters', (select coalesce(jsonb_agg(q order by q desc), '[]'::jsonb) from (select distinct quarter q from public.lmia_records) s),
    'totals', (select jsonb_build_object('rows', count(*), 'employers', count(distinct lower(employer)), 'positions', coalesce(sum(positions_approved),0), 'lmias', coalesce(sum(lmias_approved),0), 'care_positions', coalesce(sum(positions_approved) filter (where care_role),0))
               from public.lmia_records where p_quarter is null or quarter = p_quarter),
    'by_province', (select coalesce(jsonb_agg(x order by (x->>'positions')::int desc), '[]'::jsonb) from (
        select jsonb_build_object('name', coalesce(province,'Unknown'), 'positions', coalesce(sum(positions_approved),0), 'employers', count(distinct lower(employer))) x
        from public.lmia_records where p_quarter is null or quarter = p_quarter group by province) s),
    'by_stream', (select coalesce(jsonb_agg(x order by (x->>'positions')::int desc), '[]'::jsonb) from (
        select jsonb_build_object('name', coalesce(stream,'Unknown'), 'positions', coalesce(sum(positions_approved),0), 'employers', count(distinct lower(employer))) x
        from public.lmia_records where p_quarter is null or quarter = p_quarter group by stream) s),
    'top_occupations', (select coalesce(jsonb_agg(x order by (x->>'positions')::int desc), '[]'::jsonb) from (
        select jsonb_build_object('code', occupation_code, 'name', max(occupation_title), 'positions', coalesce(sum(positions_approved),0), 'employers', count(distinct lower(employer))) x
        from public.lmia_records where p_quarter is null or quarter = p_quarter group by occupation_code order by sum(positions_approved) desc nulls last limit 15) s),
    'top_employers', (select coalesce(jsonb_agg(x order by (x->>'positions')::int desc), '[]'::jsonb) from (
        select jsonb_build_object('name', min(employer), 'positions', coalesce(sum(positions_approved),0), 'provinces', count(distinct province)) x
        from public.lmia_records where p_quarter is null or quarter = p_quarter group by lower(employer) order by sum(positions_approved) desc nulls last limit 15) s)
  ) into out;
  return out;
end $$;

revoke execute on function public.admin_load_lmia_rows(text, jsonb, boolean) from public, anon;
revoke execute on function public.admin_lmia_summary(text) from public, anon;
grant execute on function public.admin_load_lmia_rows(text, jsonb, boolean) to authenticated;
grant execute on function public.admin_lmia_summary(text) to authenticated;

-- Proof: the table exists, is empty until you load a file, and visitors cannot read it (both should say false)
select (select count(*) from public.lmia_records) as rows_loaded,
       has_table_privilege('anon', 'public.lmia_records', 'select') as visitors_can_read,
       has_function_privilege('anon', 'public.admin_lmia_summary(text)', 'execute') as visitors_can_run_summary;

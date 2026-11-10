-- 27: Let Employer Sources record a sector and a town, so you can work one sector in one town at a time.
-- Safe to run more than once. Run BEFORE uploading the new index.js and EmployerSourcesManager.jsx.
alter table public.verified_employer_sources add column if not exists sector text;
alter table public.verified_employer_sources add column if not exists town text;
create index if not exists idx_ves_sector_town on public.verified_employer_sources (sector, town);

-- Stops the same employer being added twice in the same town if you import a file again.
-- If your table already holds repeats, the index is skipped and you get a notice instead of an error.
do $$
begin
  create unique index if not exists uq_ves_name_town_nosite
    on public.verified_employer_sources (lower(company_name), coalesce(town, ''))
    where website_url is null;
exception when others then
  raise notice 'Duplicate-guard index skipped (existing repeats): %', sqlerrm;
end $$;

-- Keep the new columns out of members' reach, as with the other outreach columns.
do $$
declare cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'verified_employer_sources'
    and column_name not in ('invitation_status','invited_at','linked_user_id','added_by','last_scraped_at','last_scrape_status','contact_email','sector','town');
  execute 'revoke select on public.verified_employer_sources from anon, authenticated';
  execute format('grant select (%s) on public.verified_employer_sources to authenticated', cols);
end $$;

select sector, town, count(*) from public.verified_employer_sources group by 1,2 order by 3 desc limit 10;

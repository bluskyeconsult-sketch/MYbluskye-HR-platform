-- 28: Website finder for Employer Sources (suggest, then you approve). Run after 27. Safe to run twice.
alter table public.verified_employer_sources add column if not exists website_candidate text;
alter table public.verified_employer_sources add column if not exists website_confidence text;
alter table public.verified_employer_sources add column if not exists website_status text;      -- suggested | approved | rejected | none
alter table public.verified_employer_sources add column if not exists website_checked_at timestamptz;

-- Counts searches per month so the free allowance (2,000) is never exceeded. Server-only table.
create table if not exists public.search_usage (month text primary key, used integer not null default 0);
alter table public.search_usage enable row level security;
revoke all on public.search_usage from anon, authenticated;

-- Keep the new columns away from members, like the other outreach columns.
do $$
declare cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'verified_employer_sources'
    and column_name not in ('invitation_status','invited_at','linked_user_id','added_by','last_scraped_at','last_scrape_status','contact_email','sector','town','website_candidate','website_confidence','website_status','website_checked_at');
  execute 'revoke select on public.verified_employer_sources from anon, authenticated';
  execute format('grant select (%s) on public.verified_employer_sources to authenticated', cols);
end $$;
select count(*) as sources from public.verified_employer_sources;

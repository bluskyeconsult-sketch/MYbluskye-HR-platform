-- 22-hide-outreach-columns-from-members.sql   Safe to run more than once.
-- Signed-in members and visitors can still read the sponsor list (company, website, licence type, country).
-- They can no longer read your outreach columns: invitation_status, invited_at, linked_user_id, added_by,
-- last_scraped_at, last_scrape_status, contact_email, sector, town and the website-finder columns (those that exist).
-- Your server is unaffected (it uses the service key).
-- AFTER RUNNING: open your admin screens that list verified employers and the sponsor invitations page.
-- If one shows "permission denied for table verified_employer_sources", that screen reads the table directly from
-- the browser. Run the UNDO line below and send me that page file; I will move it to the server and re-apply this.
-- UNDO:  grant select on public.verified_employer_sources to authenticated;

do $$
declare cols text;
begin
  if to_regclass('public.verified_employer_sources') is null then return; end if;
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'verified_employer_sources'
    and column_name not in ('invitation_status','invited_at','linked_user_id','added_by',
                            'last_scraped_at','last_scrape_status','contact_email',
                            'sector','town','website_candidate','website_confidence','website_status','website_checked_at');
  execute 'revoke select on public.verified_employer_sources from anon, authenticated';
  execute 'grant select (' || cols || ') on public.verified_employer_sources to anon, authenticated';
end $$;

-- Proof: the first rows should say false, the last should say true
select c.column_name,
       has_column_privilege('authenticated', 'public.verified_employer_sources', c.column_name, 'select') as members_can_read
from information_schema.columns c
where c.table_schema = 'public' and c.table_name = 'verified_employer_sources'
  and c.column_name in ('invitation_status','invited_at','linked_user_id','company_name','website_url','is_active','is_verified_sponsor')
order by 2, 1;

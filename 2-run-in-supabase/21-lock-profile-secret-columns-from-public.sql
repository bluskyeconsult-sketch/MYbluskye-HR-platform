-- 21-lock-profile-secret-columns-from-public.sql   Safe to run more than once.
-- Why: the proof test showed the public (anon) key still holds permission on profiles.two_factor_secret and
-- profiles.verification_token. No profile rows are visible to visitors and no row holds a value (your check showed 0),
-- so nothing has leaked. This closes the permission anyway so a future mistake cannot expose them.
-- Effect: visitors who are not signed in can no longer read those two columns. Signed-in users and your server are unaffected.
-- To undo: grant select (two_factor_secret, verification_token) on public.profiles to anon;

do $$
declare cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles'
    and column_name not in ('two_factor_secret','two_factor_backup_codes','verification_token');
  if cols is null then return; end if;
  execute 'revoke select on public.profiles from anon';
  execute 'grant select (' || cols || ') on public.profiles to anon';
end $$;

-- Proof: both rows below should say false
select c.column_name,
       has_column_privilege('anon', 'public.profiles', c.column_name, 'select') as anon_can_read
from information_schema.columns c
where c.table_schema = 'public' and c.table_name = 'profiles'
  and c.column_name in ('two_factor_secret','verification_token');

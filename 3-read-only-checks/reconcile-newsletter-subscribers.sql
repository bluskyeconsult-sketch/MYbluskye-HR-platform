-- reconcile-newsletter-subscribers.sql   READ ONLY. Changes nothing.
-- Paste into Supabase > SQL Editor > Run. The answer appears as a red message; that is normal for these checks.
-- Compares newsletter subscribers with registered members and the do-not-email list.
do $$
declare
  r text := '';
  n bigint; a bigint; u bigint; d bigint; reg bigint; noacct bigint; sup bigint; pf bigint; au bigint; tst bigint; junk bigint;
  rec record;
begin
  select count(*) into n from public.newsletter_subscribers;
  r := r || 'SUBSCRIBER ROWS: ' || n || E'\n';
  for rec in select coalesce(status,'(blank)') s, count(*) c from public.newsletter_subscribers group by 1 order by 2 desc loop
    r := r || '  status ' || rec.s || ': ' || rec.c || E'\n';
  end loop;
  select count(distinct lower(trim(email))) into d from public.newsletter_subscribers where status = 'active';
  select count(*) into a from public.newsletter_subscribers where status = 'active';
  r := r || 'ACTIVE rows: ' || a || ', distinct addresses: ' || d || E'\n';

  select count(*) into pf from public.profiles;
  select count(*) into au from auth.users;
  r := r || 'REGISTERED: profiles ' || pf || ', sign-in accounts ' || au || E'\n';
  begin
    execute 'select count(*) from public.profiles where is_tester is true' into tst;
    r := r || '  of which testers: ' || tst || E'\n';
  exception when others then null; end;

  select count(distinct lower(trim(s.email))) into reg from public.newsletter_subscribers s
    where s.status = 'active' and exists (select 1 from public.profiles p where lower(trim(p.email)) = lower(trim(s.email)));
  select count(distinct lower(trim(s.email))) into u from public.newsletter_subscribers s
    where s.status = 'active' and exists (select 1 from auth.users x where lower(trim(x.email)) = lower(trim(s.email)))
      and not exists (select 1 from public.profiles p where lower(trim(p.email)) = lower(trim(s.email)));
  select count(distinct lower(trim(s.email))) into noacct from public.newsletter_subscribers s
    where s.status = 'active' and not exists (select 1 from auth.users x where lower(trim(x.email)) = lower(trim(s.email)))
      and not exists (select 1 from public.profiles p where lower(trim(p.email)) = lower(trim(s.email)));
  r := r || 'ACTIVE SUBSCRIBERS WHO ARE: registered members ' || reg || ' | account but no profile ' || u || ' | NOT registered (signed up on the form only) ' || noacct || E'\n';

  begin
    execute 'select count(distinct lower(trim(s.email))) from public.newsletter_subscribers s where s.status = ''active'' and exists (select 1 from public.email_suppression e where lower(e.email) = lower(trim(s.email)))' into sup;
    r := r || 'ACTIVE but on the do-not-email list: ' || sup || E'\n';
  exception when others then r := r || 'do-not-email list: not readable here' || E'\n'; end;

  select count(*) into junk from public.newsletter_subscribers
    where status = 'active' and (email ~* '(test|example|dummy|fake|temp|mailinator|yopmail|guerrilla|10minute)' or email !~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$');
  r := r || 'ACTIVE with test-looking or malformed addresses: ' || junk || E'\n';

  r := r || E'SIGN-UPS BY MONTH (active):\n';
  for rec in select to_char(date_trunc('month', subscribed_at),'YYYY-MM') m, count(*) c from public.newsletter_subscribers where status='active' group by 1 order by 1 desc limit 8 loop
    r := r || '  ' || coalesce(rec.m,'(no date)') || ': ' || rec.c || E'\n';
  end loop;
  r := r || E'TOP EMAIL DOMAINS (active):\n';
  for rec in select lower(split_part(email,'@',2)) dm, count(*) c from public.newsletter_subscribers where status='active' group by 1 order by 2 desc limit 8 loop
    r := r || '  ' || rec.dm || ': ' || rec.c || E'\n';
  end loop;
  raise exception E'NEWSLETTER RECONCILIATION\n%', r;
end $$;

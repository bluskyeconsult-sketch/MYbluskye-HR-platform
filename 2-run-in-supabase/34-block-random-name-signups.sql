-- 34-block-random-name-signups.sql
-- Follow-up to file 33 (6 Nov 2026). Safe to run again.
-- The sign-up bots changed their pattern: new "pending" rows with a random 10-character name such as bu6w8q942G or
-- Vm0owUyd7d. No real person's name is a single word of letters mixed with digits (or with several capitals inside it).
-- This sets any unconfirmed, account-less subscriber with such a name to 'blocked' and adds the address to the do-not-email
-- list. Nothing is deleted, members and confirmed subscribers are never touched, and the keep list below is protected.
-- Reverse one address: delete it from public.email_suppression (source 'bot_cleanup') and set its status back to 'pending'.

do $$
declare
  keep text[] := array['philipjonah4@gmail.com', 'murtalamary8@gmail.com', 'shuaibuabdullahiyakubu566@gmail.com'];
  n int := 0;
begin
  perform public.link_subscribers_to_members();

  create temp table _random_names on commit drop as
  select s.email
    from public.newsletter_subscribers s
   where s.status in ('pending', 'active')
     and s.user_id is null
     and s.confirmed_at is null
     and lower(s.email) <> all (keep)
     and s.name ~ '^[A-Za-z0-9]{8,16}$'
     and ( (s.name ~ '[0-9]' and s.name ~ '[A-Za-z]')
        or length(regexp_replace(substr(s.name, 2), '[^A-Z]', '', 'g')) >= 2 )
     and not exists (select 1 from public.profiles p where lower(p.email) = lower(s.email));

  insert into public.email_suppression (email, reason, source)
  select lower(email), 'blocked_random_name_signup_2026-11-06', 'bot_cleanup' from _random_names
  on conflict (email) do nothing;

  update public.newsletter_subscribers s set status = 'blocked' where s.email in (select email from _random_names);
  get diagnostics n = row_count;
  raise notice 'Blocked % more suspected automated sign-ups.', n;
end $$;

select status, count(*) as people from public.newsletter_subscribers group by status order by status;

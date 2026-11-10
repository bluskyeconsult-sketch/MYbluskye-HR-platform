-- 33-clean-suspected-bot-subscribers.sql
-- ONE-OFF CLEAN-UP of the newsletter list (4 Nov 2026). Safe to run again.
--
-- WHY: on 4 Nov the list was reviewed address by address. Apart from 3 genuine people, the sign-ups were automated or
-- scraped addresses: random-looking names, Gmail addresses with many dots, phone text-message addresses, and unrelated
-- business addresses from other countries. None of the old active rows were ever confirmed by their owner.
--
-- WHAT IT DOES: every address signed up BEFORE 5 Nov 2026 that has not confirmed, has no member account, and is not on
-- the keep list below is set to 'blocked' and added to the do-not-email list. Nothing is deleted, so it is fully
-- reversible and the address cannot be used to flood anyone. Members, confirmed subscribers and the keep list are untouched.
-- Anyone who signed up on or after 5 Nov is never touched by this file, so re-running it later is harmless.
--
-- BEFORE YOU RUN: if you recognise any other address on the Subscribers page as a real person, add it to the keep list.

do $$
declare
  keep text[] := array[
    'philipjonah4@gmail.com',
    'murtalamary8@gmail.com',
    'shuaibuabdullahiyakubu566@gmail.com'
  ];
  cutoff timestamptz := timestamptz '2026-11-05 00:00:00+00';
  n_block int := 0;
  n_keep  int := 0;
begin
  -- make sure anyone who already has an account is linked, so they are protected below
  perform public.link_subscribers_to_members();

  create temp table _bot_rows on commit drop as
  select s.email
    from public.newsletter_subscribers s
   where s.status in ('active', 'pending')
     and s.user_id is null
     and s.confirmed_at is null
     and s.subscribed_at < cutoff
     and lower(s.email) <> all (keep)
     and not exists (select 1 from public.profiles p where lower(p.email) = lower(s.email));

  insert into public.email_suppression (email, reason, source)
  select lower(email), 'blocked_bot_suspected_2026-11-04', 'bot_cleanup' from _bot_rows
  on conflict (email) do nothing;

  update public.newsletter_subscribers s
     set status = 'blocked'
   where s.email in (select email from _bot_rows);
  get diagnostics n_block = row_count;

  select count(*) into n_keep from public.newsletter_subscribers
   where status = 'active' and (user_id is not null or confirmed_at is not null or lower(email) = any (keep));

  raise notice 'Blocked % suspected automated addresses. Kept % genuine active subscribers.', n_block, n_keep;
end $$;

-- The picture afterwards (this is the table you will see):
select status, count(*) as people from public.newsletter_subscribers group by status order by status;

-- To reverse one address (only if a real person was caught by mistake):
--   delete from public.email_suppression where email = 'person@example.com' and source = 'bot_cleanup';
--   update public.newsletter_subscribers set status = 'active' where email = 'person@example.com';

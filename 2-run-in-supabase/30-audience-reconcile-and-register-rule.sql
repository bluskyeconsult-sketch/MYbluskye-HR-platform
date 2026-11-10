-- 30: One reconciled audience picture, and linking newsletter subscribers to member accounts.
-- Safe to run more than once. Run after 29 and BEFORE uploading the new index.js.
-- Nobody is removed or paused for not registering. Registering is only recommended.
alter table public.newsletter_subscribers add column if not exists user_id uuid;
alter table public.newsletter_subscribers add column if not exists nudged_at timestamptz;
alter table public.newsletter_subscribers add column if not exists nudge_count integer not null default 0;
create index if not exists idx_ns_email_lower on public.newsletter_subscribers (lower(email));

-- Links subscribers to member accounts by email.
create or replace function public.link_subscribers_to_members() returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare n integer;
begin
  update public.newsletter_subscribers s set user_id = p.id
  from public.profiles p
  where s.user_id is null and p.email is not null and lower(trim(s.email)) = lower(trim(p.email));
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.link_subscribers_to_members() from public, anon, authenticated;
grant execute on function public.link_subscribers_to_members() to service_role;

-- Runs whenever a member account is created or its email changes.
create or replace function public.trg_link_subscriber_on_profile() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.email is not null then
    update public.newsletter_subscribers set user_id = new.id
     where lower(trim(email)) = lower(trim(new.email)) and user_id is distinct from new.id;
  end if;
  return new;
end $$;
revoke execute on function public.trg_link_subscriber_on_profile() from public, anon, authenticated;
drop trigger if exists trg_profiles_link_subscriber on public.profiles;
create trigger trg_profiles_link_subscriber after insert or update of email on public.profiles
  for each row execute function public.trg_link_subscriber_on_profile();

-- Link everyone who already matches.
select public.link_subscribers_to_members();

-- The reconciliation numbers shown on Admin > Newsletter (admins only).
create or replace function public.admin_audience_summary() returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare r jsonb;
begin
  if not public._is_register_admin() then raise exception 'Admins only'; end if;
  select jsonb_build_object(
    'members',                (select count(*) from public.profiles),
    'testers',                (select count(*) from public.profiles where is_tester is true),
    'subscribers_total',      (select count(*) from public.newsletter_subscribers),
    'active',                 (select count(*) from public.newsletter_subscribers where status = 'active'),
    'active_members',         (select count(*) from public.newsletter_subscribers where status = 'active' and user_id is not null),
    'active_unregistered',    (select count(*) from public.newsletter_subscribers where status = 'active' and user_id is null),
    'not_yet_invited',        (select count(*) from public.newsletter_subscribers where status = 'active' and user_id is null and nudged_at is null),
    'invited',                (select count(*) from public.newsletter_subscribers where status = 'active' and user_id is null and nudged_at is not null),
    'pending',                (select count(*) from public.newsletter_subscribers where status = 'pending'),
    'unsubscribed',           (select count(*) from public.newsletter_subscribers where status = 'unsubscribed'),
    'blocked',                (select count(*) from public.newsletter_subscribers where status = 'blocked'),
    'members_not_subscribed', (select count(*) from public.profiles p where not exists (select 1 from public.newsletter_subscribers s where s.user_id = p.id))
  ) into r;
  return r;
end $$;
revoke execute on function public.admin_audience_summary() from public, anon;
grant execute on function public.admin_audience_summary() to authenticated, service_role;

select count(*) filter (where user_id is not null) as linked_to_a_member, count(*) filter (where user_id is null) as not_registered from public.newsletter_subscribers;

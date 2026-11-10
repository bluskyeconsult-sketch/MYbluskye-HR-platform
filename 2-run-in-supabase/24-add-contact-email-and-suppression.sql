-- 24-add-contact-email-and-suppression.sql   Safe to run more than once.
-- Why: the employer invitation tools in the admin area save and read a contact email on each sponsor company, and keep a
-- do-not-contact list. Your database has neither (no contact_email column on verified_employer_sources, and the
-- do-not-contact table may be missing), so finding, saving and sending invitations cannot work yet.
-- Contact emails stay hidden from visitors and members (no public permission is given on the new column).

alter table public.verified_employer_sources add column if not exists contact_email text;

create table if not exists public.contact_suppression (
  email text primary key,
  reason text,
  added_by uuid,
  created_at timestamptz not null default now()
);
alter table public.contact_suppression enable row level security;
revoke all on public.contact_suppression from anon, authenticated;
drop policy if exists "suppression_admin_only" on public.contact_suppression;
create policy "suppression_admin_only" on public.contact_suppression for all to authenticated
  using (public._is_register_admin()) with check (public._is_register_admin());
grant select, insert, update, delete on public.contact_suppression to authenticated;

-- Proof: contact_email exists, and visitors and members cannot read it (both should say false)
select 'contact_email column exists' as check_name,
       exists (select 1 from information_schema.columns where table_schema='public' and table_name='verified_employer_sources' and column_name='contact_email') as result
union all
select 'visitors can read contact_email', has_column_privilege('anon','public.verified_employer_sources','contact_email','select')
union all
select 'signed-in members can read contact_email', has_column_privilege('authenticated','public.verified_employer_sources','contact_email','select');

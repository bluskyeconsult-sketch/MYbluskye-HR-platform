-- 29: Newsletter double opt-in support. Safe to run more than once. Run BEFORE uploading the new index.js.
alter table public.newsletter_subscribers add column if not exists confirmed_at timestamptz;
alter table public.newsletter_subscribers add column if not exists source text;

-- Allow the new "pending" status if an older rule limits the allowed values.
do $$
declare c record;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.newsletter_subscribers'::regclass and contype = 'c'
             and pg_get_constraintdef(oid) ilike '%status%' loop
    execute format('alter table public.newsletter_subscribers drop constraint %I', c.conname);
  end loop;
end $$;

-- People who signed up before confirmation existed are kept as active but marked unconfirmed (no confirmed_at date).
select status, count(*) as people, count(confirmed_at) as confirmed from public.newsletter_subscribers group by 1 order by 2 desc;

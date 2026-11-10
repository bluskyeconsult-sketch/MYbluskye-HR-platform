-- check-register-matches.sql  READ-ONLY. Changes nothing. Choose "Run without RLS" if offered.
-- Shows how many live Canada and New Zealand jobs matched each official list, which companies did not match,
-- and proves the matching works by looking up a company that is on the New Zealand list.
-- The red error message is the answer.
do $$
declare out text := ''; r record; t text;
begin
  for r in select country_code c, count(*) total, count(*) filter (where register_match is not null) matched
           from public.jobs where country_code in ('CA','NZ') and coalesce(is_active,true) group by 1 order by 1 loop
    out := out || E'\n' || r.c || ': ' || r.total || ' live jobs, ' || r.matched || ' matched the list';
  end loop;
  out := out || E'\n\nNZ jobs (company -> matched?):';
  for r in select company, register_match from public.jobs where country_code = 'NZ' order by company limit 12 loop
    out := out || E'\n  ' || left(coalesce(r.company,'(no company)'),50) || ' -> ' || coalesce(r.register_match::text,'no');
  end loop;
  out := out || E'\n\nCanada sample of unmatched jobs:';
  for r in select company from public.jobs where country_code = 'CA' and register_match is null group by company order by count(*) desc limit 8 loop
    out := out || E'\n  ' || left(coalesce(r.company,'(no company)'),50);
  end loop;
  select string_agg(employer_name, ' | ') into t from (select employer_name from public.employer_register_entries where register_key = 'nz-accredited' limit 3) s;
  out := out || E'\n\nSample entries on the NZ list: ' || coalesce(t,'none');
  out := out || E'\nTest lookup of the first one: ' || coalesce((select public.check_employer_register(split_part(t,' | ',1),'NZ')::text),'no result');
  raise exception E'REGISTER MATCH CHECK%', out;
end $$;

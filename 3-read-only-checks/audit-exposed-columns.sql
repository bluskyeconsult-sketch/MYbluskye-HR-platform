-- audit-exposed-columns.sql  (2026-11-01)  READ-ONLY. Changes nothing.
-- Question: for the tables that visitors or members can read, WHAT is in the columns they can see?
-- Shows, per table, each column with how many visible rows actually have something filled in and the average length.
-- Long text in columns like content, body, answer, correct, weight, email or phone is what we are looking for.
-- Runs as one block; the red error message is the answer. Choose "Run without RLS" if offered.

do $$
declare
  t text; r text; c record; n bigint; f bigint; avgl numeric; line text; out text := '';
  tabs text[] := array['courses','course_lessons','books','assessments','assessment_questions',
                       'workforce_profiles','virtual_assistants','verified_employer_sources'];
begin
  foreach t in array tabs loop
    if to_regclass('public.'||quote_ident(t)) is null then continue; end if;
    -- anon for public tables, authenticated for the member-visible ones
    r := case when t in ('assessments','assessment_questions','verified_employer_sources') then 'authenticated' else 'anon' end;
    execute 'set local role ' || r;
    begin
      execute format('select count(*) from public.%I', t) into n;
    exception when others then n := -1;
    end;
    line := E'\n' || t || ' (seen as ' || r || ', ' || n || ' rows): ';
    for c in select column_name, data_type from information_schema.columns
             where table_schema='public' and table_name=t order by ordinal_position loop
      begin
        if c.data_type in ('text','character varying','jsonb','json') then
          execute format('select count(*) filter (where %1$I is not null and length(%1$I::text) > 0), coalesce(round(avg(length(%1$I::text))),0) from public.%2$I', c.column_name, t) into f, avgl;
          line := line || c.column_name || '[' || f || ' filled, avg ' || avgl || ' chars], ';
        else
          line := line || c.column_name || ', ';
        end if;
      exception when others then
        line := line || c.column_name || '[blocked], ';
      end;
    end loop;
    reset role;
    out := out || line;
  end loop;
  reset role;
  raise exception E'EXPOSED COLUMNS%', out;
end $$;

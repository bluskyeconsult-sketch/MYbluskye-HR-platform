-- audit-books-file-links.sql  (2026-11-01)  READ-ONLY. Changes nothing.
-- Question: can a visitor download the FULL book files (file_url, epub_file_url) without buying, by going straight to storage?
-- A book's file is exposed only if its file sits in a PUBLIC storage bucket. Previews and covers are meant to be public.
-- Runs as one block; the red error message is the answer. Choose "Run without RLS" if offered.
-- Reading it: "FULL FILE IN PUBLIC BUCKET" for any book = fix needed. "private bucket" = safe.

do $$
declare b record; out text := ''; p text; e text; v text; bk text;
begin
  for b in select id, title, file_url, epub_file_url, preview_file_url from public.books order by title loop
    select coalesce(string_agg(o.bucket_id || case when bu.public then ' (PUBLIC)' else ' (private)' end, ', '), 'not found in storage')
      into p from storage.objects o join storage.buckets bu on bu.id = o.bucket_id
      where o.name = b.file_url or ('/'||o.name) = b.file_url or b.file_url like '%'||o.name;
    select coalesce(string_agg(o.bucket_id || case when bu.public then ' (PUBLIC)' else ' (private)' end, ', '), 'not found in storage')
      into e from storage.objects o join storage.buckets bu on bu.id = o.bucket_id
      where o.name = b.epub_file_url or ('/'||o.name) = b.epub_file_url or b.epub_file_url like '%'||o.name;
    select coalesce(string_agg(o.bucket_id || case when bu.public then ' (PUBLIC)' else ' (private)' end, ', '), 'not found in storage')
      into v from storage.objects o join storage.buckets bu on bu.id = o.bucket_id
      where o.name = b.preview_file_url or ('/'||o.name) = b.preview_file_url or b.preview_file_url like '%'||o.name;
    out := out || E'\n' || left(b.title, 40) || ' | full file: ' || p || ' | epub: ' || e || ' | preview: ' || v
           || case when p like '%PUBLIC%' or e like '%PUBLIC%' then '  <-- FULL FILE IN PUBLIC BUCKET' else '' end;
  end loop;
  out := out || E'\n\nBUCKETS:';
  for b in select bu.id, bu.public, (select count(*) from storage.objects o where o.bucket_id = bu.id) n from storage.buckets bu order by 1 loop
    out := out || E'\n' || b.id || ': ' || case when b.public then 'PUBLIC' else 'private' end || ', ' || b.n || ' files';
  end loop;
  raise exception E'BOOK FILE CHECK%', out;
end $$;

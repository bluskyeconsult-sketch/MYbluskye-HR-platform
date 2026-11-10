-- 35-list-article-slugs-for-redirects.sql  (read-only: changes nothing)
-- Lists every published article so old blog addresses can be pointed at the right new article instead of the general blog page.
select slug, title, created_at::date as published from public.articles where is_published order by created_at;

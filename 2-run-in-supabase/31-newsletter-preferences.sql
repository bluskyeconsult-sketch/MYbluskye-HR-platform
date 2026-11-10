-- 31: Keep the topic choices people tick on the newsletter form (they were collected but never saved). Safe to run more than once.
alter table public.newsletter_subscribers add column if not exists preferences jsonb;
select count(*) as subscribers, count(preferences) as with_saved_topics from public.newsletter_subscribers;

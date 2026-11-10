-- 36: let every security event be recorded.
-- The Vercel logs show "Security event logging failed ... violates check constraint security_events_event_type_check".
-- An old rule on the security_events table only allows a short list of event names, so newer events were rejected and
-- never saved. The login lockouts count these saved events, so they need to be recorded. Safe to run more than once.
alter table public.security_events drop constraint if exists security_events_event_type_check;

-- Check: this should return no rows after the change.
select conname from pg_constraint
where conrelid = 'public.security_events'::regclass and conname = 'security_events_event_type_check';

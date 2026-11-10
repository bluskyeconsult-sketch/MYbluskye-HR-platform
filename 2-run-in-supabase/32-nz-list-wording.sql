-- 32: Honest wording for the New Zealand list: it is a snapshot, not the live register. Safe to run more than once.
update public.employer_registers
   set caveat = 'This is a snapshot taken from an official release on the date shown, not the live register. Accreditation can expire or be revoked, so an employer shown may no longer be accredited, and new employers may be missing. Check the live search on the Immigration New Zealand website before you accept any offer.'
 where key = 'nz-accredited';
select key, loaded_on, left(caveat, 60) as caveat from public.employer_registers where key = 'nz-accredited';

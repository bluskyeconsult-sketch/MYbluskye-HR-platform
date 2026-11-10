-- ALL-SQL-01-to-34-COMPLETE-SAFE-TO-RERUN.sql
-- The complete set: every database file from 01 to 34 except 19, in the right order.
-- Paste the whole file into Supabase > SQL Editor > New query and click Run ("Run without RLS" if asked).
-- Safe to run again at any time. File 19 is deliberately left out (see 19-lock-job-insert-to-server.sql).
-- If a red error appears, copy it to your helper before running anything else.

-- ============================ 01-create-compliance-engine ============================
-- ============================================================================
-- COMPLIANCE ENGINE (country rules, clearances, decision log)           2026-10-23
-- Run once in the Supabase SQL Editor. Safe to run again (it never wipes your edits
-- to rules that already exist: seed rows are only inserted when missing).
--
-- How it works
--   * country_service_rules   what each country needs, per service. Edited in Admin > Compliance Rules.
--   * compliance_clearances   an organisation's (or member's) request to use a service in a country
--                             that needs conditions ticked or an admin clearance.
--   * compliance_log          one line per refusal or clearance decision. Stores the COUNTRY only, never an IP address.
--   * org acknowledgements    are stored in the appraisals SQL (org_acknowledgements).
--
-- Statuses
--   open                available, nothing extra needed
--   conditional         available once the organisation ticks the checklist (recorded, with version and time)
--   clearance_required  NOT available until an admin approves the evidence the organisation supplies
--   blocked             not available (sanctions or other legal bar). Users are told to contact privacy@bluskyeconsult.com
--
-- IMPORTANT: this is a working compliance register, not legal advice. Every seeded row carries a
-- "last_reviewed" date and a "verify" note. Have a solicitor confirm the Germany and France rows
-- (works council rules) and the sanctions list before you sell in those places.
-- ============================================================================

create table if not exists public.country_service_rules (
  id uuid primary key default gen_random_uuid(),
  country_code text not null,                 -- ISO 3166-1 alpha-2, or '*' for "any country not listed"
  service_key text not null,                  -- appraisal | appraisal_ai | paid_services | ai_services | workforce | ...
  status text not null check (status in ('open','conditional','clearance_required','blocked')),
  title text not null,
  requirement_text text,                      -- plain-English explanation shown to the user
  checklist jsonb not null default '[]'::jsonb,   -- [{key, text, evidence_required?}]
  reference_links jsonb not null default '[]'::jsonb, -- [{label, url}]
  retention_years_default integer,            -- starting point for record retention (organisation may change within bounds)
  retention_years_min integer default 1,
  retention_years_max integer default 10,
  rule_version integer not null default 1,    -- bump when wording changes: organisations are asked to confirm again
  last_reviewed date,
  verify_note text,
  is_active boolean not null default true,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (country_code, service_key)
);
alter table public.country_service_rules enable row level security;

create table if not exists public.compliance_clearances (
  id uuid primary key default gen_random_uuid(),
  org_id uuid,                                -- null for a personal (member-level) request
  user_id uuid,                               -- who asked
  country_code text not null,
  service_key text not null,
  rule_version integer not null default 1,
  checklist_ticked jsonb not null default '[]'::jsonb,   -- keys the requester ticked
  evidence_note text,
  evidence_url text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','revoked')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  decision_note text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_clearances_lookup on public.compliance_clearances(org_id, country_code, service_key, status);
create index if not exists idx_clearances_status on public.compliance_clearances(status, created_at desc);
alter table public.compliance_clearances enable row level security;

create table if not exists public.compliance_log (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  user_id uuid,
  org_id uuid,
  service_key text not null,
  country_code text,                          -- the country the decision was based on
  ip_country text,                            -- what the network said (country only)
  decision text not null,                     -- allowed | conditions_needed | clearance_needed | pending_review | blocked | cleared | acknowledged
  reason text
);
create index if not exists idx_compliance_log_time on public.compliance_log(created_at desc);
alter table public.compliance_log enable row level security;

-- No policies on purpose: browsers can never read or write these tables.
-- Only the server (service role) touches them, after checking who is asking.

-- ---------------------------------------------------------------------------
-- SEED RULES (inserted only if the country + service pair does not exist yet)
-- ---------------------------------------------------------------------------
do $$
declare
  core jsonb := jsonb_build_array(
    jsonb_build_object('key','informed','text','Our staff have been told, in a privacy notice, that their appraisals are recorded on this platform, why, and for how long.'),
    jsonb_build_object('key','dpa','text','We accept the ODUSBABA data processing terms: we are the controller of our staff''s appraisal data and ODUSBABA acts as our processor.'),
    jsonb_build_object('key','human','text','Every rating and decision is made by a person. We will not use this platform for automated scoring or automated decisions about staff.')
  );
begin
  -- ===== APPRAISAL =====
  insert into public.country_service_rules (country_code, service_key, status, title, requirement_text, checklist, reference_links, retention_years_default, last_reviewed, verify_note)
  values
  ('GB','appraisal','conditional','United Kingdom: appraisal workflow',
   'Available. Appraisal records are personal data under UK GDPR and the Data Protection Act 2018. The employer decides why and how long to keep them; this platform processes them for the employer.',
   core || jsonb_build_array(
     jsonb_build_object('key','basis','text','We have recorded our lawful basis for processing staff appraisal data (usually the employment contract or legitimate interests).'),
     jsonb_build_object('key','fee','text','We have paid the ICO data protection fee, or we are exempt from it.')),
   '[{"label":"ICO: employment records guidance","url":"https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/employment/employment-practices-and-data-protection-keeping-employment-records/"}]'::jsonb,
   6, current_date, 'No fixed statutory period for appraisal records: the ICO says keep only as long as necessary. 6 years is a common starting point because of limitation periods. Confirm with an employment solicitor.'),
  ('IE','appraisal','conditional','Ireland: appraisal workflow',
   'Available. Irish and EU GDPR rules apply to appraisal records.',
   core || jsonb_build_array(jsonb_build_object('key','basis','text','We have recorded our lawful basis for processing staff appraisal data.')),
   '[{"label":"Data Protection Commission (Ireland)","url":"https://www.dataprotection.ie"}]'::jsonb,
   6, current_date, 'Retention is the employer''s policy decision. Verify with an Irish employment solicitor.'),
  ('US','appraisal','conditional','United States: appraisal workflow',
   'Available. There is no single federal appraisal law. State rules differ: for example California gives staff rights over their personal information and personnel records, and several states let staff inspect their personnel file.',
   core || jsonb_build_array(
     jsonb_build_object('key','state','text','We have checked the privacy and personnel-record rules of each US state where our staff work, including any notice or access rights.'),
     jsonb_build_object('key','nodiscrim','text','Our appraisal criteria do not rely on protected characteristics and we will keep records as employment-discrimination rules require.')),
   '[{"label":"California Chamber: records retention","url":"https://hrcalifornia.calchamber.com/forms-tools/Records-Retention"}]'::jsonb,
   4, current_date, 'Federal EEOC rules require some personnel records for 1 year; California regulations are longer. 4 years is a cautious starting point. Verify per state.'),
  ('NG','appraisal','conditional','Nigeria: appraisal workflow',
   'Available. The Nigeria Data Protection Act 2023 and the 2025 implementation directive (GAID) apply. Data is stored on servers outside Nigeria, so a cross-border transfer safeguard is needed.',
   core || jsonb_build_array(
     jsonb_build_object('key','basis','text','We have recorded our lawful basis under the Nigeria Data Protection Act for processing staff appraisal data.'),
     jsonb_build_object('key','transfer','text','We understand appraisal data is stored on servers outside Nigeria, and we rely on the ODUSBABA data processing terms as the transfer safeguard.'),
     jsonb_build_object('key','ndpc','text','If we process personal data on a large scale, we have registered with the Nigeria Data Protection Commission (NDPC), or we are not required to.')),
   '[{"label":"NDPC: NDP Act and GAID 2025","url":"https://ndpc.gov.ng"}]'::jsonb,
   6, current_date, 'Check GAID thresholds for registration and the current cross-border rules with a Nigerian data protection lawyer.'),
  ('CA','appraisal','conditional','Canada: appraisal workflow',
   'Available. Federal and provincial privacy laws apply. In Quebec, Law 25 applies to employee information and the French-language rules apply to documents about conditions of employment.',
   core || jsonb_build_array(
     jsonb_build_object('key','province','text','We have checked the privacy law of each province where our staff work.'),
     jsonb_build_object('key','quebec','text','If any staff work in Quebec, we will give them their appraisal documents in French and have completed the privacy impact assessment Quebec requires before data leaves the province.')),
   '[{"label":"Office of the Privacy Commissioner of Canada","url":"https://www.priv.gc.ca"}]'::jsonb,
   6, current_date, 'Quebec rules in particular should be confirmed with a Quebec employment lawyer.'),
  ('AU','appraisal','conditional','Australia: appraisal workflow',
   'Available. Private-sector employee records are currently exempt from most of the Privacy Act, but that exemption is under review, a statutory privacy tort applies already, and new rules about automated decisions start on 10 December 2026.',
   core || jsonb_build_array(
     jsonb_build_object('key','noexempt','text','We will handle appraisal data as if the employee-records exemption did not apply.'),
     jsonb_build_object('key','adm','text','Our privacy policy will describe any computer-assisted decision use before 10 December 2026.')),
   '[{"label":"OAIC: employment and privacy","url":"https://www.oaic.gov.au/privacy/your-privacy-rights/more-privacy-rights/employment"}]'::jsonb,
   7, current_date, 'Reform timing may change. Verify with an Australian employment lawyer.'),
  ('NZ','appraisal','conditional','New Zealand: appraisal workflow',
   'Available. The Privacy Act 2020 applies, and the Employment Relations Act requires good faith and a fair process. This workflow gives the employee a chance to comment and to ask for a meeting.',
   core, '[{"label":"Office of the Privacy Commissioner NZ","url":"https://www.privacy.org.nz"}]'::jsonb,
   6, current_date, 'Verify with a New Zealand employment lawyer.'),
  ('ZA','appraisal','conditional','South Africa: appraisal workflow',
   'Available. POPIA applies to employee information, and the Labour Relations Act expects performance assessments to be fair and the employee to be given a chance to respond.',
   core, '[{"label":"Information Regulator (South Africa)","url":"https://inforegulator.org.za"}]'::jsonb,
   5, current_date, 'Statutory minimum periods apply to some employment records. Verify with a South African employment lawyer.'),
  ('DE','appraisal','clearance_required','Germany: works council approval needed first',
   'Not available until you show that works-council rules are satisfied. If your workplace has a works council (Betriebsrat), it has a right of co-determination over software that can monitor staff performance (section 87(1) no. 6 BetrVG) and over general appraisal principles (section 94 BetrVG). Using such a system without an agreement can be stopped by the labour court. If you have no works council, you still need a data protection impact assessment and a clear lawful basis (section 26 BDSG).',
   jsonb_build_array(
     jsonb_build_object('key','works_council','text','EITHER a works council exists and has agreed in writing (Betriebsvereinbarung) to this appraisal system, OR we confirm there is no works council at our establishment.','evidence_required',true),
     jsonb_build_object('key','dpia','text','We have carried out a data protection impact assessment (DPIA) for this system.'),
     jsonb_build_object('key','basis','text','Our lawful basis is documented (section 26 BDSG and Article 6 GDPR).'),
     jsonb_build_object('key','informed','text','Staff have been given the information required by Article 13 GDPR.'),
     jsonb_build_object('key','dpa','text','We accept the ODUSBABA data processing terms.'),
     jsonb_build_object('key','human','text','Every rating and decision is made by a person; no automated scoring.')),
   '[{"label":"BetrVG section 94 (official text)","url":"https://www.gesetze-im-internet.de/betrvg/__94.html"},{"label":"Works council rights over HR software","url":"https://panther-hr.de/ratgeber/betriebsrat-mitbestimmung-hr-software"}]'::jsonb,
   3, current_date, 'Verify with a German labour lawyer before selling in Germany. Retention of appraisals should be short; 3 years follows the usual limitation period.'),
  ('FR','appraisal','clearance_required','France: staff information and works council (CSE) consultation needed first',
   'Not available until you show these steps are done. French law requires staff to be told in advance, in writing, how they will be evaluated (Code du travail L1222-3), and the works council (CSE) to be informed and consulted before an evaluation method is introduced. Evaluation methods must be relevant to the job, and a poor appraisal alone cannot justify a dismissal or a pay cut.',
   jsonb_build_array(
     jsonb_build_object('key','info_staff','text','Staff have been informed in writing, before first use, of the evaluation method and criteria.','evidence_required',true),
     jsonb_build_object('key','cse','text','EITHER the works council (CSE) has been informed and consulted about this evaluation method, OR we confirm we have no CSE.','evidence_required',true),
     jsonb_build_object('key','relevant','text','The criteria are relevant to the job and respect the CNIL data-minimisation rules.'),
     jsonb_build_object('key','dpa','text','We accept the ODUSBABA data processing terms.'),
     jsonb_build_object('key','human','text','Every rating and decision is made by a person; no automated scoring.')),
   '[{"label":"CSE Matin: informing staff and consulting the CSE","url":"https://www.csematin.com/fonctionnement/jurisprudence-cse/methode-d-evaluation-professionnelle-l-employeur-doit-en-informer-le-salarie-et-consulter-le-cse.html"}]'::jsonb,
   5, current_date, 'Verify with a French employment lawyer before selling in France.'),
  ('AE','appraisal','clearance_required','United Arab Emirates: not yet reviewed',
   'Not available until reviewed. Rules differ between the UAE mainland (federal data protection law), DIFC and ADGM, and this has not been reviewed yet. Tell us where your workplace is and attach what you rely on, and an administrator will review it.',
   jsonb_build_array(
     jsonb_build_object('key','where','text','We have told you in the note which legal zone our workplace is in (mainland, DIFC or ADGM).','evidence_required',true),
     jsonb_build_object('key','dpa','text','We accept the ODUSBABA data processing terms.'),
     jsonb_build_object('key','human','text','Every rating and decision is made by a person; no automated scoring.')),
   '[]'::jsonb, 5, current_date, 'Not yet researched with a local lawyer.'),
  ('*','appraisal','clearance_required','This country has not been reviewed yet',
   'Not available yet. We have not reviewed the employment and data protection rules for your country. Tell us about your workplace and what rules apply, tick the confirmations and an administrator will review your request.',
   jsonb_build_array(
     jsonb_build_object('key','rules','text','We have explained in the note which employment and data protection rules apply to us.','evidence_required',true),
     jsonb_build_object('key','dpa','text','We accept the ODUSBABA data processing terms.'),
     jsonb_build_object('key','human','text','Every rating and decision is made by a person; no automated scoring.')),
   '[]'::jsonb, 6, current_date, 'Default for countries not individually reviewed.')
  on conflict (country_code, service_key) do nothing;

  -- ===== APPRAISAL: optional AI wording helper (reserved; not switched on in the first release) =====
  insert into public.country_service_rules (country_code, service_key, status, title, requirement_text, checklist, retention_years_default, last_reviewed, verify_note)
  values
  ('*','appraisal_ai','clearance_required','AI help in appraisals is not available here yet',
   'AI help that evaluates or ranks staff is treated as high-risk in the EU and is restricted in several places. The first release of Appraisals has no AI scoring. This rule is reserved for the optional wording helper.',
   jsonb_build_array(jsonb_build_object('key','ai_notice','text','Staff have been told AI is used only to suggest wording and never to score or decide.','evidence_required',true)),
   null, current_date, 'EU high-risk employment AI obligations are provisionally moved to 2 December 2027 (verify the final text).')
  on conflict (country_code, service_key) do nothing;

  -- ===== SANCTIONED COUNTRIES: paid services, appraisals, AI, workforce =====
  insert into public.country_service_rules (country_code, service_key, status, title, requirement_text, checklist, last_reviewed, verify_note)
  select c.cc, s.sk, 'blocked', 'Not available in your country',
         'This service is not available in your country because of international sanctions laws. If you believe this is a mistake, or you hold a licence that allows you to use it, email privacy@bluskyeconsult.com.',
         '[]'::jsonb, current_date, 'Comprehensively sanctioned jurisdictions (US OFAC list: Cuba, Iran, North Korea. the comprehensive US sanctions on Syria were ended in 2025, so Syria needs clearance instead of a block). Crimea, Donetsk and Luhansk are blocked in code by region. Check the official OFAC list regularly.'
  from (values ('CU'),('IR'),('KP')) as c(cc)
  cross join (values ('appraisal'),('appraisal_ai'),('paid_services'),('ai_services'),('workforce')) as s(sk)
  on conflict (country_code, service_key) do nothing;

  -- ===== SYRIA: US comprehensive sanctions ended in 2025, but targeted sanctions and export controls remain =====
  insert into public.country_service_rules (country_code, service_key, status, title, requirement_text, checklist, last_reviewed, verify_note)
  select 'SY', s.sk, 'clearance_required', 'Syria: clearance needed first',
         'Targeted sanctions and export controls still apply in Syria even though the broad US sanctions programme ended in 2025. An administrator must review your request before this service can be used.',
         jsonb_build_array(jsonb_build_object('key','screened','text','Neither we nor anyone we deal with through ODUSBABA is on a sanctions list, and our use is lawful where we operate.','evidence_required',true)),
         current_date, 'Re-check current UK, EU and US Syria measures before approving any request.'
  from (values ('appraisal'),('appraisal_ai'),('paid_services'),('ai_services'),('workforce')) as s(sk)
  on conflict (country_code, service_key) do nothing;
end $$;

-- A small admin view of pending clearance requests (used by Admin > Compliance Rules)
create or replace view public.v_pending_clearances as
  select c.id, c.created_at, c.org_id, c.user_id, c.country_code, c.service_key, c.evidence_note, c.evidence_url, c.checklist_ticked
  from public.compliance_clearances c where c.status = 'pending' order by c.created_at;
revoke all on public.v_pending_clearances from anon, authenticated;

-- ============================ 02-create-appraisals ============================
-- ============================================================================
-- APPRAISALS (organisations, staff, cycles, appraisals, locked versions, audit trail)   2026-10-23
-- Run AFTER create-compliance-engine.sql. Safe to run again.
--
-- SECURITY DESIGN
--   * Every table has row security ON and NO policies: browsers can never read or write them.
--     All access goes through the server, which checks who is asking and what role they hold.
--   * Appraisal text is stored ENCRYPTED by the server (AES-256-GCM, key in Vercel). Someone browsing
--     the database, a backup, or a leaked export sees only scrambled text.
--   * Submitted versions are LOCKED: the database refuses to edit them. Events (the audit trail) are
--     append-only. Only the retention sweep can delete, and only expired, not-on-legal-hold records.
-- ============================================================================

create table if not exists public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country_code text not null,                       -- where the workplace is (decides the legal rules)
  created_by uuid not null,
  retention_years integer not null default 6,       -- how long filed appraisals are kept
  works_council_status text not null default 'unknown' check (works_council_status in ('unknown','exists','none')),
  works_council_ref text,                           -- e.g. agreement reference or consultation date
  settings jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','suspended','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.organisations enable row level security;

create table if not exists public.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid,                                     -- filled when the person accepts the invitation
  email text not null,
  full_name text,
  job_title text,
  role text not null default 'member' check (role in ('owner','hr_admin','approver','member')),
  supervisor_member_id uuid references public.org_members(id) on delete set null,  -- the ONE accountable supervisor
  status text not null default 'invited' check (status in ('invited','active','left')),
  invite_token_hash text,
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  left_at timestamptz,
  unique (org_id, email)
);
create index if not exists idx_org_members_user on public.org_members(user_id);
create index if not exists idx_org_members_org on public.org_members(org_id, status);
alter table public.org_members enable row level security;

create table if not exists public.appraisal_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organisations(id) on delete cascade,   -- null = platform default
  name text not null,
  criteria jsonb not null,                           -- [{id,title,description,weight}]
  scale jsonb not null default '{"min":1,"max":5,"labels":{"1":"Needs improvement","2":"Developing","3":"Meets expectations","4":"Exceeds expectations","5":"Outstanding"}}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.appraisal_templates enable row level security;

insert into public.appraisal_templates (org_id, name, criteria, is_default)
select null, 'Standard appraisal',
  '[{"id":"quality","title":"Quality of work","description":"Accuracy, thoroughness and standard of work produced.","weight":20},
    {"id":"delivery","title":"Delivery and productivity","description":"Meets deadlines, manages workload, achieves objectives.","weight":20},
    {"id":"teamwork","title":"Communication and teamwork","description":"Works well with colleagues, clients and managers.","weight":20},
    {"id":"reliability","title":"Reliability and conduct","description":"Attendance, timekeeping, following policies and procedures.","weight":20},
    {"id":"initiative","title":"Initiative and problem solving","description":"Takes ownership, suggests improvements, solves problems.","weight":20}]'::jsonb,
  true
where not exists (select 1 from public.appraisal_templates where org_id is null and is_default);

create table if not exists public.appraisal_cycles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  name text not null,
  period_start date,
  period_end date,
  template_id uuid references public.appraisal_templates(id) on delete set null,
  self_due date,
  supervisor_due date,
  response_due date,
  final_due date,
  status text not null default 'open' check (status in ('open','closed')),
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table public.appraisal_cycles enable row level security;

create table if not exists public.appraisals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  cycle_id uuid references public.appraisal_cycles(id) on delete set null,
  employee_member_id uuid not null references public.org_members(id),
  supervisor_member_id uuid references public.org_members(id),
  approver_member_id uuid references public.org_members(id),
  status text not null default 'awaiting_self' check (status in (
    'awaiting_self','awaiting_supervisor','awaiting_employee_response',
    'meeting_required','meeting_scheduled','awaiting_joint_record',
    'escalated_disagreement','awaiting_final_approval','filed','returned_to_supervisor',
    'closed_employee_left','withdrawn','purged')),
  round integer not null default 1,                  -- 1 = first response, 2 = after the meeting
  disagreement boolean not null default false,
  employee_no_response boolean not null default false,
  needs_reassignment boolean not null default false,
  template_snapshot jsonb,                           -- the criteria and scale used, frozen at creation
  country_code text,                                 -- the organisation's country when created
  self_due date, supervisor_due date, response_due date, final_due date,
  last_reminded_at timestamptz,
  escalated_at timestamptz,
  filed_at timestamptz,
  retention_until date,
  legal_hold boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_appraisals_org on public.appraisals(org_id, status);
create index if not exists idx_appraisals_employee on public.appraisals(employee_member_id);
create index if not exists idx_appraisals_supervisor on public.appraisals(supervisor_member_id);
create index if not exists idx_appraisals_approver on public.appraisals(approver_member_id);
alter table public.appraisals enable row level security;

-- Working copies (mutable). Copied into a locked version on submit.
create table if not exists public.appraisal_drafts (
  appraisal_id uuid not null references public.appraisals(id) on delete cascade,
  member_id uuid not null references public.org_members(id) on delete cascade,
  stage text not null,
  content_enc text not null,
  updated_at timestamptz not null default now(),
  primary key (appraisal_id, member_id, stage)
);
alter table public.appraisal_drafts enable row level security;

-- Locked versions (append-only)
create table if not exists public.appraisal_versions (
  id uuid primary key default gen_random_uuid(),
  appraisal_id uuid not null references public.appraisals(id) on delete cascade,
  stage text not null check (stage in ('self','supervisor','contributor','employee_response','joint','employee_statement','approver_note')),
  author_member_id uuid references public.org_members(id),
  round integer not null default 1,
  content_enc text not null,
  content_hash text not null,                         -- SHA-256 of the plain content, proves it was not altered
  created_at timestamptz not null default now()
);
create index if not exists idx_versions_appraisal on public.appraisal_versions(appraisal_id, created_at);
alter table public.appraisal_versions enable row level security;

-- Audit trail (append-only, metadata only: no appraisal text)
create table if not exists public.appraisal_events (
  id bigserial primary key,
  appraisal_id uuid references public.appraisals(id) on delete set null,
  org_id uuid,
  actor_member_id uuid,
  actor_user_id uuid,
  action text not null,
  from_status text,
  to_status text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_events_appraisal on public.appraisal_events(appraisal_id, created_at);
alter table public.appraisal_events enable row level security;

create table if not exists public.appraisal_meetings (
  id uuid primary key default gen_random_uuid(),
  appraisal_id uuid not null references public.appraisals(id) on delete cascade,
  proposed_slots jsonb not null default '[]'::jsonb,    -- ISO date-times proposed by the supervisor
  chosen_slot timestamptz,
  location text,                                        -- room, address or video link
  status text not null default 'proposed' check (status in ('proposed','scheduled','held','cancelled')),
  created_by uuid references public.org_members(id),
  created_at timestamptz not null default now()
);
alter table public.appraisal_meetings enable row level security;

create table if not exists public.appraisal_contributors (
  appraisal_id uuid not null references public.appraisals(id) on delete cascade,
  member_id uuid not null references public.org_members(id) on delete cascade,
  status text not null default 'invited' check (status in ('invited','submitted')),
  added_by uuid references public.org_members(id),
  created_at timestamptz not null default now(),
  primary key (appraisal_id, member_id)
);
alter table public.appraisal_contributors enable row level security;

-- What the organisation has confirmed (privacy notice given, works council, DPA, country checklist...)
create table if not exists public.org_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  ack_key text not null,                               -- e.g. 'GB:appraisal:v1' or 'dpa:v1'
  items jsonb not null default '[]'::jsonb,            -- the checklist keys ticked
  note text,
  accepted_by uuid not null,
  accepted_at timestamptz not null default now(),
  text_hash text
);
create index if not exists idx_org_acks on public.org_acknowledgements(org_id, ack_key, accepted_at desc);
alter table public.org_acknowledgements enable row level security;

-- ---------------------------------------------------------------------------
-- LOCKS: versions can never be edited; events can never be edited or deleted.
-- Deleting versions is allowed only inside purge_expired_appraisals() below.
-- ---------------------------------------------------------------------------
create or replace function public.appraisal_lock_updates() returns trigger language plpgsql as $$
begin
  raise exception 'Appraisal records are locked and cannot be changed';
end $$;

create or replace function public.appraisal_lock_deletes() returns trigger language plpgsql as $$
begin
  if current_setting('app.retention_purge', true) = 'on' then
    return old;
  end if;
  raise exception 'Appraisal records are locked and cannot be deleted';
end $$;

drop trigger if exists trg_versions_no_update on public.appraisal_versions;
create trigger trg_versions_no_update before update on public.appraisal_versions
  for each row execute function public.appraisal_lock_updates();
drop trigger if exists trg_versions_no_delete on public.appraisal_versions;
create trigger trg_versions_no_delete before delete on public.appraisal_versions
  for each row execute function public.appraisal_lock_deletes();
drop trigger if exists trg_events_no_update on public.appraisal_events;
create trigger trg_events_no_update before update on public.appraisal_events
  for each row execute function public.appraisal_lock_updates();
drop trigger if exists trg_events_no_delete on public.appraisal_events;
create trigger trg_events_no_delete before delete on public.appraisal_events
  for each row execute function public.appraisal_lock_deletes();

-- Retention sweep: removes the TEXT of filed/closed appraisals whose retention date has passed
-- (unless on legal hold). The appraisal row and audit events stay as an empty shell marked 'purged'.
create or replace function public.purge_expired_appraisals() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer := 0; r record;
begin
  perform set_config('app.retention_purge', 'on', true);
  for r in
    select id from public.appraisals
     where retention_until is not null and retention_until < current_date
       and legal_hold = false and status <> 'purged'
  loop
    delete from public.appraisal_versions where appraisal_id = r.id;
    delete from public.appraisal_drafts where appraisal_id = r.id;
    delete from public.appraisal_meetings where appraisal_id = r.id;
    update public.appraisals set status = 'purged', template_snapshot = null, updated_at = now() where id = r.id;
    insert into public.appraisal_events (appraisal_id, org_id, action, from_status, to_status, meta)
      select id, org_id, 'retention_purge', 'filed', 'purged', jsonb_build_object('retention_until', retention_until)
      from public.appraisals where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.purge_expired_appraisals() from public, anon, authenticated;

-- The server (service role) must still be able to run the sweep.
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.purge_expired_appraisals() to service_role;
  end if;
end $$;

-- ============================ 03-create-geo-pricing ============================
-- ============================================================================
-- GEO-PRICING (regional prices for INDIVIDUAL plans only)                    2026-10-23
-- Run AFTER create-compliance-engine.sql. Safe to run again.
--
-- SAFE-SIDE RULES (all enforced by the server, see api/_lib/geoPricing.js)
--   1. Applies to the Professional (individual) plan ONLY. Employer and Business prices never change.
--   2. A country with no row here pays the standard price (Band A). That covers: every EU/EEA country, the UK,
--      Switzerland, all high-income economies, Russia/Belarus, sanctioned places, and any country not listed.
--   3. If the declared country and the connection country differ, the HIGHER price band wins.
--   4. Billing address is collected at checkout and compared with the band charged; mismatches are flagged for review.
--   5. A price floor means no band can ever drop below cost.
-- Bands come from World Bank WDI price level ratios (PPP conversion factor / exchange rate, 2024).
-- Band B: ratio 0.40-0.59   Band C: 0.28-0.39   Band D: below 0.28
-- ============================================================================

create table if not exists public.price_bands (
  band_key text primary key,
  label text not null,
  multiplier numeric(4,3) not null check (multiplier >= 0.200 and multiplier <= 1.000),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.price_bands enable row level security;

create table if not exists public.country_price_band (
  country_code text primary key,
  band_key text not null references public.price_bands(band_key),
  price_level_ratio numeric(5,2),
  ratio_year integer,
  note text,
  updated_at timestamptz not null default now()
);
alter table public.country_price_band enable row level security;

create table if not exists public.geo_pricing_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.geo_pricing_settings enable row level security;

create table if not exists public.geo_price_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  stripe_session_id text,
  charged_band text,
  billing_country text,
  billing_band text,
  reason text not null,
  status text not null default 'open' check (status in ('open','reviewed')),
  note text,
  created_at timestamptz not null default now(),
  reviewed_by uuid,
  reviewed_at timestamptz
);
create index if not exists idx_geo_flags_status on public.geo_price_flags(status, created_at desc);
alter table public.geo_price_flags enable row level security;

insert into public.price_bands (band_key, label, multiplier, sort_order) values
  ('A','Standard',1.000,1),
  ('B','Regional 1 (70%)',0.700,2),
  ('C','Regional 2 (50%)',0.500,3),
  ('D','Regional 3 (30%)',0.300,4)
on conflict (band_key) do nothing;

insert into public.geo_pricing_settings (key, value) values
  ('enabled','false'),            -- master switch: OFF until you have created the Stripe prices
  ('floor_usd','9.99')            -- no regional price can go below this
on conflict (key) do nothing;

insert into public.country_price_band (country_code, band_key, price_level_ratio, ratio_year) values
  ('AL','B',0.43,2024),
  ('AO','C',0.32,2024),
  ('DZ','C',0.33,2024),
  ('AR','B',0.46,2024),
  ('AM','C',0.37,2024),
  ('AZ','C',0.29,2024),
  ('BD','D',0.26,2024),
  ('BZ','B',0.54,2024),
  ('BJ','C',0.33,2024),
  ('BT','D',0.24,2024),
  ('BO','C',0.34,2024),
  ('BA','C',0.38,2024),
  ('BW','C',0.37,2024),
  ('BR','B',0.46,2024),
  ('BF','C',0.34,2024),
  ('BI','C',0.30,2024),
  ('CV','B',0.46,2024),
  ('KH','C',0.33,2024),
  ('CM','C',0.33,2024),
  ('CF','B',0.41,2024),
  ('TD','C',0.35,2024),
  ('CN','B',0.49,2024),
  ('CO','C',0.35,2024),
  ('KM','B',0.46,2024),
  ('CG','C',0.35,2024),
  ('CI','C',0.36,2024),
  ('DJ','B',0.45,2024),
  ('DM','B',0.49,2024),
  ('DO','C',0.39,2024),
  ('EC','B',0.43,2024),
  ('EG','D',0.14,2024),
  ('SV','B',0.42,2024),
  ('GQ','B',0.41,2024),
  ('SZ','C',0.33,2024),
  ('ET','C',0.33,2024),
  ('FJ','B',0.41,2024),
  ('GA','C',0.38,2024),
  ('GM','D',0.25,2024),
  ('GE','C',0.33,2024),
  ('GH','C',0.30,2024),
  ('GD','B',0.58,2024),
  ('GT','B',0.43,2024),
  ('GW','C',0.32,2024),
  ('GY','C',0.37,2024),
  ('HN','B',0.46,2024),
  ('IN','D',0.24,2024),
  ('ID','C',0.30,2024),
  ('IQ','B',0.42,2024),
  ('JO','B',0.42,2024),
  ('KZ','C',0.35,2024),
  ('KE','C',0.32,2024),
  ('KG','C',0.31,2024),
  ('LA','D',0.22,2024),
  ('LB','C',0.38,2024),
  ('LS','C',0.33,2024),
  ('LY','B',0.46,2024),
  ('MG','C',0.29,2024),
  ('MY','C',0.31,2024),
  ('MV','B',0.51,2024),
  ('ML','C',0.33,2024),
  ('MU','C',0.38,2024),
  ('MX','B',0.54,2024),
  ('MD','B',0.41,2024),
  ('MN','C',0.35,2024),
  ('ME','C',0.39,2024),
  ('MA','B',0.40,2024),
  ('MZ','C',0.38,2024),
  ('NA','C',0.38,2024),
  ('NP','D',0.25,2024),
  ('NI','C',0.33,2024),
  ('NE','C',0.36,2024),
  ('NG','D',0.12,2024),
  ('MK','C',0.34,2024),
  ('PK','D',0.24,2024),
  ('PY','C',0.35,2024),
  ('PE','B',0.48,2024),
  ('PH','C',0.34,2024),
  ('RW','C',0.28,2024),
  ('ST','B',0.56,2024),
  ('SN','C',0.34,2024),
  ('RS','B',0.42,2024),
  ('ZA','B',0.40,2024),
  ('LK','C',0.29,2024),
  ('LC','B',0.51,2024),
  ('VC','B',0.54,2024),
  ('SR','C',0.32,2024),
  ('TJ','D',0.25,2024),
  ('TZ','C',0.28,2024),
  ('TH','C',0.30,2024),
  ('TL','C',0.30,2024),
  ('TG','C',0.33,2024),
  ('TN','C',0.29,2024),
  ('TR','C',0.35,2024),
  ('UG','C',0.33,2024),
  ('UA','C',0.29,2024),
  ('UZ','D',0.27,2024),
  ('VN','C',0.29,2024),
  ('ZM','C',0.28,2024)
on conflict (country_code) do nothing;

-- ============================ 04-create-appraisals-v2 ============================
-- ============================================================================
-- APPRAISALS v2: small-employer mode, template library, department grouping, analytics rule   2026-10-23
-- Run AFTER create-appraisals.sql. Safe to run again.
-- ============================================================================

-- Small-employer mode: the owner can supervise and approve, and the review is shorter.
alter table public.organisations add column if not exists mode text not null default 'standard';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'organisations_mode_check') then
    alter table public.organisations add constraint organisations_mode_check check (mode in ('micro','standard'));
  end if;
end $$;

-- Optional department, used only for group reports (groups under 5 people are always hidden).
alter table public.org_members add column if not exists department text;

-- Marks an appraisal where the supervisor and the approver are the same person (small employers only).
alter table public.appraisals add column if not exists owner_approved boolean not null default false;

alter table public.appraisal_templates add column if not exists category text;
alter table public.appraisal_templates add column if not exists description text;

-- Template library (platform-wide, read-only for organisations; they copy and edit their own).
insert into public.appraisal_templates (org_id, name, category, description, criteria)
select null, v.name, v.category, v.description, v.criteria
from (values
  ('Simple review (small team)','micro_default','A short review for businesses with a handful of staff. Four questions, ten minutes.','[{"id": "quality", "title": "Quality of work", "description": "How accurate and complete is the work?", "anchors": {"1": "Frequent mistakes; work often needs redoing", "3": "Usually accurate; occasional corrections", "5": "Consistently excellent; others rely on it"}}, {"id": "reliability", "title": "Reliability", "description": "Turns up, on time, does what was agreed.", "anchors": {"1": "Often late or absent without notice", "3": "Usually dependable", "5": "Always dependable; never needs chasing"}}, {"id": "teamwork", "title": "Teamwork and attitude", "description": "Works with colleagues and customers.", "anchors": {"1": "Frequent friction or negativity", "3": "Gets on well with most people", "5": "Lifts the team; very positive with customers"}}, {"id": "growth", "title": "Initiative and growth", "description": "Learns, improves, takes ownership.", "anchors": {"1": "Waits to be told; little progress", "3": "Does what is asked and learns steadily", "5": "Spots problems, suggests fixes, grows quickly"}}]'::jsonb),
  ('Office and administration','role','For administrative and office roles.','[{"id": "accuracy", "title": "Accuracy and organisation", "description": "Records, filing, data and deadlines.", "anchors": {"1": "Errors and missed deadlines are common", "3": "Mostly accurate and organised", "5": "Meticulous; nothing slips"}}, {"id": "communication", "title": "Communication", "description": "With colleagues, customers and suppliers.", "anchors": {"1": "Unclear or slow to respond", "3": "Clear and timely most of the time", "5": "Clear, prompt and professional every time"}}, {"id": "reliability", "title": "Reliability and timekeeping", "description": "Attendance, punctuality, following procedures.", "anchors": {"1": "Often late or inconsistent", "3": "Usually reliable", "5": "Completely dependable"}}, {"id": "systems", "title": "Use of systems and tools", "description": "Software, equipment and procedures.", "anchors": {"1": "Struggles with the basics", "3": "Competent with normal tools", "5": "Expert; helps others and improves how things are done"}}, {"id": "initiative", "title": "Initiative", "description": "Takes ownership and suggests improvements.", "anchors": {"1": "Waits to be told", "3": "Takes action on routine matters", "5": "Regularly improves the way work is done"}}]'::jsonb),
  ('Care and support work','role','For care, support and community roles. A starting point, not a regulatory checklist.','[{"id": "care", "title": "Quality and safety of care", "description": "Follows care plans and keeps people safe.", "anchors": {"1": "Care plans or safety steps often missed", "3": "Follows plans and safety steps reliably", "5": "Sets the standard; spots risks early"}}, {"id": "dignity", "title": "Dignity and respect", "description": "Treats people with respect and kindness.", "anchors": {"1": "Concerns about attitude or respect", "3": "Respectful and kind", "5": "Outstanding compassion; people ask for them"}}, {"id": "reliability", "title": "Reliability and punctuality", "description": "Shifts, handovers and commitments.", "anchors": {"1": "Often late or unreliable", "3": "Usually reliable", "5": "Always reliable; covers when needed"}}, {"id": "teamwork", "title": "Teamwork and communication", "description": "With colleagues, families and other professionals.", "anchors": {"1": "Poor communication; causes difficulty", "3": "Communicates well enough", "5": "Excellent; builds trust across the team"}}, {"id": "records", "title": "Records and policies", "description": "Accurate notes and following procedures.", "anchors": {"1": "Records often late, missing or unclear", "3": "Records are usually complete and clear", "5": "Always accurate and timely; models good practice"}}, {"id": "learning", "title": "Learning and development", "description": "Training, reflection and improvement.", "anchors": {"1": "Little engagement with training", "3": "Completes training and applies it", "5": "Seeks learning and shares it with others"}}]'::jsonb),
  ('Sales and customer service','role','For sales, account and customer-facing roles.','[{"id": "customers", "title": "Customer relationships", "description": "Builds trust and keeps customers.", "anchors": {"1": "Customers often unhappy or lost", "3": "Good, steady relationships", "5": "Customers stay and recommend"}}, {"id": "results", "title": "Results against targets", "description": "Delivery against agreed targets.", "anchors": {"1": "Well below target most periods", "3": "Meets target most periods", "5": "Regularly exceeds target"}}, {"id": "knowledge", "title": "Product and service knowledge", "description": "Knows what is sold and how it helps.", "anchors": {"1": "Often cannot answer questions", "3": "Knows the main products well", "5": "Expert; others turn to them"}}, {"id": "followup", "title": "Communication and follow-up", "description": "Replies, quotes, follow-through.", "anchors": {"1": "Follow-up often missed", "3": "Follows up most of the time", "5": "Always prompt and thorough"}}, {"id": "teamwork", "title": "Teamwork", "description": "Shares leads and information.", "anchors": {"1": "Works alone; creates friction", "3": "Cooperates when asked", "5": "Actively helps colleagues succeed"}}]'::jsonb),
  ('Trades and technical','role','For skilled trades, technical and field roles.','[{"id": "workmanship", "title": "Quality of workmanship", "description": "Standard and finish of the work.", "anchors": {"1": "Work often has to be redone", "3": "Meets the normal standard", "5": "Exceptional finish; sets the standard"}}, {"id": "safety", "title": "Safety and compliance", "description": "Safe working and following rules.", "anchors": {"1": "Unsafe practices observed", "3": "Follows safety rules reliably", "5": "Safety champion; improves practice"}}, {"id": "productivity", "title": "Productivity and time management", "description": "Gets jobs done in good time.", "anchors": {"1": "Jobs regularly overrun", "3": "Jobs usually finished on time", "5": "Fast and well planned without cutting corners"}}, {"id": "problem", "title": "Problem solving", "description": "Fixes faults and handles the unexpected.", "anchors": {"1": "Needs help with routine problems", "3": "Solves usual problems alone", "5": "Solves hard problems and teaches others"}}, {"id": "customer", "title": "Reliability and customer care", "description": "Turns up, communicates, leaves things tidy.", "anchors": {"1": "Customer complaints or no-shows", "3": "Reliable and courteous", "5": "Customers specifically ask for them"}}]'::jsonb)
) as v(name, category, description, criteria)
where not exists (select 1 from public.appraisal_templates t where t.org_id is null and t.name = v.name);

update public.appraisal_templates set category = 'standard', description = 'The full five-criterion review.'
 where org_id is null and is_default and category is null;

-- Reports on filed appraisals are a separate service. In Germany and France, performance analytics normally
-- needs the works council's agreement too, so it needs its own clearance.
insert into public.country_service_rules (country_code, service_key, status, title, requirement_text, checklist, reference_links, last_reviewed, verify_note)
values
 ('DE','appraisal_analytics','clearance_required','Germany: performance reports need works council agreement',
  'Reports and statistics built from appraisal results are performance monitoring. If you have a works council, its agreement must cover reports as well as the appraisals themselves (section 87(1) no. 6 BetrVG).',
  jsonb_build_array(
    jsonb_build_object('key','wc_reports','text','EITHER the works council agreement expressly covers performance reports and statistics, OR we confirm there is no works council.','evidence_required',true),
    jsonb_build_object('key','nobenchmark','text','We will not use reports to rank individuals against each other.')),
  '[{"label":"BetrVG section 87 (official text)","url":"https://www.gesetze-im-internet.de/betrvg/__87.html"}]'::jsonb,
  current_date, 'Verify with a German labour lawyer.'),
 ('FR','appraisal_analytics','clearance_required','France: staff and CSE must be told about performance reports',
  'Staff must be informed in advance of any method used to evaluate them, and the works council (CSE) consulted before it is introduced. That includes reports and statistics drawn from appraisal results.',
  jsonb_build_array(
    jsonb_build_object('key','cse_reports','text','Staff have been informed, and the CSE informed and consulted (or we have no CSE), about reports and statistics drawn from appraisals.','evidence_required',true),
    jsonb_build_object('key','nobenchmark','text','We will not use reports to rank individuals against each other.')),
  '[]'::jsonb, current_date, 'Verify with a French employment lawyer.')
on conflict (country_code, service_key) do nothing;

-- ============================ 05-create-appraisal-billing ============================
-- create-appraisal-billing.sql
-- NEW (2026-10-23): pay-per-appraisal for small teams, plus a flag for AI-drafted question sets.
-- Run AFTER create-appraisals.sql and create-appraisals-v2.sql. Safe to run twice.
--
-- How it works: a small team (owner not on the Employer or Business plan) buys appraisal credits for the
-- organisation. Starting a round uses one credit per person appraised. A credit comes back if HR withdraws an
-- appraisal before the supervisor has started it, or if someone could not be included. Credits never expire.
-- All changes go through one locked function so two clicks can never spend the same credit twice, and a
-- Stripe payment can never be credited twice.

create table if not exists public.appraisal_credit_balances (
  org_id uuid primary key references public.organisations(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.appraisal_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  delta integer not null,
  reason text not null check (reason in ('purchase','welcome','used','refund','adjustment')),
  external_ref text,                     -- Stripe session id, 'welcome:<org>' or 'refund:<appraisal>': makes each credited once only
  appraisal_id uuid,
  created_at timestamptz not null default now()
);
create unique index if not exists uq_appr_credit_ref on public.appraisal_credit_ledger(external_ref) where external_ref is not null;
create index if not exists idx_appr_credit_org on public.appraisal_credit_ledger(org_id, created_at desc);

alter table public.appraisal_credit_balances enable row level security;
alter table public.appraisal_credit_ledger enable row level security;
-- No policies on purpose: only the server (service role) reads or writes these.

alter table public.appraisals add column if not exists credit_charged boolean not null default false;
alter table public.appraisal_templates add column if not exists ai_drafted boolean not null default false;

create or replace function public.appraisal_credit_adjust(p_org uuid, p_delta integer, p_reason text, p_ref text default null, p_appraisal uuid default null)
returns table(success boolean, new_balance integer, duplicate boolean)
language plpgsql security definer set search_path = public as $$
declare cur integer;
begin
  if p_delta = 0 then
    select coalesce((select balance from appraisal_credit_balances where org_id = p_org), 0) into cur;
    return query select true, cur, false; return;
  end if;
  insert into appraisal_credit_balances(org_id, balance) values (p_org, 0) on conflict (org_id) do nothing;
  select balance into cur from appraisal_credit_balances where org_id = p_org for update;
  if p_ref is not null and exists (select 1 from appraisal_credit_ledger where external_ref = p_ref) then
    return query select true, cur, true; return;
  end if;
  if cur + p_delta < 0 then
    return query select false, cur, false; return;
  end if;
  update appraisal_credit_balances set balance = cur + p_delta, updated_at = now() where org_id = p_org;
  insert into appraisal_credit_ledger(org_id, delta, reason, external_ref, appraisal_id) values (p_org, p_delta, p_reason, p_ref, p_appraisal);
  return query select true, cur + p_delta, false;
end $$;

revoke all on function public.appraisal_credit_adjust(uuid, integer, text, text, uuid) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.appraisal_credit_adjust(uuid, integer, text, text, uuid) to service_role;
  end if;
end $$;

-- ============================ 06-create-appraisals-v3 ============================
-- create-appraisals-v3.sql
-- NEW (2026-10-23): lets a question set ask the supervisor for a "potential" rating (used by the nine-box grid).
-- Question weights need no database change: they are stored with each question. Run after the earlier appraisal SQL files.
-- Safe to run twice.
alter table public.appraisal_templates add column if not exists use_potential boolean not null default false;

-- ============================ 07-create-appraisal-large-orgs ============================
-- create-appraisal-large-orgs.sql  (2026-10-23)
-- Lets you raise the team-size limit for ONE organisation that has agreed a larger plan with you
-- (organisations of more than 100 people are asked to email support@bluskyeconsult.com).
-- Nothing changes for anyone until you set a number on an organisation. Safe to re-run.
--
-- The number only takes effect when the organisation owner is on the Business plan (or is an admin).
-- To agree a limit for a customer, after you have agreed terms and put the contract and data processing terms in place:
--   update public.organisations set max_people_override = 250 where id = '<the organisation id>';
-- To remove it again:
--   update public.organisations set max_people_override = null where id = '<the organisation id>';
-- (Find the organisation id in Supabase > Table editor > organisations, or from the address bar of its page: /appraisals/org/<id>.)

alter table public.organisations add column if not exists max_people_override integer;
alter table public.organisations drop constraint if exists organisations_max_people_override_check;
alter table public.organisations add constraint organisations_max_people_override_check
    check (max_people_override is null or (max_people_override between 101 and 5000));

-- ============================ 08-create-appraisal-staff-notice ============================
-- create-appraisal-staff-notice.sql
-- NEW (2026-10-24): records that an organisation has given its staff the appraisal notice before a round starts.
-- Safe to run more than once. Run in the Supabase SQL editor.
alter table public.organisations add column if not exists staff_notice_version integer;
alter table public.organisations add column if not exists staff_notice_mode text;
alter table public.organisations add column if not exists staff_notice_at timestamptz;
alter table public.organisations add column if not exists staff_notice_by uuid;
alter table public.organisations add column if not exists staff_notice_count integer;
do $$ begin
  alter table public.organisations add constraint organisations_staff_notice_mode_check check (staff_notice_mode is null or staff_notice_mode in ('platform','own'));
exception when duplicate_object then null; end $$;

alter table public.org_members add column if not exists notice_version integer;
alter table public.org_members add column if not exists notice_sent_at timestamptz;

-- ============================ 09-create-job-post-credits ============================
-- create-job-post-credits.sql  (2026-10-23)
-- Pay-per-job-post. Anyone can buy job-post credits; one credit pays for one job post. Employer members can also
-- spend a credit once they pass their 20 posts a month. Credits never expire.
-- Run AFTER add-jobs-owner-column.sql (the jobs.user_id column). Safe to run twice.
--
-- Same safety design as the appraisal credits: every change goes through one locked function, so two clicks can never
-- spend one credit twice and one Stripe payment can never be credited twice. Only the server can read or write these tables.
-- A credit is returned automatically if the job is rejected on review (trigger at the bottom).

create table if not exists public.job_post_credit_balances (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.job_post_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  delta integer not null,
  reason text not null check (reason in ('purchase','used','refund','adjustment')),
  external_ref text,                     -- Stripe session id or 'refund:<job id>': makes each credited once only
  job_id uuid,
  created_at timestamptz not null default now()
);
create unique index if not exists uq_job_post_credit_ref on public.job_post_credit_ledger(external_ref) where external_ref is not null;
create index if not exists idx_job_post_credit_user on public.job_post_credit_ledger(user_id, created_at desc);
create index if not exists idx_job_post_credit_job on public.job_post_credit_ledger(job_id) where job_id is not null;

alter table public.job_post_credit_balances enable row level security;
alter table public.job_post_credit_ledger enable row level security;
-- No policies on purpose: only the server (service role) reads or writes these.

create or replace function public.job_post_credit_adjust(p_user uuid, p_delta integer, p_reason text, p_ref text default null, p_job uuid default null)
returns table(success boolean, new_balance integer, duplicate boolean)
language plpgsql security definer set search_path = public as $$
declare cur integer;
begin
  if p_delta = 0 then
    select coalesce((select balance from job_post_credit_balances where user_id = p_user), 0) into cur;
    return query select true, cur, false; return;
  end if;
  insert into job_post_credit_balances(user_id, balance) values (p_user, 0) on conflict (user_id) do nothing;
  select balance into cur from job_post_credit_balances where user_id = p_user for update;
  if p_ref is not null and exists (select 1 from job_post_credit_ledger where external_ref = p_ref) then
    return query select true, cur, true; return;
  end if;
  if cur + p_delta < 0 then
    return query select false, cur, false; return;
  end if;
  update job_post_credit_balances set balance = cur + p_delta, updated_at = now() where user_id = p_user;
  insert into job_post_credit_ledger(user_id, delta, reason, external_ref, job_id) values (p_user, p_delta, p_reason, p_ref, p_job);
  return query select true, cur + p_delta, false;
end $$;

revoke all on function public.job_post_credit_adjust(uuid, integer, text, text, uuid) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.job_post_credit_adjust(uuid, integer, text, text, uuid) to service_role;
  end if;
end $$;

-- Give the credit back if a job that was paid for with a credit is rejected on review. Works whichever screen the
-- rejection is made from, because it watches the job itself. Once only (the 'refund:<job id>' reference).
create or replace function public.job_post_refund_on_reject()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  if lower(coalesce(new.compliance_status, '')) = 'rejected' and lower(coalesce(old.compliance_status, '')) <> 'rejected' then
    select user_id into owner from job_post_credit_ledger where job_id = new.id and reason = 'used' order by created_at desc limit 1;
    if owner is not null then
      perform job_post_credit_adjust(owner, 1, 'refund', 'refund:' || new.id::text, new.id);
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_job_post_refund_on_reject on public.jobs;
create trigger trg_job_post_refund_on_reject after update of compliance_status on public.jobs
  for each row execute function public.job_post_refund_on_reject();

-- ============================ 10-create-credit-reversals ============================
-- create-credit-reversals.sql  (2026-10-23)
-- When a card payment for appraisal credits or job-post credits is refunded in full, or disputed (chargeback), the server takes
-- those credits back as far as they are still unspent, and records what it did here. If some were already spent, the shortfall is
-- recorded and an email goes to support@bluskyeconsult.com so you can decide what to do. If you win a dispute, the credits are restored.
-- Run AFTER create-job-post-credits.sql and create-appraisal-billing.sql. Safe to run twice.

create table if not exists public.credit_reversals (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,                 -- 'refund:<Stripe charge id>' or 'dispute:<Stripe dispute id>': each handled once only
  payment_intent text,                      -- the Stripe payment, so a refund AND a dispute on the same payment only take credits once
  kind text not null check (kind in ('job_post', 'appraisal')),
  owner_id uuid not null,                   -- the user (job-post credits) or the organisation (appraisal credits)
  purchased integer not null,               -- credits in the pack that was paid for
  clawed_back integer not null,             -- credits taken back (only unspent ones can be)
  shortfall integer not null,               -- credits already spent, so not recoverable automatically
  restored integer not null default 0,      -- credits given back after a dispute was won
  created_at timestamptz not null default now()
);
alter table public.credit_reversals enable row level security;
-- No policies on purpose: only the server (service role) reads or writes this table.

-- ============================ 11-create-threat-guard ============================
-- create-threat-guard.sql  (2026-10-23)  Safe to run twice. Run once, before deploying the new index.js.
-- Makes the automatic IP blocking fast and keeps the logs from growing for ever.

-- 1. Columns the block code writes (they exist already on most setups; this only adds what is missing)
alter table public.blocked_ips add column if not exists reason text;
alter table public.blocked_ips add column if not exists block_reason text;

-- 2. Indexes so looking up one IP stays fast even with millions of log rows
create index if not exists idx_security_events_ip_time   on public.security_events (ip_address, created_at desc);
create index if not exists idx_security_events_type_time on public.security_events (event_type, created_at desc);
create index if not exists idx_blocked_ips_ip_expiry     on public.blocked_ips (ip_address, expires_at);

-- 3. Housekeeping every night at 03:15 UTC (needs the pg_cron extension, which your project already has):
--    ordinary page-view records are kept 3 days, all security records 180 days (enough to investigate an incident).
do $$
begin
  perform cron.unschedule('security-events-retention')
  where exists (select 1 from cron.job where jobname = 'security-events-retention');
  perform cron.schedule('security-events-retention', '15 3 * * *', $job$
    delete from public.security_events where event_type = 'api_request' and created_at < now() - interval '3 days';
    delete from public.security_events where created_at < now() - interval '180 days';
  $job$);
exception when others then
  raise notice 'Retention job not scheduled (%). Indexes were still created.', sqlerrm;
end $$;

-- 4. Emergency: lift every automatic block at once (only run if real members are being blocked)
--    update public.blocked_ips set expires_at = now(), unblocked_at = now() where reason like 'auto:%' and expires_at > now();

-- ============================ 12-protect-profile-billing-columns ============================
-- protect-profile-billing-columns.sql  (2026-10-23)
-- FOUND BY security-prove-columns.sql: a signed-in member could edit these columns on their OWN profile straight
-- from the browser: ai_credits_remaining, ai_credits_used, va_credits_balance (free credits), converted_to_paid,
-- stripe_subscription_id, shared_ip_approved (bypasses your shared-IP fraud check), tester_type, verification_token.
-- user_type and tier were already protected.
--
-- This adds a second guard. A change to a guarded column is allowed only for:
--   * your server (service key) and your own database functions (decrement_ai_credits, grant_monthly_credits, ...),
--     because they do not run as the browser's "authenticated" role; and
--   * a signed-in admin.
-- Everything else on a profile (name, photo, preferences, CV text) still edits normally.
-- Safe to run twice. Undo: drop trigger trg_profiles_protect_billing on public.profiles;
-- If something in the site updates one of these columns straight from the browser, it will now show
-- "Only the system can change <column>". Tell me which page and I will move it to the server.

create or replace function public.profiles_protect_billing()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  guarded text[] := array[
    'ai_credits_remaining','ai_credits_used','ai_credits_total','ai_credits_reset_at',
    'va_credits_balance','va_credits_used','va_credits_reset_at',
    'converted_to_paid','stripe_subscription_id','stripe_customer_id','subscription_status','subscription_tier',
    'subscription_expires_at','shared_ip_approved','tester_type','is_tester','verification_token','email_verified',
    'two_factor_secret','two_factor_backup_codes','two_factor_enabled','two_factor_last_verified'];
  c text;
  o jsonb := to_jsonb(old);
  n jsonb := to_jsonb(new);
begin
  -- only the browser's roles are restricted
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if exists (select 1 from public.profiles where id = auth.uid() and user_type in ('admin','super_admin')) then return new; end if;
  foreach c in array guarded loop
    if (o ? c) and (n ->> c) is distinct from (o ->> c) then
      raise exception 'Only the system can change %.', c using errcode = '42501';
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists trg_profiles_protect_billing on public.profiles;
create trigger trg_profiles_protect_billing
  before update on public.profiles
  for each row execute function public.profiles_protect_billing();

-- Read-only: are the 3 profiles that still hold backup codes people who use two-factor sign-in?
select id, email, two_factor_enabled,
       (select count(*) from public.profile_secrets s where s.user_id = p.id and s.two_factor_backup_codes is not null) as codes_already_in_private_table
from public.profiles p where two_factor_backup_codes is not null;

-- ============================ 13-protect-jobs-review-fields ============================
-- protect-jobs-review-fields.sql  (2026-10-23)
-- WHY: the rule "jobs_update_employer" lets an employer change ANY column of their own job. That includes
-- compliance_status, so a poster could approve their own pending job, un-reject a rejected one, or switch a
-- job live without your review or a paid credit. This trigger stops that. Admins and your server (service key)
-- are unaffected; employers can still edit titles, descriptions, deadlines and so on.
-- Safe to run twice. Read-only for existing data. To undo: drop trigger trg_jobs_protect_review_fields on public.jobs;

create or replace function public.jobs_protect_review_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  is_adm boolean := false;
begin
  -- the server (service key) has no auth.uid(); it is trusted
  if caller is null then return new; end if;
  select exists (select 1 from public.profiles where id = caller and user_type in ('admin','super_admin')) into is_adm;
  if is_adm then return new; end if;

  -- fields only an admin or the server may change
  new.compliance_status := old.compliance_status;
  new.rejection_reason  := old.rejection_reason;
  new.user_id           := old.user_id;
  -- a job that has not been approved cannot be switched live by its owner
  if old.compliance_status is distinct from 'approved' then
    new.status    := old.status;
    new.is_active := old.is_active;
  end if;
  return new;
end $$;

revoke all on function public.jobs_protect_review_fields() from public, anon, authenticated;

drop trigger if exists trg_jobs_protect_review_fields on public.jobs;
create trigger trg_jobs_protect_review_fields
  before update on public.jobs
  for each row execute function public.jobs_protect_review_fields();

-- ============================ 14-add-appraisal-invite-template ============================
-- add-appraisal-invite-template.sql  (2026-10-24, revised: formal sales pitch, signed ODUSBABA Team)
-- Adds a built-in marketing email for the Appraisals product to the Invitation Campaigns tool.
-- Where it appears: Admin > Invitation Campaigns > saved templates, named "Appraisals (all employer sizes)".
-- Pick it, review the text, then send as normal. The tool adds the sign-up button, unsubscribe link,
-- postal address and the sender block ("ODUSBABA Team") automatically.
-- Safe to re-run: it updates the same template. Requires add-invite-templates.sql to have been run first.
-- No prices are in the text, so a price change never makes this email wrong.

insert into public.invite_templates (name, target_tier, is_preset, content)
values (
    'Appraisals (all employer sizes)', 'employer', true,
    $json$
    {
      "subject": "Performance appraisals that are fair, documented and defensible",
      "preheader": "A complete appraisal process for organisations of every size. Your first appraisal is free.",
      "headline": "Performance appraisals you can defend, and your team will respect",
      "intro": "Dear Colleague,\n\nEvery organisation appraises its people. Few do it in a way that is consistent, documented and fair to both sides. The consequences are familiar: ratings that depend on who happens to be supervising, employees who feel unheard, and managers with nothing on record when a decision is questioned.\n\nODUSBABA Appraisals replaces that uncertainty with a structured, auditable process. Each employee completes a self-appraisal. The supervisor then rates the same questions against clear written standards. The employee reviews the assessment and may accept it, or respond with reasons and request a meeting. Every stage is recorded, and the final appraisal is filed securely.\n\nThe result is a process your team can trust and your organisation can stand behind. It suits a team of five and an organisation of one hundred alike, and at no point does artificial intelligence score, rank or judge anyone.",
      "bullets": [
        { "title": "Consistent standards across every supervisor", "text": "Each question describes what a 1, a 3 and a 5 look like, so two supervisors rate the same work in the same way." },
        { "title": "Ratings that reflect what matters", "text": "Questions may count as normal, double or triple in the overall rating, so the questions that matter most in a role carry the most weight." },
        { "title": "Ready for use on the first day", "text": "Question sets for office and administration, care and support, sales and customer service, and trades and technical roles. Adopt them, edit them or write your own." },
        { "title": "A genuine right of reply", "text": "Employees respond to their assessment, request a face-to-face meeting and add a written statement. A fairer process leads to fewer disputes." },
        { "title": "A record that withstands scrutiny", "text": "Records are encrypted and every step is logged, so you can show how and when each decision was reached." },
        { "title": "Insight instead of guesswork", "text": "Reports show average ratings, spread, trends across rounds and the gap between self and final ratings. Larger organisations add department analysis and a nine-box performance and potential grid." },
        { "title": "Human judgement, always", "text": "AI may suggest topics for your questions. It never reads, scores or ranks results, so accountability stays with your team." },
        { "title": "Mindful of local requirements", "text": "Certain features, such as the organisation average and the nine-box grid, are withheld in countries where local expectations call for it." }
      ],
      "closing": "We would be pleased to help you choose the right starting point for your organisation. Simply reply to this email with the size of your team and a member of the ODUSBABA Team will respond. Your first appraisal is free, so there is no risk in seeing the process for yourself.\n\nWe look forward to supporting you.",
      "ps": "Please note: a rating alone is not a sound basis for dismissal or a reduction in pay. Our reports say so clearly and include a guide to support the conversation.",
      "stepsTitle": "Beginning is straightforward",
      "steps": [
        { "title": "Create your free account", "text": "Register as an employer. It takes a few minutes." },
        { "title": "Select a question set", "text": "Choose a ready-made set, including a four-question simple review, or compose your own." },
        { "title": "Add your team and issue the first appraisal", "text": "Your first appraisal is free." }
      ],
      "snapshot": {
        "title": "Choosing the right option for your organisation",
        "note": "Current prices are shown on the Pricing page.",
        "rows": [
          { "label": "Up to 25 employees", "value": "Pay per appraisal, no subscription" },
          { "label": "Up to 50 employees", "value": "Employer plan, appraisals included" },
          { "label": "Up to 100 employees", "value": "Business plan, with department analysis" },
          { "label": "More than 100 employees", "value": "A bespoke arrangement on request" }
        ]
      }
    }
    $json$::jsonb
)
on conflict (name) do update set content = excluded.content, target_tier = excluded.target_tier, is_preset = true, updated_at = now();

select name, target_tier, is_preset, jsonb_array_length(content->'bullets') as benefits from public.invite_templates where name = 'Appraisals (all employer sizes)';

-- ============================ 15-create-care-relocation ============================
-- create-care-relocation.sql
-- NEW (2026-10-25): supports the Care Relocation page and the "Care roles only" job filter.
--   1. jobs.care_role: set automatically from the job title (all job sources, new and edited jobs).
--   2. Backfill care_role for the jobs already on the board.
--   3. New Zealand: move existing jobs whose location names New Zealand out of "Worldwide & Other" (with a backup so it can be undone).
-- Safe to run more than once. Run the whole file in the Supabase SQL editor.

alter table public.jobs add column if not exists care_role boolean not null default false;
create index if not exists idx_jobs_care_role on public.jobs(care_role) where care_role = true;

create or replace function public.is_care_role(p_title text) returns boolean
language sql immutable as $$
  select coalesce(p_title, '') ~* '\m(care assistants?|carers?|care workers?|care staff|support workers?|health ?care assistants?|health ?care support|nursing assistants?|nurse aides?|nurse aids?|personal support workers?|psw|hca|personal care (assistants?|workers?|attendants?)|aged care|aged (and|or) disabled carers?|disability support|care ?givers?|home care|domiciliary|care home|residential care|senior carers?|care coordinators?|care team leaders?|enrolled nurses?)\M'
$$;

create or replace function public.jobs_set_care_role() returns trigger
language plpgsql as $$
begin
  new.care_role := public.is_care_role(new.title);
  return new;
end $$;

drop trigger if exists trg_jobs_care_role on public.jobs;
create trigger trg_jobs_care_role before insert or update of title on public.jobs
  for each row execute function public.jobs_set_care_role();

-- Backfill what is already there
update public.jobs set care_role = public.is_care_role(title) where care_role is distinct from public.is_care_role(title);

-- New Zealand: backup first, then move
create table if not exists public.job_country_backup_nz (job_id uuid primary key, old_country_code text, moved_at timestamptz not null default now());
alter table public.job_country_backup_nz enable row level security;

with moved as (
  select id, country_code from public.jobs
  where coalesce(country_code, '') <> 'NZ'
    and coalesce(location, '') ~* '\m(new zealand|aotearoa|auckland|christchurch|tauranga|dunedin|queenstown|palmerston north|napier)\M'
    and coalesce(country_code, '') not in ('GB','IE','US','CA','AU','DE','FR','NG')
), saved as (
  insert into public.job_country_backup_nz (job_id, old_country_code) select id, country_code from moved on conflict (job_id) do nothing returning job_id
)
update public.jobs j set country_code = 'NZ' from moved m where j.id = m.id;

-- What you should see afterwards
select 'care roles on the board' as what, count(*) as n from public.jobs where care_role
union all select 'New Zealand jobs', count(*) from public.jobs where country_code = 'NZ'
union all select 'NZ jobs moved by this file (can be undone)', count(*) from public.job_country_backup_nz;

-- TO UNDO the New Zealand move only (select the two lines below and run them on their own):
--   update public.jobs j set country_code = b.old_country_code from public.job_country_backup_nz b where j.id = b.job_id;
--   delete from public.job_country_backup_nz;

-- ============================ 16-create-employer-registers ============================
-- create-employer-registers.sql
-- NEW (2026-10-25): official employer lists (Canada's positive-LMIA employers, New Zealand's accredited employers, and any
-- other list you load later) and automatic matching of job adverts to them by employer name.
-- What a match means: the employer's NAME appears on the official list you loaded. It does NOT prove a particular advert
-- is genuine (scammers copy real company names). The site says so wherever it shows the label.
-- Run create-care-relocation.sql first. Safe to run more than once.

create table if not exists public.employer_registers (
    key text primary key,
    country_code text not null,
    title text not null,
    source_url text not null,
    proves text not null,
    caveat text not null,
    loaded_on date,
    row_count integer not null default 0,
    is_active boolean not null default true
);
create table if not exists public.employer_register_entries (
    id bigint generated always as identity primary key,
    register_key text not null references public.employer_registers(key) on delete cascade,
    employer_name text not null,
    name_norm text not null,
    place text,
    detail text
);
create index if not exists idx_ere_key_norm on public.employer_register_entries (register_key, name_norm);
create index if not exists idx_ere_norm_prefix on public.employer_register_entries (name_norm text_pattern_ops);

alter table public.employer_registers enable row level security;
alter table public.employer_register_entries enable row level security;
-- These are public government lists, so anyone may read them (the "check an employer" tool needs it).
drop policy if exists "registers_public_read" on public.employer_registers;
create policy "registers_public_read" on public.employer_registers for select to public using (is_active = true);
drop policy if exists "register_entries_public_read" on public.employer_register_entries;
create policy "register_entries_public_read" on public.employer_register_entries for select to public using (true);
drop policy if exists "registers_admin_manage" on public.employer_registers;
create policy "registers_admin_manage" on public.employer_registers for all to authenticated
    using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.user_type in ('admin','super_admin')))
    with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.user_type in ('admin','super_admin')));

insert into public.employer_registers (key, country_code, title, source_url, proves, caveat) values
 ('ca-lmia-positive', 'CA', 'Canada: employers issued a positive LMIA (government open data)',
  'https://open.canada.ca/data/en/dataset/90fed587-1364-4f33-a9ee-208181dc0b97',
  'The employer was issued at least one positive Labour Market Impact Assessment in the period the list covers.',
  'An earlier approval does not prove that a current job is genuine, that the employer can hire you now, or that its pay or location meets today''s rules.'),
 ('nz-accredited', 'NZ', 'New Zealand: accredited employers (Immigration New Zealand)',
  'https://immigration.govt.nz/work/requirements-for-work-visas/approved-employers/accredited-employer-list',
  'The employer held accreditation to hire migrants on an Accredited Employer Work Visa when the list was loaded.',
  'Accreditation can expire or be revoked. Check the live list before you accept any offer.')
on conflict (key) do nothing;

-- One shared way of writing a company name, so "ACME Care Ltd." and "Acme Care Limited" match.
create or replace function public.normalize_employer_name(t text) returns text
language sql immutable as $$
  select btrim(regexp_replace(
    regexp_replace(
      regexp_replace(
        translate(lower(coalesce(t, '')), 'àáâãäåçèéêëìíîïñòóôõöùúûüý', 'aaaaaaceeeeiiiinooooouuuuy'),
        '&', ' and ', 'g'),
      '\m(limited|ltd|inc|incorporated|corp|corporation|llc|llp|plc|pty|pte|co|company|ulc|lp|the|trading as|operating as|t/a|o/a)\M', ' ', 'g'),
    '[^a-z0-9]+', ' ', 'g'))
$$;

alter table public.jobs add column if not exists register_match text;
alter table public.jobs add column if not exists register_checked_on date;

create or replace function public.jobs_match_register() returns trigger
language plpgsql as $$
declare r record;
begin
  new.register_match := null; new.register_checked_on := null;
  if coalesce(new.company, '') <> '' and new.country_code is not null then
    select reg.title, reg.loaded_on into r
    from public.employer_register_entries e join public.employer_registers reg on reg.key = e.register_key
    where reg.is_active and reg.loaded_on is not null and reg.country_code = new.country_code
      and e.name_norm = public.normalize_employer_name(new.company) and e.name_norm <> ''
    limit 1;
    if found then new.register_match := r.title; new.register_checked_on := r.loaded_on; end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_jobs_match_register on public.jobs;
create trigger trg_jobs_match_register before insert or update of company, country_code on public.jobs
  for each row execute function public.jobs_match_register();

create or replace function public._is_register_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is null or exists (select 1 from public.profiles where id = auth.uid() and user_type in ('admin','super_admin'))
$$;

-- Used by the admin importer, in batches. p_replace = true on the first batch clears the old list for that register.
create or replace function public.load_register_entries(p_key text, p_rows jsonb, p_replace boolean default false) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public._is_register_admin() then raise exception 'Admins only'; end if;
  if not exists (select 1 from public.employer_registers where key = p_key) then raise exception 'Unknown register'; end if;
  if p_replace then delete from public.employer_register_entries where register_key = p_key; end if;
  insert into public.employer_register_entries (register_key, employer_name, name_norm, place, detail)
  select p_key, left(x->>'name', 300), public.normalize_employer_name(x->>'name'), left(x->>'place', 200), left(x->>'detail', 300)
  from jsonb_array_elements(p_rows) x
  where coalesce(x->>'name', '') <> '' and public.normalize_employer_name(x->>'name') <> '';
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.rematch_jobs_to_registers(p_country text default null) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public._is_register_admin() then raise exception 'Admins only'; end if;
  update public.jobs set company = company where company is not null and (p_country is null or country_code = p_country);
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.finish_register_load(p_key text, p_loaded_on date) returns integer
language plpgsql security definer set search_path = public as $$
declare c text; total integer; matched integer;
begin
  if not public._is_register_admin() then raise exception 'Admins only'; end if;
  select country_code into c from public.employer_registers where key = p_key;
  if c is null then raise exception 'Unknown register'; end if;
  select count(*) into total from public.employer_register_entries where register_key = p_key;
  update public.employer_registers set loaded_on = p_loaded_on, row_count = total where key = p_key;
  perform public.rematch_jobs_to_registers(c);
  select count(*) into matched from public.jobs where country_code = c and register_match is not null;
  return matched;
end $$;

-- What the public "check an employer" tool uses.
create or replace function public.register_status(p_country text) returns table (key text, title text, source_url text, loaded_on date, row_count integer, proves text, caveat text)
language sql stable as $$
  select r.key, r.title, r.source_url, r.loaded_on, r.row_count, r.proves, r.caveat from public.employer_registers r where r.is_active and r.country_code = p_country
$$;
create or replace function public.check_employer_register(p_name text, p_country text) returns table (register_key text, employer_name text, place text, match_kind text)
language plpgsql stable as $$
declare q text := public.normalize_employer_name(p_name);
begin
  if length(q) < 3 then return; end if;
  return query
    select e.register_key, e.employer_name, e.place, case when e.name_norm = q then 'exact' else 'similar' end
    from public.employer_register_entries e join public.employer_registers r on r.key = e.register_key
    where r.is_active and r.loaded_on is not null and r.country_code = p_country
      and (e.name_norm = q or (length(q) >= 6 and e.name_norm like q || '%'))
    order by (e.name_norm = q) desc, e.employer_name
    limit 12;
end $$;
grant execute on function public.register_status(text) to anon, authenticated;
grant execute on function public.check_employer_register(text, text) to anon, authenticated;
grant execute on function public.load_register_entries(text, jsonb, boolean) to authenticated;
grant execute on function public.finish_register_load(text, date) to authenticated;
grant execute on function public.rematch_jobs_to_registers(text) to authenticated;

select key, country_code, loaded_on, row_count from public.employer_registers order by key;

-- ============================ 17-add-overseas-care-provider-invite-template ============================
-- add-overseas-care-provider-invite-template.sql  (2026-10-25)
-- Adds a built-in marketing email for care providers outside the UK (Canada, Australia, New Zealand, Ireland) to the
-- Invitation Campaigns tool. Appears as "Overseas care providers" in Admin > Invitation Campaigns.
-- The tool adds the sign-up button, unsubscribe link, postal address and the "ODUSBABA Team" sender block.
-- The text makes no promise about price or free posting: it points to the Pricing page, because job posts are
-- paid by plan or by credit. Every vacancy is reviewed before it is shown. Safe to re-run.
-- Requires add-invite-templates.sql to have been run first.
-- Send only to organisations with a lawful basis for business contact in their country, and honour unsubscribes.

insert into public.invite_templates (name, target_tier, is_preset, content)
values (
    'Overseas care providers', 'employer', true,
    $json$
    {
      "subject": "Reach care workers who are preparing to move to your country",
      "preheader": "Post your care vacancies where internationally experienced carers are looking.",
      "headline": "Care workers are looking for employers like yours",
      "intro": "Dear Colleague,\n\nMany experienced care workers are considering a move to work in Canada, Australia, New Zealand or Ireland. Several of them already work in care today, and they are looking for employers who are open about their requirements and who follow the official immigration route.\n\nODUSBABA is a career and HR platform with a dedicated care section. Candidates see your vacancy alongside clear guidance on how to check an employer, and employers whose names appear on an official government list are marked as such on their adverts.\n\nIf you recruit care staff from overseas, or would consider doing so, we would be pleased to have you list your vacancies with us.",
      "bullets": [
        { "title": "A care-specific audience", "text": "Care vacancies are tagged as care roles, so candidates searching for care work in your country can find yours." },
        { "title": "Credibility for genuine employers", "text": "Where your organisation appears on your government's published employer list, your adverts show that fact. Care work attracts scam offers, and candidates look for it." },
        { "title": "Every vacancy reviewed", "text": "Each advert is checked before it is published, which protects candidates and the reputation of honest employers." },
        { "title": "You decide how you hire", "text": "State plainly whether you sponsor, and what the role involves. Candidates are advised never to pay anyone for a job offer or a visa, so clarity from you helps them trust your advert." },
        { "title": "Straightforward to begin", "text": "Create an employer account, add the details of your vacancy and submit it for review." }
      ],
      "closing": "If you would like to discuss how the platform could suit your organisation, simply reply to this email and a member of the ODUSBABA Team will respond.\n\nWe look forward to hearing from you.",
      "ps": "Current prices for posting vacancies are shown on our Pricing page.",
      "stepsTitle": "Posting your first vacancy",
      "steps": [
        { "title": "Create an employer account", "text": "Register using your organisation's email address." },
        { "title": "Describe the role", "text": "Include the location, pay, the duties, and whether you sponsor." },
        { "title": "Submit for review", "text": "Once approved, your vacancy appears on the job board." }
      ]
    }
    $json$::jsonb
)
on conflict (name) do update set content = excluded.content, target_tier = excluded.target_tier, is_preset = true, updated_at = now();

select name, target_tier, is_preset from public.invite_templates where name = 'Overseas care providers';

-- ============================ 18-fix-lockdown-round-3 ============================
-- fix-lockdown-round-3.sql  (2026-10-31)
-- Based on your audit results. Three safe tightenings; none removes anything a signed-in member or your server uses.
--   1. Visitors (not signed in) get no table access at all to the appraisal, credit and invitation tables and to the job-source keys table.
--      Row rules already hide the rows; this removes the door as well (belt and braces). Your server uses the service key, which is unaffected.
--   2. Five empty public storage buckets become private (they hold 0 files today; nothing breaks).
--   3. Nothing else is touched. get_public_jobs is deliberately left as it is: it only returns approved, active jobs and a short list of columns.
-- Safe to run twice. To undo section 1 for a table: grant select on public.<table> to anon;

do $$
declare t text;
begin
  foreach t in array array[
    'organisations','org_members','appraisal_cycles','appraisals','appraisal_drafts','appraisal_versions','appraisal_events','appraisal_templates',
    'appraisal_credit_balances','appraisal_credit_ledger','job_post_credit_balances','job_post_credit_ledger','credit_reversals',
    'invitations','job_board_sources','profile_secrets','mail_messages'
  ] loop
    if to_regclass('public.' || quote_ident(t)) is not null then
      execute format('revoke all on public.%I from anon', t);
    end if;
  end loop;
end $$;

update storage.buckets set public = false
where id in ('assessment_files','knowledge_base','course_content','books','user-avatars') and public = true;

-- Proof: both lists should be empty.
select 'anon still has access to' as check_name, c.relname as item
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('organisations','org_members','appraisals','appraisal_events','appraisal_credit_ledger','job_post_credit_ledger','credit_reversals','invitations','job_board_sources')
  and has_table_privilege('anon', c.oid, 'select')
union all
select 'bucket still public', id from storage.buckets where id in ('assessment_files','knowledge_base','course_content','books','user-avatars') and public = true;

-- ============================ 20-fix-function-warnings ============================
-- 20-fix-function-warnings.sql   Safe to run more than once.
-- Fixes the Supabase security-lint warnings about functions:
--  A) Stops the public (not signed in) from being able to call admin-only functions.
--     Admin tools keep working: signed-in admins can still call them (each one also checks admin inside).
--  B) job_post_refund_on_reject is a trigger only; nobody should call it directly.
--  C) Fixes the search path on your own functions so they cannot be tricked into using a look-alike object.
-- Deliberately NOT touched: get_public_jobs, register_status, check_employer_register (meant to be public),
-- and is_staff, is_super_admin, is_engagement_party (your access rules depend on them).

do $$
declare r record;
begin
  -- A) admin-only functions: no public/anon access; signed-in users keep access (admin check is inside)
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('_is_register_admin','load_register_entries','finish_register_load','rematch_jobs_to_registers')
  loop
    execute format('revoke execute on function %s from public, anon', r.sig);
    execute format('grant execute on function %s to authenticated, service_role', r.sig);
  end loop;

  -- B) trigger-only function: nobody calls it directly (the trigger still fires normally)
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'job_post_refund_on_reject'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
  end loop;

  -- C) fixed search path on our own functions
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('is_care_role','infer_job_country','jobs_set_care_role','normalize_employer_name',
                        'jobs_match_register','register_status','check_employer_register',
                        'appraisal_lock_updates','appraisal_lock_deletes')
  loop
    execute format('alter function %s set search_path = public, pg_temp', r.sig);
  end loop;
end $$;

-- Proof table (should list the fixed functions; anon_can_run must be false for all except none)
select p.proname as function_name,
       has_function_privilege('anon', p.oid, 'execute') as anon_can_run,
       has_function_privilege('authenticated', p.oid, 'execute') as signed_in_can_run,
       coalesce(array_to_string(p.proconfig, ','), 'NOT SET') as search_path
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('_is_register_admin','load_register_entries','finish_register_load','rematch_jobs_to_registers',
                    'job_post_refund_on_reject','is_care_role','infer_job_country','jobs_set_care_role',
                    'normalize_employer_name','jobs_match_register','register_status','check_employer_register',
                    'appraisal_lock_updates','appraisal_lock_deletes')
order by 1;

-- ============================ 21-lock-profile-secret-columns-from-public ============================
-- 21-lock-profile-secret-columns-from-public.sql   Safe to run more than once.
-- Why: the proof test showed the public (anon) key still holds permission on profiles.two_factor_secret and
-- profiles.verification_token. No profile rows are visible to visitors and no row holds a value (your check showed 0),
-- so nothing has leaked. This closes the permission anyway so a future mistake cannot expose them.
-- Effect: visitors who are not signed in can no longer read those two columns. Signed-in users and your server are unaffected.
-- To undo: grant select (two_factor_secret, verification_token) on public.profiles to anon;

do $$
declare cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles'
    and column_name not in ('two_factor_secret','two_factor_backup_codes','verification_token');
  if cols is null then return; end if;
  execute 'revoke select on public.profiles from anon';
  execute 'grant select (' || cols || ') on public.profiles to anon';
end $$;

-- Proof: both rows below should say false
select c.column_name,
       has_column_privilege('anon', 'public.profiles', c.column_name, 'select') as anon_can_read
from information_schema.columns c
where c.table_schema = 'public' and c.table_name = 'profiles'
  and c.column_name in ('two_factor_secret','verification_token');

-- ============================ 22-hide-outreach-columns-from-members ============================
-- 22-hide-outreach-columns-from-members.sql   Safe to run more than once.
-- Signed-in members and visitors can still read the sponsor list (company, website, licence type, country).
-- They can no longer read your outreach columns: invitation_status, invited_at, linked_user_id, added_by,
-- last_scraped_at, last_scrape_status, contact_email, sector, town and the website-finder columns (those that exist).
-- Your server is unaffected (it uses the service key).
-- AFTER RUNNING: open your admin screens that list verified employers and the sponsor invitations page.
-- If one shows "permission denied for table verified_employer_sources", that screen reads the table directly from
-- the browser. Run the UNDO line below and send me that page file; I will move it to the server and re-apply this.
-- UNDO:  grant select on public.verified_employer_sources to authenticated;

do $$
declare cols text;
begin
  if to_regclass('public.verified_employer_sources') is null then return; end if;
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'verified_employer_sources'
    and column_name not in ('invitation_status','invited_at','linked_user_id','added_by',
                            'last_scraped_at','last_scrape_status','contact_email',
                            'sector','town','website_candidate','website_confidence','website_status','website_checked_at');
  execute 'revoke select on public.verified_employer_sources from anon, authenticated';
  execute 'grant select (' || cols || ') on public.verified_employer_sources to anon, authenticated';
end $$;

-- Proof: the first rows should say false, the last should say true
select c.column_name,
       has_column_privilege('authenticated', 'public.verified_employer_sources', c.column_name, 'select') as members_can_read
from information_schema.columns c
where c.table_schema = 'public' and c.table_name = 'verified_employer_sources'
  and c.column_name in ('invitation_status','invited_at','linked_user_id','company_name','website_url','is_active','is_verified_sponsor')
order by 2, 1;

-- ============================ 23-create-data-freshness ============================
-- 23-create-data-freshness.sql   Safe to run more than once.
-- Powers the admin "Keep Up To Date" page and pop-up reminder.
-- It lists everything on the site that goes out of date, when it was last updated or confirmed, and whether it is due.
--  * AUTOMATIC items read their date from the data itself (employer lists, compliance rules, pricing, job feed).
--  * MANUAL items are things only you can check (gov.uk rules, legal pages, AI chat facts). You press "I checked this today".
-- Only admins can read or change any of it.

create table if not exists public.admin_review_items (
  key text primary key,
  title text not null,
  why text not null,
  how_to text not null,
  fix_path text,
  max_age_days integer not null check (max_age_days > 0),
  last_checked_on date,
  last_checked_by uuid,
  sort_order integer not null default 100
);
alter table public.admin_review_items enable row level security;
revoke all on public.admin_review_items from anon;
drop policy if exists "review_items_admin_only" on public.admin_review_items;
create policy "review_items_admin_only" on public.admin_review_items for all to authenticated
  using (public._is_register_admin()) with check (public._is_register_admin());

insert into public.admin_review_items (key, title, why, how_to, fix_path, max_age_days, sort_order) values
 ('uk-immigration-rules','UK immigration rules shown on the site and in the AI chat',
  'Visa routes, salary thresholds, fees and settlement rules change often. Out of date advice can harm people and expose you legally.',
  'Open gov.uk (Skilled Worker, care worker route, settlement and fees pages). Compare with the Country Rules page and the AI chat facts. If anything changed, tell Claude what changed so the files can be updated, then press "I checked this today".',
  '/admin/compliance-rules', 60, 10),
 ('ai-chat-facts','Facts written into the AI chat (fees, thresholds, route closures)',
  'The AI chat has immigration facts written into its instructions in the code. They do not update themselves.',
  'Ask Claude to review the AI chat immigration facts against current official sources and send you the updated api/index.js. Then press "I checked this today".',
  null, 60, 20),
 ('care-relocation-content','Care Relocation page: Canada, Australia, New Zealand and Ireland rules',
  'Employer list rules, eligibility and processing details differ by country and change.',
  'Read the Care Relocation page against each country''s official immigration site. Note anything that changed and send it to Claude to update. Then press "I checked this today".',
  null, 90, 30),
 ('legal-pages','Terms, Privacy and Cookie pages',
  'Laws, your services and your suppliers change. These pages must match what you actually do.',
  'Read each page. If you added a service, supplier or country since the last review, send the changes to Claude to update the wording. Consider a solicitor review once a year.',
  null, 180, 40),
 ('pricing-and-plans','Pricing page, plans and Stripe prices',
  'Prices on the site, in the database and in Stripe must agree, and any free-pilot wording must be true.',
  'Compare the Pricing page with your Stripe products. Check that the free-pilot messages still match your testing-mode setting.',
  '/admin/geo-pricing', 90, 50),
 ('jooble-permission','Jooble written permission to display its listings',
  'Jooble listings are held back until Jooble confirms in writing that they may be shown.',
  'Check your email for Jooble''s written reply. If you have it, save it and tell Claude so the hold can be lifted. Press "I checked this today" when you have looked.',
  '/admin/external-jobs', 30, 60),
 ('security-checks','Security checks: Supabase security lint and the exposure checks',
  'New tables, policies and code can reopen a gap. A regular check catches it early.',
  'In Supabase run the Security Advisor, then run security-paid-content-exposure-check.sql and send any red results to Claude. Press "I checked this today".',
  null, 30, 70),
 ('keys-and-access','API keys, email and payment access',
  'Old keys and unused admin accounts are a common way in.',
  'In Vercel and Supabase, remove unused keys and people. Rotate the email, AI and payment keys if anyone who had them has left. Never paste a key into a chat.',
  null, 180, 80),
 ('accreditation-claims','Claims about accreditation, CPD or certificates',
  'You must not say a course is accredited until it is. Claims must match your current status.',
  'Search the site for the words accredited, CPD and certified. Each claim must be true today. Press "I checked this today".',
  null, 90, 90)
on conflict (key) do nothing;

create or replace function public.admin_freshness()
returns table (key text, title text, source text, last_updated date, max_age_days integer, days_old integer,
               status text, why text, how_to text, fix_path text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare d date;
begin
  if not public._is_register_admin() then raise exception 'Admins only'; end if;

  -- AUTOMATIC: official employer lists (one row per list)
  return query
    select 'register-' || r.key, 'Official employer list: ' || r.title, 'automatic', r.loaded_on, case when r.country_code = 'GB' then 45 else 150 end,
           case when r.loaded_on is null then null else (current_date - r.loaded_on) end,
           case when r.loaded_on is null then 'never loaded'
                when current_date - r.loaded_on > (case when r.country_code = 'GB' then 45 else 150 end) then 'overdue'
                when current_date - r.loaded_on > (case when r.country_code = 'GB' then 35 else 120 end) then 'due soon' else 'ok' end,
           'Jobs and the employer check on the Care Relocation page use this list. An old list can badge an employer whose approval has ended.',
           'Download the newest official file, save it as CSV, and load it at Admin > Employer Lists.',
           '/admin/employer-registers'
    from public.employer_registers r where r.is_active;

  -- AUTOMATIC: compliance rules (oldest review date)
  if to_regclass('public.country_service_rules') is not null then
    execute 'select min(last_reviewed) from public.country_service_rules' into d;
    return query select 'compliance-rules'::text, 'Country compliance rules (oldest row reviewed)'::text, 'automatic'::text, d, 180,
      case when d is null then null else (current_date - d) end,
      case when d is null then 'never checked' when current_date - d > 180 then 'overdue' when current_date - d > 144 then 'due soon' else 'ok' end,
      'These rules decide what the platform tells people about each country''s legal requirements.'::text,
      'Review each country row against official sources, update the text and set its review date.'::text,
      '/admin/compliance-rules'::text;
  end if;

  -- AUTOMATIC: regional pricing
  if to_regclass('public.price_bands') is not null then
    execute 'select max(updated_at)::date from public.price_bands' into d;
    return query select 'regional-pricing'::text, 'Regional price bands'::text, 'automatic'::text, d, 180,
      case when d is null then null else (current_date - d) end,
      case when d is null then 'never checked' when current_date - d > 180 then 'overdue' when current_date - d > 144 then 'due soon' else 'ok' end,
      'Prices by region should follow exchange rates and your costs.'::text,
      'Review the bands and save, even if nothing changes, so the date moves.'::text,
      '/admin/geo-pricing'::text;
  end if;

  -- AUTOMATIC: UK sponsor register / verified employers
  if to_regclass('public.verified_employer_sources') is not null then
    execute 'select max(updated_at)::date from public.verified_employer_sources' into d;
    return query select 'verified-sponsors'::text, 'Verified sponsor employers (UK sponsor register import)'::text, 'automatic'::text, d, 60,
      case when d is null then null else (current_date - d) end,
      case when d is null then 'never loaded' when current_date - d > 60 then 'overdue' when current_date - d > 45 then 'due soon' else 'ok' end,
      'The licensed sponsor register changes constantly. Employers can lose their licence.'::text,
      'Download the latest register of licensed sponsors from gov.uk and import it at Admin > Employer Sources.'::text,
      '/admin/employer-sources'::text;
  end if;

  -- AUTOMATIC: job feeds are still arriving
  if to_regclass('public.external_jobs') is not null then
    execute 'select max(created_at)::date from public.external_jobs' into d;
    return query select 'job-feeds'::text, 'Job feeds: newest job collected'::text, 'automatic'::text, d, 4,
      case when d is null then null else (current_date - d) end,
      case when d is null then 'never loaded' when current_date - d > 4 then 'overdue' when current_date - d > 3 then 'due soon' else 'ok' end,
      'If no new jobs arrive, a feed has probably broken and the board goes stale.'::text,
      'Open External Jobs, use Test Feeds, and check the Vercel logs for the scheduled job.'::text,
      '/admin/external-jobs'::text;
  end if;

  -- MANUAL items
  return query
    select i.key, i.title, 'manual', i.last_checked_on, i.max_age_days,
           case when i.last_checked_on is null then null else (current_date - i.last_checked_on) end,
           case when i.last_checked_on is null then 'never checked'
                when current_date - i.last_checked_on > i.max_age_days then 'overdue'
                when current_date - i.last_checked_on > (i.max_age_days * 0.8) then 'due soon' else 'ok' end,
           i.why, i.how_to, i.fix_path
    from public.admin_review_items i order by i.sort_order;
end $$;

create or replace function public.admin_mark_reviewed(p_key text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public._is_register_admin() then raise exception 'Admins only'; end if;
  update public.admin_review_items set last_checked_on = current_date, last_checked_by = auth.uid() where key = p_key;
  if not found then raise exception 'Unknown item'; end if;
end $$;

revoke execute on function public.admin_freshness() from public, anon;
revoke execute on function public.admin_mark_reviewed(text) from public, anon;
grant execute on function public.admin_freshness() to authenticated;
grant execute on function public.admin_mark_reviewed(text) to authenticated;

-- Proof: the manual items now being tracked (the page itself shows the full list)
select key, title, max_age_days, last_checked_on from public.admin_review_items order by sort_order;

-- ============================ 24-add-contact-email-and-suppression ============================
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

-- ============================ 25-create-lmia-explorer ============================
-- 25-create-lmia-explorer.sql   Safe to run more than once.
-- A PRIVATE data store for the Canada LMIA list, for the admin-only "LMIA Explorer" page.
-- Nobody but admins can read or change it. Visitors and ordinary members are blocked at the database itself,
-- so it stays private even if someone bypasses the website and talks to the database directly.
-- One row per employer + occupation per quarter, exactly as the government publishes it.

create table if not exists public.lmia_records (
  id bigint generated always as identity primary key,
  quarter text not null,
  province text,
  stream text,
  employer text not null,
  address text,
  occupation_code text,
  occupation_title text,
  care_role boolean not null default false,
  incorporation text,
  lmias_approved integer,
  positions_approved integer,
  loaded_at timestamptz not null default now()
);
create index if not exists idx_lmia_quarter on public.lmia_records (quarter);
create index if not exists idx_lmia_province on public.lmia_records (quarter, province);
create index if not exists idx_lmia_positions on public.lmia_records (quarter, positions_approved desc);
create index if not exists idx_lmia_employer_lower on public.lmia_records (lower(employer));

alter table public.lmia_records enable row level security;
revoke all on public.lmia_records from anon;
drop policy if exists "lmia_admin_only" on public.lmia_records;
create policy "lmia_admin_only" on public.lmia_records for all to authenticated
  using (public._is_register_admin()) with check (public._is_register_admin());

-- Loads one batch of rows (the page sends 2,000 at a time). The first batch can replace the whole quarter.
create or replace function public.admin_load_lmia_rows(p_quarter text, p_rows jsonb, p_replace boolean default false)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare n integer;
begin
  if not public._is_register_admin() then raise exception 'Admins only'; end if;
  if p_quarter is null or length(trim(p_quarter)) = 0 then raise exception 'A quarter label is required'; end if;
  if p_replace then delete from public.lmia_records where quarter = p_quarter; end if;
  insert into public.lmia_records (quarter, province, stream, employer, address, occupation_code, occupation_title, care_role, incorporation, lmias_approved, positions_approved)
  select p_quarter, nullif(r->>'province',''), nullif(r->>'stream',''), r->>'employer', nullif(r->>'address',''),
         nullif(r->>'occupation_code',''), nullif(r->>'occupation_title',''), coalesce((r->>'care_role')::boolean, false),
         nullif(r->>'incorporation',''), nullif(r->>'lmias_approved','')::integer, nullif(r->>'positions_approved','')::integer
  from jsonb_array_elements(p_rows) r
  where coalesce(trim(r->>'employer'),'') <> '';
  get diagnostics n = row_count;
  return n;
end $$;

-- Totals and breakdowns for one quarter (or all quarters when none is given). Admins only.
create or replace function public.admin_lmia_summary(p_quarter text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare out jsonb;
begin
  if not public._is_register_admin() then raise exception 'Admins only'; end if;
  select jsonb_build_object(
    'quarters', (select coalesce(jsonb_agg(q order by q desc), '[]'::jsonb) from (select distinct quarter q from public.lmia_records) s),
    'totals', (select jsonb_build_object('rows', count(*), 'employers', count(distinct lower(employer)), 'positions', coalesce(sum(positions_approved),0), 'lmias', coalesce(sum(lmias_approved),0), 'care_positions', coalesce(sum(positions_approved) filter (where care_role),0))
               from public.lmia_records where p_quarter is null or quarter = p_quarter),
    'by_province', (select coalesce(jsonb_agg(x order by (x->>'positions')::int desc), '[]'::jsonb) from (
        select jsonb_build_object('name', coalesce(province,'Unknown'), 'positions', coalesce(sum(positions_approved),0), 'employers', count(distinct lower(employer))) x
        from public.lmia_records where p_quarter is null or quarter = p_quarter group by province) s),
    'by_stream', (select coalesce(jsonb_agg(x order by (x->>'positions')::int desc), '[]'::jsonb) from (
        select jsonb_build_object('name', coalesce(stream,'Unknown'), 'positions', coalesce(sum(positions_approved),0), 'employers', count(distinct lower(employer))) x
        from public.lmia_records where p_quarter is null or quarter = p_quarter group by stream) s),
    'top_occupations', (select coalesce(jsonb_agg(x order by (x->>'positions')::int desc), '[]'::jsonb) from (
        select jsonb_build_object('code', occupation_code, 'name', max(occupation_title), 'positions', coalesce(sum(positions_approved),0), 'employers', count(distinct lower(employer))) x
        from public.lmia_records where p_quarter is null or quarter = p_quarter group by occupation_code order by sum(positions_approved) desc nulls last limit 15) s),
    'top_employers', (select coalesce(jsonb_agg(x order by (x->>'positions')::int desc), '[]'::jsonb) from (
        select jsonb_build_object('name', min(employer), 'positions', coalesce(sum(positions_approved),0), 'provinces', count(distinct province)) x
        from public.lmia_records where p_quarter is null or quarter = p_quarter group by lower(employer) order by sum(positions_approved) desc nulls last limit 15) s)
  ) into out;
  return out;
end $$;

revoke execute on function public.admin_load_lmia_rows(text, jsonb, boolean) from public, anon;
revoke execute on function public.admin_lmia_summary(text) from public, anon;
grant execute on function public.admin_load_lmia_rows(text, jsonb, boolean) to authenticated;
grant execute on function public.admin_lmia_summary(text) to authenticated;

-- Proof: the table exists, is empty until you load a file, and visitors cannot read it (both should say false)
select (select count(*) from public.lmia_records) as rows_loaded,
       has_table_privilege('anon', 'public.lmia_records', 'select') as visitors_can_read,
       has_function_privilege('anon', 'public.admin_lmia_summary(text)', 'execute') as visitors_can_run_summary;

-- ============================ 26-add-uk-sponsor-register ============================
-- 26: Add the UK register of licensed sponsors as a third official list (Admin > Employer Lists).
-- Safe to run more than once. Does not touch verified_employer_sources (Employer Sources).

insert into public.employer_registers (key, country_code, title, source_url, proves, caveat) values
 ('uk-licensed-sponsors', 'GB', 'United Kingdom: register of licensed sponsors (Home Office, gov.uk)',
  'https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers',
  'The employer held a Home Office sponsor licence for workers when the list was downloaded.',
  'A licence is not a job offer and does not mean the employer can sponsor your role. Licences are suspended or revoked, and the routes open to new sponsored workers change (the overseas care worker route closed to new applicants in July 2025). Check the live register and gov.uk before you accept any offer.')
on conflict (key) do nothing;

-- Tighten admin check: the old version also allowed any call with no logged-in user.
create or replace function public._is_register_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(auth.role(), '') = 'service_role'
      or exists (select 1 from public.profiles where id = auth.uid() and user_type in ('admin','super_admin'))
$$;

-- Faster re-match: only touches jobs whose answer actually changes (UK has many jobs).
create or replace function public.rematch_jobs_to_registers(p_country text default null) returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare n integer;
begin
  if not public._is_register_admin() then raise exception 'Admins only'; end if;
  with calc as (
    select j.id,
           (select reg.title from public.employer_register_entries e join public.employer_registers reg on reg.key = e.register_key
             where reg.is_active and reg.loaded_on is not null and reg.country_code = j.country_code
               and e.name_norm = public.normalize_employer_name(j.company) and e.name_norm <> '' limit 1) as t,
           (select reg.loaded_on from public.employer_register_entries e join public.employer_registers reg on reg.key = e.register_key
             where reg.is_active and reg.loaded_on is not null and reg.country_code = j.country_code
               and e.name_norm = public.normalize_employer_name(j.company) and e.name_norm <> '' limit 1) as d
    from public.jobs j
    where coalesce(j.company,'') <> '' and j.country_code is not null and (p_country is null or j.country_code = p_country)
  )
  update public.jobs j set register_match = c.t, register_checked_on = c.d
  from calc c where c.id = j.id and (j.register_match is distinct from c.t or j.register_checked_on is distinct from c.d);
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public._is_register_admin() from public, anon;
revoke execute on function public.rematch_jobs_to_registers(text) from public, anon;
grant execute on function public._is_register_admin() to authenticated, service_role;
grant execute on function public.rematch_jobs_to_registers(text) to authenticated, service_role;

select key, country_code, loaded_on, row_count from public.employer_registers order by key;

-- ============================ 27-employer-sources-sector-and-town ============================
-- 27: Let Employer Sources record a sector and a town, so you can work one sector in one town at a time.
-- Safe to run more than once. Run BEFORE uploading the new index.js and EmployerSourcesManager.jsx.
alter table public.verified_employer_sources add column if not exists sector text;
alter table public.verified_employer_sources add column if not exists town text;
create index if not exists idx_ves_sector_town on public.verified_employer_sources (sector, town);

-- Stops the same employer being added twice in the same town if you import a file again.
-- If your table already holds repeats, the index is skipped and you get a notice instead of an error.
do $$
begin
  create unique index if not exists uq_ves_name_town_nosite
    on public.verified_employer_sources (lower(company_name), coalesce(town, ''))
    where website_url is null;
exception when others then
  raise notice 'Duplicate-guard index skipped (existing repeats): %', sqlerrm;
end $$;

-- Keep the new columns out of members' reach, as with the other outreach columns.
do $$
declare cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'verified_employer_sources'
    and column_name not in ('invitation_status','invited_at','linked_user_id','added_by','last_scraped_at','last_scrape_status','contact_email','sector','town');
  execute 'revoke select on public.verified_employer_sources from anon, authenticated';
  execute format('grant select (%s) on public.verified_employer_sources to authenticated', cols);
end $$;

select sector, town, count(*) from public.verified_employer_sources group by 1,2 order by 3 desc limit 10;

-- ============================ 28-website-finder ============================
-- 28: Website finder for Employer Sources (suggest, then you approve). Run after 27. Safe to run twice.
alter table public.verified_employer_sources add column if not exists website_candidate text;
alter table public.verified_employer_sources add column if not exists website_confidence text;
alter table public.verified_employer_sources add column if not exists website_status text;      -- suggested | approved | rejected | none
alter table public.verified_employer_sources add column if not exists website_checked_at timestamptz;

-- Counts searches per month so the free allowance (2,000) is never exceeded. Server-only table.
create table if not exists public.search_usage (month text primary key, used integer not null default 0);
alter table public.search_usage enable row level security;
revoke all on public.search_usage from anon, authenticated;

-- Keep the new columns away from members, like the other outreach columns.
do $$
declare cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'verified_employer_sources'
    and column_name not in ('invitation_status','invited_at','linked_user_id','added_by','last_scraped_at','last_scrape_status','contact_email','sector','town','website_candidate','website_confidence','website_status','website_checked_at');
  execute 'revoke select on public.verified_employer_sources from anon, authenticated';
  execute format('grant select (%s) on public.verified_employer_sources to authenticated', cols);
end $$;
select count(*) as sources from public.verified_employer_sources;


-- ============================ 29-newsletter-confirmation ============================
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


-- ============================ 30-audience-reconcile-and-register-rule ============================
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

-- ============================ 31-newsletter-preferences ============================
-- 31: Keep the topic choices people tick on the newsletter form (they were collected but never saved). Safe to run more than once.
alter table public.newsletter_subscribers add column if not exists preferences jsonb;
select count(*) as subscribers, count(preferences) as with_saved_topics from public.newsletter_subscribers;

-- ============================ 32-nz-list-wording ============================
-- 32: Honest wording for the New Zealand list: it is a snapshot, not the live register. Safe to run more than once.
update public.employer_registers
   set caveat = 'This is a snapshot taken from an official release on the date shown, not the live register. Accreditation can expire or be revoked, so an employer shown may no longer be accredited, and new employers may be missing. Check the live search on the Immigration New Zealand website before you accept any offer.'
 where key = 'nz-accredited';
select key, loaded_on, left(caveat, 60) as caveat from public.employer_registers where key = 'nz-accredited';

-- ============================ 33-clean-suspected-bot-subscribers ============================
-- 33-clean-suspected-bot-subscribers.sql
-- ONE-OFF CLEAN-UP of the newsletter list (4 Nov 2026). Safe to run again.
--
-- WHY: on 4 Nov the list was reviewed address by address. Apart from 3 genuine people, the sign-ups were automated or
-- scraped addresses: random-looking names, Gmail addresses with many dots, phone text-message addresses, and unrelated
-- business addresses from other countries. None of the old active rows were ever confirmed by their owner.
--
-- WHAT IT DOES: every address signed up BEFORE 5 Nov 2026 that has not confirmed, has no member account, and is not on
-- the keep list below is set to 'blocked' and added to the do-not-email list. Nothing is deleted, so it is fully
-- reversible and the address cannot be used to flood anyone. Members, confirmed subscribers and the keep list are untouched.
-- Anyone who signed up on or after 5 Nov is never touched by this file, so re-running it later is harmless.
--
-- BEFORE YOU RUN: if you recognise any other address on the Subscribers page as a real person, add it to the keep list.

do $$
declare
  keep text[] := array[
    'philipjonah4@gmail.com',
    'murtalamary8@gmail.com',
    'shuaibuabdullahiyakubu566@gmail.com'
  ];
  cutoff timestamptz := timestamptz '2026-11-05 00:00:00+00';
  n_block int := 0;
  n_keep  int := 0;
begin
  -- make sure anyone who already has an account is linked, so they are protected below
  perform public.link_subscribers_to_members();

  create temp table _bot_rows on commit drop as
  select s.email
    from public.newsletter_subscribers s
   where s.status in ('active', 'pending')
     and s.user_id is null
     and s.confirmed_at is null
     and s.subscribed_at < cutoff
     and lower(s.email) <> all (keep)
     and not exists (select 1 from public.profiles p where lower(p.email) = lower(s.email));

  insert into public.email_suppression (email, reason, source)
  select lower(email), 'blocked_bot_suspected_2026-11-04', 'bot_cleanup' from _bot_rows
  on conflict (email) do nothing;

  update public.newsletter_subscribers s
     set status = 'blocked'
   where s.email in (select email from _bot_rows);
  get diagnostics n_block = row_count;

  select count(*) into n_keep from public.newsletter_subscribers
   where status = 'active' and (user_id is not null or confirmed_at is not null or lower(email) = any (keep));

  raise notice 'Blocked % suspected automated addresses. Kept % genuine active subscribers.', n_block, n_keep;
end $$;

-- The picture afterwards (this is the table you will see):
select status, count(*) as people from public.newsletter_subscribers group by status order by status;

-- To reverse one address (only if a real person was caught by mistake):
--   delete from public.email_suppression where email = 'person@example.com' and source = 'bot_cleanup';
--   update public.newsletter_subscribers set status = 'active' where email = 'person@example.com';

-- ============================ 34-block-random-name-signups ============================
-- 34-block-random-name-signups.sql
-- Follow-up to file 33 (6 Nov 2026). Safe to run again.
-- The sign-up bots changed their pattern: new "pending" rows with a random 10-character name such as bu6w8q942G or
-- Vm0owUyd7d. No real person's name is a single word of letters mixed with digits (or with several capitals inside it).
-- This sets any unconfirmed, account-less subscriber with such a name to 'blocked' and adds the address to the do-not-email
-- list. Nothing is deleted, members and confirmed subscribers are never touched, and the keep list below is protected.
-- Reverse one address: delete it from public.email_suppression (source 'bot_cleanup') and set its status back to 'pending'.

do $$
declare
  keep text[] := array['philipjonah4@gmail.com', 'murtalamary8@gmail.com', 'shuaibuabdullahiyakubu566@gmail.com'];
  n int := 0;
begin
  perform public.link_subscribers_to_members();

  create temp table _random_names on commit drop as
  select s.email
    from public.newsletter_subscribers s
   where s.status in ('pending', 'active')
     and s.user_id is null
     and s.confirmed_at is null
     and lower(s.email) <> all (keep)
     and s.name ~ '^[A-Za-z0-9]{8,16}$'
     and ( (s.name ~ '[0-9]' and s.name ~ '[A-Za-z]')
        or length(regexp_replace(substr(s.name, 2), '[^A-Z]', '', 'g')) >= 2 )
     and not exists (select 1 from public.profiles p where lower(p.email) = lower(s.email));

  insert into public.email_suppression (email, reason, source)
  select lower(email), 'blocked_random_name_signup_2026-11-06', 'bot_cleanup' from _random_names
  on conflict (email) do nothing;

  update public.newsletter_subscribers s set status = 'blocked' where s.email in (select email from _random_names);
  get diagnostics n = row_count;
  raise notice 'Blocked % more suspected automated sign-ups.', n;
end $$;

select status, count(*) as people from public.newsletter_subscribers group by status order by status;

-- ============================ FINAL CHECK (read this result) ============================
select 'members cannot read' as what, c.column_name, has_column_privilege('authenticated','public.verified_employer_sources',c.column_name,'select') as members_can_read
from information_schema.columns c where c.table_schema='public' and c.table_name='verified_employer_sources'
  and c.column_name in ('invitation_status','contact_email','sector','town','website_candidate','company_name')
union all
select 'official list: '||key, country_code||' rows='||row_count, loaded_on is not null from public.employer_registers
order by 1,2;

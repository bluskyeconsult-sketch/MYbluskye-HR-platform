# ODUSBABA Update 2: what to do, in order

## Step 1: upload the code to GitHub (22 files)
Keep each file's folder. Upload, commit, and let Vercel redeploy.
- api/index.js
- api/_lib/websiteFinder.js (new)
- vercel.json
- src/App.jsx
- src/services/rssJobService.js
- src/components/VisitorEngagementPrompt.jsx
- src/components/NewsletterOptIn.jsx (new)
- src/components/admin/AdminLayout.jsx
- src/components/admin/NewsletterAudiencePanel.jsx (new)
- src/pages/CareRelocationPage.jsx
- src/pages/JobDetailPage.jsx
- src/pages/JobsPage.jsx
- src/pages/NewsletterPage.jsx
- src/pages/SignInPage.jsx (resend-confirmation now sends the human-check token)
- src/pages/SignUpPage.jsx
- src/pages/UserSettings.jsx
- src/pages/admin/AdminDataFreshness.jsx (new)
- src/pages/admin/AdminFindWebsites.jsx (new)
- src/pages/admin/AdminLmiaExplorer.jsx (new)
- src/pages/admin/AdminNewsletterSubscribers.jsx (new)
- src/pages/admin/EmployerSourcesManager.jsx
- src/pages/admin/ExternalJobsManager.jsx
- src/pages/admin/NewsletterAdmin.jsx (preview now matches the real email)

## Step 2: run the database file (Supabase > SQL Editor)
Run 2-run-in-supabase/ALL-SQL-01-to-34-COMPLETE-SAFE-TO-RERUN.sql once. It holds files 01 to 34 (except 19) in order and is safe to repeat. Run it BEFORE or right after the code upload, then test.
- 19-lock-job-insert-to-server.sql is separate. Already run on your database; keep it for reference.
- If you already ran an earlier version, run only 33-clean-suspected-bot-subscribers.sql and 34-block-random-name-signups.sql (both reversible; nothing is deleted).
- The separate numbered files are kept for reference only.

## Step 2b: switch on the human check (stops bots at the door)
The code is ready but does nothing until you add two free Cloudflare Turnstile keys: TURNSTILE_SECRET_KEY and VITE_TURNSTILE_SITE_KEY in Vercel, then redeploy.

## Step 3: Vercel settings (Settings > Environment Variables)
- BRAVE_SEARCH_API_KEY: only if you use Admin > Find Employer Websites. Never paste the key in a chat.
- SEARCH_MONTHLY_CAP (optional): lowers the monthly search limit (default 700, never above 900).

## Step 4: load the CSV files (admin pages)
- uk-licensed-sponsors-2026-10-30.csv: Admin > Employer Lists > United Kingdom
- canada-lmia-employers-2026-Q2.csv and new-zealand-accredited-employers-not-expired.csv: already loaded (Employer Lists)
- canada-lmia-FULL-2026-Q2-for-explorer.csv: Admin > LMIA Explorer
- employer-sources-wave1-birmingham.csv, wave2-manchester.csv, wave2-oxford.csv: Admin > Employer Sources > Bulk Import, once each
- canada-care-employers-recruiting-from-abroad-2026-Q2.csv: research only, do not upload

## Step 5: test
1. Subscribe with a second email on the Newsletter page: you should get a confirmation email, then a welcome email after clicking. The page and confirmation page recommend a free account.
2. Register with a second email with the newsletter box ticked: confirm it, then check Admin > Subscribers.
3. Admin > Newsletter: the Audience panel numbers should add up. Press "Invite subscribers to register" only when you are happy with the email wording.
4. Settings has a newsletter on/off switch for members.

## Notes
- Newsletter rule: everyone keeps the newsletter. A free account is strongly recommended, never required. Blocking (abuse only) is the only removal.
- 3-read-only-checks: optional checks that change nothing (reconcile-newsletter-subscribers.sql shows the subscriber picture).
- The New Zealand list is a June 2025 snapshot. A newer one needs an Official Information Act request.


## Added 6 November 2026 (second drop)
- api/index.js: analytics ignores unidentified-desktop crawler visits; AI chat visa notes refreshed (UK earned settlement announced 2 Nov 2026, NZ, Australia).
- src/pages/admin/AnalyticsDashboard.jsx: "Hide likely crawlers" tick box (on by default); average time is in minutes.
- vercel.json: permanent redirects from old blog tag/category/author/feed links to /blog.
- src/pages/VisaPathwaysPage.jsx: UK, NZ, Australia facts refreshed; last checked 6 November 2026.
- 3-read-only-checks/35-list-article-slugs-for-redirects.sql: run it and send me the result so old blog posts can be redirected to the right articles.
After deploying, open Admin > Data freshness and press "I checked this today" on UK immigration rules and AI chat facts.
- src/pages/CareRelocationPage.jsx: Canada, Australia, New Zealand and Ireland facts refreshed on 6 November 2026 (NZ care visa conditions now read from the official page).
- Legal-Pages-Update-Wording-2026-11-06.md: new Privacy, Cookie and Terms wording (Turnstile, newsletter confirmation, suppression list, analytics, automated access, immigration disclaimer). Needs a solicitor read before it goes live.
- src/pages/legal/TermsPage.jsx, PrivacyPage.jsx, CookiesPage.jsx: updated 6 November 2026 (newsletter confirmation, Brevo and Cloudflare as providers, suppression list, human check, automated sign-ups, immigration disclaimer). Have a solicitor read them.
- src/components/admin/AdminLayout.jsx: amber asterisk and count on admin menu items that have something waiting (external jobs pending, employer verification, fraud reports, refund requests, support tickets, affiliate withdrawals, employer jobs, Keep Up To Date), plus the existing Inbox count. No SQL needed.

## Added 8 November 2026 (Vercel 5xx alert fix)
- api/cron/*.js (7 files): the scheduled jobs now use SUPABASE_URL or, if that is missing, VITE_SUPABASE_URL. Their missing SUPABASE_URL made sync-mailboxes (every 5 minutes) and publish-scheduled-articles (every 15 minutes) fail with errors. Quickest fix with no upload: add SUPABASE_URL in Vercel with the same value as VITE_SUPABASE_URL, then redeploy.
- 2-run-in-supabase/36-allow-all-security-event-types.sql: removes the old rule that rejected security events so they are saved again.
- api/index.js (8 Nov, second change): requests with no body (a scanner probing ?action=...) get a 400 instead of crashing with a 500.

## 9 Nov 2026 addition: Canada Rural Community Immigration directory
- src/pages/CareRelocationPage.jsx: new RCIP facts (permanent program announced 9 Nov), and a directory of the 14 communities with links to each community's own employer page. No national list exists, so names are not copied.
- Eleven communities still have no confirmed official page (edit RCIP_COMMUNITIES: move the link from news to official). Sudbury page explains designation only. Timmins PDF is old.
- api/index.js: AI chat notes gain the RCIP facts.

## 9 Nov 2026 (evening): confirmation pass
- Skilled Worker 41,700 pounds (new entrant 33,400): two independent sources agree (NHS Employers, Davidson Morris). Care route closure 22 July 2025 and switching to 22 July 2028: Pinsent Masons. gov.uk could not be opened, so the pages say so.
- Australia: charge AUD 4,015 (adult), 1,005 (under 18) and thresholds AUD 79,423 / 146,576 confirmed by two law-firm alerts. Pages now say "law-firm alerts".
- RCIP directory: North Bay, Brandon, Moose Jaw, Peace Liard now link to official program sites. Still on news reports: Pictou, Sault Ste. Marie, Steinbach, Altona/Rhineland, West Kootenay, North Okanagan Shuswap, Thunder Bay.
- Files changed: src/pages/CareRelocationPage.jsx, src/pages/VisaPathwaysPage.jsx (and visa/ copy), api/index.js.

## 9 Nov 2026 (night): three-door homepage
- src/pages/HomePage.jsx: new "What do you need today?" block under the hero (Find a job, Check before you act, Learn and grow) plus a three-point trust strip. Links: /jobs, /care-relocation, /visa-pathways, /courses, /blog.
- Removed invented fallback numbers (125 users, 82 jobs, 15 courses, 8 assessments). If the stats request fails the numbers section now hides.
- Plainer wording: "Platform numbers, not estimates", "Active listings", "Available to take".
- Softened claims we cannot show: verified skills, instant matching, verified candidates, "learns from every interaction".

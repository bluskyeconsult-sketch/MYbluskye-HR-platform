// src/services/inviteEmailTemplates.js
//
// Tier-specific invitation emails (v2, 2026-10-07).
// REWRITTEN (2026-10-19): professional, organisation-voice copy that opens with the problem a reader
// faces and then shows what ODUSBABA provides. No first-person founder voice. Facts are unchanged.
//
// SOURCES OF TRUTH - so nothing here silently drifts from the real product:
//  * AI-credit numbers are passed in from the backend's TIER_MONTHLY_ALLOWANCE
//    (never typed here), so an email can't promise more than is granted.
//  * PLAN_FACTS below mirrors PricingPage.jsx (prices + limits). If you
//    change a price or limit on the Pricing page, change it HERE too -
//    it is the ONLY place in the email copy that holds them.
//  * Feature descriptions mirror ProductsPage.jsx (CV Optimizer, Cover
//    Letter Writer, Salary Coach, 24/7 chat, certificates, 8 countries...).
//
// SECURITY: every admin-editable string is HTML-escaped before it enters
// the email, so a typo or pasted snippet can never inject markup/scripts.

import { AFFILIATE_PLAN } from './affiliatePlan.js';

export const INVITE_TIERS = ['job_seeker', 'professional', 'employer', 'business'];

export const TIER_LABELS = {
    job_seeker: 'Job Seeker (Registered / Free)',
    professional: 'Professional',
    employer: 'Employer',
    business: 'Business'
};

// Mirrors PricingPage.jsx. USD.
export const PLAN_FACTS = {
    job_seeker:   { plan: 'Registered',   price: 'Free',                                  assessments: 10,  applications: 'Unlimited', saved: 'Unlimited', alerts: 'Unlimited',  skills: '3 submissions' },
    professional: { plan: 'Professional', price: '$39.99 / month  ·  $399.99 / year',     assessments: 50,  applications: 'Unlimited', saved: 'Unlimited', alerts: 'Unlimited', skills: 'Unlimited' },
    employer:     { plan: 'Employer',     price: '$199.99 / month  ·  $1,999.99 / year',  assessments: 30,  posts: '20 jobs / month', alerts: '10 alerts' },
    business:     { plan: 'Business',     price: '$549.99 / month  ·  $5,499.99 / year',  assessments: 100, posts: 'Unlimited', seats: '5 users', alerts: 'Unlimited' }
};

// Employer: cost per job post if all 20 monthly posts are used (derived, never typed).
export const EMPLOYER_PER_POST = Math.round(199.99 / 20);

export function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const WHO = `ODUSBABA is an AI-powered HR and career platform from BluSkye Integrated Consult.`;

export function getTierDefaults(tier, { credits = {} } = {}) {
    const c = (k) => credits[k] ?? '';
    const f = PLAN_FACTS;
    const defaults = {
        job_seeker: {
            subject: 'Job searching is easier with the right tools in one place',
            preheader: 'Verified jobs, AI CV and cover letter tools, a 24/7 career advisor and certificates. Free to join.',
            headline: 'A smarter, safer way to find your next role',
            intro: `Hello {{firstName}},\n\nA job search usually means scattered listings, uncertainty about which employers are genuine, and no clear way to see how your CV measures up.\n\n${WHO} It brings verified opportunities, practical AI tools and structured learning together, so every step of the search is easier to manage. A free account takes about a minute to create.`,
            bullets: [
                { title: 'Verified jobs, fewer dead ends', text: 'Browse opportunities from trusted employers and official government portals across 8 countries, including sponsor-verified employers.' },
                { title: 'A stronger CV and cover letter', text: `AI assistants for the CV Optimizer, Cover Letter Writer, Salary Coach and LinkedIn makeover, with ${c('registered')} free AI credits every month.` },
                { title: 'Guidance whenever it is needed', text: 'ODUSBABA Chat is available 24/7 for job questions, CV tips, interview preparation and salary negotiation.' },
                { title: 'Clarity on strengths and next steps', text: `Psychometric and skills assessments (${f.job_seeker.assessments} included) that highlight strengths, skill gaps and career matches.` },
                { title: 'Skills you can prove', text: 'Practical, AI-assisted courses with verifiable certificates that can be shared on LinkedIn.' },
                { title: 'Protection from job scams', text: 'Employer verification, fraud reporting and safety guidance support confident applications.' }
            ],
            stepsTitle: 'Get started in 3 steps',
            steps: [
                { title: 'Create a free account', text: 'It takes about a minute.' },
                { title: 'Complete the profile and run the CV Optimizer', text: 'A stronger CV is the quickest improvement to a search.' },
                { title: 'Set job alerts and start applying', text: 'New openings are delivered as they appear.' }
            ],
            snapshot: {
                title: 'What a free account includes',
                rows: [
                    { label: 'Price', value: f.job_seeker.price },
                    { label: 'Job applications', value: f.job_seeker.applications },
                    { label: 'AI credits', value: `${c('registered')} every month` },
                    { label: 'Assessments', value: `${f.job_seeker.assessments} included` },
                    { label: 'Saved jobs / job alerts', value: `${f.job_seeker.saved} / ${f.job_seeker.alerts}` },
                    { label: 'Newsletter and articles', value: 'Included' }
                ],
                note: 'Additional tools are available by upgrading to Professional at any time.'
            },
            closing: `There is no cost to join. Questions are welcome: reply to this email and the ODUSBABA team will respond.`,
            ps: `Tip: the CV Optimizer is the quickest way to see what ODUSBABA can do for an application.`,
            ctaLabel: 'Create a free account'
        },

        professional: {
            subject: 'Make your skills visible and credible to employers',
            preheader: 'Unlimited applications, a visible Trust Score, verified skills and direct access to professionals.',
            headline: 'Turn experience into verified credibility',
            intro: `Hello {{firstName}},\n\nStrong experience can still go unnoticed when employers have no way to verify it.\n\n${WHO} The Professional plan addresses this directly: skills are authenticated through AI and human review, a visible Trust Score gives employers confidence, and a verified professional network keeps opportunities coming.`,
            bullets: [
                { title: 'Unlimited applications, saved jobs and alerts', text: 'Apply as widely as the search requires and stay on top of every relevant opening.' },
                { title: 'A visible Trust Score', text: 'Every skill is authenticated through AI and human review, so employers see proof, not just claims.' },
                { title: 'A network of verified professionals', text: 'Message and build relationships with professionals across the Workforce Marketplace worldwide.' },
                { title: 'High-capacity AI support', text: `${c('professional')} AI credits every month for the CV Optimizer, Cover Letter Writer, Salary Coach and LinkedIn makeover, plus a 24/7 AI career advisor.` },
                { title: `${f.professional.assessments} assessments a month`, text: 'Psychometric and skills evaluations that sharpen positioning and reveal skill gaps.' },
                { title: 'Unlimited skill submissions', text: 'The profile stays current as the career grows, with no cap.' },
                { title: 'Certified learning and an affiliate programme', text: 'Courses with verifiable certificates, plus commission when referred people join.' }
            ],
            stepsTitle: 'How to begin',
            steps: [
                { title: 'Create a free account', text: 'Everything on the free Registered plan can be explored first.' },
                { title: 'Build the profile and submit skills', text: 'This starts a Trust Score that employers can see.' },
                { title: 'Upgrade to Professional when ready', text: `Unlock unlimited skills, networking and ${c('professional')} AI credits.` }
            ],
            snapshot: {
                title: 'Professional plan at a glance',
                rows: [
                    { label: 'Price', value: f.professional.price },
                    { label: 'Job applications', value: f.professional.applications },
                    { label: 'Skill submissions', value: f.professional.skills },
                    { label: 'Contact professionals', value: 'Yes' },
                    { label: 'AI credits', value: `${c('professional')} every month` },
                    { label: 'Assessments', value: `${f.professional.assessments} included` },
                    { label: 'Saved jobs / job alerts', value: `${f.professional.saved} / ${f.professional.alerts}` }
                ],
                note: 'Start free as a Registered member and upgrade only when the extra capability is needed.'
            },
            closing: `Questions about which plan fits? Reply to this email and the ODUSBABA team will help.`,
            ps: `The first step costs nothing: create the free account, explore, and decide afterwards.`,
            ctaLabel: 'Explore ODUSBABA'
        },

        employer: {
            subject: 'Hiring with less admin: posting, applicants and screening in one place',
            preheader: 'Post up to 20 jobs a month, manage applicants in one place and screen with assessments.',
            headline: 'Hire with less admin and more confidence',
            intro: `Hello {{firstName}},\n\nRecruitment often means paying per listing, juggling inboxes and spreadsheets, and screening applicants without a consistent method.\n\n${WHO} For hiring teams it brings job posting, applicant management and AI-assisted screening into one platform, with employer verification built in so candidates trust the listing and employers can trust the candidates.\n\nPosting 20 jobs a month on the Employer plan works out at about $${EMPLOYER_PER_POST} per post, and the platform can be explored with a free account before any commitment.`,
            bullets: [
                { title: 'Post up to 20 jobs a month', text: 'Reach candidates without paying per listing.' },
                { title: 'Every applicant in one place', text: 'Review and manage applications without juggling inboxes and spreadsheets.' },
                { title: 'A company profile that builds trust', text: 'Candidates see who you are before they apply, on a platform that verifies employers.' },
                { title: 'Consistent, objective screening', text: `${f.employer.assessments} assessments a month to compare candidates on skills and personality.` },
                { title: 'AI support for hiring tasks', text: `${c('employer')} AI credits every month for AI assistants and the 24/7 ODUSBABA advisor.` },
                { title: 'Direct access to verified professionals', text: 'Contact skilled, verified professionals through the Workforce Marketplace, and set up to 10 job alerts.' },
                { title: 'A safer hiring environment', text: 'Employer verification, fraud reporting and clear safety guidance protect your brand and your candidates.' }
            ],
            stepsTitle: 'A simple first week',
            steps: [
                { title: 'Create a free account', text: 'Explore the platform before committing to a plan.' },
                { title: 'Set up the company profile', text: 'This is what candidates see first.' },
                { title: 'Post the first job on the Employer plan', text: 'Then review applicants in one place.' }
            ],
            snapshot: {
                title: 'Employer plan at a glance',
                rows: [
                    { label: 'Price', value: f.employer.price },
                    { label: 'Job posts', value: f.employer.posts },
                    { label: 'Cost per post (using all 20)', value: `about $${EMPLOYER_PER_POST}` },
                    { label: 'View and manage applicants', value: 'Yes' },
                    { label: 'Company profile', value: 'Yes' },
                    { label: 'AI credits', value: `${c('employer')} every month` },
                    { label: 'Assessments', value: `${f.employer.assessments} included` },
                    { label: 'Job alerts', value: f.employer.alerts }
                ],
                note: 'Start with a free account to explore. Upgrade when ready to post.'
            },
            closing: `Reply to this email with the roles you are hiring for and the ODUSBABA team will help you get set up.`,
            ps: `A free account allows the platform to be explored before choosing a plan.`,
            ctaLabel: 'See how ODUSBABA supports hiring'
        },

        business: {
            subject: 'One platform for continuous, team-based hiring',
            preheader: 'Unlimited postings, team seats, API access and high-volume AI, with dedicated support.',
            headline: 'One platform for the whole hiring operation',
            intro: `Hello {{firstName}},\n\nOrganisations that hire continuously need their team, their data and their tools working together rather than in separate systems.\n\n${WHO} The Business plan is designed for exactly that: unlimited postings, shared team access, API connectivity and high-volume AI support under one roof.\n\nReply to this email to arrange a walkthrough for your team.`,
            bullets: [
                { title: 'Unlimited job postings', text: 'Hire at the pace the business needs, with no posting caps.' },
                { title: 'A shared workspace for the team', text: 'Team accounts for up to 5 users, all working from one place.' },
                { title: 'API access', text: 'Connect ODUSBABA to the systems and workflows already in use.' },
                { title: 'High-volume AI support', text: `${c('business')} AI credits every month for AI assistants and the 24/7 ODUSBABA advisor.` },
                { title: `${f.business.assessments} assessments a month`, text: 'Standardised skills and psychometric screening across every hire.' },
                { title: 'Applicants, company profile and unlimited alerts', text: 'Everything in the Employer plan, without the limits.' },
                { title: 'Dedicated support', text: 'Business customers receive dedicated support, and a walkthrough can be arranged by replying to this email.' }
            ],
            stepsTitle: 'A simple way to start',
            steps: [
                { title: 'Create a free account', text: 'Explore the platform with no commitment.' },
                { title: 'Reply to arrange a walkthrough', text: 'The ODUSBABA team will show how it fits your hiring process.' },
                { title: 'Roll out to the team', text: 'Add colleagues and start posting.' }
            ],
            snapshot: {
                title: 'Business plan at a glance',
                rows: [
                    { label: 'Price', value: f.business.price },
                    { label: 'Job posts', value: f.business.posts },
                    { label: 'Team accounts', value: f.business.seats },
                    { label: 'API access', value: 'Yes' },
                    { label: 'AI credits', value: `${c('business')} every month` },
                    { label: 'Assessments', value: `${f.business.assessments} included` },
                    { label: 'Job alerts', value: f.business.alerts }
                ],
                note: 'Not sure which plan fits? Reply and the team will work it out with you.'
            },
            closing: `Reply to this email and the ODUSBABA team will show where the platform can save your organisation time.`,
            ps: `A short walkthrough is usually enough to judge the fit. Reply to this email to arrange one.`,
            ctaLabel: 'Explore the Business plan'
        }
    };
    return defaults[tier] || null;
}

export const REMINDER_INTRO = `Hello {{firstName}},\n\nA brief, one-time reminder of the ODUSBABA invitation, in case it was missed. There is no obligation. If it looks useful, here is the short version again:`;

function textToHtml(text) {
    return escapeHtml(text).split(/\n{2,}/).map(p => `<p style="margin:0 0 16px;line-height:1.65;color:#334155;font-size:16px;">${p.replace(/\n/g, '<br>')}</p>`).join('');
}

function personalise(str, firstName) {
    return String(str ?? '').replace(/\{\{\s*firstName\s*\}\}/gi, firstName || 'there');
}

export function renderInviteEmail({ content, firstName, signupUrl, unsubscribeUrl, testerCode, postalAddress, isReminder = false, siteUrl, tier = '', testingMode = false, senderName = 'ODUSBABA Team', senderTitle = 'BluSkye Integrated Consult' }) {
    const name = firstName ? String(firstName).slice(0, 60) : '';
    const subject = personalise(isReminder ? `Reminder: ${content.subject}` : content.subject, name).replace(/[\r\n]+/g, ' ').slice(0, 200); // header-injection safe
    const headline = personalise(content.headline, name);
    const preheader = personalise(isReminder ? 'A short, one-time reminder of your ODUSBABA invitation.' : (content.preheader || content.headline), name);
    const intro = personalise(isReminder ? REMINDER_INTRO : content.intro, name);
    const closing = personalise(content.closing || '', name);
    const ps = isReminder ? '' : personalise(content.ps || '', name);
    const allBullets = Array.isArray(content.bullets) ? content.bullets.slice(0, 8) : [];
    const bullets = isReminder ? allBullets.slice(0, 3) : allBullets;
    const steps = isReminder ? [] : (Array.isArray(content.steps) ? content.steps.slice(0, 5) : []);
    const snapshot = isReminder ? null : content.snapshot;
    const ctaLabel = content.ctaLabel || 'Create my account';

    // ---- Automatic blocks. These are NOT editable text on purpose: they are
    // generated from live system state so they can never go stale.
    const plan = PLAN_FACTS[tier];
    const paidTier = tier === 'professional' || tier === 'employer' || tier === 'business';
    const showTesting = !isReminder && testingMode && paidTier && plan;
    const testingText = showTesting ? `While ODUSBABA is in its testing phase you can try the ${plan.plan} plan at no cost. Standard plan prices, shown above, apply once testing ends.` : '';
    const affiliateTitle = 'Refer people and earn';
    const affiliateText = testingMode
        ? `ODUSBABA has a referral programme: you earn ${AFFILIATE_PLAN.firstPaymentPct}% of a referred person's first payment, plus ${AFFILIATE_PLAN.recurringPct}% of every renewal for as long as they stay subscribed. While we are in the testing phase every plan is free, so there is no commission yet. Your referrals are still recorded, and commission switches on automatically once paid plans go live.`
        : `Share your personal referral link from your dashboard and earn ${AFFILIATE_PLAN.firstPaymentPct}% of the first payment of everyone who subscribes, plus ${AFFILIATE_PLAN.recurringPct}% of every renewal for as long as they stay subscribed.`;

    const section = (title) => `<div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:#0f766e;margin:0 0 10px;">${escapeHtml(title)}</div>`;

    const bulletsHtml = bullets.map(b => `
        <tr><td style="padding:9px 0;vertical-align:top;width:30px;"><div style="width:22px;height:22px;border-radius:11px;background:#10b981;color:#fff;font-size:13px;line-height:22px;text-align:center;font-weight:bold;">&#10003;</div></td>
        <td style="padding:9px 0;"><div style="font-weight:700;color:#0B3C5D;font-size:15px;">${escapeHtml(personalise(b.title, name))}</div><div style="color:#475569;font-size:14px;line-height:1.55;margin-top:2px;">${escapeHtml(personalise(b.text, name))}</div></td></tr>`).join('');

    const stepsHtml = steps.length ? `
  <tr><td style="padding:22px 32px 0;">${section(content.stepsTitle || 'Get started')}
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${steps.map((s, i) => `
        <tr><td style="padding:7px 0;vertical-align:top;width:34px;"><div style="width:26px;height:26px;border-radius:13px;background:#0B3C5D;color:#fff;font-size:13px;line-height:26px;text-align:center;font-weight:bold;">${i + 1}</div></td>
        <td style="padding:7px 0;"><div style="font-weight:700;color:#0B3C5D;font-size:15px;">${escapeHtml(s.title)}</div>${s.text ? `<div style="color:#475569;font-size:14px;line-height:1.55;margin-top:1px;">${escapeHtml(s.text)}</div>` : ''}</td></tr>`).join('')}
     </table></td></tr>` : '';

    const rows = snapshot && Array.isArray(snapshot.rows) ? snapshot.rows.slice(0, 10) : [];
    const snapshotHtml = rows.length ? `
  <tr><td style="padding:22px 32px 0;">${section(snapshot.title || 'At a glance')}
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;border-collapse:separate;overflow:hidden;">
        ${rows.map((r, i) => `<tr style="background:${i % 2 ? '#ffffff' : '#f8fafc'};"><td style="padding:10px 14px;color:#64748b;font-size:14px;width:46%;">${escapeHtml(r.label)}</td><td style="padding:10px 14px;color:#0B3C5D;font-size:14px;font-weight:700;">${escapeHtml(r.value)}</td></tr>`).join('')}
     </table>${snapshot.note ? `<div style="color:#64748b;font-size:13px;margin-top:8px;">${escapeHtml(snapshot.note)}</div>` : ''}</td></tr>` : '';

    const codeHtml = testerCode ? `
        <div style="margin:22px 0 0;padding:14px 16px;background:#f0fdf4;border:1px dashed #10b981;border-radius:10px;text-align:center;">
            <div style="font-size:12px;color:#047857;text-transform:uppercase;letter-spacing:1px;">Your personal invite code</div>
            <div style="font-size:22px;font-weight:700;letter-spacing:3px;color:#0B3C5D;margin-top:4px;">${escapeHtml(testerCode)}</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px;">It will be filled in for you when you click the button.</div>
        </div>` : '';

    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,.08);">
  <tr><td style="background:linear-gradient(135deg,#0B3C5D 0%,#0f766e 100%);padding:34px 32px;">
     <div style="color:#a7f3d0;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:700;">ODUSBABA</div>
     <div style="color:#ffffff;font-size:26px;line-height:1.25;font-weight:800;margin-top:8px;">${escapeHtml(headline)}</div>
  </td></tr>
  <tr><td style="padding:30px 32px 8px;">${textToHtml(intro)}</td></tr>
  <tr><td style="padding:0 32px;">${isReminder ? '' : section('Why people use ODUSBABA')}<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${bulletsHtml}</table></td></tr>
  ${stepsHtml}
  ${snapshotHtml}
  ${showTesting ? `<tr><td style="padding:22px 32px 0;"><div style="padding:14px 16px;background:#ecfdf5;border:1px solid #10b981;border-radius:10px;"><div style="font-weight:700;color:#047857;font-size:15px;">Free during our testing phase</div><div style="color:#065f46;font-size:14px;line-height:1.55;margin-top:3px;">${escapeHtml(testingText)}</div></div></td></tr>` : ''}
  ${isReminder ? '' : `<tr><td style="padding:16px 32px 0;"><div style="padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;"><div style="font-weight:700;color:#0B3C5D;font-size:15px;">${escapeHtml(affiliateTitle)}</div><div style="color:#475569;font-size:14px;line-height:1.55;margin-top:3px;">${escapeHtml(affiliateText)}</div></div></td></tr>`}
  <tr><td style="padding:26px 32px 6px;text-align:center;">
     <a href="${escapeHtml(signupUrl)}" style="display:inline-block;background:#0B3C5D;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:15px 34px;border-radius:10px;">${escapeHtml(ctaLabel)} &rarr;</a>
     ${codeHtml}
  </td></tr>
  <tr><td style="padding:22px 32px 6px;">${closing ? textToHtml(closing) : ''}<p style="margin:0 0 14px;color:#334155;font-size:16px;">Kind regards,<br><strong>${escapeHtml(senderName)}</strong><br><span style="color:#64748b;font-size:14px;">${escapeHtml(senderTitle)}</span></p>${ps ? `<p style="margin:0;color:#475569;font-size:14px;line-height:1.6;font-style:italic;">${escapeHtml(ps).replace(/\n/g, '<br>')}</p>` : ''}</td></tr>
  <tr><td style="padding:24px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
     <p style="margin:0 0 6px;color:#64748b;font-size:12px;line-height:1.6;">You are receiving this one-time invitation from BluSkye Integrated Consult because we believe ODUSBABA may be relevant to you. We will not add you to any mailing list unless you register.</p>
     ${postalAddress ? `<p style="margin:0 0 6px;color:#64748b;font-size:12px;">${escapeHtml(postalAddress)}</p>` : ''}
     <p style="margin:0;color:#64748b;font-size:12px;"><a href="${escapeHtml(unsubscribeUrl)}" style="color:#0f766e;">Unsubscribe</a> &middot; <a href="${escapeHtml(siteUrl || '')}" style="color:#0f766e;">${escapeHtml((siteUrl || '').replace(/^https?:\/\//, ''))}</a></p>
  </td></tr>
</table></td></tr></table></body></html>`;

    const text = [
        headline, '',
        intro, '',
        ...bullets.map(b => `- ${personalise(b.title, name)}: ${personalise(b.text, name)}`), '',
        ...(steps.length ? [content.stepsTitle || 'Get started', ...steps.map((s, i) => `${i + 1}. ${s.title}${s.text ? ' - ' + s.text : ''}`), ''] : []),
        ...(rows.length ? [snapshot.title || 'At a glance', ...rows.map(r => `${r.label}: ${r.value}`), snapshot.note || '', ''] : []),
        ...(showTesting ? ['FREE DURING OUR TESTING PHASE', testingText, ''] : []),
        ...(isReminder ? [] : [affiliateTitle.toUpperCase(), affiliateText, '']),
        `${ctaLabel}: ${signupUrl}`,
        testerCode ? `Your invite code: ${testerCode}` : '',
        '', closing, '', 'Kind regards,', senderName, senderTitle, '',
        ps, '',
        postalAddress || '',
        `Unsubscribe: ${unsubscribeUrl}`
    ].join('\n').replace(/\n{3,}/g, '\n\n');

    return { subject, html, text };
}

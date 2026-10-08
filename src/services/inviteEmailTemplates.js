// src/services/inviteEmailTemplates.js
//
// Tier-specific invitation emails (v2, 2026-10-07).
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

export const INVITE_TIERS = ['job_seeker', 'professional', 'employer', 'business'];

export const TIER_LABELS = {
    job_seeker: 'Job Seeker (Registered / Free)',
    professional: 'Professional',
    employer: 'Employer',
    business: 'Business'
};

// Mirrors PricingPage.jsx. USD.
export const PLAN_FACTS = {
    job_seeker:   { plan: 'Registered',   price: 'Free',                                  assessments: 10,  applications: 'Unlimited', saved: '10 jobs',  alerts: '3 alerts',  skills: '3 submissions' },
    professional: { plan: 'Professional', price: '$39.99 / month  ·  $399.99 / year',     assessments: 50,  applications: 'Unlimited', saved: 'Unlimited', alerts: 'Unlimited', skills: 'Unlimited' },
    employer:     { plan: 'Employer',     price: '$199.99 / month  ·  $1,999.99 / year',  assessments: 30,  posts: '20 jobs / month', alerts: '10 alerts' },
    business:     { plan: 'Business',     price: '$549.99 / month  ·  $5,499.99 / year',  assessments: 100, posts: 'Unlimited', seats: '5 users', alerts: 'Unlimited' }
};

export function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const WHO = `I'm Joseph Odugboye, founder of BluSkye Integrated Consult, and I built ODUSBABA, an AI-powered HR and career platform.`;

export function getTierDefaults(tier, { credits = {} } = {}) {
    const c = (k) => credits[k] ?? '';
    const f = PLAN_FACTS;
    const defaults = {
        job_seeker: {
            subject: '{{firstName}}, your free AI career toolkit is ready',
            preheader: 'Verified jobs, a 24/7 AI career advisor, CV tools and certificates. Free to join.',
            headline: 'Your next career move, with an AI in your corner',
            intro: `Hi {{firstName}},\n\n${WHO} I built it because too many capable people lose opportunities to a weak CV, a scam job advert, or simply not knowing where they stand.\n\nODUSBABA brings verified jobs, practical AI tools and real learning into one place. A free account takes about a minute, and I would love you to try it.`,
            bullets: [
                { title: 'Verified jobs, fewer dead ends', text: 'Browse opportunities from trusted employers and official government portals across 8 countries, including sponsor-verified employers.' },
                { title: 'AI career assistants', text: `A CV Optimizer, Cover Letter Writer, Salary Coach, LinkedIn makeover and more, with ${c('registered')} free AI credits every month.` },
                { title: 'ODUSBABA Chat, 24/7', text: 'Ask about jobs, CV tips, interview preparation or salary negotiation at any hour.' },
                { title: 'Know your strengths', text: `Psychometric and skills assessments (${f.job_seeker.assessments} included) that show your strengths, skill gaps and career matches.` },
                { title: 'Learn and get certified', text: 'Practical, AI-assisted courses with verifiable certificates you can share on LinkedIn.' },
                { title: 'Protected from scams', text: 'Employer verification, fraud reporting and safety guidance, so you can apply with confidence.' }
            ],
            stepsTitle: 'Get started in 3 steps',
            steps: [
                { title: 'Create your free account', text: 'It takes about a minute.' },
                { title: 'Complete your profile and try the CV Optimizer', text: 'A stronger CV is the fastest win.' },
                { title: 'Set job alerts and start applying', text: 'Let new openings come to you.' }
            ],
            snapshot: {
                title: 'What your free account includes',
                rows: [
                    { label: 'Price', value: f.job_seeker.price },
                    { label: 'Job applications', value: f.job_seeker.applications },
                    { label: 'AI credits', value: `${c('registered')} every month` },
                    { label: 'Assessments', value: `${f.job_seeker.assessments} included` },
                    { label: 'Saved jobs / job alerts', value: `${f.job_seeker.saved} / ${f.job_seeker.alerts}` },
                    { label: 'Newsletter and articles', value: 'Included' }
                ],
                note: 'Need more later? You can upgrade to Professional at any time.'
            },
            closing: `There is no cost to join. If you try it and have any thoughts, just reply to this email. I read every message.`,
            ps: `P.S. Not sure where to begin? Reply and tell me the role you are aiming for, and I will point you to the best first step.`,
            ctaLabel: 'Create my free account'
        },

        professional: {
            subject: '{{firstName}}, a platform built to make you stand out',
            preheader: 'Unlimited applications, a visible Trust Score, verified skills and a network that responds.',
            headline: 'Stand out where it counts',
            intro: `Hi {{firstName}},\n\n${WHO} The Professional plan is for people whose careers depend on being seen as credible: verified skills, a visible Trust Score, and a network that actually responds.\n\nI would love you to see the difference for yourself.`,
            bullets: [
                { title: 'Unlimited applications, saved jobs and alerts', text: 'Apply as widely as you like and never miss a relevant opening.' },
                { title: 'A visible Trust Score', text: 'Every skill is authenticated through AI and human review, so employers see proof, not just claims.' },
                { title: 'Connect with verified professionals', text: 'Message and build relationships with professionals across the Workforce Marketplace worldwide.' },
                { title: 'Serious AI firepower', text: `${c('professional')} AI credits every month for the CV Optimizer, Cover Letter Writer, Salary Coach, LinkedIn makeover and more, plus a 24/7 AI career advisor.` },
                { title: `${f.professional.assessments} assessments a month`, text: 'Psychometric and skills evaluations to sharpen your positioning and find skill gaps.' },
                { title: 'Unlimited skill submissions', text: 'Keep your profile current as you grow, with no cap.' },
                { title: 'Learn, certify and earn', text: 'Courses with verifiable certificates, plus an affiliate programme that pays commission when people you refer join.' }
            ],
            stepsTitle: 'How to begin',
            steps: [
                { title: 'Create your free account', text: 'You can explore everything on the free Registered plan first.' },
                { title: 'Build your profile and submit your skills', text: 'Start earning a Trust Score employers can see.' },
                { title: 'Upgrade to Professional when you are ready', text: `Unlock unlimited skills, networking and ${c('professional')} AI credits.` }
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
                note: 'Start free as a Registered member and upgrade only when you feel the difference.'
            },
            closing: `Questions about which plan fits you? Just reply to this email and I will help personally.`,
            ps: `P.S. Your first step costs nothing. Create the free account, look around, and decide afterwards.`,
            ctaLabel: 'Explore ODUSBABA'
        },

        employer: {
            subject: '{{firstName}}, hire faster with AI doing the heavy lifting',
            preheader: 'Post up to 20 jobs a month, manage applicants and screen smarter. Built to cost far less than job-board fees.',
            headline: 'Hire faster, with AI doing the heavy lifting',
            intro: `Hi {{firstName}},\n\n${WHO} For hiring teams it brings job posting, applicant management and AI-assisted screening into one place, with employer verification built in so candidates trust you and you can trust them.\n\nIt is priced to cost far less than traditional per-posting job-board fees, and I would like you to experience it first-hand.`,
            bullets: [
                { title: 'Post up to 20 jobs a month', text: 'Reach candidates without paying per listing.' },
                { title: 'Every applicant in one place', text: 'Review and manage applications without juggling inboxes and spreadsheets.' },
                { title: 'A company profile that builds trust', text: 'Show candidates who you are before they apply, within a platform that verifies employers.' },
                { title: 'Screen smarter with assessments', text: `${f.employer.assessments} assessments a month to compare candidates on skills and personality objectively.` },
                { title: 'AI that works on your hiring tasks', text: `${c('employer')} AI credits every month for AI assistants and the 24/7 ODUSBABA advisor.` },
                { title: 'Reach verified professionals', text: 'Contact skilled, verified professionals directly through the Workforce Marketplace, and set up to 10 job alerts.' },
                { title: 'A safer hiring environment', text: 'Employer verification, fraud reporting and clear safety guidance protect your brand and your candidates.' }
            ],
            stepsTitle: 'Your first week, simply',
            steps: [
                { title: 'Create your free account', text: 'Look around before you commit to anything.' },
                { title: 'Set up your company profile', text: 'This is what candidates see first.' },
                { title: 'Post your first job on the Employer plan', text: 'Then review applicants in one place.' }
            ],
            snapshot: {
                title: 'Employer plan at a glance',
                rows: [
                    { label: 'Price', value: f.employer.price },
                    { label: 'Job posts', value: f.employer.posts },
                    { label: 'View and manage applicants', value: 'Yes' },
                    { label: 'Company profile', value: 'Yes' },
                    { label: 'AI credits', value: `${c('employer')} every month` },
                    { label: 'Assessments', value: `${f.employer.assessments} included` },
                    { label: 'Job alerts', value: f.employer.alerts }
                ],
                note: 'Start with a free account to explore. Upgrade when you are ready to post.'
            },
            closing: `If you tell me the roles you are hiring for, I will gladly walk you through the best way to set them up.`,
            ps: `P.S. Just reply to this email with the roles you are hiring for and I will personally help you get your first posting live.`,
            ctaLabel: 'See what ODUSBABA can do for hiring'
        },

        business: {
            subject: '{{firstName}}, one platform for your whole hiring operation',
            preheader: 'Unlimited postings, team seats, API access and 200 AI credits a month, with a direct line to the founder.',
            headline: 'One platform for your whole hiring operation',
            intro: `Hi {{firstName}},\n\n${WHO} The Business plan is designed for organisations that hire continuously and want their team, their data and their AI tools working together, at a lower cost than traditional enterprise job boards.\n\nI would welcome the chance to show you around personally.`,
            bullets: [
                { title: 'Unlimited job postings', text: 'Hire at the pace your business needs, with no posting caps.' },
                { title: 'Bring your whole team', text: 'Team accounts for up to 5 users, all working from one place.' },
                { title: 'API access', text: 'Connect ODUSBABA to the systems and workflows you already use.' },
                { title: 'High-volume AI support', text: `${c('business')} AI credits every month for AI assistants and the 24/7 ODUSBABA advisor.` },
                { title: `${f.business.assessments} assessments a month`, text: 'Standardised skills and psychometric screening across every hire.' },
                { title: 'Applicants, company profile and unlimited alerts', text: 'Everything in the Employer plan, without the limits.' },
                { title: 'A direct line to the founder', text: 'Personal onboarding. Reply to this email and I will walk you and your team through it.' }
            ],
            stepsTitle: 'A simple way to start',
            steps: [
                { title: 'Create your free account', text: 'Explore the platform with no commitment.' },
                { title: 'Reply to book a personal walkthrough', text: 'I will show you how it fits your hiring process.' },
                { title: 'Roll out to your team', text: 'Add colleagues and start posting.' }
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
                note: 'Not sure which plan fits? Reply and we will work it out together.'
            },
            closing: `I would be glad to understand how your organisation hires today and show you where ODUSBABA can save you time and cost.`,
            ps: `P.S. A 20-minute walkthrough is usually enough to see if it fits. Just reply and suggest a time.`,
            ctaLabel: 'Explore the Business experience'
        }
    };
    return defaults[tier] || null;
}

export const REMINDER_INTRO = `Hi {{firstName}},\n\nA quick, one-time reminder in case my earlier invitation got buried. There is no pressure at all. If ODUSBABA looks useful, here is the short version again:`;

function textToHtml(text) {
    return escapeHtml(text).split(/\n{2,}/).map(p => `<p style="margin:0 0 16px;line-height:1.65;color:#334155;font-size:16px;">${p.replace(/\n/g, '<br>')}</p>`).join('');
}

function personalise(str, firstName) {
    return String(str ?? '').replace(/\{\{\s*firstName\s*\}\}/gi, firstName || 'there');
}

export function renderInviteEmail({ content, firstName, signupUrl, unsubscribeUrl, testerCode, postalAddress, isReminder = false, siteUrl }) {
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
  <tr><td style="padding:26px 32px 6px;text-align:center;">
     <a href="${escapeHtml(signupUrl)}" style="display:inline-block;background:#0B3C5D;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:15px 34px;border-radius:10px;">${escapeHtml(ctaLabel)} &rarr;</a>
     ${codeHtml}
  </td></tr>
  <tr><td style="padding:22px 32px 6px;">${closing ? textToHtml(closing) : ''}<p style="margin:0 0 14px;color:#334155;font-size:16px;">Warm regards,<br><strong>Joseph Odugboye</strong><br><span style="color:#64748b;font-size:14px;">Founder, BluSkye Integrated Consult</span></p>${ps ? `<p style="margin:0;color:#475569;font-size:14px;line-height:1.6;font-style:italic;">${escapeHtml(ps).replace(/\n/g, '<br>')}</p>` : ''}</td></tr>
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
        `${ctaLabel}: ${signupUrl}`,
        testerCode ? `Your invite code: ${testerCode}` : '',
        '', closing, '', 'Warm regards,', 'Joseph Odugboye', 'Founder, BluSkye Integrated Consult', '',
        ps, '',
        postalAddress || '',
        `Unsubscribe: ${unsubscribeUrl}`
    ].join('\n').replace(/\n{3,}/g, '\n\n');

    return { subject, html, text };
}

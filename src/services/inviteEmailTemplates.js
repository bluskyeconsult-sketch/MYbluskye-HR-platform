// src/services/inviteEmailTemplates.js
//
// NEW (2026-10-07): tier-specific invitation emails.
// Copy below reflects the real features on PricingPage.jsx. AI-credit
// numbers are NOT hardcoded here - they are passed in from the backend's
// TIER_MONTHLY_ALLOWANCE so the email can never promise more than the
// system actually grants. Other limits (assessments, job posts, seats)
// mirror PricingPage.jsx; if you change a limit there, update it here too.
//
// SECURITY: every admin-editable string is HTML-escaped before it is
// placed in the email, so an admin typo (or a pasted snippet) can never
// inject markup or scripts into what recipients receive.

export const INVITE_TIERS = ['job_seeker', 'professional', 'employer', 'business'];

export const TIER_LABELS = {
    job_seeker: 'Job Seeker (Registered / Free)',
    professional: 'Professional',
    employer: 'Employer',
    business: 'Business'
};

export function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const INTRO_SENDER = `I'm Joseph Odugboye, founder of BluSkye Integrated Consult, and I built ODUSBABA, an AI-powered HR and career platform.`;

export function getTierDefaults(tier, { credits = {} } = {}) {
    const c = (k) => credits[k] ?? '';
    const defaults = {
        job_seeker: {
            subject: '{{firstName}}, your free AI career toolkit is ready',
            headline: 'Your next career move, with an AI in your corner',
            intro: `Hi {{firstName}},\n\n${INTRO_SENDER} It was made for people who are serious about moving forward, whether that means a better role, a new country or a stronger CV.\n\nCreating a free account takes about a minute, and you can start using it straight away.`,
            bullets: [
                { title: 'Jobs worth your time', text: 'Listings drawn from official government portals and sponsor-verified employers, so you spend less time on dead ends.' },
                { title: 'AI career assistants', text: `Get help with your CV, cover letters and more, with ${c('registered')} free AI credits every month.` },
                { title: 'Know where you stand', text: 'Up to 10 skills and career assessments included, so you can see your strengths clearly.' },
                { title: 'Learn and get certified', text: 'Courses with lessons, quizzes and certificates you can add to your profile.' },
                { title: 'Opportunities come to you', text: 'Save jobs and set job alerts so new openings find you.' }
            ],
            closing: `There is no cost to join. If you try it and have any thoughts, just reply to this email. I read every one.`,
            ctaLabel: 'Create my free account'
        },
        professional: {
            subject: '{{firstName}}, a platform built to make you stand out',
            headline: 'Stand out where it counts',
            intro: `Hi {{firstName}},\n\n${INTRO_SENDER} The Professional experience is for people who want their skills and credibility to be visible, and their job search to run without limits.\n\nI'd love you to see it for yourself.`,
            bullets: [
                { title: 'Unlimited applications and alerts', text: 'Apply as widely as you like, save unlimited jobs and set unlimited alerts.' },
                { title: 'A visible Trust Score', text: 'Show employers verified credibility, not just a list of claims.' },
                { title: 'Connect with other professionals', text: 'Message and build relationships across the platform.' },
                { title: 'Serious AI firepower', text: `${c('professional')} AI credits every month plus up to 50 assessments, for CVs, interview prep, skills gaps and more.` },
                { title: 'Unlimited skills submissions', text: 'Keep your profile current as you grow, with no cap.' }
            ],
            closing: `Start with a free account, explore, and upgrade when it makes sense for you. Questions? Reply directly to this email.`,
            ctaLabel: 'Explore ODUSBABA'
        },
        employer: {
            subject: '{{firstName}}, hire faster with AI doing the heavy lifting',
            headline: 'Hire faster, with AI doing the heavy lifting',
            intro: `Hi {{firstName}},\n\n${INTRO_SENDER} For hiring teams, it brings job posting, applicant review and AI screening support into one place, at a price built to be far below per-posting job-board fees.\n\nI'd like you to experience it first-hand.`,
            bullets: [
                { title: 'Post up to 20 jobs a month', text: 'Reach candidates without paying per listing.' },
                { title: 'See every applicant in one place', text: 'Review and manage applications without juggling inboxes.' },
                { title: 'A company profile that builds trust', text: 'Show candidates who you are before they apply.' },
                { title: 'AI and assessments to screen smarter', text: `${c('employer')} AI credits and up to 30 assessments every month.` },
                { title: 'Reach professionals directly', text: 'Contact professionals on the platform and set up to 10 job alerts.' }
            ],
            closing: `Create a free account to look around first. When you're ready to hire, the Employer plan is a click away. Reply to this email and I'll personally walk you through it.`,
            ctaLabel: 'See what ODUSBABA can do for hiring'
        },
        business: {
            subject: '{{firstName}}, one platform for your whole hiring operation',
            headline: 'One platform for your whole hiring operation',
            intro: `Hi {{firstName}},\n\n${INTRO_SENDER} The Business plan is designed for organisations that hire continuously and want their team, their data and their AI tools working together.\n\nI would welcome the chance to show you around.`,
            bullets: [
                { title: 'Unlimited job postings', text: 'Hire at the pace your business needs, with no posting caps.' },
                { title: 'Bring your team', text: 'Team accounts for up to 5 users, all working in one place.' },
                { title: 'API access', text: 'Connect ODUSBABA to the systems you already use.' },
                { title: 'High-volume AI support', text: `${c('business')} AI credits and up to 100 assessments every month, with unlimited job alerts.` },
                { title: 'A direct line to the founder', text: 'Reply to this email for a personal walkthrough.' }
            ],
            closing: `Start with a free account to explore, then we can talk about the right setup for your team.`,
            ctaLabel: 'Explore the Business experience'
        }
    };
    return defaults[tier] || null;
}

export const REMINDER_INTRO = `Hi {{firstName}},\n\nA quick, one-time reminder in case my earlier invitation got buried. There's no pressure at all. If ODUSBABA looks useful, here is the short version again:`;

function textToHtml(text) {
    return escapeHtml(text).split(/\n{2,}/).map(p => `<p style="margin:0 0 16px;line-height:1.65;color:#334155;font-size:16px;">${p.replace(/\n/g, '<br>')}</p>`).join('');
}

function personalise(str, firstName) {
    return String(str ?? '').replace(/\{\{\s*firstName\s*\}\}/gi, firstName || 'there');
}

export function renderInviteEmail({ content, firstName, signupUrl, unsubscribeUrl, testerCode, postalAddress, isReminder = false, siteUrl }) {
    const name = firstName ? String(firstName).slice(0, 60) : '';
    const subjectRaw = personalise(isReminder ? `Reminder: ${content.subject}` : content.subject, name);
    const subject = subjectRaw.replace(/[\r\n]+/g, ' ').slice(0, 200); // header-injection safe
    const intro = personalise(isReminder ? REMINDER_INTRO : content.intro, name);
    const closing = personalise(content.closing || '', name);
    const bullets = Array.isArray(content.bullets) ? content.bullets.slice(0, 8) : [];
    const ctaLabel = content.ctaLabel || 'Create my account';

    const bulletsHtml = bullets.map(b => `
        <tr><td style="padding:10px 0;vertical-align:top;width:28px;"><div style="width:22px;height:22px;border-radius:11px;background:#10b981;color:#fff;font-size:13px;line-height:22px;text-align:center;font-weight:bold;">&#10003;</div></td>
        <td style="padding:10px 0;"><div style="font-weight:700;color:#0B3C5D;font-size:15px;">${escapeHtml(b.title)}</div><div style="color:#475569;font-size:14px;line-height:1.55;margin-top:2px;">${escapeHtml(b.text)}</div></td></tr>`).join('');

    const codeHtml = testerCode ? `
        <div style="margin:22px 0 0;padding:14px 16px;background:#f0fdf4;border:1px dashed #10b981;border-radius:10px;text-align:center;">
            <div style="font-size:12px;color:#047857;text-transform:uppercase;letter-spacing:1px;">Your personal invite code</div>
            <div style="font-size:22px;font-weight:700;letter-spacing:3px;color:#0B3C5D;margin-top:4px;">${escapeHtml(testerCode)}</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px;">It will be filled in for you when you click the button.</div>
        </div>` : '';

    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(personalise(content.headline, name))}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,.08);">
  <tr><td style="background:linear-gradient(135deg,#0B3C5D 0%,#0f766e 100%);padding:34px 32px;">
     <div style="color:#a7f3d0;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:700;">ODUSBABA</div>
     <div style="color:#ffffff;font-size:26px;line-height:1.25;font-weight:800;margin-top:8px;">${escapeHtml(personalise(content.headline, name))}</div>
  </td></tr>
  <tr><td style="padding:30px 32px 8px;">${textToHtml(intro)}</td></tr>
  <tr><td style="padding:0 32px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${bulletsHtml}</table></td></tr>
  <tr><td style="padding:22px 32px 6px;text-align:center;">
     <a href="${escapeHtml(signupUrl)}" style="display:inline-block;background:#0B3C5D;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:15px 34px;border-radius:10px;">${escapeHtml(ctaLabel)} &rarr;</a>
     ${codeHtml}
  </td></tr>
  <tr><td style="padding:22px 32px 6px;">${closing ? textToHtml(closing) : ''}<p style="margin:0;color:#334155;font-size:16px;">Warm regards,<br><strong>Joseph Odugboye</strong><br><span style="color:#64748b;font-size:14px;">Founder, BluSkye Integrated Consult</span></p></td></tr>
  <tr><td style="padding:24px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
     <p style="margin:0 0 6px;color:#64748b;font-size:12px;line-height:1.6;">You are receiving this one-time invitation from BluSkye Integrated Consult because we believe ODUSBABA may be relevant to you. We will not add you to any mailing list unless you register.</p>
     ${postalAddress ? `<p style="margin:0 0 6px;color:#64748b;font-size:12px;">${escapeHtml(postalAddress)}</p>` : ''}
     <p style="margin:0;color:#64748b;font-size:12px;"><a href="${escapeHtml(unsubscribeUrl)}" style="color:#0f766e;">Unsubscribe</a> &middot; <a href="${escapeHtml(siteUrl || '')}" style="color:#0f766e;">${escapeHtml((siteUrl || '').replace(/^https?:\/\//, ''))}</a></p>
  </td></tr>
</table></td></tr></table></body></html>`;

    const text = [
        personalise(content.headline, name), '',
        intro, '',
        ...bullets.map(b => `- ${b.title}: ${b.text}`), '',
        `${ctaLabel}: ${signupUrl}`,
        testerCode ? `Your invite code: ${testerCode}` : '',
        '', closing, '', 'Warm regards,', 'Joseph Odugboye', 'Founder, BluSkye Integrated Consult', '',
        postalAddress || '',
        `Unsubscribe: ${unsubscribeUrl}`
    ].filter(l => l !== undefined).join('\n');

    return { subject, html, text };
}

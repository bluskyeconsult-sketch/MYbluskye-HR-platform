// api/cron/engage-inactive-members.js
//
// NEW (2026-10-20): automatic, respectful engagement for registered members who have not activated.
// It replaces reengage-dormant-users.js (which only reached people who had signed in before, more than
// 30 days ago, so members who registered and never finished setting up were never contacted).
//
// Who gets what (one email per person per run, highest priority first):
//   1. complete_profile : registered 3+ days ago and the profile is thin   -> "finish your profile"
//   2. start_applying   : profile done, registered 3+ days ago, no applications -> "start applying" + 3 newest jobs
//   3. come_back        : last sign-in more than 30 days ago                 -> "pick up where you left off"
//
// Safeguards:
//   - Runs in DRY mode (nothing sent, a list is logged) until ENGAGEMENT_MODE=live is set in Vercel.
//   - Skips: unsubscribed addresses (email_suppression), members who switched email notifications off,
//     admins, employers and businesses, unconfirmed addresses.
//   - Spacing: at least 7 days between activation emails and at most 3 of them per person; 30 days for come_back.
//   - At most MAX_PER_RUN emails per run (default 100, ENGAGEMENT_MAX_PER_RUN to change).
//   - Every email carries a one-click unsubscribe link (handled by the member-unsubscribe action in index.js).
//
// Run add-member-engagement-tracking.sql once before the first run.

import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const MIN_ACCOUNT_AGE_DAYS = 3;
const ACTIVATION_GAP_DAYS = 7;
const ACTIVATION_MAX_EMAILS = 3;
const COME_BACK_AFTER_DAYS = 30;
const COME_BACK_GAP_DAYS = 30;
const SKIP_TYPES = new Set(['admin', 'super_admin', 'employer', 'business']);
const DAY = 24 * 60 * 60 * 1000;

const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const siteUrl = () => (process.env.SITE_URL || 'https://bluskyeconsult.com').replace(/\/+$/, '');

function unsubscribeLink(userId) {
    const secret = process.env.UNSUBSCRIBE_SECRET || process.env.CRON_SECRET || '';
    const sig = crypto.createHmac('sha256', secret).update(String(userId)).digest('hex').slice(0, 40);
    return `${siteUrl()}/api/index?action=member-unsubscribe&u=${encodeURIComponent(userId)}&s=${sig}`;
}

function getTransporter() {
    if (!process.env.VITE_SMTP_HOST && !process.env.SMTP_HOST) throw new Error('SMTP host is not configured.');
    return nodemailer.createTransport({
        host: process.env.VITE_SMTP_HOST || process.env.SMTP_HOST,
        port: parseInt(process.env.VITE_SMTP_PORT || process.env.SMTP_PORT || '465'),
        secure: true,
        auth: { user: process.env.VITE_EMAIL_USER || process.env.SMTP_USER, pass: process.env.VITE_EMAIL_PASS || process.env.SMTP_PASSWORD },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000
    });
}

// How much of the profile is filled in (the five fields the matching tools rely on).
function profileGaps(p) {
    const gaps = [];
    if (!p.job_title) gaps.push('your current or target job title');
    if (!p.location) gaps.push('your location');
    if (!p.bio) gaps.push('a short professional summary');
    if (p.years_experience === null || p.years_experience === undefined || p.years_experience === '') gaps.push('your years of experience');
    if (!p.linkedin_url) gaps.push('your LinkedIn link');
    return gaps;
}

function shell({ headline, bodyHtml, ctaLabel, ctaUrl, unsubUrl }) {
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
<tr><td style="background:#0B3C5D;padding:26px 28px;"><div style="color:#a7f3d0;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:700;">ODUSBABA</div>
<div style="color:#ffffff;font-size:22px;line-height:1.3;font-weight:800;margin-top:6px;">${esc(headline)}</div></td></tr>
<tr><td style="padding:26px 28px 8px;color:#334155;font-size:15px;line-height:1.65;">${bodyHtml}</td></tr>
<tr><td style="padding:8px 28px 26px;"><a href="${esc(ctaUrl)}" style="display:inline-block;background:#0B3C5D;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 28px;border-radius:10px;">${esc(ctaLabel)} &rarr;</a></td></tr>
<tr><td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.6;">
You are receiving this because you have an ODUSBABA account (BluSkye Integrated Consult). Questions are welcome: reply to this email.<br>
<a href="${esc(unsubUrl)}" style="color:#0f766e;">Stop these reminder emails</a></td></tr>
</table></td></tr></table></body></html>`;
}

function buildEmail(kind, profile, ctx) {
    const first = (profile.full_name || '').trim().split(/\s+/)[0];
    const hello = `Hello${first ? ' ' + esc(first) : ''},`;
    const base = siteUrl();
    if (kind === 'complete_profile') {
        const gaps = profileGaps(profile).slice(0, 4);
        return {
            subject: 'A complete profile gets you better job matches on ODUSBABA',
            headline: 'Finish your profile and see better-matched jobs',
            ctaLabel: 'Complete my profile', ctaUrl: `${base}/settings/profile`,
            bodyHtml: `<p style="margin:0 0 14px;">${hello}</p>
<p style="margin:0 0 14px;">Your ODUSBABA account is ready, but the matching tools can only work with what they know about you. A few minutes on your profile means more relevant jobs, stronger AI-written CVs and cover letters, and a clearer picture of where you stand.</p>
${gaps.length ? `<p style="margin:0 0 6px;"><strong>Still to add:</strong></p><ul style="margin:0 0 14px;padding-left:20px;">${gaps.map(g => `<li>${esc(g)}</li>`).join('')}</ul>` : ''}
<p style="margin:0 0 6px;">It takes about five minutes, and everything on the free plan is included.</p>`
        };
    }
    if (kind === 'start_applying') {
        const jobs = (ctx.jobs || []).slice(0, 3);
        return {
            subject: 'New jobs are waiting: start applying on ODUSBABA',
            headline: 'Your profile is ready. Time to start applying',
            ctaLabel: 'Browse jobs', ctaUrl: `${base}/jobs`,
            bodyHtml: `<p style="margin:0 0 14px;">${hello}</p>
<p style="margin:0 0 14px;">Your profile is in place, and the next step that makes the difference is a first application. Opportunities from verified employers are added regularly, and a job alert delivers new ones as they appear.</p>
${jobs.length ? `<p style="margin:0 0 6px;"><strong>Recently added:</strong></p>${jobs.map(j => `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 14px;margin:0 0 8px;"><a href="${base}/jobs/${esc(j.id)}" style="color:#0B3C5D;font-weight:700;text-decoration:none;">${esc(j.title)}</a><div style="color:#64748b;font-size:13px;">${esc([j.company, j.location].filter(Boolean).join(' · '))}</div></div>`).join('')}` : ''}
<p style="margin:10px 0 6px;">Tip: run your CV through the CV Optimizer before applying, and set a <a href="${base}/job-alerts" style="color:#0f766e;">job alert</a> so new openings come to you.</p>`
        };
    }
    return {
        subject: 'New jobs and learning have been added since your last visit',
        headline: 'Pick up where you left off',
        ctaLabel: 'Go to my dashboard', ctaUrl: `${base}/dashboard`,
        bodyHtml: `<p style="margin:0 0 14px;">${hello}</p>${ctx.cameBackLine || '<p style="margin:0 0 14px;">New jobs, courses and articles have been added since your last visit.</p>'}<p style="margin:0 0 6px;">Your account and progress are exactly as you left them.</p>`
    };
}

export default async function handler(req, res) {
    const authHeader = req.headers.authorization;
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const live = String(process.env.ENGAGEMENT_MODE || '').toLowerCase() === 'live';
    const maxPerRun = Math.max(1, parseInt(process.env.ENGAGEMENT_MAX_PER_RUN || '100') || 100);
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    try {
        const now = Date.now();
        let users = [], page = 1;
        while (true) {
            const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
            if (error) throw error;
            users = users.concat(data.users);
            if (data.users.length < 1000) break;
            page++;
        }
        const authById = new Map(users.map(u => [u.id, u]));

        const { data: profiles, error: pErr } = await supabase.from('profiles')
            .select('id, email, full_name, user_type, job_title, location, bio, years_experience, linkedin_url, email_notifications, created_at, last_reengagement_email_at, engagement_emails_sent');
        if (pErr) throw pErr;

        const { data: suppressedRows } = await supabase.from('email_suppression').select('email');
        const suppressed = new Set((suppressedRows || []).map(r => String(r.email || '').toLowerCase()));

        // Members who have applied at least once.
        const { data: appRows } = await supabase.from('job_applications').select('applicant_id').limit(50000);
        const hasApplied = new Set((appRows || []).map(r => r.applicant_id));

        const plan = [];
        for (const p of profiles || []) {
            const email = String(p.email || '').toLowerCase().trim();
            const au = authById.get(p.id);
            if (!email || !au || !au.email_confirmed_at) continue;
            if (suppressed.has(email) || p.email_notifications === false) continue;
            if (SKIP_TYPES.has(String(p.user_type || '').toLowerCase())) continue;

            const registered = new Date(p.created_at || au.created_at).getTime();
            const ageDays = (now - registered) / DAY;
            const lastEmail = p.last_reengagement_email_at ? new Date(p.last_reengagement_email_at).getTime() : 0;
            const sent = p.engagement_emails_sent || 0;
            const lastSignIn = au.last_sign_in_at ? new Date(au.last_sign_in_at).getTime() : null;

            let kind = null;
            const activationOk = sent < ACTIVATION_MAX_EMAILS && (now - lastEmail) >= ACTIVATION_GAP_DAYS * DAY;
            if (ageDays >= MIN_ACCOUNT_AGE_DAYS && activationOk && profileGaps(p).length >= 2) kind = 'complete_profile';
            else if (ageDays >= MIN_ACCOUNT_AGE_DAYS && activationOk && !hasApplied.has(p.id)) kind = 'start_applying';
            else if (lastSignIn && (now - lastSignIn) >= COME_BACK_AFTER_DAYS * DAY && (now - lastEmail) >= COME_BACK_GAP_DAYS * DAY) kind = 'come_back';
            if (kind) plan.push({ p, kind, email });
            if (plan.length >= maxPerRun) break;
        }

        const summary = plan.reduce((m, x) => { m[x.kind] = (m[x.kind] || 0) + 1; return m; }, {});
        if (!live) {
            console.log('[engage-inactive-members] DRY MODE (set ENGAGEMENT_MODE=live in Vercel to send). Would email:', plan.map(x => `${x.email} (${x.kind})`).join(', '));
            return res.status(200).json({ success: true, mode: 'dry', wouldEmail: plan.length, byKind: summary });
        }
        if (plan.length === 0) return res.status(200).json({ success: true, mode: 'live', emailed: 0 });

        const needJobs = plan.some(x => x.kind === 'start_applying');
        let newestJobs = [];
        if (needJobs) {
            const { data: j } = await supabase.from('jobs').select('id, title, company, location').eq('is_active', true).order('created_at', { ascending: false }).limit(3);
            newestJobs = j || [];
        }

        const transporter = getTransporter();
        const from = `"ODUSBABA" <${process.env.SMTP_SENDER_EMAIL || process.env.VITE_EMAIL_SENDER || process.env.EMAIL_SENDER_ADDRESS || 'noreply@bluskyeconsult.com'}>`;
        let emailed = 0, failed = 0;
        for (const { p, kind, email } of plan) {
            try {
                const ctx = { jobs: newestJobs };
                if (kind === 'come_back') {
                    const { data: enr } = await supabase.from('course_enrollments').select('progress, courses(title)').eq('user_id', p.id).neq('status', 'completed').order('enrolled_at', { ascending: false }).limit(1).maybeSingle();
                    if (enr?.courses?.title) ctx.cameBackLine = `<p style="margin:0 0 14px;">You were <strong>${esc(enr.progress || 0)}%</strong> of the way through <strong>"${esc(enr.courses.title)}"</strong>. You can continue right where you stopped.</p>`;
                }
                const unsubUrl = unsubscribeLink(p.id);
                const m = buildEmail(kind, p, ctx);
                await transporter.sendMail({
                    from, to: email, subject: m.subject,
                    html: shell({ headline: m.headline, bodyHtml: m.bodyHtml, ctaLabel: m.ctaLabel, ctaUrl: m.ctaUrl, unsubUrl }),
                    headers: { 'List-Unsubscribe': `<${unsubUrl}>` }
                });
                const upd = { last_reengagement_email_at: new Date().toISOString() };
                if (kind !== 'come_back') upd.engagement_emails_sent = (p.engagement_emails_sent || 0) + 1;
                await supabase.from('profiles').update(upd).eq('id', p.id);
                emailed++;
            } catch (e) {
                failed++;
                console.error(`engage-inactive-members: could not email ${email}:`, e.message);
            }
        }
        return res.status(200).json({ success: true, mode: 'live', emailed, failed, byKind: summary });
    } catch (error) {
        console.error('engage-inactive-members error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

// api/_lib/jobPosting.js
// NEW (2026-10-23): job posting decided by the SERVER, plus pay-per-job-post for small employers.
//
// Why this exists: the Post Job page used to check the plan and the 20-a-month limit in the browser only, and the
// database allowed any signed-in member to insert a pending job directly. This file moves the decision to the server:
//   - Business and admins: unlimited posts.
//   - Employer: 20 a month; after that they may spend a job-post credit instead of being stopped.
//   - Everyone else (free, Professional, anyone hiring once in a while): one credit per post, bought in packs.
// Every post still goes in as "pending" and still passes your existing review before it is shown on the board.
// A credit comes back automatically if the post is rejected (database trigger in create-job-post-credits.sql).
//
// Prices are in US cents. Change them here only (the pricing page repeats them by hand).
// Each larger pack must cost less per post than the one below it: $29.00, $25.00, $23.00.
// Rough check against Employer ($199.99 for up to 20 posts, about $10 each): past about 8 posts a month Employer is cheaper.
import crypto from 'node:crypto';
import { enforceGate } from './compliance.js';

export const JOB_POST_PACKS = { 1: 2900, 3: 7500, 5: 11500 };
export const EMPLOYER_MONTHLY_POSTS = 20;
const DAILY_CAP = 10;           // anti-spam: most posts one account can submit in 24 hours (admins excluded)
const LIVE_DAYS = 60;           // how long an employer post stays on the board; matches job_auto_hide_days in add-job-expiry.sql

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clip = (v, n) => String(v ?? '').slice(0, n);
const JOB_TYPES = ['full-time', 'part-time', 'contract', 'freelance', 'internship'];

export function buildJobPostingHandlers(deps) {
    const { getSupabase } = deps;
    const fail = (res, code, msg, extra = {}) => res.status(code).json({ success: false, error: msg, ...extra });
    const site = () => (process.env.SITE_URL || 'https://bluskyeconsult.com').replace(/\/+$/, '');

    async function authUser(req, res, sb) {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) { fail(res, 401, 'Please sign in.'); return null; }
        const { data: { user }, error } = await sb.auth.getUser(token);
        if (error || !user) { fail(res, 401, 'Please sign in.'); return null; }
        return { id: user.id, email: String(user.email || '').toLowerCase() };
    }

    const startOfMonthIso = () => { const d = new Date(); d.setUTCDate(1); d.setUTCHours(0, 0, 0, 0); return d.toISOString(); };
    const isAdminP = (p) => ['admin', 'super_admin'].includes(p?.user_type);
    const tierName = (p) => String(p?.tier || '').toLowerCase();

    // The whole decision in one place, so the info call and the create call can never disagree.
    async function position(sb, userId) {
        const { data: profile } = await sb.from('profiles').select('tier, user_type').eq('id', userId).maybeSingle();
        const { data: bal } = await sb.from('job_post_credit_balances').select('balance').eq('user_id', userId).maybeSingle();
        const credits = bal?.balance || 0;
        const tier = tierName(profile);
        let monthly = null;
        if (tier === 'employer' && !isAdminP(profile)) {
            const { count } = await sb.from('jobs').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', startOfMonthIso());
            monthly = { used: count || 0, limit: EMPLOYER_MONTHLY_POSTS };
        }
        let via = 'none';
        if (isAdminP(profile) || tier === 'business') via = 'plan';
        else if (tier === 'employer' && monthly.used < monthly.limit) via = 'plan';
        else if (credits > 0) via = 'credit';
        return { profile, tier, credits, monthly, via, admin: isAdminP(profile) };
    }

    return {
        // What can this person do on the Post Job page? Drives the screen: post now / buy a post / upgrade.
        'job-post-info': async (req, res) => {
            const sb = getSupabase(); const user = await authUser(req, res, sb); if (!user) return;
            const pos = await position(sb, user.id);
            return res.status(200).json({
                success: true, via: pos.via, tier: pos.tier, credits: pos.credits, monthly: pos.monthly, live_days: LIVE_DAYS,
                packs: Object.entries(JOB_POST_PACKS).map(([n, c]) => ({ count: Number(n), cents: c })),
                // Employer at the monthly limit gets a clearer next step than a bare refusal.
                next: pos.via !== 'none' ? null : pos.tier === 'employer' ? 'credit_or_business' : 'buy'
            });
        },

        // Post a job. Server-side: checks the allowance, uses a credit if that is the route, inserts as pending.
        'job-post-create': async (req, res) => {
            const sb = getSupabase(); const user = await authUser(req, res, sb); if (!user) return;
            const b = req.body || {};
            const title = clip(b.title, 150).trim(), company = clip(b.company, 150).trim(), description = clip(b.description, 12000).trim();
            if (title.length < 3 || company.length < 2 || description.length < 30) return fail(res, 400, 'Please give a job title, the company name, and a description of at least a few sentences.');
            if (b.confirm !== true) return fail(res, 400, 'Please confirm that this is a genuine vacancy and that you are allowed to advertise it for this company.', { code: 'confirm_needed' });
            const jobType = JOB_TYPES.includes(b.job_type) ? b.job_type : 'full-time';
            const num = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) && n >= 0 && n < 100000000 ? n : null; };
            const deadline = /^\d{4}-\d{2}-\d{2}$/.test(String(b.application_deadline || '')) ? b.application_deadline : null;

            const pos = await position(sb, user.id);
            if (!pos.admin) {
                const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
                const { count } = await sb.from('jobs').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', since);
                if ((count || 0) >= DAILY_CAP) return fail(res, 429, `You have submitted ${DAILY_CAP} jobs in the last 24 hours. Please try again tomorrow, or email support@bluskyeconsult.com if you need to post more.`, { code: 'daily_cap' });
            }
            if (pos.via === 'none') {
                if (pos.tier === 'employer') return fail(res, 402, `You have used your ${EMPLOYER_MONTHLY_POSTS} posts for this month. Buy a single job post, or move to the Business plan for unlimited posts.`, { code: 'monthly_limit', next: 'credit_or_business' });
                return fail(res, 402, 'Posting a job needs a job-post credit. Buy one below, or choose the Employer plan if you hire often.', { code: 'credits_needed', next: 'buy' });
            }

            // Credit route: spend first (locked, so two clicks cannot spend one credit twice); give it back if the insert fails.
            // The job id is chosen first so the spent credit is tied to this job from the start (a rejection then finds it and gives it back).
            const jobId = crypto.randomUUID();
            let spent = false;
            if (pos.via === 'credit') {
                const { data: ch } = await sb.rpc('job_post_credit_adjust', { p_user: user.id, p_delta: -1, p_reason: 'used', p_ref: null, p_job: jobId });
                const r = Array.isArray(ch) ? ch[0] : ch;
                if (!r?.success) return fail(res, 402, 'You do not have a job-post credit left. Buy one to continue.', { code: 'credits_needed', next: 'buy' });
                spent = true;
            }
            const now = new Date().toISOString();
            const { data: job, error } = await sb.from('jobs').insert({
                id: jobId, title, company, location: clip(b.location, 150) || null, job_type: jobType, is_remote: !!b.is_remote,
                salary_min: num(b.salary_min), salary_max: num(b.salary_max),
                description, requirements: clip(b.requirements, 8000) || null, benefits: clip(b.benefits, 4000) || null,
                application_deadline: deadline, is_active: true,
                user_id: user.id, status: 'draft', compliance_status: 'pending', posted_at: now, created_at: now
            }).select('id').maybeSingle();
            if (error || !job) {
                console.error('job-post-create insert', error?.message);
                if (spent) await sb.rpc('job_post_credit_adjust', { p_user: user.id, p_delta: 1, p_reason: 'refund', p_ref: `refund:${jobId}`, p_job: jobId });
                return fail(res, 500, 'Could not submit the job. You have not been charged. Please try again.');
            }
            const after = await position(sb, user.id);
            return res.status(200).json({ success: true, job_id: job.id, used_credit: spent, credits: after.credits });
        },

        // Buy job-post credits (one Stripe payment). Credits are added by the Stripe webhook, once per payment.
        'job-post-credits-checkout': async (req, res) => {
            const sb = getSupabase(); const user = await authUser(req, res, sb); if (!user) return;
            const count = Number(req.body?.count); const cents = JOB_POST_PACKS[count];
            if (!cents) return fail(res, 400, 'Choose one of the packs shown.');
            let profileCountry = null;
            try { const { data } = await sb.from('profiles').select('country_code').eq('id', user.id).maybeSingle(); profileCountry = data?.country_code || null; } catch { /* ignore */ }
            if (!(await enforceGate(sb, req, res, { service: 'paid_services', userId: user.id, profileCountry }))) return;
            if (!process.env.STRIPE_SECRET_KEY) return fail(res, 503, 'Payments are not switched on yet. Please email support@bluskyeconsult.com.');
            try {
                const Stripe = (await import('stripe')).default; const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
                const session = await stripe.checkout.sessions.create({
                    mode: 'payment', payment_method_types: ['card'],
                    line_items: [{ price_data: { currency: 'usd', product_data: { name: `${count} job post${count === 1 ? '' : 's'}` }, unit_amount: cents }, quantity: 1 }],
                    success_url: `${site()}/post-job?credits=added`, cancel_url: `${site()}/post-job?credits=cancelled`,
                    client_reference_id: user.id, customer_email: user.email || undefined,
                    metadata: { type: 'job_post_pack', userId: user.id, count: String(count) }
                });
                return res.status(200).json({ success: true, url: session.url });
            } catch (e) { console.error('job-post-credits-checkout', e.message); return fail(res, 500, 'Could not start the payment. Please try again.'); }
        }
    };
}

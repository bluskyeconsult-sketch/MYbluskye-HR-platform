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
const LIVE_DAYS_DEFAULT = 60;   // used only if the job_auto_hide_days setting cannot be read; the real number comes from that setting (see add-job-expiry.sql)

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clip = (v, n) => String(v ?? '').slice(0, n);
const JOB_TYPES = ['full-time', 'part-time', 'contract', 'freelance', 'internship'];

export function buildJobPostingHandlers(deps) {
    const { getSupabase, getUserId, isAdmin, sendMail } = deps;
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

    // How many days an employer post stays listed: read from the same setting that hides old jobs, so the page never promises a number
    // the system does not keep. Falls back to the default if the setting is missing or unreadable.
    async function liveDays(sb) {
        try {
            const { data } = await sb.from('system_config').select('config_value').eq('config_key', 'job_auto_hide_days').maybeSingle();
            let v = data?.config_value; if (typeof v === 'string') v = JSON.parse(v);
            const emp = Number(v?.employer), cap = Number(v?.cap);
            if (Number.isFinite(emp) && emp > 0) return Number.isFinite(cap) && cap > 0 ? Math.min(emp, cap) : emp;
        } catch { /* use the default */ }
        return LIVE_DAYS_DEFAULT;
    }
    const esc = (v) => String(v ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
    async function adminOnly(req, res, sb) {
        const uid = await getUserId?.(req, sb);
        if (!uid) { fail(res, 401, 'Please sign in.'); return null; }
        if (!(await isAdmin?.(sb, uid))) { fail(res, 403, 'Admins only.'); return null; }
        return uid;
    }

    // Points for the reviewer to check on a pending job. These are prompts for a human, never a verdict: a clean job can still be
    // fake and a flagged one can be genuine.
    const FREE_MAIL = /@(gmail|googlemail|yahoo|ymail|outlook|hotmail|live|msn|icloud|me|aol|proton|protonmail|gmx|mail|yandex)\./i;
    const SCAM = /(registration fee|training fee|pay (a|the) fee|deposit required|western union|moneygram|gift cards?|bitcoin|crypto|cashier'?s? che(que|ck)|wire transfer|whatsapp|telegram|send (us )?your (bank|passport|ssn|national insurance)|no experience (needed|necessary).{0,60}(per|a) (day|hour|week))/i;
    const CONTACT = /[\w.+-]+@[\w-]+\.[\w.]+|https?:\/\/|www\.|\+?\d[\d\s().-]{7,}\d/i;
    function signalsFor(job, owner, ver, prior, paidByCredit) {
        const out = [];
        const warn = (text) => out.push({ level: 'warn', text }); const info = (text) => out.push({ level: 'info', text });
        const vOk = ver && ver.verification_status === 'verified';
        if (vOk) info(`Employer is verified as "${ver.company_name}".`);
        else warn(ver ? `Employer verification is "${ver.verification_status}", not verified.` : 'Employer has not submitted verification.');
        if (vOk && ver.company_name && job.company && ver.company_name.trim().toLowerCase() !== String(job.company).trim().toLowerCase()) warn(`Company on the job ("${job.company}") differs from the verified company ("${ver.company_name}").`);
        if (!prior.approved) warn('First job from this employer.');
        if (prior.rejected) warn(`${prior.rejected} earlier job(s) from this employer were rejected.`);
        if (owner?.email && FREE_MAIL.test(owner.email)) warn('Account uses a free email address (not a company address).');
        if (owner?.created_at && Date.now() - new Date(owner.created_at).getTime() < 7 * 86400000) warn('Account is less than a week old.');
        const text = `${job.title} ${job.description} ${job.requirements || ''} ${job.benefits || ''}`;
        const m = SCAM.exec(text); if (m) warn(`Wording often seen in scams: "${m[0].slice(0, 40)}".`);
        if (CONTACT.test(text)) warn('The text contains an email address, phone number or web link. Check it is the employer\'s own.');
        if (String(job.description || '').length < 150) info('Very short description.');
        if (!job.salary_min && !job.salary_max) info('No salary given.');
        if (paidByCredit) info('Paid for with a job-post credit.');
        return out;
    }

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
                success: true, via: pos.via, tier: pos.tier, credits: pos.credits, monthly: pos.monthly, live_days: await liveDays(sb),
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

        // ADMIN: the queue of jobs posted by employers (collected jobs have no owner and are handled elsewhere).
        // Body: { status?: 'pending' | 'approved' | 'rejected' | 'all' }  (default pending)
        'admin-employer-jobs-list': async (req, res) => {
            const sb = getSupabase(); if (!(await adminOnly(req, res, sb))) return;
            const status = ['pending', 'approved', 'rejected', 'all'].includes(req.body?.status) ? req.body.status : 'pending';
            let q = sb.from('jobs').select('*').not('user_id', 'is', null);
            if (status !== 'all') q = q.eq('compliance_status', status);
            const { data: jobs, error } = await q.order('created_at', { ascending: false }).limit(100);
            if (error) { console.error('admin-employer-jobs-list', error.message); return fail(res, 500, 'Could not load the jobs.'); }
            const list = jobs || [];
            const ownerIds = [...new Set(list.map(j => j.user_id))]; const jobIds = list.map(j => j.id);
            const owners = {}, vers = {}, prior = {}, paid = new Set();
            if (ownerIds.length) {
                const { data: ps } = await sb.from('profiles').select('id, email, full_name, created_at').in('id', ownerIds); (ps || []).forEach(p => { owners[p.id] = p; });
                const { data: vs } = await sb.from('employer_verifications').select('user_id, company_name, verification_status').in('user_id', ownerIds); (vs || []).forEach(v => { vers[v.user_id] = v; });
                const { data: others } = await sb.from('jobs').select('user_id, compliance_status').in('user_id', ownerIds);
                (others || []).forEach(o => { const r = prior[o.user_id] || (prior[o.user_id] = { approved: 0, rejected: 0 }); if (o.compliance_status === 'approved') r.approved++; if (o.compliance_status === 'rejected') r.rejected++; });
            }
            if (jobIds.length) { const { data: led } = await sb.from('job_post_credit_ledger').select('job_id').eq('reason', 'used').in('job_id', jobIds); (led || []).forEach(l => paid.add(l.job_id)); }
            const out = list.map(j => {
                const flags = signalsFor(j, owners[j.user_id], vers[j.user_id], prior[j.user_id] || { approved: 0, rejected: 0 }, paid.has(j.id));
                return {
                    id: j.id, title: j.title, company: j.company, location: j.location, job_type: j.job_type, is_remote: j.is_remote, salary_min: j.salary_min, salary_max: j.salary_max,
                    description: j.description, requirements: j.requirements, benefits: j.benefits, application_deadline: j.application_deadline,
                    compliance_status: j.compliance_status, rejection_reason: j.rejection_reason || null, created_at: j.created_at, paid_with_credit: paid.has(j.id),
                    poster: { email: owners[j.user_id]?.email || null, name: owners[j.user_id]?.full_name || null, joined: owners[j.user_id]?.created_at || null },
                    flags, warnings: flags.filter(f => f.level === 'warn').length
                };
            });
            return res.status(200).json({ success: true, status, jobs: out });
        },

        // ADMIN: approve or reject a pending employer job. Rejecting needs a reason (shown to the employer). A credit-paid job that is
        // rejected gets its credit back (database trigger). The employer is told by email either way.
        'admin-employer-job-decide': async (req, res) => {
            const sb = getSupabase(); const adminId = await adminOnly(req, res, sb); if (!adminId) return;
            const b = req.body || {};
            if (!UUID.test(String(b.jobId || ''))) return fail(res, 400, 'Missing job.');
            const decision = b.decision;
            if (!['approve', 'reject'].includes(decision)) return fail(res, 400, 'Choose approve or reject.');
            const reason = clip(b.reason, 500).trim();
            if (decision === 'reject' && reason.length < 5) return fail(res, 400, 'Please give a reason. It is shown to the employer.');
            const { data: job } = await sb.from('jobs').select('*').eq('id', b.jobId).maybeSingle();
            if (!job || !job.user_id) return fail(res, 404, 'Job not found.');
            const patch = decision === 'approve'
                ? { compliance_status: 'approved', status: 'active', is_active: true, posted_at: new Date().toISOString(), rejection_reason: null }
                : { compliance_status: 'rejected', is_active: false, rejection_reason: reason };
            const { data: changed, error } = await sb.from('jobs').update(patch).eq('id', job.id).eq('compliance_status', 'pending').select('id');
            if (error) { console.error('admin-employer-job-decide', error.message); return fail(res, 500, 'Could not save the decision.'); }
            if (!changed || !changed.length) return fail(res, 409, 'This job has already been decided.');
            let credit_returned = false;
            if (decision === 'reject') {
                const { data: led } = await sb.from('job_post_credit_ledger').select('id').eq('job_id', job.id).eq('reason', 'refund');
                credit_returned = !!(led && led.length);
            }
            const { data: owner } = await sb.from('profiles').select('email').eq('id', job.user_id).maybeSingle();
            if (owner?.email && sendMail) {
                const days = await liveDays(sb);
                const html = decision === 'approve'
                    ? `<div style="font-family:Arial,sans-serif;max-width:560px"><p>Your job "${esc(job.title)}" has been approved and is now live on ODUSBABA. It stays listed for up to ${days} days, or until your closing date.</p></div>`
                    : `<div style="font-family:Arial,sans-serif;max-width:560px"><p>Your job "${esc(job.title)}" was not approved.</p><p>Reason: ${esc(reason)}</p>${credit_returned ? '<p>The job-post credit you used has been returned to your account.</p>' : ''}<p>You are welcome to post it again with the points above addressed. If you have questions, reply to support@bluskyeconsult.com.</p></div>`;
                try { await sendMail({ to: owner.email, subject: decision === 'approve' ? 'Your job is now live' : 'Your job was not approved', html }); } catch (e) { console.error('job decision email', e.message); }
            }
            return res.status(200).json({ success: true, decision, credit_returned });
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
                // Tax is added only when STRIPE_AUTOMATIC_TAX=true (turn it on after Stripe Tax is set up in your Stripe account; see the job posting guide).
                const taxOn = process.env.STRIPE_AUTOMATIC_TAX === 'true';
                const session = await stripe.checkout.sessions.create({
                    mode: 'payment', payment_method_types: ['card'],
                    line_items: [{ price_data: { currency: 'usd', product_data: { name: `${count} job post${count === 1 ? '' : 's'}` }, unit_amount: cents, ...(taxOn ? { tax_behavior: 'exclusive' } : {}) }, quantity: 1 }],
                    ...(taxOn ? { automatic_tax: { enabled: true }, billing_address_collection: 'required' } : {}),
                    success_url: `${site()}/post-job?credits=added`, cancel_url: `${site()}/post-job?credits=cancelled`,
                    client_reference_id: user.id, customer_email: user.email || undefined,
                    metadata: { type: 'job_post_pack', userId: user.id, count: String(count) }
                });
                return res.status(200).json({ success: true, url: session.url });
            } catch (e) { console.error('job-post-credits-checkout', e.message); return fail(res, 500, 'Could not start the payment. Please try again.'); }
        }
    };
}

// api/_lib/appraisals.js
//
// NEW (2026-10-23): the appraisal workflow (self-appraisal -> supervisor -> employee accepts or rejects ->
// meeting if rejected -> joint record -> approver files). Companion to create-appraisals.sql and compliance.js.
//
// SAFETY RULES BUILT IN
//   1. Appraisal text is encrypted (AES-256-GCM) before it reaches the database. If the key is missing the
//      server refuses to save anything (fails closed) rather than store plain text.
//   2. Nobody is ever auto-rated or auto-approved: silence moves the process on and raises a flag, it never
//      creates a rating or an agreement.
//   3. Every person sees only what their role allows (see canSee). Platform administrators have no route to
//      appraisal content at all. HR and approvers see content only at the stages shown, and each read is logged.
//   4. Emails contain links only, never appraisal text, ratings or names of ratings.
//   5. Every write checks the country gate (compliance.js) so a service is never used where it is not cleared.
//   6. Submitted versions are locked by the database; the audit trail is append-only and holds no content.
import crypto from 'node:crypto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { enforceGate, evaluateGate, loadRule } from './compliance.js';
import { computeReport, buildFindings, renderReviewPdf, buildHistory, MIN_GROUP } from './appraisalReports.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isId = (v) => typeof v === 'string' && UUID.test(v);
const clip = (v, n) => String(v ?? '').slice(0, n);
const DAY = 86400000;
const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n) => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);
const FINALISH = ['awaiting_final_approval', 'escalated_disagreement', 'filed'];
const CLOSED = ['filed', 'closed_employee_left', 'withdrawn', 'purged'];
const PERSONAL_DATA = /[\w.+-]+@[\w-]+\.[\w.]+|https?:\/\/|www\.|\+?\d[\d\s().-]{7,}\d/i;
const SENSITIVE = /\b(age|aged|ages|old|older|young|younger|elderly|retire\w*|gender|sex|sexes|sexual\w*|pregnan\w*|maternity|paternity|marital|married|marriage|single parent|famil(y|ies)|child(ren)?|kids|baby|religio\w*|faith|church|mosque|race|racial|ethnic\w*|nationality|national origin|accent|disab\w*|health|illness|medical|medication|mental|union|political\w*|politics|vote|orientation|gay|lesbian|transgender|appearance|attractive\w*|weight|height|looks)\b/i;
// Team-size limits, one place. Pay-per-appraisal organisations (owner not on Employer/Business) can have up to SMALL_TEAM_MAX people.
// Employer and Business include appraisals for more. Above BUSINESS_MAX people we ask the owner to contact us (priced individually).
// EMPLOYER_MAX must stay above SMALL_TEAM_MAX, otherwise paying for the Employer plan would give a smaller team than paying per appraisal.
const SMALL_TEAM_MAX = 25;
const EMPLOYER_MAX = 50;
const BUSINESS_MAX = 100;
const WELCOME_CREDITS = 1;
// Pay-per-appraisal prices, in US cents like the rest of the site. Change them here only (the pricing page repeats them).
// Each bigger pack must cost less per appraisal than the one below it: $6.99, $5.60, $5.00, $4.40.
export const APPRAISAL_PACKS = { 1: 699, 5: 2799, 10: 4999, 25: 10999 };

// ---------------------------------------------------------------------------------------------
// Encryption
// ---------------------------------------------------------------------------------------------
function parseKey(s) {
    if (!s) return null;
    const t = String(s).trim();
    if (/^[0-9a-f]{64}$/i.test(t)) return Buffer.from(t, 'hex');
    try { const b = Buffer.from(t, 'base64'); return b.length === 32 ? b : null; } catch { return null; }
}
const currentKey = () => parseKey(process.env.APPRAISAL_ENCRYPTION_KEY);
const oldKey = () => parseKey(process.env.APPRAISAL_ENCRYPTION_KEY_PREVIOUS);
export const encryptionReady = () => !!currentKey();

function encrypt(obj) {
    const key = currentKey();
    if (!key) { const e = new Error('ENCRYPTION_NOT_CONFIGURED'); e.code = 'ENC'; throw e; }
    const iv = crypto.randomBytes(12);
    const c = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ct = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
    return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), ct.toString('base64url')].join('.');
}
function decrypt(s) {
    const [v, iv, tag, ct] = String(s).split('.');
    if (v !== 'v1') throw new Error('bad format');
    for (const key of [currentKey(), oldKey()]) {
        if (!key) continue;
        try {
            const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
            d.setAuthTag(Buffer.from(tag, 'base64url'));
            return JSON.parse(Buffer.concat([d.update(Buffer.from(ct, 'base64url')), d.final()]).toString('utf8'));
        } catch { /* try the next key */ }
    }
    throw new Error('cannot decrypt');
}
const hashOf = (obj) => crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

// ---------------------------------------------------------------------------------------------
// Content validation
// ---------------------------------------------------------------------------------------------
function cleanContent(stage, raw, snapshot) {
    const c = raw && typeof raw === 'object' ? raw : {};
    if (stage === 'employee_response') {
        const decision = c.decision === 'accept' ? 'accept' : c.decision === 'reject' ? 'reject' : null;
        if (!decision) return { error: 'Please choose accept or reject.' };
        const comment = clip(c.comment, 4000).trim();
        if (decision === 'reject' && comment.length < 20) return { error: 'Please explain what you disagree with (at least a sentence), so the discussion can be useful.' };
        return { value: { decision, comment } };
    }
    if (stage === 'employee_statement' || stage === 'approver_note') {
        const text = clip(c.text, 5000).trim();
        if (!text) return { error: 'Please write something first.' };
        return { value: { text } };
    }
    const crit = snapshot?.criteria || [];
    const min = snapshot?.scale?.min ?? 1, max = snapshot?.scale?.max ?? 5;
    const ratings = {}, comments = {};
    for (const k of crit) {
        const r = c.ratings?.[k.id];
        const need = stage !== 'contributor';
        if (r === undefined || r === null || r === '') { if (need) return { error: `Please rate "${k.title}".` }; continue; }
        const n = Number(r);
        if (!Number.isInteger(n) || n < min || n > max) return { error: `Ratings must be whole numbers from ${min} to ${max}.` };
        ratings[k.id] = n;
        const cm = clip(c.comments?.[k.id], 4000).trim();
        if (cm) comments[k.id] = cm;
    }
    const summary = clip(c.summary, 8000).trim();
    const goals = clip(c.goals, 4000).trim();
    if (stage !== 'contributor' && summary.length < 10) return { error: 'Please add a short overall summary.' };
    if (stage === 'contributor' && !Object.keys(ratings).length && !summary) return { error: 'Please add at least one rating or a comment.' };
    const value = { ratings, comments, summary, goals };
    // Potential (1 to 3) is asked of the supervisor only, and only when the template asks for it.
    if (snapshot?.potential && (stage === 'supervisor' || stage === 'joint')) {
        const p = Number(c.potential);
        if (![1, 2, 3].includes(p)) return { error: 'Please choose a potential rating (1 to 3).' };
        value.potential = p;
    }
    return { value };
}

// ---------------------------------------------------------------------------------------------
// Who can see which stage (the heart of the privacy design)
// ---------------------------------------------------------------------------------------------
function canSee(ctx, stage, version) {
    const st = ctx.appraisal.status;
    const r = ctx.roles;
    if (r.includes('employee')) {
        if (stage === 'contributor') { if (!['awaiting_self', 'awaiting_supervisor'].includes(st)) return true; }
        else return true;
    }
    if (r.includes('supervisor')) return true;
    if (r.includes('contributor') && stage === 'contributor' && version.author_member_id === ctx.member.id) return true;
    if (r.includes('approver') && FINALISH.includes(st)) return true;
    if (r.includes('hr') && st === 'filed') return true;
    return false;
}

// ---------------------------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------------------------
export function buildAppraisalHandlers(deps) {
    const { getSupabase, sendMail, callAI, deductAiCredit, refundAiCredit } = deps;
    const site = () => (process.env.SITE_URL || 'https://bluskyeconsult.com').replace(/\/+$/, '');

    const fail = (res, code, msg, extra = {}) => res.status(code).json({ success: false, error: msg, ...extra });
    async function authUser(req, res, sb) {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) { fail(res, 401, 'Please sign in.'); return null; }
        const { data: { user }, error } = await sb.auth.getUser(token);
        if (error || !user) { fail(res, 401, 'Please sign in.'); return null; }
        return { id: user.id, email: String(user.email || '').toLowerCase() };
    }
    const guardEnc = (res) => { if (!encryptionReady()) { fail(res, 503, 'Appraisals are not switched on yet. Please contact support.'); return false; } return true; };

    async function getMember(sb, userId, orgId, statuses = ['active']) {
        const { data } = await sb.from('org_members').select('*').eq('org_id', orgId).eq('user_id', userId).in('status', statuses).maybeSingle();
        return data || null;
    }
    const isHr = (m) => m && ['owner', 'hr_admin'].includes(m.role);
    async function getOrg(sb, orgId) { const { data } = await sb.from('organisations').select('*').eq('id', orgId).maybeSingle(); return data; }

    async function ev(sb, ap, member, userId, action, from, to, meta = {}) {
        try { await sb.from('appraisal_events').insert({ appraisal_id: ap?.id || null, org_id: ap?.org_id || meta.org_id || null, actor_member_id: member?.id || null, actor_user_id: userId || null, action, from_status: from || null, to_status: to || null, meta }); } catch (e) { console.error('event', e.message); }
    }

    async function notify(sb, memberIds, subject, line, apId, orgName) {
        try {
            const ids = [...new Set((memberIds || []).filter(Boolean))];
            if (!ids.length) return;
            const { data } = await sb.from('org_members').select('email, status').in('id', ids);
            const link = apId ? `${site()}/appraisals/${apId}` : `${site()}/appraisals`;
            for (const m of (data || [])) {
                if (m.status === 'left') continue;
                await sendMail?.({ to: m.email, subject, html: `<div style="font-family:Arial,sans-serif;max-width:560px"><p>${line}</p><p><a href="${link}" style="display:inline-block;background:#0B3C5D;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">Open in ODUSBABA</a></p><p style="color:#64748b;font-size:12px">${orgName ? `Organisation: ${String(orgName).replace(/[<>&]/g, '')}. ` : ''}For privacy, appraisal content is never sent by email. Sign in to read it.</p></div>` }).catch(() => {});
            }
        } catch { /* email problems never block the workflow */ }
    }

    async function loadCtx(sb, userId, appraisalId, statuses = ['active']) {
        if (!isId(appraisalId)) return null;
        const { data: ap } = await sb.from('appraisals').select('*').eq('id', appraisalId).maybeSingle();
        if (!ap) return null;
        const member = await getMember(sb, userId, ap.org_id, statuses);
        if (!member) return null;
        const roles = [];
        if (ap.employee_member_id === member.id) roles.push('employee');
        if (ap.supervisor_member_id === member.id) roles.push('supervisor');
        if (ap.approver_member_id === member.id) roles.push('approver');
        if (isHr(member) && !roles.includes('employee')) roles.push('hr');
        const { data: ct } = await sb.from('appraisal_contributors').select('status').eq('appraisal_id', ap.id).eq('member_id', member.id).maybeSingle();
        if (ct) roles.push('contributor');
        if (!roles.length) return null;
        return { appraisal: ap, member, roles, contributor: ct || null };
    }

    async function transition(sb, ap, to, member, userId, action, patch = {}, meta = {}) {
        const { data, error } = await sb.from('appraisals').update({ status: to, updated_at: new Date().toISOString(), ...patch }).eq('id', ap.id).eq('status', ap.status).select('id');
        if (error || !data?.length) { const e = new Error('CONFLICT'); e.code = 'CONFLICT'; throw e; }
        await ev(sb, ap, member, userId, action, ap.status, to, meta);
    }
    const nextDue = (cycleDue, days = 14) => (cycleDue && cycleDue >= plusDays(3) ? cycleDue : plusDays(days));

    async function lockVersion(sb, ap, stage, member, content, round) {
        const enc = encrypt(content);
        const { error } = await sb.from('appraisal_versions').insert({ appraisal_id: ap.id, stage, author_member_id: member?.id || null, round: round ?? ap.round, content_enc: enc, content_hash: hashOf(content) });
        if (error) throw new Error('version insert: ' + error.message);
        await sb.from('appraisal_drafts').delete().eq('appraisal_id', ap.id).eq('member_id', member?.id).eq('stage', stage);
    }

    async function retentionFor(sb, org) {
        const rule = await loadRule(sb, org.country_code, 'appraisal');
        let y = org.retention_years || rule?.retention_years_default || 6;
        if (rule?.retention_years_min) y = Math.max(y, rule.retention_years_min);
        if (rule?.retention_years_max) y = Math.min(y, rule.retention_years_max);
        return y;
    }
    const retentionDate = (years) => { const d = new Date(); d.setFullYear(d.getFullYear() + years); return d.toISOString().slice(0, 10); };

    async function gateOrg(req, res, sb, user, org) {
        return enforceGate(sb, req, res, { service: 'appraisal', orgId: org.id, orgCountry: org.country_code, userId: user.id });
    }

    // Team size: anyone can run a small team of up to 25 in "small employer" mode and pay per appraisal. Employer includes appraisals
    // for up to 50 people, Business up to 100. Above that the owner is asked to contact us. Testers, admins and the testing switch can use everything.
    const tierName = (p) => String(p?.tier || p?.user_type || '').toLowerCase();
    const isAdminP = (p) => ['admin', 'super_admin'].includes(p?.user_type);
    const openAll = (p) => isAdminP(p) || p?.is_tester === true || process.env.APPRAISAL_OPEN_CREATION === 'true';
    // "Included" = appraisals come with the owner's plan (Employer, Business, admins, testers, testing switch).
    // Everyone else can still run a team of up to 25 people and pays per appraisal.
    const includedPlan = (p) => openAll(p) || ['employer', 'business'].includes(tierName(p));
    const billable = (p) => !includedPlan(p);
    function tierLimit(p) {
        if (isAdminP(p)) return 200;
        const t = tierName(p);
        if (t === 'business') return BUSINESS_MAX;
        if (t === 'employer') return EMPLOYER_MAX;
        return openAll(p) ? EMPLOYER_MAX : SMALL_TEAM_MAX;
    }
    // What to tell an owner who has reached their limit, and where to send them next. Used by invites and by starting a round.
    function limitAdvice(p) {
        const limit = tierLimit(p);
        if (isAdminP(p) || openAll(p)) return { limit, next: 'contact', text: `This organisation is at the limit of ${limit} people. Please contact us.` };
        const t = tierName(p);
        if (t === 'business') return { limit, next: 'contact', text: `Your Business plan includes appraisals for up to ${limit} people. For a larger organisation, please contact us and we will set up a plan for you.` };
        if (t === 'employer') return { limit, next: 'business', text: `Your Employer plan includes appraisals for up to ${limit} people. The Business plan covers up to ${BUSINESS_MAX}.` };
        return { limit, next: 'employer', text: `Pay-per-appraisal teams can have up to ${limit} people. The Employer plan includes appraisals for up to ${EMPLOYER_MAX} people, plus job posting and fuller reports.` };
    }
    const microOnly = (p) => billable(p);
    // Which reports an organisation gets (decided by the owner's plan).
    const reportLevel = (p) => (isAdminP(p) || tierName(p) === 'business' || openAll(p) ? 'full' : tierName(p) === 'employer' ? 'standard' : 'basic');
    const ownerProfile = async (sb, org) => (await sb.from('profiles').select('tier, user_type, is_tester').eq('id', org.created_by).maybeSingle()).data;

    // Builds exactly what this person is allowed to see.
    async function buildView(sb, ctx, userId, { logRead = true } = {}) {
        const ap = ctx.appraisal;
        const { data: vers } = await sb.from('appraisal_versions').select('*').eq('appraisal_id', ap.id).order('created_at');
        const visible = (vers || []).filter(v => canSee(ctx, v.stage, v));
        const out = [];
        for (const v of visible) {
            try { out.push({ id: v.id, stage: v.stage, round: v.round, author_member_id: v.author_member_id, created_at: v.created_at, hash: v.content_hash, content: decrypt(v.content_enc) }); }
            catch { out.push({ id: v.id, stage: v.stage, round: v.round, author_member_id: v.author_member_id, created_at: v.created_at, hash: v.content_hash, content: null, unreadable: true }); }
        }
        const viewedAsOversight = out.length && !ctx.roles.some(r => ['employee', 'supervisor', 'contributor'].includes(r));
        if (viewedAsOversight && logRead) await ev(sb, ap, ctx.member, userId, 'content_read', null, null, { role: ctx.roles.join(',') });
        let draft = null;
        const myStage = draftStage(ctx);
        if (myStage) {
            const { data: d } = await sb.from('appraisal_drafts').select('content_enc, updated_at').eq('appraisal_id', ap.id).eq('member_id', ctx.member.id).eq('stage', myStage).maybeSingle();
            if (d) { try { draft = { stage: myStage, content: decrypt(d.content_enc), updated_at: d.updated_at }; } catch { /* ignore */ } }
        }
        const { data: meeting } = await sb.from('appraisal_meetings').select('*').eq('appraisal_id', ap.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
        const { data: contribs } = await sb.from('appraisal_contributors').select('member_id, status').eq('appraisal_id', ap.id);
        const isParticipant = ctx.roles.some(r => ['employee', 'supervisor', 'approver', 'hr'].includes(r));
        const { data: events } = isParticipant ? await sb.from('appraisal_events').select('id, action, from_status, to_status, created_at, actor_member_id, meta').eq('appraisal_id', ap.id).order('created_at') : { data: [] };
        const ids = [...new Set([ap.employee_member_id, ap.supervisor_member_id, ap.approver_member_id, ...(contribs || []).map(c => c.member_id), ...out.map(v => v.author_member_id), ...(events || []).map(e => e.actor_member_id)].filter(Boolean))];
        const { data: ppl } = ids.length ? await sb.from('org_members').select('id, full_name, job_title, email').in('id', ids) : { data: [] };
        const people = {}; (ppl || []).forEach(p => { people[p.id] = { name: p.full_name || p.email.split('@')[0], job_title: p.job_title || null }; });
        const myContribs = ctx.roles.includes('contributor') && !ctx.roles.some(r => ['supervisor', 'employee', 'hr', 'approver'].includes(r));
        return {
            appraisal: myContribs ? { id: ap.id, status: ap.status, org_id: ap.org_id, employee_member_id: ap.employee_member_id } : ap,
            roles: ctx.roles, my_member_id: ctx.member.id, people,
            versions: out, draft, meeting: myContribs ? null : meeting,
            contributors: myContribs ? [] : (contribs || []), events: events || [],
            template: ap.template_snapshot, action: actionFor(ctx)
        };
    }
    function draftStage(ctx) {
        const st = ctx.appraisal.status;
        if (ctx.roles.includes('employee') && st === 'awaiting_self') return 'self';
        if (ctx.roles.includes('supervisor') && st === 'awaiting_supervisor') return 'supervisor';
        if (ctx.roles.includes('supervisor') && ['awaiting_joint_record', 'returned_to_supervisor'].includes(st)) return 'joint';
        if (ctx.roles.includes('contributor') && ctx.contributor?.status === 'invited' && st === 'awaiting_supervisor') return 'contributor';
        return null;
    }
    function actionFor(ctx) {
        const st = ctx.appraisal.status, r = ctx.roles;
        if (r.includes('employee') && st === 'awaiting_self') return 'complete_self';
        if (r.includes('supervisor') && st === 'awaiting_supervisor') return 'complete_supervisor';
        if (r.includes('contributor') && ctx.contributor?.status === 'invited' && st === 'awaiting_supervisor') return 'give_input';
        if (r.includes('employee') && st === 'awaiting_employee_response') return 'respond';
        if (r.includes('supervisor') && st === 'meeting_required') return 'propose_meeting';
        if (r.includes('employee') && st === 'meeting_required') return 'choose_slot';
        if (r.includes('supervisor') && st === 'meeting_scheduled') return 'hold_meeting';
        if (r.includes('supervisor') && ['awaiting_joint_record', 'returned_to_supervisor'].includes(st)) return 'record_joint';
        if (r.includes('approver') && ['awaiting_final_approval', 'escalated_disagreement'].includes(st)) return 'final_decision';
        if (r.includes('hr') && ctx.appraisal.needs_reassignment) return 'reassign';
        return null;
    }

    // Reads and decrypts the filed appraisals of an organisation (optionally one round), in small batches.
    async function loadFiledRows(sb, org, cycleId) {
        let q = sb.from('appraisals').select('*').eq('org_id', org.id).neq('status', 'purged').limit(1000);
        if (cycleId) q = q.eq('cycle_id', cycleId);
        const { data: all } = await q;
        const statusCounts = {}; (all || []).forEach(a => { statusCounts[a.status] = (statusCounts[a.status] || 0) + 1; });
        const filed = (all || []).filter(a => a.status === 'filed').slice(0, 500);
        const { data: mem } = await sb.from('org_members').select('id, full_name, email, department').eq('org_id', org.id);
        const people = Object.fromEntries((mem || []).map(m => [m.id, { name: m.full_name || m.email.split('@')[0], department: m.department }]));
        const { data: cyc } = await sb.from('appraisal_cycles').select('id, name, created_at').eq('org_id', org.id).order('created_at', { ascending: false }).limit(50);
        const cname = Object.fromEntries((cyc || []).map(c => [c.id, c.name]));
        const byAp = {};
        for (let i = 0; i < filed.length; i += 100) {
            const chunk = filed.slice(i, i + 100).map(a => a.id);
            const { data: vers } = await sb.from('appraisal_versions').select('*').in('appraisal_id', chunk).in('stage', ['self', 'supervisor', 'joint']).order('created_at');
            for (const v of (vers || [])) { try { (byAp[v.appraisal_id] ||= {})[v.stage] = decrypt(v.content_enc); } catch { /* unreadable: skipped */ } }
        }
        const rows = filed.filter(a => byAp[a.id]?.supervisor || byAp[a.id]?.joint).map(a => ({
            id: a.id, name: people[a.employee_member_id]?.name || 'Unknown', supervisor: people[a.supervisor_member_id]?.name || null, department: people[a.employee_member_id]?.department || null,
            cycle_id: a.cycle_id, cycle_name: cname[a.cycle_id] || 'Appraisal', date: a.filed_at, created_at: a.created_at, disagreement: a.disagreement, employee_no_response: a.employee_no_response,
            self: byAp[a.id].self || null, final: byAp[a.id].joint || byAp[a.id].supervisor, criteria: (a.template_snapshot?.criteria || []).map(c => ({ id: c.id, title: c.title, weight: c.weight }))
        }));
        return { rows, statusCounts, cycles: (cyc || []).map(c => ({ id: c.id, name: c.name })) };
    }
    // Organisation averages per question for one round, only when at least MIN_GROUP appraisals are filed. Means only, never individual values.
    async function cycleAverages(sb, cycleId) {
        const { data: aps } = await sb.from('appraisals').select('id, template_snapshot').eq('cycle_id', cycleId).eq('status', 'filed').limit(500);
        if (!aps || aps.length < MIN_GROUP) return null;
        const sums = {}; let used = 0;
        for (let i = 0; i < aps.length; i += 100) {
            const { data: vers } = await sb.from('appraisal_versions').select('appraisal_id, stage, content_enc').in('appraisal_id', aps.slice(i, i + 100).map(a => a.id)).in('stage', ['supervisor', 'joint']).order('created_at');
            const last = {}; for (const v of (vers || [])) { try { last[v.appraisal_id] = decrypt(v.content_enc); } catch { /* skip */ } }
            for (const c of Object.values(last)) { used++; for (const [k, v] of Object.entries(c.ratings || {})) { (sums[k] ||= []).push(Number(v)); } }
        }
        if (used < MIN_GROUP) return null;
        return Object.fromEntries(Object.entries(sums).map(([k, arr]) => [k, Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 100) / 100]));
    }

    // -----------------------------------------------------------------------------------------
    return {
        // ---- Organisations and people ----
        'appr-org-create': async (req, res) => {
            const sb = getSupabase(); const user = await authUser(req, res, sb); if (!user) return;
            if (!guardEnc(res)) return;
            const name = clip(req.body?.name, 150).trim();
            const country = String(req.body?.country_code || '').toUpperCase();
            if (name.length < 2 || !/^[A-Z]{2}$/.test(country)) return fail(res, 400, 'Please give the organisation name and the country where your staff work.');
            const { data: profile } = await sb.from('profiles').select('tier, user_type, is_tester').eq('id', user.id).maybeSingle();
            const mode = microOnly(profile) ? 'micro' : (req.body?.mode === 'micro' ? 'micro' : 'standard');
            const { count } = await sb.from('organisations').select('id', { count: 'exact', head: true }).eq('created_by', user.id);
            if ((count || 0) >= 3) return fail(res, 400, 'You can create up to three organisations.');
            const gate = await evaluateGate(sb, req, { service: 'appraisal', orgCountry: country, userId: user.id });
            if (gate.decision === 'blocked') return res.status(403).json({ success: false, code: 'blocked', error: 'This service is not available for that location.' });
            const rule = await loadRule(sb, country, 'appraisal');
            const { data: org, error } = await sb.from('organisations').insert({ name, country_code: country, created_by: user.id, mode, retention_years: rule?.retention_years_default || 6 }).select('*').single();
            if (error) { console.error('org create', error.message); return fail(res, 500, 'Could not create the organisation.'); }
            const { data: m } = await sb.from('org_members').insert({ org_id: org.id, user_id: user.id, email: user.email, full_name: clip(req.body?.your_name, 120) || null, job_title: clip(req.body?.your_title, 120) || null, role: 'owner', status: 'active', joined_at: new Date().toISOString() }).select('id').single();
            if (billable(profile)) await sb.rpc('appraisal_credit_adjust', { p_org: org.id, p_delta: WELCOME_CREDITS, p_reason: 'welcome', p_ref: `welcome:${org.id}`, p_appraisal: null });
            await ev(sb, null, m, user.id, 'org_created', null, null, { org_id: org.id, country });
            return res.status(200).json({ success: true, org });
        },

        'appr-my': async (req, res) => {
            const sb = getSupabase(); const user = await authUser(req, res, sb); if (!user) return;
            const { data: mems } = await sb.from('org_members').select('*, organisations(id, name, country_code, status)').eq('user_id', user.id).in('status', ['active', 'left']);
            const memberIds = (mems || []).map(m => m.id);
            let items = [];
            if (memberIds.length) {
                const orFilter = memberIds.map(id => `employee_member_id.eq.${id},supervisor_member_id.eq.${id},approver_member_id.eq.${id}`).join(',');
                const { data: aps } = await sb.from('appraisals').select('*').or(orFilter).neq('status', 'purged').order('updated_at', { ascending: false }).limit(300);
                const { data: cts } = await sb.from('appraisal_contributors').select('appraisal_id, member_id, status').in('member_id', memberIds);
                const ctsMap = {}; (cts || []).forEach(c => { ctsMap[c.appraisal_id] = c; });
                const extraIds = (cts || []).map(c => c.appraisal_id).filter(id => !(aps || []).some(a => a.id === id));
                const { data: extra } = extraIds.length ? await sb.from('appraisals').select('*').in('id', extraIds) : { data: [] };
                const all = [...(aps || []), ...(extra || [])];
                const pIds = [...new Set(all.flatMap(a => [a.employee_member_id, a.supervisor_member_id]).filter(Boolean))];
                const { data: ppl } = pIds.length ? await sb.from('org_members').select('id, full_name, email').in('id', pIds) : { data: [] };
                const nm = {}; (ppl || []).forEach(p => { nm[p.id] = p.full_name || p.email.split('@')[0]; });
                for (const a of all) {
                    const member = (mems || []).find(m => m.org_id === a.org_id);
                    if (!member) continue;
                    const roles = [];
                    if (a.employee_member_id === member.id) roles.push('employee');
                    if (a.supervisor_member_id === member.id) roles.push('supervisor');
                    if (a.approver_member_id === member.id) roles.push('approver');
                    if (ctsMap[a.id]) roles.push('contributor');
                    const ctx = { appraisal: a, member, roles, contributor: ctsMap[a.id] || null };
                    items.push({ id: a.id, org_id: a.org_id, status: a.status, round: a.round, roles, action: actionFor(ctx), employee: nm[a.employee_member_id] || null, supervisor: nm[a.supervisor_member_id] || null, disagreement: a.disagreement, employee_no_response: a.employee_no_response, due: a.status === 'awaiting_self' ? a.self_due : a.status === 'awaiting_supervisor' ? a.supervisor_due : a.status === 'awaiting_employee_response' ? a.response_due : a.final_due, updated_at: a.updated_at });
                }
            }
            return res.status(200).json({ success: true, memberships: (mems || []).map(m => ({ member_id: m.id, org: m.organisations, role: m.role, status: m.status })), appraisals: items, encryption_ready: encryptionReady() });
        },

        'appr-org-get': async (req, res) => {
            const sb = getSupabase(); const user = await authUser(req, res, sb); if (!user) return;
            const orgId = req.body?.orgId || req.query?.orgId;
            if (!isId(orgId)) return fail(res, 400, 'Missing organisation.');
            const me = await getMember(sb, user.id, orgId); if (!me) return fail(res, 403, 'You are not a member of this organisation.');
            const org = await getOrg(sb, orgId);
            const gate = await evaluateGate(sb, req, { service: 'appraisal', orgId, orgCountry: org.country_code, userId: user.id });
            const hr = isHr(me);
            let members;
            if (hr) { ({ data: members } = await sb.from('org_members').select('id, email, full_name, job_title, department, role, supervisor_member_id, status, joined_at, left_at, invited_at').eq('org_id', orgId).order('invited_at', { ascending: true })); }
            else { const ids = [me.id, me.supervisor_member_id].filter(Boolean); ({ data: members } = await sb.from('org_members').select('id, full_name, job_title, role, status').in('id', ids)); }
            let cycles = [], metaAppraisals = [];
            if (hr) {
                ({ data: cycles } = await sb.from('appraisal_cycles').select('*').eq('org_id', orgId).order('created_at', { ascending: false }).limit(50));
                ({ data: metaAppraisals } = await sb.from('appraisals').select('id, cycle_id, employee_member_id, supervisor_member_id, approver_member_id, status, round, disagreement, employee_no_response, needs_reassignment, legal_hold, self_due, supervisor_due, response_due, final_due, filed_at, retention_until').eq('org_id', orgId).neq('status', 'purged').order('updated_at', { ascending: false }).limit(500));
            }
            const { data: templates } = await sb.from('appraisal_templates').select('id, name, criteria, scale, is_default, org_id, category, description, use_potential').or(`org_id.is.null,org_id.eq.${orgId}`);
            const level = reportLevel(await ownerProfile(sb, org));
            const op = await ownerProfile(sb, org);
            let billing = { billable: false };
            if (hr && billable(op)) {
                const { data: bal } = await sb.from('appraisal_credit_balances').select('balance').eq('org_id', orgId).maybeSingle();
                billing = { billable: true, balance: bal?.balance || 0, packs: Object.entries(APPRAISAL_PACKS).map(([n, c]) => ({ count: Number(n), cents: c })), max_people: SMALL_TEAM_MAX };
            }
            const adv = limitAdvice(op);
            const people = { max: adv.limit, next: adv.next, text: adv.text };
            return res.status(200).json({ success: true, billing, people, org, report_level: level, me: { member_id: me.id, role: me.role }, members: members || [], cycles, appraisals: metaAppraisals, templates: templates || [], gate: { decision: gate.decision, rule: gate.rule ? { title: gate.rule.title, requirement_text: gate.rule.requirement_text, checklist: gate.rule.checklist, reference_links: gate.rule.reference_links, rule_version: gate.rule.rule_version } : null, missing: gate.missing || null } });
        },

        'appr-org-update': async (req, res) => {
            const sb = getSupabase(); const user = await authUser(req, res, sb); if (!user) return;
            const orgId = req.body?.orgId; if (!isId(orgId)) return fail(res, 400, 'Missing organisation.');
            const me = await getMember(sb, user.id, orgId); if (!isHr(me)) return fail(res, 403, 'Only an owner or HR admin can change this.');
            const org = await getOrg(sb, orgId);
            const patch = { updated_at: new Date().toISOString() };
            if (req.body.name) patch.name = clip(req.body.name, 150);
            if (req.body.retention_years !== undefined) {
                const rule = await loadRule(sb, org.country_code, 'appraisal');
                let y = Math.round(Number(req.body.retention_years));
                if (!Number.isFinite(y)) return fail(res, 400, 'Retention must be a number of years.');
                y = Math.max(rule?.retention_years_min || 1, Math.min(rule?.retention_years_max || 10, y, 10));
                patch.retention_years = y;
            }
            if (['micro', 'standard'].includes(req.body.mode) && me.role === 'owner') {
                const op = await ownerProfile(sb, org);
                patch.mode = microOnly(op) ? 'micro' : req.body.mode;
            }
            if (['unknown', 'exists', 'none'].includes(req.body.works_council_status)) patch.works_council_status = req.body.works_council_status;
            if (req.body.works_council_ref !== undefined) patch.works_council_ref = clip(req.body.works_council_ref, 300) || null;
            await sb.from('organisations').update(patch).eq('id', orgId);
            await ev(sb, { id: null, org_id: orgId }, me, user.id, 'org_updated', null, null, { fields: Object.keys(patch).filter(k => k !== 'updated_at'), org_id: orgId });
            return res.status(200).json({ success: true, retention_years: patch.retention_years ?? org.retention_years });
        },

        'appr-member-invite': async (req, res) => {
            const sb = getSupabase(); const user = await authUser(req, res, sb); if (!user) return;
            const b = req.body || {}; if (!isId(b.orgId)) return fail(res, 400, 'Missing organisation.');
            const me = await getMember(sb, user.id, b.orgId); if (!isHr(me)) return fail(res, 403, 'Only an owner or HR admin can invite people.');
            const org = await getOrg(sb, b.orgId);
            const email = clip(b.email, 200).trim().toLowerCase();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(res, 400, 'Please enter a valid email address.');
            const role = ['hr_admin', 'approver', 'member'].includes(b.role) ? b.role : 'member';
            if (role === 'hr_admin' && me.role !== 'owner') return fail(res, 403, 'Only an owner can add an HR admin.');
            if (b.supervisor_member_id && !isId(b.supervisor_member_id)) return fail(res, 400, 'Invalid supervisor.');
            if (b.supervisor_member_id) { const { data: s } = await sb.from('org_members').select('id').eq('id', b.supervisor_member_id).eq('org_id', b.orgId).neq('status', 'left').maybeSingle(); if (!s) return fail(res, 400, 'Supervisor not found.'); }
            const advice = limitAdvice(await ownerProfile(sb, org)); const limit = advice.limit;
            const { count } = await sb.from('org_members').select('id', { count: 'exact', head: true }).eq('org_id', b.orgId).neq('status', 'left');
            const { data: existing } = await sb.from('org_members').select('*').eq('org_id', b.orgId).eq('email', email).maybeSingle();
            if (existing && existing.status === 'active') return fail(res, 409, 'That person is already a member.');
            if (!existing && (count || 0) >= limit) return fail(res, 400, advice.text, { code: 'limit_reached', limit, next: advice.next });
            const token = crypto.randomBytes(32).toString('base64url');
            const row = { org_id: b.orgId, email, full_name: clip(b.full_name, 120) || null, job_title: clip(b.job_title, 120) || null, department: clip(b.department, 80).trim() || null, role, supervisor_member_id: b.supervisor_member_id || null, status: 'invited', invite_token_hash: sha(token), invited_at: new Date().toISOString(), left_at: null };
            const { error } = existing ? await sb.from('org_members').update(row).eq('id', existing.id) : await sb.from('org_members').insert(row);
            if (error) { console.error('invite', error.message); return fail(res, 500, 'Could not send the invitation.'); }
            await sendMail?.({ to: email, subject: `${org.name} has invited you to ODUSBABA Appraisals`, html: `<div style="font-family:Arial,sans-serif;max-width:560px"><p>${org.name.replace(/[<>&]/g, '')} has invited you to take part in staff appraisals on ODUSBABA.</p><p>Sign in (or create a free account) with <b>this email address</b>, then accept the invitation. The link is valid for 14 days.</p><p><a href="${site()}/appraisals/join?token=${token}" style="display:inline-block;background:#0B3C5D;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">Accept invitation</a></p><p style="color:#64748b;font-size:12px">If you were not expecting this, you can ignore the email.</p></div>` }).catch(e => console.error('invite mail', e.message));
            await ev(sb, { id: null, org_id: b.orgId }, me, user.id, 'member_invited', null, null, { org_id: b.orgId, role });
            return res.status(200).json({ success: true });
        },

        'appr-member-accept': async (req, res) => {
            const sb = getSupabase(); const user = await authUser(req, res, sb); if (!user) return;
            const token = clip(req.body?.token, 200); if (!token) return fail(res, 400, 'Missing invitation.');
            const { data: m } = await sb.from('org_members').select('*, organisations(name, country_code)').eq('invite_token_hash', sha(token)).eq('status', 'invited').maybeSingle();
            if (!m || new Date(m.invited_at).getTime() < Date.now() - 14 * DAY) return fail(res, 400, 'This invitation is not valid any more. Ask your organisation to send a new one.');
            if (m.email.toLowerCase() !== user.email) return fail(res, 403, `This invitation was sent to a different email address. Sign in with the address the invitation was sent to.`);
            await sb.from('org_members').update({ user_id: user.id, status: 'active', joined_at: new Date().toISOString(), invite_token_hash: null }).eq('id', m.id);
            await ev(sb, { id: null, org_id: m.org_id }, m, user.id, 'member_joined', null, null, { org_id: m.org_id });
            return res.status(200).json({ success: true, orgId: m.org_id, org_name: m.organisations?.name, country: m.organisations?.country_code });
        },

        'appr-member-update': async (req, res) => {
            const sb = getSupabase(); const user = await authUser(req, res, sb); if (!user) return;
            const b = req.body || {}; if (!isId(b.orgId) || !isId(b.memberId)) return fail(res, 400, 'Missing details.');
            const me = await getMember(sb, user.id, b.orgId); if (!isHr(me)) return fail(res, 403, 'Only an owner or HR admin can change this.');
            const { data: target } = await sb.from('org_members').select('*').eq('id', b.memberId).eq('org_id', b.orgId).maybeSingle(); if (!target) return fail(res, 404, 'Person not found.');
            const patch = {};
            if (b.job_title !== undefined) patch.job_title = clip(b.job_title, 120) || null;
            if (b.department !== undefined) patch.department = clip(b.department, 80).trim() || null;
            if (b.full_name !== undefined) patch.full_name = clip(b.full_name, 120) || null;
            if (b.role !== undefined) {
                if (!['owner', 'hr_admin', 'approver', 'member'].includes(b.role)) return fail(res, 400, 'Invalid role.');
                if ((['owner', 'hr_admin'].includes(b.role) || ['owner', 'hr_admin'].includes(target.role)) && me.role !== 'owner') return fail(res, 403, 'Only an owner can change owner or HR admin roles.');
                if (target.role === 'owner' && b.role !== 'owner') { const { count } = await sb.from('org_members').select('id', { count: 'exact', head: true }).eq('org_id', b.orgId).eq('role', 'owner').eq('status', 'active'); if ((count || 0) < 2) return fail(res, 400, 'An organisation needs at least one owner.'); }
                patch.role = b.role;
            }
            if (b.supervisor_member_id !== undefined) {
                if (b.supervisor_member_id === null || b.supervisor_member_id === '') patch.supervisor_member_id = null;
                else {
                    if (!isId(b.supervisor_member_id) || b.supervisor_member_id === target.id) return fail(res, 400, 'Invalid supervisor.');
                    let cur = b.supervisor_member_id, hops = 0;
                    while (cur && hops++ < 50) { if (cur === target.id) return fail(res, 400, 'That would make a reporting loop.'); const { data: c } = await sb.from('org_members').select('supervisor_member_id, status').eq('id', cur).eq('org_id', b.orgId).maybeSingle(); if (!c) return fail(res, 400, 'Supervisor not found.'); if (hops === 1 && c.status === 'left') return fail(res, 400, 'That supervisor has left.'); cur = c.supervisor_member_id; }
                    patch.supervisor_member_id = b.supervisor_member_id;
                }
            }
            if (!Object.keys(patch).length) return fail(res, 400, 'Nothing to change.');
            await sb.from('org_members').update(patch).eq('id', target.id);
            await ev(sb, { id: null, org_id: b.orgId }, me, user.id, 'member_updated', null, null, { org_id: b.orgId, member: target.id, fields: Object.keys(patch) });
            return res.status(200).json({ success: true });
        },

        // Someone leaves (HR removes them, or they leave themselves). Records are kept; nothing is deleted.
        'appr-member-leave': async (req, res) => {
            const sb = getSupabase(); const user = await authUser(req, res, sb); if (!user) return;
            const b = req.body || {}; if (!isId(b.orgId)) return fail(res, 400, 'Missing details.');
            const me = await getMember(sb, user.id, b.orgId); if (!me) return fail(res, 403, 'Not a member.');
            const targetId = isId(b.memberId) ? b.memberId : me.id;
            if (targetId !== me.id && !isHr(me)) return fail(res, 403, 'Only an owner or HR admin can remove someone.');
            const { data: target } = await sb.from('org_members').select('*').eq('id', targetId).eq('org_id', b.orgId).maybeSingle(); if (!target || target.status === 'left') return fail(res, 404, 'Person not found.');
            if (target.role === 'owner') { const { count } = await sb.from('org_members').select('id', { count: 'exact', head: true }).eq('org_id', b.orgId).eq('role', 'owner').eq('status', 'active'); if ((count || 0) < 2) return fail(res, 400, 'Transfer ownership to someone else first.'); }
            const org = await getOrg(sb, b.orgId);
            const years = await retentionFor(sb, org);
            await sb.from('org_members').update({ status: 'left', left_at: new Date().toISOString(), invite_token_hash: null }).eq('id', targetId);
            // 1) their own open appraisals are closed (record kept, retention clock starts)
            const { data: own } = await sb.from('appraisals').select('*').eq('employee_member_id', targetId).not('status', 'in', `(${CLOSED.join(',')})`);
            for (const a of (own || [])) { try { await transition(sb, a, 'closed_employee_left', me, user.id, 'employee_left', { retention_until: retentionDate(years) }); } catch { /* concurrent change; skip */ } }
            // 2) appraisals they supervised need a new supervisor; HR is told. Nothing is completed on their behalf.
            const { data: sup } = await sb.from('appraisals').select('*').eq('supervisor_member_id', targetId).not('status', 'in', `(${CLOSED.join(',')})`);
            for (const a of (sup || [])) { await sb.from('appraisals').update({ needs_reassignment: true, updated_at: new Date().toISOString() }).eq('id', a.id); await ev(sb, a, me, user.id, 'supervisor_left', a.status, a.status, {}); }
            // 3) the people they supervised have no supervisor until HR assigns one
            await sb.from('org_members').update({ supervisor_member_id: null }).eq('supervisor_member_id', targetId);
            if ((sup || []).length) { const { data: hrs } = await sb.from('org_members').select('id').eq('org_id', b.orgId).in('role', ['owner', 'hr_admin']).eq('status', 'active'); await notify(sb, (hrs || []).map(h => h.id), 'Action needed: appraisals need a new supervisor', `A supervisor has left ${org.name.replace(/[<>&]/g, '')}. ${(sup || []).length} appraisal(s) need a new supervisor.`, null, org.name); }
            await ev(sb, { id: null, org_id: b.orgId }, me, user.id, 'member_left', null, null, { org_id: b.orgId, member: targetId, closed: (own || []).length, reassign: (sup || []).length });
            return res.status(200).json({ success: true, closed: (own || []).length, needs_reassignment: (sup || []).length });
        },

        'appr-reassign': async (req, res) => {
            const sb = getSupabase(); const user = await authUser(req, res, sb); if (!user) return;
            const ctx = await loadCtx(sb, user.id, req.body?.appraisalId); if (!ctx || !ctx.roles.includes('hr')) return fail(res, 403, 'Only an owner or HR admin can do this.');
            const sid = req.body?.supervisorMemberId; if (!isId(sid)) return fail(res, 400, 'Choose a supervisor.');
            const ap = ctx.appraisal;
            if (CLOSED.includes(ap.status)) return fail(res, 400, 'This appraisal is closed.');
            const { data: s } = await sb.from('org_members').select('id, status').eq('id', sid).eq('org_id', ap.org_id).eq('status', 'active').maybeSingle();
            if (!s || sid === ap.employee_member_id) return fail(res, 400, 'Choose a different active supervisor.');
            const patch = { supervisor_member_id: sid, needs_reassignment: false, escalated_at: null, updated_at: new Date().toISOString() };
            if (ap.status === 'awaiting_supervisor') patch.supervisor_due = plusDays(14);
            await sb.from('appraisals').update(patch).eq('id', ap.id);
            await sb.from('org_members').update({ supervisor_member_id: sid }).eq('id', ap.employee_member_id);
            await ev(sb, ap, ctx.member, user.id, 'supervisor_reassigned', ap.status, ap.status, { to: sid });
            const org = await getOrg(sb, ap.org_id);
            await notify(sb, [sid], 'An appraisal has been assigned to you', 'An appraisal has been assigned to you as supervisor.', ap.id, org?.name);
            return res.status(200).json({ success: true });
        },

        'appr-template-save': async (req, res) => {
            const sb = getSupabase(); const user = await authUser(req, res, sb); if (!user) return;
            const b = req.body || {}; const me = isId(b.orgId) ? await getMember(sb, user.id, b.orgId) : null; if (!isHr(me)) return fail(res, 403, 'Only an owner or HR admin can do this.');
            const criteria = (Array.isArray(b.criteria) ? b.criteria : []).slice(0, 12).map((c, i) => {
                const anchors = {}; ['1', '3', '5'].forEach(k => { const t = clip(c.anchors?.[k], 200).trim(); if (t) anchors[k] = t; });
                return { id: clip(c.id || `c${i + 1}`, 30).replace(/[^a-z0-9_]/gi, '_'), title: clip(c.title, 120).trim(), description: clip(c.description, 400).trim(), weight: [1, 2, 3].includes(Number(c.weight)) ? Number(c.weight) : 1, ...(Object.keys(anchors).length ? { anchors } : {}) };
            }).filter(c => c.title);
            if (criteria.length < 1) return fail(res, 400, 'Add at least one question.');
            if (new Set(criteria.map(c => c.id)).size !== criteria.length) return fail(res, 400, 'Each question needs its own id.');
            const name = clip(b.name, 120).trim() || 'Custom appraisal';
            if (isId(b.templateId)) {
                const { data: own } = await sb.from('appraisal_templates').select('id').eq('id', b.templateId).eq('org_id', b.orgId).maybeSingle();
                if (!own) return fail(res, 404, 'Template not found.');
                await sb.from('appraisal_templates').update({ name, criteria, description: clip(b.description, 300) || null, use_potential: b.use_potential === true }).eq('id', b.templateId);
                return res.status(200).json({ success: true, id: b.templateId });
            }
            const { count } = await sb.from('appraisal_templates').select('id', { count: 'exact', head: true }).eq('org_id', b.orgId);
            if ((count || 0) >= 20) return fail(res, 400, 'You can keep up to 20 templates.');
            const { data, error } = await sb.from('appraisal_templates').insert({ org_id: b.orgId, name, criteria, category: 'custom', description: clip(b.description, 300) || null, use_potential: b.use_potential === true }).select('id').single();
            if (error) return fail(res, 500, 'Could not save the template.');
            return res.status(200).json({ success: true, id: data.id });
        },

        // Small teams buy appraisal credits for the organisation (owner only). Credits are added by the Stripe webhook, once per payment.
        'appr-credits-checkout': async (req, res) => {
            const sb = getSupabase(); const user = await authUser(req, res, sb); if (!user) return;
            const b = req.body || {}; if (!isId(b.orgId)) return fail(res, 400, 'Missing organisation.');
            const me = await getMember(sb, user.id, b.orgId); if (!me || me.role !== 'owner') return fail(res, 403, 'Only the owner can buy appraisal credits.');
            const count = Number(b.count); const cents = APPRAISAL_PACKS[count]; if (!cents) return fail(res, 400, 'Choose one of the packs shown.');
            const org = await getOrg(sb, b.orgId);
            if (!billable(await ownerProfile(sb, org))) return fail(res, 400, 'Appraisals are already included with your plan.');
            if (!(await enforceGate(sb, req, res, { service: 'paid_services', orgId: org.id, orgCountry: org.country_code, userId: user.id }))) return;
            if (!process.env.STRIPE_SECRET_KEY) return fail(res, 503, 'Payments are not switched on yet. Please contact support.');
            try {
                const Stripe = (await import('stripe')).default; const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
                const session = await stripe.checkout.sessions.create({
                    mode: 'payment', payment_method_types: ['card'],
                    line_items: [{ price_data: { currency: 'usd', product_data: { name: `${count} staff appraisal${count === 1 ? '' : 's'}` }, unit_amount: cents }, quantity: 1 }],
                    success_url: `${site()}/appraisals/org/${org.id}?credits=added`, cancel_url: `${site()}/appraisals/org/${org.id}?credits=cancelled`,
                    client_reference_id: user.id, customer_email: user.email || undefined,
                    metadata: { type: 'appraisal_pack', orgId: org.id, count: String(count), userId: user.id }
                });
                return res.status(200).json({ success: true, url: session.url });
            } catch (e) { console.error('appr-credits-checkout', e.message); return fail(res, 500, 'Could not start the payment. Please try again.'); }
        },

        // AI help with IDEAS FOR QUESTIONS ONLY. It gives a short list of starting points; the appraiser chooses, rewrites and
        // owns every question they adopt. It never sees a person's name or ratings and never reads or judges any result.
        // Nothing is saved here.
        'appr-template-ai-draft': async (req, res) => {
            const sb = getSupabase(); const user = await authUser(req, res, sb); if (!user) return;
            const b = req.body || {}; const me = isId(b.orgId) ? await getMember(sb, user.id, b.orgId) : null; if (!isHr(me)) return fail(res, 403, 'Only an owner or HR admin can do this.');
            if (!callAI || !deductAiCredit) return fail(res, 503, 'AI help is not switched on yet.');
            const role = clip(b.role, 80).trim(), industry = clip(b.industry, 80).trim(), focus = clip(b.focus, 300).trim();
            if (role.length < 2) return fail(res, 400, 'Describe the job, for example "kitchen assistant".');
            if (PERSONAL_DATA.test(`${role} ${industry} ${focus}`)) return fail(res, 400, 'Please describe the job only. Do not type names, email addresses, phone numbers or web links.');
            const org = await getOrg(sb, b.orgId);
            if (!(await enforceGate(sb, req, res, { service: 'ai_services', orgId: org.id, orgCountry: org.country_code, userId: user.id }))) return;
            const credit = await deductAiCredit(sb, user.id, req);
            if (!credit?.allowed) return fail(res, 402, credit?.rateLimited ? 'Too many requests. Please try again in a few minutes.' : 'You are out of AI credits. Buy more or wait for your monthly allowance.', { code: 'ai_credits_needed' });
            try {
                const out = await callAI([
                    { role: 'system', content: 'You give small employers a short list of starting ideas for staff appraisal questions. Each idea is only a topic about work results or observable work behaviour, with one plain sentence on what it could cover. Never suggest anything about age, sex, gender, pregnancy, marital or family status, health, disability, race, ethnicity, nationality, religion, politics, union membership, sexual orientation, appearance or private life. Reply with JSON only.' },
                    { role: 'user', content: `Job: ${role}\nWorkplace: ${industry || 'not stated'}\nWhat matters most: ${focus || 'not stated'}\n\nSuggest 8 topics that could be appraisal questions for this job. Return JSON: {"suggestions":[{"title":"short topic, max 60 characters","covers":"one plain sentence on what it could cover"}]}` }
                ], 700, 0.6, { type: 'json_object' });
                let parsed; try { parsed = JSON.parse(out.choices[0].message.content); } catch { throw new Error('unreadable AI reply'); }
                const kept = [], removed = [];
                for (const c of (Array.isArray(parsed.suggestions) ? parsed.suggestions : []).slice(0, 10)) {
                    const item = { title: clip(c.title, 60).trim(), covers: clip(c.covers, 200).trim() };
                    if (!item.title) continue;
                    // Automatic screen: anything touching a protected characteristic is dropped before it reaches the screen.
                    if (SENSITIVE.test(`${item.title} ${item.covers}`)) { removed.push(item.title); continue; }
                    kept.push(item);
                }
                if (kept.length < 2) throw new Error('too few usable ideas');
                return res.status(200).json({ success: true, suggestions: kept, removed, note: 'Ideas only. Choose what suits the job, put it in your own words, and add your own. You decide which questions to use and you are responsible for them.' });
            } catch (e) {
                console.error('appr-template-ai-draft', e.message);
                try { await refundAiCredit?.(sb, user.id, credit); } catch { /* ignore */ }
                return fail(res, 502, 'The AI could not give usable ideas this time. Your credit was returned. Try again, or describe the job a little differently.');
            }
        },

        'appr-template-delete': async (req, res) => {
            const sb = getSupabase(); const user = await authUser(req, res, sb); if (!user) return;
            const b = req.body || {}; const me = isId(b.orgId) ? await getMember(sb, user.id, b.orgId) : null; if (!isHr(me)) return fail(res, 403, 'Only an owner or HR admin can do this.');
            if (!isId(b.templateId)) return fail(res, 400, 'Missing template.');
            await sb.from('appraisal_templates').delete().eq('id', b.templateId).eq('org_id', b.orgId);   // appraisals keep their own frozen copy
            return res.status(200).json({ success: true });
        },

        // HR changes who approves one appraisal (for example an independent approver when the owner is also the supervisor).
        'appr-approver-set': async (req, res) => {
            const sb = getSupabase(); const user = await authUser(req, res, sb); if (!user) return;
            const ctx = await loadCtx(sb, user.id, req.body?.appraisalId); if (!ctx || !ctx.roles.includes('hr')) return fail(res, 403, 'Only an owner or HR admin can do this.');
            const ap = ctx.appraisal; if (CLOSED.includes(ap.status)) return fail(res, 400, 'This appraisal is closed.');
            const mid = req.body?.memberId; if (!isId(mid)) return fail(res, 400, 'Choose a person.');
            const org = await getOrg(sb, ap.org_id);
            const { data: m } = await sb.from('org_members').select('id, role').eq('id', mid).eq('org_id', ap.org_id).eq('status', 'active').maybeSingle();
            if (!m || mid === ap.employee_member_id) return fail(res, 400, 'Choose a different active person.');
            if (org.mode !== 'micro' && mid === ap.supervisor_member_id) return fail(res, 400, 'The approver must be someone other than the supervisor.');
            await sb.from('appraisals').update({ approver_member_id: mid, owner_approved: mid === ap.supervisor_member_id, updated_at: new Date().toISOString() }).eq('id', ap.id);
            await ev(sb, ap, ctx.member, user.id, 'approver_changed', ap.status, ap.status, { to: mid });
            if (['awaiting_final_approval', 'escalated_disagreement'].includes(ap.status)) await notify(sb, [mid], 'An appraisal needs your decision', 'You have been asked to make the final decision on an appraisal.', ap.id, org.name);
            return res.status(200).json({ success: true });
        },

        // ---- Cycles and appraisals ----
        'appr-cycle-create': async (req, res) => {
            const sb = getSupabase(); const user = await authUser(req, res, sb); if (!user) return;
            if (!guardEnc(res)) return;
            const b = req.body || {}; if (!isId(b.orgId)) return fail(res, 400, 'Missing organisation.');
            const me = await getMember(sb, user.id, b.orgId); if (!isHr(me)) return fail(res, 403, 'Only an owner or HR admin can start an appraisal round.');
            const org = await getOrg(sb, b.orgId); if (org.status !== 'active') return fail(res, 403, 'This organisation is not active.');
            const gate = await gateOrg(req, res, sb, user, org); if (!gate) return;
            const { data: tpl } = isId(b.template_id) ? await sb.from('appraisal_templates').select('*').eq('id', b.template_id).or(`org_id.is.null,org_id.eq.${b.orgId}`).maybeSingle()
                : org.mode === 'micro' ? await sb.from('appraisal_templates').select('*').is('org_id', null).eq('category', 'micro_default').limit(1).maybeSingle()
                : await sb.from('appraisal_templates').select('*').is('org_id', null).eq('is_default', true).limit(1).maybeSingle();
            if (!tpl) return fail(res, 400, 'Template not found.');
            const snapshot = { name: tpl.name, criteria: tpl.criteria, scale: tpl.scale, ...(tpl.use_potential ? { potential: true } : {}) };
            const { data: members } = await sb.from('org_members').select('*').eq('org_id', b.orgId).eq('status', 'active');
            const byId = Object.fromEntries((members || []).map(m => [m.id, m]));
            let employees = (members || []).filter(m => m.supervisor_member_id && byId[m.supervisor_member_id]);
            if (Array.isArray(b.memberIds) && b.memberIds.length) employees = employees.filter(m => b.memberIds.includes(m.id));
            employees = employees.slice(0, 200);
            // A plan that lapsed or was downgraded after people were added: existing people stay on record, but a new round waits until the team fits.
            { const adv = limitAdvice(await ownerProfile(sb, org)); if ((members || []).length > adv.limit) return fail(res, 400, `This organisation has ${(members || []).length} active people, more than the ${adv.limit} your plan covers. ${adv.text} You can also mark people who have left.`, { code: 'limit_reached', limit: adv.limit, next: adv.next }); }
            if (!employees.length) return fail(res, 400, 'No one is ready to be appraised. Give each person a supervisor first.');
            // Small teams pay one credit per person appraised. Charged first (locked, so no double spend); any unused part is returned.
            const bill = billable(await ownerProfile(sb, org));
            let charged = 0;
            if (bill) {
                const { data: ch } = await sb.rpc('appraisal_credit_adjust', { p_org: org.id, p_delta: -employees.length, p_reason: 'used', p_ref: null, p_appraisal: null });
                const r = Array.isArray(ch) ? ch[0] : ch;
                if (!r?.success) return fail(res, 402, `This round needs ${employees.length} appraisal credit${employees.length === 1 ? '' : 's'} and you have ${r?.new_balance ?? 0}. Buy more to continue.`, { code: 'credits_needed', needed: employees.length, balance: r?.new_balance ?? 0 });
                charged = employees.length;
            }
            const giveBack = async (n) => { if (bill && n > 0) await sb.rpc('appraisal_credit_adjust', { p_org: org.id, p_delta: n, p_reason: 'refund', p_ref: null, p_appraisal: null }); };
            const dueOrNull = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(String(d || '')) ? d : null);
            const { data: cycle, error: ce } = await sb.from('appraisal_cycles').insert({ org_id: b.orgId, name: clip(b.name, 120) || 'Appraisal round', period_start: dueOrNull(b.period_start), period_end: dueOrNull(b.period_end), template_id: tpl.id, self_due: dueOrNull(b.self_due) || plusDays(14), supervisor_due: dueOrNull(b.supervisor_due) || plusDays(28), response_due: dueOrNull(b.response_due) || plusDays(42), final_due: dueOrNull(b.final_due) || plusDays(56), created_by: user.id }).select('*').single();
            if (ce) { console.error('cycle', ce.message); await giveBack(charged); return fail(res, 500, 'Could not start the round.'); }
            const created = [], skipped = [];
            for (const emp of employees) {
                const sup = byId[emp.supervisor_member_id];
                let approver = sup?.supervisor_member_id && byId[sup.supervisor_member_id] && sup.supervisor_member_id !== emp.id ? byId[sup.supervisor_member_id] : null;
                if (!approver) approver = (members || []).find(m => m.role === 'approver' && m.id !== emp.id && m.id !== sup.id) || (members || []).find(m => ['owner', 'hr_admin'].includes(m.role) && m.id !== emp.id && m.id !== sup.id) || null;
                // Small employers: the owner may supervise and approve. It is recorded as owner-approved, and an independent
                // approver can be added later if there is a disagreement.
                if (!approver && org.mode === 'micro' && ['owner', 'hr_admin'].includes(sup.role) && sup.id !== emp.id) approver = sup;
                if (!approver) { skipped.push({ member_id: emp.id, reason: 'No separate approver available. Add an approver or HR admin.' }); continue; }
                const { data: ap, error } = await sb.from('appraisals').insert({ org_id: b.orgId, cycle_id: cycle.id, employee_member_id: emp.id, supervisor_member_id: sup.id, approver_member_id: approver.id, owner_approved: approver.id === sup.id, template_snapshot: snapshot, country_code: org.country_code, self_due: cycle.self_due, supervisor_due: cycle.supervisor_due, response_due: cycle.response_due, final_due: cycle.final_due }).select('id').single();
                if (error) { skipped.push({ member_id: emp.id, reason: 'Could not create.' }); continue; }
                created.push(ap.id);
                if (bill) await sb.from('appraisals').update({ credit_charged: true }).eq('id', ap.id);
                await ev(sb, { id: ap.id, org_id: b.orgId }, me, user.id, 'appraisal_created', null, 'awaiting_self', { cycle: cycle.id });
                await notify(sb, [emp.id], 'Your appraisal is ready', `Your ${cycle.name.replace(/[<>&]/g, '')} appraisal is ready. Please complete your self-appraisal by ${cycle.self_due}.`, ap.id, org.name);
            }
            await giveBack(charged - created.length);
            return res.status(200).json({ success: true, cycle_id: cycle.id, created: created.length, skipped, credits_used: bill ? created.length : 0 });
        },

        'appr-get': async (req, res) => {
            const sb = getSupabase(); const user = await authUser(req, res, sb); if (!user) return;
            if (!guardEnc(res)) return;
            const ctx = await loadCtx(sb, user.id, req.body?.appraisalId || req.query?.appraisalId, ['active', 'left']); if (!ctx) return fail(res, 404, 'Appraisal not found.');
            return res.status(200).json({ success: true, ...(await buildView(sb, ctx, user.id)) });
        },

        'appr-draft-save': async (req, res) => {
            const sb = getSupabase(); const user = await authUser(req, res, sb); if (!user) return;
            if (!guardEnc(res)) return;
            const ctx = await loadCtx(sb, user.id, req.body?.appraisalId); if (!ctx) return fail(res, 404, 'Appraisal not found.');
            const stage = draftStage(ctx); if (!stage) return fail(res, 400, 'There is nothing for you to draft right now.');
            const raw = req.body?.content; if (JSON.stringify(raw || {}).length > 60000) return fail(res, 400, 'That is too long.');
            const safe = { ratings: raw?.ratings || {}, comments: raw?.comments || {}, summary: clip(raw?.summary, 8000), goals: clip(raw?.goals, 4000), ...([1, 2, 3].includes(Number(raw?.potential)) ? { potential: Number(raw.potential) } : {}) };
            const { error } = await sb.from('appraisal_drafts').upsert({ appraisal_id: ctx.appraisal.id, member_id: ctx.member.id, stage, content_enc: encrypt(safe), updated_at: new Date().toISOString() }, { onConflict: 'appraisal_id,member_id,stage' });
            if (error) return fail(res, 500, 'Could not save your draft.');
            return res.status(200).json({ success: true });
        },

        // One handler for every "send it on" step. The status and the person's role decide what it means.
        'appr-submit': async (req, res) => {
            const sb = getSupabase(); const user = await authUser(req, res, sb); if (!user) return;
            if (!guardEnc(res)) return;
            const ctx = await loadCtx(sb, user.id, req.body?.appraisalId); if (!ctx) return fail(res, 404, 'Appraisal not found.');
            const ap = ctx.appraisal; const org = await getOrg(sb, ap.org_id);
            if (org.status !== 'active') return fail(res, 403, 'This organisation is not active.');
            const gate = await gateOrg(req, res, sb, user, org); if (!gate) return;
            const act = actionFor(ctx);
            const snap = ap.template_snapshot;
            try {
                if (act === 'complete_self') {
                    const c = cleanContent('self', req.body.content, snap); if (c.error) return fail(res, 400, c.error);
                    await lockVersion(sb, ap, 'self', ctx.member, c.value);
                    await transition(sb, ap, 'awaiting_supervisor', ctx.member, user.id, 'self_submitted', { supervisor_due: nextDue(ap.supervisor_due), last_reminded_at: null });
                    await notify(sb, [ap.supervisor_member_id], 'An appraisal is waiting for you', 'A team member has completed their self-appraisal. Please complete your assessment.', ap.id, org.name);
                } else if (act === 'complete_supervisor') {
                    const c = cleanContent('supervisor', req.body.content, snap); if (c.error) return fail(res, 400, c.error);
                    await lockVersion(sb, ap, 'supervisor', ctx.member, c.value);
                    await transition(sb, ap, 'awaiting_employee_response', ctx.member, user.id, 'supervisor_submitted', { response_due: plusDays(14), last_reminded_at: null, escalated_at: null, needs_reassignment: false });
                    await notify(sb, [ap.employee_member_id], 'Your appraisal is ready for your response', 'Your supervisor has completed your appraisal. Please read it and accept or reject it.', ap.id, org.name);
                } else if (act === 'give_input') {
                    const c = cleanContent('contributor', req.body.content, snap); if (c.error) return fail(res, 400, c.error);
                    await lockVersion(sb, ap, 'contributor', ctx.member, c.value);
                    await sb.from('appraisal_contributors').update({ status: 'submitted' }).eq('appraisal_id', ap.id).eq('member_id', ctx.member.id);
                    await ev(sb, ap, ctx.member, user.id, 'contributor_submitted', ap.status, ap.status, {});
                } else if (act === 'respond') {
                    const c = cleanContent('employee_response', req.body.content, snap); if (c.error) return fail(res, 400, c.error);
                    await lockVersion(sb, ap, 'employee_response', ctx.member, c.value);
                    if (c.value.decision === 'accept') {
                        await transition(sb, ap, 'awaiting_final_approval', ctx.member, user.id, 'employee_accepted', { final_due: nextDue(ap.final_due), last_reminded_at: null });
                        await notify(sb, [ap.approver_member_id], 'An appraisal is ready for final approval', 'An appraisal has been accepted and is ready for your final approval.', ap.id, org.name);
                    } else if (ap.round < 2) {
                        await transition(sb, ap, 'meeting_required', ctx.member, user.id, 'employee_rejected', { last_reminded_at: null }, { round: ap.round });
                        await notify(sb, [ap.supervisor_member_id], 'A face-to-face discussion is needed', 'The employee has not accepted the appraisal. Please propose times for a face-to-face discussion.', ap.id, org.name);
                    } else {
                        await transition(sb, ap, 'escalated_disagreement', ctx.member, user.id, 'employee_rejected_again', { disagreement: true, escalated_at: new Date().toISOString(), final_due: nextDue(ap.final_due), last_reminded_at: null });
                        await notify(sb, [ap.approver_member_id], 'An appraisal needs your decision', 'The employee and supervisor could not agree after a discussion. Please review both views and decide.', ap.id, org.name);
                    }
                } else if (act === 'record_joint') {
                    const c = cleanContent('joint', req.body.content, snap); if (c.error) return fail(res, 400, c.error);
                    await lockVersion(sb, ap, 'joint', ctx.member, c.value, 2);
                    await transition(sb, ap, 'awaiting_employee_response', ctx.member, user.id, 'joint_recorded', { round: 2, response_due: plusDays(14), last_reminded_at: null, employee_no_response: false });
                    await notify(sb, [ap.employee_member_id], 'Please review the agreed appraisal', 'Following your discussion, a joint appraisal record is ready. Please review it and accept or reject it.', ap.id, org.name);
                } else return fail(res, 400, 'There is nothing for you to submit at this stage.');
            } catch (e) {
                if (e.code === 'CONFLICT') return fail(res, 409, 'This appraisal was just updated by someone else. Please reload.');
                if (e.code === 'ENC') return fail(res, 503, 'Appraisals are not switched on yet.');
                console.error('appr-submit', e.message); return fail(res, 500, 'Could not save. Please try again.');
            }
            return res.status(200).json({ success: true });
        },

        // The employee may add their own written statement at any point after the supervisor has finished.
        'appr-statement': async (req, res) => {
            const sb = getSupabase(); const user = await authUser(req, res, sb); if (!user) return;
            if (!guardEnc(res)) return;
            const ctx = await loadCtx(sb, user.id, req.body?.appraisalId); if (!ctx || !ctx.roles.includes('employee')) return fail(res, 403, 'Only the employee can add a statement.');
            const ap = ctx.appraisal;
            if (['awaiting_self', 'awaiting_supervisor', 'closed_employee_left', 'withdrawn', 'purged'].includes(ap.status)) return fail(res, 400, 'You can add a statement once your supervisor has completed the appraisal.');
            const c = cleanContent('employee_statement', req.body.content, null); if (c.error) return fail(res, 400, c.error);
            try { await lockVersion(sb, ap, 'employee_statement', ctx.member, c.value); } catch (e) { return fail(res, e.code === 'ENC' ? 503 : 500, 'Could not save your statement.'); }
            await ev(sb, ap, ctx.member, user.id, 'employee_statement_added', ap.status, ap.status, {});
            return res.status(200).json({ success: true });
        },

        'appr-contributor-add': async (req, res) => {
            const sb = getSupabase(); const user = await authUser(req, res, sb); if (!user) return;
            const ctx = await loadCtx(sb, user.id, req.body?.appraisalId); if (!ctx || !ctx.roles.includes('supervisor')) return fail(res, 403, 'Only the supervisor can add contributors.');
            const ap = ctx.appraisal; if (!['awaiting_self', 'awaiting_supervisor'].includes(ap.status)) return fail(res, 400, 'Contributors can only be added before you complete your assessment.');
            const mid = req.body?.memberId; if (!isId(mid) || mid === ap.employee_member_id || mid === ap.supervisor_member_id) return fail(res, 400, 'Choose another colleague.');
            const { data: m } = await sb.from('org_members').select('id').eq('id', mid).eq('org_id', ap.org_id).eq('status', 'active').maybeSingle(); if (!m) return fail(res, 400, 'Colleague not found.');
            const { count } = await sb.from('appraisal_contributors').select('member_id', { count: 'exact', head: true }).eq('appraisal_id', ap.id);
            if ((count || 0) >= 3) return fail(res, 400, 'You can add up to three contributors.');
            const { error } = await sb.from('appraisal_contributors').upsert({ appraisal_id: ap.id, member_id: mid, added_by: ctx.member.id }, { onConflict: 'appraisal_id,member_id', ignoreDuplicates: true });
            if (error) return fail(res, 500, 'Could not add.');
            await ev(sb, ap, ctx.member, user.id, 'contributor_added', ap.status, ap.status, {});
            const org = await getOrg(sb, ap.org_id);
            await notify(sb, [mid], 'You have been asked to give input', 'A colleague has asked for your input on an appraisal. Your name and comments will be shown to the employee.', ap.id, org?.name);
            return res.status(200).json({ success: true });
        },

        // ---- Face-to-face meeting ----
        'appr-meeting-propose': async (req, res) => {
            const sb = getSupabase(); const user = await authUser(req, res, sb); if (!user) return;
            const ctx = await loadCtx(sb, user.id, req.body?.appraisalId); if (!ctx || actionFor(ctx) !== 'propose_meeting') return fail(res, 400, 'No meeting is needed at this stage, or you are not the supervisor.');
            const slots = (Array.isArray(req.body?.slots) ? req.body.slots : []).map(s => new Date(s)).filter(d => !isNaN(d) && d.getTime() > Date.now()).slice(0, 5).map(d => d.toISOString());
            if (!slots.length) return fail(res, 400, 'Please propose at least one future date and time.');
            await sb.from('appraisal_meetings').update({ status: 'cancelled' }).eq('appraisal_id', ctx.appraisal.id).in('status', ['proposed', 'scheduled']);
            await sb.from('appraisal_meetings').insert({ appraisal_id: ctx.appraisal.id, proposed_slots: slots, location: clip(req.body?.location, 300) || null, created_by: ctx.member.id });
            await ev(sb, ctx.appraisal, ctx.member, user.id, 'meeting_proposed', ctx.appraisal.status, ctx.appraisal.status, { slots: slots.length });
            const org = await getOrg(sb, ctx.appraisal.org_id);
            await notify(sb, [ctx.appraisal.employee_member_id], 'Please choose a meeting time', 'Your supervisor has proposed times to discuss your appraisal face to face. Please choose one.', ctx.appraisal.id, org?.name);
            return res.status(200).json({ success: true });
        },
        'appr-meeting-choose': async (req, res) => {
            const sb = getSupabase(); const user = await authUser(req, res, sb); if (!user) return;
            const ctx = await loadCtx(sb, user.id, req.body?.appraisalId); if (!ctx || actionFor(ctx) !== 'choose_slot') return fail(res, 400, 'No meeting time to choose right now.');
            const { data: mt } = await sb.from('appraisal_meetings').select('*').eq('appraisal_id', ctx.appraisal.id).eq('status', 'proposed').order('created_at', { ascending: false }).limit(1).maybeSingle();
            if (!mt) return fail(res, 400, 'Your supervisor has not proposed times yet.');
            const slot = new Date(req.body?.slot).toISOString();
            if (!(mt.proposed_slots || []).includes(slot)) return fail(res, 400, 'Please choose one of the proposed times.');
            await sb.from('appraisal_meetings').update({ chosen_slot: slot, status: 'scheduled' }).eq('id', mt.id);
            try { await transition(sb, ctx.appraisal, 'meeting_scheduled', ctx.member, user.id, 'meeting_scheduled', { last_reminded_at: null }, { slot }); } catch { return fail(res, 409, 'Please reload.'); }
            const org = await getOrg(sb, ctx.appraisal.org_id);
            await notify(sb, [ctx.appraisal.supervisor_member_id], 'Meeting confirmed', `The employee has chosen ${slot.replace('T', ' ').slice(0, 16)} UTC for the discussion.`, ctx.appraisal.id, org?.name);
            return res.status(200).json({ success: true });
        },
        'appr-meeting-held': async (req, res) => {
            const sb = getSupabase(); const user = await authUser(req, res, sb); if (!user) return;
            const ctx = await loadCtx(sb, user.id, req.body?.appraisalId); if (!ctx || actionFor(ctx) !== 'hold_meeting') return fail(res, 400, 'No meeting to mark as held.');
            const { data: mt } = await sb.from('appraisal_meetings').select('*').eq('appraisal_id', ctx.appraisal.id).eq('status', 'scheduled').limit(1).maybeSingle();
            if (mt && new Date(mt.chosen_slot).getTime() > Date.now() + 15 * 60000) return fail(res, 400, 'The meeting has not taken place yet.');
            if (mt) await sb.from('appraisal_meetings').update({ status: 'held' }).eq('id', mt.id);
            try { await transition(sb, ctx.appraisal, 'awaiting_joint_record', ctx.member, user.id, 'meeting_held', { last_reminded_at: null }); } catch { return fail(res, 409, 'Please reload.'); }
            return res.status(200).json({ success: true });
        },

        // ---- Final decision by the approver ----
        'appr-final-decision': async (req, res) => {
            const sb = getSupabase(); const user = await authUser(req, res, sb); if (!user) return;
            if (!guardEnc(res)) return;
            const ctx = await loadCtx(sb, user.id, req.body?.appraisalId); if (!ctx || actionFor(ctx) !== 'final_decision') return fail(res, 403, 'You cannot decide this appraisal.');
            const ap = ctx.appraisal; const org = await getOrg(sb, ap.org_id);
            const gate = await gateOrg(req, res, sb, user, org); if (!gate) return;
            const decision = req.body?.decision;
            const note = clip(req.body?.note, 5000).trim();
            try {
                if (decision === 'file') {
                    if (ap.owner_approved && ap.disagreement && note.length < 20) return fail(res, 400, 'The supervisor and the employee did not agree and you are both. Please write a short note explaining your decision, or ask HR to add an independent approver.');
                    if (note) await lockVersion(sb, ap, 'approver_note', ctx.member, { text: note });
                    const years = await retentionFor(sb, org);
                    await transition(sb, ap, 'filed', ctx.member, user.id, 'filed', { filed_at: new Date().toISOString(), retention_until: retentionDate(years) }, { with_disagreement: !!ap.disagreement, employee_no_response: !!ap.employee_no_response, owner_approved: !!ap.owner_approved });
                    await notify(sb, [ap.employee_member_id, ap.supervisor_member_id], 'An appraisal has been filed', 'The appraisal has been approved and filed. You can read and download it.', ap.id, org.name);
                } else if (decision === 'return') {
                    if (note.length < 10) return fail(res, 400, 'Please say why you are returning it.');
                    await lockVersion(sb, ap, 'approver_note', ctx.member, { text: note });
                    await transition(sb, ap, 'returned_to_supervisor', ctx.member, user.id, 'returned', { last_reminded_at: null });
                    await notify(sb, [ap.supervisor_member_id], 'An appraisal was returned to you', 'The approver has returned an appraisal. Please review the note and update the joint record.', ap.id, org.name);
                } else return fail(res, 400, 'Choose file or return.');
            } catch (e) {
                if (e.code === 'CONFLICT') return fail(res, 409, 'This appraisal was just updated. Please reload.');
                if (e.code === 'ENC') return fail(res, 503, 'Appraisals are not switched on yet.');
                console.error('final', e.message); return fail(res, 500, 'Could not save.');
            }
            return res.status(200).json({ success: true });
        },

        'appr-withdraw': async (req, res) => {
            const sb = getSupabase(); const user = await authUser(req, res, sb); if (!user) return;
            const ctx = await loadCtx(sb, user.id, req.body?.appraisalId); if (!ctx || !ctx.roles.includes('hr')) return fail(res, 403, 'Only an owner or HR admin can do this.');
            if (CLOSED.includes(ctx.appraisal.status)) return fail(res, 400, 'This appraisal is already closed.');
            const org = await getOrg(sb, ctx.appraisal.org_id);
            const refundable = ctx.appraisal.credit_charged && ['awaiting_self', 'awaiting_supervisor'].includes(ctx.appraisal.status);
            try { await transition(sb, ctx.appraisal, 'withdrawn', ctx.member, user.id, 'withdrawn', { retention_until: retentionDate(await retentionFor(sb, org)) }, { reason: clip(req.body?.reason, 300) }); } catch { return fail(res, 409, 'Please reload.'); }
            if (refundable) await sb.rpc('appraisal_credit_adjust', { p_org: org.id, p_delta: 1, p_reason: 'refund', p_ref: `refund:${ctx.appraisal.id}`, p_appraisal: ctx.appraisal.id });
            return res.status(200).json({ success: true });
        },

        'appr-legal-hold': async (req, res) => {
            const sb = getSupabase(); const user = await authUser(req, res, sb); if (!user) return;
            const ctx = await loadCtx(sb, user.id, req.body?.appraisalId); if (!ctx || !ctx.roles.includes('hr')) return fail(res, 403, 'Only an owner or HR admin can do this.');
            const on = req.body?.on === true;
            await sb.from('appraisals').update({ legal_hold: on, updated_at: new Date().toISOString() }).eq('id', ctx.appraisal.id);
            await ev(sb, ctx.appraisal, ctx.member, user.id, on ? 'legal_hold_on' : 'legal_hold_off', ctx.appraisal.status, ctx.appraisal.status, {});
            return res.status(200).json({ success: true });
        },

        // ---- Exports ----
        'appr-export-pdf': async (req, res) => {
            const sb = getSupabase(); const user = await authUser(req, res, sb); if (!user) return;
            if (!guardEnc(res)) return;
            const ctx = await loadCtx(sb, user.id, req.body?.appraisalId, ['active', 'left']); if (!ctx) return fail(res, 404, 'Appraisal not found.');
            const view = await buildView(sb, ctx, user.id);
            const org = await getOrg(sb, ctx.appraisal.org_id);
            const bytes = await renderPdf(view, org);
            await ev(sb, ctx.appraisal, ctx.member, user.id, 'exported_pdf', ctx.appraisal.status, ctx.appraisal.status, {});
            return res.status(200).json({ success: true, filename: `appraisal-${ctx.appraisal.id.slice(0, 8)}.pdf`, pdf_base64: Buffer.from(bytes).toString('base64') });
        },

        // Everything this person is allowed to see about themselves, as data (access request / portability).
        'appr-data-export': async (req, res) => {
            const sb = getSupabase(); const user = await authUser(req, res, sb); if (!user) return;
            if (!guardEnc(res)) return;
            const { data: mems } = await sb.from('org_members').select('id').eq('user_id', user.id);
            const ids = (mems || []).map(m => m.id);
            const out = [];
            if (ids.length) {
                const { data: aps } = await sb.from('appraisals').select('id').in('employee_member_id', ids).neq('status', 'purged');
                for (const a of (aps || [])) { const ctx = await loadCtx(sb, user.id, a.id, ['active', 'left']); if (ctx) { const v = await buildView(sb, ctx, user.id, { logRead: false }); out.push({ appraisal: v.appraisal, versions: v.versions, events: v.events }); } }
            }
            return res.status(200).json({ success: true, exported_at: new Date().toISOString(), appraisals: out });
        },

        // ---- Employee progress: what this person is allowed to see about themselves, across rounds ----
        'appr-my-history': async (req, res) => {
            const sb = getSupabase(); const user = await authUser(req, res, sb); if (!user) return;
            if (!guardEnc(res)) return;
            const { data: mems } = await sb.from('org_members').select('id, org_id').eq('user_id', user.id);
            const ids = (mems || []).map(m => m.id);
            if (!ids.length) return res.status(200).json({ success: true, series: [], criteria: [] });
            const { data: aps } = await sb.from('appraisals').select('*').in('employee_member_id', ids).neq('status', 'purged').order('created_at');
            const cycleIds = [...new Set((aps || []).map(a => a.cycle_id).filter(Boolean))];
            const { data: cycles } = cycleIds.length ? await sb.from('appraisal_cycles').select('id, name').in('id', cycleIds) : { data: [] };
            const cname = Object.fromEntries((cycles || []).map(c => [c.id, c.name]));
            const orgCache = {}; const avgCache = {};
            const items = [];
            for (const a of (aps || [])) {
                const ctx = await loadCtx(sb, user.id, a.id, ['active', 'left']); if (!ctx) continue;
                const { data: vers } = await sb.from('appraisal_versions').select('*').eq('appraisal_id', a.id).in('stage', ['self', 'supervisor', 'joint']).order('created_at');
                const pick = {};
                for (const v of (vers || [])) { if (!canSee(ctx, v.stage, v)) continue; try { pick[v.stage] = decrypt(v.content_enc); } catch { /* skip unreadable */ } }
                if (!pick.self && !pick.supervisor) continue;
                // Organisation average: shown only when at least MIN_GROUP appraisals in that round are filed, and never in DE or FR.
                let org_average = null;
                if (a.cycle_id && a.status === 'filed') {
                    orgCache[a.org_id] ||= await getOrg(sb, a.org_id);
                    if (!['DE', 'FR'].includes(orgCache[a.org_id]?.country_code)) {
                        if (!(a.cycle_id in avgCache)) avgCache[a.cycle_id] = await cycleAverages(sb, a.cycle_id);
                        org_average = avgCache[a.cycle_id];
                    }
                }
                items.push({ appraisal_id: a.id, cycle_name: cname[a.cycle_id] || 'Appraisal', date: a.filed_at || a.updated_at, status: a.status, criteria: (a.template_snapshot?.criteria || []).map(c => ({ id: c.id, title: c.title, weight: c.weight })), self: pick.self, supervisor: pick.supervisor, joint: pick.joint, org_average });
            }
            return res.status(200).json({ success: true, ...buildHistory(items), min_group: MIN_GROUP });
        },

        // ---- HR reports (filed appraisals only) ----
        'appr-report': async (req, res) => {
            const sb = getSupabase(); const user = await authUser(req, res, sb); if (!user) return;
            if (!guardEnc(res)) return;
            const orgId = req.body?.orgId; if (!isId(orgId)) return fail(res, 400, 'Missing organisation.');
            const me = await getMember(sb, user.id, orgId); if (!isHr(me)) return fail(res, 403, 'Only an owner or HR admin can see reports.');
            const org = await getOrg(sb, orgId);
            if (!(await gateOrg(req, res, sb, user, org))) return;
            if (!(await enforceGate(sb, req, res, { service: 'appraisal_analytics', orgId, orgCountry: org.country_code, userId: user.id }))) return;
            const level = reportLevel(await ownerProfile(sb, org));
            const cycleId = isId(req.body?.cycleId) ? req.body.cycleId : null;
            const data = await loadFiledRows(sb, org, cycleId);
            const report = computeReport(data.rows, { level, allowSupervisorView: level === 'full' && !['DE', 'FR'].includes(org.country_code), allowNineBox: level === 'full' && !['DE', 'FR'].includes(org.country_code) });
            const findings = buildFindings(report, data.statusCounts);
            await ev(sb, { id: null, org_id: orgId }, me, user.id, 'report_generated', null, null, { org_id: orgId, n: data.rows.length, cycle: cycleId, level });
            return res.status(200).json({ success: true, level, report, findings, status_counts: data.statusCounts, cycles: data.cycles });
        },

        'appr-business-review-pdf': async (req, res) => {
            const sb = getSupabase(); const user = await authUser(req, res, sb); if (!user) return;
            if (!guardEnc(res)) return;
            const orgId = req.body?.orgId; if (!isId(orgId)) return fail(res, 400, 'Missing organisation.');
            const me = await getMember(sb, user.id, orgId); if (!isHr(me)) return fail(res, 403, 'Only an owner or HR admin can do this.');
            const org = await getOrg(sb, orgId);
            if (!(await gateOrg(req, res, sb, user, org))) return;
            if (!(await enforceGate(sb, req, res, { service: 'appraisal_analytics', orgId, orgCountry: org.country_code, userId: user.id }))) return;
            if (reportLevel(await ownerProfile(sb, org)) !== 'full') return fail(res, 403, 'The business review is included with the Business plan.', { code: 'upgrade_required' });
            const cycleId = isId(req.body?.cycleId) ? req.body.cycleId : null;
            const data = await loadFiledRows(sb, org, cycleId);
            const report = computeReport(data.rows, { level: 'full', allowSupervisorView: false, allowNineBox: !['DE', 'FR'].includes(org.country_code) });
            const findings = buildFindings(report, data.statusCounts);
            const label = cycleId ? (data.cycles.find(c => c.id === cycleId)?.name || 'Selected round') : 'All filed appraisals';
            const bytes = await renderReviewPdf({ report, findings, orgName: org.name, label, generated: today() });
            await ev(sb, { id: null, org_id: orgId }, me, user.id, 'business_review_exported', null, null, { org_id: orgId, n: data.rows.length, cycle: cycleId });
            return res.status(200).json({ success: true, filename: `performance-review-${today()}.pdf`, pdf_base64: Buffer.from(bytes).toString('base64') });
        },

        // ---- Scheduled maintenance (called by Vercel cron with the CRON_SECRET) ----
        'appr-maintenance': async (req, res) => {
            if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'Unauthorized' });
            const sb = getSupabase(); const out = { reminded: 0, escalated: 0, employee_silent: 0, invites_expired: 0, purged: 0 };
            const t = today();
            const { data: open } = await sb.from('appraisals').select('*').not('status', 'in', `(${CLOSED.join(',')})`).limit(2000);
            const orgCache = {};
            const orgName = async (id) => { if (!orgCache[id]) orgCache[id] = (await getOrg(sb, id))?.name || ''; return orgCache[id]; };
            const hrOf = async (orgId) => { const { data } = await sb.from('org_members').select('id').eq('org_id', orgId).in('role', ['owner', 'hr_admin']).eq('status', 'active'); return (data || []).map(x => x.id); };
            for (const a of (open || [])) {
                const sys = { id: null };
                // 1. employee silent past the deadline: carry on with a flag. Never "deemed accepted".
                if (a.status === 'awaiting_employee_response' && a.response_due && a.response_due < t) {
                    try {
                        await transition(sb, a, 'awaiting_final_approval', null, null, 'employee_no_response', { employee_no_response: true, final_due: plusDays(14), last_reminded_at: null }, { note: 'Not treated as acceptance' });
                        out.employee_silent++;
                        await notify(sb, [a.employee_member_id, a.approver_member_id], 'Appraisal moved to final approval', 'The response deadline passed without a reply. The appraisal has moved to final approval and is marked "no response". The employee can still add a written statement.', a.id, await orgName(a.org_id));
                    } catch { /* changed meanwhile */ }
                    continue;
                }
                if (a.status === 'awaiting_self' && a.self_due && plusDaysFrom(a.self_due, 14) < t) {
                    try { await transition(sb, a, 'awaiting_supervisor', null, null, 'employee_no_self_appraisal', { employee_no_response: true, supervisor_due: plusDays(14), last_reminded_at: null }); out.employee_silent++; await notify(sb, [a.supervisor_member_id], 'An appraisal is waiting for you', 'The employee did not complete a self-appraisal in time. You can now complete your assessment.', a.id, await orgName(a.org_id)); } catch { /* skip */ }
                    continue;
                }
                // 2. supervisor silent 7 days past the deadline: escalate to approver and HR. Never auto-complete.
                if (a.status === 'awaiting_supervisor' && a.supervisor_due && plusDaysFrom(a.supervisor_due, 7) < t && !a.escalated_at) {
                    await sb.from('appraisals').update({ escalated_at: new Date().toISOString() }).eq('id', a.id);
                    await ev(sb, a, null, null, 'supervisor_overdue_escalated', a.status, a.status, {});
                    await notify(sb, [a.approver_member_id, ...(await hrOf(a.org_id))], 'An appraisal is overdue', 'A supervisor has not completed an appraisal a week after the deadline. HR can reassign it.', a.id, await orgName(a.org_id));
                    out.escalated++;
                }
                // 3. gentle reminders, at most every 3 days, from 3 days before the deadline
                const dueMap = { awaiting_self: [a.self_due, [a.employee_member_id]], awaiting_supervisor: [a.supervisor_due, [a.supervisor_member_id]], awaiting_employee_response: [a.response_due, [a.employee_member_id]], awaiting_final_approval: [a.final_due, [a.approver_member_id]], escalated_disagreement: [a.final_due, [a.approver_member_id]], meeting_required: [plusDaysFrom(a.updated_at.slice(0, 10), 7), [a.supervisor_member_id, a.employee_member_id]], awaiting_joint_record: [plusDaysFrom(a.updated_at.slice(0, 10), 7), [a.supervisor_member_id]], returned_to_supervisor: [plusDaysFrom(a.updated_at.slice(0, 10), 7), [a.supervisor_member_id]] };
                const d = dueMap[a.status];
                if (d && d[0] && d[0] <= plusDays(3) && (!a.last_reminded_at || new Date(a.last_reminded_at).getTime() < Date.now() - 3 * DAY)) {
                    await notify(sb, d[1], 'Reminder: an appraisal needs your attention', 'An appraisal is waiting for you, and its date is close or has passed.', a.id, await orgName(a.org_id));
                    await sb.from('appraisals').update({ last_reminded_at: new Date().toISOString() }).eq('id', a.id);
                    out.reminded++;
                }
            }
            // 4. old invitations stop working
            const { data: exp } = await sb.from('org_members').update({ invite_token_hash: null }).eq('status', 'invited').not('invite_token_hash', 'is', null).lt('invited_at', new Date(Date.now() - 14 * DAY).toISOString()).select('id');
            out.invites_expired = (exp || []).length;
            // 5. retention: delete the text of expired records (not on legal hold)
            const { data: n, error } = await sb.rpc('purge_expired_appraisals');
            if (error) console.error('purge', error.message); else out.purged = n || 0;
            return res.status(200).json({ success: true, ...out });
        }
    };
}

function plusDaysFrom(dateStr, n) { return new Date(new Date(dateStr + 'T00:00:00Z').getTime() + n * DAY).toISOString().slice(0, 10); }

// ---------------------------------------------------------------------------------------------
// PDF (includes the audit trail so the record can be shown to a tribunal or auditor)
// ---------------------------------------------------------------------------------------------
async function renderPdf(view, org) {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const W = 595, H = 842, M = 48; let page = pdf.addPage([W, H]); let y = H - M;
    const clean = (s) => String(s ?? '').replace(/[^\x20-\x7E -ÿ\n]/g, '?');
    const need = (h) => { if (y - h < M) { page = pdf.addPage([W, H]); y = H - M; } };
    const line = (txt, { f = font, size = 10, color = rgb(0.1, 0.1, 0.15), indent = 0 } = {}) => {
        const maxW = W - 2 * M - indent;
        for (const para of clean(txt).split('\n')) {
            let cur = '';
            for (const word of para.split(/\s+/)) {
                const test = cur ? cur + ' ' + word : word;
                if (f.widthOfTextAtSize(test, size) > maxW && cur) { need(size + 4); page.drawText(cur, { x: M + indent, y: y - size, size, font: f, color }); y -= size + 4; cur = word; } else cur = test;
            }
            need(size + 4); page.drawText(cur, { x: M + indent, y: y - size, size, font: f, color }); y -= size + 4;
        }
    };
    const who = (id) => view.people[id]?.name || 'Unknown';
    const ap = view.appraisal;
    line('Appraisal record', { f: bold, size: 18 }); y -= 4;
    line(`${org?.name || ''}  |  Status: ${String(ap.status).replace(/_/g, ' ')}  |  Generated ${new Date().toISOString().slice(0, 10)}`, { size: 9, color: rgb(0.4, 0.4, 0.5) });
    if (ap.employee_member_id) line(`Employee: ${who(ap.employee_member_id)}   Supervisor: ${who(ap.supervisor_member_id)}   Approver: ${who(ap.approver_member_id)}`, { size: 10 });
    if (ap.disagreement) line('Note: the employee and supervisor did not reach agreement; both views are recorded below.', { f: bold, size: 10, color: rgb(0.7, 0.2, 0.1) });
    if (ap.employee_no_response) line('Note: the employee did not respond within the deadline. This is not treated as acceptance.', { f: bold, size: 10, color: rgb(0.7, 0.2, 0.1) });
    y -= 6;
    const titles = { self: 'Self-appraisal', supervisor: "Supervisor's appraisal", contributor: 'Contributor input', employee_response: "Employee's response", joint: 'Joint record after discussion', employee_statement: "Employee's statement", approver_note: "Approver's note" };
    const crit = view.template?.criteria || [];
    for (const v of view.versions) {
        need(60); y -= 6;
        line(`${titles[v.stage] || v.stage}  (${who(v.author_member_id)}, ${String(v.created_at).slice(0, 10)}${v.round ? ', round ' + v.round : ''})`, { f: bold, size: 12, color: rgb(0.04, 0.24, 0.36) });
        const c = v.content; if (!c) { line('[could not be read]'); continue; }
        if (c.ratings) for (const k of crit) { if (c.ratings[k.id] !== undefined) { line(`${k.title}: ${c.ratings[k.id]} / ${view.template?.scale?.max ?? 5}`, { f: bold }); if (c.comments?.[k.id]) line(c.comments[k.id], { indent: 12 }); } }
        if (c.summary) { line('Summary', { f: bold }); line(c.summary, { indent: 12 }); }
        if (c.goals) { line('Goals', { f: bold }); line(c.goals, { indent: 12 }); }
        if (c.potential) { line('Potential', { f: bold }); line(['', 'Limited for now', 'Some room for a bigger role', 'Could take a significantly bigger role'][c.potential] || '', { indent: 12 }); }
        if (c.decision) line(`Decision: ${c.decision}${c.comment ? '. ' + c.comment : ''}`);
        if (c.text) line(c.text);
        line(`Integrity hash: ${v.hash.slice(0, 32)}...`, { size: 7, color: rgb(0.5, 0.5, 0.55) });
    }
    if (view.events.length) {
        need(40); y -= 8; line('Audit trail', { f: bold, size: 12, color: rgb(0.04, 0.24, 0.36) });
        for (const e of view.events) line(`${String(e.created_at).slice(0, 16).replace('T', ' ')}  ${e.action.replace(/_/g, ' ')}${e.actor_member_id ? '  by ' + who(e.actor_member_id) : '  (system)'}${e.to_status && e.to_status !== e.from_status ? '  -> ' + e.to_status.replace(/_/g, ' ') : ''}`, { size: 8 });
    }
    return pdf.save();
}

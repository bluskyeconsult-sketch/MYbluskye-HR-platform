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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isId = (v) => typeof v === 'string' && UUID.test(v);
const clip = (v, n) => String(v ?? '').slice(0, n);
const DAY = 86400000;
const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n) => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);
const FINALISH = ['awaiting_final_approval', 'escalated_disagreement', 'filed'];
const CLOSED = ['filed', 'closed_employee_left', 'withdrawn', 'purged'];

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
    return { value: { ratings, comments, summary, goals } };
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
    const { getSupabase, sendMail } = deps;
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

    function tierLimit(profile) {
        const t = String(profile?.tier || '').toLowerCase();
        if (['admin', 'super_admin'].includes(profile?.user_type)) return 200;
        if (t === 'business') return 100;
        if (t === 'employer') return 15;
        return 10;
    }
    const tierAllows = (profile) => ['admin', 'super_admin'].includes(profile?.user_type) || ['employer', 'business'].includes(String(profile?.tier || '').toLowerCase()) || profile?.is_tester === true || process.env.APPRAISAL_OPEN_CREATION === 'true';

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
            if (!tierAllows(profile)) return fail(res, 403, 'Appraisals are included with the Employer and Business plans.', { code: 'upgrade_required' });
            const { count } = await sb.from('organisations').select('id', { count: 'exact', head: true }).eq('created_by', user.id);
            if ((count || 0) >= 3) return fail(res, 400, 'You can create up to three organisations.');
            const gate = await evaluateGate(sb, req, { service: 'appraisal', orgCountry: country, userId: user.id });
            if (gate.decision === 'blocked') return res.status(403).json({ success: false, code: 'blocked', error: 'This service is not available for that location.' });
            const rule = await loadRule(sb, country, 'appraisal');
            const { data: org, error } = await sb.from('organisations').insert({ name, country_code: country, created_by: user.id, retention_years: rule?.retention_years_default || 6 }).select('*').single();
            if (error) { console.error('org create', error.message); return fail(res, 500, 'Could not create the organisation.'); }
            const { data: m } = await sb.from('org_members').insert({ org_id: org.id, user_id: user.id, email: user.email, full_name: clip(req.body?.your_name, 120) || null, job_title: clip(req.body?.your_title, 120) || null, role: 'owner', status: 'active', joined_at: new Date().toISOString() }).select('id').single();
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
            if (hr) { ({ data: members } = await sb.from('org_members').select('id, email, full_name, job_title, role, supervisor_member_id, status, joined_at, left_at, invited_at').eq('org_id', orgId).order('created_at', { ascending: true })); }
            else { const ids = [me.id, me.supervisor_member_id].filter(Boolean); ({ data: members } = await sb.from('org_members').select('id, full_name, job_title, role, status').in('id', ids)); }
            let cycles = [], metaAppraisals = [];
            if (hr) {
                ({ data: cycles } = await sb.from('appraisal_cycles').select('*').eq('org_id', orgId).order('created_at', { ascending: false }).limit(50));
                ({ data: metaAppraisals } = await sb.from('appraisals').select('id, cycle_id, employee_member_id, supervisor_member_id, approver_member_id, status, round, disagreement, employee_no_response, needs_reassignment, legal_hold, self_due, supervisor_due, response_due, final_due, filed_at, retention_until').eq('org_id', orgId).neq('status', 'purged').order('updated_at', { ascending: false }).limit(500));
            }
            const { data: templates } = await sb.from('appraisal_templates').select('id, name, criteria, scale, is_default, org_id').or(`org_id.is.null,org_id.eq.${orgId}`);
            return res.status(200).json({ success: true, org, me: { member_id: me.id, role: me.role }, members: members || [], cycles, appraisals: metaAppraisals, templates: templates || [], gate: { decision: gate.decision, rule: gate.rule ? { title: gate.rule.title, requirement_text: gate.rule.requirement_text, checklist: gate.rule.checklist, reference_links: gate.rule.reference_links, rule_version: gate.rule.rule_version } : null, missing: gate.missing || null } });
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
            const { data: ownerProfile } = await sb.from('profiles').select('tier, user_type').eq('id', org.created_by).maybeSingle();
            const limit = tierLimit(ownerProfile);
            const { count } = await sb.from('org_members').select('id', { count: 'exact', head: true }).eq('org_id', b.orgId).neq('status', 'left');
            const { data: existing } = await sb.from('org_members').select('*').eq('org_id', b.orgId).eq('email', email).maybeSingle();
            if (existing && existing.status === 'active') return fail(res, 409, 'That person is already a member.');
            if (!existing && (count || 0) >= limit) return fail(res, 400, `Your plan allows up to ${limit} people. Upgrade to add more.`, { code: 'limit_reached' });
            const token = crypto.randomBytes(32).toString('base64url');
            const row = { org_id: b.orgId, email, full_name: clip(b.full_name, 120) || null, job_title: clip(b.job_title, 120) || null, role, supervisor_member_id: b.supervisor_member_id || null, status: 'invited', invite_token_hash: sha(token), invited_at: new Date().toISOString(), left_at: null };
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
            const criteria = (Array.isArray(b.criteria) ? b.criteria : []).slice(0, 12).map((c, i) => ({ id: clip(c.id || `c${i + 1}`, 30).replace(/[^a-z0-9_]/gi, '_'), title: clip(c.title, 120).trim(), description: clip(c.description, 400).trim(), weight: Math.max(0, Math.min(100, Math.round(Number(c.weight) || 0))) })).filter(c => c.title);
            if (criteria.length < 1) return fail(res, 400, 'Add at least one criterion.');
            if (new Set(criteria.map(c => c.id)).size !== criteria.length) return fail(res, 400, 'Each criterion needs its own id.');
            const { data, error } = await sb.from('appraisal_templates').insert({ org_id: b.orgId, name: clip(b.name, 120) || 'Custom appraisal', criteria }).select('id').single();
            if (error) return fail(res, 500, 'Could not save the template.');
            return res.status(200).json({ success: true, id: data.id });
        },

        // ---- Cycles and appraisals ----
        'appr-cycle-create': async (req, res) => {
            const sb = getSupabase(); const user = await authUser(req, res, sb); if (!user) return;
            if (!guardEnc(res)) return;
            const b = req.body || {}; if (!isId(b.orgId)) return fail(res, 400, 'Missing organisation.');
            const me = await getMember(sb, user.id, b.orgId); if (!isHr(me)) return fail(res, 403, 'Only an owner or HR admin can start an appraisal round.');
            const org = await getOrg(sb, b.orgId); if (org.status !== 'active') return fail(res, 403, 'This organisation is not active.');
            const gate = await gateOrg(req, res, sb, user, org); if (!gate) return;
            const { data: tpl } = isId(b.template_id) ? await sb.from('appraisal_templates').select('*').eq('id', b.template_id).or(`org_id.is.null,org_id.eq.${b.orgId}`).maybeSingle() : await sb.from('appraisal_templates').select('*').is('org_id', null).eq('is_default', true).limit(1).maybeSingle();
            if (!tpl) return fail(res, 400, 'Template not found.');
            const snapshot = { name: tpl.name, criteria: tpl.criteria, scale: tpl.scale };
            const { data: members } = await sb.from('org_members').select('*').eq('org_id', b.orgId).eq('status', 'active');
            const byId = Object.fromEntries((members || []).map(m => [m.id, m]));
            let employees = (members || []).filter(m => m.supervisor_member_id && byId[m.supervisor_member_id]);
            if (Array.isArray(b.memberIds) && b.memberIds.length) employees = employees.filter(m => b.memberIds.includes(m.id));
            employees = employees.slice(0, 200);
            if (!employees.length) return fail(res, 400, 'No one is ready to be appraised. Give each person a supervisor first.');
            const dueOrNull = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(String(d || '')) ? d : null);
            const { data: cycle, error: ce } = await sb.from('appraisal_cycles').insert({ org_id: b.orgId, name: clip(b.name, 120) || 'Appraisal round', period_start: dueOrNull(b.period_start), period_end: dueOrNull(b.period_end), template_id: tpl.id, self_due: dueOrNull(b.self_due) || plusDays(14), supervisor_due: dueOrNull(b.supervisor_due) || plusDays(28), response_due: dueOrNull(b.response_due) || plusDays(42), final_due: dueOrNull(b.final_due) || plusDays(56), created_by: user.id }).select('*').single();
            if (ce) { console.error('cycle', ce.message); return fail(res, 500, 'Could not start the round.'); }
            const created = [], skipped = [];
            for (const emp of employees) {
                const sup = byId[emp.supervisor_member_id];
                let approver = sup?.supervisor_member_id && byId[sup.supervisor_member_id] && sup.supervisor_member_id !== emp.id ? byId[sup.supervisor_member_id] : null;
                if (!approver) approver = (members || []).find(m => m.role === 'approver' && m.id !== emp.id && m.id !== sup.id) || (members || []).find(m => ['owner', 'hr_admin'].includes(m.role) && m.id !== emp.id && m.id !== sup.id) || null;
                if (!approver) { skipped.push({ member_id: emp.id, reason: 'No separate approver available. Add an approver or HR admin.' }); continue; }
                const { data: ap, error } = await sb.from('appraisals').insert({ org_id: b.orgId, cycle_id: cycle.id, employee_member_id: emp.id, supervisor_member_id: sup.id, approver_member_id: approver.id, template_snapshot: snapshot, country_code: org.country_code, self_due: cycle.self_due, supervisor_due: cycle.supervisor_due, response_due: cycle.response_due, final_due: cycle.final_due }).select('id').single();
                if (error) { skipped.push({ member_id: emp.id, reason: 'Could not create.' }); continue; }
                created.push(ap.id);
                await ev(sb, { id: ap.id, org_id: b.orgId }, me, user.id, 'appraisal_created', null, 'awaiting_self', { cycle: cycle.id });
                await notify(sb, [emp.id], 'Your appraisal is ready', `Your ${cycle.name.replace(/[<>&]/g, '')} appraisal is ready. Please complete your self-appraisal by ${cycle.self_due}.`, ap.id, org.name);
            }
            return res.status(200).json({ success: true, cycle_id: cycle.id, created: created.length, skipped });
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
            const safe = { ratings: raw?.ratings || {}, comments: raw?.comments || {}, summary: clip(raw?.summary, 8000), goals: clip(raw?.goals, 4000) };
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
                    if (note) await lockVersion(sb, ap, 'approver_note', ctx.member, { text: note });
                    const years = await retentionFor(sb, org);
                    await transition(sb, ap, 'filed', ctx.member, user.id, 'filed', { filed_at: new Date().toISOString(), retention_until: retentionDate(years) }, { with_disagreement: !!ap.disagreement, employee_no_response: !!ap.employee_no_response });
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
            try { await transition(sb, ctx.appraisal, 'withdrawn', ctx.member, user.id, 'withdrawn', { retention_until: retentionDate(await retentionFor(sb, org)) }, { reason: clip(req.body?.reason, 300) }); } catch { return fail(res, 409, 'Please reload.'); }
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

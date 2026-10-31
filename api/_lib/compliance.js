// api/_lib/compliance.js
//
// NEW (2026-10-23): the country compliance engine. One place decides, for any service and any
// country, whether the service is open, open after the organisation ticks a checklist, open only
// after an administrator approves evidence, or blocked.
//
// HOW THE COUNTRY IS CHOSEN (in this order)
//   1. The country of the ORGANISATION's workplace (for appraisals the law that matters is where the staff work).
//   2. The signed-in member's saved country (profiles.country_code).
//   3. The country the network reports (Vercel edge header x-vercel-ip-country).
// The network country is a SIGNAL, never the only test: people travel and use VPNs. It is used to
//   (a) pre-select the country for visitors who have not told us, and
//   (b) block sanctioned places whatever anyone declares (country list + Crimea/Donetsk/Luhansk regions).
// A mismatch between declared and network country is logged (country codes only) but never blocks.
// No IP address is stored by this module.

export const SERVICE_KEYS = ['appraisal', 'appraisal_ai', 'paid_services', 'ai_services', 'workforce'];

// Regions that are blocked even though the country (Ukraine) is not: ISO 3166-2 subdivision codes
// (UA-43 Crimea, UA-14 Donetsk, UA-09 Luhansk). Vercel sends the part after the dash in x-vercel-ip-country-region.
const BLOCKED_REGIONS = { UA: ['43', '14', '09'] };
// Syria was removed after the US ended its comprehensive Syria sanctions in 2025; it now goes through clearance (see the SQL seed).
const SANCTIONED_COUNTRIES = ['CU', 'IR', 'KP'];
const SANCTION_BLOCKED_SERVICES = ['appraisal', 'appraisal_ai', 'paid_services', 'ai_services', 'workforce'];

const cc = (v) => {
    const s = String(v || '').trim().toUpperCase();
    return /^[A-Z]{2}$/.test(s) ? s : null;
};

export function readNetworkLocation(req) {
    const h = req?.headers || {};
    return {
        country: cc(h['x-vercel-ip-country']),
        region: String(h['x-vercel-ip-country-region'] || '').trim().toUpperCase() || null
    };
}

function sanctionBlock(service, net) {
    if (!SANCTION_BLOCKED_SERVICES.includes(service)) return null;
    if (net.country && SANCTIONED_COUNTRIES.includes(net.country)) return `network country ${net.country}`;
    if (net.country && BLOCKED_REGIONS[net.country] && BLOCKED_REGIONS[net.country].includes(net.region)) return `network region ${net.country}-${net.region}`;
    return null;
}

// Finds the rule: exact country first, then the '*' default, else null (= open).
export async function loadRule(sb, country, service) {
    const { data } = await sb.from('country_service_rules')
        .select('*').eq('service_key', service).eq('is_active', true).in('country_code', [country || '*', '*']);
    const rows = data || [];
    return rows.find(r => r.country_code === country) || rows.find(r => r.country_code === '*') || null;
}

async function latestAck(sb, orgId, ackKey) {
    if (!orgId) return null;
    const { data } = await sb.from('org_acknowledgements').select('*').eq('org_id', orgId).eq('ack_key', ackKey).order('accepted_at', { ascending: false }).limit(1).maybeSingle();
    return data || null;
}

async function latestClearance(sb, { orgId, userId, country, service }) {
    if (!orgId && !userId) return null;
    let q = sb.from('compliance_clearances').select('*').eq('country_code', country).eq('service_key', service).in('status', ['pending', 'approved', 'rejected']).order('created_at', { ascending: false }).limit(1);
    q = orgId ? q.eq('org_id', orgId) : q.is('org_id', null).eq('user_id', userId);
    const { data } = await q.maybeSingle();
    return data || null;
}

export const ackKeyFor = (country, service, version) => `${country}:${service}:v${version}`;

// The single decision function.
// returns { decision, service, country, ip_country, mismatch, rule?, missing?, clearance? }
//   decision: allowed | conditions_needed | clearance_needed | pending_review | blocked
export async function evaluateGate(sb, req, { service, orgId = null, orgCountry = null, userId = null, profileCountry = null }) {
    const net = readNetworkLocation(req);
    const declared = cc(orgCountry) || cc(profileCountry);
    const country = declared || net.country || null;
    const out = { service, country, ip_country: net.country, mismatch: !!(declared && net.country && declared !== net.country) };

    const sanction = sanctionBlock(service, net);
    if (sanction) return { ...out, decision: 'blocked', reason: sanction, rule: { title: 'Not available in your location', requirement_text: 'This service is not available in your location because of international sanctions laws. If you believe this is a mistake, or you hold a licence that allows you to use it, email privacy@bluskyeconsult.com.', checklist: [], reference_links: [] } };

    if (!country) return { ...out, decision: 'conditions_needed', reason: 'country_unknown', needs_country: true, rule: null };

    const rule = await loadRule(sb, country, service);
    if (!rule || rule.status === 'open') return { ...out, decision: 'allowed', rule: rule || null };
    out.rule = rule;

    if (rule.status === 'blocked') return { ...out, decision: 'blocked', reason: 'rule_blocked' };

    const checklist = Array.isArray(rule.checklist) ? rule.checklist : [];
    const wanted = checklist.map(i => i.key);

    // Conditions already confirmed by this organisation at the current wording version?
    if (rule.status === 'conditional') {
        const ack = await latestAck(sb, orgId, ackKeyFor(rule.country_code === '*' ? country : rule.country_code, service, rule.rule_version));
        const ticked = Array.isArray(ack?.items) ? ack.items : [];
        const missing = wanted.filter(k => !ticked.includes(k));
        if (ack && missing.length === 0) return { ...out, decision: 'allowed', acknowledged_at: ack.accepted_at };
        return { ...out, decision: 'conditions_needed', missing, ack_key: ackKeyFor(rule.country_code === '*' ? country : rule.country_code, service, rule.rule_version) };
    }

    // clearance_required: needs an approved, unexpired clearance at the current wording version
    const cl = await latestClearance(sb, { orgId, userId, country, service });
    if (cl) {
        const live = cl.status === 'approved' && (!cl.expires_at || new Date(cl.expires_at) > new Date()) && cl.rule_version >= rule.rule_version;
        if (live) return { ...out, decision: 'allowed', clearance: { id: cl.id, approved_at: cl.reviewed_at } };
        if (cl.status === 'pending') return { ...out, decision: 'pending_review', clearance: { id: cl.id, requested_at: cl.created_at } };
        if (cl.status === 'rejected') return { ...out, decision: 'clearance_needed', clearance: { id: cl.id, rejected: true, decision_note: cl.decision_note } };
    }
    return { ...out, decision: 'clearance_needed' };
}

// Records refusals and approvals only (never a plain "allowed"), so the log stays useful and small.
export async function logDecision(sb, { userId, orgId, gate, extra }) {
    try {
        if (!gate || gate.decision === 'allowed') return;
        await sb.from('compliance_log').insert({
            user_id: userId || null, org_id: orgId || null, service_key: gate.service,
            country_code: gate.country || null, ip_country: gate.ip_country || null,
            decision: gate.decision, reason: [gate.reason, gate.mismatch ? 'country_mismatch' : null, extra].filter(Boolean).join(' | ') || null
        });
    } catch { /* logging must never break a request */ }
}

// Public wording for a refusal, safe to show to the visitor.
export function refusalBody(gate) {
    const r = gate.rule || {};
    const map = {
        blocked: 'This service is not available for your location.',
        clearance_needed: 'Before you can use this in your country, you need to supply some evidence for review.',
        pending_review: 'Your request is with an administrator for review. We will email you when it is decided.',
        conditions_needed: 'Please confirm a few things before you continue.'
    };
    return {
        success: false, code: gate.decision, error: map[gate.decision] || 'Not available.',
        gate: { decision: gate.decision, service: gate.service, country: gate.country, ip_country: gate.ip_country, mismatch: gate.mismatch, needs_country: !!gate.needs_country,
            title: r.title || null, requirement_text: r.requirement_text || null, checklist: r.checklist || [], reference_links: r.reference_links || [],
            missing: gate.missing || null, ack_key: gate.ack_key || null, clearance: gate.clearance || null, rule_version: r.rule_version || null }
    };
}

// Use in any handler:  const g = await enforceGate(sb, req, res, {...}); if (!g) return;
export async function enforceGate(sb, req, res, args) {
    const gate = await evaluateGate(sb, req, args);
    if (gate.decision === 'allowed') return gate;
    await logDecision(sb, { userId: args.userId, orgId: args.orgId, gate });
    res.status(gate.decision === 'blocked' ? 403 : 409).json(refusalBody(gate));
    return null;
}

// ----------------------------------------------------------------------------------------------
// HANDLERS
// deps: { getSupabase, getUserId(req, sb) -> userId|null, isAdmin(sb, userId) -> bool, sendMail({to,subject,html}) }
// ----------------------------------------------------------------------------------------------
const clip = (v, n) => String(v ?? '').slice(0, n);
const safeUrl = (u) => { try { const x = new URL(String(u)); return /^https?:$/.test(x.protocol) ? x.toString().slice(0, 500) : null; } catch { return null; } };

export function buildComplianceHandlers(deps) {
    const { getSupabase, getUserId, isAdmin, sendMail } = deps;

    return {
        // Public. Tells the page where the visitor appears to be and what each service needs there.
        // Body (optional): { services:[...], orgId?, country? }  -  country lets a visitor correct the guess.
        'compliance-check': async (req, res) => {
            const sb = getSupabase();
            const body = req.body || {};
            const services = (Array.isArray(body.services) && body.services.length ? body.services : SERVICE_KEYS).filter(s => SERVICE_KEYS.includes(s)).slice(0, 8);
            const userId = await getUserId(req, sb);
            let profileCountry = null; let orgCountry = null; const orgId = body.orgId || null;
            if (userId) {
                const { data: p } = await sb.from('profiles').select('country_code').eq('id', userId).maybeSingle();
                profileCountry = p?.country_code || null;
                if (orgId) {
                    const { data: m } = await sb.from('org_members').select('org_id, organisations(country_code)').eq('org_id', orgId).eq('user_id', userId).eq('status', 'active').maybeSingle();
                    orgCountry = m?.organisations?.country_code || null;
                }
            }
            const chosen = cc(body.country); // a visitor's own correction, used only when we have nothing declared
            const results = [];
            for (const service of services) {
                const gate = await evaluateGate(sb, req, { service, orgId: orgCountry ? orgId : null, orgCountry, userId, profileCountry: profileCountry || chosen });
                results.push(refusalBody(gate).gate ? { ...refusalBody(gate).gate, decision: gate.decision, reason: gate.reason || null } : gate);
            }
            const net = readNetworkLocation(req);
            return res.status(200).json({ success: true, ip_country: net.country, declared_country: cc(orgCountry) || cc(profileCountry) || chosen || null, results });
        },

        // Signed-in. The organisation (or member) ticks the checklist for a 'conditional' rule.
        // Body: { service, country, orgId, items:[keys], note }
        'compliance-acknowledge': async (req, res) => {
            const sb = getSupabase();
            const userId = await getUserId(req, sb);
            if (!userId) return res.status(401).json({ success: false, error: 'Please sign in.' });
            const { service, orgId } = req.body || {};
            const items = Array.isArray(req.body?.items) ? req.body.items.map(i => clip(i, 40)).slice(0, 40) : [];
            if (!SERVICE_KEYS.includes(service) || !orgId) return res.status(400).json({ success: false, error: 'Missing details.' });
            const { data: m } = await sb.from('org_members').select('role, organisations(country_code)').eq('org_id', orgId).eq('user_id', userId).eq('status', 'active').maybeSingle();
            if (!m || !['owner', 'hr_admin'].includes(m.role)) return res.status(403).json({ success: false, error: 'Only an organisation owner or HR admin can confirm this.' });
            const country = cc(m.organisations?.country_code);
            const rule = await loadRule(sb, country, service);
            if (!rule || rule.status !== 'conditional') return res.status(400).json({ success: false, error: 'No confirmation is needed for this service.' });
            const wanted = (rule.checklist || []).map(i => i.key);
            const missing = wanted.filter(k => !items.includes(k));
            if (missing.length) return res.status(400).json({ success: false, error: 'Please tick every confirmation to continue.', missing });
            const { error } = await sb.from('org_acknowledgements').insert({
                org_id: orgId, ack_key: ackKeyFor(rule.country_code === '*' ? country : rule.country_code, service, rule.rule_version),
                items, note: clip(req.body?.note, 1000) || null, accepted_by: userId,
                text_hash: null
            });
            if (error) { console.error('compliance-acknowledge', error.message); return res.status(500).json({ success: false, error: 'Could not save. Please try again.' }); }
            await logDecision(sb, { userId, orgId, gate: { service, country, decision: 'acknowledged' } });
            return res.status(200).json({ success: true });
        },

        // Signed-in. Request clearance for a 'clearance_required' rule. Body: { service, orgId?, items:[keys], note, url }
        'compliance-request-clearance': async (req, res) => {
            const sb = getSupabase();
            const userId = await getUserId(req, sb);
            if (!userId) return res.status(401).json({ success: false, error: 'Please sign in.' });
            const { service, orgId } = req.body || {};
            if (!SERVICE_KEYS.includes(service)) return res.status(400).json({ success: false, error: 'Missing details.' });
            let country = null;
            if (orgId) {
                const { data: m } = await sb.from('org_members').select('role, organisations(country_code)').eq('org_id', orgId).eq('user_id', userId).eq('status', 'active').maybeSingle();
                if (!m || !['owner', 'hr_admin'].includes(m.role)) return res.status(403).json({ success: false, error: 'Only an organisation owner or HR admin can request this.' });
                country = cc(m.organisations?.country_code);
            } else {
                const { data: p } = await sb.from('profiles').select('country_code').eq('id', userId).maybeSingle();
                country = cc(p?.country_code) || cc(req.body?.country);
            }
            if (!country) return res.status(400).json({ success: false, error: 'Please choose your country first.' });
            const rule = await loadRule(sb, country, service);
            if (!rule || rule.status !== 'clearance_required') return res.status(400).json({ success: false, error: 'No clearance is needed for this service.' });
            const items = Array.isArray(req.body?.items) ? req.body.items.map(i => clip(i, 40)).slice(0, 40) : [];
            const checklist = rule.checklist || [];
            const missing = checklist.map(i => i.key).filter(k => !items.includes(k));
            if (missing.length) return res.status(400).json({ success: false, error: 'Please tick every confirmation.', missing });
            const note = clip(req.body?.note, 4000).trim();
            const url = safeUrl(req.body?.url);
            if (checklist.some(i => i.evidence_required) && note.length < 20) return res.status(400).json({ success: false, error: 'Please describe your evidence in the note (at least a sentence), for example the agreement reference and date.' });
            const existing = await latestClearance(sb, { orgId: orgId || null, userId, country, service });
            if (existing && existing.status === 'pending') return res.status(409).json({ success: false, error: 'You already have a request waiting for review.' });
            const { data: row, error } = await sb.from('compliance_clearances').insert({
                org_id: orgId || null, user_id: userId, country_code: country, service_key: service, rule_version: rule.rule_version,
                checklist_ticked: items, evidence_note: note || null, evidence_url: url
            }).select('id').single();
            if (error) { console.error('clearance insert', error.message); return res.status(500).json({ success: false, error: 'Could not save. Please try again.' }); }
            await logDecision(sb, { userId, orgId, gate: { service, country, decision: 'pending_review' }, extra: 'clearance_requested' });
            try { await sendMail?.({ to: process.env.COMPLIANCE_ALERT_EMAIL || 'privacy@bluskyeconsult.com', subject: `Compliance clearance request: ${service} in ${country}`, html: `<p>A clearance request is waiting in Admin &gt; Compliance Rules.</p><p>Service: ${service}<br>Country: ${country}</p>` }); } catch { /* the request is saved either way */ }
            return res.status(200).json({ success: true, id: row.id });
        },

        // ---- Admin only ----
        'admin-compliance-overview': async (req, res) => {
            const sb = getSupabase();
            const userId = await getUserId(req, sb);
            if (!userId || !(await isAdmin(sb, userId))) return res.status(403).json({ success: false, error: 'Admin access required.' });
            const [rules, pending, log] = await Promise.all([
                sb.from('country_service_rules').select('*').order('service_key').order('country_code'),
                sb.from('compliance_clearances').select('*').order('created_at', { ascending: false }).limit(100),
                sb.from('compliance_log').select('*').order('created_at', { ascending: false }).limit(100)
            ]);
            return res.status(200).json({ success: true, rules: rules.data || [], clearances: pending.data || [], log: log.data || [] });
        },

        'admin-compliance-save-rule': async (req, res) => {
            const sb = getSupabase();
            const userId = await getUserId(req, sb);
            if (!userId || !(await isAdmin(sb, userId))) return res.status(403).json({ success: false, error: 'Admin access required.' });
            const b = req.body || {};
            const country = b.country_code === '*' ? '*' : cc(b.country_code);
            if (!country || !SERVICE_KEYS.includes(b.service_key) || !['open', 'conditional', 'clearance_required', 'blocked'].includes(b.status)) return res.status(400).json({ success: false, error: 'Check the country, service and status.' });
            const checklist = (Array.isArray(b.checklist) ? b.checklist : []).slice(0, 20).map(i => ({ key: clip(i.key, 40).replace(/[^a-z0-9_]/gi, '_'), text: clip(i.text, 500), ...(i.evidence_required ? { evidence_required: true } : {}) })).filter(i => i.key && i.text);
            const links = (Array.isArray(b.reference_links) ? b.reference_links : []).slice(0, 10).map(l => ({ label: clip(l.label, 120), url: safeUrl(l.url) })).filter(l => l.url);
            const { data: existing } = await sb.from('country_service_rules').select('id, rule_version, requirement_text, checklist').eq('country_code', country).eq('service_key', b.service_key).maybeSingle();
            const wordingChanged = !existing || existing.requirement_text !== b.requirement_text || JSON.stringify(existing.checklist) !== JSON.stringify(checklist);
            const row = {
                country_code: country, service_key: b.service_key, status: b.status, title: clip(b.title, 200) || 'Rule',
                requirement_text: clip(b.requirement_text, 4000), checklist, reference_links: links,
                retention_years_default: Number.isFinite(+b.retention_years_default) ? Math.max(1, Math.min(30, +b.retention_years_default)) : null,
                last_reviewed: b.last_reviewed || new Date().toISOString().slice(0, 10), verify_note: clip(b.verify_note, 1000) || null,
                is_active: b.is_active !== false, updated_by: userId, updated_at: new Date().toISOString(),
                rule_version: existing ? existing.rule_version + (wordingChanged ? 1 : 0) : 1   // a wording change asks everyone to confirm again
            };
            const { error } = await sb.from('country_service_rules').upsert(row, { onConflict: 'country_code,service_key' });
            if (error) { console.error('save-rule', error.message); return res.status(500).json({ success: false, error: 'Could not save the rule.' }); }
            return res.status(200).json({ success: true, rule_version: row.rule_version });
        },

        // Decide a clearance request. Body: { id, decision:'approve'|'reject'|'revoke', note, expires_in_days }
        'admin-compliance-decide': async (req, res) => {
            const sb = getSupabase();
            const userId = await getUserId(req, sb);
            if (!userId || !(await isAdmin(sb, userId))) return res.status(403).json({ success: false, error: 'Admin access required.' });
            const { id, decision } = req.body || {};
            const map = { approve: 'approved', reject: 'rejected', revoke: 'revoked' };
            if (!id || !map[decision]) return res.status(400).json({ success: false, error: 'Missing details.' });
            const { data: cl } = await sb.from('compliance_clearances').select('*').eq('id', id).maybeSingle();
            if (!cl) return res.status(404).json({ success: false, error: 'Request not found.' });
            const days = Number.isFinite(+req.body.expires_in_days) ? Math.max(30, Math.min(1095, +req.body.expires_in_days)) : 365;
            const patch = { status: map[decision], reviewed_by: userId, reviewed_at: new Date().toISOString(), decision_note: clip(req.body.note, 1000) || null,
                expires_at: decision === 'approve' ? new Date(Date.now() + days * 86400000).toISOString() : cl.expires_at };
            const { error } = await sb.from('compliance_clearances').update(patch).eq('id', id);
            if (error) return res.status(500).json({ success: false, error: 'Could not save.' });
            await logDecision(sb, { userId: cl.user_id, orgId: cl.org_id, gate: { service: cl.service_key, country: cl.country_code, decision: decision === 'approve' ? 'cleared' : 'clearance_needed' }, extra: `admin_${decision}` });
            try {
                const { data: u } = await sb.auth.admin.getUserById(cl.user_id);
                const to = u?.user?.email;
                if (to) await sendMail?.({ to, subject: `Your ODUSBABA clearance request was ${map[decision]}`, html: `<p>Your request to use ${cl.service_key} in ${cl.country_code} was <b>${map[decision]}</b>.</p>${patch.decision_note ? `<p>Note from the reviewer: ${patch.decision_note.replace(/[<>&]/g, '')}</p>` : ''}<p>You can sign in to continue.</p>` });
            } catch { /* decision is saved either way */ }
            return res.status(200).json({ success: true });
        }
    };
}

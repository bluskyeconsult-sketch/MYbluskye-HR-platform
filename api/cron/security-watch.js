// api/cron/security-watch.js   (upload to the api/cron/ folder)
//
// NEW (2026-11-10): the missing alarm. On 8 November an unknown account made itself a super admin, opened the
// support inbox and looked at the owner's account. Nobody knew for two days because nothing was watching.
//
// Every 10 minutes this job:
//   1. Finds any admin or super_admin account that is NOT on the owner's approved list
//      (system_config key "known_admin_ids"). If found it demotes the account to a normal member, bans the sign-in,
//      locks the IP addresses linked to it for 30 days, and writes a critical security event.
//      Turn the automatic demotion off by setting system_config "security_auto_contain" to "off" (it still emails).
//   2. Collects new critical events written by the database guards (privilege attempts, blocked admin sign-ups,
//      sign-up floods, lockouts) since the last run.
//   3. Emails the owner ONE summary if anything was found. Sends nothing when all is quiet.
//
// Approving a new staff member: create them in Admin > Staff (that adds them to the list automatically).
// If you ever create an admin directly in the database, add their id to "known_admin_ids" first.

import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const ALERT_EVENTS = ['privilege_escalation_attempt', 'privileged_signup_blocked', 'signup_flood_blocked',
    'unknown_admin_contained', 'admin_login_lockout_triggered', 'incident_ip_flagged'];

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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

// system_config.config_value may be text or jsonb; accept an array, a JSON string, or a plain string.
function readConfig(raw) {
    if (raw === null || raw === undefined) return null;
    if (typeof raw !== 'string') return raw;
    try { return JSON.parse(raw); } catch { return raw; }
}
async function getConfig(sb, key) {
    const { data } = await sb.from('system_config').select('config_value').eq('config_key', key).maybeSingle();
    return data ? readConfig(data.config_value) : null;
}
async function setConfig(sb, key, value) {
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    const { data } = await sb.from('system_config').select('id').eq('config_key', key).maybeSingle();
    if (data) await sb.from('system_config').update({ config_value: text, updated_at: new Date().toISOString() }).eq('config_key', key);
    else await sb.from('system_config').insert({ config_key: key, config_value: text });
}

export default async function handler(req, res) {
    // Refuse to run at all if the secret is not set, so "Bearer undefined" can never get in.
    if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'Unauthorized' });
    const sb = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const nowIso = new Date().toISOString();
    const lines = [];

    try {
        // ---- 1. Unknown admins -------------------------------------------------------------------------------
        const known = await getConfig(sb, 'known_admin_ids');
        const knownIds = Array.isArray(known) ? known.map(String) : null;
        const autoOff = String(await getConfig(sb, 'security_auto_contain') ?? '').toLowerCase() === 'off';
        let contained = 0;

        if (knownIds && knownIds.length) {
            const { data: admins } = await sb.from('profiles').select('id, email, user_type, tier, signup_ip, last_login_ip, ip_address').in('user_type', ['admin', 'super_admin']);
            const unknown = (admins || []).filter(a => !knownIds.includes(String(a.id)));

            for (const a of unknown) {
                const ips = new Set([a.signup_ip, a.last_login_ip, a.ip_address].filter(Boolean).map(String));
                try {
                    const { data: acts } = await sb.from('user_activity_log').select('ip_address').eq('user_id', a.id).order('created_at', { ascending: false }).limit(20);
                    (acts || []).forEach(r => r.ip_address && ips.add(String(r.ip_address)));
                } catch { /* optional */ }

                if (!autoOff) {
                    await sb.from('profiles').update({ user_type: 'job_seeker', tier: 'free', updated_at: nowIso }).eq('id', a.id);
                    try { await sb.auth.admin.updateUserById(a.id, { ban_duration: '876000h' }); } catch (e) { console.warn('ban failed:', e.message); }
                    const { data: trusted } = await sb.from('security_trusted_ips').select('ip');
                    const safe = new Set((trusted || []).map(t => String(t.ip)));
                    for (const ip of ips) {
                        if (safe.has(ip)) continue;
                        const { data: live } = await sb.from('blocked_ips').select('id').eq('ip_address', ip).gt('expires_at', nowIso).limit(1);
                        if (!live || !live.length) {
                            await sb.from('blocked_ips').insert({ ip_address: ip, expires_at: new Date(Date.now() + 30 * 86400000).toISOString(), reason: 'unknown_admin_account' });
                        }
                    }
                    contained++;
                }
                await sb.from('security_events').insert({
                    event_type: 'unknown_admin_contained', ip_address: [...ips][0] || 'unknown', severity: 'critical',
                    details: { email: a.email, id: a.id, role_was: a.user_type, auto_contained: !autoOff, ips: [...ips] }, created_at: nowIso
                });
                lines.push(`UNKNOWN ADMIN ${autoOff ? 'FOUND (automatic action is off)' : 'FOUND AND DEMOTED + BANNED'}: ${a.email || a.id} (was ${a.user_type}). IPs linked: ${[...ips].join(', ') || 'none recorded'}.`);
            }
        }

        // ---- 2. New critical events from the database guards -----------------------------------------------
        const last = await getConfig(sb, 'security_watch_last_run');
        const since = typeof last === 'string' && !isNaN(Date.parse(last)) ? last : new Date(Date.now() - 15 * 60000).toISOString();
        const { data: evs } = await sb.from('security_events').select('event_type, ip_address, details, created_at')
            .in('event_type', ALERT_EVENTS).gt('created_at', since).neq('event_type', 'unknown_admin_contained')
            .order('created_at', { ascending: false }).limit(25);
        (evs || []).forEach(e => lines.push(`${e.event_type} from ${e.ip_address || 'unknown IP'} at ${String(e.created_at).replace('T', ' ').slice(0, 16)} ${e.details && e.details.email ? '(' + e.details.email + ')' : ''}`));

        await setConfig(sb, 'security_watch_last_run', nowIso);

        if (!lines.length) return res.status(200).json({ ok: true, alerts: 0, contained });

        // ---- 3. One email ------------------------------------------------------------------------------------
        let to = '';
        try {
            const { data: fs } = await sb.from('finance_settings').select('value').eq('key', 'owner_email').maybeSingle();
            to = String(fs?.value || '').trim();
        } catch { /* optional */ }
        if (!to) to = String(process.env.OWNER_ALERT_EMAIL || '').trim();
        if (!to && knownIds && knownIds.length) {
            const { data: owners } = await sb.from('profiles').select('email').in('id', knownIds).eq('user_type', 'super_admin').neq('email', 'system@bluskyeconsult.com').limit(1);
            to = String(owners?.[0]?.email || '').trim();
        }
        if (!/^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/.test(to)) return res.status(200).json({ ok: true, alerts: lines.length, emailed: false, reason: 'no owner email found' });

        const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#111"><h2 style="font-size:16px;color:#b00020">ODUSBABA security alert</h2><ul>${lines.map(l => `<li style="margin:6px 0">${esc(l)}</li>`).join('')}</ul><p style="color:#555;font-size:12px">Open Admin &gt; Security to review events and locked IP addresses. If an alert is about a staff member you created yourself, add their id to system_config "known_admin_ids".</p></div>`;
        await getTransporter().sendMail({
            from: `"ODUSBABA Security" <${process.env.SMTP_SENDER_EMAIL || process.env.VITE_EMAIL_SENDER || process.env.EMAIL_SENDER_ADDRESS || 'noreply@bluskyeconsult.com'}>`,
            to, subject: `ODUSBABA SECURITY ALERT: ${lines.length} item${lines.length === 1 ? '' : 's'}`, html
        });
        return res.status(200).json({ ok: true, alerts: lines.length, emailed: true, contained });
    } catch (e) {
        console.error('security-watch error:', e);
        return res.status(500).json({ error: 'Security watch failed' });
    }
}

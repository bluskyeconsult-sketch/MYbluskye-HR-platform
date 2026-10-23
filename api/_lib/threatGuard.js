// api/_lib/threatGuard.js  (new 2026-10-23)
// Spots hacker and spammer behaviour, scores it per IP address, and blocks the IP automatically.
// It reuses your existing tables: security_events (what happened) and blocked_ips (who is blocked).
//
// SAFETY DESIGN (so real members are not disrupted):
//  * Every check is fail-open: if the database is down, nobody is blocked.
//  * Blocks always EXPIRE (1 hour, then 24 hours, 7 days, 30 days for repeat offenders). Nothing is permanent
//    unless an admin makes it so.
//  * Modes, set with the Vercel variable SECURITY_AUTOBLOCK:
//      off      = record signals, never block
//      certain  = (DEFAULT) block at once only for signals with no innocent explanation (attack tools, decoy
//                 pages, exploit strings). Statistical signals are recorded but do not block.
//      on       = also block when an IP's score reaches 100 within 15 minutes
//  * Your own IPs: SECURITY_ALLOWLIST_IPS (comma separated). Private/local addresses and Vercel cron are exempt.
//  * Nothing here reads request bodies except one narrow exploit-string check.

const WINDOW_MINUTES = 15;
const BLOCK_SCORE = 100;
const ESCALATION_MINUTES = [60, 24 * 60, 7 * 24 * 60, 30 * 24 * 60];

// weight = points added to the IP's score. certain = block at once even in 'certain' mode.
export const RULES = {
    // ---- new signals recorded by this file ----
    threat_attack_tool_ua:   { weight: 100, certain: true,  why: 'User-agent of a known hacking or scanning tool' },
    threat_honeypot:         { weight: 100, certain: true,  why: 'Visited a decoy page no real visitor can reach (/.env, /wp-login.php ...)' },
    threat_exploit_url:      { weight: 100, certain: true,  why: 'Exploit string in the URL (directory traversal, Log4Shell)' },
    threat_injection_url:    { weight: 60,  certain: false, why: 'SQL/script injection pattern in the URL' },
    threat_exploit_body:     { weight: 60,  certain: false, why: 'Log4Shell string inside a request body' },
    threat_unknown_action:   { weight: 8,   certain: false, why: 'Asked for an API action that does not exist (scanning)' },
    threat_forbidden:        { weight: 2,   certain: false, why: 'Signed in but repeatedly told "not allowed" (probing other people\'s data)' },
    threat_too_many_requests:{ weight: 5,   certain: false, why: 'Hit a per-feature rate limit' },
    // ---- signals your code already records, now counted towards the score ----
    user_login_failed:                 { weight: 3,   certain: false, why: 'Failed member login' },
    admin_login_failed:                { weight: 10,  certain: false, why: 'Failed admin login' },
    admin_login_unauthorized_role:     { weight: 100, certain: true,  why: 'Valid login tried to enter the admin area without being an admin' },
    rate_limit_exceeded:               { weight: 5,   certain: false, why: 'Email rate limit hit' },
    message_rate_limit_exceeded:       { weight: 10,  certain: false, why: 'Message flood' },
    suspicious_message_content:        { weight: 15,  certain: false, why: 'Message with many links (spam)' },
    malicious_file_upload_blocked:     { weight: 60,  certain: false, why: 'Tried to upload a dangerous file' }
};

const TOOL_UA = /(sqlmap|nikto|nmap|masscan|acunetix|nessus|openvas|wpscan|havij|dirbuster|gobuster|feroxbuster|ffuf|nuclei|zgrab|hydra|metasploit|w3af|arachni|zaproxy|owasp[ _-]?zap|burpsuite|netsparker|appscan|jaeles|dirsearch|commix|xsstrike|fuzz faster)/i;
const EXPLOIT_URL = /(\.\.\/|\.\.%2f|%2e%2e(%2f|\/)|\/etc\/passwd|\/etc\/shadow|\$\{jndi:|%24%7bjndi|\bwin\.ini\b|\/proc\/self)/i;
const INJECTION_URL = /(union(\s|\+|%20)+(all(\s|\+|%20)+)?select|<script|%3cscript|javascript:|(\bor\b|%20or%20)(\s|\+|%20)*['"]?1['"]?(\s|\+|%20)*=(\s|\+|%20)*['"]?1|information_schema|sleep\((\s|%20)*\d|benchmark\(|;(\s|%20)*drop(\s|%20)+table|xp_cmdshell|load_file\()/i;
const BODY_EXPLOIT = /\$\{jndi:/i;
const ACTION_SHAPE = /^[A-Za-z0-9_-]{1,80}$/;

export function isPrivateOrInvalidIp(ip) {
    if (!ip || typeof ip !== 'string' || ip === 'unknown' || ip.length > 45) return true;
    if (!/^[0-9a-fA-F:.]+$/.test(ip)) return true;
    if (/^(10\.|127\.|192\.168\.|169\.254\.|0\.0\.0\.0)/.test(ip) || /^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
    if (ip === '::1' || /^f[cd][0-9a-f]{2}:/i.test(ip) || /^fe80:/i.test(ip)) return true;
    return false;
}

// Pure check of one request. No database. Returns [{event, details}]
export function inspectRequest(req, action) {
    const out = [];
    const ua = String(req.headers?.['user-agent'] || '');
    if (TOOL_UA.test(ua)) out.push({ event: 'threat_attack_tool_ua', details: { ua: ua.slice(0, 120) } });
    let url = String(req.url || '');
    try { url = decodeURIComponent(url); } catch { /* keep raw */ }
    const raw = String(req.url || '');
    if (EXPLOIT_URL.test(url) || EXPLOIT_URL.test(raw)) out.push({ event: 'threat_exploit_url', details: { url: raw.slice(0, 160) } });
    else if (INJECTION_URL.test(url) || INJECTION_URL.test(raw)) out.push({ event: 'threat_injection_url', details: { url: raw.slice(0, 160) } });
    if (req.body && typeof req.body === 'object') {
        try { if (BODY_EXPLOIT.test(JSON.stringify(req.body).slice(0, 50000))) out.push({ event: 'threat_exploit_body', details: { action: action || null } }); } catch { /* ignore */ }
    }
    return out;
}

export function buildThreatGuard({ getSupabase, notify, env = process.env, now = () => Date.now() }) {
    const mode = () => { const m = String(env.SECURITY_AUTOBLOCK || 'certain').toLowerCase(); return ['off', 'certain', 'on'].includes(m) ? m : 'certain'; };
    const allow = () => new Set(String(env.SECURITY_ALLOWLIST_IPS || '').split(',').map(s => s.trim()).filter(Boolean));
    const alertTimes = [];

    function exempt(req, ip) {
        if (isPrivateOrInvalidIp(ip)) return true;
        if (allow().has(ip)) return true;
        if (/^vercel-cron\//i.test(String(req?.headers?.['user-agent'] || ''))) return true;
        return false;
    }

    async function score(sb, ip) {
        const since = new Date(now() - WINDOW_MINUTES * 60000).toISOString();
        const { data, error } = await sb.from('security_events').select('event_type').eq('ip_address', ip).gte('created_at', since).in('event_type', Object.keys(RULES)).limit(500);
        if (error) throw error;
        let total = 0; const counts = {};
        for (const r of data || []) { total += RULES[r.event_type]?.weight || 0; counts[r.event_type] = (counts[r.event_type] || 0) + 1; }
        return { total, counts };
    }

    async function block(sb, ip, reason, counts) {
        const { data: prior } = await sb.from('security_events').select('id', { count: 'exact', head: false }).eq('ip_address', ip).eq('event_type', 'threat_auto_block').gte('created_at', new Date(now() - 90 * 86400000).toISOString()).limit(10);
        const strikes = Math.min((prior || []).length, ESCALATION_MINUTES.length - 1);
        const minutes = ESCALATION_MINUTES[strikes];
        const { data: active } = await sb.from('blocked_ips').select('id').eq('ip_address', ip).gt('expires_at', new Date(now()).toISOString()).limit(1);
        if (!active || active.length === 0) {
            const { error } = await sb.from('blocked_ips').insert({ ip_address: ip, reason: `auto: ${reason}`.slice(0, 200), block_reason: `auto: ${reason}`.slice(0, 200), expires_at: new Date(now() + minutes * 60000).toISOString() });
            if (error) throw error;
        }
        await sb.from('security_events').insert({ event_type: 'threat_auto_block', ip_address: ip, severity: 'critical', details: { reason, minutes, strikes: strikes + 1, signals: counts }, created_at: new Date(now()).toISOString() });
        if (notify) {
            const t = now(); while (alertTimes.length && t - alertTimes[0] > 3600000) alertTimes.shift();
            if (alertTimes.length < 5) { alertTimes.push(t); try { await notify(`ODUSBABA blocked an IP automatically (${ip})`, `Reason: ${reason}\nBlocked for: ${minutes} minutes (strike ${strikes + 1})\nSignals in the last ${WINDOW_MINUTES} minutes: ${JSON.stringify(counts)}\n\nReview or lift it in Admin > Security. Block emails are limited to 5 an hour.`); } catch { /* alerts must never break a request */ } }
        }
        return { minutes };
    }

    // Records signals for this request and decides whether the IP must now be blocked. Never throws.
    async function report(req, ip, signals, userId) {
        try {
            if (!signals.length || exempt(req, ip)) return { blocked: false };
            const sb = getSupabase();
            const rows = signals.map(s => ({ event_type: s.event, ip_address: ip, severity: RULES[s.event]?.weight >= 60 ? 'warning' : 'info', details: { ...(s.details || {}), ...(userId ? { userId } : {}) }, created_at: new Date(now()).toISOString() }));
            const { error } = await sb.from('security_events').insert(rows);
            if (error) throw error;
            const m = mode(); if (m === 'off') return { blocked: false };
            const certain = signals.find(s => RULES[s.event]?.certain);
            if (certain) { await block(sb, ip, RULES[certain.event].why, { [certain.event]: 1 }); return { blocked: true }; }
            if (m === 'on') {
                const sc = await score(sb, ip);
                if (sc.total >= BLOCK_SCORE) { await block(sb, ip, `score ${sc.total} in ${WINDOW_MINUTES} min`, sc.counts); return { blocked: true }; }
            }
            return { blocked: false };
        } catch (err) { console.warn('threatGuard failed, failing open:', err.message); return { blocked: false }; }
    }

    return {
        mode, RULES,
        // before the action runs
        inspect: (req, ip, action) => report(req, ip, inspectRequest(req, action), null),
        // action asked for does not exist
        unknownAction: (req, ip, action) => report(req, ip, [{ event: 'threat_unknown_action', details: { action: String(action || '').slice(0, 80), shape: ACTION_SHAPE.test(String(action || '')) } }], null),
        // after the action has answered
        after: (req, res, ip, userId) => {
            const sc = res?.statusCode;
            if (sc === 403) return report(req, ip, [{ event: 'threat_forbidden', details: { action: req.query?.action || null } }], userId);
            if (sc === 429) return report(req, ip, [{ event: 'threat_too_many_requests', details: { action: req.query?.action || null } }], userId);
            return Promise.resolve({ blocked: false });
        },
        honeypot: (req, ip) => report(req, ip, [{ event: 'threat_honeypot', details: { path: String(req.headers?.['x-vercel-original-path'] || req.query?.p || req.url || '').slice(0, 160) } }], null),
        _score: score
    };
}

// api/cron/grant-monthly-credits.js
//
// NEW (2026-10-02): the genuinely missing trigger - confirmed
// directly that the real grant-monthly-credits action in index.js
// has existed, correctly built, but has NEVER been called by
// anything - no cron entry, no admin button, nothing. This file is
// the fix: a real, daily cron that calls the existing action's own
// internal logic via a real, direct internal HTTP call to the same
// deployment, rather than duplicating the credit-granting logic into
// a second, separate place that could drift from the original.
//
// Runs daily (not monthly) because the reset logic itself was also
// fixed to use a genuine, per-user rolling 30-day window since each
// user's own last grant (or registration date) - a daily check is
// what actually honors that per-user window; a monthly-only cron
// would reintroduce the same "fixed global date" unfairness this fix
// was meant to resolve.
//
// FIXED (2026-11-12): the security log showed this job's internal call arriving at the action WITHOUT its secret and
// being refused (401) at 06:00 on 11 Nov. The cause: the call went to https://bluskyeconsult.com, which the host
// redirects to www.bluskyeconsult.com, and the fetch library deliberately drops the Authorization header when a redirect
// changes the web address. So the secret never arrived. The call now follows redirects itself, one step at a time, and
// re-sends the secret only to our own domain. It also reports the real status so a failure is visible in the logs.

const MAX_HOPS = 4;

export default async function handler(req, res) {
    const authHeader = req.headers.authorization;
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const siteUrl = (process.env.SITE_URL || 'https://www.bluskyeconsult.com').replace(/\/+$/, '');
        const baseHost = new URL(siteUrl).hostname.toLowerCase();
        const baseDomain = baseHost.split('.').slice(-2).join('.'); // e.g. bluskyeconsult.com
        const isOurs = (h) => { h = String(h).toLowerCase(); return h === baseDomain || h.endsWith('.' + baseDomain); };

        // Internal call to the existing, already-fixed action - this
        // deliberately reuses the real logic in index.js rather than
        // duplicating it here, so there's only ever one real,
        // authoritative implementation of credit-granting.
        let url = `${siteUrl}/api/index?action=grant-monthly-credits`;
        let response;
        for (let hop = 0; hop <= MAX_HOPS; hop++) {
            response = await fetch(url, {
                method: 'POST',
                redirect: 'manual',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.CRON_SECRET}`
                }
            });
            if ([301, 302, 303, 307, 308].includes(response.status) && response.headers.get('location')) {
                const next = new URL(response.headers.get('location'), url);
                // never send the secret anywhere but our own domain
                if (!isOurs(next.hostname) || !/^https?:$/.test(next.protocol)) {
                    console.error('grant-monthly-credits cron: refused to follow a redirect to', next.hostname);
                    return res.status(502).json({ success: false, error: 'Unexpected redirect target' });
                }
                url = next.toString();
                continue;
            }
            break;
        }

        let data;
        try { data = await response.json(); } catch (e) { data = { success: false, error: `Unreadable response (status ${response.status})` }; }
        if (response.status >= 400) console.error('grant-monthly-credits cron: the action answered', response.status, JSON.stringify(data).slice(0, 300));
        return res.status(response.status).json(data);
    } catch (error) {
        console.error('grant-monthly-credits cron error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

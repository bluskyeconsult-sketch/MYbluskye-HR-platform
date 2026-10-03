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

export default async function handler(req, res) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const siteUrl = process.env.SITE_URL || 'https://bluskyeconsult.com';
        // Internal call to the existing, already-fixed action - this
        // deliberately reuses the real logic in index.js rather than
        // duplicating it here, so there's only ever one real,
        // authoritative implementation of credit-granting.
        const response = await fetch(`${siteUrl}/api/index?action=grant-monthly-credits`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Internal cron-to-API call, authenticated the same
                // way this cron itself was authenticated - genuinely
                // trusted since it never leaves Vercel's own network
                // for this specific, internal call.
                'Authorization': `Bearer ${process.env.CRON_SECRET}`
            }
        });

        const data = await response.json();
        return res.status(response.status).json(data);
    } catch (error) {
        console.error('grant-monthly-credits cron error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

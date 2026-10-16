// api/cron/sync-mailboxes.js
//
// NEW (2026-10-16): runs every 5 minutes. Copies new mail from each active mailbox into the
// Admin Inbox. Once a night (around 03:00 UTC) it also applies the retention rule.
// Reading the mailbox never changes or deletes anything on the mail server.

import { createClient } from '@supabase/supabase-js';
import { syncAllAccounts, purgeOld } from '../_lib/mail.js';

export default async function handler(req, res) {
    const authHeader = req.headers.authorization;
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    try {
        const results = await syncAllAccounts({ sb, budgetMs: 100000 });
        let purged = null;
        const now = new Date();
        if (now.getUTCHours() === 3 && now.getUTCMinutes() < 5) {
            const months = Math.max(1, parseInt(process.env.MAIL_RETENTION_MONTHS || '12', 10) || 12);
            purged = await purgeOld(sb, months);
        }
        return res.status(200).json({ success: true, results, purged });
    } catch (e) {
        console.error('sync-mailboxes error:', e);
        return res.status(500).json({ success: false, error: e.message });
    }
}

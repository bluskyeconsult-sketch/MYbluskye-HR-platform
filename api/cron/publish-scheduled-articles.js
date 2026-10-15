// api/cron/publish-scheduled-articles.js
//
// NEW (2026-09-19): checks for articles whose scheduled_for time has
// arrived and genuinely flips them to published - the real
// scheduling mechanism the bulk article-topics workflow needs, since
// setting scheduled_for alone does nothing without something to act
// on it.

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // Standard Vercel cron authentication - verifies this request
    // genuinely comes from Vercel's own cron scheduler, not an
    // arbitrary caller, using the same CRON_SECRET already set up
    // for the other cron jobs on this platform.
    const authHeader = req.headers.authorization;
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        const now = new Date().toISOString();

        const { data: dueArticles, error: fetchError } = await supabase
            .from('articles')
            .select('id, title, slug, send_notification')
            .eq('is_published', false)
            .not('scheduled_for', 'is', null)
            .lte('scheduled_for', now);

        if (fetchError) throw fetchError;

        if (!dueArticles || dueArticles.length === 0) {
            return res.status(200).json({ success: true, published: 0 });
        }

        const { error: updateError } = await supabase
            .from('articles')
            .update({ is_published: true, published_at: now, scheduled_for: null })
            .in('id', dueArticles.map(a => a.id));

        if (updateError) throw updateError;

        console.log(`Published ${dueArticles.length} scheduled articles:`, dueArticles.map(a => a.title));

        // NEW (2026-10-15): an article scheduled with "notify subscribers" ticked now sends that
        // notification at the moment it goes live (before, only a manual Publish ever notified).
        // Uses the same internal-secret route the platform already trusts for service calls.
        let notified = 0;
        const toNotify = dueArticles.filter(a => a.send_notification);
        if (toNotify.length > 0) {
            const secret = process.env.INTERNAL_SERVICE_SECRET;
            const host = req.headers['x-forwarded-host'] || req.headers.host;
            if (!secret || !host) {
                console.warn('Scheduled article notifications skipped: INTERNAL_SERVICE_SECRET or host missing');
            } else {
                const results = await Promise.allSettled(toNotify.map(a =>
                    fetch(`https://${host}/api/index?action=notify-article-subscribers`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
                        body: JSON.stringify({ articleId: a.id, articleTitle: a.title, articleSlug: a.slug })
                    })
                ));
                notified = results.filter(r => r.status === 'fulfilled' && r.value.ok).length;
            }
        }

        return res.status(200).json({ success: true, published: dueArticles.length, notified });
    } catch (error) {
        console.error('publish-scheduled-articles cron error:', error);
        return res.status(500).json({ error: error.message });
    }
}

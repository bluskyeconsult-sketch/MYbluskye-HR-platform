// api/cron/sync-external-jobs.js
// Vercel Cron Job Endpoint - Scheduled external job sync
// Runs daily to fetch jobs from all RSS feeds and Jobicy API
//
// RESTORED (2026-08-16): accidentally deleted during the api/ function-count
// cleanup. This is the file vercel.json's cron config actually points to
// (/api/cron/sync-external-jobs) — it thinly wraps fetchExternalJobs() in
// src/services/rssJobService.js, which was verified correct and properly
// targets the real external_jobs table earlier this session.

import { fetchExternalJobs } from '../../src/services/rssJobService.js';

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Verify cron secret for security (optional - set CRON_SECRET in Vercel env)
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        console.warn('Unauthorized cron attempt');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('🕐 Cron job started:', new Date().toISOString());

    try {
        const result = await fetchExternalJobs(false);

        console.log(`🕐 Cron job finished: ${result.totalAdded} new jobs added`);

        return res.status(200).json({
            success: true,
            jobsAdded: result.totalAdded,
            timestamp: new Date().toISOString(),
            details: result.results?.slice(0, 10) // First 10 results for logging
        });
    } catch (error) {
        console.error('Cron job failed:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

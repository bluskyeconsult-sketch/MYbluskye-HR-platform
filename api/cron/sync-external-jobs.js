// api/cron/sync-external-jobs.js
// Vercel Cron Job Endpoint - Scheduled external job sync
// Runs daily to fetch jobs from all RSS feeds and Jobicy API
//
// RESTORED (2026-08-16): accidentally deleted during the api/ function-count
// cleanup. This is the file vercel.json's cron config actually points to
// (/api/cron/sync-external-jobs) — it thinly wraps fetchExternalJobs() in
// src/services/rssJobService.js, which was verified correct and properly
// targets the real external_jobs table earlier this session.
//
// UPGRADED (2026-08-27): now also runs the verified employer source
// scraper (employerWebsiteScraperService.js) in the same daily
// invocation, rather than requesting a third Vercel cron slot. Hobby
// plan's cron budget is already fully used by this job and
// dispatch-job-alerts - both real, scheduled operations here are
// background, non-time-pressured work with the same 60-second budget
// available, so running them sequentially in one invocation is a safe,
// free way to get both scheduled without any plan upgrade. If either
// step fails, the other still runs and reports its own real result -
// they're isolated from each other, not all-or-nothing.

import { fetchExternalJobs } from '../../src/services/rssJobService.js';
import { scrapeAllVerifiedEmployers } from '../../src/services/employerWebsiteScraperService.js';
import { createClient } from '@supabase/supabase-js';

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

    const response = {
        success: true,
        timestamp: new Date().toISOString(),
        rssSync: null,
        employerScrape: null
    };

    // Step 1: RSS/API sources - unchanged, real, already-fixed logic.
    try {
        const result = await fetchExternalJobs(false);
        console.log(`🕐 RSS sync finished: ${result.totalAdded} new jobs added`);
        response.rssSync = {
            success: true,
            jobsAdded: result.totalAdded,
            details: result.results?.slice(0, 10)
        };
    } catch (error) {
        console.error('RSS sync failed:', error);
        response.rssSync = { success: false, error: error.message };
    }

    // Step 2: NEW - verified employer sources (Schema.org JobPosting
    // scraping). Isolated in its own try/catch so an issue here never
    // prevents the RSS sync above from having already completed and
    // reported its real result.
    try {
        const supabaseClient = createClient(
            process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        const employerResult = await scrapeAllVerifiedEmployers(supabaseClient);
        console.log(`🕐 Employer source scrape finished: ${employerResult.totalAdded} new jobs added`);
        response.employerScrape = {
            success: true,
            jobsAdded: employerResult.totalAdded,
            details: employerResult.results
        };
    } catch (error) {
        console.error('Employer source scrape failed:', error);
        response.employerScrape = { success: false, error: error.message };
    }

    return res.status(200).json(response);
}

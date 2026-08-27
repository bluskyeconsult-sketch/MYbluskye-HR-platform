// api/cron/dispatch-job-alerts.js
// Vercel Cron Job Endpoint - dispatches job alert matches and emails
//
// NEW (2026-08-27): this is the missing piece confirmed this session -
// jobAlertService.js already has real, complete matching (matchJobsToAlert)
// and email dispatch (dispatchJobAlert, processAllJobAlerts,
// runJobAlertCron) logic, but nothing anywhere ever called it. Users could
// create alerts (confirmed working via JobAlertsPage.jsx's direct Supabase
// calls) but nothing ever matched new jobs against them or sent an email.
// vercel.json only had two cron slots, both already spoken for
// (sync-external-jobs, grant-monthly-credits) - grant-monthly-credits was
// moved to Supabase's own pg_cron (see migrate-credits-to-pg-cron.sql),
// freeing this slot for the alert dispatch that was actually missing.
//
// IMPORTANT DESIGN NOTE: this cron is registered to run DAILY. Calling
// processAllJobAlerts('weekly') on every single daily run would silently
// break the whole point of a "weekly" preference - matchJobsToAlert only
// looks at jobs posted since last_sent_at, and dispatchJobAlert updates
// last_sent_at after every successful send, so a naive daily call would
// actually email "weekly" users every day a new job appears, not once a
// week. Weekly dispatch is gated to only actually run on Mondays, even
// though the underlying trigger fires daily - this lets one single daily
// cron correctly serve both daily and weekly user preferences without
// needing two separate registered schedules.

import { processAllJobAlerts } from '../../src/services/jobAlertService.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        console.warn('Unauthorized cron attempt');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('Job alert dispatch cron started:', new Date().toISOString());

    try {
        const dailyResults = await processAllJobAlerts('daily');

        // Monday = 1 (JavaScript's getDay(): 0=Sunday, 1=Monday, ...).
        // Weekly alerts only actually dispatch once a week even though
        // this cron itself runs every day.
        const isMonday = new Date().getDay() === 1;
        const weeklyResults = isMonday ? await processAllJobAlerts('weekly') : [];

        console.log(`Job alert dispatch finished: ${dailyResults.length} daily, ${weeklyResults.length} weekly`);

        return res.status(200).json({
            success: true,
            daily: dailyResults.length,
            weekly: weeklyResults.length,
            weeklyRanToday: isMonday,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Job alert dispatch cron failed:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

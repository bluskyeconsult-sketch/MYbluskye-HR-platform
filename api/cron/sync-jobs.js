// api/cron/sync-jobs.js
// Vercel Cron Job Endpoint - Scheduled external job sync

import { syncExternalJobs } from '../../src/services/jobFeedService.js';

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Verify cron secret for security (optional)
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    console.log('🕐 Cron job started:', new Date().toISOString());
    
    const result = await syncExternalJobs({
        techmapApiKey: process.env.TECHMAP_API_KEY,
        jobicyRegions: ['usa', 'uk', 'emea', 'apac', 'canada', 'australia']
    });
    
    console.log('🕐 Cron job finished:', new Date().toISOString());
    
    return res.status(200).json({
        success: result.success,
        fetched: result.fetched,
        inserted: result.inserted,
        skipped: result.skipped,
        timestamp: new Date().toISOString()
    });
}

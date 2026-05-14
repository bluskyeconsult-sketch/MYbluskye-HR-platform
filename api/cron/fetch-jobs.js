// api/cron/fetch-jobs.js
// Vercel Cron Job - Runs automatically every 6 hours

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // Verify cron secret for security
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Define RSS feeds
    const RSS_FEEDS = [
        { name: 'UK Civil Service Jobs', country: 'GB', url: 'https://www.civilservicejobs.gov.uk/feeds/jobs.xml' },
        { name: 'NHS Jobs', country: 'GB', url: 'https://www.jobs.nhs.uk/feeds/jobs.xml' },
        { name: 'USAJobs', country: 'US', url: 'https://www.usajobs.gov/rss' },
        { name: 'GC Jobs Canada', country: 'CA', url: 'https://www.jobs.gc.ca/rss' },
        { name: 'APS Jobs Australia', country: 'AU', url: 'https://www.apsjobs.gov.au/rss' }
    ];
    
    let totalAdded = 0;
    
    for (const source of RSS_FEEDS) {
        try {
            const response = await fetch(source.url);
            const text = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, 'text/xml');
            const items = xmlDoc.querySelectorAll('item');
            
            for (const item of items) {
                const title = item.querySelector('title')?.textContent || '';
                const description = item.querySelector('description')?.textContent || '';
                const link = item.querySelector('link')?.textContent || '';
                
                if (!title || !link) continue;
                
                // Check if exists
                const { data: existing } = await supabase
                    .from('external_jobs')
                    .select('id')
                    .eq('title', title.substring(0, 150))
                    .eq('source_name', source.name)
                    .maybeSingle();
                
                if (!existing) {
                    await supabase.from('external_jobs').insert({
                        title: title.substring(0, 200),
                        description: description.substring(0, 2000),
                        external_apply_url: link,
                        source_country: source.country,
                        source_name: source.name,
                        job_type: 'full_time',
                        status: 'pending_approval'
                    });
                    totalAdded++;
                }
            }
        } catch (error) {
            console.error(`Error fetching ${source.name}:`, error);
        }
    }
    
    // Log the fetch
    await supabase.from('external_job_fetch_log').insert({
        source_name: 'cron_job',
        fetch_status: 'success',
        jobs_fetched: totalAdded,
        jobs_new: totalAdded
    });
    
    return res.status(200).json({ 
        success: true, 
        message: `Cron job completed. Added ${totalAdded} new jobs.`,
        timestamp: new Date().toISOString()
    });
}

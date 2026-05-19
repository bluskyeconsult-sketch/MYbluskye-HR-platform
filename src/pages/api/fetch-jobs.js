// src/pages/api/fetch-jobs.js
// SERVER-SIDE JOB FETCH - NO CORS ISSUES

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Job sources with verified working URLs
const JOB_SOURCES = [
    { name: 'UK Civil Service', country: 'GB', url: 'https://www.civilservicejobs.gov.uk/feeds/jobs.xml' },
    { name: 'UK NHS Jobs', country: 'GB', url: 'https://www.jobs.nhs.uk/feeds/jobs.xml' },
    { name: 'USAJobs', country: 'US', url: 'https://www.usajobs.gov/rss' },
    { name: 'GC Jobs Canada', country: 'CA', url: 'https://www.jobs.gc.ca/rss' },
    { name: 'APS Jobs Australia', country: 'AU', url: 'https://www.apsjobs.gov.au/rss' }
];

async function fetchRSS(url) {
    const response = await fetch(url, { next: { revalidate: 3600 } });
    const text = await response.text();
    
    // Simple XML parsing without DOMParser (server-safe)
    const jobs = [];
    const itemRegex = /<item>[\s\S]*?<\/item>/g;
    const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/;
    const linkRegex = /<link>(.*?)<\/link>/;
    const descRegex = /<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/;
    
    const items = text.match(itemRegex) || [];
    
    for (const item of items) {
        const titleMatch = item.match(titleRegex);
        const linkMatch = item.match(linkRegex);
        const descMatch = item.match(descRegex);
        
        if (titleMatch && linkMatch) {
            jobs.push({
                title: (titleMatch[1] || titleMatch[2] || '').substring(0, 200),
                link: linkMatch[1],
                description: (descMatch?.[1] || descMatch?.[2] || '').substring(0, 500)
            });
        }
    }
    
    return jobs;
}

export default async function handler(req, res) {
    // Only allow POST or GET with secret key
    const authHeader = req.headers.authorization;
    const isValidRequest = req.method === 'POST' || 
        (req.method === 'GET' && authHeader === `Bearer ${process.env.CRON_SECRET}`);
    
    if (!isValidRequest) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const results = [];
    
    for (const source of JOB_SOURCES) {
        try {
            console.log(`Fetching ${source.name}...`);
            const jobs = await fetchRSS(source.url);
            
            for (const job of jobs) {
                // Check for duplicate
                const { data: existing } = await supabase
                    .from('external_jobs')
                    .select('id')
                    .eq('title', job.title)
                    .eq('source_name', source.name)
                    .maybeSingle();
                
                if (!existing) {
                    await supabase.from('external_jobs').insert({
                        title: job.title,
                        company: source.name,
                        location: source.country,
                        description: job.description,
                        external_apply_url: job.link,
                        source_country: source.country,
                        source_name: source.name,
                        status: 'pending_approval'
                    });
                    results.push({ source: source.name, job: job.title, status: 'added' });
                }
            }
        } catch (error) {
            results.push({ source: source.name, error: error.message });
        }
    }
    
    return res.status(200).json({ 
        success: true, 
        fetched: results.filter(r => r.status === 'added').length,
        details: results 
    });
}

// api/cron/fetch-jobs.js
// Vercel Cron Job - Runs automatically on schedule (configured in vercel.json)
// Fetches external jobs from RSS feeds and adds them to the database

import { createClient } from '@supabase/supabase-js';

// ============================================
// CONFIGURATION
// ============================================

// Initialize Supabase with service role key (bypasses RLS)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Complete RSS feed sources
const RSS_FEEDS = [
    // United Kingdom
    { name: 'UK Civil Service Jobs', country: 'GB', url: 'https://www.civilservicejobs.gov.uk/feeds/jobs.xml', is_active: true },
    { name: 'NHS Jobs', country: 'GB', url: 'https://www.jobs.nhs.uk/feeds/jobs.xml', is_active: true },
    { name: 'UK Find a Job', country: 'GB', url: 'https://findajob.dwp.gov.uk/feeds/jobs.rss', is_active: true },
    
    // Ireland
    { name: 'Public Jobs Ireland', country: 'IE', url: 'https://www.publicjobs.ie/rss', is_active: true },
    
    // Canada
    { name: 'GC Jobs Canada', country: 'CA', url: 'https://www.jobs.gc.ca/rss', is_active: true },
    
    // Australia
    { name: 'APS Jobs Australia', country: 'AU', url: 'https://www.apsjobs.gov.au/rss', is_active: true },
    
    // USA
    { name: 'USAJobs', country: 'US', url: 'https://www.usajobs.gov/rss', is_active: true },
    
    // Germany
    { name: 'Bund.de', country: 'DE', url: 'https://www.bund.de/rss/jobs', is_active: true }
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function detectJobType(title) {
    const text = title.toLowerCase();
    if (text.includes('remote') || text.includes('work from home')) return 'remote';
    if (text.includes('part time') || text.includes('part-time')) return 'part_time';
    if (text.includes('contract') || text.includes('fixed term')) return 'contract';
    if (text.includes('freelance')) return 'freelance';
    if (text.includes('hybrid')) return 'hybrid';
    return 'full_time';
}

function extractSalary(text) {
    const patterns = [
        /£([\d,]+)(?:\s*-\s*£([\d,]+))?/i,
        /€([\d,]+)(?:\s*-\s*€([\d,]+))?/i,
        /\$([\d,]+)(?:\s*-\s*\$([\d,]+))?/i,
        /CAD\s*([\d,]+)(?:\s*-\s*([\d,]+))?/i,
        /AUD\s*([\d,]+)(?:\s*-\s*([\d,]+))?/i
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            if (match[2]) return `${match[1]} - ${match[2]}`;
            return match[1];
        }
    }
    return null;
}

// Parse RSS feed (server-safe, handles both browser and Node.js environments)
async function parseRSSFeed(url, sourceName) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(url, { 
            signal: controller.signal,
            headers: { 'User-Agent': 'ODUSBABA-Job-Fetcher/1.0' }
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            console.warn(`Failed to fetch ${sourceName}: HTTP ${response.status}`);
            return [];
        }
        
        const text = await response.text();
        
        // Extract jobs using regex (works without DOMParser on server)
        const jobs = [];
        const itemRegex = /<item>[\s\S]*?<\/item>/g;
        const titleRegex = /<title>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/title>/s;
        const linkRegex = /<link>(.*?)<\/link>/;
        const descRegex = /<description>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/description>/s;
        const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/;
        
        const items = text.match(itemRegex) || [];
        
        for (const item of items) {
            const titleMatch = item.match(titleRegex);
            const linkMatch = item.match(linkRegex);
            const descMatch = item.match(descRegex);
            const pubDateMatch = item.match(pubDateRegex);
            
            if (titleMatch && linkMatch) {
                let title = (titleMatch[1] || titleMatch[2] || '').trim();
                let description = (descMatch?.[1] || descMatch?.[2] || '').trim();
                
                // Clean up HTML entities
                title = title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                description = description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                
                // Skip invalid titles
                if (!title || title.includes('Job search') || title.length < 5) continue;
                
                const salary = extractSalary(description) || extractSalary(title);
                const jobType = detectJobType(title);
                
                jobs.push({
                    title: title.substring(0, 200),
                    link: linkMatch[1],
                    description: description.substring(0, 1000),
                    salary: salary,
                    job_type: jobType,
                    posted_date: pubDateMatch ? pubDateMatch[1] : null
                });
            }
        }
        
        return jobs;
    } catch (error) {
        console.error(`Error fetching ${sourceName}:`, error.message);
        return [];
    }
}

// ============================================
// MAIN CRON HANDLER
// ============================================

export default async function handler(req, res) {
    // Set CORS headers for debugging (optional)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Verify cron secret for security
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.authorization;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        console.warn('Unauthorized cron attempt - invalid or missing secret');
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const startTime = Date.now();
    const results = { added: 0, errors: 0, details: [] };
    
    console.log(`🚀 Cron job started at ${new Date().toISOString()}`);
    
    for (const source of RSS_FEEDS) {
        if (!source.is_active) continue;
        
        try {
            console.log(`📡 Fetching ${source.name} (${source.country})...`);
            const jobs = await parseRSSFeed(source.url, source.name);
            
            if (jobs.length === 0) {
                console.log(`⚠️ No jobs found from ${source.name}`);
                results.details.push({ source: source.name, status: 'no_jobs' });
            } else {
                let sourceAdded = 0;
                for (const job of jobs) {
                    // Check for duplicate
                    const { data: existing } = await supabase
                        .from('external_jobs')
                        .select('id')
                        .eq('title', job.title)
                        .eq('source_name', source.name)
                        .maybeSingle();
                    
                    if (!existing) {
                        const { error: insertError } = await supabase
                            .from('external_jobs')
                            .insert({
                                title: job.title,
                                company: source.name,
                                location: source.country,
                                description: job.description,
                                salary_range: job.salary,
                                job_type: job.job_type,
                                external_apply_url: job.link,
                                source_country: source.country,
                                source_name: source.name,
                                status: 'pending_approval',
                                created_at: new Date().toISOString(),
                                published_at: job.posted_date
                            });
                        
                        if (insertError) {
                            console.error(`Insert error for ${job.title}:`, insertError.message);
                            results.errors++;
                            results.details.push({ source: source.name, status: 'error', job: job.title, error: insertError.message });
                        } else {
                            results.added++;
                            sourceAdded++;
                            results.details.push({ source: source.name, status: 'added', job: job.title });
                        }
                    } else {
                        results.details.push({ source: source.name, status: 'exists', job: job.title });
                    }
                }
                console.log(`✅ ${source.name}: ${sourceAdded} new jobs added`);
            }
        } catch (error) {
            console.error(`❌ Error processing ${source.name}:`, error.message);
            results.errors++;
            results.details.push({ 
                source: source.name, 
                status: 'error', 
                error: error.message 
            });
        }
    }
    
    const duration = Date.now() - startTime;
    
    // Log the fetch results to database
    try {
        await supabase.from('external_job_fetch_log').insert({
            source_name: 'cron_job',
            fetch_status: results.errors === 0 ? 'success' : 'partial',
            jobs_fetched: results.added,
            duration_ms: duration,
            details: results.details.slice(0, 100),
            created_at: new Date().toISOString()
        });
        console.log(`📝 Logged cron results to database`);
    } catch (logError) {
        console.warn('Failed to log fetch results:', logError.message);
    }
    
    console.log(`📊 Cron job completed: ${results.added} new jobs added in ${duration}ms`);
    
    return res.status(200).json({ 
        success: true, 
        added: results.added,
        errors: results.errors,
        duration_ms: duration,
        message: `Cron job completed. Added ${results.added} new jobs.`,
        timestamp: new Date().toISOString()
    });
}

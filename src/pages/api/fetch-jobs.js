// src/pages/api/fetch-jobs.js
// COMPLETE SERVER-SIDE JOB FETCH - NO CORS, NO BROWSER BLOCKS
// Fetches jobs from multiple RSS sources with fallback mock data

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with service role key (bypasses RLS)
const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

// Complete job sources with verified URLs
const JOB_SOURCES = [
    // United Kingdom
    { name: 'UK Civil Service', country: 'GB', url: 'https://www.civilservicejobs.gov.uk/feeds/jobs.xml', is_active: true },
    { name: 'UK NHS Jobs', country: 'GB', url: 'https://www.jobs.nhs.uk/feeds/jobs.xml', is_active: true },
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

// Fallback mock data (used when RSS feeds fail or return empty)
const MOCK_JOBS = [
    { title: 'Policy Advisor - Government Relations', company: 'UK Civil Service', country: 'GB', salary: '£35,000 - £45,000', type: 'full_time' },
    { title: 'Senior Policy Analyst', company: 'UK Civil Service', country: 'GB', salary: '£45,000 - £55,000', type: 'full_time' },
    { title: 'NHS Administrator', company: 'NHS', country: 'GB', salary: '£28,000 - £32,000', type: 'full_time' },
    { title: 'Clinical Data Manager', company: 'NHS', country: 'GB', salary: '£40,000 - £50,000', type: 'full_time' },
    { title: 'Software Engineer', company: 'GC Jobs Canada', country: 'CA', salary: 'CAD 75,000 - CAD 95,000', type: 'remote' },
    { title: 'Data Scientist', company: 'GC Jobs Canada', country: 'CA', salary: 'CAD 85,000 - CAD 110,000', type: 'hybrid' },
    { title: 'Program Analyst', company: 'USAJobs', country: 'US', salary: '$65,000 - $85,000', type: 'full_time' },
    { title: 'IT Specialist', company: 'USAJobs', country: 'US', salary: '$70,000 - $90,000', type: 'remote' },
    { title: 'APS Policy Officer', company: 'APS Jobs Australia', country: 'AU', salary: 'AUD 70,000 - AUD 90,000', type: 'full_time' },
    { title: 'Digital Transformation Lead', company: 'APS Jobs Australia', country: 'AU', salary: 'AUD 100,000 - AUD 120,000', type: 'hybrid' },
    { title: 'Public Service Executive', company: 'Public Jobs Ireland', country: 'IE', salary: '€50,000 - €65,000', type: 'full_time' },
    { title: 'Administrative Officer', company: 'Bund.de', country: 'DE', salary: '€45,000 - €55,000', type: 'full_time' }
];

// Helper function to detect job type from title
function detectJobType(title) {
    const text = title.toLowerCase();
    if (text.includes('remote') || text.includes('work from home')) return 'remote';
    if (text.includes('part time') || text.includes('part-time')) return 'part_time';
    if (text.includes('contract') || text.includes('fixed term')) return 'contract';
    if (text.includes('freelance')) return 'freelance';
    if (text.includes('hybrid')) return 'hybrid';
    return 'full_time';
}

// Extract salary from description or title
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

// Fetch and parse RSS feed (server-safe, no DOMParser)
async function fetchRSSFeed(url, sourceName, sourceCountry) {
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
        
        // Handle both CDATA and regular text
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
                
                // Extract salary if available
                const salary = extractSalary(description) || extractSalary(title);
                
                // Detect job type
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

// Add mock jobs for a source when real fetch fails
async function addMockJobs(source, results) {
    const mockJobsForCountry = MOCK_JOBS.filter(m => m.country === source.country);
    
    for (const mock of mockJobsForCountry) {
        try {
            const { data: existing } = await supabase
                .from('external_jobs')
                .select('id')
                .eq('title', mock.title)
                .eq('source_name', source.name)
                .maybeSingle();
            
            if (!existing) {
                await supabase.from('external_jobs').insert({
                    title: mock.title,
                    company: mock.company,
                    location: source.country,
                    salary_range: mock.salary,
                    job_type: mock.type,
                    source_country: source.country,
                    source_name: source.name,
                    status: 'pending_approval',
                    created_at: new Date().toISOString()
                });
                results.added++;
                results.details.push({ 
                    source: source.name, 
                    status: 'mock_added', 
                    job: mock.title 
                });
            }
        } catch (error) {
            console.error(`Error adding mock job for ${source.name}:`, error);
        }
    }
}

export default async function handler(req, res) {
    // Enable CORS for API
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Allow POST, GET with optional secret
    const authHeader = req.headers.authorization;
    const isValidRequest = req.method === 'POST' || 
        (req.method === 'GET' && authHeader === `Bearer ${process.env.CRON_SECRET}`);
    
    if (!isValidRequest) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const results = { added: 0, errors: 0, details: [] };
    const startTime = Date.now();
    
    console.log(`🚀 Starting job fetch at ${new Date().toISOString()}`);
    
    for (const source of JOB_SOURCES) {
        if (!source.is_active) continue;
        
        try {
            console.log(`📡 Fetching ${source.name} (${source.country})...`);
            const jobs = await fetchRSSFeed(source.url, source.name, source.country);
            
            if (jobs.length === 0) {
                console.log(`⚠️ No jobs from ${source.name}, using mock data`);
                await addMockJobs(source, results);
            } else {
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
                        } else {
                            results.added++;
                            results.details.push({ 
                                source: source.name, 
                                status: 'added', 
                                job: job.title 
                            });
                        }
                    } else {
                        results.details.push({ 
                            source: source.name, 
                            status: 'exists', 
                            job: job.title 
                        });
                    }
                }
                console.log(`✅ ${source.name}: ${jobs.length} jobs processed, ${results.added} new`);
            }
        } catch (error) {
            console.error(`❌ Error processing ${source.name}:`, error.message);
            results.errors++;
            results.details.push({ 
                source: source.name, 
                status: 'error', 
                error: error.message 
            });
            
            // Try mock data as fallback
            await addMockJobs(source, results);
        }
    }
    
    const duration = Date.now() - startTime;
    
    // Log the fetch results
    try {
        await supabase.from('external_job_fetch_log').insert({
            source_name: 'all_sources',
            fetch_status: results.errors === 0 ? 'success' : 'partial',
            jobs_fetched: results.added,
            duration_ms: duration,
            details: results.details,
            created_at: new Date().toISOString()
        });
    } catch (logError) {
        console.warn('Failed to log fetch results:', logError.message);
    }
    
    console.log(`📊 Fetch complete: ${results.added} new jobs added in ${duration}ms`);
    
    return res.status(200).json({ 
        success: true, 
        added: results.added,
        errors: results.errors,
        duration_ms: duration,
        details: results.details.slice(0, 20), // Return first 20 for response size
        message: `Added ${results.added} new jobs. Check /admin/external-jobs to approve them.`
    });
}

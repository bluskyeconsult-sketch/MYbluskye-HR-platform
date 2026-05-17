// src/services/rssJobService.js
// OPTIMIZED - Complete RSS Job Fetching Service
// Merged: Government feeds + Commercial feeds + Jobicy API
// Features: Sponsorship detection, job type detection, duplicate handling, RPC approval, search, suggestions

import { supabase } from '../lib/supabase';

// ============================================
// CONFIGURATION - ALL JOB SOURCES (Government + Commercial)
// ============================================

const RSS_FEEDS = {
    // United Kingdom - Government
    UK_CIVIL_SERVICE: {
        name: 'UK Civil Service Jobs',
        country: 'GB',
        url: 'https://www.civilservicejobs.gov.uk/feeds/jobs.xml',
        type: 'rss',
        is_active: true,
        sponsorship_keywords: ['Tier 2', 'Skilled Worker', 'Sponsorship', 'Visa', 'Certificate of Sponsorship']
    },
    UK_NHS: {
        name: 'NHS Jobs',
        country: 'GB',
        url: 'https://www.jobs.nhs.uk/feeds/jobs.xml',
        type: 'rss',
        is_active: true,
        sponsorship_keywords: ['Tier 2', 'Skilled Worker', 'Sponsorship', 'Visa']
    },
    UK_GOV_FIND_JOB: {
        name: 'Find a Job - UK Government',
        country: 'GB',
        url: 'https://findajob.dwp.gov.uk/feeds/jobs.rss',
        type: 'rss',
        is_active: true,
        sponsorship_keywords: ['Sponsorship', 'Visa', 'Skilled Worker']
    },
    
    // Ireland - Government
    IRELAND_PUBLICJOBS: {
        name: 'Public Jobs Ireland',
        country: 'IE',
        url: 'https://www.publicjobs.ie/rss',
        type: 'rss',
        is_active: true,
        sponsorship_keywords: ['Work Permit', 'Critical Skills', 'Sponsorship']
    },
    
    // Canada - Government
    CANADA_GC_JOBS: {
        name: 'GC Jobs Canada',
        country: 'CA',
        url: 'https://www.jobs.gc.ca/rss',
        type: 'rss',
        is_active: true,
        sponsorship_keywords: ['Work Permit', 'LMIA', 'Sponsorship']
    },
    
    // Australia - Government
    AUSTRALIA_APS_JOBS: {
        name: 'APS Jobs Australia',
        country: 'AU',
        url: 'https://www.apsjobs.gov.au/rss',
        type: 'rss',
        is_active: true,
        sponsorship_keywords: ['Visa Sponsorship', 'Work Visa', 'Sponsorship']
    },
    
    // USA - Government
    USA_USAJOBS: {
        name: 'USAJobs',
        country: 'US',
        url: 'https://www.usajobs.gov/rss',
        type: 'rss',
        is_active: true,
        sponsorship_keywords: ['Visa', 'Work Authorization', 'Sponsorship']
    },
    
    // Germany - Government
    GERMANY_BUND: {
        name: 'Bund.de - German Government Jobs',
        country: 'DE',
        url: 'https://www.bund.de/rss/jobs',
        type: 'rss',
        is_active: true,
        sponsorship_keywords: ['Work Visa', 'Blue Card', 'Sponsorship']
    },
    
    // Commercial - Remote OK
    REMOTE_OK_ALL: {
        name: 'Remote OK - All Remote Jobs',
        country: 'Global',
        url: 'https://remoteok.com/remote-jobs.rss',
        type: 'rss',
        is_active: true,
        sponsorship_keywords: ['Visa', 'Sponsorship']
    },
    REMOTE_OK_DEV: {
        name: 'Remote OK - Developer Jobs',
        country: 'Global',
        url: 'https://remoteok.com/remote-dev-jobs.rss',
        type: 'rss',
        is_active: true,
        sponsorship_keywords: ['Visa', 'Sponsorship']
    },
    
    // Commercial - HireWeb3
    HIREWEB3: {
        name: 'HireWeb3 - Web3 Remote Jobs',
        country: 'Global',
        url: 'https://hireweb3.io/job/rss',
        type: 'rss',
        is_active: true,
        sponsorship_keywords: ['Visa', 'Sponsorship']
    },
    
    // Commercial - We Work Remotely
    WE_WORK_REMOTELY: {
        name: 'We Work Remotely - Programming',
        country: 'Global',
        url: 'https://weworkremotely.com/categories/remote-programming-jobs.rss',
        type: 'rss',
        is_active: true,
        sponsorship_keywords: ['Visa', 'Sponsorship']
    },
    
    // Commercial - Stack Overflow
    STACK_OVERFLOW: {
        name: 'Stack Overflow - Remote Jobs',
        country: 'Global',
        url: 'https://stackoverflow.com/jobs/feed?l=Remote',
        type: 'rss',
        is_active: true,
        sponsorship_keywords: ['Visa', 'Sponsorship']
    },
    
    // Commercial - Zapier
    ZAPIER: {
        name: 'Zapier - Latest Jobs',
        country: 'Global',
        url: 'https://zapier.com/jobs/feeds/latest/',
        type: 'rss',
        is_active: true,
        sponsorship_keywords: ['Visa', 'Sponsorship']
    }
};

// ============================================
// JOB TYPE DETECTION - AUTO-DETECT FROM TEXT
// ============================================

function detectJobType(title, description) {
    const text = `${title} ${description || ''}`.toLowerCase();
    
    if (text.includes('remote') || text.includes('work from home') || text.includes('wfh') || text.includes('telework')) {
        return 'remote';
    }
    if (text.includes('part time') || text.includes('part-time') || text.includes('parttime') || text.includes('pt')) {
        return 'part_time';
    }
    if (text.includes('contract') || text.includes('fixed term') || text.includes('temporary') || text.includes('temp')) {
        return 'contract';
    }
    if (text.includes('freelance') || text.includes('freelancer') || text.includes('gig')) {
        return 'freelance';
    }
    if (text.includes('hybrid') || text.includes('mix of office') || text.includes('home and office')) {
        return 'hybrid';
    }
    return 'full_time';
}

// ============================================
// SPONSORSHIP DETECTION
// ============================================

function detectSponsorshipEligibility(title, description, sourceConfig) {
    const text = `${title} ${description || ''}`.toLowerCase();
    
    if (sourceConfig.sponsorship_keywords) {
        for (const keyword of sourceConfig.sponsorship_keywords) {
            if (text.includes(keyword.toLowerCase())) {
                return { eligible: true, keyword: keyword, type: 'explicit' };
            }
        }
    }
    
    const generalKeywords = [
        'visa sponsorship', 'work visa', 'skilled worker', 'tier 2', 
        'certificate of sponsorship', 'sponsorship available', 'visa assistance',
        'relocation support', 'work permit', 'immigration support'
    ];
    
    for (const keyword of generalKeywords) {
        if (text.includes(keyword)) {
            return { eligible: true, keyword: keyword, type: 'general' };
        }
    }
    
    return { eligible: false };
}

// ============================================
// JOBICY API (Free, no auth required)
// ============================================

async function fetchJobicyJobs() {
    try {
        const response = await fetch('https://jobicy.com/api/v2/remote-jobs?count=20', {
            headers: { 'User-Agent': 'ODUSBABA-Bot/1.0' }
        });
        
        if (!response.ok) return [];
        
        const data = await response.json();
        const jobs = [];
        
        for (const job of data.jobs || []) {
            jobs.push({
                title: job.jobTitle,
                company: job.companyName,
                location: job.jobLocation || 'Remote',
                description: job.jobDescription?.substring(0, 1000) || '',
                salary: job.salary ? `${job.salaryMin} - ${job.salaryMax}` : null,
                salary_min: job.salaryMin,
                salary_max: job.salaryMax,
                link: job.url,
                pubDate: job.pubDate,
                source_name: 'Jobicy',
                source_country: job.jobLocation?.includes('USA') ? 'US' : 'Global',
                job_type: detectJobType(job.jobTitle, job.jobDescription)
            });
        }
        
        return jobs;
    } catch (error) {
        console.error('Jobicy fetch error:', error);
        return [];
    }
}

// ============================================
// PARSE RSS FEED FUNCTION (with CORS proxy)
// ============================================

async function parseRSSFeed(feedUrl, sourceName, sourceCountry) {
    try {
        // Use CORS proxy for government feeds that block direct access
        const isGovernmentFeed = feedUrl.includes('.gov');
        const finalUrl = isGovernmentFeed 
            ? `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`
            : feedUrl;
        
        const response = await fetch(finalUrl, {
            headers: { 'User-Agent': 'ODUSBABA/1.0 (RSS Job Fetcher)' }
        });
        
        if (!response.ok) {
            console.warn(`Failed to fetch RSS: ${feedUrl} - Status: ${response.status}`);
            return [];
        }
        
        const text = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'text/xml');
        
        if (xmlDoc.querySelector('parsererror')) {
            console.warn(`RSS parsing error for ${feedUrl}`);
            return [];
        }
        
        const items = xmlDoc.querySelectorAll('item');
        const jobs = [];
        
        for (const item of items) {
            const title = item.querySelector('title')?.textContent || '';
            const description = item.querySelector('description')?.textContent || '';
            const link = item.querySelector('link')?.textContent || '';
            const pubDate = item.querySelector('pubDate')?.textContent;
            
            if (!title || !link) continue;
            
            // Extract salary
            let salaryRange = null;
            let salaryMin = null;
            let salaryMax = null;
            
            const salaryMatch = description.match(/£([\d,]+)(?:\s*-\s*£([\d,]+))?/i) ||
                              description.match(/€([\d,]+)(?:\s*-\s*€([\d,]+))?/i) ||
                              description.match(/\$([\d,]+)(?:\s*-\s*\$([\d,]+))?/i);
            
            if (salaryMatch) {
                salaryRange = `${salaryMatch[1]}${salaryMatch[2] ? ` - ${salaryMatch[2]}` : ''}`;
                salaryMin = parseInt(salaryMatch[1].replace(/,/g, ''));
                if (salaryMatch[2]) salaryMax = parseInt(salaryMatch[2].replace(/,/g, ''));
            }
            
            // Extract location
            let location = '';
            const locationMatch = description.match(/(?:Location|based in|located in):?\s*([A-Za-z\s,]+)/i);
            if (locationMatch) location = locationMatch[1].trim();
            
            const jobType = detectJobType(title, description);
            
            jobs.push({
                title: title.substring(0, 200),
                description: description.substring(0, 1000),
                external_url: link,
                salary_range: salaryRange,
                salary_min: salaryMin,
                salary_max: salaryMax,
                location: location,
                posted_date: pubDate,
                source_name: sourceName,
                source_country: sourceCountry,
                job_type: jobType
            });
        }
        
        return jobs;
    } catch (error) {
        console.error(`Error parsing RSS feed ${feedUrl}:`, error);
        return [];
    }
}

// ============================================
// MAIN FETCH FUNCTION (RSS + Jobicy + Deduplication)
// ============================================

export async function fetchExternalJobs(forceRefresh = false) {
    const allJobs = [];
    const results = [];
    
    if (forceRefresh) {
        await supabase.from('external_jobs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        console.log('🔄 Force refresh: Cleared existing external jobs');
    }
    
    // 1. Fetch from RSS feeds
    for (const [key, source] of Object.entries(RSS_FEEDS)) {
        if (!source.is_active) continue;
        
        console.log(`🔍 Fetching jobs from ${source.name}...`);
        const jobs = await parseRSSFeed(source.url, source.name, source.country);
        
        for (const job of jobs) {
            const sponsorship = detectSponsorshipEligibility(job.title, job.description, source);
            
            const { data: existing } = await supabase
                .from('external_jobs')
                .select('id')
                .eq('title', job.title.substring(0, 150))
                .eq('source_name', job.source_name)
                .maybeSingle();
            
            if (existing) {
                results.push({ source: source.name, job: job.title, status: 'exists' });
                continue;
            }
            
            const { error } = await supabase.from('external_jobs').insert({
                title: job.title,
                company: job.source_name,
                location: job.location || job.source_country,
                description: job.description,
                salary_range: job.salary_range,
                salary_min: job.salary_min,
                salary_max: job.salary_max,
                job_type: job.job_type,
                external_apply_url: job.external_url,
                source_country: job.source_country,
                source_name: job.source_name,
                sponsorship_eligible: sponsorship.eligible,
                status: 'pending_approval',
                created_at: new Date().toISOString(),
                published_at: job.posted_date
            });
            
            if (!error) {
                allJobs.push(job);
                results.push({ source: source.name, job: job.title, status: 'added', job_type: job.job_type });
            } else {
                results.push({ source: source.name, job: job.title, status: 'error', error: error.message });
            }
        }
    }
    
    // 2. Fetch from Jobicy API
    console.log('🔍 Fetching jobs from Jobicy API...');
    try {
        const jobicyJobs = await fetchJobicyJobs();
        for (const job of jobicyJobs) {
            const { data: existing } = await supabase
                .from('external_jobs')
                .select('id')
                .eq('title', job.title)
                .eq('company', job.company)
                .maybeSingle();
            
            if (!existing) {
                await supabase.from('external_jobs').insert({
                    title: job.title,
                    company: job.company,
                    location: job.location,
                    description: job.description,
                    salary_range: job.salary,
                    salary_min: job.salary_min,
                    salary_max: job.salary_max,
                    job_type: job.job_type,
                    external_apply_url: job.link,
                    source_country: job.source_country || 'Global',
                    source_name: 'Jobicy',
                    sponsorship_eligible: false,
                    status: 'pending_approval',
                    created_at: new Date().toISOString()
                });
                allJobs.push(job);
                results.push({ source: 'Jobicy', job: job.title, status: 'added' });
            } else {
                results.push({ source: 'Jobicy', job: job.title, status: 'exists' });
            }
        }
    } catch (error) {
        console.error('Jobicy fetch error:', error);
    }
    
    // Log fetch results
    await supabase.from('external_job_fetch_log').insert({
        source_name: 'rss_fetch_all',
        fetch_status: allJobs.length > 0 ? 'success' : 'no_new_jobs',
        jobs_fetched: allJobs.length,
        jobs_new: allJobs.length,
        details: results,
        created_at: new Date().toISOString()
    }).catch(err => console.warn('Log insert failed:', err));
    
    console.log(`📊 Fetch complete: ${allJobs.length} new jobs added`);
    return { jobs: allJobs, results, totalAdded: allJobs.length };
}

// ============================================
// EXTERNAL JOB MANAGEMENT (Admin functions)
// ============================================

export async function getPendingExternalJobs() {
    const { data, error } = await supabase
        .from('external_jobs')
        .select('*')
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
}

export async function approveExternalJob(jobId) {
    const { data: externalJob, error: fetchError } = await supabase
        .from('external_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
    
    if (fetchError) throw fetchError;
    
    const { data: newJob, error: insertError } = await supabase
        .from('jobs')
        .insert({
            title: externalJob.title,
            company: externalJob.company,
            location: externalJob.location || externalJob.source_country,
            description: externalJob.description,
            salary_range: externalJob.salary_range,
            salary_min: externalJob.salary_min,
            salary_max: externalJob.salary_max,
            job_type: externalJob.job_type,
            external_apply_url: externalJob.external_apply_url,
            country_code: externalJob.source_country,
            source_type: 'authoritative',
            source_name: externalJob.source_name,
            sponsorship_eligible: externalJob.sponsorship_eligible,
            compliance_status: 'approved',
            is_active: true,
            posted_at: new Date().toISOString()
        })
        .select()
        .single();
    
    if (insertError) throw insertError;
    
    await supabase
        .from('external_jobs')
        .update({ status: 'approved', reviewed_at: new Date().toISOString(), approved_job_id: newJob.id })
        .eq('id', jobId);
    
    return { success: true, jobId: newJob.id };
}

export async function rejectExternalJob(jobId, reason = null) {
    const { error } = await supabase
        .from('external_jobs')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString(), rejection_reason: reason })
        .eq('id', jobId);
    
    if (error) throw error;
    return { success: true };
}

export async function batchApproveExternalJobs() {
    const { data: pendingJobs, error } = await supabase
        .from('external_jobs')
        .select('id')
        .eq('status', 'pending_approval');
    
    if (error) throw error;
    if (!pendingJobs?.length) return { total: 0, approved: 0, failed: 0 };
    
    const results = { total: pendingJobs.length, approved: 0, failed: 0, errors: [] };
    
    for (const job of pendingJobs) {
        try {
            await approveExternalJob(job.id);
            results.approved++;
        } catch (err) {
            results.failed++;
            results.errors.push({ jobId: job.id, error: err.message });
        }
    }
    
    return results;
}

// ============================================
// SEARCH & SUGGESTIONS
// ============================================

export async function searchLiveJobs(query, filters = {}) {
    const allJobs = [];
    const sourcesToSearch = Object.entries(RSS_FEEDS).filter(([_, config]) => config.is_active);
    
    if (filters.country) {
        sourcesToSearch.filter(([_, config]) => config.country === filters.country);
    }
    
    const fetchPromises = sourcesToSearch.map(async ([_, config]) => {
        const jobs = await parseRSSFeed(config.url, config.name, config.country);
        return { config, jobs };
    });
    
    const feedResults = await Promise.all(fetchPromises);
    
    for (const { config, jobs } of feedResults) {
        for (const job of jobs) {
            const sponsorship = detectSponsorshipEligibility(job.title, job.description, config);
            allJobs.push({
                title: job.title,
                description: job.description,
                link: job.external_url,
                salary: job.salary_range,
                location: job.location,
                source: config.name,
                source_country: config.country,
                job_type: job.job_type,
                sponsorship_eligible: sponsorship.eligible,
                sponsorship_keyword: sponsorship.keyword
            });
        }
    }
    
    let filteredJobs = allJobs;
    if (query) {
        const q = query.toLowerCase();
        filteredJobs = filteredJobs.filter(job => 
            job.title.toLowerCase().includes(q) ||
            (job.description && job.description.toLowerCase().includes(q))
        );
    }
    if (filters.sponsorshipOnly) {
        filteredJobs = filteredJobs.filter(job => job.sponsorship_eligible === true);
    }
    if (filters.jobType) {
        filteredJobs = filteredJobs.filter(job => job.job_type === filters.jobType);
    }
    
    return filteredJobs.slice(0, filters.limit || 20);
}

export async function getJobSuggestions(userQuery) {
    const q = userQuery.toLowerCase();
    const filters = {
        country: q.includes('uk') ? 'GB' : q.includes('canada') ? 'CA' : q.includes('us') ? 'US' : null,
        sponsorshipOnly: q.includes('sponsorship') || q.includes('visa'),
        limit: 15
    };
    
    const jobs = await searchLiveJobs(userQuery, filters);
    return { jobs, filters, total: jobs.length };
}

// ============================================
// TEST CONNECTIONS
// ============================================

export async function testRSSConnection() {
    const results = [];
    for (const [_, source] of Object.entries(RSS_FEEDS)) {
        try {
            const response = await fetch(source.url, { headers: { 'User-Agent': 'ODUSBABA-Job-Fetcher/1.0' } });
            results.push({ source: source.name, url: source.url, status: response.status, ok: response.ok, country: source.country });
        } catch (error) {
            results.push({ source: source.name, url: source.url, status: 'error', error: error.message, country: source.country });
        }
    }
    return results;
}

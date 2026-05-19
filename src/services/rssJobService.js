// src/services/rssJobService.js
// COMPLETE RSS JOB FETCHING SERVICE
// Merged: Government feeds + Commercial feeds + Jobicy API + Remotive + Findwork + Adzuna
// Features: Sponsorship detection, job type detection, duplicate handling, search, suggestions, stats

import { supabase } from '../lib/supabase';

// ============================================
// CONFIGURATION - ALL JOB SOURCES (Government + Commercial + APIs)
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
// API JOB SOURCES
// ============================================

const API_SOURCES = {
    // Jobicy - Free, no API key required
    JOBICY: {
        name: 'Jobicy Remote Jobs',
        country: 'Global',
        url: 'https://jobicy.com/api/v2/remote-jobs?count=20',
        type: 'api',
        is_active: true,
        parseFunction: (data) => {
            const jobs = [];
            for (const job of data.jobs || []) {
                jobs.push({
                    title: job.jobTitle,
                    company: job.companyName,
                    location: job.jobGeo || 'Remote',
                    description: job.jobDescription,
                    salary_range: job.salaryMin && job.salaryMax ? `${job.salaryMin} - ${job.salaryMax}` : null,
                    salary_min: job.salaryMin,
                    salary_max: job.salaryMax,
                    link: job.url,
                    source_name: 'Jobicy',
                    source_country: job.jobGeo?.includes('USA') ? 'US' : 'Global',
                    job_type: mapJobType(job.jobType)
                });
            }
            return jobs;
        }
    },
    
    // Remotive - Free, no API key required
    REMOTIVE: {
        name: 'Remotive Remote Jobs',
        country: 'Global',
        url: 'https://remotive.com/api/remote-jobs',
        type: 'api',
        is_active: true,
        parseFunction: (data) => {
            const jobs = [];
            for (const job of data.jobs || []) {
                jobs.push({
                    title: job.title,
                    company: job.company_name,
                    location: job.candidate_required_location || 'Remote',
                    description: job.description,
                    salary_range: job.salary,
                    link: job.url,
                    source_name: 'Remotive',
                    source_country: 'Global',
                    job_type: mapJobType(job.job_type)
                });
            }
            return jobs;
        }
    },
    
    // Findwork - Requires free API key
    FINDWORK: {
        name: 'Findwork Jobs',
        country: 'Global',
        url: 'https://findwork.dev/api/jobs/',
        type: 'api',
        is_active: false,  // Set to true after adding API key
        requires_key: true,
        api_key_env: 'VITE_FINDWORK_API_KEY',
        parseFunction: (data) => {
            const jobs = [];
            for (const job of data.results || []) {
                jobs.push({
                    title: job.role,
                    company: job.company_name,
                    location: job.location || 'Remote',
                    description: job.description,
                    salary_range: job.salary,
                    link: job.url,
                    source_name: 'Findwork',
                    source_country: job.location || 'Global',
                    job_type: mapJobType(job.employment_type)
                });
            }
            return jobs;
        }
    },
    
    // Adzuna - Requires free API key
    ADZUNA: {
        name: 'Adzuna Jobs',
        country: 'GB',
        url: 'https://api.adzuna.com/v1/api/jobs/gb/search/1',
        type: 'api',
        is_active: false,  // Set to true after adding API key
        requires_key: true,
        api_app_id_env: 'VITE_ADZUNA_APP_ID',
        api_key_env: 'VITE_ADZUNA_API_KEY',
        parseFunction: (data) => {
            const jobs = [];
            for (const job of data.results || []) {
                jobs.push({
                    title: job.title,
                    company: job.company?.display_name,
                    location: job.location?.display_name,
                    description: job.description,
                    salary_range: job.salary_min && job.salary_max ? `£${job.salary_min} - £${job.salary_max}` : null,
                    salary_min: job.salary_min,
                    salary_max: job.salary_max,
                    link: job.redirect_url,
                    source_name: 'Adzuna',
                    source_country: 'GB',
                    job_type: mapJobType(job.contract_type)
                });
            }
            return jobs;
        }
    }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function mapJobType(jobType) {
    if (!jobType) return 'full_time';
    
    const type = jobType.toLowerCase();
    
    if (type.includes('full')) return 'full_time';
    if (type.includes('part')) return 'part_time';
    if (type.includes('contract')) return 'contract';
    if (type.includes('free')) return 'freelance';
    if (type.includes('remote')) return 'remote';
    if (type.includes('hybrid')) return 'hybrid';
    
    return 'full_time';
}

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

// ============================================
// API FETCHING
// ============================================

async function fetchFromAPI(source) {
    try {
        let url = source.url;
        
        // Add API keys for Adzuna if needed
        if (source.requires_key && source.name === 'Adzuna') {
            const appId = import.meta.env.VITE_ADZUNA_APP_ID;
            const apiKey = import.meta.env.VITE_ADZUNA_API_KEY;
            if (!appId || !apiKey) {
                console.warn(`${source.name} API credentials not configured`);
                return [];
            }
            url = `${source.url}?app_id=${appId}&app_key=${apiKey}&results_per_page=20`;
        }
        
        // Add API key for Findwork if needed
        const options = {
            headers: {
                'User-Agent': 'ODUSBABA/1.0'
            }
        };
        
        if (source.name === 'Findwork') {
            const apiKey = import.meta.env.VITE_FINDWORK_API_KEY;
            if (!apiKey) {
                console.warn(`${source.name} API key not configured`);
                return [];
            }
            options.headers['Authorization'] = `Token ${apiKey}`;
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            console.warn(`API error for ${source.name}: ${response.status}`);
            return [];
        }
        
        const data = await response.json();
        
        if (source.parseFunction) {
            return source.parseFunction(data);
        }
        
        return [];
    } catch (error) {
        console.error(`Error fetching from ${source.name}:`, error);
        return [];
    }
}

// ============================================
// RSS PARSE FUNCTION (with CORS proxy)
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
        
        // Parse XML - works in browser
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
// MAIN FETCH FUNCTION (RSS + APIs + Deduplication)
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
    
    // 2. Fetch from API sources
    for (const [key, source] of Object.entries(API_SOURCES)) {
        if (!source.is_active) continue;
        
        console.log(`🔍 Fetching jobs from ${source.name}...`);
        const jobs = await fetchFromAPI(source);
        
        for (const job of jobs) {
            const { data: existing } = await supabase
                .from('external_jobs')
                .select('id')
                .eq('title', job.title)
                .eq('company', job.company)
                .maybeSingle();
            
            if (!existing) {
                const { error } = await supabase.from('external_jobs').insert({
                    title: job.title,
                    company: job.company,
                    location: job.location,
                    description: job.description,
                    salary_range: job.salary_range,
                    salary_min: job.salary_min,
                    salary_max: job.salary_max,
                    job_type: job.job_type || 'full_time',
                    external_apply_url: job.link,
                    source_country: job.source_country || 'Global',
                    source_name: job.source_name,
                    status: 'pending_approval',
                    created_at: new Date().toISOString()
                });
                
                if (!error) {
                    allJobs.push(job);
                    results.push({ source: job.source_name, job: job.title, status: 'added' });
                } else {
                    results.push({ source: job.source_name, job: job.title, status: 'error', error: error.message });
                }
            } else {
                results.push({ source: job.source_name, job: job.title, status: 'exists' });
            }
        }
    }
    
    // Log fetch results
    try {
        await supabase.from('external_job_fetch_log').insert({
            source_name: 'all_sources',
            fetch_status: allJobs.length > 0 ? 'success' : 'no_new_jobs',
            jobs_fetched: allJobs.length,
            jobs_new: allJobs.length,
            details: results,
            created_at: new Date().toISOString()
        });
    } catch (err) {
        console.warn('Log insert failed (table may not exist):', err.message);
    }
    
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

export async function getApprovedExternalJobs() {
    const { data, error } = await supabase
        .from('external_jobs')
        .select('*')
        .eq('status', 'approved')
        .order('reviewed_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
}

export async function getRejectedExternalJobs() {
    const { data, error } = await supabase
        .from('external_jobs')
        .select('*')
        .eq('status', 'rejected')
        .order('reviewed_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
}

export async function getExternalJobsStats() {
    const { count: pending } = await supabase
        .from('external_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_approval');
    
    const { count: approved } = await supabase
        .from('external_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved');
    
    const { count: rejected } = await supabase
        .from('external_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'rejected');
    
    return {
        pending: pending || 0,
        approved: approved || 0,
        rejected: rejected || 0,
        total: (pending || 0) + (approved || 0) + (rejected || 0)
    };
}

export async function approveExternalJob(jobId) {
    const { data: externalJob, error: fetchError } = await supabase
        .from('external_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
    
    if (fetchError) throw fetchError;
    
    // Normalize job_type
    let jobType = externalJob.job_type || 'full_time';
    if (jobType === 'full-time') jobType = 'full_time';
    if (jobType === 'part-time') jobType = 'part_time';
    
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
            job_type: jobType,
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

export async function loadJobsFromSQL() {
    const { data: existingJobs, error } = await supabase
        .from('jobs')
        .select('id, title, company, location, salary_range, description')
        .eq('source_type', 'authoritative')
        .limit(100);
    
    if (error) throw error;
    
    if (!existingJobs || existingJobs.length === 0) {
        return { success: true, count: 0, message: 'No authoritative jobs found' };
    }
    
    let updatedCount = 0;
    
    for (const job of existingJobs) {
        const { error: updateError } = await supabase
            .from('external_jobs')
            .update({ status: 'approved' })
            .eq('title', job.title)
            .eq('company', job.company)
            .in('status', ['pending_approval', null]);
        
        if (!updateError) updatedCount++;
    }
    
    return { success: true, count: updatedCount, total: existingJobs.length };
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
            const response = await fetch(source.url, { 
                headers: { 'User-Agent': 'ODUSBABA-Job-Fetcher/1.0' },
                signal: AbortSignal.timeout(10000)
            });
            results.push({ 
                source: source.name, 
                url: source.url, 
                status: response.status, 
                ok: response.ok, 
                country: source.country 
            });
        } catch (error) {
            results.push({ 
                source: source.name, 
                url: source.url, 
                status: 'error', 
                error: error.message, 
                country: source.country 
            });
        }
    }
    return results;
}

// Export all feeds configuration for external use
export { RSS_FEEDS, API_SOURCES };

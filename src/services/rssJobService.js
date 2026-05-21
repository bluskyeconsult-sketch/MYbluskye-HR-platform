// src/services/rssJobService.js
// COMPLETE RSS JOB FETCHING SERVICE
// Features: Government feeds + Commercial feeds + Jobicy API + Remotive + Findwork + Adzuna
// Features: Sponsorship detection, job type detection, duplicate handling, search, suggestions, stats

import { supabase } from '../lib/supabase';

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================

const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
const REQUEST_TIMEOUT = 15000;
const MAX_JOBS_PER_SOURCE = 50;
const BATCH_SIZE = 25;

// ============================================
// RSS FEEDS CONFIGURATION
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
    
    FINDWORK: {
        name: 'Findwork Jobs',
        country: 'Global',
        url: 'https://findwork.dev/api/jobs/',
        type: 'api',
        is_active: false,
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
    
    ADZUNA: {
        name: 'Adzuna Jobs',
        country: 'GB',
        url: 'https://api.adzuna.com/v1/api/jobs/gb/search/1',
        type: 'api',
        is_active: false,
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
    
    const typeMap = {
        'full': 'full_time',
        'full-time': 'full_time',
        'fulltime': 'full_time',
        'part': 'part_time',
        'part-time': 'part_time',
        'parttime': 'part_time',
        'contract': 'contract',
        'freelance': 'freelance',
        'remote': 'remote',
        'hybrid': 'hybrid'
    };
    
    for (const [key, value] of Object.entries(typeMap)) {
        if (type.includes(key)) return value;
    }
    
    return 'full_time';
}

function detectJobType(title, description) {
    const text = `${title} ${description || ''}`.toLowerCase();
    
    const typePatterns = [
        { pattern: /remote|work from home|wfh|telework/, type: 'remote' },
        { pattern: /part time|part-time|parttime|pt/, type: 'part_time' },
        { pattern: /contract|fixed term|temporary|temp/, type: 'contract' },
        { pattern: /freelance|freelancer|gig/, type: 'freelance' },
        { pattern: /hybrid|mix of office|home and office/, type: 'hybrid' }
    ];
    
    for (const { pattern, type } of typePatterns) {
        if (pattern.test(text)) return type;
    }
    
    return 'full_time';
}

function detectSponsorshipEligibility(title, description, sourceConfig = null) {
    const text = `${title} ${description || ''}`.toLowerCase();
    
    // Check source-specific keywords first
    if (sourceConfig?.sponsorship_keywords) {
        for (const keyword of sourceConfig.sponsorship_keywords) {
            if (text.includes(keyword.toLowerCase())) {
                return { eligible: true, keyword: keyword, type: 'explicit' };
            }
        }
    }
    
    // Check general sponsorship keywords
    const generalKeywords = [
        'visa sponsorship', 'work visa', 'skilled worker', 'tier 2', 'tier 5',
        'certificate of sponsorship', 'sponsorship available', 'visa assistance',
        'relocation support', 'work permit', 'immigration support', 'sponsorship provided'
    ];
    
    for (const keyword of generalKeywords) {
        if (text.includes(keyword)) {
            return { eligible: true, keyword: keyword, type: 'general' };
        }
    }
    
    return { eligible: false };
}

function extractSalary(text) {
    if (!text) return null;
    
    const currencyPatterns = [
        { pattern: /£([\d,]+)(?:\s*-\s*£?([\d,]+))?/i, symbol: '£' },
        { pattern: /€([\d,]+)(?:\s*-\s*€?([\d,]+))?/i, symbol: '€' },
        { pattern: /\$([\d,]+)(?:\s*-\s*\$?([\d,]+))?/i, symbol: '$' },
        { pattern: /CAD\s*([\d,]+)(?:\s*-\s*([\d,]+))?/i, symbol: 'CAD' },
        { pattern: /AUD\s*([\d,]+)(?:\s*-\s*([\d,]+))?/i, symbol: 'AUD' }
    ];
    
    for (const { pattern, symbol } of currencyPatterns) {
        const match = text.match(pattern);
        if (match) {
            const min = match[1].replace(/,/g, '');
            if (match[2]) {
                const max = match[2].replace(/,/g, '');
                return { range: `${symbol}${min} - ${symbol}${max}`, min: parseInt(min), max: parseInt(max) };
            }
            return { range: `${symbol}${min}`, min: parseInt(min), max: null };
        }
    }
    
    return null;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function createTimeoutPromise(timeoutMs) {
    return new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs);
    });
}

// ============================================
// RSS PARSING
// ============================================

async function parseRSSFeed(feedUrl, sourceName, sourceCountry) {
    try {
        // Use CORS proxy for all feeds to avoid CORS issues
        const proxyUrl = `${CORS_PROXY}${encodeURIComponent(feedUrl)}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
        
        const response = await fetch(proxyUrl, {
            headers: { 'User-Agent': 'ODUSBABA/1.0 (RSS Job Fetcher)' },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            console.warn(`Failed to fetch RSS: ${feedUrl} - Status: ${response.status}`);
            return [];
        }
        
        const text = await response.text();
        
        // Parse XML in browser environment
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'text/xml');
        
        if (xmlDoc.querySelector('parsererror')) {
            console.warn(`RSS parsing error for ${feedUrl}`);
            return [];
        }
        
        const items = xmlDoc.querySelectorAll('item');
        const jobs = [];
        
        for (const item of items) {
            const title = item.querySelector('title')?.textContent?.trim() || '';
            const description = item.querySelector('description')?.textContent?.trim() || '';
            const link = item.querySelector('link')?.textContent?.trim() || '';
            const pubDate = item.querySelector('pubDate')?.textContent;
            
            if (!title || !link) continue;
            
            // Extract salary information
            const salary = extractSalary(description);
            
            // Extract location from description
            let location = '';
            const locationMatch = description.match(/(?:Location|based in|located in|Location:)\s*([A-Za-z\s,]+)/i);
            if (locationMatch) location = locationMatch[1].trim();
            
            const jobType = detectJobType(title, description);
            
            jobs.push({
                title: title.substring(0, 200),
                description: description.substring(0, 1000),
                external_url: link,
                salary_range: salary?.range || null,
                salary_min: salary?.min || null,
                salary_max: salary?.max || null,
                location: location || sourceCountry,
                posted_date: pubDate,
                source_name: sourceName,
                source_country: sourceCountry,
                job_type: jobType
            });
        }
        
        return jobs.slice(0, MAX_JOBS_PER_SOURCE);
    } catch (error) {
        console.error(`Error parsing RSS feed ${feedUrl}:`, error);
        return [];
    }
}

// ============================================
// API FETCHING
// ============================================

async function fetchFromAPI(source) {
    try {
        let url = source.url;
        const headers = { 'User-Agent': 'ODUSBABA/1.0' };
        
        // Handle API keys for different sources
        if (source.requires_key) {
            if (source.name === 'Adzuna') {
                const appId = import.meta.env.VITE_ADZUNA_APP_ID;
                const apiKey = import.meta.env.VITE_ADZUNA_API_KEY;
                if (!appId || !apiKey) {
                    console.warn(`${source.name} API credentials not configured`);
                    return [];
                }
                url = `${source.url}?app_id=${appId}&app_key=${apiKey}&results_per_page=20`;
            }
            
            if (source.name === 'Findwork') {
                const apiKey = import.meta.env.VITE_FINDWORK_API_KEY;
                if (!apiKey) {
                    console.warn(`${source.name} API key not configured`);
                    return [];
                }
                headers['Authorization'] = `Token ${apiKey}`;
            }
        }
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
        
        const response = await fetch(url, { 
            headers, 
            signal: controller.signal 
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            console.warn(`API error for ${source.name}: ${response.status}`);
            return [];
        }
        
        const data = await response.json();
        
        if (source.parseFunction && typeof source.parseFunction === 'function') {
            return source.parseFunction(data);
        }
        
        return [];
    } catch (error) {
        console.error(`Error fetching from ${source.name}:`, error);
        return [];
    }
}

// ============================================
// DATABASE OPERATIONS
// ============================================

async function saveJobToDatabase(job, sponsorship) {
    try {
        // Check for duplicate
        const { data: existing } = await supabase
            .from('external_jobs')
            .select('id')
            .eq('title', job.title.substring(0, 150))
            .eq('source_name', job.source_name)
            .maybeSingle();
        
        if (existing) {
            return { status: 'exists', id: existing.id };
        }
        
        // Insert new job
        const { data, error } = await supabase
            .from('external_jobs')
            .insert({
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
            })
            .select()
            .single();
        
        if (error) throw error;
        
        return { status: 'added', id: data.id, job: data };
    } catch (error) {
        console.error('Error saving job to database:', error);
        return { status: 'error', error: error.message };
    }
}

async function logFetchResults(sourceName, jobsFetched, jobsNew, details) {
    try {
        await supabase
            .from('external_job_fetch_log')
            .insert({
                source_name: sourceName,
                fetch_status: jobsNew > 0 ? 'success' : 'no_new_jobs',
                jobs_fetched: jobsFetched,
                jobs_new: jobsNew,
                details: details,
                created_at: new Date().toISOString()
            });
    } catch (err) {
        console.warn('Log insert failed (table may not exist):', err.message);
    }
}

// ============================================
// MAIN FETCH FUNCTION
// ============================================

export async function fetchExternalJobs(forceRefresh = false) {
    const allJobs = [];
    const results = [];
    
    if (forceRefresh) {
        const { error } = await supabase
            .from('external_jobs')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (error) {
            console.error('Error clearing external jobs:', error);
        } else {
            console.log('🔄 Force refresh: Cleared existing external jobs');
        }
    }
    
    // Fetch from RSS feeds sequentially to avoid rate limiting
    for (const [key, source] of Object.entries(RSS_FEEDS)) {
        if (!source.is_active) continue;
        
        console.log(`🔍 Fetching jobs from ${source.name}...`);
        
        try {
            const jobs = await parseRSSFeed(source.url, source.name, source.country);
            const sourceResults = [];
            
            for (const job of jobs) {
                const sponsorship = detectSponsorshipEligibility(job.title, job.description, source);
                const saveResult = await saveJobToDatabase(job, sponsorship);
                
                sourceResults.push({
                    job: job.title,
                    status: saveResult.status
                });
                
                if (saveResult.status === 'added') {
                    allJobs.push(job);
                }
            }
            
            results.push({
                source: source.name,
                jobsFound: jobs.length,
                jobsAdded: sourceResults.filter(r => r.status === 'added').length,
                details: sourceResults.slice(0, 10) // Limit details
            });
            
            // Add delay between requests to be respectful
            await delay(1000);
            
        } catch (error) {
            console.error(`Error processing ${source.name}:`, error);
            results.push({
                source: source.name,
                error: error.message,
                jobsFound: 0,
                jobsAdded: 0
            });
        }
    }
    
    // Fetch from API sources
    for (const [key, source] of Object.entries(API_SOURCES)) {
        if (!source.is_active) continue;
        
        console.log(`🔍 Fetching jobs from ${source.name}...`);
        
        try {
            const jobs = await fetchFromAPI(source);
            const sourceResults = [];
            
            for (const job of jobs) {
                const sponsorship = detectSponsorshipEligibility(job.title, job.description);
                const saveResult = await saveJobToDatabase(job, sponsorship);
                
                sourceResults.push({
                    job: job.title,
                    status: saveResult.status
                });
                
                if (saveResult.status === 'added') {
                    allJobs.push(job);
                }
            }
            
            results.push({
                source: source.name,
                jobsFound: jobs.length,
                jobsAdded: sourceResults.filter(r => r.status === 'added').length,
                details: sourceResults.slice(0, 10)
            });
            
            await delay(1000);
            
        } catch (error) {
            console.error(`Error processing ${source.name}:`, error);
            results.push({
                source: source.name,
                error: error.message,
                jobsFound: 0,
                jobsAdded: 0
            });
        }
    }
    
    // Log overall results
    await logFetchResults('all_sources', allJobs.length, allJobs.length, results);
    
    console.log(`📊 Fetch complete: ${allJobs.length} new jobs added`);
    
    return {
        jobs: allJobs,
        results,
        totalAdded: allJobs.length,
        summary: results.map(r => `${r.source}: ${r.jobsAdded} new jobs`).join(', ')
    };
}

// ============================================
// EXTERNAL JOB MANAGEMENT (Admin functions)
// ============================================

export async function getExternalJobsByStatus(status) {
    const validStatuses = ['pending_approval', 'approved', 'rejected'];
    const queryStatus = validStatuses.includes(status) ? status : 'pending_approval';
    
    const { data, error } = await supabase
        .from('external_jobs')
        .select('*')
        .eq('status', queryStatus)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
}

export async function getPendingExternalJobs() {
    return getExternalJobsByStatus('pending_approval');
}

export async function getApprovedExternalJobs() {
    return getExternalJobsByStatus('approved');
}

export async function getRejectedExternalJobs() {
    return getExternalJobsByStatus('rejected');
}

export async function getExternalJobsStats() {
    const stats = {
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0,
        bySource: {}
    };
    
    const { data, error } = await supabase
        .from('external_jobs')
        .select('status, source_name');
    
    if (error) throw error;
    
    for (const job of data || []) {
        stats[job.status] = (stats[job.status] || 0) + 1;
        stats.total++;
        
        if (!stats.bySource[job.source_name]) {
            stats.bySource[job.source_name] = { pending: 0, approved: 0, rejected: 0 };
        }
        stats.bySource[job.source_name][job.status] = (stats.bySource[job.source_name][job.status] || 0) + 1;
    }
    
    return stats;
}

export async function approveExternalJob(jobId) {
    // Get the external job
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
    
    // Insert into main jobs table
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
    
    // Update external job status
    await supabase
        .from('external_jobs')
        .update({ 
            status: 'approved', 
            reviewed_at: new Date().toISOString(), 
            approved_job_id: newJob.id 
        })
        .eq('id', jobId);
    
    return { success: true, jobId: newJob.id };
}

export async function rejectExternalJob(jobId, reason = null) {
    const { error } = await supabase
        .from('external_jobs')
        .update({ 
            status: 'rejected', 
            reviewed_at: new Date().toISOString(), 
            rejection_reason: reason 
        })
        .eq('id', jobId);
    
    if (error) throw error;
    return { success: true };
}

export async function batchApproveExternalJobs(limit = 50) {
    const { data: pendingJobs, error } = await supabase
        .from('external_jobs')
        .select('id')
        .eq('status', 'pending_approval')
        .limit(limit);
    
    if (error) throw error;
    
    if (!pendingJobs?.length) {
        return { total: 0, approved: 0, failed: 0, message: 'No pending jobs to approve' };
    }
    
    const results = { total: pendingJobs.length, approved: 0, failed: 0, errors: [] };
    
    for (const job of pendingJobs) {
        try {
            await approveExternalJob(job.id);
            results.approved++;
        } catch (err) {
            results.failed++;
            results.errors.push({ jobId: job.id, error: err.message });
        }
        
        // Small delay between approvals
        await delay(500);
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
    const sourcesToSearch = Object.entries(RSS_FEEDS)
        .filter(([_, config]) => config.is_active)
        .filter(([_, config]) => !filters.country || config.country === filters.country);
    
    // Fetch from multiple sources in parallel with limit
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
                sponsorship_keyword: sponsorship.keyword,
                posted_date: job.posted_date
            });
        }
    }
    
    // Apply filters
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
    
    if (filters.sourceCountry) {
        filteredJobs = filteredJobs.filter(job => job.source_country === filters.sourceCountry);
    }
    
    // Sort by date (newest first)
    filteredJobs.sort((a, b) => {
        if (!a.posted_date) return 1;
        if (!b.posted_date) return -1;
        return new Date(b.posted_date) - new Date(a.posted_date);
    });
    
    return filteredJobs.slice(0, filters.limit || 20);
}

export async function getJobSuggestions(userQuery) {
    const q = userQuery.toLowerCase();
    
    // Determine filters based on query intent
    const filters = {
        country: null,
        sponsorshipOnly: false,
        limit: 15
    };
    
    // Country detection
    if (q.includes('uk') || q.includes('united kingdom') || q.includes('britain')) {
        filters.country = 'GB';
    } else if (q.includes('canada') || q.includes('canadian')) {
        filters.country = 'CA';
    } else if (q.includes('us') || q.includes('usa') || q.includes('united states')) {
        filters.country = 'US';
    } else if (q.includes('australia')) {
        filters.country = 'AU';
    } else if (q.includes('ireland')) {
        filters.country = 'IE';
    } else if (q.includes('germany')) {
        filters.country = 'DE';
    }
    
    // Sponsorship detection
    if (q.includes('sponsorship') || q.includes('visa') || q.includes('work permit')) {
        filters.sponsorshipOnly = true;
    }
    
    const jobs = await searchLiveJobs(userQuery, filters);
    
    return {
        jobs,
        filters,
        total: jobs.length,
        query: userQuery,
        suggestions: jobs.slice(0, 5).map(job => job.title)
    };
}

// ============================================
// CONNECTION TESTING
// ============================================

export async function testRSSConnection() {
    const results = [];
    
    for (const [_, source] of Object.entries(RSS_FEEDS)) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch(source.url, { 
                headers: { 'User-Agent': 'ODUSBABA-Job-Fetcher/1.0' },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            results.push({ 
                source: source.name, 
                url: source.url, 
                status: response.status, 
                ok: response.ok, 
                country: source.country,
                message: response.ok ? 'Connected successfully' : `HTTP ${response.status}`
            });
        } catch (error) {
            results.push({ 
                source: source.name, 
                url: source.url, 
                status: 'error', 
                error: error.message, 
                country: source.country,
                message: error.message
            });
        }
    }
    
    return results;
}

export async function testAPIConnection() {
    const results = [];
    
    for (const [_, source] of Object.entries(API_SOURCES)) {
        if (!source.is_active) {
            results.push({
                source: source.name,
                status: 'inactive',
                message: 'Source is inactive - enable to test'
            });
            continue;
        }
        
        try {
            const startTime = Date.now();
            const jobs = await fetchFromAPI(source);
            const duration = Date.now() - startTime;
            
            results.push({
                source: source.name,
                status: 'success',
                jobsFound: jobs.length,
                responseTime: `${duration}ms`,
                message: `Found ${jobs.length} jobs`
            });
        } catch (error) {
            results.push({
                source: source.name,
                status: 'error',
                error: error.message,
                message: `Failed: ${error.message}`
            });
        }
    }
    
    return results;
}

// ============================================
// EXPORTS
// ============================================

// Export configurations
export { RSS_FEEDS, API_SOURCES };

// Export main functions
export default {
    fetchExternalJobs,
    getExternalJobsByStatus,
    getPendingExternalJobs,
    getApprovedExternalJobs,
    getRejectedExternalJobs,
    getExternalJobsStats,
    approveExternalJob,
    rejectExternalJob,
    batchApproveExternalJobs,
    loadJobsFromSQL,
    searchLiveJobs,
    getJobSuggestions,
    testRSSConnection,
    testAPIConnection,
    RSS_FEEDS,
    API_SOURCES
};

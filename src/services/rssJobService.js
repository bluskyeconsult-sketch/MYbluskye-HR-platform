// src/services/rssJobService.js
// COMPLETE RSS JOB FETCHING SERVICE - Optimized for hobby plan with full features
// Features: Government feeds + Commercial feeds + Jobicy API + Remotive
// Features: Sponsorship detection, job type detection, duplicate handling, search, suggestions, stats
// Optimized: Rate limiting, caching, batch processing, reduced API calls, unified API endpoint

import { supabase } from '../lib/supabase';

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================

// ✅ FIXED: Unified API endpoint
const API_BASE = '/api/index';
const FETCH_JOBS_ENDPOINT = `${API_BASE}?action=fetch-jobs`;

const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
const REQUEST_TIMEOUT = 10000;
const MAX_JOBS_PER_SOURCE = 30;
const BATCH_SIZE = 10;
const MIN_FETCH_INTERVAL = 23 * 60 * 60 * 1000; // 23 hours (hobby plan: once per day)

// ============================================
// RSS FEEDS CONFIGURATION (Prioritized for hobby plan)
// ============================================

const RSS_FEEDS = {
    // United Kingdom - Government (Priority 1 - Always active)
    UK_CIVIL_SERVICE: {
        name: 'UK Civil Service Jobs',
        country: 'GB',
        url: 'https://www.civilservicejobs.gov.uk/feeds/jobs.xml',
        type: 'rss',
        is_active: true,
        priority: 1,
        sponsorship_keywords: ['Tier 2', 'Skilled Worker', 'Sponsorship', 'Visa', 'Certificate of Sponsorship']
    },
    UK_NHS: {
        name: 'NHS Jobs',
        country: 'GB',
        url: 'https://www.jobs.nhs.uk/feeds/jobs.xml',
        type: 'rss',
        is_active: true,
        priority: 1,
        sponsorship_keywords: ['Tier 2', 'Skilled Worker', 'Sponsorship', 'Visa']
    },
    UK_GOV_FIND_JOB: {
        name: 'Find a Job - UK Government',
        country: 'GB',
        url: 'https://findajob.dwp.gov.uk/feeds/jobs.rss',
        type: 'rss',
        is_active: true,
        priority: 1,
        sponsorship_keywords: ['Sponsorship', 'Visa', 'Skilled Worker']
    },
    
    // Ireland - Government (Priority 2)
    IRELAND_PUBLICJOBS: {
        name: 'Public Jobs Ireland',
        country: 'IE',
        url: 'https://www.publicjobs.ie/rss',
        type: 'rss',
        is_active: true,
        priority: 2,
        sponsorship_keywords: ['Work Permit', 'Critical Skills', 'Sponsorship']
    },
    
    // Canada - Government (Priority 2)
    CANADA_GC_JOBS: {
        name: 'GC Jobs Canada',
        country: 'CA',
        url: 'https://www.jobs.gc.ca/rss',
        type: 'rss',
        is_active: true,
        priority: 2,
        sponsorship_keywords: ['Work Permit', 'LMIA', 'Sponsorship']
    },
    
    // Australia - Government (Priority 2)
    AUSTRALIA_APS_JOBS: {
        name: 'APS Jobs Australia',
        country: 'AU',
        url: 'https://www.apsjobs.gov.au/rss',
        type: 'rss',
        is_active: true,
        priority: 2,
        sponsorship_keywords: ['Visa Sponsorship', 'Work Visa', 'Sponsorship']
    },
    
    // USA - Government (Priority 2)
    USA_USAJOBS: {
        name: 'USAJobs',
        country: 'US',
        url: 'https://www.usajobs.gov/rss',
        type: 'rss',
        is_active: true,
        priority: 2,
        sponsorship_keywords: ['Visa', 'Work Authorization', 'Sponsorship']
    },
    
    // Germany - Government (Priority 3)
    GERMANY_BUND: {
        name: 'Bund.de - German Government Jobs',
        country: 'DE',
        url: 'https://www.bund.de/rss/jobs',
        type: 'rss',
        is_active: true,
        priority: 3,
        sponsorship_keywords: ['Work Visa', 'Blue Card', 'Sponsorship']
    },
    
    // Commercial - Remote OK (Priority 3)
    REMOTE_OK_ALL: {
        name: 'Remote OK - Remote Jobs',
        country: 'Global',
        url: 'https://remoteok.com/remote-jobs.rss',
        type: 'rss',
        is_active: true,
        priority: 3,
        sponsorship_keywords: ['Visa', 'Sponsorship']
    },
    
    // Commercial - We Work Remotely (Priority 3)
    WE_WORK_REMOTELY: {
        name: 'We Work Remotely',
        country: 'Global',
        url: 'https://weworkremotely.com/categories/remote-programming-jobs.rss',
        type: 'rss',
        is_active: true,
        priority: 3,
        sponsorship_keywords: ['Visa', 'Sponsorship']
    },
    
    // Commercial - Stack Overflow (Priority 4 - Disabled by default)
    STACK_OVERFLOW: {
        name: 'Stack Overflow - Remote Jobs',
        country: 'Global',
        url: 'https://stackoverflow.com/jobs/feed?l=Remote',
        type: 'rss',
        is_active: false,
        priority: 4,
        sponsorship_keywords: ['Visa', 'Sponsorship']
    },
    
    // Commercial - Zapier (Priority 4 - Disabled by default)
    ZAPIER: {
        name: 'Zapier - Latest Jobs',
        country: 'Global',
        url: 'https://zapier.com/jobs/feeds/latest/',
        type: 'rss',
        is_active: false,
        priority: 4,
        sponsorship_keywords: ['Visa', 'Sponsorship']
    }
};

// ============================================
// API JOB SOURCES (Disabled by default for hobby plan)
// ============================================

const API_SOURCES = {
    JOBICY: {
        name: 'Jobicy Remote Jobs',
        country: 'Global',
        url: 'https://jobicy.com/api/v2/remote-jobs?count=10',
        type: 'api',
        is_active: false,
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
        is_active: false,
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
    }
};

// ============================================
// RATE LIMITING & CACHING
// ============================================

let lastFetchTime = null;
let lastFetchResult = null;
let dailyFetchCount = 0;
let lastResetDate = new Date().toDateString();

function resetDailyCountIfNeeded() {
    const today = new Date().toDateString();
    if (today !== lastResetDate) {
        dailyFetchCount = 0;
        lastResetDate = today;
    }
}

function canFetchToday() {
    resetDailyCountIfNeeded();
    return dailyFetchCount < 1; // Hobby plan: 1 fetch per day
}

function incrementFetchCount() {
    dailyFetchCount++;
}

export function invalidateJobCache() {
    lastFetchTime = null;
    lastFetchResult = null;
    console.log('🔄 Job cache invalidated');
}

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
    
    if (sourceConfig?.sponsorship_keywords) {
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
    if (!text) return null;
    
    const currencyPatterns = [
        { pattern: /£([\d,]+)(?:\s*-\s*£?([\d,]+))?/i, symbol: '£' },
        { pattern: /€([\d,]+)(?:\s*-\s*€?([\d,]+))?/i, symbol: '€' },
        { pattern: /\$([\d,]+)(?:\s*-\s*\$?([\d,]+))?/i, symbol: '$' }
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

// ============================================
// RSS PARSING
// ============================================

async function parseRSSFeed(feedUrl, sourceName, sourceCountry) {
    try {
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
            
            const salary = extractSalary(description);
            
            let location = '';
            const locationMatch = description.match(/(?:Location|based in|located in):?\s*([A-Za-z\s,]+)/i);
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
            
            if (jobs.length >= MAX_JOBS_PER_SOURCE) break;
        }
        
        return jobs;
    } catch (error) {
        console.error(`Error parsing RSS feed ${feedUrl}:`, error);
        return [];
    }
}

// ============================================
// API FETCHING
// ============================================

async function fetchFromAPI(source) {
    if (!source.is_active) return [];
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
        
        const response = await fetch(source.url, {
            headers: { 'User-Agent': 'ODUSBABA/1.0' },
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
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        
        const { data: existing } = await supabase
            .from('external_jobs')
            .select('id')
            .eq('title', job.title.substring(0, 150))
            .eq('source_name', job.source_name)
            .gte('created_at', sevenDaysAgo)
            .maybeSingle();
        
        if (existing) {
            return { status: 'exists', id: existing.id };
        }
        
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
        console.warn('Log insert failed:', err.message);
    }
}

// ============================================
// MAIN FETCH FUNCTION (Rate Limited)
// ============================================

export async function fetchExternalJobs(forceRefresh = false) {
    if (!forceRefresh && !canFetchToday()) {
        console.log('⚠️ Daily fetch limit reached (1 per day). Skipping...');
        return {
            jobs: [],
            results: [],
            totalAdded: 0,
            message: 'Daily fetch limit reached. Only one fetch per day allowed.',
            nextAvailable: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };
    }
    
    if (!forceRefresh && lastFetchTime && (Date.now() - lastFetchTime) < MIN_FETCH_INTERVAL && lastFetchResult) {
        console.log('📦 Using cached fetch result');
        return lastFetchResult;
    }
    
    console.log('🔍 Starting job fetch...');
    const allJobs = [];
    const results = [];
    
    // Clean up old jobs (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabase
        .from('external_jobs')
        .delete()
        .lt('created_at', thirtyDaysAgo)
        .eq('status', 'rejected');
    
    // Fetch from RSS feeds in priority order
    const sortedFeeds = Object.entries(RSS_FEEDS)
        .filter(([_, source]) => source.is_active)
        .sort((a, b) => (a[1].priority || 99) - (b[1].priority || 99));
    
    for (const [key, source] of sortedFeeds) {
        console.log(`  📡 Fetching from ${source.name}...`);
        
        try {
            const jobs = await parseRSSFeed(source.url, source.name, source.country);
            let added = 0;
            
            for (const job of jobs) {
                const sponsorship = detectSponsorshipEligibility(job.title, job.description, source);
                const saveResult = await saveJobToDatabase(job, sponsorship);
                
                if (saveResult.status === 'added') {
                    allJobs.push(job);
                    added++;
                }
                
                await delay(100);
            }
            
            results.push({
                source: source.name,
                found: jobs.length,
                added: added,
                status: 'success'
            });
            
            await delay(2000);
            
        } catch (error) {
            console.error(`  ❌ Error with ${source.name}:`, error.message);
            results.push({
                source: source.name,
                error: error.message,
                status: 'failed'
            });
        }
    }
    
    // Fetch from API sources (if enabled)
    for (const [key, source] of Object.entries(API_SOURCES)) {
        if (!source.is_active) continue;
        
        console.log(`  📡 Fetching from ${source.name}...`);
        
        try {
            const jobs = await fetchFromAPI(source);
            let added = 0;
            
            for (const job of jobs) {
                const sponsorship = detectSponsorshipEligibility(job.title, job.description);
                const saveResult = await saveJobToDatabase(job, sponsorship);
                
                if (saveResult.status === 'added') {
                    allJobs.push(job);
                    added++;
                }
            }
            
            results.push({
                source: source.name,
                found: jobs.length,
                added: added,
                status: 'success'
            });
            
            await delay(1000);
            
        } catch (error) {
            console.error(`  ❌ Error with ${source.name}:`, error.message);
            results.push({
                source: source.name,
                error: error.message,
                status: 'failed'
            });
        }
    }
    
    await logFetchResults('all_sources', allJobs.length, allJobs.length, results);
    
    incrementFetchCount();
    lastFetchTime = Date.now();
    lastFetchResult = {
        jobs: allJobs,
        results,
        totalAdded: allJobs.length,
        timestamp: new Date().toISOString(),
        summary: results.map(r => `${r.source}: ${r.added || 0} new`).join(', ')
    };
    
    console.log(`✅ Fetch complete: ${allJobs.length} new jobs added`);
    
    return lastFetchResult;
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
    const stats = { pending: 0, approved: 0, rejected: 0, total: 0, bySource: {} };
    
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
    const { data: externalJob, error: fetchError } = await supabase
        .from('external_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
    
    if (fetchError) throw fetchError;
    
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
        await delay(500);
    }
    
    return results;
}

export async function loadJobsFromSQL() {
    const { data: existingJobs, error } = await supabase
        .from('jobs')
        .select('id, title, company')
        .eq('source_type', 'authoritative')
        .limit(100);
    
    if (error) throw error;
    
    if (!existingJobs?.length) {
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
// TRIGGER FETCH FROM FRONTEND (Unified API)
// ============================================

/**
 * Trigger job fetch via unified API endpoint
 * This replaces direct fetch to /api/fetch-jobs
 */
export async function triggerJobFetchViaAPI() {
    try {
        const response = await fetch(FETCH_JOBS_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }
        
        const data = await response.json();
        return {
            success: true,
            message: data.message || 'Job fetch initiated',
            added: data.added || 0,
            details: data.details
        };
    } catch (error) {
        console.error('Trigger fetch error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ============================================
// SEARCH & SUGGESTIONS
// ============================================

export async function searchLiveJobs(query, filters = {}) {
    const allJobs = [];
    const activeFeeds = Object.entries(RSS_FEEDS)
        .filter(([_, config]) => config.is_active)
        .filter(([_, config]) => !filters.country || config.country === filters.country);
    
    const fetchPromises = activeFeeds.map(async ([_, config]) => {
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
    
    filteredJobs.sort((a, b) => {
        if (!a.posted_date) return 1;
        if (!b.posted_date) return -1;
        return new Date(b.posted_date) - new Date(a.posted_date);
    });
    
    return filteredJobs.slice(0, filters.limit || 20);
}

export async function getJobSuggestions(userQuery) {
    const q = userQuery.toLowerCase();
    const filters = {
        country: null,
        sponsorshipOnly: false,
        limit: 15
    };
    
    if (q.includes('uk') || q.includes('united kingdom')) filters.country = 'GB';
    else if (q.includes('canada')) filters.country = 'CA';
    else if (q.includes('us') || q.includes('usa')) filters.country = 'US';
    else if (q.includes('australia')) filters.country = 'AU';
    else if (q.includes('ireland')) filters.country = 'IE';
    
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

// ============================================
// EXPORTS
// ============================================

export { RSS_FEEDS, API_SOURCES };

export default {
    fetchExternalJobs,
    triggerJobFetchViaAPI,
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
    invalidateJobCache,
    RSS_FEEDS,
    API_SOURCES
};

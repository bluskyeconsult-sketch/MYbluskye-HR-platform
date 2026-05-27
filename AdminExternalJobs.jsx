// src/services/externalJobService.js
// OPTIMIZED: Added caching, unified fetch methods, proper separation of concerns

import { supabase } from '../lib/supabase';

// ============================================
// CACHE MANAGEMENT (NEW)
// ============================================

const CACHE_CONFIG = {
    TTL: 5 * 60 * 1000, // 5 minutes default cache
    STORAGE_KEY: 'gov_jobs_cache',
    LAST_FETCH_KEY: 'gov_jobs_last_fetch'
};

class JobCache {
    static get() {
        try {
            const cached = localStorage.getItem(CACHE_CONFIG.STORAGE_KEY);
            const lastFetch = localStorage.getItem(CACHE_CONFIG.LAST_FETCH_KEY);
            
            if (!cached || !lastFetch) return null;
            
            const cacheAge = Date.now() - parseInt(lastFetch);
            if (cacheAge > CACHE_CONFIG.TTL) return null;
            
            return JSON.parse(cached);
        } catch {
            return null;
        }
    }
    
    static set(jobs) {
        try {
            localStorage.setItem(CACHE_CONFIG.STORAGE_KEY, JSON.stringify(jobs));
            localStorage.setItem(CACHE_CONFIG.LAST_FETCH_KEY, Date.now().toString());
        } catch (error) {
            console.warn('Cache set failed:', error);
        }
    }
    
    static clear() {
        localStorage.removeItem(CACHE_CONFIG.STORAGE_KEY);
        localStorage.removeItem(CACHE_CONFIG.LAST_FETCH_KEY);
    }
    
    static isFresh() {
        const lastFetch = localStorage.getItem(CACHE_CONFIG.LAST_FETCH_KEY);
        if (!lastFetch) return false;
        return (Date.now() - parseInt(lastFetch)) < CACHE_CONFIG.TTL;
    }
}

// ============================================
// UNIFIED JOB FETCHING (Core Logic)
// ============================================

/**
 * Fetch government jobs with caching
 * @param {Object} options - Fetch options
 * @param {boolean} options.forceRefresh - Ignore cache and force refresh
 * @param {boolean} options.useCache - Use cache if available (default: true)
 * @returns {Promise<Array>} List of government jobs
 */
export async function fetchGovernmentJobs(options = {}) {
    const { forceRefresh = false, useCache = true } = options;
    
    // Check cache first
    if (!forceRefresh && useCache && JobCache.isFresh()) {
        const cachedJobs = JobCache.get();
        if (cachedJobs && cachedJobs.length > 0) {
            console.log('📦 Using cached jobs (fresh)');
            return cachedJobs;
        }
    }
    
    console.log('🌐 Fetching fresh jobs from API...');
    
    try {
        // Try primary API endpoint
        const response = await fetch('/api/fetch-jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ forceRefresh })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.jobs?.length) {
                const jobs = data.jobs;
                JobCache.set(jobs);
                return jobs;
            }
        }
        throw new Error('API returned no jobs');
        
    } catch (error) {
        console.warn('⚠️ API failed, falling back to RSS:', error.message);
        const rssJobs = await fetchJobsFromRSS();
        
        if (rssJobs.length > 0) {
            JobCache.set(rssJobs);
            return rssJobs;
        }
        
        // Final fallback: mock data
        console.log('⚠️ Using mock fallback data');
        const mockJobs = getMockJobs();
        JobCache.set(mockJobs);
        return mockJobs;
    }
}

/**
 * Force refresh jobs (ignores all cache)
 */
export async function refreshGovernmentJobs() {
    console.log('🔄 Force refreshing jobs (cache ignored)...');
    JobCache.clear();
    return await fetchGovernmentJobs({ forceRefresh: true, useCache: false });
}

/**
 * Get cache status
 */
export function getCacheStatus() {
    return {
        isFresh: JobCache.isFresh(),
        lastFetch: localStorage.getItem(CACHE_CONFIG.LAST_FETCH_KEY),
        ttl: CACHE_CONFIG.TTL,
        remaining: JobCache.isFresh() ? 
            CACHE_CONFIG.TTL - (Date.now() - parseInt(localStorage.getItem(CACHE_CONFIG.LAST_FETCH_KEY) || '0')) : 0
    };
}

// ============================================
// SAVE JOBS TO DATABASE (Core Logic)
// ============================================

/**
 * Save government jobs to Supabase with duplicate detection
 * @param {Array} jobs - Array of job objects
 * @param {string} userId - Current user ID for auditing
 * @returns {Promise<number>} Number of new jobs added
 */
export async function saveGovernmentJobsToSupabase(jobs, userId = null) {
    if (!jobs || jobs.length === 0) return 0;
    
    let newCount = 0;
    const results = { added: 0, exists: 0, errors: 0 };
    
    for (const job of jobs) {
        // Check for duplicate
        const { data: existing } = await supabase
            .from('jobs')
            .select('id')
            .eq('title', job.title)
            .eq('source_name', job.source_name || 'government_portal')
            .maybeSingle();
        
        if (existing) {
            results.exists++;
            continue;
        }
        
        // Prepare job data
        const jobData = {
            title: job.title?.substring(0, 200),
            company: job.company || job.source_name || 'Government Agency',
            location: job.location,
            salary_range: job.salary_range,
            salary_min: job.salary_min,
            salary_max: job.salary_max,
            description: job.description?.substring(0, 2000),
            external_apply_url: job.external_url || job.source_url,
            source_country: job.source_country,
            source_name: job.source_name || 'government_portal',
            job_type: normalizeJobType(job.job_type),
            sponsorship_eligible: detectSponsorshipEligibility(job.title, job.description).eligible,
            compliance_status: 'pending',
            status: 'draft',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            fetched_by: userId
        };
        
        const { error } = await supabase.from('jobs').insert(jobData);
        
        if (!error) {
            newCount++;
            results.added++;
        } else {
            results.errors++;
            console.error('Failed to save job:', job.title, error.message);
        }
    }
    
    // Log the operation
    await logFetchResults('government_fetch', results);
    
    console.log(`✅ Saved ${newCount} new jobs (${results.exists} existed, ${results.errors} errors)`);
    return newCount;
}

// ============================================
// UNIFIED EXTERNAL JOBS API (For components)
// ============================================

/**
 * Main function for components to fetch and save jobs
 * Handles caching, saving, and returns results
 */
export async function fetchAndSaveExternalJobs(options = {}) {
    const { forceRefresh = false, userId = null } = options;
    
    try {
        // Fetch jobs (with caching)
        const jobs = forceRefresh 
            ? await refreshGovernmentJobs()
            : await fetchGovernmentJobs({ forceRefresh: false });
        
        if (!jobs || jobs.length === 0) {
            return { success: false, newCount: 0, message: 'No jobs found' };
        }
        
        // Save to database
        const newCount = await saveGovernmentJobsToSupabase(jobs, userId);
        
        return {
            success: true,
            newCount,
            totalFetched: jobs.length,
            message: newCount > 0 
                ? `Fetched ${newCount} new government jobs` 
                : 'No new jobs found. Cache is fresh!'
        };
        
    } catch (error) {
        console.error('Fetch and save error:', error);
        return {
            success: false,
            newCount: 0,
            error: error.message,
            message: 'Failed to fetch jobs'
        };
    }
}

// ============================================
// LEGACY COMPATIBILITY (Maintain existing API)
// ============================================

// For backward compatibility with existing components
export async function fetchExternalJobs(forceRefresh = false) {
    const result = await fetchAndSaveExternalJobs({ forceRefresh });
    return {
        success: result.success,
        totalAdded: result.newCount,
        results: result.message,
        jobs: result.totalFetched ? [] : []
    };
}

export async function triggerJobFetch() {
    return await fetchAndSaveExternalJobs({ forceRefresh: true });
}

// RSS Fallback implementation
async function fetchJobsFromRSS() {
    const allJobs = [];
    
    for (const [country, feeds] of Object.entries(RSS_FEEDS)) {
        for (const feed of feeds) {
            try {
                const response = await fetch('/api/fetch-rss', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: feed.url,
                        source: feed.name,
                        country: country,
                        keywords: feed.keywords
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.jobs) {
                        allJobs.push(...data.jobs);
                    }
                }
            } catch (error) {
                console.error(`RSS fetch error for ${feed.name}:`, error);
            }
        }
    }
    
    return allJobs;
}

function getMockJobs() {
    const jobs = [];
    for (const [country, jobList] of Object.entries(MOCK_JOBS_FALLBACK)) {
        jobs.push(...jobList.map(job => ({ ...job, source_country: country })));
    }
    return jobs;
}

// Rest of the existing functions (normalizeJobType, detectSponsorshipEligibility, etc.)
// Keep from the previous optimized version...

// src/services/externalJobService.js
// COMPLETE EXTERNAL JOB SERVICE - Fetch, Approve, Reject, Batch Approve

import { supabase } from '../lib/supabase';

// ============================================
// VALID JOB TYPES (Must match database constraint)
// ============================================

const VALID_JOB_TYPES = ['full_time', 'part_time', 'contract', 'freelance', 'remote', 'hybrid', 'onsite'];

function normalizeJobType(jobType) {
    if (!jobType) return 'full_time';
    
    const normalized = jobType.toLowerCase().trim().replace(/-/g, '_');
    
    if (VALID_JOB_TYPES.includes(normalized)) return normalized;
    
    const mapping = {
        'fulltime': 'full_time', 'full-time': 'full_time', 'full time': 'full_time',
        'parttime': 'part_time', 'part-time': 'part_time', 'part time': 'part_time',
        'remote': 'remote', 'work from home': 'remote', 'wfh': 'remote',
        'hybrid': 'hybrid', 'contract': 'contract', 'freelance': 'freelance',
        'onsite': 'onsite', 'on-site': 'onsite'
    };
    return mapping[normalized] || 'full_time';
}

// ============================================
// RSS FEED SOURCES
// ============================================

const RSS_FEEDS = {
    UK_CIVIL_SERVICE: {
        name: 'UK Civil Service Jobs',
        country: 'GB',
        url: 'https://www.civilservicejobs.gov.uk/feeds/jobs.xml',
        is_active: true
    },
    UK_NHS: {
        name: 'NHS Jobs',
        country: 'GB',
        url: 'https://www.jobs.nhs.uk/feeds/jobs.xml',
        is_active: true
    },
    USAJOBS: {
        name: 'USAJobs',
        country: 'US',
        url: 'https://www.usajobs.gov/rss',
        is_active: true
    },
    CANADA_GC: {
        name: 'GC Jobs Canada',
        country: 'CA',
        url: 'https://www.jobs.gc.ca/rss',
        is_active: true
    },
    AUSTRALIA_APS: {
        name: 'APS Jobs Australia',
        country: 'AU',
        url: 'https://www.apsjobs.gov.au/rss',
        is_active: true
    }
};

// ============================================
// PARSE RSS FEED
// ============================================

async function parseRSSFeed(feedUrl, sourceName, sourceCountry) {
    try {
        const response = await fetch(feedUrl, {
            headers: { 'User-Agent': 'ODUSBABA-Job-Fetcher/1.0' }
        });
        
        if (!response.ok) {
            console.warn(`Failed to fetch ${feedUrl}: ${response.status}`);
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
            
            if (!title || !link) continue;
            
            // Detect job type from title/description
            let jobType = 'full_time';
            const text_lower = `${title} ${description}`.toLowerCase();
            if (text_lower.includes('remote')) jobType = 'remote';
            else if (text_lower.includes('part time')) jobType = 'part_time';
            else if (text_lower.includes('contract')) jobType = 'contract';
            else if (text_lower.includes('freelance')) jobType = 'freelance';
            else if (text_lower.includes('hybrid')) jobType = 'hybrid';
            
            // Extract salary
            let salaryRange = null;
            let salaryMin = null;
            let salaryMax = null;
            const salaryMatch = description.match(/£([\d,]+)(?:\s*-\s*£([\d,]+))?/i) ||
                              description.match(/\$([\d,]+)(?:\s*-\s*\$([\d,]+))?/i);
            if (salaryMatch) {
                salaryRange = `${salaryMatch[1]}${salaryMatch[2] ? ` - ${salaryMatch[2]}` : ''}`;
                salaryMin = parseInt(salaryMatch[1].replace(/,/g, ''));
                if (salaryMatch[2]) salaryMax = parseInt(salaryMatch[2].replace(/,/g, ''));
            }
            
            jobs.push({
                title: title.substring(0, 200),
                description: description.substring(0, 2000),
                link: link,
                salary_range: salaryRange,
                salary_min: salaryMin,
                salary_max: salaryMax,
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
// FETCH EXTERNAL JOBS
// ============================================

export async function fetchExternalJobs() {
    const allJobs = [];
    const results = [];
    
    for (const [key, source] of Object.entries(RSS_FEEDS)) {
        if (!source.is_active) continue;
        
        console.log(`🔍 Fetching jobs from ${source.name}...`);
        const jobs = await parseRSSFeed(source.url, source.name, source.country);
        
        for (const job of jobs) {
            // Check if job already exists
            const { data: existing } = await supabase
                .from('external_jobs')
                .select('id')
                .eq('title', job.title)
                .eq('source_name', job.source_name)
                .maybeSingle();
            
            if (existing) {
                results.push({ source: source.name, job: job.title, status: 'exists' });
                continue;
            }
            
            const { error: insertError } = await supabase
                .from('external_jobs')
                .insert({
                    title: job.title,
                    company: job.source_name,
                    location: job.source_country,
                    description: job.description,
                    salary_range: job.salary_range,
                    salary_min: job.salary_min,
                    salary_max: job.salary_max,
                    job_type: job.job_type,
                    external_apply_url: job.link,
                    source_country: job.source_country,
                    source_name: job.source_name,
                    status: 'pending_approval',
                    created_at: new Date().toISOString()
                });
            
            if (!insertError) {
                allJobs.push(job);
                results.push({ source: source.name, job: job.title, status: 'added', job_type: job.job_type });
            } else {
                results.push({ source: source.name, job: job.title, status: 'error', error: insertError.message });
            }
        }
    }
    
    await supabase.from('external_job_fetch_log').insert({
        source_name: 'rss_fetch_all',
        fetch_status: allJobs.length > 0 ? 'success' : 'no_new_jobs',
        jobs_fetched: allJobs.length,
        jobs_new: allJobs.length,
        details: results,
        created_at: new Date().toISOString()
    });
    
    return { jobs: allJobs, results, totalAdded: allJobs.length };
}

// ============================================
// TRIGGER JOB FETCH (Admin function)
// ============================================

export async function triggerJobFetch() {
    console.log('🚀 Manually triggering job fetch...');
    const result = await fetchExternalJobs();
    return {
        success: true,
        message: `Job fetch completed. Added: ${result.totalAdded}`,
        details: result
    };
}

// ============================================
// GET PENDING JOBS
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

// ============================================
// APPROVE SINGLE JOB (Uses database function)
// ============================================

export async function approveExternalJob(jobId) {
    const { data, error } = await supabase
        .rpc('approve_external_job', { job_id: jobId });
    
    if (error) throw new Error(error.message);
    return { success: true, jobId: data };
}

// ============================================
// BATCH APPROVE ALL PENDING JOBS
// ============================================

export async function batchApproveExternalJobs() {
    const { data: pendingJobs, error: fetchError } = await supabase
        .from('external_jobs')
        .select('id')
        .eq('status', 'pending_approval');
    
    if (fetchError) throw fetchError;
    
    if (!pendingJobs || pendingJobs.length === 0) {
        return { total: 0, approved: 0, failed: 0 };
    }
    
    const results = { total: pendingJobs.length, approved: 0, failed: 0, errors: [] };
    
    for (const job of pendingJobs) {
        try {
            await approveExternalJob(job.id);
            results.approved++;
        } catch (error) {
            results.failed++;
            results.errors.push({ jobId: job.id, error: error.message });
        }
    }
    
    return results;
}

// ============================================
// REJECT JOB
// ============================================

export async function rejectExternalJob(jobId, reason = null) {
    const { error } = await supabase
        .from('external_jobs')
        .update({ 
            status: 'rejected', 
            rejection_reason: reason,
            updated_at: new Date().toISOString()
        })
        .eq('id', jobId);
    
    if (error) throw error;
    return { success: true };
}

// ============================================
// GET JOB FETCH STATS
// ============================================

export async function getFetchStats() {
    const { data, error } = await supabase
        .from('external_job_fetch_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
    
    if (error) throw error;
    return data || [];
}

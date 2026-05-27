// src/services/externalJobService.js
// OPTIMIZED: Combined best features from both versions
// Features: API fetch + RSS fallback, sponsorship detection, admin auth, batch operations

import { supabase } from '../lib/supabase';

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================

const ADMIN_EMAIL = 'bluskyeconsult@gmail.com';
const BATCH_SIZE = 25; // Optimized batch size for Supabase

const VALID_JOB_TYPES = ['full_time', 'part_time', 'contract', 'freelance', 'remote', 'hybrid', 'onsite'];

const RSS_FEEDS = {
    GB: [
        { name: 'UK Civil Service Jobs', url: 'https://www.civilservicejobs.gov.uk/feeds/jobs.xml', keywords: ['Tier 2', 'Skilled Worker', 'Sponsorship', 'Visa'] },
        { name: 'NHS Jobs', url: 'https://www.jobs.nhs.uk/feeds/jobs.xml', keywords: ['Tier 2', 'Skilled Worker', 'Sponsorship'] },
        { name: 'UK Government Find a Job', url: 'https://findajob.dwp.gov.uk/feeds/jobs.rss', keywords: ['Sponsorship', 'Visa'] }
    ],
    US: [
        { name: 'USAJobs', url: 'https://www.usajobs.gov/rss', keywords: ['Visa', 'Work Authorization', 'Sponsorship'] }
    ],
    CA: [
        { name: 'GC Jobs Canada', url: 'https://www.jobs.gc.ca/rss', keywords: ['Work Permit', 'LMIA', 'Sponsorship'] }
    ],
    AU: [
        { name: 'APS Jobs Australia', url: 'https://www.apsjobs.gov.au/rss', keywords: ['Visa Sponsorship', 'Work Visa'] }
    ],
    IE: [
        { name: 'Public Jobs Ireland', url: 'https://www.publicjobs.ie/rss', keywords: ['Work Permit', 'Critical Skills'] }
    ],
    DE: [
        { name: 'Bund.de Jobs', url: 'https://www.bund.de/rss/jobs', keywords: ['Work Visa', 'Blue Card'] }
    ],
    NG: [
        { name: 'Federal Civil Service Nigeria', url: 'https://www.federalcharacter.gov.ng/api/jobs.rss', keywords: ['Sponsorship'] }
    ]
};

// Simplified mock fallback data
const MOCK_JOBS_FALLBACK = {
    GB: [
        { title: 'Policy Advisor', company: 'UK Civil Service', location: 'London', salary: '£35,000 - £45,000', description: 'Join the UK Civil Service as a Policy Advisor.', job_type: 'full_time' },
        { title: 'Senior Policy Analyst', company: 'UK Civil Service', location: 'London', salary: '£45,000 - £55,000', description: 'Seeking an experienced Policy Analyst.', job_type: 'full_time' }
    ],
    US: [
        { title: 'Program Analyst', company: 'USAJobs', location: 'Washington DC', salary: '$65,000 - $85,000', description: 'Federal agency seeking a Program Analyst.', job_type: 'full_time' }
    ],
    CA: [
        { title: 'Policy Analyst', company: 'GC Jobs', location: 'Ottawa', salary: 'CAD 65,000 - CAD 85,000', description: 'Government of Canada seeking Policy Analysts.', job_type: 'full_time' }
    ],
    AU: [
        { title: 'APS Policy Officer', company: 'APS Jobs', location: 'Canberra', salary: 'AUD 70,000 - AUD 90,000', description: 'Join the Australian Public Service.', job_type: 'full_time' }
    ],
    IE: [
        { title: 'Public Service Executive', company: 'Public Jobs IE', location: 'Dublin', salary: '€50,000 - €65,000', description: 'Public Appointments Service hiring.', job_type: 'full_time' }
    ]
};

// ============================================
// HELPER FUNCTIONS (Optimized)
// ============================================

const normalizeJobType = (jobType) => {
    if (!jobType) return 'full_time';
    const normalized = jobType.toLowerCase().trim().replace(/-/g, '_');
    if (VALID_JOB_TYPES.includes(normalized)) return normalized;
    
    const mapping = {
        'fulltime': 'full_time', 'parttime': 'part_time', 'wfh': 'remote',
        'work from home': 'remote', 'on-site': 'onsite', 'full-time': 'full_time',
        'part-time': 'part_time'
    };
    return mapping[normalized] || 'full_time';
};

const detectSponsorshipEligibility = (title, description, keywords = []) => {
    const text = `${title} ${description || ''}`.toLowerCase();
    const allKeywords = [
        ...keywords,
        'visa sponsorship', 'work visa', 'skilled worker', 'tier 2',
        'certificate of sponsorship', 'sponsorship available', 'work permit',
        'relocation support', 'immigration support', 'visa assistance'
    ];
    
    for (const keyword of allKeywords) {
        if (text.includes(keyword.toLowerCase())) {
            return { eligible: true, keyword };
        }
    }
    return { eligible: false };
};

const isAdmin = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        return user?.email === ADMIN_EMAIL;
    } catch {
        return false;
    }
};

const parseSalary = (salaryStr) => {
    if (!salaryStr) return { salary_min: null, salary_max: null, salary_range: null };
    
    const patterns = [
        /£([\d,]+)(?:\s*-\s*£([\d,]+))?/i,
        /€([\d,]+)(?:\s*-\s*€([\d,]+))?/i,
        /\$([\d,]+)(?:\s*-\s*\$([\d,]+))?/i,
        /CAD\s*([\d,]+)(?:\s*-\s*CAD\s*([\d,]+))?/i,
        /AUD\s*([\d,]+)(?:\s*-\s*AUD\s*([\d,]+))?/i
    ];
    
    for (const pattern of patterns) {
        const match = salaryStr.match(pattern);
        if (match) {
            const min = parseInt(match[1].replace(/,/g, ''));
            const max = match[2] ? parseInt(match[2].replace(/,/g, '')) : null;
            return {
                salary_min: min,
                salary_max: max,
                salary_range: salaryStr
            };
        }
    }
    
    return { salary_min: null, salary_max: null, salary_range: salaryStr };
};

// ============================================
// FETCH EXTERNAL JOBS (Primary: API, Fallback: RSS, Final: Mock)
// ============================================

export async function fetchExternalJobs(forceRefresh = false) {
    // Try primary API endpoint first
    try {
        const response = await fetch('/api/fetch-jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ forceRefresh })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.jobs?.length) {
                return await processFetchedJobs(data.jobs, 'api_fetch');
            }
        }
        throw new Error('API fetch failed or returned no jobs');
    } catch (error) {
        console.warn('⚠️ API failed, falling back to RSS:', error.message);
        return await fetchExternalJobsRSS();
    }
}

async function processFetchedJobs(jobs, source) {
    const results = { added: 0, exists: 0, errors: 0, details: [] };
    
    for (const job of jobs) {
        // Check for duplicate
        const { data: existing } = await supabase
            .from('jobs')
            .select('id')
            .eq('title', job.title)
            .eq('source_name', job.source_name || source)
            .maybeSingle();

        if (existing) {
            results.exists++;
            results.details.push({ job: job.title, status: 'exists' });
            continue;
        }

        const sponsorship = detectSponsorshipEligibility(job.title, job.description);
        const jobType = normalizeJobType(job.job_type);
        const { salary_min, salary_max, salary_range } = parseSalary(job.salary_range);
        
        const { error } = await supabase
            .from('jobs')
            .insert({
                title: job.title?.substring(0, 200),
                company: job.company,
                location: job.location,
                salary_range: salary_range || job.salary_range,
                salary_min: salary_min || job.salary_min,
                salary_max: salary_max || job.salary_max,
                description: job.description?.substring(0, 2000),
                external_apply_url: job.external_url || job.source_url,
                source_country: job.source_country,
                source_name: job.source_name || source,
                job_type: jobType,
                sponsorship_eligible: sponsorship.eligible,
                compliance_status: 'pending',
                status: 'draft',
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

        if (!error) {
            results.added++;
            results.details.push({ job: job.title, status: 'added' });
        } else {
            results.errors++;
            results.details.push({ job: job.title, status: 'error', error: error.message });
        }
    }
    
    await logFetchResults(source, results);
    return { success: true, ...results };
}

// ============================================
// RSS FETCH (Uses serverless function for CORS-free parsing)
// ============================================

async function fetchExternalJobsRSS() {
    const results = { added: 0, failed: 0, details: [] };
    
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
                    results.added += data.added || 0;
                    results.details.push({ source: feed.name, added: data.added || 0 });
                    console.log(`✅ ${feed.name}: Added ${data.added || 0} jobs`);
                } else {
                    results.failed++;
                    results.details.push({ source: feed.name, status: 'failed', error: `HTTP ${response.status}` });
                }
            } catch (error) {
                console.error(`❌ RSS fetch error for ${feed.name}:`, error.message);
                results.failed++;
                results.details.push({ source: feed.name, status: 'error', error: error.message });
            }
        }
    }
    
    // Use mock fallback if no jobs added
    if (results.added === 0) {
        console.log('⚠️ No RSS jobs added, using mock fallback');
        await insertMockJobs();
        const mockCount = await getMockJobCount();
        results.added = mockCount;
        results.details.push({ source: 'mock_fallback', added: mockCount });
    }
    
    await logFetchResults('rss_fallback', results);
    return { success: true, ...results };
}

async function insertMockJobs() {
    for (const [country, jobs] of Object.entries(MOCK_JOBS_FALLBACK)) {
        for (const job of jobs) {
            const { data: existing } = await supabase
                .from('jobs')
                .select('id')
                .eq('title', job.title)
                .eq('source_name', job.company)
                .maybeSingle();
            
            if (!existing) {
                const sponsorship = detectSponsorshipEligibility(job.title, job.description);
                const jobType = normalizeJobType(job.job_type);
                const { salary_min, salary_max, salary_range } = parseSalary(job.salary);
                
                await supabase.from('jobs').insert({
                    title: job.title,
                    company: job.company,
                    location: job.location,
                    salary_range: salary_range,
                    salary_min: salary_min,
                    salary_max: salary_max,
                    description: job.description || `Join ${job.company} as a ${job.title}`,
                    job_type: jobType,
                    source_country: country,
                    source_name: job.company,
                    sponsorship_eligible: sponsorship.eligible,
                    compliance_status: 'pending',
                    status: 'draft',
                    is_active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            }
        }
    }
}

// ============================================
// PENDING JOBS MANAGEMENT (Unified)
// ============================================

export async function getPendingExternalJobs() {
    const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('compliance_status', 'pending')
        .eq('status', 'draft')
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
}

export async function approveExternalJob(jobId) {
    if (!await isAdmin()) {
        return { success: false, error: 'Unauthorized: Admin only' };
    }

    const { data: job, error: fetchError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();
    
    if (fetchError) throw fetchError;
    
    const jobType = normalizeJobType(job.job_type);
    
    const { data: updated, error: updateError } = await supabase
        .from('jobs')
        .update({
            job_type: jobType,
            compliance_status: 'approved',
            status: 'active',
            is_active: true,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .select()
        .single();
    
    if (updateError) throw updateError;
    
    console.log(`✅ Job approved: ${updated.title}`);
    return { success: true, data: updated };
}

export async function rejectExternalJob(jobId, reason = null) {
    if (!await isAdmin()) {
        return { success: false, error: 'Unauthorized: Admin only' };
    }

    const { data, error } = await supabase
        .from('jobs')
        .update({
            compliance_status: 'rejected',
            status: 'expired',
            is_active: false,
            rejection_reason: reason,
            updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .select()
        .single();
    
    if (error) throw error;
    return { success: true, data };
}

// ============================================
// BATCH OPERATIONS (Optimized)
// ============================================

export async function batchApproveExternalJobs(jobIds = null) {
    if (!await isAdmin()) {
        return { success: false, error: 'Unauthorized: Admin only', approved: 0, failed: 0 };
    }

    let idsToApprove = jobIds;
    if (!idsToApprove || idsToApprove.length === 0) {
        const { data: pendingJobs } = await supabase
            .from('jobs')
            .select('id')
            .eq('compliance_status', 'pending');
        idsToApprove = pendingJobs?.map(job => job.id) || [];
    }

    if (idsToApprove.length === 0) {
        return { success: true, approved: 0, failed: 0, message: 'No pending jobs' };
    }

    const results = { approved: 0, failed: 0, errors: [] };
    const now = new Date().toISOString();
    
    // Process in optimized batches
    for (let i = 0; i < idsToApprove.length; i += BATCH_SIZE) {
        const batch = idsToApprove.slice(i, i + BATCH_SIZE);
        
        const { error } = await supabase
            .from('jobs')
            .update({
                compliance_status: 'approved',
                status: 'active',
                is_active: true,
                approved_at: now,
                updated_at: now
            })
            .in('id', batch)
            .eq('compliance_status', 'pending');

        if (error) {
            results.failed += batch.length;
            results.errors.push({ batch, error: error.message });
            console.error(`Batch approval error for batch ${i/BATCH_SIZE + 1}:`, error);
        } else {
            results.approved += batch.length;
            console.log(`✅ Batch ${i/BATCH_SIZE + 1}: Approved ${batch.length} jobs`);
        }
    }
    
    console.log(`✅ Batch approval complete: ${results.approved} approved, ${results.failed} failed`);
    return { success: true, ...results };
}

// ============================================
// STATISTICS & LOGGING
// ============================================

export async function getExternalJobsStats() {
    const stats = { pending: 0, approved: 0, rejected: 0, active: 0, total: 0 };
    
    const { data, error } = await supabase
        .from('jobs')
        .select('compliance_status, status');
    
    if (!error && data) {
        data.forEach(job => {
            if (job.compliance_status === 'pending') stats.pending++;
            if (job.compliance_status === 'approved') stats.approved++;
            if (job.compliance_status === 'rejected') stats.rejected++;
            if (job.status === 'active') stats.active++;
        });
        stats.total = data.length;
    }
    
    return stats;
}

async function logFetchResults(source, results) {
    try {
        await supabase.from('external_job_fetch_log').insert({
            source_name: source,
            fetch_status: results.added > 0 ? 'success' : results.failed > 0 ? 'partial' : 'no_new_jobs',
            jobs_fetched: results.added,
            jobs_new: results.added,
            details: results.details,
            created_at: new Date().toISOString()
        });
    } catch (error) {
        console.warn('Failed to log fetch results:', error.message);
    }
}

async function getMockJobCount() {
    const mockSources = [...new Set(Object.values(MOCK_JOBS_FALLBACK).flat().map(j => j.company))];
    const { count } = await supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .in('source_name', mockSources);
    return count || 0;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export async function triggerJobFetch() {
    console.log('🚀 Manually triggering job fetch...');
    const result = await fetchExternalJobs(true);
    return {
        success: true,
        message: `Job fetch completed. Added: ${result.added}, Exists: ${result.exists}, Errors: ${result.errors}`,
        details: result
    };
}

export async function getFetchLogs(limit = 10) {
    const { data, error } = await supabase
        .from('external_job_fetch_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
    
    if (error) throw error;
    return data || [];
}

export async function getApprovedJobs(limit = 100) {
    const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('compliance_status', 'approved')
        .eq('status', 'active')
        .order('approved_at', { ascending: false })
        .limit(limit);
    
    if (error) throw error;
    return data || [];
}

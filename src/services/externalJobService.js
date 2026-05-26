// src/services/externalJobService.js
// COMPLETE EXTERNAL JOB SERVICE - Fetch via API, Approve, Reject, Batch Approve, SQL Sync, Stats
// Fetches jobs from serverless API (no CORS issues) with RSS fallback

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
// RSS FEED SOURCES (Fallback when API fails)
// ============================================

const RSS_FEEDS = {
    UK_CIVIL_SERVICE: {
        name: 'UK Civil Service Jobs',
        country: 'GB',
        url: 'https://www.civilservicejobs.gov.uk/feeds/jobs.xml',
        is_active: true,
        sponsorship_keywords: ['Tier 2', 'Skilled Worker', 'Sponsorship', 'Visa']
    },
    UK_NHS: {
        name: 'NHS Jobs',
        country: 'GB',
        url: 'https://www.jobs.nhs.uk/feeds/jobs.xml',
        is_active: true,
        sponsorship_keywords: ['Tier 2', 'Skilled Worker', 'Sponsorship', 'Visa']
    },
    UK_GOV_FIND_JOB: {
        name: 'Find a Job - UK Government',
        country: 'GB',
        url: 'https://findajob.dwp.gov.uk/feeds/jobs.rss',
        is_active: true,
        sponsorship_keywords: ['Sponsorship', 'Visa', 'Skilled Worker']
    },
    IRELAND_PUBLICJOBS: {
        name: 'Public Jobs Ireland',
        country: 'IE',
        url: 'https://www.publicjobs.ie/rss',
        is_active: true,
        sponsorship_keywords: ['Work Permit', 'Critical Skills', 'Sponsorship']
    },
    CANADA_GC: {
        name: 'GC Jobs Canada',
        country: 'CA',
        url: 'https://www.jobs.gc.ca/rss',
        is_active: true,
        sponsorship_keywords: ['Work Permit', 'LMIA', 'Sponsorship']
    },
    AUSTRALIA_APS: {
        name: 'APS Jobs Australia',
        country: 'AU',
        url: 'https://www.apsjobs.gov.au/rss',
        is_active: true,
        sponsorship_keywords: ['Visa Sponsorship', 'Work Visa', 'Sponsorship']
    },
    USAJOBS: {
        name: 'USAJobs',
        country: 'US',
        url: 'https://www.usajobs.gov/rss',
        is_active: true,
        sponsorship_keywords: ['Visa', 'Work Authorization', 'Sponsorship']
    },
    GERMANY_BUND: {
        name: 'Bund.de - German Government Jobs',
        country: 'DE',
        url: 'https://www.bund.de/rss/jobs',
        is_active: true,
        sponsorship_keywords: ['Work Visa', 'Blue Card', 'Sponsorship']
    }
};

// ============================================
// MOCK JOBS BY COUNTRY (Fallback)
// ============================================

const MOCK_JOBS_BY_COUNTRY = {
    GB: [
        { title: 'Policy Advisor', company: 'UK Civil Service', location: 'London, UK', salary: '£35,000 - £45,000', description: 'Join the UK Civil Service as a Policy Advisor.', job_type: 'full_time' },
        { title: 'Senior Policy Analyst', company: 'UK Civil Service', location: 'London, UK', salary: '£45,000 - £55,000', description: 'Seeking an experienced Policy Analyst.', job_type: 'full_time' },
        { title: 'NHS Administrator', company: 'NHS', location: 'Manchester, UK', salary: '£28,000 - £32,000', description: 'The NHS is seeking an experienced Administrator.', job_type: 'full_time' }
    ],
    NG: [
        { title: 'Civil Service Officer', company: 'Federal Civil Service', location: 'Abuja, Nigeria', salary: '₦3,500,000 - ₦5,000,000', description: 'Join the Federal Civil Service.', job_type: 'full_time' }
    ],
    IE: [
        { title: 'Public Service Executive', company: 'Public Jobs IE', location: 'Dublin, Ireland', salary: '€50,000 - €65,000', description: 'Public Appointments Service hiring.', job_type: 'full_time' }
    ],
    CA: [
        { title: 'Policy Analyst', company: 'GC Jobs', location: 'Ottawa, Canada', salary: 'CAD 65,000 - CAD 85,000', description: 'Government of Canada seeking Policy Analysts.', job_type: 'full_time' }
    ],
    US: [
        { title: 'Program Analyst', company: 'USAJobs', location: 'Washington DC', salary: '$65,000 - $85,000', description: 'Federal agency seeking a Program Analyst.', job_type: 'full_time' }
    ],
    DE: [
        { title: 'Verwaltungsangestellter', company: 'Bundesagentur für Arbeit', location: 'Berlin, Germany', salary: '€40,000 - €50,000', description: 'Join the Bundesagentur für Arbeit.', job_type: 'full_time' }
    ],
    AU: [
        { title: 'APS Policy Officer', company: 'APS Jobs', location: 'Canberra, Australia', salary: 'AUD 70,000 - AUD 90,000', description: 'Join the Australian Public Service.', job_type: 'full_time' }
    ]
};

// ============================================
// SPONSORSHIP DETECTION
// ============================================

function detectSponsorshipEligibility(title, description, sourceConfig) {
    const text = `${title} ${description || ''}`.toLowerCase();
    
    if (sourceConfig?.sponsorship_keywords) {
        for (const keyword of sourceConfig.sponsorship_keywords) {
            if (text.includes(keyword.toLowerCase())) {
                return { eligible: true, keyword: keyword };
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
            return { eligible: true, keyword: keyword };
        }
    }
    
    return { eligible: false };
}

// ============================================
// PARSE RSS FEED (Browser-compatible - Fallback)
// ============================================

async function parseRSSFeed(feedUrl, sourceName, sourceCountry, sourceConfig) {
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
            
            const sponsorship = detectSponsorshipEligibility(title, description, sourceConfig);
            
            let jobType = 'full_time';
            const textLower = `${title} ${description}`.toLowerCase();
            if (textLower.includes('remote')) jobType = 'remote';
            else if (textLower.includes('part time')) jobType = 'part_time';
            else if (textLower.includes('contract')) jobType = 'contract';
            else if (textLower.includes('freelance')) jobType = 'freelance';
            else if (textLower.includes('hybrid')) jobType = 'hybrid';
            
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
            
            jobs.push({
                title: title.substring(0, 200),
                description: description.substring(0, 2000),
                external_url: link,
                salary_range: salaryRange,
                salary_min: salaryMin,
                salary_max: salaryMax,
                source_name: sourceName,
                source_country: sourceCountry,
                job_type: jobType,
                sponsorship_eligible: sponsorship.eligible
            });
        }
        
        return jobs;
    } catch (error) {
        console.error(`Error parsing RSS feed ${feedUrl}:`, error);
        return [];
    }
}

// ============================================
// USE MOCK JOBS AS FALLBACK
// ============================================

async function useMockJobs(results) {
    for (const [country, jobs] of Object.entries(MOCK_JOBS_BY_COUNTRY)) {
        for (const job of jobs) {
            const { data: existing } = await supabase
                .from('external_jobs')
                .select('id')
                .eq('title', job.title)
                .eq('source_name', job.company)
                .maybeSingle();
            
            if (!existing) {
                await supabase.from('external_jobs').insert({
                    title: job.title,
                    company: job.company,
                    location: job.location,
                    description: job.description,
                    salary_range: job.salary,
                    job_type: job.job_type,
                    source_country: country,
                    source_name: job.company,
                    status: 'pending_approval',
                    created_at: new Date().toISOString()
                });
                results.push({ source: job.company, job: job.title, status: 'added' });
            }
        }
    }
}

// ============================================
// FETCH EXTERNAL JOBS VIA API (Primary - No CORS)
// ============================================

export async function fetchExternalJobs(forceRefresh = false) {
    try {
        const response = await fetch('/api/fetch-jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ forceRefresh })
        });

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Fetch failed');
        }

        // Insert jobs into external_jobs table
        const results = { added: 0, exists: 0, errors: 0, details: [] };
        
        for (const job of data.jobs || []) {
            // Check if job already exists
            const { data: existing } = await supabase
                .from('external_jobs')
                .select('id')
                .eq('title', job.title)
                .eq('source_name', job.source_name)
                .maybeSingle();

            if (!existing) {
                const sponsorship = detectSponsorshipEligibility(job.title, job.description, null);
                const jobType = normalizeJobType(job.job_type);
                
                const { error } = await supabase
                    .from('external_jobs')
                    .insert({
                        title: job.title,
                        company: job.company,
                        location: job.location,
                        salary_range: job.salary_range,
                        description: job.description,
                        external_apply_url: job.external_url || job.source_url,
                        source_country: job.source_country,
                        source_name: job.source_name,
                        job_type: jobType,
                        sponsorship_eligible: sponsorship.eligible,
                        status: 'pending_approval',
                        created_at: new Date().toISOString()
                    });

                if (!error) {
                    results.added++;
                    results.details.push({ job: job.title, status: 'added', source: job.source_name });
                } else {
                    results.errors++;
                    results.details.push({ job: job.title, status: 'error', error: error.message });
                }
            } else {
                results.exists++;
                results.details.push({ job: job.title, status: 'exists', source: job.source_name });
            }
        }

        // Log the fetch
        try {
            await supabase.from('external_job_fetch_log').insert({
                source_name: 'api_fetch',
                fetch_status: results.added > 0 ? 'success' : (data.jobs?.length > 0 ? 'no_new_jobs' : 'failed'),
                jobs_fetched: data.jobs?.length || 0,
                jobs_new: results.added,
                details: results.details,
                created_at: new Date().toISOString()
            });
        } catch (logError) {
            console.warn('Failed to log fetch results:', logError.message);
        }

        return { 
            success: true, 
            results: results.details,
            totalAdded: results.added,
            totalExists: results.exists,
            totalErrors: results.errors,
            jobs: data.jobs 
        };

    } catch (error) {
        console.error('Fetch external jobs error:', error);
        
        // FALLBACK: Use RSS parsing directly
        console.log('⚠️ API failed, falling back to RSS parsing...');
        return await fetchExternalJobsRSS();
    }
}

// ============================================
// FETCH EXTERNAL JOBS VIA RSS (Fallback)
// ============================================

async function fetchExternalJobsRSS() {
    const allJobs = [];
    const results = [];
    
    console.log('🚀 Starting RSS job fetch (fallback)...');
    
    for (const [key, source] of Object.entries(RSS_FEEDS)) {
        if (!source.is_active) continue;
        
        console.log(`🔍 Fetching jobs from ${source.name}...`);
        const jobs = await parseRSSFeed(source.url, source.name, source.country, source);
        
        if (jobs.length === 0) {
            console.log(`⚠️ No jobs from ${source.name}`);
            continue;
        }
        
        for (const job of jobs) {
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
                    external_apply_url: job.external_url,
                    source_country: job.source_country,
                    source_name: job.source_name,
                    sponsorship_eligible: job.sponsorship_eligible,
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
    
    // If no jobs were added from RSS, use mock fallback
    if (allJobs.length === 0) {
        console.log('⚠️ No RSS jobs added, using mock fallback');
        await useMockJobs(results);
    }
    
    // Log fetch results
    try {
        await supabase.from('external_job_fetch_log').insert({
            source_name: 'rss_fallback',
            fetch_status: allJobs.length > 0 ? 'success' : 'no_new_jobs',
            jobs_fetched: allJobs.length,
            jobs_new: allJobs.length,
            details: results,
            created_at: new Date().toISOString()
        });
    } catch (logError) {
        console.warn('Failed to log fetch results:', logError.message);
    }
    
    const addedCount = results.filter(r => r.status === 'added').length;
    console.log(`📊 RSS fetch complete: ${addedCount} new jobs added`);
    
    return { jobs: allJobs, results, totalAdded: addedCount };
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

// ============================================
// APPROVE SINGLE JOB
// ============================================

export async function approveExternalJob(jobId) {
    // Get external job
    const { data: externalJob, error: fetchError } = await supabase
        .from('external_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
    
    if (fetchError) throw fetchError;
    
    const jobType = normalizeJobType(externalJob.job_type);
    
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

// ============================================
// REJECT JOB
// ============================================

export async function rejectExternalJob(jobId, reason = null) {
    const { error } = await supabase
        .from('external_jobs')
        .update({ 
            status: 'rejected', 
            rejection_reason: reason,
            reviewed_at: new Date().toISOString()
        })
        .eq('id', jobId);
    
    if (error) throw error;
    return { success: true };
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
// LOAD JOBS FROM SQL (Sync existing jobs)
// ============================================

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
// GET COMPREHENSIVE STATS
// ============================================

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

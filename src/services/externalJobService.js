// src/services/externalJobService.js
// FIXED: Added job type mapping, batch approval, and improved error handling

import { supabase } from '../lib/supabase';

// ============================================
// VALID JOB TYPES (Must match database constraint)
// ============================================

const VALID_JOB_TYPES = ['full_time', 'part_time', 'contract', 'freelance', 'remote', 'hybrid', 'onsite'];

function normalizeJobType(jobType) {
    if (!jobType) return 'full_time';
    
    const normalized = jobType.toLowerCase().trim().replace(/-/g, '_');
    
    if (VALID_JOB_TYPES.includes(normalized)) return normalized;
    
    // Mapping for common variations
    const mapping = {
        'fulltime': 'full_time',
        'full-time': 'full_time',
        'full time': 'full_time',
        'parttime': 'part_time',
        'part-time': 'part_time',
        'part time': 'part_time',
        'remote': 'remote',
        'work from home': 'remote',
        'wfh': 'remote',
        'hybrid': 'hybrid',
        'contract': 'contract',
        'freelance': 'freelance',
        'onsite': 'onsite',
        'on-site': 'onsite'
    };
    
    return mapping[normalized] || 'full_time';
}

// ============================================
// MOCK JOB DATA (With normalized job types)
// ============================================

const MOCK_JOBS_BY_COUNTRY = {
    GB: [
        { title: 'Policy Advisor', company: 'UK Civil Service', location: 'London, UK', salary: '£35,000 - £45,000', description: 'Join the UK Civil Service as a Policy Advisor.', job_type: 'full_time', source_url: 'https://www.civilservicejobs.gov.uk' },
        { title: 'NHS Administrator', company: 'NHS', location: 'Manchester, UK', salary: '£28,000 - £32,000', description: 'The NHS is seeking an experienced Administrator.', job_type: 'full_time', source_url: 'https://www.jobs.nhs.uk' },
        { title: 'Digital Marketing Manager', company: 'DWP Digital', location: 'Leeds, UK', salary: '£40,000 - £55,000', description: 'Lead digital marketing campaigns.', job_type: 'remote', source_url: 'https://www.dwp.gov.uk' }
    ],
    NG: [
        { title: 'Civil Service Officer', company: 'Federal Civil Service', location: 'Abuja, Nigeria', salary: '₦3,500,000 - ₦5,000,000', description: 'Join the Federal Civil Service.', job_type: 'full_time', source_url: 'https://www.fedcivilservice.gov.ng' },
        { title: 'IT Specialist', company: 'NITDA', location: 'Lagos, Nigeria', salary: '₦4,000,000 - ₦6,000,000', description: 'NITDA is hiring an IT Specialist.', job_type: 'full_time', source_url: 'https://www.nitda.gov.ng' }
    ],
    IE: [
        { title: 'Public Service Executive', company: 'Public Jobs IE', location: 'Dublin, Ireland', salary: '€35,000 - €45,000', description: 'Public Appointments Service hiring.', job_type: 'full_time', source_url: 'https://www.publicjobs.ie' },
        { title: 'Healthcare Assistant', company: 'HSE', location: 'Cork, Ireland', salary: '€28,000 - €32,000', description: 'Join the HSE as a Healthcare Assistant.', job_type: 'full_time', source_url: 'https://www.hse.ie' }
    ],
    CA: [
        { title: 'Policy Analyst', company: 'GC Jobs', location: 'Ottawa, Canada', salary: 'CAD 65,000 - CAD 85,000', description: 'Government of Canada hiring.', job_type: 'full_time', source_url: 'https://www.jobs.gc.ca' },
        { title: 'Software Developer', company: 'Government of Canada', location: 'Toronto, Canada', salary: 'CAD 75,000 - CAD 95,000', description: 'Join the digital team.', job_type: 'remote', source_url: 'https://www.canada.ca' }
    ],
    US: [
        { title: 'Program Analyst', company: 'USAJobs', location: 'Washington DC', salary: '$65,000 - $85,000', description: 'Federal agency seeking a Program Analyst.', job_type: 'full_time', source_url: 'https://www.usajobs.gov' },
        { title: 'IT Project Manager', company: 'State Department', location: 'Arlington, VA', salary: '$90,000 - $120,000', description: 'Lead IT projects.', job_type: 'full_time', source_url: 'https://careers.state.gov' }
    ],
    DE: [
        { title: 'Verwaltungsangestellter', company: 'Bundesagentur für Arbeit', location: 'Berlin, Germany', salary: '€40,000 - €50,000', description: 'Join the Bundesagentur für Arbeit.', job_type: 'full_time', source_url: 'https://www.arbeitsagentur.de' },
        { title: 'IT-Sicherheitsspezialist', company: 'Bund.de', location: 'Bonn, Germany', salary: '€55,000 - €70,000', description: 'IT Security Specialist needed.', job_type: 'full_time', source_url: 'https://www.bund.de' }
    ],
    AU: [
        { title: 'APS Policy Officer', company: 'APS Jobs', location: 'Canberra, Australia', salary: 'AUD 70,000 - AUD 90,000', description: 'Join the Australian Public Service.', job_type: 'full_time', source_url: 'https://www.apsjobs.gov.au' },
        { title: 'Workforce Consultant', company: 'Workforce Australia', location: 'Sydney, Australia', salary: 'AUD 65,000 - AUD 85,000', description: 'Workforce Australia hiring.', job_type: 'full_time', source_url: 'https://www.workforceaustralia.gov.au' }
    ]
};

// ============================================
// FETCH EXTERNAL JOBS (with normalized job types)
// ============================================

export async function fetchExternalJobs() {
    const results = [];
    const countries = ['GB', 'NG', 'IE', 'CA', 'US', 'DE', 'AU'];
    
    console.log('🔍 Starting external job fetch for', countries.length, 'countries');
    
    for (const country of countries) {
        try {
            const mockJobs = MOCK_JOBS_BY_COUNTRY[country] || [];
            
            for (const job of mockJobs) {
                // Normalize job type
                const normalizedJobType = normalizeJobType(job.job_type);
                
                // Check if job already exists
                const { data: existing } = await supabase
                    .from('external_jobs')
                    .select('id')
                    .eq('title', job.title)
                    .eq('company', job.company)
                    .eq('source_country', country)
                    .maybeSingle();
                
                if (!existing) {
                    const { error } = await supabase
                        .from('external_jobs')
                        .insert({
                            source_country: country,
                            source_name: `${country.toLowerCase()}_government`,
                            title: job.title,
                            company: job.company,
                            location: job.location,
                            salary_range: job.salary,
                            description: job.description,
                            job_type: normalizedJobType,
                            external_apply_url: job.source_url,
                            status: 'pending_approval'
                        });
                    
                    if (error) {
                        console.error(`Failed to add job:`, error);
                        results.push({ country, job: job.title, status: 'error', error: error.message });
                    } else {
                        results.push({ country, job: job.title, status: 'added' });
                    }
                } else {
                    results.push({ country, job: job.title, status: 'exists' });
                }
            }
        } catch (error) {
            results.push({ country, status: 'failed', error: error.message });
        }
    }
    
    // Log fetch results
    await supabase.from('external_job_fetch_log').insert({
        source_name: 'all_countries',
        fetch_status: 'success',
        jobs_fetched: results.filter(r => r.status === 'added').length,
        jobs_new: results.filter(r => r.status === 'added').length
    });
    
    return results;
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
    // First, get all pending jobs
    const { data: pendingJobs, error: fetchError } = await supabase
        .from('external_jobs')
        .select('id')
        .eq('status', 'pending_approval');
    
    if (fetchError) throw fetchError;
    
    const results = {
        total: pendingJobs.length,
        approved: 0,
        failed: 0,
        errors: []
    };
    
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
        .update({ status: 'rejected', rejection_reason: reason })
        .eq('id', jobId);
    
    if (error) throw error;
    return { success: true };
}

// ============================================
// LOAD JOBS DIRECTLY FROM SQL (Emergency bypass)
// ============================================

export async function loadJobsFromSQL() {
    // This function allows you to directly insert jobs from your SQL scripts
    // Useful for the jobs you already loaded via SQL
    
    const { data: existingJobs, error: fetchError } = await supabase
        .from('jobs')
        .select('id, title, company, source_type')
        .eq('source_type', 'authoritative');
    
    if (fetchError) throw fetchError;
    
    // Mark any jobs already in jobs table as approved in external_jobs
    for (const job of existingJobs) {
        await supabase
            .from('external_jobs')
            .update({ status: 'approved' })
            .eq('title', job.title)
            .eq('company', job.company)
            .is('status', null);
    }
    
    return { success: true, count: existingJobs.length };
}

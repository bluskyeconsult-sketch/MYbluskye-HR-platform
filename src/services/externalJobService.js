// src/services/externalJobService.js
// SERVICE FOR MANAGING EXTERNAL JOBS (GOVERNMENT SOURCES)

import { supabase } from '../lib/supabase';

// ============================================
// MOCK JOB DATA FOR 7 COUNTRIES
// These are example jobs - you can replace with real API sources later
// ============================================

const MOCK_JOBS_BY_COUNTRY = {
    // United Kingdom
    GB: [
        {
            title: 'Policy Advisor',
            company: 'UK Civil Service',
            location: 'London, UK',
            salary: '£35,000 - £45,000',
            description: 'Join the UK Civil Service as a Policy Advisor. You will help shape government policies and implement strategic initiatives.',
            job_type: 'full_time',
            source_url: 'https://www.civilservicejobs.gov.uk'
        },
        {
            title: 'NHS Administrator',
            company: 'National Health Service (NHS)',
            location: 'Manchester, UK',
            salary: '£28,000 - £32,000',
            description: 'The NHS is seeking an experienced Administrator to manage daily operations and coordinate patient services.',
            job_type: 'full_time',
            source_url: 'https://www.jobs.nhs.uk'
        },
        {
            title: 'Digital Marketing Manager',
            company: 'DWP Digital',
            location: 'Leeds, UK (Remote options available)',
            salary: '£40,000 - £55,000',
            description: 'Lead digital marketing campaigns for the Department for Work and Pensions. Experience with analytics and SEO required.',
            job_type: 'remote',
            source_url: 'https://www.dwp.gov.uk'
        }
    ],
    
    // Nigeria
    NG: [
        {
            title: 'Civil Service Officer',
            company: 'Federal Civil Service Commission',
            location: 'Abuja, Nigeria',
            salary: '₦3,500,000 - ₦5,000,000',
            description: 'Join the Federal Civil Service as an Officer. Responsibilities include policy implementation and administrative coordination.',
            job_type: 'full_time',
            source_url: 'https://www.fedcivilservice.gov.ng'
        },
        {
            title: 'IT Specialist',
            company: 'National Information Technology Development Agency (NITDA)',
            location: 'Lagos, Nigeria',
            salary: '₦4,000,000 - ₦6,000,000',
            description: 'NITDA is hiring an IT Specialist to support digital transformation initiatives across government agencies.',
            job_type: 'full_time',
            source_url: 'https://www.nitda.gov.ng'
        }
    ],
    
    // Ireland
    IE: [
        {
            title: 'Public Service Executive',
            company: 'Public Jobs Ireland',
            location: 'Dublin, Ireland',
            salary: '€35,000 - €45,000',
            description: 'The Public Appointments Service is seeking an Executive Officer to join their team.',
            job_type: 'full_time',
            source_url: 'https://www.publicjobs.ie'
        },
        {
            title: 'Healthcare Assistant',
            company: 'Health Service Executive (HSE)',
            location: 'Cork, Ireland',
            salary: '€28,000 - €32,000',
            description: 'Join the HSE as a Healthcare Assistant. Provide quality care to patients in a supportive environment.',
            job_type: 'full_time',
            source_url: 'https://www.hse.ie'
        }
    ],
    
    // Canada
    CA: [
        {
            title: 'Policy Analyst',
            company: 'Government of Canada - GC Jobs',
            location: 'Ottawa, ON, Canada',
            salary: 'CAD 65,000 - CAD 85,000',
            description: 'The Government of Canada is hiring a Policy Analyst to support policy development and research initiatives.',
            job_type: 'full_time',
            source_url: 'https://www.jobs.gc.ca'
        },
        {
            title: 'Software Developer',
            company: 'Government of Canada (Digital Branch)',
            location: 'Toronto, ON, Canada (Remote)',
            salary: 'CAD 75,000 - CAD 95,000',
            description: 'Join the digital team as a Software Developer. Work on modernizing government services.',
            job_type: 'remote',
            source_url: 'https://www.canada.ca'
        }
    ],
    
    // United States
    US: [
        {
            title: 'Program Analyst',
            company: 'USAJobs - Federal Government',
            location: 'Washington, DC, USA',
            salary: '$65,000 - $85,000',
            description: 'Federal agency seeking a Program Analyst to support program management and performance tracking.',
            job_type: 'full_time',
            source_url: 'https://www.usajobs.gov'
        },
        {
            title: 'IT Project Manager',
            company: 'US Department of State',
            location: 'Arlington, VA, USA',
            salary: '$90,000 - $120,000',
            description: 'Lead IT projects for the Department of State. PMP certification preferred.',
            job_type: 'full_time',
            source_url: 'https://careers.state.gov'
        }
    ],
    
    // Germany
    DE: [
        {
            title: 'Verwaltungsangestellter (Administrative Employee)',
            company: 'Bundesagentur für Arbeit',
            location: 'Berlin, Germany',
            salary: '€40,000 - €50,000',
            description: 'Die Bundesagentur für Arbeit sucht einen Verwaltungsangestellten für die Abteilung Personalmanagement.',
            job_type: 'full_time',
            source_url: 'https://www.arbeitsagentur.de'
        },
        {
            title: 'IT-Sicherheitsspezialist (IT Security Specialist)',
            company: 'Bund.de - German Federal Government',
            location: 'Bonn, Germany',
            salary: '€55,000 - €70,000',
            description: 'Wir suchen einen IT-Sicherheitsspezialisten für das Bundesamt für Sicherheit.',
            job_type: 'full_time',
            source_url: 'https://www.bund.de'
        }
    ],
    
    // Australia
    AU: [
        {
            title: 'APS Policy Officer',
            company: 'Australian Public Service (APS Jobs)',
            location: 'Canberra, ACT, Australia',
            salary: 'AUD 70,000 - AUD 90,000',
            description: 'Join the Australian Public Service as a Policy Officer. Support policy development and implementation.',
            job_type: 'full_time',
            source_url: 'https://www.apsjobs.gov.au'
        },
        {
            title: 'Workforce Australia Consultant',
            company: 'Workforce Australia',
            location: 'Sydney, NSW, Australia',
            salary: 'AUD 65,000 - AUD 85,000',
            description: 'Workforce Australia is hiring a Consultant to support employment services and job matching.',
            job_type: 'full_time',
            source_url: 'https://www.workforceaustralia.gov.au'
        }
    ]
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function parseSalary(salaryRange) {
    if (!salaryRange) return { min: null, max: null };
    
    const numbers = salaryRange.match(/[\d,]+/g);
    if (numbers && numbers.length >= 1) {
        const min = parseFloat(numbers[0].replace(/,/g, ''));
        const max = numbers.length >= 2 ? parseFloat(numbers[1].replace(/,/g, '')) : min;
        return { min, max };
    }
    return { min: null, max: null };
}

function getSourceName(countryCode) {
    const sources = {
        GB: 'civilservice_uk',
        NG: 'fedcivilservice_ng',
        IE: 'publicjobs_ie',
        CA: 'gc_jobs',
        US: 'usajobs',
        DE: 'bund_karriere',
        AU: 'aps_jobs'
    };
    return sources[countryCode] || 'government_jobs';
}

// ============================================
// FETCH EXTERNAL JOBS (Uses sample data - safe replacement for broken API)
// ============================================

export async function fetchExternalJobs() {
    const results = [];
    const countries = ['GB', 'NG', 'IE', 'CA', 'US', 'DE', 'AU'];
    
    console.log('🔍 Starting external job fetch for', countries.length, 'countries');
    
    for (const country of countries) {
        try {
            const mockJobs = MOCK_JOBS_BY_COUNTRY[country] || [];
            console.log(`📋 Found ${mockJobs.length} jobs for country ${country}`);
            
            for (const job of mockJobs) {
                // Check if this job already exists in database
                const { data: existing, error: checkError } = await supabase
                    .from('external_jobs')
                    .select('id')
                    .eq('title', job.title)
                    .eq('company', job.company)
                    .eq('source_country', country)
                    .maybeSingle();
                
                if (checkError) {
                    console.warn('Error checking existing job:', checkError);
                }
                
                // Parse salary into min/max
                const { min: salaryMin, max: salaryMax } = parseSalary(job.salary);
                
                // Only add if not already exists
                if (!existing) {
                    const { error: insertError } = await supabase
                        .from('external_jobs')
                        .insert({
                            source_country: country,
                            source_name: getSourceName(country),
                            title: job.title,
                            company: job.company,
                            location: job.location,
                            salary_range: job.salary,
                            salary_min: salaryMin,
                            salary_max: salaryMax,
                            description: job.description,
                            job_type: job.job_type,
                            external_apply_url: job.source_url,
                            status: 'pending_approval'
                        });
                    
                    if (insertError) {
                        console.error(`❌ Failed to add job ${job.title}:`, insertError);
                        results.push({ country, job: job.title, status: 'error', error: insertError.message });
                    } else {
                        console.log(`✅ Added new job: ${job.title} (${country})`);
                        results.push({ country, job: job.title, status: 'added' });
                    }
                } else {
                    console.log(`⏭️ Job already exists: ${job.title} (${country})`);
                    results.push({ country, job: job.title, status: 'exists' });
                }
            }
        } catch (error) {
            console.error(`❌ Failed to process country ${country}:`, error);
            results.push({ country, status: 'failed', error: error.message });
        }
    }
    
    // Log the fetch results to database for audit
    const addedCount = results.filter(r => r.status === 'added').length;
    const existsCount = results.filter(r => r.status === 'exists').length;
    const errorCount = results.filter(r => r.status === 'error' || r.status === 'failed').length;
    
    await supabase.from('external_job_fetch_log').insert({
        source_name: 'all_countries_mock',
        fetch_status: errorCount === 0 ? 'success' : (addedCount > 0 ? 'partial' : 'failed'),
        jobs_fetched: addedCount,
        jobs_new: addedCount,
        jobs_existing: existsCount,
        errors: errorCount,
        details: { countries_processed: countries, results: results }
    });
    
    console.log(`📊 Fetch complete: ${addedCount} added, ${existsCount} existing, ${errorCount} errors`);
    
    return results;
}

// ============================================
// GET PENDING JOBS FOR ADMIN REVIEW
// ============================================

export async function getPendingExternalJobs() {
    const { data, error } = await supabase
        .from('external_jobs')
        .select('*')
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error fetching pending jobs:', error);
        throw error;
    }
    
    console.log(`📋 Found ${data?.length || 0} pending jobs for review`);
    return data || [];
}

// ============================================
// APPROVE A JOB (Uses database function created in Step 1)
// ============================================

export async function approveExternalJob(jobId) {
    console.log(`✅ Approving job: ${jobId}`);
    
    // This calls the database function we created in Step 1
    const { data, error } = await supabase
        .rpc('approve_external_job', { job_id: jobId });
    
    if (error) {
        console.error('❌ Approve failed:', error);
        throw new Error(error.message || 'Failed to approve job');
    }
    
    console.log(`✅ Job approved successfully! New job ID: ${data}`);
    return { success: true, jobId: data };
}

// ============================================
// REJECT A JOB
// ============================================

export async function rejectExternalJob(jobId, reason = null) {
    console.log(`❌ Rejecting job: ${jobId}${reason ? ` - Reason: ${reason}` : ''}`);
    
    const { error } = await supabase
        .from('external_jobs')
        .update({ 
            status: 'rejected',
            rejection_reason: reason,
            updated_at: new Date().toISOString()
        })
        .eq('id', jobId);
    
    if (error) {
        console.error('Reject failed:', error);
        throw error;
    }
    
    console.log(`✅ Job rejected successfully`);
    return { success: true };
}

// ============================================
// GET SPECIFIC EXTERNAL JOB BY ID
// ============================================

export async function getExternalJobById(jobId) {
    const { data, error } = await supabase
        .from('external_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
    
    if (error) throw error;
    return data;
}

// ============================================
// MANUALLY TRIGGER JOB FETCH (Admin function)
// ============================================

export async function triggerJobFetch() {
    console.log('🚀 Manually triggering job fetch...');
    
    const results = await fetchExternalJobs();
    
    return {
        success: true,
        message: `Job fetch completed. Added: ${results.filter(r => r.status === 'added').length}, Existing: ${results.filter(r => r.status === 'exists').length}, Errors: ${results.filter(r => r.status === 'error' || r.status === 'failed').length}`,
        details: results
    };
}

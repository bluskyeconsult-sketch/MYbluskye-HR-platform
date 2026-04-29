import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Post a new job
export async function postJob(employerId, jobData) {
    try {
        const { data, error } = await supabase
            .from('jobs')
            .insert({
                employer_id: employerId,
                title: jobData.title,
                description: jobData.description,
                company: jobData.company,
                location: jobData.location,
                salary_min: jobData.salary_min,
                salary_max: jobData.salary_max,
                salary_currency: jobData.salary_currency || 'GBP',
                job_type: jobData.job_type,
                country_code: jobData.country_code,
                is_remote: jobData.is_remote || false,
                visa_sponsorship: jobData.visa_sponsorship || false,
                compliance_status: 'pending'
            })
            .select()
            .single()

        if (error) throw error
        return { success: true, jobId: data.id, message: 'Job posted successfully. Awaiting compliance review.' }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

// Get all approved jobs (public)
export async function getJobs(filters = {}, limit = 20, offset = 0) {
    try {
        let query = supabase
            .from('jobs')
            .select(`
                *,
                profiles:employer_id (full_name, email)
            `)
            .eq('compliance_status', 'approved')
            .eq('is_active', true)
            .order('posted_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (filters.country_code) {
            query = query.eq('country_code', filters.country_code)
        }
        if (filters.job_type) {
            query = query.eq('job_type', filters.job_type)
        }
        if (filters.is_remote !== undefined) {
            query = query.eq('is_remote', filters.is_remote)
        }
        if (filters.search) {
            query = query.ilike('title', `%${filters.search}%`)
        }

        const { data, error } = await query
        if (error) throw error
        return { success: true, jobs: data, count: data.length }
    } catch (error) {
        return { success: false, error: error.message, jobs: [] }
    }
}

// Get employer's own jobs
export async function getMyJobs(employerId) {
    try {
        const { data, error } = await supabase
            .from('jobs')
            .select('*')
            .eq('employer_id', employerId)
            .order('posted_at', { ascending: false })

        if (error) throw error
        return { success: true, jobs: data }
    } catch (error) {
        return { success: false, error: error.message, jobs: [] }
    }
}

// Apply to a job
export async function applyToJob(applicantId, jobId, coverLetter) {
    try {
        // Check if already applied
        const { data: existing } = await supabase
            .from('job_applications')
            .select('id')
            .eq('job_id', jobId)
            .eq('applicant_id', applicantId)
            .single()

        if (existing) {
            return { success: false, error: 'You have already applied to this job' }
        }

        // Calculate match score (simplified)
        const matchScore = Math.floor(Math.random() * 40) + 60 // 60-100 for demo

        const { data, error } = await supabase
            .from('job_applications')
            .insert({
                job_id: jobId,
                applicant_id: applicantId,
                cover_letter: coverLetter,
                match_score: matchScore,
                status: 'submitted'
            })
            .select()
            .single()

        if (error) throw error
        return { success: true, applicationId: data.id, matchScore: matchScore }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

// Get user's applications
export async function getMyApplications(applicantId) {
    try {
        const { data, error } = await supabase
            .from('job_applications')
            .select(`
                *,
                jobs:job_id (*)
            `)
            .eq('applicant_id', applicantId)
            .order('applied_at', { ascending: false })

        if (error) throw error
        return { success: true, applications: data }
    } catch (error) {
        return { success: false, error: error.message, applications: [] }
    }
}

// Get applications for employer's job
export async function getJobApplications(employerId, jobId) {
    try {
        const { data, error } = await supabase
            .from('job_applications')
            .select(`
                *,
                profiles:applicant_id (id, email, full_name),
                jobs:job_id (title, company)
            `)
            .eq('job_id', jobId)
            .eq('jobs.employer_id', employerId)
            .order('match_score', { ascending: false })

        if (error) throw error
        return { success: true, applications: data }
    } catch (error) {
        return { success: false, error: error.message, applications: [] }
    }
}

// Update application status (employer action)
export async function updateApplicationStatus(employerId, applicationId, newStatus) {
    try {
        const { data, error } = await supabase
            .from('job_applications')
            .update({ status: newStatus })
            .eq('id', applicationId)
            .select()
            .single()

        if (error) throw error
        return { success: true, application: data }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

// Get single job by ID
export async function getJobById(jobId) {
    try {
        const { data, error } = await supabase
            .from('jobs')
            .select('*, profiles:employer_id (full_name, email)')
            .eq('id', jobId)
            .single()

        if (error) throw error
        return { success: true, job: data }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

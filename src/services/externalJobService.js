// src/services/externalJobService.js
// COMPLETE SERVICE WITH ALL EXPORTS

import { supabase } from '../lib/supabase';

// ============================================
// CONSTANTS
// ============================================

const ADMIN_EMAIL = 'bluskyeconsult@gmail.com';
const RSS_FEEDS = [
    {
        name: 'UK Government Jobs',
        url: 'https://www.find-government-jobs.service.gov.uk/api/v1/jobs.rss',
        country: 'GB'
    },
    {
        name: 'US Government Jobs',
        url: 'https://www.usajobs.gov/api/jobs.rss',
        country: 'US'
    },
    {
        name: 'Canada Government Jobs',
        url: 'https://www.canada.ca/content/dam/cra-arc/jobs.xml',
        country: 'CA'
    },
    {
        name: 'Australia Government Jobs',
        url: 'https://www.apsjobs.gov.au/api/jobs.rss',
        country: 'AU'
    },
    {
        name: 'Nigeria Government Jobs',
        url: 'https://www.federalcharacter.gov.ng/api/jobs.rss',
        country: 'NG'
    }
];

// ============================================
// HELPER FUNCTIONS
// ============================================

const isAdmin = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        return user?.email === ADMIN_EMAIL;
    } catch {
        return false;
    }
};

const getCurrentUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
};

// ============================================
// GET PENDING JOBS
// ============================================

export async function getPendingExternalJobs() {
    try {
        const { data, error } = await supabase
            .from('jobs')
            .select('*')
            .eq('compliance_status', 'pending')
            .eq('status', 'draft')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching pending jobs:', error);
        return [];
    }
}

// ============================================
// APPROVE SINGLE JOB
// ============================================

export async function approveExternalJob(jobId) {
    try {
        const adminCheck = await isAdmin();
        if (!adminCheck) {
            return { success: false, error: 'Unauthorized: Admin only' };
        }

        const userId = await getCurrentUserId();

        const { data, error } = await supabase
            .from('jobs')
            .update({
                compliance_status: 'approved',
                status: 'active',
                is_active: true,
                approved_by: userId,
                approved_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', jobId)
            .select()
            .single();

        if (error) throw error;
        
        console.log(`✅ Job approved: ${data.title}`);
        return { success: true, data };
    } catch (error) {
        console.error('Error approving job:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// BATCH APPROVE JOBS
// ============================================

export async function batchApproveExternalJobs(jobIds = null) {
    try {
        const adminCheck = await isAdmin();
        if (!adminCheck) {
            return { success: false, error: 'Unauthorized: Admin only', approved: 0, failed: 0 };
        }

        // If no jobIds provided, get all pending jobs
        let idsToApprove = jobIds;
        if (!idsToApprove || idsToApprove.length === 0) {
            const { data: pendingJobs } = await supabase
                .from('jobs')
                .select('id')
                .eq('compliance_status', 'pending');
            
            idsToApprove = pendingJobs?.map(job => job.id) || [];
        }

        if (idsToApprove.length === 0) {
            return { success: true, approved: 0, failed: 0, message: 'No pending jobs to approve' };
        }

        const userId = await getCurrentUserId();
        const now = new Date().toISOString();
        
        const { error } = await supabase
            .from('jobs')
            .update({
                compliance_status: 'approved',
                status: 'active',
                is_active: true,
                approved_by: userId,
                approved_at: now,
                updated_at: now
            })
            .in('id', idsToApprove)
            .eq('compliance_status', 'pending');

        if (error) throw error;

        console.log(`✅ Batch approved ${idsToApprove.length} jobs`);
        return { success: true, approved: idsToApprove.length, failed: 0 };
    } catch (error) {
        console.error('Batch approval error:', error);
        return { success: false, error: error.message, approved: 0, failed: 0 };
    }
}

// ============================================
// REJECT JOB
// ============================================

export async function rejectExternalJob(jobId, reason = '') {
    try {
        const adminCheck = await isAdmin();
        if (!adminCheck) {
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
        
        console.log(`❌ Job rejected: ${data.title}`);
        return { success: true, data };
    } catch (error) {
        console.error('Error rejecting job:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// LOAD JOBS FROM SQL (Sync existing jobs)
// ============================================

export async function loadJobsFromSQL() {
    try {
        const adminCheck = await isAdmin();
        if (!adminCheck) {
            return { success: false, error: 'Unauthorized: Admin only', count: 0 };
        }

        // Get all jobs that are pending
        const { data: pendingJobs, error: fetchError } = await supabase
            .from('jobs')
            .select('id')
            .eq('compliance_status', 'pending');

        if (fetchError) throw fetchError;

        if (!pendingJobs || pendingJobs.length === 0) {
            return { success: true, count: 0, message: 'No pending jobs to sync' };
        }

        const userId = await getCurrentUserId();
        const now = new Date().toISOString();
        
        // Update all pending jobs to approved
        const { error: updateError } = await supabase
            .from('jobs')
            .update({
                compliance_status: 'approved',
                status: 'active',
                is_active: true,
                approved_by: userId,
                approved_at: now,
                updated_at: now
            })
            .eq('compliance_status', 'pending');

        if (updateError) throw updateError;

        console.log(`✅ Synced ${pendingJobs.length} jobs from SQL`);
        return { success: true, count: pendingJobs.length };
    } catch (error) {
        console.error('Error syncing jobs from SQL:', error);
        return { success: false, error: error.message, count: 0 };
    }
}

// ============================================
// FETCH RSS JOBS
// ============================================

export async function fetchExternalJobs() {
    const results = [];
    let totalAdded = 0;

    for (const feed of RSS_FEEDS) {
        try {
            console.log(`📡 Fetching from ${feed.name}...`);
            
            const response = await fetch('/api/fetch-rss', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: feed.url,
                    source: feed.name,
                    country: feed.country
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            results.push({
                source: feed.name,
                status: 'success',
                jobsAdded: data.added || 0,
                total: data.total || 0
            });
            
            totalAdded += data.added || 0;
            console.log(`✅ ${feed.name}: Added ${data.added || 0} new jobs`);
            
        } catch (error) {
            console.error(`❌ Error fetching from ${feed.name}:`, error.message);
            results.push({
                source: feed.name,
                status: 'error',
                error: error.message
            });
        }
    }

    // Log the fetch results
    try {
        await supabase
            .from('external_job_fetch_log')
            .insert({
                source: 'rss_batch',
                status: totalAdded > 0 ? 'success' : 'partial',
                jobs_fetched: totalAdded,
                completed_at: new Date().toISOString()
            });
    } catch (logError) {
        console.warn('Could not log fetch results:', logError.message);
    }

    return {
        success: true,
        totalAdded,
        results
    };
}

// ============================================
// GET JOB STATS
// ============================================

export async function getExternalJobsStats() {
    try {
        const { data, error } = await supabase
            .from('jobs')
            .select('compliance_status, status');

        if (error) throw error;

        const stats = {
            pending: 0,
            approved: 0,
            rejected: 0,
            active: 0,
            total: data?.length || 0
        };

        data?.forEach(job => {
            if (job.compliance_status === 'pending') stats.pending++;
            if (job.compliance_status === 'approved') stats.approved++;
            if (job.compliance_status === 'rejected') stats.rejected++;
            if (job.status === 'active') stats.active++;
        });

        return stats;
    } catch (error) {
        console.error('Error fetching stats:', error);
        return { pending: 0, approved: 0, rejected: 0, active: 0, total: 0 };
    }
}

// ============================================
// TRIGGER JOB FETCH (Server-side)
// ============================================

export async function triggerJobFetch() {
    try {
        const adminCheck = await isAdmin();
        if (!adminCheck) {
            return { success: false, error: 'Unauthorized: Admin only' };
        }

        const response = await fetch('/api/fetch-jobs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return { success: true, ...data };
    } catch (error) {
        console.error('Error triggering job fetch:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// EXPORTS
// ============================================

export default {
    getPendingExternalJobs,
    approveExternalJob,
    rejectExternalJob,
    batchApproveExternalJobs,
    fetchExternalJobs,
    loadJobsFromSQL,
    getExternalJobsStats,
    triggerJobFetch
};

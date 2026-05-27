// src/services/externalJobService.js
// DEFINITIVE UNIFIED SERVICE - Single source of truth

import { supabase } from '../lib/supabase';

// ============================================
// CONSTANTS
// ============================================

const ADMIN_EMAIL = 'bluskyeconsult@gmail.com';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// RSS Feed Sources
const RSS_FEEDS = [
    { name: 'UK Government Jobs', url: 'https://www.find-government-jobs.service.gov.uk/api/v1/jobs.rss', country: 'GB' },
    { name: 'US Government Jobs', url: 'https://www.usajobs.gov/api/jobs.rss', country: 'US' },
    { name: 'Canada Government Jobs', url: 'https://www.canada.ca/content/dam/cra-arc/jobs.xml', country: 'CA' },
    { name: 'Australia Government Jobs', url: 'https://www.apsjobs.gov.au/api/jobs.rss', country: 'AU' },
    { name: 'Nigeria Government Jobs', url: 'https://www.federalcharacter.gov.ng/api/jobs.rss', country: 'NG' }
];

// Cache storage
let jobsCache = { data: null, timestamp: null };
let sourcesCache = { data: null, timestamp: null };

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

const isCacheValid = (cache) => {
    return cache.data && (Date.now() - cache.timestamp) < CACHE_DURATION;
};

// ============================================
// PUBLIC METHODS (For job seekers)
// ============================================

export async function getExternalJobs(filters = {}) {
    try {
        // Check cache
        if (isCacheValid(jobsCache)) {
            return filterJobs(jobsCache.data, filters);
        }

        let query = supabase
            .from('jobs')
            .select('*')
            .eq('compliance_status', 'approved')
            .eq('status', 'active')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(filters.limit || 50);

        if (filters.source) query = query.eq('source_name', filters.source);
        if (filters.jobType) query = query.eq('job_type', filters.jobType);
        if (filters.location) query = query.ilike('location', `%${filters.location}%`);

        const { data, error } = await query;
        if (error) throw error;

        jobsCache = { data, timestamp: Date.now() };
        return filterJobs(data, filters);
    } catch (error) {
        console.error('Error fetching external jobs:', error);
        return [];
    }
}

export async function getJobSources() {
    try {
        if (isCacheValid(sourcesCache)) {
            return sourcesCache.data;
        }

        const { data, error } = await supabase
            .from('jobs')
            .select('source_name', { distinct: true })
            .eq('compliance_status', 'approved')
            .eq('status', 'active');

        if (error) throw error;
        
        const sources = data?.map(item => item.source_name).filter(Boolean) || [];
        sourcesCache = { data: sources, timestamp: Date.now() };
        
        return sources;
    } catch (error) {
        console.error('Error fetching job sources:', error);
        return [];
    }
}

export async function getJobById(id) {
    try {
        const { data, error } = await supabase
            .from('jobs')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        const adminCheck = await isAdmin();
        if (!adminCheck && data.compliance_status !== 'approved') {
            return null;
        }

        return data;
    } catch (error) {
        console.error('Error fetching job:', error);
        return null;
    }
}

function filterJobs(jobs, filters) {
    let filtered = [...jobs];
    if (filters.category) {
        filtered = filtered.filter(j => j.category === filters.category);
    }
    return filtered;
}

// ============================================
// ADMIN METHODS (For job approval)
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

export async function approveExternalJob(jobId) {
    try {
        if (!await isAdmin()) {
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
        
        // Clear caches
        jobsCache = { data: null, timestamp: null };
        sourcesCache = { data: null, timestamp: null };
        
        return { success: true, data };
    } catch (error) {
        console.error('Error approving job:', error);
        return { success: false, error: error.message };
    }
}

export async function batchApproveExternalJobs(jobIds = null) {
    try {
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

        // Clear caches
        jobsCache = { data: null, timestamp: null };
        sourcesCache = { data: null, timestamp: null };

        return { success: true, approved: idsToApprove.length, failed: 0 };
    } catch (error) {
        console.error('Batch approval error:', error);
        return { success: false, error: error.message, approved: 0, failed: 0 };
    }
}

export async function rejectExternalJob(jobId, reason = '') {
    try {
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

        // Clear caches
        jobsCache = { data: null, timestamp: null };
        sourcesCache = { data: null, timestamp: null };

        return { success: true, data };
    } catch (error) {
        console.error('Error rejecting job:', error);
        return { success: false, error: error.message };
    }
}

export async function loadJobsFromSQL() {
    try {
        if (!await isAdmin()) {
            return { success: false, error: 'Unauthorized: Admin only', count: 0 };
        }

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

        // Clear caches
        jobsCache = { data: null, timestamp: null };
        sourcesCache = { data: null, timestamp: null };

        return { success: true, count: pendingJobs.length };
    } catch (error) {
        console.error('Error syncing jobs from SQL:', error);
        return { success: false, error: error.message, count: 0 };
    }
}

// ============================================
// FETCH METHODS (RSS)
// ============================================

export async function fetchExternalJobs() {
    const results = [];
    let totalAdded = 0;

    for (const feed of RSS_FEEDS) {
        try {
            console.log(`📡 Fetching from ${feed.name}...`);
            
            const response = await fetch('/api/fetch-rss', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: feed.url,
                    source: feed.name,
                    country: feed.country
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

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

    // Log results
    try {
        await supabase.from('external_job_fetch_log').insert({
            source: 'rss_batch',
            status: totalAdded > 0 ? 'success' : 'partial',
            jobs_fetched: totalAdded,
            completed_at: new Date().toISOString()
        });
    } catch (logError) {
        console.warn('Could not log fetch results:', logError.message);
    }

    return { success: true, totalAdded, results };
}

export async function triggerJobFetch() {
    try {
        if (!await isAdmin()) {
            return { success: false, error: 'Unauthorized: Admin only' };
        }

        const response = await fetch('/api/fetch-jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        return { success: true, ...data };
    } catch (error) {
        console.error('Error triggering job fetch:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// STATS METHODS
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
// CACHE MANAGEMENT
// ============================================

export function clearJobsCache() {
    jobsCache = { data: null, timestamp: null };
    sourcesCache = { data: null, timestamp: null };
    console.log('Jobs cache cleared');
}

// ============================================
// DEFAULT EXPORT
// ============================================

export default {
    // Public methods
    getExternalJobs,
    getJobSources,
    getJobById,
    // Admin methods
    getPendingExternalJobs,
    approveExternalJob,
    batchApproveExternalJobs,
    rejectExternalJob,
    loadJobsFromSQL,
    // Fetch methods
    fetchExternalJobs,
    triggerJobFetch,
    // Stats & cache
    getExternalJobsStats,
    clearJobsCache
};

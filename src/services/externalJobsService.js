// src/services/externalJobsService.js
// COMPLETE EXTERNAL JOBS SERVICE - Filtering, admin actions, and proper error handling

import { supabase } from '../lib/supabase';

// ============================================
// CONSTANTS
// ============================================

const ADMIN_EMAIL = 'bluskyeconsult@gmail.com';
const DEFAULT_LIMIT = 50;
const DEFAULT_PAGE = 1;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if current user is admin
 */
const isAdmin = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        return user?.email === ADMIN_EMAIL;
    } catch {
        return false;
    }
};

/**
 * Get current user ID
 */
const getCurrentUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
};

// ============================================
// MAIN SERVICE CLASS
// ============================================

class ExternalJobsService {
    /**
     * Get external jobs with filters
     * @param {Object} filters - Filter options
     * @param {string} filters.source - Job source name
     * @param {string} filters.jobType - Job type (full_time, part_time, etc.)
     * @param {string} filters.location - Location search term
     * @param {string} filters.status - Job status (pending_approval, approved, rejected)
     * @param {number} filters.limit - Results limit (default: 50)
     * @param {number} filters.page - Page number for pagination
     */
    async getExternalJobs(filters = {}) {
        try {
            let query = supabase
                .from('external_jobs')
                .select('*')
                .eq('is_active', true)
                .order('posted_date', { ascending: false })
                .limit(filters.limit || DEFAULT_LIMIT);

            // Apply pagination
            if (filters.page && filters.page > 1) {
                const offset = (filters.page - 1) * (filters.limit || DEFAULT_LIMIT);
                query = query.range(offset, offset + (filters.limit || DEFAULT_LIMIT) - 1);
            }

            // Apply filters
            if (filters.source) {
                query = query.eq('source_name', filters.source);
            }

            if (filters.jobType) {
                query = query.eq('job_type', filters.jobType);
            }

            if (filters.location) {
                query = query.ilike('location', `%${filters.location}%`);
            }

            if (filters.status) {
                query = query.eq('status', filters.status);
            }

            // Admin can see all, regular users only see approved
            const userIsAdmin = await isAdmin();
            if (!userIsAdmin && !filters.status) {
                query = query.eq('status', 'approved');
            }

            const { data, error } = await query;

            if (error) throw error;
            return { success: true, data: data || [], error: null };
        } catch (error) {
            console.error('Error fetching external jobs:', error);
            return { success: false, data: [], error: error.message };
        }
    }

    /**
     * Get jobs by status (admin only for non-approved)
     * @param {string} status - pending_approval, approved, rejected
     */
    async getJobsByStatus(status) {
        const userIsAdmin = await isAdmin();
        
        // Only admins can see pending or rejected jobs
        if (status !== 'approved' && !userIsAdmin) {
            return { success: false, data: [], error: 'Unauthorized: Admin only' };
        }

        return this.getExternalJobs({ status });
    }

    /**
     * Get pending approval jobs (admin only)
     */
    async getPendingJobs() {
        return this.getJobsByStatus('pending_approval');
    }

    /**
     * Get approved jobs
     */
    async getApprovedJobs() {
        return this.getJobsByStatus('approved');
    }

    /**
     * Get rejected jobs (admin only)
     */
    async getRejectedJobs() {
        return this.getJobsByStatus('rejected');
    }

    /**
     * Get unique job sources for filter dropdown
     */
    async getJobSources() {
        try {
            const { data, error } = await supabase
                .from('external_jobs')
                .select('source_name', { distinct: true })
                .eq('is_active', true)
                .order('source_name', { ascending: true });

            if (error) throw error;
            return { success: true, data: data?.map(item => item.source_name) || [], error: null };
        } catch (error) {
            console.error('Error fetching job sources:', error);
            return { success: false, data: [], error: error.message };
        }
    }

    /**
     * Get unique job types for filter dropdown
     */
    async getJobTypes() {
        try {
            const { data, error } = await supabase
                .from('external_jobs')
                .select('job_type', { distinct: true })
                .eq('is_active', true)
                .order('job_type', { ascending: true });

            if (error) throw error;
            return { success: true, data: data?.map(item => item.job_type).filter(Boolean) || [], error: null };
        } catch (error) {
            console.error('Error fetching job types:', error);
            return { success: false, data: [], error: error.message };
        }
    }

    /**
     * Search jobs by title and source
     * @param {string} title - Job title search term
     * @param {string} sourceName - Source name filter
     * @param {number} limit - Results limit
     */
    async searchJobs(title = '', sourceName = '', limit = 20) {
        try {
            let query = supabase
                .from('external_jobs')
                .select('id, title, company, location, source_name, status, posted_date')
                .eq('is_active', true)
                .order('posted_date', { ascending: false })
                .limit(limit);

            // Only show approved jobs to non-admins
            const userIsAdmin = await isAdmin();
            if (!userIsAdmin) {
                query = query.eq('status', 'approved');
            }

            if (title) {
                query = query.ilike('title', `%${title}%`);
            }

            if (sourceName) {
                query = query.eq('source_name', sourceName);
            }

            const { data, error } = await query;

            if (error) throw error;
            return { success: true, data: data || [], error: null };
        } catch (error) {
            console.error('Error searching jobs:', error);
            return { success: false, data: [], error: error.message };
        }
    }

    /**
     * Get single job by ID
     * @param {string} id - Job UUID
     */
    async getJobById(id) {
        try {
            const { data, error } = await supabase
                .from('external_jobs')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            // Check if user can view this job (non-admins only see approved)
            const userIsAdmin = await isAdmin();
            if (!userIsAdmin && data.status !== 'approved') {
                return { success: false, data: null, error: 'Job not available' };
            }

            return { success: true, data, error: null };
        } catch (error) {
            console.error('Error fetching job:', error);
            return { success: false, data: null, error: error.message };
        }
    }

    /**
     * Approve a job (admin only)
     * @param {string} id - Job UUID
     */
    async approveJob(id) {
        try {
            if (!await isAdmin()) {
                return { success: false, error: 'Unauthorized: Admin only' };
            }

            const userId = await getCurrentUserId();

            const { data, error } = await supabase
                .from('external_jobs')
                .update({
                    status: 'approved',
                    approved_by: userId,
                    approved_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data, error: null };
        } catch (error) {
            console.error('Error approving job:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Reject a job (admin only)
     * @param {string} id - Job UUID
     * @param {string} reason - Rejection reason
     */
    async rejectJob(id, reason = '') {
        try {
            if (!await isAdmin()) {
                return { success: false, error: 'Unauthorized: Admin only' };
            }

            const { data, error } = await supabase
                .from('external_jobs')
                .update({
                    status: 'rejected',
                    rejection_reason: reason,
                    is_active: false,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data, error: null };
        } catch (error) {
            console.error('Error rejecting job:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Batch approve multiple jobs (admin only)
     * @param {string[]} ids - Array of job UUIDs
     */
    async batchApproveJobs(ids) {
        if (!await isAdmin()) {
            return { success: false, error: 'Unauthorized: Admin only' };
        }

        const userId = await getCurrentUserId();
        const now = new Date().toISOString();
        const results = { approved: 0, failed: 0, errors: [] };

        for (const id of ids) {
            try {
                const { error } = await supabase
                    .from('external_jobs')
                    .update({
                        status: 'approved',
                        approved_by: userId,
                        approved_at: now,
                        updated_at: now
                    })
                    .eq('id', id);

                if (error) {
                    results.failed++;
                    results.errors.push({ id, error: error.message });
                } else {
                    results.approved++;
                }
            } catch (error) {
                results.failed++;
                results.errors.push({ id, error: error.message });
            }
        }

        return { success: true, ...results };
    }

    /**
     * Get job statistics (admin only)
     */
    async getStats() {
        try {
            const userIsAdmin = await isAdmin();
            if (!userIsAdmin) {
                return { success: false, error: 'Unauthorized: Admin only' };
            }

            const { data, error } = await supabase
                .from('external_jobs')
                .select('status', { count: 'exact', head: false });

            if (error) throw error;

            const stats = {
                total: 0,
                pending_approval: 0,
                approved: 0,
                rejected: 0
            };

            data?.forEach(job => {
                stats.total++;
                if (job.status === 'pending_approval') stats.pending_approval++;
                if (job.status === 'approved') stats.approved++;
                if (job.status === 'rejected') stats.rejected++;
            });

            return { success: true, data: stats, error: null };
        } catch (error) {
            console.error('Error fetching job stats:', error);
            return { success: false, error: error.message };
        }
    }
}

// Export singleton instance
export const externalJobsService = new ExternalJobsService();

// Default export for backward compatibility
export default externalJobsService;

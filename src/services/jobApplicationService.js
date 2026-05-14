// src/services/jobApplicationService.js
// COMPLETE - Super Admin and Admin have unlimited job applications

import { supabase } from '../lib/supabase';

// ============================================
// CHECK IF USER CAN APPLY TO JOB
// ============================================

export async function canApplyToJob(userId, jobId) {
    // Check if user is admin/super_admin
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_type, tier')
        .eq('id', userId)
        .single();
    
    if (profileError) {
        console.error('Error fetching profile:', profileError);
        return { allowed: false, error: 'User not found' };
    }
    
    // Super Admin and Admin have unlimited applications
    if (profile.user_type === 'super_admin' || profile.user_type === 'admin') {
        return { allowed: true, remaining: 'unlimited', message: 'Admins have unlimited applications' };
    }
    
    // Business tier has unlimited
    if (profile.tier === 'business') {
        return { allowed: true, remaining: 'unlimited' };
    }
    
    // Check if already applied
    const { data: existingApplication, error: existingError } = await supabase
        .from('job_applications')
        .select('id')
        .eq('user_id', userId)
        .eq('job_id', jobId)
        .maybeSingle();
    
    if (existingApplication) {
        return { allowed: false, error: 'You have already applied for this job' };
    }
    
    // Check tier limits
    const tierLimits = {
        free: { applications: 0 },
        registered: { applications: 10 },
        professional: { applications: 999999 },
        employer: { applications: 999999 }
    };
    
    const limit = tierLimits[profile.tier]?.applications || 0;
    
    if (limit === 0) {
        return { allowed: false, error: 'Your account does not allow job applications. Please upgrade to Registered tier (free).' };
    }
    
    // Count applications this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { count: applicationCount, error: countError } = await supabase
        .from('job_applications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', startOfMonth.toISOString());
    
    if (countError) throw countError;
    
    if (applicationCount >= limit) {
        return { 
            allowed: false, 
            error: `You have reached your monthly application limit (${limit}). Upgrade to apply to more jobs.`,
            limit: limit,
            used: applicationCount
        };
    }
    
    return { 
        allowed: true, 
        remaining: limit - applicationCount,
        limit: limit,
        used: applicationCount
    };
}

// ============================================
// SUBMIT JOB APPLICATION
// ============================================

export async function submitJobApplication(userId, jobId, coverLetter = null, cvUrl = null) {
    // First check if allowed
    const canApply = await canApplyToJob(userId, jobId);
    
    if (!canApply.allowed) {
        return { success: false, error: canApply.error };
    }
    
    // Get job details for notification
    const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('title, company, employer_id')
        .eq('id', jobId)
        .single();
    
    if (jobError) throw jobError;
    
    // Submit application
    const { data: application, error: applyError } = await supabase
        .from('job_applications')
        .insert({
            user_id: userId,
            job_id: jobId,
            cover_letter: coverLetter,
            cv_url: cvUrl,
            status: 'pending',
            applied_at: new Date().toISOString()
        })
        .select()
        .single();
    
    if (applyError) throw applyError;
    
    return { 
        success: true, 
        applicationId: application.id,
        message: 'Application submitted successfully'
    };
}

// ============================================
// GET USER'S APPLICATIONS
// ============================================

export async function getUserApplications(userId, limit = 50) {
    const { data, error } = await supabase
        .from('job_applications')
        .select('*, jobs(title, company, location, salary_min, salary_max)')
        .eq('user_id', userId)
        .order('applied_at', { ascending: false })
        .limit(limit);
    
    if (error) throw error;
    return data || [];
}

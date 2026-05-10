// src/services/workforceService.js
// Complete Workforce Marketplace Service
// Professional profiles, service requests, proposals, engagements, ratings

import { supabase } from '../lib/supabase';

// ============================================
// PROFESSIONAL PROFILE MANAGEMENT
// ============================================

export async function createWorkforceProfile(userId, profileData) {
    const { data, error } = await supabase
        .from('workforce_profiles')
        .insert({
            user_id: userId,
            headline: profileData.headline,
            bio: profileData.bio,
            skills: profileData.skills,
            experience_years: profileData.experience_years,
            hourly_rate: profileData.hourly_rate,
            portfolio_urls: profileData.portfolio_urls,
            certifications: profileData.certifications,
            is_available: true,
            verification_status: 'pending'
        })
        .select()
        .single();

    if (error) throw error;
    return { success: true, profileId: data.id };
}

export async function getWorkforceProfile(userId) {
    const { data, error } = await supabase
        .from('workforce_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
}

export async function updateWorkforceProfile(profileId, profileData, userId) {
    const { error } = await supabase
        .from('workforce_profiles')
        .update({
            headline: profileData.headline,
            bio: profileData.bio,
            skills: profileData.skills,
            experience_years: profileData.experience_years,
            hourly_rate: profileData.hourly_rate,
            portfolio_urls: profileData.portfolio_urls,
            certifications: profileData.certifications,
            updated_at: new Date().toISOString()
        })
        .eq('id', profileId)
        .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
}

export async function toggleAvailability(profileId, userId, isAvailable) {
    const { error } = await supabase
        .from('workforce_profiles')
        .update({ is_available: isAvailable })
        .eq('id', profileId)
        .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
}

export async function getVerifiedProfessions(limit = 50) {
    const { data, error } = await supabase
        .from('workforce_profiles')
        .select('*, profiles!inner(full_name, email, avatar_url)')
        .eq('verification_status', 'verified')
        .eq('is_available', true)
        .order('rating_avg', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data || [];
}

// ============================================
// SERVICE REQUEST MANAGEMENT (Employers)
// ============================================

export async function createServiceRequest(employerId, requestData) {
    const { data, error } = await supabase
        .from('service_requests')
        .insert({
            employer_id: employerId,
            title: requestData.title,
            description: requestData.description,
            category: requestData.category,
            budget_min: requestData.budget_min,
            budget_max: requestData.budget_max,
            deadline: requestData.deadline,
            location: requestData.location,
            is_remote: requestData.is_remote,
            status: 'open'
        })
        .select()
        .single();

    if (error) throw error;
    return { success: true, requestId: data.id };
}

export async function getServiceRequests(employerId) {
    const { data, error } = await supabase
        .from('service_requests')
        .select('*, proposals(count)')
        .eq('employer_id', employerId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function getOpenServiceRequests(limit = 50) {
    const { data, error } = await supabase
        .from('service_requests')
        .select('*, employer:profiles!employer_id(full_name, email)')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data || [];
}

export async function updateServiceRequestStatus(requestId, employerId, status) {
    const { error } = await supabase
        .from('service_requests')
        .update({ status: status, updated_at: new Date().toISOString() })
        .eq('id', requestId)
        .eq('employer_id', employerId);

    if (error) throw error;
    return { success: true };
}

// ============================================
// PROPOSAL MANAGEMENT (Professionals)
// ============================================

export async function submitProposal(requestId, professionalId, proposalData) {
    const { data, error } = await supabase
        .from('proposals')
        .insert({
            service_request_id: requestId,
            professional_id: professionalId,
            cover_letter: proposalData.cover_letter,
            proposed_rate: proposalData.proposed_rate,
            estimated_days: proposalData.estimated_days,
            status: 'pending'
        })
        .select()
        .single();

    if (error) throw error;
    return { success: true, proposalId: data.id };
}

export async function getProposalsForRequest(requestId, employerId) {
    const { data, error } = await supabase
        .from('proposals')
        .select('*, professional:workforce_profiles!inner(*, profiles!inner(full_name, email, avatar_url))')
        .eq('service_request_id', requestId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
}

export async function getMyProposals(professionalId) {
    const { data, error } = await supabase
        .from('proposals')
        .select('*, service_request:service_requests(*)')
        .eq('professional_id', professionalId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function updateProposalStatus(proposalId, employerId, status) {
    const { error } = await supabase
        .from('proposals')
        .update({ status: status, updated_at: new Date().toISOString() })
        .eq('id', proposalId);

    if (error) throw error;
    return { success: true };
}

// ============================================
// ENGAGEMENT MANAGEMENT
// ============================================

export async function createEngagement(proposalId, employerId, professionalId, requestId, totalAmount) {
    const { data, error } = await supabase
        .from('engagements')
        .insert({
            service_request_id: requestId,
            proposal_id: proposalId,
            employer_id: employerId,
            professional_id: professionalId,
            status: 'active',
            total_amount: totalAmount,
            start_date: new Date().toISOString()
        })
        .select()
        .single();

    if (error) throw error;
    return { success: true, engagementId: data.id };
}

export async function getMyEngagements(userId, userType) {
    let query = supabase
        .from('engagements')
        .select('*, service_request:service_requests(*), professional:workforce_profiles(*, profiles!inner(full_name, email))');

    if (userType === 'employer') {
        query = query.eq('employer_id', userId);
    } else {
        query = query.eq('professional_id', userId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function updateEngagementStatus(engagementId, userId, status) {
    const { error } = await supabase
        .from('engagements')
        .update({ 
            status: status, 
            end_date: status === 'completed' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
        })
        .eq('id', engagementId);

    if (error) throw error;
    return { success: true };
}

// ============================================
// RATINGS & REVIEWS
// ============================================

export async function submitRating(engagementId, reviewerId, revieweeId, rating, review, categories = {}) {
    // Check if already rated
    const { data: existing } = await supabase
        .from('ratings_reviews')
        .select('id')
        .eq('engagement_id', engagementId)
        .eq('reviewer_id', reviewerId)
        .single();

    if (existing) {
        throw new Error('You have already rated this engagement');
    }

    const { data, error } = await supabase
        .from('ratings_reviews')
        .insert({
            engagement_id: engagementId,
            reviewer_id: reviewerId,
            reviewee_id: revieweeId,
            rating: rating,
            review: review,
            categories: categories,
            is_public: true
        })
        .select()
        .single();

    if (error) throw error;

    // Update average rating for the reviewee
    await updateAverageRating(revieweeId);

    // Log activity
    await logEngagementActivity(engagementId, 'rating_submitted', { rating, review });

    return { success: true, ratingId: data.id };
}

async function updateAverageRating(revieweeId) {
    const { data: ratings } = await supabase
        .from('ratings_reviews')
        .select('rating')
        .eq('reviewee_id', revieweeId);

    if (ratings && ratings.length > 0) {
        const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
        
        // Update in profiles
        await supabase
            .from('profiles')
            .update({ rating_avg: avg, rating_count: ratings.length })
            .eq('id', revieweeId);
        
        // Update in workforce_profiles if applicable
        await supabase
            .from('workforce_profiles')
            .update({ rating_avg: avg, rating_count: ratings.length })
            .eq('user_id', revieweeId);
    }
}

export async function getRatingsForUser(userId, limit = 20) {
    const { data, error } = await supabase
        .from('ratings_reviews')
        .select('*, reviewer:profiles!reviewer_id(full_name, avatar_url)')
        .eq('reviewee_id', userId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data || [];
}

// ============================================
// ACTIVITY LOGGING
// ============================================

export async function logEngagementActivity(engagementId, action, metadata = {}) {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase
        .from('engagement_logs')
        .insert({
            engagement_id: engagementId,
            action: action,
            description: `${action} performed`,
            metadata: metadata,
            created_by: user?.id
        });
}

// ============================================
// DASHBOARD STATISTICS
// ============================================

export async function getProfessionalStatistics(professionalId) {
    // Get total engagements
    const { count: totalEngagements } = await supabase
        .from('engagements')
        .select('*', { count: 'exact', head: true })
        .eq('professional_id', professionalId);

    // Get completed engagements
    const { count: completedEngagements } = await supabase
        .from('engagements')
        .select('*', { count: 'exact', head: true })
        .eq('professional_id', professionalId)
        .eq('status', 'completed');

    // Get ratings average
    const { data: ratings } = await supabase
        .from('ratings_reviews')
        .select('rating')
        .eq('reviewee_id', professionalId);

    const avgRating = ratings && ratings.length > 0 
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
        : 0;

    return {
        total_engagements: totalEngagements || 0,
        completed_engagements: completedEngagements || 0,
        completion_rate: totalEngagements ? Math.round((completedEngagements / totalEngagements) * 100) : 0,
        avg_rating: avgRating.toFixed(1),
        rating_count: ratings?.length || 0
    };
}

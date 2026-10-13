// src/services/workforceService.js
// Complete Workforce Marketplace Service
// Professional profiles, service requests, proposals, engagements, ratings
//
// FIXED (2026-08-07): getMyEngagements() only ever joined the professional's
// profile info, never the employer's — so when a professional wanted to
// message their employer (EngagementsDashboard.jsx), there was no employer
// email available anywhere in the fetched data. Added
// employer:profiles!employer_id(full_name, email) to the select so both
// directions of contact are possible.

// ADDED (fix-8): profiles is now private - a member can only read their own
// profile row (and the other party of an engagement). Names and photos shown
// publicly on the marketplace come from the public_profiles view, which
// exposes ONLY id, full_name and avatar_url and only for people who have a
// marketplace listing, a request, or a review.
async function namesFor(ids) {
    const unique = [...new Set((ids || []).filter(Boolean))];
    const map = {};
    if (unique.length === 0) return map;
    const { data, error } = await supabase
        .from('public_profiles')
        .select('id, full_name, avatar_url')
        .in('id', unique);
    if (error) throw error;
    (data || []).forEach(p => { map[p.id] = p; });
    return map;
}

import { supabase } from '../lib/supabase';

// ============================================
// PROFESSIONAL PROFILE MANAGEMENT
// ============================================

export async function createWorkforceProfile(userId, profileData) {
    // FIXED (2026-08-27): now accepts listingCategory, countryCode, and
    // generalLocation - the new fields this session added to
    // workforce_profiles. Verification is conditional: job_seeker
    // listings are lower-stakes (skills/discovery only, no rate or
    // formal engagement promise) and are auto-verified so they appear
    // immediately, matching "free job seekers get most basic listing"
    // - no waiting on manual review for that category. Professional and
    // tradesperson listings keep the existing admin-review requirement,
    // since those genuinely involve rate-setting and real engagements,
    // matching the marketplace's own "100% Verified" promise already
    // shown to visitors.
    const listingCategory = profileData.listingCategory || 'professional';
    const autoVerify = listingCategory === 'job_seeker';

    const { data, error } = await supabase
        .from('workforce_profiles')
        .insert({
            user_id: userId,
            listing_category: listingCategory,
            headline: profileData.headline,
            bio: profileData.bio,
            skills: profileData.skills,
            experience_years: profileData.experience_years,
            hourly_rate: profileData.hourly_rate,
            portfolio_urls: profileData.portfolio_urls,
            certifications: profileData.certifications,
            country_code: profileData.countryCode || null,
            general_location: profileData.generalLocation || null,
            is_available: true,
            verification_status: autoVerify ? 'verified' : 'pending'
        })
        .select()
        .single();

    if (error) throw error;
    return { success: true, profileId: data.id, autoVerified: autoVerify };
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

export async function getVerifiedProfessions(limit = 50, listingCategory = null) {
    // FIXED (2026-08-27): confirmed real privacy gap - this previously
    // selected profiles!inner(full_name, email, avatar_url) directly,
    // meaning the email address was present in the fetched JSON for
    // every professional regardless of the viewer's tier. The "Contact
    // Professional" button in WorkforceMarketplace.jsx is gated by
    // GateGuard, but that only controls whether the BUTTON renders -
    // the email was already sitting in browser memory either way,
    // visible to anyone who opened dev tools. Email is no longer part
    // of this public query at all - it is only ever returned by the new
    // unlock-workforce-contact backend action, after a real, paid
    // unlock is confirmed to exist.
    let query = supabase
        .from('workforce_profiles')
        .select('*')
        .eq('verification_status', 'verified')
        .eq('is_available', true)
        .order('rating_avg', { ascending: false })
        .limit(limit);

    if (listingCategory) {
        query = query.eq('listing_category', listingCategory);
    }

    const { data, error } = await query;

    if (error) throw error;
    const rows = data || [];
    const names = await namesFor(rows.map(r => r.user_id));
    return rows
        .filter(r => names[r.user_id] && names[r.user_id].full_name)
        .map(r => ({ ...r, profiles: { full_name: names[r.user_id].full_name, avatar_url: names[r.user_id].avatar_url } }));
}

// ============================================
// SERVICE REQUEST MANAGEMENT (Employers)
// ============================================

export async function createServiceRequest(employerId, requestData) {
    // FIXED (2026-08-27): confirmed real bug - ServiceRequestForm.jsx
    // collects required_skills, experience_level, and estimated_duration,
    // but this function was silently dropping all three (they were never
    // in the insert object at all).
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
            required_skills: requestData.required_skills || [],
            experience_level: requestData.experience_level || null,
            estimated_duration: requestData.estimated_duration || null,
            status: 'open'
        })
        .select()
        .single();

    if (error) throw error;
    return { success: true, requestId: data.id };
}

// NEW (2026-08-27): ServiceRequestForm.jsx has a real, working edit mode
// (isEditMode), but there was no function anywhere to actually perform a
// full update - only updateServiceRequestStatus() below, which only ever
// touches the status field. This is what the edit path actually needed.
export async function updateServiceRequest(requestId, employerId, requestData) {
    const { error } = await supabase
        .from('service_requests')
        .update({
            title: requestData.title,
            description: requestData.description,
            category: requestData.category,
            budget_min: requestData.budget_min,
            budget_max: requestData.budget_max,
            deadline: requestData.deadline,
            location: requestData.location,
            is_remote: requestData.is_remote,
            required_skills: requestData.required_skills || [],
            experience_level: requestData.experience_level || null,
            estimated_duration: requestData.estimated_duration || null,
            updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('employer_id', employerId);

    if (error) throw error;
    return { success: true };
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
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    const rows = data || [];
    const names = await namesFor(rows.map(r => r.employer_id));
    return rows.map(r => ({ ...r, employer: { full_name: names[r.employer_id]?.full_name || null } }));
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
        .select('*, professional:workforce_profiles!inner(*)')
        .eq('service_request_id', requestId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    const rows = data || [];
    const names = await namesFor(rows.map(r => r.professional?.user_id));
    return rows.map(r => ({
        ...r,
        professional: r.professional && {
            ...r.professional,
            profiles: {
                full_name: names[r.professional.user_id]?.full_name || null,
                avatar_url: names[r.professional.user_id]?.avatar_url || null
            }
        }
    }));
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
    // FIXED: now also joins the employer's profile (full_name, email), not
    // just the professional's — needed so both sides of an engagement have
    // a real contact email available for messaging.
    let query = supabase
        .from('engagements')
        .select('*, service_request:service_requests(*), professional:workforce_profiles(*, profiles!inner(full_name, email)), employer:profiles!employer_id(full_name, email)');

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

    await updateAverageRating(revieweeId);
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
        
        await supabase
            .from('profiles')
            .update({ rating_avg: avg, rating_count: ratings.length })
            .eq('id', revieweeId);
        
        await supabase
            .from('workforce_profiles')
            .update({ rating_avg: avg, rating_count: ratings.length })
            .eq('user_id', revieweeId);
    }
}

export async function getRatingsForUser(userId, limit = 20) {
    const { data, error } = await supabase
        .from('ratings_reviews')
        .select('*')
        .eq('reviewee_id', userId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    const rows = data || [];
    const names = await namesFor(rows.map(r => r.reviewer_id));
    return rows.map(r => ({ ...r, reviewer: { full_name: names[r.reviewer_id]?.full_name || null, avatar_url: names[r.reviewer_id]?.avatar_url || null } }));
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
    const { count: totalEngagements } = await supabase
        .from('engagements')
        .select('*', { count: 'exact', head: true })
        .eq('professional_id', professionalId);

    const { count: completedEngagements } = await supabase
        .from('engagements')
        .select('*', { count: 'exact', head: true })
        .eq('professional_id', professionalId)
        .eq('status', 'completed');

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

// src/services/skillsService.js
// Service for managing user skills with your existing table structure

import { supabase } from '../lib/supabase';

// ============================================
// SKILL CATEGORIES (for UI dropdowns)
// ============================================

export const SKILL_CATEGORIES = [
    'Programming',
    'Frontend',
    'Backend',
    'Database',
    'DevOps',
    'Cloud',
    'Management',
    'Soft Skills',
    'Design',
    'Marketing',
    'Sales',
    'Customer Service',
    'Data Science',
    'Security',
    'Other'
];

// ============================================
// CORE CRUD OPERATIONS
// ============================================

/**
 * Get all skills for the current user
 */
export async function getUserSkills() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, skills: [] };

        const { data, error } = await supabase
            .from('skills')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, skills: data || [] };
    } catch (error) {
        console.error('Error fetching user skills:', error);
        return { success: false, skills: [], error: error.message };
    }
}

/**
 * Get verified skills for a specific user (public profile)
 */
export async function getUserVerifiedSkills(userId) {
    try {
        const { data, error } = await supabase
            .from('skills')
            .select('skill_name, category, years_experience, trust_score')
            .eq('user_id', userId)
            .eq('verification_status', 'verified')
            .order('trust_score', { ascending: false });

        if (error) throw error;
        return { success: true, skills: data || [] };
    } catch (error) {
        console.error('Error fetching verified skills:', error);
        return { success: false, skills: [], error: error.message };
    }
}

/**
 * Add a new skill for the current user
 */
export async function addSkill(skillData) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'Not authenticated' };

        // Check if skill already exists for this user
        const { data: existing } = await supabase
            .from('skills')
            .select('id')
            .eq('user_id', user.id)
            .eq('skill_name', skillData.skill_name)
            .maybeSingle();

        if (existing) {
            return { success: false, error: 'You already have this skill' };
        }

        const { data, error } = await supabase
            .from('skills')
            .insert({
                user_id: user.id,
                skill_name: skillData.skill_name,
                category: skillData.category,
                years_experience: skillData.years_experience || 0,
                verification_status: 'pending',
                trust_score: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        return { success: true, skill: data };
    } catch (error) {
        console.error('Error adding skill:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update an existing skill
 */
export async function updateSkill(skillId, updates) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'Not authenticated' };

        const { data, error } = await supabase
            .from('skills')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', skillId)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) throw error;
        return { success: true, skill: data };
    } catch (error) {
        console.error('Error updating skill:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete a skill
 */
export async function deleteSkill(skillId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'Not authenticated' };

        const { error } = await supabase
            .from('skills')
            .delete()
            .eq('id', skillId)
            .eq('user_id', user.id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error deleting skill:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// ADMIN FUNCTIONS
// ============================================

/**
 * Get all pending skills for admin review
 */
export async function getPendingSkills() {
    try {
        const { data, error } = await supabase
            .from('skills')
            .select('*, profiles:user_id(email, full_name)')
            .eq('verification_status', 'pending')
            .order('created_at', { ascending: true });

        if (error) throw error;
        return { success: true, skills: data || [] };
    } catch (error) {
        console.error('Error fetching pending skills:', error);
        return { success: false, skills: [], error: error.message };
    }
}

/**
 * Verify a skill (admin only)
 */
export async function verifySkill(skillId, trustScore, adminNotes = null) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'Not authenticated' };

        const { data, error } = await supabase
            .from('skills')
            .update({
                verification_status: 'verified',
                trust_score: trustScore,
                verified_by: user.id,
                verified_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', skillId)
            .select()
            .single();

        if (error) throw error;
        return { success: true, skill: data };
    } catch (error) {
        console.error('Error verifying skill:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Reject a skill (admin only)
 */
export async function rejectSkill(skillId, reason = null) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'Not authenticated' };

        const { data, error } = await supabase
            .from('skills')
            .update({
                verification_status: 'rejected',
                verified_by: user.id,
                verified_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                rejection_reason: reason
            })
            .eq('id', skillId)
            .select()
            .single();

        if (error) throw error;
        return { success: true, skill: data };
    } catch (error) {
        console.error('Error rejecting skill:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get skill statistics for admin dashboard
 */
export async function getSkillStats() {
    try {
        const { data: total } = await supabase
            .from('skills')
            .select('*', { count: 'exact', head: true });

        const { data: pending } = await supabase
            .from('skills')
            .select('*', { count: 'exact', head: true })
            .eq('verification_status', 'pending');

        const { data: verified } = await supabase
            .from('skills')
            .select('*', { count: 'exact', head: true })
            .eq('verification_status', 'verified');

        const { data: rejected } = await supabase
            .from('skills')
            .select('*', { count: 'exact', head: true })
            .eq('verification_status', 'rejected');

        const { data: categories } = await supabase
            .from('skills')
            .select('category, count:category', { count: 'exact' })
            .eq('verification_status', 'verified')
            .group('category');

        return {
            success: true,
            stats: {
                total: total?.count || 0,
                pending: pending?.count || 0,
                verified: verified?.count || 0,
                rejected: rejected?.count || 0,
                byCategory: categories?.data || []
            }
        };
    } catch (error) {
        console.error('Error getting skill stats:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// REACT HOOK
// ============================================

import { useState, useEffect } from 'react';

export function useSkills() {
    const [skills, setSkills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadSkills = async () => {
        setLoading(true);
        const result = await getUserSkills();
        if (result.success) {
            setSkills(result.skills);
            setError(null);
        } else {
            setError(result.error);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadSkills();
    }, []);

    const addNewSkill = async (skillData) => {
        const result = await addSkill(skillData);
        if (result.success) {
            await loadSkills();
        }
        return result;
    };

    const editSkill = async (skillId, updates) => {
        const result = await updateSkill(skillId, updates);
        if (result.success) {
            await loadSkills();
        }
        return result;
    };

    const removeSkill = async (skillId) => {
        const result = await deleteSkill(skillId);
        if (result.success) {
            await loadSkills();
        }
        return result;
    };

    return {
        skills,
        loading,
        error,
        addSkill: addNewSkill,
        updateSkill: editSkill,
        deleteSkill: removeSkill,
        refresh: loadSkills
    };
}

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Submit a new skill
export async function submitSkill(userId, skillName, category, yearsExperience = 0) {
    try {
        // Check if skill already exists for this user
        const { data: existing } = await supabase
            .from('skills')
            .select('id')
            .eq('user_id', userId)
            .eq('skill_name', skillName)
            .single()

        if (existing) {
            return { success: false, error: 'You have already submitted this skill' }
        }

        // Insert skill
        const { data: skill, error } = await supabase
            .from('skills')
            .insert({
                user_id: userId,
                skill_name: skillName,
                category: category,
                years_experience: yearsExperience,
                verification_status: 'pending'
            })
            .select()
            .single()

        if (error) throw error

        // Create submission record
        await supabase.from('skill_submissions').insert({
            skill_id: skill.id,
            user_id: userId,
            submission_data: { skill_name: skillName, category, years_experience: yearsExperience },
            status: 'submitted'
        })

        return { success: true, skillId: skill.id, message: 'Skill submitted for verification' }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

// Get all verified skills (public marketplace)
export async function getVerifiedSkills(category = null, limit = 20) {
    try {
        let query = supabase
            .from('skills')
            .select(`
                *,
                profiles:user_id (id, email, full_name, country_code),
                workforce_profiles:user_id (headline, hourly_rate, total_rating)
            `)
            .eq('verification_status', 'verified')
            .order('trust_score', { ascending: false })
            .limit(limit)

        if (category) {
            query = query.eq('category', category)
        }

        const { data, error } = await query
        if (error) throw error
        return { success: true, skills: data }
    } catch (error) {
        return { success: false, error: error.message, skills: [] }
    }
}

// Get user's own skills
export async function getMySkills(userId) {
    try {
        const { data, error } = await supabase
            .from('skills')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return { success: true, skills: data }
    } catch (error) {
        return { success: false, error: error.message, skills: [] }
    }
}

// Get pending skills (admin only)
export async function getPendingSkills(limit = 50) {
    try {
        const { data, error } = await supabase
            .from('skills')
            .select(`
                *,
                profiles:user_id (id, email, full_name)
            `)
            .eq('verification_status', 'pending')
            .order('created_at', { ascending: true })
            .limit(limit)

        if (error) throw error
        return { success: true, skills: data }
    } catch (error) {
        return { success: false, error: error.message, skills: [] }
    }
}

// Verify a skill (admin only)
export async function verifySkill(adminId, skillId, approved, feedback = '') {
    try {
        const newStatus = approved ? 'verified' : 'rejected'
        const trustScore = approved ? Math.floor(Math.random() * 30) + 70 : 0 // 70-100 for verified

        const { data, error } = await supabase
            .from('skills')
            .update({
                verification_status: newStatus,
                trust_score: trustScore,
                verified_by: adminId,
                verified_at: new Date().toISOString(),
                admin_notes: feedback
            })
            .eq('id', skillId)
            .select()
            .single()

        if (error) throw error

        // Update submission record
        await supabase
            .from('skill_submissions')
            .update({
                admin_reviewer_id: adminId,
                admin_feedback: feedback,
                status: approved ? 'approved' : 'rejected',
                reviewed_at: new Date().toISOString()
            })
            .eq('skill_id', skillId)

        return { success: true, skill: data, message: approved ? 'Skill verified' : 'Skill rejected' }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

// Update trust score based on job completions
export async function updateTrustScore(skillId) {
    try {
        // Get all job completions for this skill
        const { data: completions } = await supabase
            .from('skill_jobs_completed')
            .select('client_rating')
            .eq('skill_id', skillId)

        if (!completions || completions.length === 0) {
            return { success: true, trustScore: 0 }
        }

        // Calculate average rating
        const totalRating = completions.reduce((sum, c) => sum + (c.client_rating || 0), 0)
        const avgRating = totalRating / completions.length
        const trustScore = Math.round((avgRating / 5) * 100)

        // Update trust score
        await supabase
            .from('skills')
            .update({ trust_score: trustScore })
            .eq('id', skillId)

        return { success: true, trustScore }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

// Add job completion (proof of work)
export async function addJobCompletion(skillId, jobTitle, clientRating, clientFeedback, evidenceUrl = null) {
    try {
        const { data, error } = await supabase
            .from('skill_jobs_completed')
            .insert({
                skill_id: skillId,
                job_title: jobTitle,
                client_rating: clientRating,
                client_feedback: clientFeedback,
                evidence_url: evidenceUrl,
                completed_at: new Date().toISOString()
            })
            .select()
            .single()

        if (error) throw error

        // Update trust score
        await updateTrustScore(skillId)

        return { success: true, completion: data }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

// Get or create workforce profile
export async function getWorkforceProfile(userId) {
    try {
        let { data, error } = await supabase
            .from('workforce_profiles')
            .select('*')
            .eq('user_id', userId)
            .single()

        if (error && error.code === 'PGRST116') {
            // Create profile if not exists
            const { data: newProfile, error: insertError } = await supabase
                .from('workforce_profiles')
                .insert({ user_id: userId })
                .select()
                .single()

            if (insertError) throw insertError
            return { success: true, profile: newProfile }
        }

        if (error) throw error
        return { success: true, profile: data }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

// Update workforce profile
export async function updateWorkforceProfile(userId, updates) {
    try {
        const { data, error } = await supabase
            .from('workforce_profiles')
            .update(updates)
            .eq('user_id', userId)
            .select()
            .single()

        if (error) throw error
        return { success: true, profile: data }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

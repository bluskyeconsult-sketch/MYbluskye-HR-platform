import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Generate a new invite code (Admin only)
export async function generateInviteCode(adminId, usesLimit = 1, expiresInDays = 30) {
    try {
        const code = 'TESTER_' + Math.random().toString(36).substring(2, 10).toUpperCase()
        
        const { data, error } = await supabase
            .from('tester_invite_codes')
            .insert({
                code: code,
                created_by: adminId,
                uses_limit: usesLimit,
                expires_at: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
            })
            .select()
            .single()

        if (error) throw error
        return { success: true, code: data.code, expires_at: data.expires_at }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

// Validate invite code (Public)
export async function validateInviteCode(code) {
    try {
        const { data, error } = await supabase
            .from('tester_invite_codes')
            .select('*')
            .eq('code', code)
            .eq('is_active', true)
            .single()

        if (error || !data) {
            return { success: false, error: 'Invalid invite code' }
        }

        if (data.expires_at && new Date(data.expires_at) < new Date()) {
            return { success: false, error: 'Invite code has expired' }
        }

        if (data.uses_used >= data.uses_limit) {
            return { success: false, error: 'Invite code has already been used' }
        }

        return { success: true, codeData: data }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

// Register as tester (uses invite code)
export async function registerTester(email, password, fullName, inviteCode) {
    try {
        // Validate invite code first
        const { success, error, codeData } = await validateInviteCode(inviteCode)
        if (!success) {
            return { success: false, error: error }
        }

        // Create auth user
        const { data: authUser, error: signUpError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: { full_name: fullName, user_type: 'tester' }
            }
        })

        if (signUpError) throw signUpError

        // Update profile to tester
        await supabase
            .from('profiles')
            .update({ user_type: 'tester', tier: 'free' })
            .eq('id', authUser.user.id)

        // Create tester allocation
        await supabase
            .from('tester_allocations')
            .insert({
                user_id: authUser.user.id,
                allocated_uses: 10,
                used_uses: 0,
                remaining_uses: 10,
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            })

        // Update invite code usage
        await supabase
            .from('tester_invite_codes')
            .update({ uses_used: codeData.uses_used + 1 })
            .eq('code', inviteCode)

        return { success: true, userId: authUser.user.id, message: 'Tester account created' }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

// Get tester status (remaining uses, expiry)
export async function getTesterStatus(userId) {
    try {
        const { data, error } = await supabase
            .from('tester_allocations')
            .select('*')
            .eq('user_id', userId)
            .single()

        if (error) {
            return { isTester: false, error: error.message }
        }

        const remaining = data.remaining_uses || 0
        const daysRemaining = Math.ceil((new Date(data.expires_at) - new Date()) / (1000 * 60 * 60 * 24))
        const isExpiring = remaining <= 3 || daysRemaining <= 7
        const isActive = data.status === 'active' && remaining > 0 && daysRemaining > 0

        return {
            isTester: true,
            isActive: isActive,
            allocatedUses: data.allocated_uses,
            usedUses: data.used_uses,
            remainingUses: remaining,
            expiresAt: data.expires_at,
            daysRemaining: daysRemaining,
            isExpiring: isExpiring,
            status: data.status
        }
    } catch (error) {
        return { isTester: false, error: error.message }
    }
}

// Track tester action (decrements remaining uses)
export async function trackTesterAction(userId, actionType) {
    try {
        // Record activity
        await supabase.from('tester_activity_log').insert({
            user_id: userId,
            action_type: actionType,
            remaining_uses: (await getTesterStatus(userId)).remainingUses
        })

        // Decrement uses via database function
        await supabase.rpc('decrement_tester_uses', { p_user_id: userId })
        
        return { success: true }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

// Submit tester feedback
export async function submitTesterFeedback(userId, feedbackData) {
    try {
        const { data, error } = await supabase
            .from('tester_feedback')
            .insert({
                user_id: userId,
                rating: feedbackData.rating,
                rating_overall: feedbackData.rating_overall,
                feedback_text: feedbackData.feedback_text,
                suggestions: feedbackData.suggestions,
                bug_reports: feedbackData.bug_reports,
                screenshot_url: feedbackData.screenshot_url,
                checklist_results: feedbackData.checklist_results
            })
            .select()
            .single()

        if (error) throw error
        return { success: true, feedback: data }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

// Upgrade tester to registered user
export async function upgradeToRegistered(userId) {
    try {
        // Update profile
        await supabase
            .from('profiles')
            .update({ user_type: 'registered', tier: 'registered' })
            .eq('id', userId)

        // Deactivate tester allocation
        await supabase
            .from('tester_allocations')
            .update({ status: 'disabled' })
            .eq('user_id', userId)

        // Award upgrader badge
        await supabase
            .from('tester_badges')
            .insert({ user_id: userId, badge_type: 'upgrader' })

        return { success: true, message: 'Upgraded to Registered User' }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

// Get all tester feedback (Admin only)
export async function getAllTesterFeedback() {
    try {
        const { data, error } = await supabase
            .from('tester_feedback')
            .select('*, profiles:user_id (email, full_name)')
            .order('created_at', { ascending: false })

        if (error) throw error
        return { success: true, feedback: data }
    } catch (error) {
        return { success: false, error: error.message, feedback: [] }
    }
}

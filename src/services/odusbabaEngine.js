import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tier limits for AI features
const TIER_LIMITS = {
    free: { chat: 5, cv_match: 1, skill_gap: 1 },
    registered: { chat: 20, cv_match: 5, skill_gap: 5 },
    professional: { chat: 100, cv_match: 20, skill_gap: 20 },
    employer: { chat: 50, cv_match: 10, skill_gap: 10 },
    business: { chat: 999, cv_match: 999, skill_gap: 999 },
    admin: { chat: 999, cv_match: 999, skill_gap: 999 },
    super_admin: { chat: 999, cv_match: 999, skill_gap: 999 }
}

// Check if user has permission for an action
export async function checkPermission(userId, action, actionData = {}) {
    try {
        // Get user profile
        const { data: user, error } = await supabase
            .from('profiles')
            .select('tier, user_type, country_code')
            .eq('id', userId)
            .single()

        if (error || !user) {
            return { allowed: false, reason: 'User not found' }
        }

        // Super admin has all permissions
        if (user.user_type === 'super_admin') {
            return { allowed: true, reason: null }
        }

        // Check specific actions
        switch (action) {
            case 'post_job':
                const { data: tier } = await supabase
                    .from('tiers')
                    .select('can_post_jobs, job_post_limit')
                    .eq('tier_name', user.tier)
                    .single()
                
                if (!tier?.can_post_jobs) {
                    return { allowed: false, reason: `${user.tier} tier cannot post jobs. Upgrade to employer tier.` }
                }
                return { allowed: true, reason: null }

            case 'apply_job':
                if (user.tier === 'free') {
                    return { allowed: false, reason: 'Free tier cannot apply for jobs. Please register.' }
                }
                if (user.tier === 'registered') {
                    // Check monthly limit (simplified)
                    const { count } = await supabase
                        .from('job_applications')
                        .select('*', { count: 'exact', head: true })
                        .eq('applicant_id', userId)
                        .gte('applied_at', new Date(new Date().setDate(1)).toISOString())
                    
                    if (count >= 10) {
                        return { allowed: false, reason: 'Monthly application limit reached (10). Upgrade to Professional.' }
                    }
                }
                return { allowed: true, reason: null }

            case 'submit_skill':
                if (user.tier === 'free') {
                    return { allowed: false, reason: 'Free tier cannot submit skills. Please register.' }
                }
                if (user.tier === 'registered') {
                    const { count } = await supabase
                        .from('skills')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', userId)
                    
                    if (count >= 3) {
                        return { allowed: false, reason: 'Skill limit reached (3). Upgrade to Professional.' }
                    }
                }
                return { allowed: true, reason: null }

            case 'ai_chat':
                const limit = TIER_LIMITS[user.tier]?.chat || 5
                const { count: chatCount } = await supabase
                    .from('ai_usage_tracking')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', userId)
                    .eq('feature_type', 'chat')
                    .gte('created_at', new Date(new Date().setDate(1)).toISOString())
                
                if (chatCount >= limit) {
                    return { allowed: false, reason: `AI chat limit reached (${limit} per month). Upgrade to continue.` }
                }
                return { allowed: true, reason: null }

            default:
                return { allowed: true, reason: null }
        }
    } catch (error) {
        console.error('Permission check error:', error)
        return { allowed: false, reason: 'System error. Please try again.' }
    }
}

// Log an action to audit logs
export async function logAudit(userId, actionType, wasAllowed, denyReason = null, metadata = {}) {
    try {
        // Get user tier
        const { data: user } = await supabase
            .from('profiles')
            .select('tier, country_code')
            .eq('id', userId)
            .single()

        await supabase.from('audit_logs').insert({
            user_id: userId,
            action_type: actionType,
            tier_at_time: user?.tier || 'unknown',
            jurisdiction: user?.country_code || 'GB',
            was_allowed: wasAllowed,
            deny_reason: denyReason,
            input_payload: metadata,
            confidence: wasAllowed ? 95 : 98,
            risk_score: wasAllowed ? 0 : 75
        })
    } catch (error) {
        console.error('Audit log error:', error)
    }
}

// Record AI usage
export async function recordAIUsage(userId, featureType) {
    try {
        await supabase.from('ai_usage_tracking').insert({
            user_id: userId,
            feature_type: featureType,
            used_count: 1
        })
    } catch (error) {
        console.error('AI usage record error:', error)
    }
}

// Get AI usage remaining for user
export async function getAIRemaining(userId, featureType) {
    try {
        const { data: user } = await supabase
            .from('profiles')
            .select('tier')
            .eq('id', userId)
            .single()

        const limit = TIER_LIMITS[user?.tier]?.[featureType] || 0
        
        const { count } = await supabase
            .from('ai_usage_tracking')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('feature_type', featureType)
            .gte('created_at', new Date(new Date().setDate(1)).toISOString())

        return {
            used: count || 0,
            limit: limit,
            remaining: Math.max(0, limit - (count || 0))
        }
    } catch (error) {
        return { used: 0, limit: 0, remaining: 0 }
    }
}

// Check if user is a tester (has limited uses)
export async function isTester(userId) {
    try {
        const { data: user } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('id', userId)
            .single()
        
        return user?.user_type === 'tester'
    } catch {
        return false
    }
}

// Check if user is super admin
export async function isSuperAdmin(userId) {
    try {
        const { data: user } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('id', userId)
            .single()
        
        return user?.user_type === 'super_admin'
    } catch {
        return false
    }
}

// Get user's tier
export async function getUserTier(userId) {
    try {
        const { data: user } = await supabase
            .from('profiles')
            .select('tier, user_type')
            .eq('id', userId)
            .single()
        
        return user?.tier || 'free'
    } catch {
        return 'free'
    }
}

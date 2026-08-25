// src/services/testerService.js
//
// FIXED (2026-08-23) — full project harmony pass. This file is an entire,
// older, PARALLEL tester management system that predates and conflicts
// with the tester system rebuilt this session (SignUpPage.jsx,
// AdminTesterInvites.jsx, AdminUsers.jsx, tester_invite_codes +
// consume_invite_code()). Concretely:
//
// - registerTester()/upgradeToRegistered() force user_type/tier to
//   'tester'/'free' or 'registered'/'registered' — the OLD, discarded
//   design this session explicitly moved away from (testers now keep
//   their REAL selected tier's user_type, flagged separately via
//   is_tester). Calling either of these on a real account would corrupt
//   it — e.g. downgrading a tester testing at Business tier straight to
//   Registered, losing their real tier entirely (the exact bug already
//   found and fixed once this session in AdminUsers.jsx's old
//   convertTesterToRegistered).
// - generateInviteCode()/validateInviteCode() write/read uses_limit and
//   uses_used on tester_invite_codes — but the REAL, currently-enforced
//   columns (confirmed via consume_invite_code() and
//   AdminTesterInvites.jsx) are max_uses and times_used. A code created
//   via generateInviteCode() here would never actually be honoured by
//   the real signup validation, and vice versa.
// - trackTesterAction() calls supabase.rpc('decrement_tester_uses', ...)
//   — a different RPC name than the real, existing
//   consume_tester_allocation() this session built. Unconfirmed whether
//   decrement_tester_uses exists as a real SQL function at all.
//
// getTesterStatus() is the ONE function confirmed actually in use
// (TesterDashboard.jsx) — read-only, and its shape (remaining_uses,
// allocated_uses, expires_at, status) matches the real tester_allocations
// table correctly. Left working, with one robustness fix (.maybeSingle()
// instead of .single(), so a tester with no allocation row yet degrades
// gracefully instead of throwing).
//
// The other functions are left in place (deleting exported functions
// risks breaking an import I haven't found) but now throw a clear,
// loud error directing to the real system, rather than silently running
// incompatible logic that could corrupt real user data if anything still
// calls them. If nothing calls them, this is a safe no-op; if something
// does, it fails loudly and immediately instead of silently corrupting
// an account.

import { supabase } from '../lib/supabase';

const DEPRECATED_MESSAGE = 'This function is part of an older, incompatible tester system and has been disabled to prevent data corruption — the real tester registration/invite/role system is now in SignUpPage.jsx, AdminTesterInvites.jsx (tester_invite_codes, consume_invite_code), and AdminUsers.jsx (profiles.is_tester). If you see this error, something is still calling the old system and needs to be pointed at the real one.';

// Generate a new invite code (Admin only)
export async function generateInviteCode(adminId, usesLimit = 1, expiresInDays = 30) {
    console.error('[testerService] generateInviteCode() is deprecated:', DEPRECATED_MESSAGE);
    return { success: false, error: DEPRECATED_MESSAGE };
}

// Validate invite code (Public)
export async function validateInviteCode(code) {
    console.error('[testerService] validateInviteCode() is deprecated:', DEPRECATED_MESSAGE);
    return { success: false, error: DEPRECATED_MESSAGE };
}

// Register as tester (uses invite code)
export async function registerTester(email, password, fullName, inviteCode) {
    console.error('[testerService] registerTester() is deprecated:', DEPRECATED_MESSAGE);
    return { success: false, error: DEPRECATED_MESSAGE };
}

// Get tester status (remaining uses, expiry) — the one real, confirmed
// function still in active use (TesterDashboard.jsx). Left working.
export async function getTesterStatus(userId) {
    try {
        // FIXED (2026-08-23): .single() throws if no allocation row
        // exists yet for this user — .maybeSingle() degrades gracefully
        // to a clean "not a tester" result instead of an exception.
        const { data, error } = await supabase
            .from('tester_allocations')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error || !data) {
            return { isTester: false, error: error?.message };
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
    console.error('[testerService] trackTesterAction() is deprecated:', DEPRECATED_MESSAGE);
    return { success: false, error: DEPRECATED_MESSAGE };
}

// Submit tester feedback — real table/columns confirmed against
// AdminTesterFeedback.jsx's flexible field reads (feedback_text, rating
// both match), left working.
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
    console.error('[testerService] upgradeToRegistered() is deprecated:', DEPRECATED_MESSAGE);
    return { success: false, error: DEPRECATED_MESSAGE };
}

// Get all tester feedback (Admin only) — real table confirmed, left
// working. AdminTesterFeedback.jsx queries this table directly itself
// rather than calling this function, but kept working in case anything
// else calls it.
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

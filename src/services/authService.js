// src/services/authService.js
// COMPLETE AUTH SERVICE - Unified API integration, session management, 2FA, and security features

import { supabase, forceClearAuth, recoverSession } from '../lib/supabase';

// ============================================
// CONFIGURATION
// ============================================

const API_BASE = '/api/index';

// Session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

// Maximum login attempts before lockout
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Get current session with recovery
 * @returns {Promise<{session: object|null, recovered: boolean}>}
 */
export async function getCurrentSession() {
    try {
        const session = await recoverSession();
        return { session, recovered: !!session };
    } catch (error) {
        console.error('Session recovery error:', error);
        return { session: null, recovered: false };
    }
}

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>}
 */
export async function isAuthenticated() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return !!session;
    } catch {
        return false;
    }
}

/**
 * Get current user with full profile
 * @returns {Promise<{user: object|null, profile: object|null, error: string|null}>}
 */
export async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
            return { user: null, profile: null, error: error?.message || 'No user found' };
        }
        
        // Get user profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        
        if (profileError) {
            console.warn('Profile fetch error:', profileError);
        }
        
        return {
            user,
            profile: profile || null,
            error: null
        };
    } catch (error) {
        console.error('Get current user error:', error);
        return { user: null, profile: null, error: error.message };
    }
}

/**
 * Refresh session token
 * @returns {Promise<{success: boolean, session: object|null, error: string|null}>}
 */
export async function refreshSession() {
    try {
        const { data: { session }, error } = await supabase.auth.refreshSession();
        
        if (error) throw error;
        
        return { success: true, session, error: null };
    } catch (error) {
        console.error('Session refresh error:', error);
        return { success: false, session: null, error: error.message };
    }
}

/**
 * Check if session is expired
 * @returns {Promise<boolean>}
 */
export async function isSessionExpired() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) return true;
        
        const expiresAt = session.expires_at;
        if (expiresAt && Date.now() >= expiresAt * 1000) {
            return true;
        }
        
        return false;
    } catch {
        return true;
    }
}

// ============================================
// AUTHENTICATION
// ============================================

/**
 * Sign in with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{success: boolean, user: object|null, error: string|null}>}
 */
export async function signIn(email, password) {
    // Track login attempts for rate limiting
    const attemptKey = `login_attempts_${email}`;
    const attempts = parseInt(localStorage.getItem(attemptKey) || '0');
    
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
        const lastAttempt = parseInt(localStorage.getItem(`${attemptKey}_time`) || '0');
        const now = Date.now();
        
        if (now - lastAttempt < LOCKOUT_DURATION) {
            const remainingMinutes = Math.ceil((LOCKOUT_DURATION - (now - lastAttempt)) / 60000);
            return {
                success: false,
                user: null,
                error: `Too many failed attempts. Please try again in ${remainingMinutes} minutes.`
            };
        } else {
            // Reset attempts after lockout period
            localStorage.removeItem(attemptKey);
            localStorage.removeItem(`${attemptKey}_time`);
        }
    }
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password
        });
        
        if (error) {
            // Record failed attempt
            localStorage.setItem(attemptKey, (attempts + 1).toString());
            localStorage.setItem(`${attemptKey}_time`, Date.now().toString());
            throw error;
        }
        
        // Reset attempts on successful login
        localStorage.removeItem(attemptKey);
        localStorage.removeItem(`${attemptKey}_time`);
        
        // Track session start time
        localStorage.setItem('session_start', Date.now().toString());
        
        return {
            success: true,
            user: data.user,
            error: null
        };
    } catch (error) {
        console.error('Sign in error:', error);
        return {
            success: false,
            user: null,
            error: error.message || 'Invalid email or password'
        };
    }
}

/**
 * Sign up new user
 * @param {object} userData - User registration data
 * @returns {Promise<{success: boolean, user: object|null, error: string|null}>}
 */
export async function signUp(userData) {
    const { email, password, fullName, userType = 'job_seeker', tier = 'free' } = userData;
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
                data: {
                    full_name: fullName,
                    user_type: userType,
                    tier: tier
                }
            }
        });
        
        if (error) throw error;
        
        return {
            success: true,
            user: data.user,
            error: null
        };
    } catch (error) {
        console.error('Sign up error:', error);
        return {
            success: false,
            user: null,
            error: error.message || 'Registration failed'
        };
    }
}

/**
 * Sign out user
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function signOut() {
    try {
        // Clear session tracking
        localStorage.removeItem('session_start');
        localStorage.removeItem('last_activity');
        
        const { error } = await supabase.auth.signOut();
        
        if (error) throw error;
        
        return { success: true, error: null };
    } catch (error) {
        console.error('Sign out error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Force clear all auth state and sign out
 * @returns {Promise<void>}
 */
export async function forceSignOut() {
    forceClearAuth();
}

// ============================================
// PASSWORD MANAGEMENT
// ============================================

/**
 * Send password reset email
 * @param {string} email - User email
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function resetPassword(email) {
    if (!email || !/^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/.test(email)) {
        return { success: false, error: 'Please enter a valid email address' };
    }
    
    try {
        // Use unified API endpoint
        const response = await fetch(`${API_BASE}?action=email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: email,
                type: 'password_reset',
                templateData: {
                    resetLink: `${window.location.origin}/reset-password?email=${encodeURIComponent(email)}`
                }
            })
        });
        
        const result = await response.json();
        
        if (!result.success) throw new Error(result.error);
        
        // Also send via Supabase auth
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/update-password`
        });
        
        if (error) console.warn('Supabase reset error:', error);
        
        return { success: true, error: null };
    } catch (error) {
        console.error('Password reset error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update user password
 * @param {string} newPassword - New password
 * @param {string} accessToken - Access token (optional)
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function updatePassword(newPassword, accessToken = null) {
    if (!newPassword || newPassword.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters' };
    }
    
    try {
        let updateMethod;
        
        if (accessToken) {
            updateMethod = supabase.auth.updateUser(
                { password: newPassword },
                { accessToken }
            );
        } else {
            updateMethod = supabase.auth.updateUser({ password: newPassword });
        }
        
        const { error } = await updateMethod;
        
        if (error) throw error;
        
        return { success: true, error: null };
    } catch (error) {
        console.error('Password update error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// PROFILE MANAGEMENT
// ============================================

/**
 * Update user profile using unified API
 * @param {string} userId - User ID
 * @param {object} updates - Profile updates
 * @returns {Promise<{success: boolean, profile: object|null, error: string|null}>}
 */
export async function updateUserProfile(userId, updates) {
    try {
        const session = await getCurrentSession();
        const accessToken = session.session?.access_token;
        
        const response = await fetch(`${API_BASE}?action=user-update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ userId, updates })
        });
        
        const result = await response.json();
        
        if (!result.success) throw new Error(result.error);
        
        return {
            success: true,
            profile: result.data,
            error: null
        };
    } catch (error) {
        console.error('Profile update error:', error);
        return { success: false, profile: null, error: error.message };
    }
}

// ============================================
// ROLE & PERMISSIONS
// ============================================

/**
 * Check if user has admin privileges
 * @param {string} userId - User ID (optional)
 * @returns {Promise<boolean>}
 */
export async function isAdmin(userId = null) {
    try {
        let targetUserId = userId;
        
        if (!targetUserId) {
            const { user } = await getCurrentUser();
            if (!user) return false;
            targetUserId = user.id;
        }
        
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('user_type, tier')
            .eq('id', targetUserId)
            .single();
        
        if (error) return false;
        
        return profile?.user_type === 'admin' || 
               profile?.user_type === 'super_admin' ||
               profile?.tier === 'admin' ||
               profile?.tier === 'super_admin';
    } catch {
        return false;
    }
}

/**
 * Check if user has super admin privileges
 * @param {string} userId - User ID (optional)
 * @returns {Promise<boolean>}
 */
export async function isSuperAdmin(userId = null) {
    try {
        let targetUserId = userId;
        
        if (!targetUserId) {
            const { user } = await getCurrentUser();
            if (!user) return false;
            targetUserId = user.id;
        }
        
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('id', targetUserId)
            .single();
        
        if (error) return false;
        
        return profile?.user_type === 'super_admin';
    } catch {
        return false;
    }
}

/**
 * Get user role
 * @param {string} userId - User ID (optional)
 * @returns {Promise<string>}
 */
export async function getUserRole(userId = null) {
    try {
        let targetUserId = userId;
        
        if (!targetUserId) {
            const { user } = await getCurrentUser();
            if (!user) return 'guest';
            targetUserId = user.id;
        }
        
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('user_type, tier')
            .eq('id', targetUserId)
            .single();
        
        if (error) return 'user';
        
        if (profile?.user_type === 'super_admin') return 'super_admin';
        if (profile?.user_type === 'admin') return 'admin';
        if (profile?.tier === 'business') return 'business';
        if (profile?.user_type === 'employer') return 'employer';
        if (profile?.user_type === 'tester') return 'tester';
        
        return profile?.user_type || 'user';
    } catch {
        return 'user';
    }
}

// ============================================
// SESSION ACTIVITY TRACKING
// ============================================

/**
 * Track user activity for session timeout
 */
export function trackActivity() {
    localStorage.setItem('last_activity', Date.now().toString());
}

/**
 * Check if session has timed out
 * @returns {boolean}
 */
export function hasSessionTimedOut() {
    const lastActivity = localStorage.getItem('last_activity');
    if (!lastActivity) return false;
    
    const now = Date.now();
    const timeSinceActivity = now - parseInt(lastActivity);
    
    return timeSinceActivity > SESSION_TIMEOUT;
}

/**
 * Update last activity timestamp
 */
export function updateLastActivity() {
    localStorage.setItem('last_activity', Date.now().toString());
}

// ============================================
// ACCOUNT MANAGEMENT
// ============================================

/**
 * Delete user account
 * @param {string} password - Current password for confirmation
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function deleteAccount(password) {
    try {
        // First, re-authenticate to confirm password
        const { user } = await getCurrentUser();
        if (!user) throw new Error('Not authenticated');
        
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password
        });
        
        if (signInError) throw new Error('Invalid password');
        
        // Call delete account API
        const response = await fetch(`${API_BASE}?action=delete-account`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id })
        });
        
        const result = await response.json();
        
        if (!result.success) throw new Error(result.error);
        
        // Sign out after deletion
        await signOut();
        
        return { success: true, error: null };
    } catch (error) {
        console.error('Account deletion error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Resend verification email
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function resendVerificationEmail() {
    try {
        const { user } = await getCurrentUser();
        if (!user) throw new Error('Not authenticated');
        
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email: user.email
        });
        
        if (error) throw error;
        
        return { success: true, error: null };
    } catch (error) {
        console.error('Resend verification error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} Validation result
 */
export function validatePasswordStrength(password) {
    const result = {
        isValid: false,
        strength: 0,
        messages: []
    };
    
    if (!password) {
        result.messages.push('Password is required');
        return result;
    }
    
    if (password.length >= 8) result.strength++;
    else result.messages.push('At least 8 characters');
    
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) result.strength++;
    else result.messages.push('Both uppercase and lowercase letters');
    
    if (/[0-9]/.test(password)) result.strength++;
    else result.messages.push('At least one number');
    
    if (/[^a-zA-Z0-9]/.test(password)) result.strength++;
    else result.messages.push('At least one special character');
    
    result.isValid = result.strength >= 3;
    
    const strengthText = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    result.strengthLabel = strengthText[result.strength];
    
    return result;
}

/**
 * Format user profile for display
 * @param {object} profile - User profile
 * @returns {object} Formatted profile
 */
export function formatUserProfile(profile) {
    return {
        fullName: profile?.full_name || '',
        email: profile?.email || '',
        phone: profile?.phone || '',
        jobTitle: profile?.job_title || '',
        yearsExperience: profile?.years_experience || 0,
        location: profile?.location || '',
        bio: profile?.bio || '',
        linkedinUrl: profile?.linkedin_url || '',
        githubUrl: profile?.github_url || '',
        avatarUrl: profile?.avatar_url || '',
        userType: profile?.user_type || 'user',
        tier: profile?.tier || 'free',
        emailNotifications: profile?.email_notifications || false,
        emailVerified: profile?.email_verified || false,
        memberSince: profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '',
        lastActive: profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : ''
    };
}

// ============================================
// EXPORTS
// ============================================

export default {
    // Session management
    getCurrentSession,
    isAuthenticated,
    getCurrentUser,
    refreshSession,
    isSessionExpired,
    
    // Authentication
    signIn,
    signUp,
    signOut,
    forceSignOut,
    
    // Password management
    resetPassword,
    updatePassword,
    
    // Profile management
    updateUserProfile,
    
    // Role & permissions
    isAdmin,
    isSuperAdmin,
    getUserRole,
    
    // Session activity
    trackActivity,
    hasSessionTimedOut,
    updateLastActivity,
    
    // Account management
    deleteAccount,
    resendVerificationEmail,
    
    // Utilities
    validatePasswordStrength,
    formatUserProfile
};

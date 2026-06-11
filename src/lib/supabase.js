// src/lib/supabase.js
// ODUSBABA SUPABASE CLIENT v3.1 - PRODUCTION READY
// ✅ Singleton pattern with environment validation
// ✅ Auth storage management with corruption detection
// ✅ Unified API helper with retry logic
// ✅ Security: User permission validation
// ✅ No top-level await, safe for all environments

import { createClient } from '@supabase/supabase-js';

// ============================================
// CONFIGURATION & ENVIRONMENT VALIDATION
// ============================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
    const missing = [];
    if (!supabaseUrl) missing.push('VITE_SUPABASE_URL');
    if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY');
    
    console.error(`❌ Missing Supabase environment variables: ${missing.join(', ')}`);
    
    // Only throw in development, use fallbacks in production
    if (import.meta.env.DEV) {
        throw new Error('Missing Supabase configuration');
    }
}

// Storage key generation
const cleanUrl = supabaseUrl?.replace(/[^a-zA-Z0-9]/g, '') || 'bluskye';
const STORAGE_KEY = `bluskye_auth_${cleanUrl}`;
const DEFAULT_STORAGE = typeof window !== 'undefined' ? window.localStorage : undefined;

// ============================================
// SINGLETON PATTERN (Synchronous initialization)
// ============================================

let supabaseInstance = null;
let isInitializing = false;

/**
 * Get or create Supabase client instance (singleton pattern)
 * @returns {SupabaseClient} Supabase client instance
 */
export const getSupabase = () => {
    // Return existing instance immediately
    if (supabaseInstance) return supabaseInstance;
    
    // Prevent concurrent initialization
    if (isInitializing) {
        const startTime = Date.now();
        while (isInitializing && Date.now() - startTime < 100) {
            // Wait for initialization
        }
        return supabaseInstance;
    }
    
    isInitializing = true;
    
    try {
        supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true,
                storageKey: STORAGE_KEY,
                storage: DEFAULT_STORAGE,
                flowType: 'pkce',
                debug: import.meta.env.DEV && false
            },
            db: {
                schema: 'public'
            },
            global: {
                headers: {
                    'x-application-name': 'bluskye-consult',
                    'x-client-info': 'bluskye@3.1.0'
                }
            }
        });
        
        if (import.meta.env.DEV) {
            console.log('✅ Supabase client initialized');
        }
        
        return supabaseInstance;
    } catch (error) {
        console.error('❌ Failed to initialize Supabase:', error);
        throw error;
    } finally {
        isInitializing = false;
    }
};

// Export client synchronously (no top-level await)
export const supabase = getSupabase();

// Make globally available (FIXES "supabase is not defined" errors)
if (typeof window !== 'undefined') {
    window.supabase = supabase;
}

// Freeze in production to prevent modifications
if (import.meta.env.PROD && supabase && typeof Object.freeze === 'function') {
    Object.freeze(supabase);
}

// ============================================
// AUTH STORAGE MANAGEMENT
// ============================================

/**
 * Clear all authentication-related storage
 */
export function clearAuthStorage() {
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(STORAGE_KEY);
            
            // Alternative keys (legacy cleanup)
            const altKeys = [
                `sb-${cleanUrl}-auth-token`,
                `sb-${cleanUrl}-session`,
                'supabase-auth-token',
                'sb-auth-token',
                'bluskye-auth-token',
                'bluskye_prod_auth',
                'bluskye-auth', // Legacy key from simple version
                'lastPath' // From RUTH Standard
            ];
            
            altKeys.forEach(key => {
                try { localStorage.removeItem(key); } catch (e) {}
            });
        }
        
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.clear();
        }
        
        if (import.meta.env.DEV) console.log('🗑️ Auth storage cleared');
    } catch (err) {
        console.debug('Error clearing auth storage:', err);
    }
}

/**
 * Force clear authentication and redirect to login
 */
export async function clearAuthAndRetry() {
    console.warn('🔄 Clearing corrupted auth state...');
    clearAuthStorage();
    
    try {
        await supabase.auth.signOut();
    } catch (e) {
        console.debug('Sign out error (ignored):', e.message);
    }
    
    window.location.href = '/admin-login?cleared=1';
}

export const forceClearAuth = clearAuthAndRetry;
export const forceClearAndRedirect = clearAuthAndRetry;

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Recover or validate current session
 * @returns {Promise<{session: import('@supabase/supabase-js').Session | null, isValid: boolean}>}
 */
export async function recoverSession() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
            return { session: null, isValid: false };
        }
        
        // Check if session is expired
        const expiresAt = session.expires_at;
        if (expiresAt && Date.now() >= expiresAt * 1000) {
            return { session: null, isValid: false };
        }
        
        return { session, isValid: true };
    } catch (err) {
        console.error('Session recovery failed:', err);
        return { session: null, isValid: false };
    }
}

/**
 * Check current session (simplified)
 * @returns {Promise<import('@supabase/supabase-js').Session | null>}
 */
export async function checkSession() {
    const { session } = await recoverSession();
    return session;
}

/**
 * Check if session is valid
 * @returns {Promise<boolean>}
 */
export async function isSessionValid() {
    const { isValid } = await recoverSession();
    return isValid;
}

/**
 * Get current user with session recovery
 * @returns {Promise<import('@supabase/supabase-js').User | null>}
 */
export async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
            // Try to recover session first
            const { isValid } = await recoverSession();
            if (!isValid) return null;
            
            // Retry getting user
            const { data: { user: retryUser }, error: retryError } = await supabase.auth.getUser();
            if (retryError || !retryUser) return null;
            return retryUser;
        }
        
        return user;
    } catch (err) {
        console.error('Get current user failed:', err);
        return null;
    }
}

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>}
 */
export async function isAuthenticated() {
    const user = await getCurrentUser();
    return !!user;
}

// ============================================
// SECURITY & PERMISSION VALIDATION (NEW from Code 2)
// ============================================

/**
 * Validate user permissions before sensitive operations
 * @param {string} userId - User ID to validate
 * @param {string|null} requiredRole - Required role ('admin' or null for any authenticated user)
 * @returns {Promise<boolean>} - True if user has required permissions
 */
export async function validateUserAccess(userId, requiredRole = null) {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('user_type, tier')
            .eq('id', userId)
            .single();
        
        if (error || !profile) return false;
        
        if (requiredRole === 'admin') {
            return profile?.user_type === 'admin' || profile?.user_type === 'super_admin';
        }
        
        return true;
    } catch (err) {
        console.error('User access validation failed:', err);
        return false;
    }
}

/**
 * Get current user with permission check
 * @param {string|null} requiredRole - Required role ('admin' or null for any authenticated user)
 * @returns {Promise<import('@supabase/supabase-js').User | null>}
 */
export async function getCurrentUserWithPermission(requiredRole = null) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        
        if (requiredRole) {
            const hasAccess = await validateUserAccess(user.id, requiredRole);
            if (!hasAccess) return null;
        }
        
        return user;
    } catch (err) {
        console.error('Get current user with permission failed:', err);
        return null;
    }
}

/**
 * Check if current user has admin access
 * @returns {Promise<boolean>}
 */
export async function isAdmin() {
    const user = await getCurrentUser();
    if (!user) return false;
    return validateUserAccess(user.id, 'admin');
}

// ============================================
// AUTH EVENT LISTENER
// ============================================

let authSubscription = null;
let authEventListeners = new Map();

/**
 * Initialize auth state listener
 * @returns {Function} Cleanup function
 */
export function initAuthListener() {
    // Prevent duplicate listeners
    if (authSubscription) {
        return () => {
            if (authSubscription) {
                authSubscription.unsubscribe();
                authSubscription = null;
            }
        };
    }
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (import.meta.env.DEV) {
            console.log(`🔐 Auth event: ${event}`, session?.user?.email || 'no user');
        }
        
        // Notify registered listeners
        authEventListeners.forEach((callback) => {
            try {
                callback(event, session);
            } catch (err) {
                console.error('Auth listener error:', err);
            }
        });
        
        // Clear storage on sign out
        if (event === 'SIGNED_OUT') {
            clearAuthStorage();
            localStorage.removeItem('lastPath');
        }
        
        // Log token refresh
        if (event === 'TOKEN_REFRESHED' && import.meta.env.DEV) {
            console.log('✅ Token refreshed successfully');
        }
    });
    
    authSubscription = subscription;
    
    return () => {
        if (authSubscription) {
            authSubscription.unsubscribe();
            authSubscription = null;
        }
        authEventListeners.clear();
    };
}

/**
 * Register auth state change listener
 * @param {Function} callback - Callback(event, session)
 * @returns {Function} Unsubscribe function
 */
export function onAuthStateChange(callback) {
    const id = Date.now().toString() + Math.random();
    authEventListeners.set(id, callback);
    return () => authEventListeners.delete(id);
}

/**
 * Clean up auth listener
 */
export function cleanupAuthListener() {
    if (authSubscription) {
        authSubscription.unsubscribe();
        authSubscription = null;
    }
    authEventListeners.clear();
}

// ============================================
// CORRUPTION DETECTION & RECOVERY
// ============================================

/**
 * Check if auth state might be corrupted
 * @returns {Promise<boolean>}
 */
export async function isAuthCorrupted() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // If there's a session but error, it's corrupted
        if (session && error) return true;
        
        // Check for invalid token format
        if (typeof localStorage !== 'undefined') {
            const token = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('supabase-auth-token');
            if (token && (!token.includes('.') || token.split('.').length !== 3)) return true;
        }
        
        return false;
    } catch {
        return true;
    }
}

/**
 * Force refresh the current session
 * @returns {Promise<boolean>}
 */
export async function forceRefreshSession() {
    try {
        const { data: { session }, error } = await supabase.auth.refreshSession();
        if (error) throw error;
        return !!session;
    } catch (err) {
        console.error('Force refresh failed:', err);
        return false;
    }
}

/**
 * Repair corrupted session (clear and reload)
 */
export async function repairCorruptedSession() {
    console.warn('🔧 Attempting to repair corrupted session...');
    clearAuthStorage();
    
    try {
        await supabase.auth.signOut();
    } catch (e) {
        // Ignore
    }
    
    window.location.reload();
}

// ============================================
// PERFORMANCE OPTIMIZATIONS (RUTH Standard)
// ============================================

/**
 * Execute query with automatic retry on network failures
 * @param {Function} queryFn - Async function to execute
 * @param {number} retries - Number of retry attempts (default: 3)
 * @param {number} delay - Initial delay in ms (default: 1000)
 * @returns {Promise<any>} Query result
 */
export const supabaseWithRetry = async (queryFn, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await queryFn();
        } catch (error) {
            if (i === retries - 1) throw error;
            if (error.message?.includes('fetch failed') || error.message?.includes('network')) {
                await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
                continue;
            }
            throw error;
        }
    }
};

/**
 * Batch update VA credits for multiple users
 * @param {Array<{userId: string, balance: number}>} updates - Array of user credit updates
 * @returns {Promise<Array>} Results of all updates
 */
export async function batchUpdateVACredits(updates) {
    const promises = updates.map(({ userId, balance }) => 
        supabase.from('va_credits').upsert({ user_id: userId, balance }, { onConflict: 'user_id' })
    );
    return Promise.all(promises);
}

// ============================================
// UNIFIED API HELPER
// ============================================

/**
 * Make authenticated API call to unified endpoint
 * @param {string} action - API action name
 * @param {Object} data - Request data
 * @param {string} method - HTTP method (default: 'POST')
 * @returns {Promise<Object>} API response
 */
export async function apiCall(action, data = {}, method = 'POST') {
    try {
        const currentUser = await getCurrentUser();
        const response = await fetch(`/api/index?action=${action}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(currentUser?.id && { 'X-User-Id': currentUser.id })
            },
            body: method !== 'GET' ? JSON.stringify(data) : undefined
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'API call failed');
        }
        
        return result;
    } catch (error) {
        console.error(`API call error (${action}):`, error);
        throw error;
    }
}

// ============================================
// USER PROFILE HELPER
// ============================================

/**
 * Update user profile using unified API
 * @param {Object} updates - Profile updates
 * @returns {Promise<Object>} Update result
 */
export async function updateUserProfile(updates) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    return apiCall('user-update', {
        userId: user.id,
        updates
    });
}

// ============================================
// DEFAULT EXPORT
// ============================================

export default supabase;

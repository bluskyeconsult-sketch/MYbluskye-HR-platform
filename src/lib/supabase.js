// src/lib/supabase.js
// ROBUST SINGLETON - Prevents multiple instances, handles SSR, validates configuration, fixes token refresh errors

import { createClient } from '@supabase/supabase-js';

// ============================================
// ENVIRONMENT VALIDATION
// ============================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Clear error messages for debugging
if (!supabaseUrl || !supabaseAnonKey) {
    const missing = [];
    if (!supabaseUrl) missing.push('VITE_SUPABASE_URL');
    if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY');
    
    console.error(
        `❌ Missing Supabase environment variables: ${missing.join(', ')}\n\n` +
        'Please check your .env file has:\n' +
        'VITE_SUPABASE_URL=your_project_url\n' +
        'VITE_SUPABASE_ANON_KEY=your_anon_key'
    );
}

// Clean URL for storage key generation
const cleanUrl = supabaseUrl?.replace(/[^a-zA-Z0-9]/g, '') || 'bluskye';
const STORAGE_KEY = 'bluskye-auth-token';

// ============================================
// SINGLETON PATTERN
// ============================================
let supabaseInstance = null;
let isInitializing = false;

/**
 * Get or create Supabase client instance (singleton pattern)
 * @returns {SupabaseClient} Supabase client instance
 */
export const getSupabase = () => {
    // Return existing instance if available
    if (supabaseInstance) {
        return supabaseInstance;
    }
    
    // Prevent concurrent initialization
    if (isInitializing) {
        // Wait for initialization to complete (max 100ms)
        const startTime = Date.now();
        while (isInitializing && Date.now() - startTime < 100) {
            // Busy wait - acceptable for initialization race conditions
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
                storage: typeof window !== 'undefined' ? window.localStorage : undefined,
                flowType: 'pkce',
                debug: false // Set to true for debugging token issues
            },
            db: {
                schema: 'public'
            },
            global: {
                headers: {
                    'x-application-name': 'bluskye-consult',
                    'x-client-info': 'bluskye@1.0.0'
                }
            }
        });
        
        if (import.meta.env.DEV) {
            console.log('✅ Supabase client initialized (singleton)');
        }
        
        return supabaseInstance;
    } catch (error) {
        console.error('❌ Failed to initialize Supabase client:', error);
        throw error;
    } finally {
        isInitializing = false;
    }
};

// ============================================
// EXPORT SINGLETON INSTANCE
// ============================================
export const supabase = getSupabase();

// Freeze to prevent modifications (optional, helps with debugging)
if (typeof Object.freeze === 'function' && import.meta.env.PROD && supabase) {
    Object.freeze(supabase);
}

// ============================================
// SESSION MANAGEMENT HELPERS
// ============================================

/**
 * Clear corrupted auth state and redirect to sign-in
 * Use this when you get "object is not extensible" errors
 */
export async function clearAndReauth() {
    try {
        console.warn('🔄 Clearing corrupted auth state...');
        
        // Clear all auth-related storage
        const keysToRemove = [
            STORAGE_KEY,
            `sb-${cleanUrl}-auth-token`,
            `sb-${cleanUrl}-session`,
            'supabase-auth-token',
            'sb-auth-token'
        ];
        
        keysToRemove.forEach(key => {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem(key);
            }
        });
        
        // Clear session storage as well
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.clear();
        }
        
        // Sign out if client exists
        if (supabaseInstance) {
            await supabaseInstance.auth.signOut();
        }
        
        // Redirect to sign-in
        window.location.href = '/sign-in?cleared=1';
    } catch (err) {
        console.error('Clear auth failed:', err);
        window.location.href = '/sign-in';
    }
}

/**
 * Recover or refresh the current session
 * Use this after app startup to validate session
 * @returns {Promise<{session: Session|null, recovered: boolean}>}
 */
export async function recoverSession() {
    try {
        // First, try to get existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.warn('Session recovery error:', error.message);
            
            // If token refresh failed, clear and return null
            if (error.message?.includes('refresh') || error.message?.includes('token')) {
                await clearAndReauth();
                return { session: null, recovered: false };
            }
            return { session: null, recovered: false };
        }
        
        if (!session) {
            // Try to refresh session
            const { data: { session: refreshed }, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
                console.warn('No valid session found');
                return { session: null, recovered: false };
            }
            return { session: refreshed, recovered: true };
        }
        
        // Check if session is expired
        const expiresAt = session.expires_at;
        if (expiresAt && Date.now() >= expiresAt * 1000) {
            // Try to refresh expired session
            const { data: { session: refreshed }, error: refreshError } = await supabase.auth.refreshSession();
            if (!refreshError && refreshed) {
                return { session: refreshed, recovered: true };
            }
        }
        
        return { session, recovered: false };
    } catch (err) {
        console.error('Session recovery failed:', err);
        return { session: null, recovered: false };
    }
}

/**
 * Check if current session is valid and not expired
 * @returns {Promise<boolean>}
 */
export async function isSessionValid() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) return false;
        
        // Check if token is expired
        const expiresAt = session.expires_at;
        if (expiresAt) {
            const isExpired = Date.now() >= expiresAt * 1000;
            if (isExpired) {
                // Try to refresh
                const { data: { session: refreshed }, error: refreshError } = await supabase.auth.refreshSession();
                return !refreshError && !!refreshed;
            }
        }
        
        return true;
    } catch {
        return false;
    }
}

/**
 * Get current user with automatic session recovery
 * @returns {Promise<User|null>}
 */
export async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
            // Try to recover session first
            const { session, recovered } = await recoverSession();
            if (!session) return null;
            
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

// ============================================
// AUTH EVENT LISTENER (Fixes "object is not extensible")
// ============================================
let authListener = null;
let authSubscription = null;

/**
 * Initialize auth state listener for debugging and token refresh handling
 * Call this once in your App component
 * @returns {Function} Cleanup function
 */
export function initAuthListener() {
    // Don't create multiple listeners
    if (authSubscription) {
        return () => {
            if (authSubscription) {
                authSubscription.unsubscribe();
                authSubscription = null;
            }
        };
    }
    
    // Set up the auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (import.meta.env.DEV) {
            console.log(`🔐 Auth event: ${event}`, session?.user?.email || 'no user');
        }
        
        // Handle token refresh errors specifically
        if (event === 'TOKEN_REFRESHED') {
            console.log('✅ Token refreshed successfully');
        }
        
        // Handle token refresh error (fixes "object is not extensible")
        if (event === 'USER_UPDATED' && !session) {
            console.warn('⚠️ Session may be corrupted - attempt recovery');
            recoverSession().catch(() => {});
        }
        
        if (event === 'SIGNED_OUT') {
            // Clear any custom state if needed
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('lastPath');
            }
        }
    });
    
    authSubscription = subscription;
    
    // Return cleanup function
    return () => {
        if (authSubscription) {
            authSubscription.unsubscribe();
            authSubscription = null;
        }
    };
}

/**
 * Clean up auth listener (call on app unmount)
 */
export function cleanupAuthListener() {
    if (authSubscription) {
        authSubscription.unsubscribe();
        authSubscription = null;
    }
    if (authListener) {
        authListener = null;
    }
}

// ============================================
// HELPER: Check if auth state is corrupted
// ============================================

/**
 * Check if the current auth state might be corrupted
 * @returns {Promise<boolean>}
 */
export async function isAuthCorrupted() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // If there's a session but we can't get user, it might be corrupted
        if (session && error) {
            return true;
        }
        
        // Check for invalid token format
        const token = localStorage.getItem(STORAGE_KEY);
        if (token && !token.includes('.')) {
            return true;
        }
        
        return false;
    } catch {
        return true;
    }
}

/**
 * Force refresh the session (call when you suspect issues)
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

// ============================================
// EXPORT ADDITIONAL HELPERS
// ============================================
export default supabase;

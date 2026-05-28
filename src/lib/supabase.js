// src/lib/supabase.js
// ROBUST SINGLETON - Production-ready with auto-refresh disabled, error handling, and session recovery

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
const STORAGE_KEY = 'bluskye_prod_auth';

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
        const startTime = Date.now();
        while (isInitializing && Date.now() - startTime < 100) {
            // Busy wait for initialization race conditions
        }
        return supabaseInstance;
    }
    
    isInitializing = true;
    
    try {
        supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                autoRefreshToken: false,  // CRITICAL: Disabled for production to prevent token refresh conflicts
                persistSession: true,
                detectSessionInUrl: false,  // Disabled to prevent URL hash issues
                storageKey: STORAGE_KEY,
                storage: typeof window !== 'undefined' ? window.localStorage : undefined,
                flowType: 'pkce',
                debug: false
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
            console.log('✅ Supabase client initialized (production mode - autoRefreshToken: false)');
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

// Freeze to prevent modifications in production
if (typeof Object.freeze === 'function' && import.meta.env.PROD && supabase) {
    Object.freeze(supabase);
}

// ============================================
// PRODUCTION SESSION MANAGEMENT
// ============================================

/**
 * Recover or refresh the current session (production-safe)
 * @returns {Promise<{session: Session|null, recovered: boolean}>}
 */
export async function recoverProductionSession() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.warn('Session recovery error:', error.message);
            
            // Clear corrupted data
            clearAuthStorage();
            
            return { session: null, recovered: false };
        }
        
        if (!session) {
            // Clear any stale data
            clearAuthStorage();
            return { session: null, recovered: false };
        }
        
        // Check if session is expired
        const expiresAt = session.expires_at;
        if (expiresAt && Date.now() >= expiresAt * 1000) {
            // Session expired, clear it
            clearAuthStorage();
            return { session: null, recovered: false };
        }
        
        return { session, recovered: false };
    } catch (err) {
        console.error('Session recovery failed:', err);
        clearAuthStorage();
        return { session: null, recovered: false };
    }
}

/**
 * Clear all auth-related storage
 */
export function clearAuthStorage() {
    try {
        // Clear main storage key
        localStorage.removeItem(STORAGE_KEY);
        
        // Clear possible alternative keys
        const altKeys = [
            `sb-${cleanUrl}-auth-token`,
            `sb-${cleanUrl}-session`,
            'supabase-auth-token',
            'sb-auth-token',
            'supabase-auth-refresh-token'
        ];
        
        altKeys.forEach(key => {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                // Ignore
            }
        });
        
        // Clear session storage
        try {
            sessionStorage.clear();
        } catch (e) {
            // Ignore
        }
        
        if (import.meta.env.DEV) {
            console.log('🗑️ Auth storage cleared');
        }
    } catch (err) {
        console.debug('Error clearing auth storage:', err);
    }
}

/**
 * Force clear for production (nuclear option)
 * Use this when you get "object is not extensible" errors
 */
export async function forceClearProduction() {
    try {
        console.warn('💣 Force clearing production auth state...');
        
        // Clear all storage
        clearAuthStorage();
        
        // Try to sign out
        try {
            await supabase.auth.signOut();
        } catch (e) {
            // Ignore signout errors
            console.debug('Sign out error (ignored):', e.message);
        }
        
        // Redirect to admin login with cleared flag
        window.location.href = '/admin-login?cleared=1';
    } catch (e) {
        console.error('Force clear failed:', e);
        window.location.href = '/admin-login';
    }
}

// ============================================
// FORCE CLEAR AND REDIRECT (Alias for compatibility)
// ============================================
export const forceClearAndRedirect = forceClearProduction;

// ============================================
// SESSION HELPERS
// ============================================

/**
 * Check if current session is valid
 * @returns {Promise<boolean>}
 */
export async function isSessionValid() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) return false;
        
        // Check if token is expired
        const expiresAt = session.expires_at;
        if (expiresAt && Date.now() >= expiresAt * 1000) {
            return false;
        }
        
        return true;
    } catch {
        return false;
    }
}

/**
 * Get current user with session recovery
 * @returns {Promise<User|null>}
 */
export async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
            const { session } = await recoverProductionSession();
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
// AUTH EVENT LISTENER (Optional)
// ============================================
let authSubscription = null;

/**
 * Initialize auth state listener for debugging
 * @returns {Function} Cleanup function
 */
export function initAuthListener() {
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
        
        if (event === 'SIGNED_OUT') {
            clearAuthStorage();
        }
    });
    
    authSubscription = subscription;
    
    return () => {
        if (authSubscription) {
            authSubscription.unsubscribe();
            authSubscription = null;
        }
    };
}

/**
 * Clean up auth listener
 */
export function cleanupAuthListener() {
    if (authSubscription) {
        authSubscription.unsubscribe();
        authSubscription = null;
    }
}

// ============================================
// CHECK IF AUTH IS CORRUPTED
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

// ============================================
// EXPORT DEFAULT
// ============================================
export default supabase;

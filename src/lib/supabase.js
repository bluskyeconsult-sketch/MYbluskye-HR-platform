// src/lib/supabase.js - COMPLETE PRODUCTION FIX
// Includes all necessary exports for App.jsx and AdminLogin.jsx

import { createClient } from '@supabase/supabase-js';

// ============================================
// ENVIRONMENT VALIDATION
// ============================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
    const missing = [];
    if (!supabaseUrl) missing.push('VITE_SUPABASE_URL');
    if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY');
    
    console.error(`❌ Missing Supabase environment variables: ${missing.join(', ')}`);
    throw new Error('Missing Supabase configuration');
}

// Clean URL for storage keys
const cleanUrl = supabaseUrl.replace(/[^a-zA-Z0-9]/g, '');
const STORAGE_KEY = `bluskye_auth_${cleanUrl}`;

// ============================================
// SINGLETON PATTERN
// ============================================
let supabaseInstance = null;
let isInitializing = false;

/**
 * Get or create Supabase client instance (singleton pattern)
 */
export const getSupabase = () => {
    if (supabaseInstance) return supabaseInstance;
    
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
                autoRefreshToken: false,  // DISABLED - prevents corruption
                persistSession: true,
                detectSessionInUrl: false,
                storageKey: STORAGE_KEY,
                storage: typeof window !== 'undefined' ? window.localStorage : undefined,
                flowType: 'implicit'  // SIMPLER than pkce for production
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
            console.log('✅ Supabase client initialized (production mode)');
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

// Freeze in production to prevent modifications
if (typeof Object.freeze === 'function' && import.meta.env.PROD && supabase) {
    Object.freeze(supabase);
}

// ============================================
// AUTH STORAGE MANAGEMENT
// ============================================

/**
 * Clear all auth-related storage
 */
export function clearAuthStorage() {
    try {
        // Main storage key
        localStorage.removeItem(STORAGE_KEY);
        
        // Alternative keys that might contain auth data
        const altKeys = [
            `sb-${cleanUrl}-auth-token`,
            `sb-${cleanUrl}-session`,
            'supabase-auth-token',
            'sb-auth-token',
            'bluskye-auth',
            'bluskye-auth-token',
            'bluskye_prod_auth'
        ];
        
        altKeys.forEach(key => {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                // Ignore individual failures
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
 * Force clear all auth data (nuclear option)
 */
export async function forceClearAuth() {
    try {
        console.warn('💣 Force clearing all auth state...');
        clearAuthStorage();
        
        try {
            await supabase.auth.signOut();
        } catch (e) {
            console.debug('Sign out error (ignored):', e.message);
        }
        
        // Force hard redirect
        window.location.href = '/admin-login?cleared=1';
    } catch (e) {
        console.error('Force clear failed:', e);
        window.location.href = '/admin-login';
    }
}

// Alias for compatibility with other files
export const forceClearAndRedirect = forceClearAuth;

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Simple session check
 * @returns {Promise<Session|null>}
 */
export async function checkSession() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
            return null;
        }
        return session;
    } catch (err) {
        console.error('Session check failed:', err);
        return null;
    }
}

/**
 * Recover session (alias for checkSession with extended info)
 * @returns {Promise<{session: Session|null, recovered: boolean}>}
 */
export async function recoverSession() {
    try {
        const session = await checkSession();
        if (!session) {
            clearAuthStorage();
            return { session: null, recovered: false };
        }
        
        // Check if session is expired
        const expiresAt = session.expires_at;
        if (expiresAt && Date.now() >= expiresAt * 1000) {
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

// Alias for backward compatibility
export const recoverProductionSession = recoverSession;

/**
 * Check if current session is valid
 * @returns {Promise<boolean>}
 */
export async function isSessionValid() {
    try {
        const session = await checkSession();
        if (!session) return false;
        
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
            const session = await checkSession();
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
// AUTH EVENT LISTENER
// ============================================
let authSubscription = null;

/**
 * Initialize auth state listener
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
        
        // Clear storage on sign out
        if (event === 'SIGNED_OUT') {
            clearAuthStorage();
        }
        
        // Handle token refresh errors
        if (event === 'USER_UPDATED' && !session) {
            console.warn('⚠️ Session may be corrupted - clearing storage');
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
// CORRUPTION DETECTION
// ============================================

/**
 * Check if auth state might be corrupted
 * @returns {Promise<boolean>}
 */
export async function isAuthCorrupted() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // If there's a session but error getting user, it's corrupted
        if (session && error) {
            return true;
        }
        
        // Check for invalid token format
        const token = localStorage.getItem(STORAGE_KEY);
        if (token && (!token.includes('.') || token.split('.').length !== 3)) {
            return true;
        }
        
        return false;
    } catch {
        return true;
    }
}

/**
 * Force refresh session (if autoRefreshToken is disabled)
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
// EXPORT DEFAULT
// ============================================
export default supabase;

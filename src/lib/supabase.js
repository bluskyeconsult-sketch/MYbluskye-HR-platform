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
    if (supabaseInstance) {
        return supabaseInstance;
    }
    
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
                autoRefreshToken: false,
                persistSession: true,
                detectSessionInUrl: false,
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
            clearAuthStorage();
            return { session: null, recovered: false };
        }
        
        if (!session) {
            clearAuthStorage();
            return { session: null, recovered: false };
        }
        
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

// Alias for backward compatibility with App.jsx
export const recoverSession = recoverProductionSession;

/**
 * Clear all auth-related storage
 */
export function clearAuthStorage() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        
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
 */
export async function forceClearProduction() {
    try {
        console.warn('💣 Force clearing production auth state...');
        clearAuthStorage();
        
        try {
            await supabase.auth.signOut();
        } catch (e) {
            console.debug('Sign out error (ignored):', e.message);
        }
        
        window.location.href = '/admin-login?cleared=1';
    } catch (e) {
        console.error('Force clear failed:', e);
        window.location.href = '/admin-login';
    }
}

export const forceClearAndRedirect = forceClearProduction;

/**
 * Check if current session is valid
 * @returns {Promise<boolean>}
 */
export async function isSessionValid() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) return false;
        
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

export function cleanupAuthListener() {
    if (authSubscription) {
        authSubscription.unsubscribe();
        authSubscription = null;
    }
}

/**
 * Check if auth state might be corrupted
 * @returns {Promise<boolean>}
 */
export async function isAuthCorrupted() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session && error) {
            return true;
        }
        
        const token = localStorage.getItem(STORAGE_KEY);
        if (token && !token.includes('.')) {
            return true;
        }
        
        return false;
    } catch {
        return true;
    }
}

export default supabase;

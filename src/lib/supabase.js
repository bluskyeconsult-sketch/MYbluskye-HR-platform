// src/lib/supabase.js - COMPLETE PRODUCTION READY
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables');
    throw new Error('Missing Supabase configuration');
}

// Clean URL for storage key
const cleanUrl = supabaseUrl.replace(/[^a-zA-Z0-9]/g, '');
const STORAGE_KEY = `bluskye_auth_${cleanUrl}`;

// Singleton pattern
let supabaseInstance = null;
let isInitializing = false;

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
                autoRefreshToken: true,      // WORKING - allows token refresh
                persistSession: true,
                detectSessionInUrl: true,    // WORKING - allows OAuth callback
                storageKey: STORAGE_KEY,
                storage: typeof window !== 'undefined' ? window.localStorage : undefined,
                flowType: 'pkce'             // WORKING - most compatible
            },
            db: { schema: 'public' },
            global: {
                headers: {
                    'x-application-name': 'bluskye-consult',
                    'x-client-info': 'bluskye@1.0.0'
                }
            }
        });
        
        if (import.meta.env.DEV) console.log('✅ Supabase client initialized');
        return supabaseInstance;
    } catch (error) {
        console.error('❌ Failed to initialize Supabase:', error);
        throw error;
    } finally {
        isInitializing = false;
    }
};

export const supabase = getSupabase();

// ============================================
// AUTH STORAGE MANAGEMENT
// ============================================

export function clearAuthStorage() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        const altKeys = [
            `sb-${cleanUrl}-auth-token`,
            `sb-${cleanUrl}-session`,
            'supabase-auth-token',
            'sb-auth-token'
        ];
        altKeys.forEach(key => {
            try { localStorage.removeItem(key); } catch(e) {}
        });
        try { sessionStorage.clear(); } catch(e) {}
        if (import.meta.env.DEV) console.log('🗑️ Auth storage cleared');
    } catch (err) {
        console.debug('Error clearing auth storage:', err);
    }
}

export async function clearAuthAndRetry() {
    clearAuthStorage();
    try { await supabase.auth.signOut(); } catch(e) {}
    window.location.href = '/admin-login?cleared=1';
}

export const forceClearAuth = clearAuthAndRetry;
export const forceClearAndRedirect = clearAuthAndRetry;

// ============================================
// SESSION MANAGEMENT
// ============================================

export async function recoverSession() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) return null;
        
        const expiresAt = session.expires_at;
        if (expiresAt && Date.now() >= expiresAt * 1000) return null;
        
        return session;
    } catch (err) {
        return null;
    }
}

export async function checkSession() {
    return recoverSession();
}

export async function isSessionValid() {
    const session = await recoverSession();
    return !!session;
}

export async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) return null;
        return user;
    } catch (err) {
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

export async function isAuthCorrupted() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session && error) return true;
        const token = localStorage.getItem(STORAGE_KEY);
        if (token && (!token.includes('.') || token.split('.').length !== 3)) return true;
        return false;
    } catch {
        return true;
    }
}

export async function forceRefreshSession() {
    try {
        const { data: { session }, error } = await supabase.auth.refreshSession();
        if (error) throw error;
        return !!session;
    } catch (err) {
        return false;
    }
}

export default supabase;

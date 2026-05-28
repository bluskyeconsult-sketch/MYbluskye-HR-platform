// src/lib/supabase.js - RESTORED WORKING VERSION
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        flowType: 'pkce'
    }
});

// Simple clear function that works
export async function clearAuthAndRetry() {
    localStorage.clear();
    sessionStorage.clear();
    await supabase.auth.signOut();
    window.location.href = '/admin-login?cleared=1';
}

// Export forceClearAuth for compatibility
export const forceClearAuth = clearAuthAndRetry;
export const forceClearAndRedirect = clearAuthAndRetry;

// Session recovery
export async function recoverSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

// Auth listener
export let authSubscription = null;
export function initAuthListener() {
    if (authSubscription) return () => {};
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (import.meta.env.DEV) console.log(`🔐 Auth: ${event}`);
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
    return false; // Simple fallback
}

export default supabase;

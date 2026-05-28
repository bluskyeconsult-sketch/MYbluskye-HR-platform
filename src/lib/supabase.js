// src/lib/supabase.js - PRODUCTION FIX
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

// Create client with production-safe config
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: false,  // ← CRITICAL: Disabled for production
        persistSession: true,
        detectSessionInUrl: false,  // ← Disabled to prevent URL hash issues
        storageKey: 'bluskye_prod_auth',  // ← Unique key for production
        storage: window.localStorage
    }
});

// Production session recovery
export async function recoverProductionSession() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            // Clear corrupted data
            localStorage.removeItem('bluskye_prod_auth');
            localStorage.removeItem('sb-' + supabaseUrl.replace(/[^a-zA-Z0-9]/g, '') + '-auth-token');
        }
        return session;
    } catch (err) {
        console.error('Session recovery failed:', err);
        localStorage.removeItem('bluskye_prod_auth');
        return null;
    }
}

// Force clear for production
export async function forceClearProduction() {
    localStorage.removeItem('bluskye_prod_auth');
    await supabase.auth.signOut();
    window.location.href = '/admin-login?cleared=1';
}

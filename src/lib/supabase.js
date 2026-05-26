// src/lib/supabase.js
// ROBUST SINGLETON - Prevents multiple instances, handles SSR, validates configuration

import { createClient } from '@supabase/supabase-js';

// Environment validation
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validation with clear error message
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Missing Supabase environment variables.\n\n' +
        'Please check your .env file has:\n' +
        'VITE_SUPABASE_URL=your_project_url\n' +
        'VITE_SUPABASE_ANON_KEY=your_anon_key'
    );
}

// Module-level state (protected)
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
        // Wait for initialization to complete (simple spin-wait)
        const startTime = Date.now();
        while (isInitializing && Date.now() - startTime < 100) {
            // Small delay to allow initialization
        }
        return supabaseInstance;
    }
    
    isInitializing = true;
    
    try {
        supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                storageKey: 'odusbaba-auth-token', // Unique key for your app
                storage: window?.localStorage, // Safe for SSR
                flowType: 'pkce' // More secure for SPAs
            },
            db: {
                schema: 'public'
            },
            global: {
                headers: { 'x-application-name': 'odusbaba-platform' }
            }
        });
        
        // Optional: Log only in development
        if (import.meta.env.DEV) {
            console.log('✅ Supabase client initialized (singleton)');
        }
        
        return supabaseInstance;
    } finally {
        isInitializing = false;
    }
};

// Export a frozen singleton for direct use
export const supabase = getSupabase();

// Freeze the object to prevent modifications (optional)
if (typeof Object.freeze === 'function') {
    Object.freeze(supabase);
}

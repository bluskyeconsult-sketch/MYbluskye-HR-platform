// src/lib/supabase.js
// SINGLETON Supabase client - Prevents multiple GoTrueClient instances

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Singleton pattern - single instance throughout app
let supabaseInstance = null;

export function getSupabase() {
    if (!supabaseInstance) {
        supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                storageKey: 'odusbaba-auth-token' // Unique key to prevent conflicts
            }
        });
        console.log('✅ Supabase client initialized (singleton)');
    }
    return supabaseInstance;
}

// Export a single instance for direct use
export const supabase = getSupabase();

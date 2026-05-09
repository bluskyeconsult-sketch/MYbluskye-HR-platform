// src/lib/supabase.js
// SINGLETON Supabase client - prevents multiple GoTrueClient instances

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Singleton instance
let supabaseInstance = null;

export function getSupabase() {
    if (!supabaseInstance) {
        supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                storageKey: 'odusbaba-auth-token' // Unique key to avoid conflicts
            }
        });
    }
    return supabaseInstance;
}

export const supabase = getSupabase();

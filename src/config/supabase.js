// src/config/supabase.js
import { createClient } from '@supabase/supabase-js'

// Validate environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL is required but not defined in environment variables')
}

if (!supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY is required but not defined in environment variables')
}

// Singleton instance
let supabaseInstance = null
let instanceCount = 0

/**
 * Get or create Supabase client instance (singleton pattern)
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export const getSupabase = () => {
  if (!supabaseInstance) {
    instanceCount++
    
    if (instanceCount > 1) {
      console.warn(`⚠️ Supabase client initialization attempted ${instanceCount} times, reusing existing instance`)
    }
    
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storageKey: 'sb-auth-token',
        storage: window.localStorage,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      },
      global: {
        headers: {
          'x-application-name': 'bluskye-consult'
        }
      },
      db: {
        schema: 'public'
      }
    })
    
    console.log('✅ Supabase client initialized (singleton)')
  }
  
  return supabaseInstance
}

// Export default instance for convenience
export const supabase = getSupabase()

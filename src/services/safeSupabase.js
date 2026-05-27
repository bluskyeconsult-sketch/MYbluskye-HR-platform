// src/services/safeSupabase.js
import { supabase } from '../config/supabase'

// Safe query wrapper that returns empty array instead of throwing
export const safeQuery = async (tableName, queryFn) => {
  try {
    const result = await queryFn()
    
    // Check if result has error and it's a table not found error
    if (result?.error) {
      const errorMsg = result.error.message || ''
      if (errorMsg.includes('does not exist') || errorMsg.includes('relation')) {
        console.warn(`⚠️ Table '${tableName}' not yet created, returning empty result`)
        return { data: [], error: null }
      }
      return result
    }
    
    return result
  } catch (err) {
    if (err.message?.includes('does not exist') || err.message?.includes('relation')) {
      console.warn(`⚠️ Table '${tableName}' not yet created, returning empty result`)
      return { data: [], error: null }
    }
    throw err
  }
}

// Safe jobs query
export const getJobsSafe = async () => {
  return safeQuery('jobs', () => 
    supabase.from('jobs').select('*').limit(100)
  )
}

// Safe external jobs query
export const getExternalJobsSafe = async () => {
  return safeQuery('external_jobs', () => 
    supabase.from('external_jobs').select('*').limit(100)
  )
}

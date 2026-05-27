// src/hooks/useJobs.js
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../config/supabase'

export const useJobs = (options = {}) => {
  const {
    limit = 100,
    immediate = true,
    debounceMs = 300,
    enabled = true
  } = options

  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasLoaded, setHasLoaded] = useState(false)
  
  const hasFetchedRef = useRef(false)
  const isMountedRef = useRef(true)
  const debounceTimerRef = useRef(null)
  const abortControllerRef = useRef(null)

  const fetchJobs = useCallback(async () => {
    // Don't fetch if disabled or already loading
    if (!enabled || loading) return
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    abortControllerRef.current = new AbortController()
    
    try {
      setLoading(true)
      setError(null)
      
      const { data, error: fetchError } = await supabase
        .from('jobs')
        .select('*')
        .limit(limit)
        .abortSignal(abortControllerRef.current.signal)
      
      if (fetchError) throw fetchError
      
      if (isMountedRef.current) {
        setJobs(data || [])
        setHasLoaded(true)
      }
    } catch (err) {
      if (err.name !== 'AbortError' && isMountedRef.current) {
        console.error('Jobs fetch error:', err)
        setError(err.message)
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [enabled, limit, loading])

  // Debounced fetch for search/filter changes
  const fetchJobsDebounced = useCallback((searchParams) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    debounceTimerRef.current = setTimeout(() => {
      fetchJobs(searchParams)
    }, debounceMs)
  }, [fetchJobs, debounceMs])

  // Initial fetch with prevention flag
  useEffect(() => {
    if (immediate && enabled && !hasFetchedRef.current) {
      hasFetchedRef.current = true
      fetchJobs()
    }
    
    return () => {
      isMountedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [immediate, enabled, fetchJobs])

  return {
    jobs,
    loading,
    error,
    hasLoaded,
    refetch: fetchJobs,
    refetchDebounced: fetchJobsDebounced
  }
}

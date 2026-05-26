// src/services/jobsService.js
import { supabase } from '../config/supabase'

class JobsService {
  constructor() {
    this.cache = new Map()
  }

  /**
   * Get all published jobs
   */
  async getJobs(filters = {}) {
    const cacheKey = `jobs_${JSON.stringify(filters)}`
    
    // Check cache (30 seconds TTL)
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < 30000) {
      return cached.data
    }
    
    try {
      let query = supabase
        .from('jobs')
        .select('*')
        .eq('status', 'approved')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      
      // Apply filters
      if (filters.category) {
        query = query.eq('category', filters.category)
      }
      
      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`)
      }
      
      if (filters.job_type) {
        query = query.eq('job_type', filters.job_type)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: data || [],
        timestamp: Date.now()
      })
      
      return data || []
    } catch (error) {
      console.error('Error fetching jobs:', error)
      return []
    }
  }

  /**
   * Get job by ID
   */
  async getJobById(jobId) {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching job:', error)
      return null
    }
  }

  /**
   * Get jobs posted by current employer
   */
  async getMyJobs() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return []
      
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('employer_id', user.id)  // Using employer_id, not user_id
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching my jobs:', error)
      return []
    }
  }

  /**
   * Create a new job posting
   */
  async createJob(jobData) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('You must be logged in to post a job')
      }
      
      const { data, error } = await supabase
        .from('jobs')
        .insert([
          {
            ...jobData,
            employer_id: user.id,  // Using employer_id
            status: 'pending',  // Requires admin approval
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select()
        .single()
      
      if (error) throw error
      
      // Clear cache
      this.cache.clear()
      
      return { success: true, data }
    } catch (error) {
      console.error('Error creating job:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Update a job posting
   */
  async updateJob(jobId, updates) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('You must be logged in to update a job')
      }
      
      const { data, error } = await supabase
        .from('jobs')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .eq('employer_id', user.id)  // Ensure ownership
        .select()
        .single()
      
      if (error) throw error
      
      // Clear cache
      this.cache.clear()
      
      return { success: true, data }
    } catch (error) {
      console.error('Error updating job:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Delete a job posting
   */
  async deleteJob(jobId) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('You must be logged in to delete a job')
      }
      
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId)
        .eq('employer_id', user.id)  // Ensure ownership
      
      if (error) throw error
      
      // Clear cache
      this.cache.clear()
      
      return { success: true }
    } catch (error) {
      console.error('Error deleting job:', error)
      return { success: false, error: error.message }
    }
  }
}

export const jobsService = new JobsService()

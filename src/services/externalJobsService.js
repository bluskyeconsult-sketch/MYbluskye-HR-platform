// src/services/externalJobsService.js
import { supabase } from '../config/supabase'

class ExternalJobsService {
  /**
   * Get external jobs (job aggregations)
   */
  async getExternalJobs(filters = {}) {
    try {
      let query = supabase
        .from('external_jobs')
        .select('*')
        .eq('is_active', true)
        .order('posted_date', { ascending: false })
        .limit(50)
      
      if (filters.source) {
        query = query.eq('source', filters.source)
      }
      
      if (filters.job_type) {
        query = query.eq('job_type', filters.job_type)
      }
      
      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching external jobs:', error)
      return []
    }
  }

  /**
   * Get job sources (for filtering)
   */
  async getJobSources() {
    try {
      const { data, error } = await supabase
        .from('external_jobs')
        .select('source', { distinct: true })
        .eq('is_active', true)
      
      if (error) throw error
      return data?.map(item => item.source) || []
    } catch (error) {
      console.error('Error fetching job sources:', error)
      return []
    }
  }
}

export const externalJobsService = new ExternalJobsService()

// src/components/ExternalJobs.jsx
import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../config/supabase'

const ExternalJobs = () => {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('approved')
  const hasFetchedRef = useRef(false)

  useEffect(() => {
    // Only fetch once
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true
      fetchJobs()
    }
  }, [filter])

  const fetchJobs = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // ✅ CORRECT: Using Supabase REST API
      const { data, error: supabaseError } = await supabase
        .from('external_jobs')
        .select('*')
        .eq('status', filter)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      
      if (supabaseError) throw supabaseError
      
      setJobs(data || [])
    } catch (err) {
      console.error('Error fetching external jobs:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="external-jobs-loading">
        <div className="spinner"></div>
        <p>Loading opportunities...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="external-jobs-error">
        <p>Unable to load jobs: {error}</p>
        <button onClick={fetchJobs}>Retry</button>
      </div>
    )
  }

  return (
    <div className="external-jobs-container">
      <div className="filter-tabs">
        <button 
          className={filter === 'approved' ? 'active' : ''}
          onClick={() => setFilter('approved')}
        >
          Approved Jobs
        </button>
        <button 
          className={filter === 'pending_approval' ? 'active' : ''}
          onClick={() => setFilter('pending_approval')}
        >
          Pending Review
        </button>
      </div>

      {jobs.length === 0 ? (
        <p className="no-jobs">No {filter} jobs found.</p>
      ) : (
        <div className="jobs-grid">
          {jobs.map(job => (
            <div key={job.id} className="job-card">
              <h3>{job.title}</h3>
              <p className="company">{job.company}</p>
              <p className="location">{job.location}</p>
              {job.job_type && (
                <span className="job-type">{job.job_type}</span>
              )}
              {job.source_name && (
                <p className="source">Source: {job.source_name}</p>
              )}
              <a 
                href={job.external_url || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="apply-link"
              >
                View Opportunity →
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ExternalJobs

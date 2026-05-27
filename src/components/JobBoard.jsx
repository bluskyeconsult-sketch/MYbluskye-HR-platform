// src/components/JobBoard.jsx
import React from 'react'
import { useJobs } from '../hooks/useJobs'

const JobBoard = () => {
  // Only fetches ONCE automatically
  const { jobs, loading, error, refetch } = useJobs({
    limit: 50,
    immediate: true  // Fetches immediately but only once
  })

  if (loading && jobs.length === 0) {
    return <div className="loading-spinner">Loading jobs...</div>
  }

  if (error) {
    return (
      <div className="error-container">
        <p>Unable to load jobs: {error}</p>
        <button onClick={refetch}>Retry</button>
      </div>
    )
  }

  return (
    <div className="job-board">
      <h2>Available Positions ({jobs.length})</h2>
      <div className="jobs-grid">
        {jobs.map(job => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  )
}

const JobCard = ({ job }) => (
  <div className="job-card">
    <h3>{job.title}</h3>
    <p className="company">{job.company}</p>
    <p className="location">{job.location}</p>
    <button>View Details</button>
  </div>
)

export default JobBoard

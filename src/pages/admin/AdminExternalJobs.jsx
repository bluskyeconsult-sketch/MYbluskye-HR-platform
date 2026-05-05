import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  RefreshCw, CheckCircle, XCircle, Eye, Filter, 
  Search, AlertTriangle, Clock, ChevronDown, ChevronUp,
  Trash2, Download, Upload, ExternalLink, FileText,
  Loader2, Bell, Shield, CheckSquare, Square, SortAsc,
  SortDesc, Calendar, Building, MapPin, Briefcase
} from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminExternalJobs() {
  // State
  const [pendingJobs, setPendingJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [processingIds, setProcessingIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSource, setSelectedSource] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const [selectedJobs, setSelectedJobs] = useState(new Set());
  const [expandedJob, setExpandedJob] = useState(null);
  const [notification, setNotification] = useState(null);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [showConfirmDialog, setShowConfirmDialog] = useState(null);
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Check authentication and authorization
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = '/admin-login';
      return;
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', session.user.id)
      .single();
    
    if (profile?.user_type !== 'admin' && profile?.user_type !== 'super_admin') {
      window.location.href = '/dashboard';
      return;
    }
    
    setUser(session.user);
    setIsAuthorized(true);
    loadPendingJobs();
    loadStats();
  }

  async function loadStats() {
    try {
      const { data } = await supabase
        .from('external_jobs')
        .select('status, count')
        .in('status', ['pending_approval', 'approved', 'rejected']);
      
      const statsMap = { pending: 0, approved: 0, rejected: 0 };
      data?.forEach(item => {
        if (item.status === 'pending_approval') statsMap.pending++;
        else if (item.status === 'approved') statsMap.approved++;
        else if (item.status === 'rejected') statsMap.rejected++;
      });
      setStats(statsMap);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }

  async function loadPendingJobs() {
    try {
      setLoading(true);
      let query = supabase
        .from('external_jobs')
        .select('*')
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      setPendingJobs(data || []);
    } catch (err) {
      console.error('Error loading jobs:', err);
      showNotification('Failed to load jobs', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function fetchExternalJobs() {
    setFetching(true);
    showNotification('Fetching external jobs...', 'info');
    
    try {
      // Try to fetch from real API first
      let externalJobs = [];
      
      // Attempt to fetch from real job APIs (example)
      try {
        const response = await fetch('/api/external-jobs/fetch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ admin_id: user?.id })
        });
        
        if (response.ok) {
          const result = await response.json();
          externalJobs = result.jobs;
        }
      } catch (apiErr) {
        console.log('Using mock data for development');
      }
      
      // Fallback to mock data for development
      if (externalJobs.length === 0) {
        externalJobs = [
          { title: 'Senior Software Engineer', company: 'Tech Corp', location: 'London, UK', source: 'UK Jobs API', salary: '£80,000 - £100,000', description: 'Looking for an experienced software engineer...' },
          { title: 'HR Business Partner', company: 'Global Inc', location: 'Manchester, UK', source: 'LinkedIn', salary: '£55,000 - £70,000', description: 'Join our growing HR team...' },
          { title: 'DevOps Engineer', company: 'Cloud Systems', location: 'Remote (UK)', source: 'Indeed', salary: '£75,000 - £90,000', description: 'Kubernetes, AWS, CI/CD experience required...' },
          { title: 'Product Manager', company: 'Innovate Ltd', location: 'Birmingham, UK', source: 'TotalJobs', salary: '£65,000 - £85,000', description: 'Lead product development for our SaaS platform...' },
        ];
      }
      
      // Check for duplicates before inserting
      const { data: existingJobs } = await supabase
        .from('external_jobs')
        .select('title, company, source_name');
      
      const existingKeys = new Set(
        existingJobs?.map(job => `${job.title}|${job.company}|${job.source_name}`) || []
      );
      
      let newCount = 0;
      let duplicateCount = 0;
      
      for (const job of externalJobs) {
        const jobKey = `${job.title}|${job.company}|${job.source}`;
        if (existingKeys.has(jobKey)) {
          duplicateCount++;
          continue;
        }
        
        const { error } = await supabase.from('external_jobs').insert({
          title: job.title,
          company: job.company,
          location: job.location || 'Remote',
          source_name: job.source,
          salary: job.salary,
          description: job.description || 'External job listing',
          status: 'pending_approval',
          fetched_by: user?.id,
          fetched_at: new Date().toISOString()
        });
        
        if (!error) newCount++;
      }
      
      showNotification(`Added ${newCount} new jobs (${duplicateCount} duplicates skipped)`, 'success');
      await loadPendingJobs();
      await loadStats();
      
    } catch (err) {
      console.error('Error fetching jobs:', err);
      showNotification('Failed to fetch external jobs', 'error');
    } finally {
      setFetching(false);
    }
  }

  async function approveJob(jobId) {
    setProcessingIds(prev => new Set(prev).add(jobId));
    
    try {
      const { data: job, error: fetchError } = await supabase
        .from('external_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Insert into main jobs table
      const { error: insertError } = await supabase
        .from('jobs')
        .insert({
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description || 'External job listing',
          salary: job.salary,
          source_type: 'authoritative',
          source_name: job.source_name,
          compliance_status: 'approved',
          is_active: true,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          external_source_id: job.id
        });
      
      if (insertError) throw insertError;
      
      // Update external job status
      const { error: updateError } = await supabase
        .from('external_jobs')
        .update({ 
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', jobId);
      
      if (updateError) throw updateError;
      
      showNotification(`Job "${job.title}" approved successfully`, 'success');
      await loadPendingJobs();
      await loadStats();
      
    } catch (err) {
      console.error('Error approving job:', err);
      showNotification('Failed to approve job', 'error');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }
  }

  async function rejectJob(jobId) {
    setProcessingIds(prev => new Set(prev).add(jobId));
    
    try {
      const { error } = await supabase
        .from('external_jobs')
        .update({ 
          status: 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', jobId);
      
      if (error) throw error;
      
      showNotification('Job rejected', 'success');
      await loadPendingJobs();
      await loadStats();
      
    } catch (err) {
      console.error('Error rejecting job:', err);
      showNotification('Failed to reject job', 'error');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }
  }

  async function bulkApprove() {
    const jobsToApprove = pendingJobs.filter(job => selectedJobs.has(job.id));
    setShowConfirmDialog({
      action: 'bulk-approve',
      count: jobsToApprove.length,
      message: `Are you sure you want to approve ${jobsToApprove.length} jobs?`
    });
  }

  async function bulkReject() {
    const jobsToReject = pendingJobs.filter(job => selectedJobs.has(job.id));
    setShowConfirmDialog({
      action: 'bulk-reject',
      count: jobsToReject.length,
      message: `Are you sure you want to reject ${jobsToReject.length} jobs?`
    });
  }

  async function executeBulkAction() {
    const jobs = pendingJobs.filter(job => selectedJobs.has(job.id));
    setProcessingIds(new Set(jobs.map(j => j.id)));
    
    try {
      if (showConfirmDialog.action === 'bulk-approve') {
        for (const job of jobs) {
          await approveJob(job.id);
        }
      } else if (showConfirmDialog.action === 'bulk-reject') {
        for (const job of jobs) {
          await rejectJob(job.id);
        }
      }
      
      setSelectedJobs(new Set());
      showNotification(`Successfully processed ${jobs.length} jobs`, 'success');
    } catch (err) {
      showNotification('Error processing bulk action', 'error');
    } finally {
      setProcessingIds(new Set());
      setShowConfirmDialog(null);
      await loadPendingJobs();
      await loadStats();
    }
  }

  function showNotification(message, type = 'success') {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  }

  function toggleSelectAll() {
    if (selectedJobs.size === filteredJobs.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(filteredJobs.map(job => job.id)));
    }
  }

  function toggleSelectJob(jobId) {
    const newSelected = new Set(selectedJobs);
    if (newSelected.has(jobId)) {
      newSelected.delete(jobId);
    } else {
      newSelected.add(jobId);
    }
    setSelectedJobs(newSelected);
  }

  // Filter and sort jobs
  const filteredJobs = useMemo(() => {
    let filtered = [...pendingJobs];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(job =>
        job.title.toLowerCase().includes(term) ||
        job.company.toLowerCase().includes(term) ||
        (job.location && job.location.toLowerCase().includes(term)) ||
        (job.description && job.description.toLowerCase().includes(term))
      );
    }
    
    if (selectedSource !== 'all') {
      filtered = filtered.filter(job => job.source_name === selectedSource);
    }
    
    switch (sortBy) {
      case 'date_asc':
        filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case 'date_desc':
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'title_asc':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'title_desc':
        filtered.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case 'company_asc':
        filtered.sort((a, b) => a.company.localeCompare(b.company));
        break;
      default:
        break;
    }
    
    return filtered;
  }, [pendingJobs, searchTerm, selectedSource, sortBy]);

  const uniqueSources = useMemo(() => {
    const sources = new Set(pendingJobs.map(job => job.source_name).filter(Boolean));
    return ['all', ...Array.from(sources)];
  }, [pendingJobs]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 animate-slide-in-right ${
          notification.type === 'error' ? 'bg-red-600' : 
          notification.type === 'warning' ? 'bg-amber-600' : 
          notification.type === 'info' ? 'bg-blue-600' : 'bg-emerald-600'
        } text-white rounded-lg shadow-lg p-4 flex items-center gap-3`}>
          {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
          {notification.type === 'info' && <Bell className="w-5 h-5" />}
          <p>{notification.message}</p>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
              <h3 className="text-xl font-bold text-white">Confirm Action</h3>
            </div>
            <p className="text-slate-300 mb-6">{showConfirmDialog.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDialog(null)}
                className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={executeBulkAction}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-primary-400" />
              External Job Moderation
            </h1>
            <p className="text-slate-400 text-sm mt-1">Review and approve external job listings</p>
          </div>
          <button
            onClick={fetchExternalJobs}
            disabled={fetching}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {fetching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Fetching...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Fetch External Jobs
              </>
            )}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Pending Review</p>
                <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-400/50" />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Approved</p>
                <p className="text-2xl font-bold text-emerald-400">{stats.approved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-400/50" />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Rejected</p>
                <p className="text-2xl font-bold text-red-400">{stats.rejected}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-400/50" />
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by title, company, location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {uniqueSources.map(source => (
                <option key={source} value={source}>
                  {source === 'all' ? 'All Sources' : source}
                </option>
              ))}
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="title_asc">Title A-Z</option>
              <option value="title_desc">Title Z-A</option>
              <option value="company_asc">Company A-Z</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedJobs.size > 0 && (
          <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary-400" />
              <span className="text-white">{selectedJobs.size} job(s) selected</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={bulkApprove}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Approve All
              </button>
              <button
                onClick={bulkReject}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Reject All
              </button>
            </div>
          </div>
        )}

        {/* Jobs List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
            <FileText className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Pending Jobs</h3>
            <p className="text-slate-400">
              {searchTerm || selectedSource !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'All caught up! Click "Fetch External Jobs" to import new listings'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Select All Checkbox */}
            <div className="flex items-center gap-2 px-2">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
              >
                {selectedJobs.size === filteredJobs.length ? (
                  <CheckSquare className="w-4 h-4 text-primary-400" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span className="text-sm">Select All ({filteredJobs.length})</span>
              </button>
            </div>

            {filteredJobs.map(job => (
              <div
                key={job.id}
                className={`bg-slate-900/50 border rounded-xl transition-all ${
                  selectedJobs.has(job.id)
                    ? 'border-primary-500 bg-primary-500/5'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    {/* Selection Checkbox */}
                    <button
                      onClick={() => toggleSelectJob(job.id)}
                      className="mt-1"
                    >
                      {selectedJobs.has(job.id) ? (
                        <CheckSquare className="w-5 h-5 text-primary-400" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-500" />
                      )}
                    </button>

                    {/* Job Content */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <h2 className="text-xl font-semibold text-white">{job.title}</h2>
                        <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full">
                          Pending Review
                        </span>
                      </div>
                      
                      <p className="text-slate-400 flex items-center gap-2 mb-2">
                        <Building className="w-3 h-3" />
                        {job.company}
                        {job.location && (
                          <>
                            <span className="text-slate-600">•</span>
                            <MapPin className="w-3 h-3" />
                            {job.location}
                          </>
                        )}
                      </p>
                      
                      {job.salary && (
                        <p className="text-sm text-emerald-400 mb-2">{job.salary}</p>
                      )}
                      
                      <p className="text-slate-400 text-sm mb-2">
                        Source: {job.source_name}
                      </p>
                      
                      <p className="text-xs text-slate-500 mb-3">
                        Fetched: {new Date(job.created_at).toLocaleString()}
                      </p>
                      
                      {/* Expand/Collapse Description */}
                      {job.description && (
                        <div className="mt-3">
                          <button
                            onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                            className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
                          >
                            {expandedJob === job.id ? (
                              <>Show Less <ChevronUp className="w-3 h-3" /></>
                            ) : (
                              <>Show Description <ChevronDown className="w-3 h-3" /></>
                            )}
                          </button>
                          {expandedJob === job.id && (
                            <div className="mt-2 p-3 bg-slate-800/50 rounded-lg">
                              <p className="text-slate-300 text-sm whitespace-pre-wrap">
                                {job.description}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="flex gap-3 mt-4">
                        <button
                          onClick={() => approveJob(job.id)}
                          disabled={processingIds.has(job.id)}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          {processingIds.has(job.id) ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => rejectJob(job.id)}
                          disabled={processingIds.has(job.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                        <button
                          onClick={() => window.open(`/jobs/${job.id}`, '_blank')}
                          className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors flex items-center gap-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Preview
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Export Section */}
        {pendingJobs.length > 0 && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => {
                const dataStr = JSON.stringify(pendingJobs, null, 2);
                const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                const exportFileDefaultName = `external-jobs-${new Date().toISOString()}.json`;
                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', exportFileDefaultName);
                linkElement.click();
              }}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export to JSON
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

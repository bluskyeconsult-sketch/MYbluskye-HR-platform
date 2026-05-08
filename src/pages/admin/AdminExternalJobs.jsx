// src/pages/admin/AdminExternalJobs.jsx
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Briefcase, Search, RefreshCw, Loader2, AlertCircle, 
  CheckCircle, XCircle, ChevronDown, ChevronUp, 
  Globe, Clock, MapPin, Building, ThumbsUp, ThumbsDown, 
  X, Square, Trash2, Filter, Eye, EyeOff
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';
import { 
  fetchExternalJobs, 
  saveExternalJobsToDatabase, 
  approveExternalJob, 
  rejectExternalJob, 
  deleteExternalJob,
  clearExternalJobsCache 
} from '../../services/externalJobService';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const COUNTRIES = [
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' }
];

export default function AdminExternalJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSource, setSelectedSource] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedJobs, setSelectedJobs] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const itemsPerPage = 20;

  useEffect(() => { checkAuth(); }, []);
  useEffect(() => {
    if (isAuthorized) {
      loadJobs();
      loadStats();
    }
  }, [searchTerm, selectedSource, selectedCountry, selectedStatus, currentPage, isAuthorized]);

  async function checkAuth() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/admin-login'; return; }
      setUser(session.user);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', session.user.id)
        .single();
      
      if (profile?.user_type !== 'admin' && profile?.user_type !== 'super_admin') {
        toast.error('Access denied. Admin privileges required.');
        window.location.href = '/dashboard';
        return;
      }
      
      setIsAuthorized(true);
    } catch (err) { window.location.href = '/admin-login'; }
  }

  async function loadStats() {
    try {
      const { data } = await supabase.from('external_jobs').select('status');
      const total = data?.length || 0;
      const pending = data?.filter(j => j.status === 'pending_approval').length || 0;
      const approved = data?.filter(j => j.status === 'approved').length || 0;
      const rejected = data?.filter(j => j.status === 'rejected').length || 0;
      setStats({ pending, approved, rejected, total });
    } catch (err) { console.error(err); }
  }

  async function loadJobs() {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase.from('external_jobs').select('*', { count: 'exact' }).order('created_at', { ascending: false });
      if (selectedSource !== 'all') query = query.eq('source_name', selectedSource);
      if (selectedCountry !== 'all') query = query.eq('source_country', selectedCountry);
      if (selectedStatus !== 'all') query = query.eq('status', selectedStatus);
      if (searchTerm) query = query.or(`title.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      
      const from = (currentPage - 1) * itemsPerPage;
      query = query.range(from, from + itemsPerPage - 1);
      
      const { data, error, count } = await query;
      if (error) throw error;
      
      setJobs(data || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      setTotalCount(count || 0);
    } catch (err) {
      setError('Failed to load external jobs');
      toast.error('Failed to load external jobs');
    } finally { setLoading(false); }
  }

  async function handleFetchJobs() {
    setFetching(true);
    toast.loading('Fetching external jobs...', { id: 'fetch-jobs' });
    
    try {
      const jobs = await fetchExternalJobs(true);
      
      if (!jobs || jobs.length === 0) {
        toast.error('No jobs found. Please try again later.', { id: 'fetch-jobs' });
        setFetching(false);
        return;
      }
      
      const newCount = await saveExternalJobsToDatabase(jobs, user?.id);
      
      if (newCount > 0) {
        toast.success(`Fetched ${newCount} new external jobs!`, { id: 'fetch-jobs' });
      } else {
        toast.info('No new jobs found. All jobs are already in the system.', { id: 'fetch-jobs' });
      }
      
      await loadJobs();
      await loadStats();
      
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error('Failed to fetch jobs.', { id: 'fetch-jobs' });
    } finally {
      setFetching(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    clearExternalJobsCache();
    await handleFetchJobs();
    setRefreshing(false);
  }

  async function handleApprove(id) {
    toast.loading('Approving job...', { id: `approve-${id}` });
    const result = await approveExternalJob(id, user?.id);
    if (result.success) {
      toast.success('Job approved and added to job board!', { id: `approve-${id}` });
      await loadJobs();
      await loadStats();
    } else {
      toast.error('Failed to approve job', { id: `approve-${id}` });
    }
  }

  async function handleReject(id) {
    toast.loading('Rejecting job...', { id: `reject-${id}` });
    const result = await rejectExternalJob(id, user?.id);
    if (result.success) {
      toast.success('Job rejected', { id: `reject-${id}` });
      await loadJobs();
      await loadStats();
    } else {
      toast.error('Failed to reject job', { id: `reject-${id}` });
    }
  }

  async function handleDelete(id) {
    setShowDeleteConfirm({ id });
  }

  async function confirmDelete() {
    toast.loading('Deleting job...', { id: 'delete-job' });
    const result = await deleteExternalJob(showDeleteConfirm.id);
    if (result.success) {
      toast.success('Job deleted', { id: 'delete-job' });
      await loadJobs();
      await loadStats();
      setSelectedJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(showDeleteConfirm.id);
        return newSet;
      });
    } else {
      toast.error('Failed to delete job', { id: 'delete-job' });
    }
    setShowDeleteConfirm(null);
  }

  async function bulkApprove() {
    for (const id of selectedJobs) {
      await handleApprove(id);
    }
    setSelectedJobs(new Set());
  }

  async function bulkReject() {
    for (const id of selectedJobs) {
      await handleReject(id);
    }
    setSelectedJobs(new Set());
  }

  function toggleSelectJob(id) {
    const newSet = new Set(selectedJobs);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setSelectedJobs(newSet);
  }

  function toggleSelectAll() {
    if (selectedJobs.size === jobs.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(jobs.map(j => j.id)));
    }
  }

  function getStatusBadge(status) {
    switch(status) {
      case 'approved':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-400"><CheckCircle className="w-3 h-3" /> Approved</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400"><XCircle className="w-3 h-3" /> Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-amber-500/20 text-amber-400"><Clock className="w-3 h-3" /> Pending</span>;
    }
  }

  function getCountryFlag(countryCode) {
    const country = COUNTRIES.find(c => c.code === countryCode);
    return country ? country.flag : '🌍';
  }

  const uniqueSources = [...new Set(jobs.map(j => j.source_name).filter(Boolean))];
  const uniqueCountries = [...new Set(jobs.map(j => j.source_country).filter(Boolean))];

  if (!isAuthorized) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff' } }} />
      
      <ConfirmModal 
        isOpen={!!showDeleteConfirm} 
        onClose={() => setShowDeleteConfirm(null)} 
        onConfirm={confirmDelete} 
        title="Confirm Delete" 
        message="Delete this job? This action cannot be undone." 
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Globe className="w-6 h-6 text-primary-400" /> External Jobs
            </h1>
            <p className="text-slate-400 text-sm">Fetch and moderate jobs from government portals</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleFetchJobs} 
              disabled={fetching} 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-500 disabled:opacity-50"
            >
              {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Fetch Jobs
            </button>
            <button 
              onClick={handleRefresh} 
              disabled={refreshing} 
              className="px-4 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-2 hover:bg-purple-500 disabled:opacity-50"
            >
              {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Force Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-xs">Total</p><p className="text-2xl font-bold text-white">{stats.total}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-xs">Pending</p><p className="text-2xl font-bold text-amber-400">{stats.pending}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-xs">Approved</p><p className="text-2xl font-bold text-emerald-400">{stats.approved}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-xs">Rejected</p><p className="text-2xl font-bold text-red-400">{stats.rejected}</p></div>
        </div>

        {/* Country Sources */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-medium text-slate-400 mb-3">Sources by Country</h3>
          <div className="flex flex-wrap gap-3">
            {COUNTRIES.map(country => (
              <div key={country.code} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg">
                <span className="text-lg">{country.flag}</span>
                <span className="text-sm text-white">{country.code}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by title, company, or description..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" 
              />
            </div>
            <select 
              value={selectedCountry} 
              onChange={(e) => setSelectedCountry(e.target.value)} 
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
            >
              <option value="all">All Countries</option>
              {uniqueCountries.map(c => <option key={c} value={c}>{getCountryFlag(c)} {c}</option>)}
            </select>
            <select 
              value={selectedSource} 
              onChange={(e) => setSelectedSource(e.target.value)} 
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
            >
              <option value="all">All Sources</option>
              {uniqueSources.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select 
              value={selectedStatus} 
              onChange={(e) => setSelectedStatus(e.target.value)} 
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
            >
              <option value="all">All Status</option>
              <option value="pending_approval">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <button onClick={loadJobs} className="px-4 py-2 bg-slate-700 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedJobs.size > 0 && (
          <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 mb-6 flex justify-between items-center flex-wrap gap-3">
            <span className="text-white">{selectedJobs.size} job(s) selected</span>
            <div className="flex gap-3">
              <button onClick={bulkApprove} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500">Approve All</button>
              <button onClick={bulkReject} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500">Reject All</button>
            </div>
          </div>
        )}

        {/* Jobs Table */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>
        ) : error ? (
          <div className="text-center py-12 text-red-400">{error}<button onClick={loadJobs} className="ml-2 text-primary-400">Retry</button></div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12">
            <Globe className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400">No external jobs found</p>
            <button onClick={handleFetchJobs} className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg">Fetch Jobs</button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <button onClick={toggleSelectAll} className="flex items-center gap-2 text-slate-400 hover:text-white">
                {selectedJobs.size === jobs.length ? <CheckCircle className="w-4 h-4 text-primary-400" /> : <Square className="w-4 h-4" />}
                <span className="text-sm">Select All ({jobs.length})</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 w-10"></th>
                    <th className="px-4 py-3 text-left text-white text-sm">Source</th>
                    <th className="px-4 py-3 text-left text-white text-sm">Title / Company</th>
                    <th className="px-4 py-3 text-left text-white text-sm">Location</th>
                    <th className="px-4 py-3 text-left text-white text-sm">Status</th>
                    <th className="px-4 py-3 text-left text-white text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(job => (
                    <React.Fragment key={job.id}>
                      <tr className="border-t border-slate-800 hover:bg-slate-800/30">
                        <td className="px-4 py-3">
                          <button onClick={() => toggleSelectJob(job.id)}>
                            {selectedJobs.has(job.id) ? <CheckCircle className="w-4 h-4 text-primary-400" /> : <Square className="w-4 h-4 text-slate-500" />}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{getCountryFlag(job.source_country)}</span>
                            <span className="text-sm text-white">{job.source_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-white">{job.title}</p>
                            <p className="text-sm text-slate-400">{job.company}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-sm">
                          <MapPin className="w-3 h-3 inline mr-1" /> {job.location || 'Remote'}
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(job.status)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => handleApprove(job.id)} className="p-1.5 bg-slate-800 rounded hover:bg-emerald-500/20" title="Approve">
                              <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
                            </button>
                            <button onClick={() => handleReject(job.id)} className="p-1.5 bg-slate-800 rounded hover:bg-red-500/20" title="Reject">
                              <ThumbsDown className="w-3.5 h-3.5 text-red-400" />
                            </button>
                            <button onClick={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)} className="p-1.5 bg-slate-800 rounded hover:bg-slate-700" title="Details">
                              {expandedJobId === job.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => handleDelete(job.id)} className="p-1.5 bg-slate-800 rounded hover:bg-red-500/20" title="Delete">
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedJobId === job.id && (
                        <tr className="border-t border-slate-800 bg-slate-900/30">
                          <td colSpan="6" className="px-6 py-4">
                            <div className="space-y-2">
                              <div>
                                <h4 className="text-sm font-semibold text-white mb-1">Description</h4>
                                <p className="text-slate-400 text-sm">{job.description || 'No description provided.'}</p>
                              </div>
                              {job.salary_range && (
                                <div>
                                  <h4 className="text-sm font-semibold text-white mb-1">Salary</h4>
                                  <p className="text-slate-400 text-sm">{job.salary_range}</p>
                                </div>
                              )}
                              <div className="text-xs text-slate-500">Fetched: {new Date(job.created_at).toLocaleString()}</div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-6">
                <span className="text-sm text-slate-400">Page {currentPage} of {totalPages} ({totalCount} total)</span>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 bg-slate-700 rounded-lg disabled:opacity-50">Prev</button>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 bg-slate-700 rounded-lg disabled:opacity-50">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

import React from 'react';

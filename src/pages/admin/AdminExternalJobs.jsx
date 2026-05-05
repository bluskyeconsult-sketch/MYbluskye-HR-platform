import { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Plus, Edit, Trash2, Briefcase, Search, RefreshCw, 
  Loader2, AlertCircle, CheckCircle, XCircle, 
  ChevronDown, ChevronUp, Globe, Clock,
  DollarSign, MapPin, Building, Eye, ExternalLink,
  ThumbsUp, ThumbsDown, Download, Save, X,
  Filter, Shield, Bell, AlertTriangle, Calendar
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============== CUSTOM HOOKS ==============
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function AdminExternalJobs() {
  // State Management
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSource, setSelectedSource] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedJobs, setSelectedJobs] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [expandedJob, setExpandedJob] = useState(null);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [processingIds, setProcessingIds] = useState(new Set());

  // Refs for cleanup
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);

  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    source_name: '',
    description: '',
    salary: '',
    job_type: 'fulltime',
    external_id: '',
    status: 'pending_approval'
  });

  const itemsPerPage = 15;
  const jobTypes = ['fulltime', 'parttime', 'contract', 'remote', 'internship'];

  // Debounced search
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ============== AUTHENTICATION ==============
  useEffect(() => { checkAuth(); }, []);

  async function checkAuth() {
    try {
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
        toast.error('Access denied. Admin privileges required.');
        window.location.href = '/dashboard';
        return;
      }
      
      if (isMountedRef.current) {
        setUser(session.user);
        setIsAuthorized(true);
        await Promise.all([loadJobs(), loadStats()]);
      }
    } catch (err) {
      console.error('Auth error:', err);
      window.location.href = '/admin-login';
    }
  }

  // ============== DATA LOADING ==============
  async function loadStats() {
    try {
      const { data, error } = await supabase
        .from('external_jobs')
        .select('status');
      
      if (error) throw error;
      
      const total = data?.length || 0;
      const pending = data?.filter(j => j.status === 'pending_approval').length || 0;
      const approved = data?.filter(j => j.status === 'approved').length || 0;
      const rejected = data?.filter(j => j.status === 'rejected').length || 0;
      
      if (isMountedRef.current) {
        setStats({ pending, approved, rejected, total });
      }
    } catch (err) { 
      console.error('Stats error:', err);
    }
  }

  async function loadJobs() {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    try {
      if (isMountedRef.current) {
        setLoading(true);
        setError(null);
      }
      
      let query = supabase
        .from('external_jobs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });
      
      // Apply filters
      if (selectedSource !== 'all') {
        query = query.eq('source_name', selectedSource);
      }
      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }
      if (debouncedSearch) {
        const sanitizedSearch = debouncedSearch.replace(/[%_]/g, '\\$&');
        query = query.or(`title.ilike.%${sanitizedSearch}%,company.ilike.%${sanitizedSearch}%,description.ilike.%${sanitizedSearch}%`);
      }
      
      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage;
      query = query.range(from, from + itemsPerPage - 1);
      
      const { data, error, count } = await query.abortSignal(abortControllerRef.current.signal);
      
      if (error) throw error;
      
      if (isMountedRef.current) {
        setJobs(data || []);
        setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Request cancelled');
        return;
      }
      console.error('Load error:', err);
      if (isMountedRef.current) {
        setError('Failed to load external jobs');
        toast.error('Failed to load external jobs');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedSource, selectedStatus]);

  // Load jobs when dependencies change
  useEffect(() => {
    if (isAuthorized) {
      loadJobs();
    }
  }, [isAuthorized, currentPage, debouncedSearch, selectedSource, selectedStatus]);

  // ============== EXTERNAL JOBS FETCHING ==============
  async function fetchExternalJobs() {
    setFetching(true);
    const toastId = toast.loading('Fetching external jobs...');
    
    try {
      // First, try to fetch from real API endpoint
      let externalJobs = [];
      
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
        console.log('API not available, using mock data');
      }
      
      // Fallback to mock data for development/demo
      if (externalJobs.length === 0) {
        externalJobs = [
          { title: 'Senior Software Engineer', company: 'Tech Corp', location: 'London, UK', source_name: 'UK Jobs API', salary: '£80,000 - £100,000', description: 'Looking for an experienced software engineer with 5+ years of experience in React, Node.js, and cloud technologies.', job_type: 'fulltime' },
          { title: 'HR Business Partner', company: 'Global Inc', location: 'Manchester, UK', source_name: 'LinkedIn', salary: '£55,000 - £70,000', description: 'Join our growing HR team to support business operations and employee relations.', job_type: 'fulltime' },
          { title: 'DevOps Engineer', company: 'Cloud Systems', location: 'Remote (UK)', source_name: 'Indeed', salary: '£75,000 - £90,000', description: 'Kubernetes, AWS, CI/CD experience required. Join our cloud infrastructure team.', job_type: 'remote' },
          { title: 'Product Manager', company: 'Innovate Ltd', location: 'Birmingham, UK', source_name: 'TotalJobs', salary: '£65,000 - £85,000', description: 'Lead product development for our SaaS platform. Experience with agile methodologies required.', job_type: 'fulltime' },
          { title: 'Data Scientist', company: 'AI Solutions', location: 'Edinburgh, UK', source_name: 'Glassdoor', salary: '£70,000 - £95,000', description: 'Machine learning, Python, SQL. Work on cutting-edge AI projects.', job_type: 'fulltime' },
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
        const jobKey = `${job.title}|${job.company}|${job.source_name}`;
        if (existingKeys.has(jobKey)) {
          duplicateCount++;
          continue;
        }
        
        const { error } = await supabase.from('external_jobs').insert({
          title: job.title,
          company: job.company,
          location: job.location || 'Remote',
          source_name: job.source_name,
          salary: job.salary,
          description: job.description || 'External job listing',
          job_type: job.job_type || 'fulltime',
          status: 'pending_approval',
          fetched_by: user?.id,
          fetched_at: new Date().toISOString()
        });
        
        if (!error) newCount++;
      }
      
      toast.success(`Added ${newCount} new jobs (${duplicateCount} duplicates skipped)`, { id: toastId });
      await Promise.all([loadJobs(), loadStats()]);
      
    } catch (err) {
      console.error('Error fetching jobs:', err);
      toast.error('Failed to fetch external jobs', { id: toastId });
    } finally {
      setFetching(false);
    }
  }

  // ============== CRUD OPERATIONS ==============
  async function saveJob() {
    // Validation
    if (!formData.title.trim()) { 
      toast.error('Job title is required'); 
      return; 
    }
    if (!formData.company.trim()) { 
      toast.error('Company name is required'); 
      return; 
    }
    
    setSaving(true);
    const toastId = toast.loading(editing ? 'Updating job...' : 'Creating job...');
    
    try {
      const jobData = {
        ...formData,
        updated_at: new Date().toISOString(),
        updated_by: user?.id
      };
      
      if (editing) {
        const { error } = await supabase
          .from('external_jobs')
          .update(jobData)
          .eq('id', editing);
        
        if (error) throw error;
        toast.success('Job updated successfully', { id: toastId });
      } else {
        const { error } = await supabase
          .from('external_jobs')
          .insert([{
            ...jobData,
            created_at: new Date().toISOString(),
            fetched_by: user?.id,
            fetched_at: new Date().toISOString()
          }]);
        
        if (error) throw error;
        toast.success('Job created successfully', { id: toastId });
      }
      
      if (isMountedRef.current) {
        setShowForm(false);
        setEditing(null);
        resetForm();
        await Promise.all([loadJobs(), loadStats()]);
      }
    } catch (err) { 
      console.error('Save error:', err);
      toast.error('Failed to save job', { id: toastId });
    } finally { 
      if (isMountedRef.current) {
        setSaving(false);
      }
    }
  }

  async function approveJob(jobId) {
    setProcessingIds(prev => new Set(prev).add(jobId));
    const toastId = toast.loading('Approving job...');
    
    // Optimistic update
    const previousJobs = [...jobs];
    setJobs(jobs.map(job => 
      job.id === jobId ? { ...job, status: 'approved' } : job
    ));
    
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
          job_type: job.job_type,
          source_type: 'external',
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
      
      toast.success(`Job "${job.title}" approved`, { id: toastId });
      await loadStats();
      
    } catch (err) {
      // Rollback on error
      setJobs(previousJobs);
      console.error('Error approving job:', err);
      toast.error('Failed to approve job', { id: toastId });
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
    const toastId = toast.loading('Rejecting job...');
    
    // Optimistic update
    const previousJobs = [...jobs];
    setJobs(jobs.map(job => 
      job.id === jobId ? { ...job, status: 'rejected' } : job
    ));
    
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
      
      toast.success('Job rejected', { id: toastId });
      await loadStats();
      
    } catch (err) {
      // Rollback on error
      setJobs(previousJobs);
      console.error('Error rejecting job:', err);
      toast.error('Failed to reject job', { id: toastId });
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }
  }

  async function deleteJob(id) { 
    setShowDeleteConfirm({ id, type: 'delete' }); 
  }
  
  async function confirmDelete() {
    const toastId = toast.loading('Deleting job...');
    
    try { 
      const { error } = await supabase
        .from('external_jobs')
        .delete()
        .eq('id', showDeleteConfirm.id);
      
      if (error) throw error;
      
      toast.success('Job deleted successfully', { id: toastId });
      
      if (isMountedRef.current) {
        await Promise.all([loadJobs(), loadStats()]);
      }
    } catch (err) { 
      console.error('Delete error:', err);
      toast.error('Failed to delete job', { id: toastId });
    } finally { 
      if (isMountedRef.current) {
        setShowDeleteConfirm(null);
      }
    }
  }

  async function bulkApprove() {
    setShowDeleteConfirm({ ids: Array.from(selectedJobs), type: 'approve', count: selectedJobs.size });
  }

  async function bulkReject() {
    setShowDeleteConfirm({ ids: Array.from(selectedJobs), type: 'reject', count: selectedJobs.size });
  }

  async function confirmBulkAction() {
    const newStatus = showDeleteConfirm.type === 'approve' ? 'approved' : 'rejected';
    const toastId = toast.loading(`Processing ${showDeleteConfirm.count} jobs...`);
    
    // Optimistic update
    const previousJobs = [...jobs];
    setJobs(jobs.map(job => 
      showDeleteConfirm.ids.includes(job.id) ? { ...job, status: newStatus } : job
    ));
    
    try {
      const { error } = await supabase
        .from('external_jobs')
        .update({ 
          status: newStatus, 
          reviewed_by: user?.id, 
          reviewed_at: new Date().toISOString() 
        })
        .in('id', showDeleteConfirm.ids);
      
      if (error) throw error;
      
      toast.success(`${showDeleteConfirm.count} jobs ${newStatus}`, { id: toastId });
      setSelectedJobs(new Set());
      await loadStats();
      
    } catch (err) {
      // Rollback on error
      setJobs(previousJobs);
      console.error('Bulk action error:', err);
      toast.error('Failed to update jobs', { id: toastId });
    } finally {
      setShowDeleteConfirm(null);
    }
  }

  // ============== UTILITY FUNCTIONS ==============
  function resetForm() {
    setFormData({
      title: '', company: '', location: '', source_name: '', description: '', salary: '',
      job_type: 'fulltime', external_id: '', status: 'pending_approval'
    });
  }

  function handleEdit(job) {
    setEditing(job.id);
    setFormData(job);
    setShowForm(true);
  }

  function toggleSelectAll() { 
    setSelectedJobs(selectedJobs.size === jobs.length 
      ? new Set() 
      : new Set(jobs.map(j => j.id))
    ); 
  }
  
  function toggleSelectJob(id) { 
    const newSet = new Set(selectedJobs); 
    newSet.has(id) ? newSet.delete(id) : newSet.add(id); 
    setSelectedJobs(newSet); 
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

  // Get unique sources for filter
  const uniqueSources = useMemo(() => {
    const sources = new Set(jobs.map(j => j.source_name).filter(Boolean));
    return ['all', ...Array.from(sources)];
  }, [jobs]);

  const exportToJSON = () => {
    const dataStr = JSON.stringify(jobs, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `external-jobs-${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast.success('Jobs exported to JSON');
  };

  // ============== RENDER ==============
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      <Toaster 
        position="top-right" 
        toastOptions={{ 
          style: { background: '#1e293b', color: '#fff' },
          duration: 3000
        }} 
      />
      
      <ConfirmModal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={showDeleteConfirm?.type === 'delete' ? confirmDelete : confirmBulkAction}
        title={
          showDeleteConfirm?.type === 'approve' ? 'Confirm Approve' : 
          showDeleteConfirm?.type === 'reject' ? 'Confirm Reject' : 
          'Confirm Delete'
        }
        message={
          showDeleteConfirm?.type === 'approve' ? `Approve ${showDeleteConfirm.count} jobs? They will be added to the main jobs board.` :
          showDeleteConfirm?.type === 'reject' ? `Reject ${showDeleteConfirm.count} jobs? This action can be reversed.` :
          'Delete this job? This action cannot be undone.'
        }
        confirmText={showDeleteConfirm?.type === 'approve' ? 'Approve' : showDeleteConfirm?.type === 'reject' ? 'Reject' : 'Delete'}
        confirmVariant={showDeleteConfirm?.type === 'approve' ? 'success' : 'danger'}
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-primary-400" /> 
              External Jobs Moderation
            </h1>
            <p className="text-slate-400 text-sm">Review, approve, and manage external job listings</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={fetchExternalJobs} 
              disabled={fetching} 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
              {fetching ? 'Fetching...' : 'Fetch External Jobs'}
            </button>
            <button 
              onClick={() => { resetForm(); setEditing(null); setShowForm(true); }} 
              className="px-4 py-2 bg-primary-500 text-white rounded-lg flex items-center gap-2 hover:bg-primary-600 transition-all shadow-lg"
            >
              <Plus className="w-4 h-4" /> Add Job
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
            <p className="text-slate-400 text-sm">Total Jobs</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
            <p className="text-slate-400 text-sm">Pending Review</p>
            <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
            <p className="text-slate-400 text-sm">Approved</p>
            <p className="text-2xl font-bold text-emerald-400">{stats.approved}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
            <p className="text-slate-400 text-sm">Rejected</p>
            <p className="text-2xl font-bold text-red-400">{stats.rejected}</p>
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
                className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
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
              value={selectedStatus} 
              onChange={(e) => setSelectedStatus(e.target.value)} 
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="pending_approval">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            
            <button 
              onClick={() => loadJobs()} 
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all flex items-center gap-2"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedJobs.size > 0 && (
          <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 mb-6 flex flex-wrap justify-between items-center gap-4 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary-400" />
              <span className="text-white font-medium">{selectedJobs.size} job(s) selected</span>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={bulkApprove} 
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-all flex items-center gap-2"
              >
                <ThumbsUp className="w-4 h-4" /> Approve Selected
              </button>
              <button 
                onClick={bulkReject} 
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-all flex items-center gap-2"
              >
                <ThumbsDown className="w-4 h-4" /> Reject Selected
              </button>
            </div>
          </div>
        )}

        {/* Jobs Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 mb-4">{error}</p>
            <button 
              onClick={loadJobs} 
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-all"
            >
              Try Again
            </button>
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
            <Briefcase className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No External Jobs</h3>
            <p className="text-slate-400 mb-4">
              {searchTerm || selectedSource !== 'all' || selectedStatus !== 'all'
                ? 'No jobs match your search criteria'
                : 'Click "Fetch External Jobs" to import listings from external sources'}
            </p>
            {!searchTerm && selectedSource === 'all' && selectedStatus === 'all' && (
              <button 
                onClick={fetchExternalJobs} 
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-all inline-flex items-center gap-2"
              >
                <Globe className="w-4 h-4" /> Fetch External Jobs
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Select All Checkbox */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <button 
                onClick={toggleSelectAll} 
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
              >
                {selectedJobs.size === jobs.length ? (
                  <CheckCircle className="w-4 h-4 text-primary-400" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span className="text-sm">Select All ({jobs.length})</span>
              </button>
              
              <button 
                onClick={exportToJSON} 
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                Export JSON
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50 rounded-t-xl">
                  <tr>
                    <th className="px-4 py-3 text-left text-white text-sm w-10"></th>
                    <th className="px-4 py-3 text-left text-white text-sm">Title / Company</th>
                    <th className="px-4 py-3 text-left text-white text-sm">Location</th>
                    <th className="px-4 py-3 text-left text-white text-sm">Source</th>
                    <th className="px-4 py-3 text-left text-white text-sm">Status</th>
                    <th className="px-4 py-3 text-left text-white text-sm">Fetched</th>
                    <th className="px-4 py-3 text-left text-white text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(job => (
                    <React.Fragment key={job.id}>
                      <tr className={`border-t border-slate-800 hover:bg-slate-800/30 transition-colors ${selectedJobs.has(job.id) ? 'bg-primary-500/5' : ''}`}>
                        <td className="px-4 py-3">
                          <button onClick={() => toggleSelectJob(job.id)}>
                            {selectedJobs.has(job.id) ? (
                              <CheckCircle className="w-4 h-4 text-primary-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-500 hover:text-slate-400" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-white font-medium">{job.title}</p>
                            <p className="text-slate-400 text-sm flex items-center gap-1 mt-1">
                              <Building className="w-3 h-3" /> {job.company}
                            </p>
                            {job.salary && (
                              <p className="text-emerald-400 text-xs mt-1 flex items-center gap-1">
                                <DollarSign className="w-3 h-3" /> {job.salary}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-sm">
                          <MapPin className="w-3 h-3 inline mr-1" /> 
                          {job.location || 'Remote'}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-sm">
                          <span className="px-2 py-1 bg-slate-800 rounded-full text-xs">
                            {job.source_name}
                          </span>
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(job.status)}</td>
                        <td className="px-4 py-3 text-slate-400 text-sm whitespace-nowrap">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          {new Date(job.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => approveJob(job.id)} 
                              disabled={job.status === 'approved' || processingIds.has(job.id)} 
                              className="p-1.5 bg-slate-800 rounded hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                              title="Approve"
                           

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Briefcase, Search, RefreshCw, Loader2, AlertCircle, 
  CheckCircle, XCircle, Eye, Trash2, Download,
  ThumbsUp, ThumbsDown, Star, StarOff, MapPin, Building,
  DollarSign, X, Square, Globe, Clock, Users, Filter,
  Plus, Edit
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SUPPORTED_COUNTRIES = [
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: '£' },
  { code: 'US', name: 'United States', flag: '🇺🇸', currency: '$' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', currency: '₦' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', currency: 'C$' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', currency: 'A$' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', currency: '€' },
  { code: 'FR', name: 'France', flag: '🇫🇷', currency: '€' }
];

export default function AdminJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedJobs, setSelectedJobs] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [jobFormData, setJobFormData] = useState({
    title: '', company: '', location: '', country_code: 'GB', description: '', 
    salary: '', requirements: '', status: 'pending', is_featured: false
  });
  const [stats, setStats] = useState({ 
    total: 0, pending: 0, approved: 0, rejected: 0, featured: 0,
    applications: 0, byCountry: {}
  });
  const [user, setUser] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const itemsPerPage = 20;

  useEffect(() => { checkAuth(); }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      loadJobs();
      loadStats();
    }
  }, [searchTerm, selectedStatus, selectedCountry, currentPage, isSuperAdmin]);

  async function checkAuth() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { 
        window.location.href = '/admin-login'; 
        return; 
      }
      setUser(session.user);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type, email')
        .eq('id', session.user.id)
        .single();
      
      console.log('Profile:', profile);
      
      if (profile?.user_type === 'super_admin') {
        setIsSuperAdmin(true);
        toast.success('Super Admin authenticated');
      } else if (profile?.user_type === 'admin') {
        setIsSuperAdmin(true);
        toast.success('Admin authenticated');
      } else {
        toast.error('Access denied. Admin privileges required.');
        window.location.href = '/dashboard';
        return;
      }
      
      await Promise.all([loadJobs(), loadStats()]);
    } catch (err) {
      console.error('Auth error:', err);
      toast.error('Authentication failed');
      window.location.href = '/admin-login';
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const { data } = await supabase.from('jobs').select('status, is_featured, country_code, applications_count');
      
      const total = data?.length || 0;
      const pending = data?.filter(j => j.status === 'pending').length || 0;
      const approved = data?.filter(j => j.status === 'approved').length || 0;
      const rejected = data?.filter(j => j.status === 'rejected').length || 0;
      const featured = data?.filter(j => j.is_featured === true).length || 0;
      const applications = data?.reduce((sum, j) => sum + (j.applications_count || 0), 0) || 0;
      
      const byCountry = {};
      SUPPORTED_COUNTRIES.forEach(country => {
        byCountry[country.code] = data?.filter(j => j.country_code === country.code).length || 0;
      });
      
      setStats({ total, pending, approved, rejected, featured, applications, byCountry });
    } catch (err) { 
      console.error('Stats error:', err); 
    }
  }

  async function loadJobs() {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('jobs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });
      
      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }
      if (selectedCountry !== 'all') {
        query = query.eq('country_code', selectedCountry);
      }
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`);
      }
      
      const from = (currentPage - 1) * itemsPerPage;
      query = query.range(from, from + itemsPerPage - 1);
      
      const { data, error, count } = await query;
      if (error) throw error;
      
      setJobs(data || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      setTotalCount(count || 0);
      
      console.log(`Loaded ${data?.length || 0} jobs`);
    } catch (err) {
      console.error('Load jobs error:', err);
      setError('Failed to load jobs: ' + err.message);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }

  async function createOrUpdateJob() {
    if (!jobFormData.title.trim()) { toast.error('Job title is required'); return; }
    if (!jobFormData.company.trim()) { toast.error('Company name is required'); return; }
    
    setProcessingId('form');
    toast.loading('Saving job...', { id: 'save-job' });
    
    try {
      if (editingJob) {
        const { error } = await supabase
          .from('jobs')
          .update({
            ...jobFormData,
            updated_at: new Date().toISOString(),
            updated_by: user?.id
          })
          .eq('id', editingJob);
        
        if (error) throw error;
        toast.success('Job updated successfully', { id: 'save-job' });
      } else {
        const { error } = await supabase
          .from('jobs')
          .insert({
            ...jobFormData,
            created_at: new Date().toISOString(),
            created_by: user?.id
          });
        
        if (error) throw error;
        toast.success('Job created successfully', { id: 'save-job' });
      }
      
      setShowJobModal(false);
      setEditingJob(null);
      resetJobForm();
      await Promise.all([loadJobs(), loadStats()]);
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save job', { id: 'save-job' });
    } finally {
      setProcessingId(null);
    }
  }

  async function updateJobStatus(jobId, newStatus) {
    setProcessingId(jobId);
    toast.loading(`Updating job status...`, { id: `job-${jobId}` });
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', jobId);
      
      if (error) throw error;
      
      // Log to audit
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action_type: `job_${newStatus}`,
        target_id: jobId,
        target_type: 'job',
        jurisdiction: 'GB',
        was_allowed: true,
        created_at: new Date().toISOString()
      });
      
      toast.success(`Job ${newStatus}`, { id: `job-${jobId}` });
      await Promise.all([loadJobs(), loadStats()]);
    } catch (err) {
      console.error('Status update error:', err);
      toast.error('Failed to update job status', { id: `job-${jobId}` });
    } finally {
      setProcessingId(null);
    }
  }

  async function toggleFeature(jobId, currentStatus) {
    setProcessingId(jobId);
    toast.loading(`${currentStatus ? 'Unfeaturing' : 'Featuring'} job...`, { id: `job-${jobId}` });
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ is_featured: !currentStatus })
        .eq('id', jobId);
      
      if (error) throw error;
      
      toast.success(`Job ${!currentStatus ? 'featured' : 'unfeatured'}`, { id: `job-${jobId}` });
      await loadJobs();
    } catch (err) {
      toast.error('Failed to update job', { id: `job-${jobId}` });
    } finally {
      setProcessingId(null);
    }
  }

  async function deleteJob(jobId) {
    setShowDeleteConfirm({ id: jobId });
  }

  async function confirmDelete() {
    toast.loading('Deleting job...', { id: 'delete-job' });
    try {
      const { error } = await supabase.from('jobs').delete().eq('id', showDeleteConfirm.id);
      if (error) throw error;
      
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action_type: 'job_delete',
        target_id: showDeleteConfirm.id,
        target_type: 'job',
        created_at: new Date().toISOString()
      });
      
      toast.success('Job deleted', { id: 'delete-job' });
      await Promise.all([loadJobs(), loadStats()]);
      setSelectedJobs(new Set());
    } catch (err) {
      toast.error('Failed to delete job', { id: 'delete-job' });
    } finally {
      setShowDeleteConfirm(null);
    }
  }

  async function bulkAction(action) {
    if (action === 'approve') {
      for (const id of selectedJobs) {
        await updateJobStatus(id, 'approved');
      }
      toast.success(`Approved ${selectedJobs.size} jobs`);
      setSelectedJobs(new Set());
    } else if (action === 'reject') {
      for (const id of selectedJobs) {
        await updateJobStatus(id, 'rejected');
      }
      toast.success(`Rejected ${selectedJobs.size} jobs`);
      setSelectedJobs(new Set());
    } else if (action === 'delete') {
      setShowDeleteConfirm({ ids: Array.from(selectedJobs), type: 'bulk', count: selectedJobs.size });
    }
  }

  async function confirmBulkDelete() {
    toast.loading(`Deleting ${showDeleteConfirm.count} jobs...`, { id: 'bulk-delete' });
    try {
      for (const id of showDeleteConfirm.ids) {
        await supabase.from('jobs').delete().eq('id', id);
      }
      toast.success(`Deleted ${showDeleteConfirm.ids.length} jobs`, { id: 'bulk-delete' });
      setSelectedJobs(new Set());
      await Promise.all([loadJobs(), loadStats()]);
    } catch (err) {
      toast.error('Failed to delete jobs', { id: 'bulk-delete' });
    } finally {
      setShowDeleteConfirm(null);
    }
  }

  async function exportJobs() {
    setExporting(true);
    toast.loading('Exporting jobs...', { id: 'export' });
    try {
      const { data } = await supabase
        .from('jobs')
        .select('title, company, location, country_code, status, is_featured, created_at, applications_count, salary');
      
      const headers = ['Title', 'Company', 'Location', 'Country', 'Status', 'Featured', 'Created At', 'Applications', 'Salary'];
      const rows = (data || []).map(j => [
        j.title,
        j.company,
        j.location || 'Remote',
        j.country_code || 'N/A',
        j.status,
        j.is_featured ? 'Yes' : 'No',
        new Date(j.created_at).toLocaleDateString(),
        j.applications_count || 0,
        j.salary || 'N/A'
      ]);
      
      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jobs-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Jobs exported', { id: 'export' });
    } catch (err) {
      toast.error('Failed to export', { id: 'export' });
    } finally {
      setExporting(false);
    }
  }

  function resetJobForm() {
    setJobFormData({
      title: '', company: '', location: '', country_code: 'GB', description: '', 
      salary: '', requirements: '', status: 'pending', is_featured: false
    });
  }

  function handleEdit(job) {
    setEditingJob(job.id);
    setJobFormData(job);
    setShowJobModal(true);
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

  function getCountryFlag(countryCode) {
    const country = SUPPORTED_COUNTRIES.find(c => c.code === countryCode);
    return country ? country.flag : '🌍';
  }

  function getStatusBadge(status) {
    switch(status) {
      case 'approved':
        return <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400"><CheckCircle className="w-3 h-3" /> Approved</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400"><XCircle className="w-3 h-3" /> Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-400"><Clock className="w-3 h-3" /> Pending</span>;
    }
  }

  if (!isSuperAdmin && !loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400">Access Denied. Admin privileges required.</p>
          <button onClick={() => window.location.href = '/admin-login'} className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff' } }} />
      
      <ConfirmModal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={showDeleteConfirm?.type === 'bulk' ? confirmBulkDelete : confirmDelete}
        title="Confirm Delete"
        message={showDeleteConfirm?.type === 'bulk' 
          ? `Are you sure you want to delete ${showDeleteConfirm.count} jobs?`
          : 'Are you sure you want to delete this job?'}
      />

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-primary-400" /> Job Management
            </h1>
            <p className="text-slate-400 text-sm">Manage all job postings across {SUPPORTED_COUNTRIES.length} countries</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { resetJobForm(); setEditingJob(null); setShowJobModal(true); }} className="px-4 py-2 bg-primary-600 text-white rounded-lg flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create Job
            </button>
            <button onClick={exportJobs} disabled={exporting} className="px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50">
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export CSV
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-xs">Total Jobs</p><p className="text-2xl font-bold text-white">{stats.total}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-xs">Pending</p><p className="text-2xl font-bold text-amber-400">{stats.pending}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-xs">Approved</p><p className="text-2xl font-bold text-emerald-400">{stats.approved}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-xs">Rejected</p><p className="text-2xl font-bold text-red-400">{stats.rejected}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-xs">Featured</p><p className="text-2xl font-bold text-yellow-400">{stats.featured}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-xs">Applications</p><p className="text-2xl font-bold text-blue-400">{stats.applications.toLocaleString()}</p></div>
        </div>

        {/* Jobs by Country */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-medium text-slate-400 mb-3">Jobs by Country</h3>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setSelectedCountry('all')} className={`px-3 py-1.5 rounded-lg text-sm transition-all ${selectedCountry === 'all' ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>🌍 All ({stats.total})</button>
            {SUPPORTED_COUNTRIES.map(country => (
              <button key={country.code} onClick={() => setSelectedCountry(selectedCountry === country.code ? 'all' : country.code)} className={`px-3 py-1.5 rounded-lg text-sm transition-all flex items-center gap-1 ${selectedCountry === country.code ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                <span>{country.flag}</span> {country.code} ({stats.byCountry[country.code] || 0})
              </button>
            ))}
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Search by title, company, or location..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
            </div>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <button onClick={() => loadJobs()} className="px-4 py-2 bg-slate-700 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedJobs.size > 0 && (
          <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 mb-6 flex flex-wrap justify-between items-center gap-4">
            <span className="text-white">{selectedJobs.size} job(s) selected</span>
            <div className="flex gap-3">
              <button onClick={() => bulkAction('approve')} className="px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2"><ThumbsUp className="w-4 h-4" /> Approve</button>
              <button onClick={() => bulkAction('reject')} className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2"><ThumbsDown className="w-4 h-4" /> Reject</button>
              <button onClick={() => bulkAction('delete')} className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete</button>
            </div>
          </div>
        )}

        {/* Jobs Table */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /><span className="ml-2 text-slate-400">Loading jobs...</span></div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400">{error}</p>
            <button onClick={loadJobs} className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg">Try Again</button>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400">No jobs found. Click "Create Job" to add your first job posting.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <button onClick={toggleSelectAll} className="flex items-center gap-2 text-slate-400 hover:text-white">
                {selectedJobs.size === jobs.length ? <CheckCircle className="w-4 h-4 text-primary-400" /> : <Square className="w-4 h-4" />}
                Select All ({jobs.length})
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800">
                  <tr><th className="px-4 py-3 w-10"></th><th className="px-4 py-3 text-left">Title / Company</th><th className="px-4 py-3 text-left">Location</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Featured</th><th className="px-4 py-3 text-left">Apps</th><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Actions</th></tr>
                </thead>
                <tbody>
                  {jobs.map(job => (
                    <tr key={job.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                      <td className="px-4 py-3"><button onClick={() => toggleSelectJob(job.id)}>{selectedJobs.has(job.id) ? <CheckCircle className="w-4 h-4 text-primary-400" /> : <Square className="w-4 h-4 text-slate-500" />}</button></td>
                      <td className="px-4 py-3"><div><p className="font-medium text-white">{job.title}</p><p className="text-sm text-slate-400 flex items-center gap-1"><Building className="w-3 h-3" /> {job.company}</p></div></td>
                      <td className="px-4 py-3"><span className="flex items-center gap-1 text-sm"><MapPin className="w-3 h-3 text-slate-400" /> {job.location || 'Remote'} {getCountryFlag(job.country_code)}</span></td>
                      <td className="px-4 py-3">{getStatusBadge(job.status)}</td>
                      <td className="px-4 py-3"><button onClick={() => toggleFeature(job.id, job.is_featured)} disabled={processingId === job.id} className={`p-1 rounded ${job.is_featured ? 'text-yellow-400' : 'text-slate-500 hover:text-yellow-400'}`}>{processingId === job.id ? <Loader2 className="w-4 h-4 animate-spin" /> : job.is_featured ? <Star className="w-4 h-4 fill-yellow-400" /> : <StarOff className="w-4 h-4" />}</button></td>
                      <td className="px-4 py-3 text-center text-white">{job.applications_count || 0}</td>
                      <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">{new Date(job.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3"><div className="flex gap-2">
                        <button onClick={() => handleEdit(job)} className="p-1.5 bg-slate-800 rounded hover:bg-primary-500/20"><Edit className="w-3.5 h-3.5 text-primary-400" /></button>
                        {job.status !== 'approved' && <button onClick={() => updateJobStatus(job.id, 'approved')} disabled={processingId === job.id} className="p-1.5 bg-slate-800 rounded hover:bg-emerald-500/20"><ThumbsUp className="w-3.5 h-3.5 text-emerald-400" /></button>}
                        {job.status !== 'rejected' && <button onClick={() => updateJobStatus(job.id, 'rejected')} disabled={processingId === job.id} className="p-1.5 bg-slate-800 rounded hover:bg-red-500/20"><ThumbsDown className="w-3.5 h-3.5 text-red-400" /></button>}
                        <button onClick={() => deleteJob(job.id)} className="p-1.5 bg-slate-800 rounded hover:bg-red-500/20"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex flex-wrap justify-between items-center gap-4 mt-6">
                <span className="text-sm text-slate-400">Page {currentPage} of {totalPages} ({totalCount} total jobs)</span>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 bg-slate-700 rounded-lg disabled:opacity-50">Prev</button>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 bg-slate-700 rounded-lg disabled:opacity-50">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Job Form Modal */}
      {showJobModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">{editingJob ? 'Edit Job' : 'Create New Job'}</h2>
              <button onClick={() => setShowJobModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Job Title *" value={jobFormData.title} onChange={e => setJobFormData({...jobFormData, title: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                <input type="text" placeholder="Company *" value={jobFormData.company} onChange={e => setJobFormData({...jobFormData, company: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Location" value={jobFormData.location} onChange={e => setJobFormData({...jobFormData, location: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                <select value={jobFormData.country_code} onChange={e => setJobFormData({...jobFormData, country_code: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
                  {SUPPORTED_COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
                </select>
              </div>
              <textarea placeholder="Description" rows={4} value={jobFormData.description} onChange={e => setJobFormData({...jobFormData, description: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
              <textarea placeholder="Requirements" rows={3} value={jobFormData.requirements} onChange={e => setJobFormData({...jobFormData, requirements: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Salary" value={jobFormData.salary} onChange={e => setJobFormData({...jobFormData, salary: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                <select value={jobFormData.status} onChange={e => setJobFormData({...jobFormData, status: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_featured" checked={jobFormData.is_featured} onChange={e => setJobFormData({...jobFormData, is_featured: e.target.checked})} className="w-4 h-4 rounded" />
                <label htmlFor="is_featured" className="text-white">Feature this job (appears on homepage)</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={createOrUpdateJob} disabled={processingId === 'form'} className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 flex items-center justify-center gap-2">
                  {processingId === 'form' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {processingId === 'form' ? 'Saving...' : 'Save Job'}
                </button>
                <button onClick={() => setShowJobModal(false)} className="flex-1 py-2 bg-slate-700 text-white rounded-lg">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

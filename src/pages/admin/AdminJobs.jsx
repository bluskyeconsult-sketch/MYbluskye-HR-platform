// src/pages/admin/AdminJobs.jsx
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Briefcase, Search, RefreshCw, Loader2, AlertCircle, 
  CheckCircle, XCircle, Eye, Trash2, Download,
  ThumbsUp, ThumbsDown, Star, StarOff, MapPin, Building,
  X, Square, Globe, Clock, Users, Plus, Edit, Save
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SUPPORTED_COUNTRIES = [
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' }
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
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, featured: 0, byCountry: {} });
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
      if (!session) { window.location.href = '/admin-login'; return; }
      setUser(session.user);
      const { data: profile } = await supabase.from('profiles').select('user_type').eq('id', session.user.id).single();
      if (profile?.user_type !== 'super_admin') {
        toast.error('Access denied. Super Admin privileges required.');
        window.location.href = '/admin/dashboard';
        return;
      }
      setIsSuperAdmin(true);
    } catch (err) { window.location.href = '/admin-login'; }
  }

  async function loadStats() {
    try {
      const { data } = await supabase.from('jobs').select('status, is_featured, country_code');
      const total = data?.length || 0;
      const pending = data?.filter(j => j.status === 'pending').length || 0;
      const approved = data?.filter(j => j.status === 'approved').length || 0;
      const rejected = data?.filter(j => j.status === 'rejected').length || 0;
      const featured = data?.filter(j => j.is_featured === true).length || 0;
      const byCountry = {};
      SUPPORTED_COUNTRIES.forEach(c => { byCountry[c.code] = data?.filter(j => j.country_code === c.code).length || 0; });
      setStats({ total, pending, approved, rejected, featured, byCountry });
    } catch (err) { console.error(err); }
  }

  async function loadJobs() {
    try {
      setLoading(true);
      setError(null);
      let query = supabase.from('jobs').select('*', { count: 'exact' }).order('created_at', { ascending: false });
      if (selectedStatus !== 'all') query = query.eq('status', selectedStatus);
      if (selectedCountry !== 'all') query = query.eq('country_code', selectedCountry);
      if (searchTerm) query = query.or(`title.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`);
      const from = (currentPage - 1) * itemsPerPage;
      query = query.range(from, from + itemsPerPage - 1);
      const { data, error, count } = await query;
      if (error) throw error;
      setJobs(data || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      setTotalCount(count || 0);
    } catch (err) {
      setError('Failed to load jobs');
      toast.error('Failed to load jobs');
    } finally { setLoading(false); }
  }

  async function updateJobStatus(jobId, newStatus) {
    setProcessingId(jobId);
    toast.loading(`Updating job status...`, { id: `job-${jobId}` });
    try {
      await supabase.from('jobs').update({ status: newStatus, reviewed_at: new Date().toISOString(), reviewed_by: user?.id }).eq('id', jobId);
      toast.success(`Job ${newStatus}`, { id: `job-${jobId}` });
      await Promise.all([loadJobs(), loadStats()]);
    } catch (err) { toast.error('Failed to update job status', { id: `job-${jobId}` }); }
    finally { setProcessingId(null); }
  }

  async function toggleFeature(jobId, currentStatus) {
    setProcessingId(jobId);
    toast.loading(`${currentStatus ? 'Unfeaturing' : 'Featuring'} job...`, { id: `job-${jobId}` });
    try { await supabase.from('jobs').update({ is_featured: !currentStatus }).eq('id', jobId); toast.success(`Job ${!currentStatus ? 'featured' : 'unfeatured'}`, { id: `job-${jobId}` }); await loadJobs(); }
    catch (err) { toast.error('Failed to update job', { id: `job-${jobId}` }); }
    finally { setProcessingId(null); }
  }

  async function deleteJob(jobId) { setShowDeleteConfirm({ id: jobId }); }
  async function confirmDelete() {
    toast.loading('Deleting job...', { id: 'delete-job' });
    try { await supabase.from('jobs').delete().eq('id', showDeleteConfirm.id); toast.success('Job deleted', { id: 'delete-job' }); await Promise.all([loadJobs(), loadStats()]); setSelectedJobs(new Set()); }
    catch (err) { toast.error('Failed to delete', { id: 'delete-job' }); }
    finally { setShowDeleteConfirm(null); }
  }

  async function bulkAction(action) {
    if (action === 'approve') { for (const id of selectedJobs) { await updateJobStatus(id, 'approved'); } toast.success(`Approved ${selectedJobs.size} jobs`); setSelectedJobs(new Set()); }
    else if (action === 'reject') { for (const id of selectedJobs) { await updateJobStatus(id, 'rejected'); } toast.success(`Rejected ${selectedJobs.size} jobs`); setSelectedJobs(new Set()); }
    else if (action === 'delete') { setShowDeleteConfirm({ ids: Array.from(selectedJobs), type: 'bulk', count: selectedJobs.size }); }
  }
  async function confirmBulkDelete() {
    toast.loading(`Deleting ${showDeleteConfirm.count} jobs...`, { id: 'bulk-delete' });
    try { for (const id of showDeleteConfirm.ids) { await supabase.from('jobs').delete().eq('id', id); } toast.success(`Deleted ${showDeleteConfirm.ids.length} jobs`, { id: 'bulk-delete' }); setSelectedJobs(new Set()); await Promise.all([loadJobs(), loadStats()]); }
    catch (err) { toast.error('Failed to delete', { id: 'bulk-delete' }); }
    finally { setShowDeleteConfirm(null); }
  }

  async function exportJobs() {
    setExporting(true);
    toast.loading('Exporting jobs...', { id: 'export' });
    try {
      const { data } = await supabase.from('jobs').select('title, company, location, country_code, status, is_featured, created_at');
      const headers = ['Title', 'Company', 'Location', 'Country', 'Status', 'Featured', 'Created At'];
      const rows = (data || []).map(j => [j.title, j.company, j.location || 'Remote', j.country_code || 'N/A', j.status, j.is_featured ? 'Yes' : 'No', new Date(j.created_at).toLocaleDateString()]);
      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `jobs-export-${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url);
      toast.success('Jobs exported', { id: 'export' });
    } catch (err) { toast.error('Failed to export', { id: 'export' }); }
    finally { setExporting(false); }
  }

  function toggleSelectJob(id) { const newSet = new Set(selectedJobs); newSet.has(id) ? newSet.delete(id) : newSet.add(id); setSelectedJobs(newSet); }
  function toggleSelectAll() { setSelectedJobs(selectedJobs.size === jobs.length ? new Set() : new Set(jobs.map(j => j.id))); }

  function getStatusBadge(status) {
    if (status === 'approved') return <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400"><CheckCircle className="w-3 h-3" /> Approved</span>;
    if (status === 'rejected') return <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400"><XCircle className="w-3 h-3" /> Rejected</span>;
    return <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-400"><Clock className="w-3 h-3" /> Pending</span>;
  }

  if (!isSuperAdmin) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff' } }} />
      <ConfirmModal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} onConfirm={showDeleteConfirm?.type === 'bulk' ? confirmBulkDelete : confirmDelete} title="Confirm Delete" message={showDeleteConfirm?.type === 'bulk' ? `Delete ${showDeleteConfirm.count} jobs?` : 'Delete this job?'} />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div><h1 className="text-2xl font-bold text-white flex items-center gap-2"><Briefcase className="w-6 h-6 text-primary-400" /> Job Management</h1><p className="text-slate-400 text-sm">Manage all job postings across {SUPPORTED_COUNTRIES.length} countries</p></div>
          <button onClick={exportJobs} disabled={exporting} className="px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2">{exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Export CSV</button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-xs">Total</p><p className="text-2xl font-bold text-white">{stats.total}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-xs">Pending</p><p className="text-2xl font-bold text-amber-400">{stats.pending}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-xs">Approved</p><p className="text-2xl font-bold text-emerald-400">{stats.approved}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-xs">Rejected</p><p className="text-2xl font-bold text-red-400">{stats.rejected}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-xs">Featured</p><p className="text-2xl font-bold text-yellow-400">{stats.featured}</p></div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Search by title, company, or location..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" /></div>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"><option value="all">All Status</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select>
            <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"><option value="all">All Countries</option>{SUPPORTED_COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}</select>
            <button onClick={loadJobs} className="px-4 py-2 bg-slate-700 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </div>

        {selectedJobs.size > 0 && (
          <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 mb-6 flex flex-wrap justify-between items-center gap-4">
            <span className="text-white">{selectedJobs.size} job(s) selected</span>
            <div className="flex gap-3"><button onClick={() => bulkAction('approve')} className="px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2"><ThumbsUp className="w-4 h-4" /> Approve</button><button onClick={() => bulkAction('reject')} className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2"><ThumbsDown className="w-4 h-4" /> Reject</button><button onClick={() => bulkAction('delete')} className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete</button></div>
          </div>
        )}

        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>
        : error ? <div className="text-center py-12 text-red-400">{error}<button onClick={loadJobs} className="ml-2 text-primary-400">Retry</button></div>
        : jobs.length === 0 ? <div className="text-center py-12"><Briefcase className="w-16 h-16 text-slate-700 mx-auto mb-4" /><p className="text-slate-400">No jobs found</p></div>
        : (
          <>
            <div className="flex items-center gap-2 mb-3"><button onClick={toggleSelectAll} className="flex items-center gap-2 text-slate-400">{selectedJobs.size === jobs.length ? <CheckCircle className="w-4 h-4 text-primary-400" /> : <Square className="w-4 h-4" />} Select All ({jobs.length})</button></div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800">
                  <tr><th className="px-4 py-3 w-10"></th><th className="px-4 py-3 text-left">Title / Company</th><th className="px-4 py-3 text-left">Location</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Featured</th><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Actions</th></tr>
                </thead>
                <tbody>
                  {jobs.map(job => (
                    <tr key={job.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                      <td className="px-4 py-3"><button onClick={() => toggleSelectJob(job.id)}>{selectedJobs.has(job.id) ? <CheckCircle className="w-4 h-4 text-primary-400" /> : <Square className="w-4 h-4 text-slate-500" />}</button></td>
                      <td className="px-4 py-3"><div><p className="font-medium text-white">{job.title}</p><p className="text-sm text-slate-400">{job.company}</p></div></td>
                      <td className="px-4 py-3"><span className="flex items-center gap-1">{job.location || 'Remote'}</span></td>
                      <td className="px-4 py-3">{getStatusBadge(job.status)}</td>
                      <td className="px-4 py-3"><button onClick={() => toggleFeature(job.id, job.is_featured)} disabled={processingId === job.id} className={`p-1 ${job.is_featured ? 'text-yellow-400' : 'text-slate-500'}`}>{processingId === job.id ? <Loader2 className="w-3 h-3 animate-spin" /> : job.is_featured ? <Star className="w-3 h-3 fill-yellow-400" /> : <StarOff className="w-3 h-3" />}</button></td>
                      <td className="px-4 py-3 text-sm text-slate-400">{new Date(job.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => updateJobStatus(job.id, 'approved')} disabled={job.status === 'approved'} className="p-1.5 bg-slate-800 rounded hover:bg-emerald-500/20"><ThumbsUp className="w-3.5 h-3.5" /></button><button onClick={() => updateJobStatus(job.id, 'rejected')} disabled={job.status === 'rejected'} className="p-1.5 bg-slate-800 rounded hover:bg-red-500/20"><ThumbsDown className="w-3.5 h-3.5" /></button><button onClick={() => deleteJob(job.id)} className="p-1.5 bg-slate-800 rounded hover:bg-red-500/20"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && <div className="flex justify-between mt-6"><span>Page {currentPage} of {totalPages}</span><div className="flex gap-2"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 bg-slate-700 rounded-lg">Prev</button><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 bg-slate-700 rounded-lg">Next</button></div></div>}
          </>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Plus, Edit, Trash2, Briefcase, Search, RefreshCw, Loader2, AlertCircle, CheckCircle, XCircle, ChevronDown, ChevronUp, Globe, Clock, MapPin, Building, ThumbsUp, ThumbsDown, X, Square, Save } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminExternalJobs() {
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

  const [formData, setFormData] = useState({
    title: '', company: '', location: '', source_name: '', description: '', salary: '', job_type: 'fulltime', external_id: '', status: 'pending_approval'
  });

  const itemsPerPage = 20;
  const jobTypes = ['fulltime', 'parttime', 'contract', 'remote', 'internship'];

  useEffect(() => { checkAuth(); }, []);

  async function checkAuth() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/admin-login'; return; }
      const { data: profile } = await supabase.from('profiles').select('user_type').eq('id', session.user.id).single();
      if (profile?.user_type !== 'admin' && profile?.user_type !== 'super_admin') {
        toast.error('Access denied. Admin privileges required.');
        window.location.href = '/dashboard';
        return;
      }
      setUser(session.user);
      setIsAuthorized(true);
      loadJobs();
      loadStats();
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
      if (selectedStatus !== 'all') query = query.eq('status', selectedStatus);
      if (searchTerm) query = query.or(`title.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      const from = (currentPage - 1) * itemsPerPage;
      query = query.range(from, from + itemsPerPage - 1);
      const { data, error, count } = await query;
      if (error) throw error;
      setJobs(data || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
    } catch (err) {
      setError('Failed to load jobs');
      toast.error('Failed to load jobs');
    } finally { setLoading(false); }
  }

  async function fetchExternalJobs() {
    setFetching(true);
    toast.loading('Fetching external jobs...', { id: 'fetch' });
    try {
      const mockJobs = [
        { title: 'Senior Software Engineer', company: 'Tech Corp', location: 'London, UK', source_name: 'UK Jobs API', salary: '£80,000 - £100,000', description: 'Looking for an experienced software engineer...', job_type: 'fulltime' },
        { title: 'HR Business Partner', company: 'Global Inc', location: 'Manchester, UK', source_name: 'LinkedIn', salary: '£55,000 - £70,000', description: 'Join our growing HR team...', job_type: 'fulltime' },
        { title: 'DevOps Engineer', company: 'Cloud Systems', location: 'Remote', source_name: 'Indeed', salary: '£75,000 - £90,000', description: 'Kubernetes, AWS, CI/CD experience required...', job_type: 'remote' },
      ];
      let newCount = 0;
      for (const job of mockJobs) {
        const { error } = await supabase.from('external_jobs').insert({ ...job, status: 'pending_approval', fetched_at: new Date().toISOString(), fetched_by: user?.id });
        if (!error) newCount++;
      }
      toast.success(`Fetched ${newCount} new jobs`, { id: 'fetch' });
      await loadJobs();
      await loadStats();
    } catch (err) { toast.error('Failed to fetch', { id: 'fetch' }); }
    finally { setFetching(false); }
  }

  async function saveJob() {
    if (!formData.title.trim()) { toast.error('Job title is required'); return; }
    if (!formData.company.trim()) { toast.error('Company name is required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await supabase.from('external_jobs').update(formData).eq('id', editing);
        toast.success('Job updated');
      } else {
        await supabase.from('external_jobs').insert({ ...formData, fetched_at: new Date().toISOString(), fetched_by: user?.id });
        toast.success('Job created');
      }
      setShowForm(false);
      setEditing(null);
      resetForm();
      await loadJobs();
      await loadStats();
    } catch (err) { toast.error('Failed to save'); }
    finally { setSaving(false); }
  }

  async function approveJob(id) {
    try { await supabase.from('external_jobs').update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq('id', id); toast.success('Job approved'); await loadJobs(); await loadStats(); }
    catch (err) { toast.error('Failed to approve'); }
  }

  async function rejectJob(id) {
    try { await supabase.from('external_jobs').update({ status: 'rejected', reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq('id', id); toast.success('Job rejected'); await loadJobs(); await loadStats(); }
    catch (err) { toast.error('Failed to reject'); }
  }

  async function bulkApprove() { setShowDeleteConfirm({ ids: Array.from(selectedJobs), type: 'approve', count: selectedJobs.size }); }
  async function bulkReject() { setShowDeleteConfirm({ ids: Array.from(selectedJobs), type: 'reject', count: selectedJobs.size }); }
  async function confirmBulkAction() {
    const newStatus = showDeleteConfirm.type === 'approve' ? 'approved' : 'rejected';
    try { await supabase.from('external_jobs').update({ status: newStatus, reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).in('id', showDeleteConfirm.ids); toast.success(`${showDeleteConfirm.count} jobs ${newStatus}`); setSelectedJobs(new Set()); await loadJobs(); await loadStats(); }
    catch (err) { toast.error('Failed to update'); }
    finally { setShowDeleteConfirm(null); }
  }

  async function deleteJob(id) { setShowDeleteConfirm({ id, type: 'delete' }); }
  async function confirmDelete() {
    try { await supabase.from('external_jobs').delete().eq('id', showDeleteConfirm.id); toast.success('Job deleted'); await loadJobs(); await loadStats(); }
    catch (err) { toast.error('Failed to delete'); }
    finally { setShowDeleteConfirm(null); }
  }

  function resetForm() {
    setFormData({ title: '', company: '', location: '', source_name: '', description: '', salary: '', job_type: 'fulltime', external_id: '', status: 'pending_approval' });
  }

  function handleEdit(job) { setEditing(job.id); setFormData(job); setShowForm(true); }
  function toggleSelectAll() { setSelectedJobs(selectedJobs.size === jobs.length ? new Set() : new Set(jobs.map(j => j.id))); }
  function toggleSelectJob(id) { const newSet = new Set(selectedJobs); newSet.has(id) ? newSet.delete(id) : newSet.add(id); setSelectedJobs(newSet); }

  function getStatusBadge(status) {
    if (status === 'approved') return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-400"><CheckCircle className="w-3 h-3" /> Approved</span>;
    if (status === 'rejected') return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400"><XCircle className="w-3 h-3" /> Rejected</span>;
    return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-amber-500/20 text-amber-400"><Clock className="w-3 h-3" /> Pending</span>;
  }

  const uniqueSources = [...new Set(jobs.map(j => j.source_name).filter(Boolean))];

  useEffect(() => { setCurrentPage(1); if (isAuthorized) loadJobs(); }, [searchTerm, selectedSource, selectedStatus]);

  if (!isAuthorized) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff' } }} />
      <ConfirmModal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} onConfirm={showDeleteConfirm?.type === 'delete' ? confirmDelete : confirmBulkAction} title={showDeleteConfirm?.type === 'approve' ? 'Confirm Approve' : showDeleteConfirm?.type === 'reject' ? 'Confirm Reject' : 'Confirm Delete'} message={showDeleteConfirm?.type === 'approve' ? `Approve ${showDeleteConfirm.count} jobs?` : showDeleteConfirm?.type === 'reject' ? `Reject ${showDeleteConfirm.count} jobs?` : 'Delete this job?'} confirmText={showDeleteConfirm?.type === 'approve' ? 'Approve' : showDeleteConfirm?.type === 'reject' ? 'Reject' : 'Delete'} confirmVariant={showDeleteConfirm?.type === 'approve' ? 'success' : 'danger'} />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div><h1 className="text-2xl font-bold text-white flex items-center gap-2"><Briefcase className="w-6 h-6 text-primary-400" /> External Jobs Moderation</h1><p className="text-slate-400 text-sm">Review and approve external job listings</p></div>
          <div className="flex gap-3"><button onClick={fetchExternalJobs} disabled={fetching} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2">{fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}{fetching ? 'Fetching...' : 'Fetch Jobs'}</button><button onClick={() => { resetForm(); setEditing(null); setShowForm(true); }} className="px-4 py-2 bg-primary-500 text-white rounded-lg flex items-center gap-2"><Plus className="w-4 h-4" /> Add Job</button></div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-sm">Total</p><p className="text-2xl font-bold text-white">{stats.total}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-sm">Pending</p><p className="text-2xl font-bold text-amber-400">{stats.pending}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-sm">Approved</p><p className="text-2xl font-bold text-emerald-400">{stats.approved}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-sm">Rejected</p><p className="text-2xl font-bold text-red-400">{stats.rejected}</p></div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Search by title or company..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" /></div>
            <select value={selectedSource} onChange={(e) => setSelectedSource(e.target.value)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"><option value="all">All Sources</option>{uniqueSources.map(s => <option key={s} value={s}>{s}</option>)}</select>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"><option value="all">All Status</option><option value="pending_approval">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select>
            <button onClick={loadJobs} className="px-4 py-2 bg-slate-700 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </div>

        {selectedJobs.size > 0 && <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 mb-6 flex flex-wrap justify-between items-center gap-4"><span>{selectedJobs.size} selected</span><div className="flex gap-3"><button onClick={bulkApprove} className="px-4 py-2 bg-emerald-600 rounded-lg flex items-center gap-2"><ThumbsUp className="w-4 h-4" /> Approve</button><button onClick={bulkReject} className="px-4 py-2 bg-red-600 rounded-lg flex items-center gap-2"><ThumbsDown className="w-4 h-4" /> Reject</button></div></div>}

        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div> : error ? <div className="text-center py-12 text-red-400">{error}<button onClick={loadJobs} className="ml-2 text-primary-400">Retry</button></div> : jobs.length === 0 ? <div className="text-center py-12"><Briefcase className="w-16 h-16 text-slate-700 mx-auto mb-4" /><p>No external jobs found. Click "Fetch Jobs" to import listings.</p></div> : (
          <>
            <div className="flex items-center gap-2 mb-3"><button onClick={toggleSelectAll} className="flex items-center gap-2 text-slate-400">{selectedJobs.size === jobs.length ? <CheckCircle className="w-4 h-4 text-primary-400" /> : <Square className="w-4 h-4" />} Select All ({jobs.length})</button></div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800"><tr><th className="px-4 py-3 text-left text-white text-sm w-10"></th><th className="px-4 py-3 text-left text-white text-sm">Title / Company</th><th className="px-4 py-3 text-left text-white text-sm">Location</th><th className="px-4 py-3 text-left text-white text-sm">Source</th><th className="px-4 py-3 text-left text-white text-sm">Status</th><th className="px-4 py-3 text-left text-white text-sm">Date</th><th className="px-4 py-3 text-left text-white text-sm">Actions</th></tr></thead>
                <tbody>
                  {jobs.map(job => (
                    <React.Fragment key={job.id}>
                      <tr className={`border-t border-slate-800 hover:bg-slate-800/30 ${selectedJobs.has(job.id) ? 'bg-primary-500/5' : ''}`}>
                        <td className="px-4 py-3"><button onClick={() => toggleSelectJob(job.id)}>{selectedJobs.has(job.id) ? <CheckCircle className="w-4 h-4 text-primary-400" /> : <Square className="w-4 h-4 text-slate-500" />}</button></td>
                        <td className="px-4 py-3"><div><p className="text-white font-medium">{job.title}</p><p className="text-slate-400 text-sm flex items-center gap-1"><Building className="w-3 h-3" /> {job.company}</p></div></td>
                        <td className="px-4 py-3 text-slate-300 text-sm"><MapPin className="w-3 h-3 inline mr-1" /> {job.location || 'Remote'}</td>
                        <td className="px-4 py-3 text-slate-400 text-sm">{job.source_name}</td>
                        <td className="px-4 py-3">{getStatusBadge(job.status)}</td>
                        <td className="px-4 py-3 text-slate-400 text-sm whitespace-nowrap">{new Date(job.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => approveJob(job.id)} disabled={job.status === 'approved'} className="p-1.5 bg-slate-800 rounded hover:bg-emerald-500/20" title="Approve"><ThumbsUp className="w-3.5 h-3.5 text-emerald-400" /></button><button onClick={() => rejectJob(job.id)} disabled={job.status === 'rejected'} className="p-1.5 bg-slate-800 rounded hover:bg-red-500/20" title="Reject"><ThumbsDown className="w-3.5 h-3.5 text-red-400" /></button><button onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)} className="p-1.5 bg-slate-800 rounded hover:bg-slate-700">{expandedJob === job.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</button><button onClick={() => deleteJob(job.id)} className="p-1.5 bg-slate-800 rounded hover:bg-red-500/20"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button></div></td>
                      </tr>
                      {expandedJob === job.id && (<tr className="border-t border-slate-800 bg-slate-900/30"><td colSpan="7" className="px-6 py-4"><div><h4 className="text-sm font-semibold text-white mb-1">Description</h4><p className="text-slate-400 text-sm">{job.description || 'No description provided.'}</p>{job.salary && <div className="mt-3"><h4 className="text-sm font-semibold text-white mb-1">Salary</h4><p className="text-slate-400 text-sm">{job.salary}</p></div>}<div className="flex gap-4 text-xs text-slate-500 mt-3"><span>External ID: {job.external_id || 'N/A'}</span><span>Fetched: {new Date(job.created_at).toLocaleString()}</span></div></div></td></tr>)}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && <div className="flex justify-between mt-6"><span>Page {currentPage} of {totalPages}</span><div className="flex gap-2"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 bg-slate-700 rounded-lg">Prev</button><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 bg-slate-700 rounded-lg">Next</button></div></div>}
          </>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 rounded-xl p-6 max-w-lg w-full">
            <div className="flex justify-between mb-4"><h2 className="text-xl font-bold text-white">{editing ? 'Edit' : 'Add'} Job</h2><button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4"><input type="text" placeholder="Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg" /><input type="text" placeholder="Company" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg" /></div>
              <div className="grid grid-cols-2 gap-4"><input type="text" placeholder="Location" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg" /><input type="text" placeholder="Source" value={formData.source_name} onChange={e => setFormData({...formData, source_name: e.target.value})} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg" /></div>
              <textarea placeholder="Description" rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg" />
              <div className="grid grid-cols-2 gap-4"><input type="text" placeholder="Salary" value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg" /><select value={formData.job_type} onChange={e => setFormData({...formData, job_type: e.target.value})} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg">{jobTypes.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"><option value="pending_approval">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select>
              <div className="flex gap-3 pt-4"><button onClick={saveJob} disabled={saving} className="flex-1 py-2 bg-primary-600 text-white rounded-lg flex items-center justify-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{saving ? 'Saving...' : 'Save'}</button><button onClick={() => setShowForm(false)} className="flex-1 py-2 bg-slate-700 rounded-lg">Cancel</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React from 'react';

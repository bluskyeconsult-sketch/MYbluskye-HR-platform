import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Plus, Edit, Trash2, Brain, Search, RefreshCw, Loader2, AlertCircle, CheckCircle, Eye, EyeOff, X, Square, Save, Clock, DollarSign, Users } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminAssessments() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedAssessments, setSelectedAssessments] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, completed: 0 });
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '', category: 'psychometric', description: '', price: 9.99, duration_minutes: 15, question_count: 20, is_active: true
  });

  const itemsPerPage = 20;
  const categories = ['psychometric', 'workplace_skill', 'career_aptitude', 'technical', 'language'];

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
      loadAssessments();
      loadStats();
    } catch (err) { window.location.href = '/admin-login'; }
  }

  async function loadStats() {
    try {
      const { data } = await supabase.from('assessments').select('is_active');
      const total = data?.length || 0;
      const active = data?.filter(a => a.is_active === true).length || 0;
      const inactive = data?.filter(a => a.is_active === false).length || 0;
      const { count: completed } = await supabase.from('user_assessments').select('*', { count: 'exact', head: true }).eq('status', 'completed');
      setStats({ total, active, inactive, completed: completed || 0 });
    } catch (err) { console.error(err); }
  }

  async function loadAssessments() {
    try {
      setLoading(true);
      setError(null);
      let query = supabase.from('assessments').select('*', { count: 'exact' }).order('created_at', { ascending: false });
      if (selectedCategory !== 'all') query = query.eq('category', selectedCategory);
      if (selectedStatus !== 'all') query = query.eq('is_active', selectedStatus === 'active');
      if (searchTerm) query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      const from = (currentPage - 1) * itemsPerPage;
      query = query.range(from, from + itemsPerPage - 1);
      const { data, error, count } = await query;
      if (error) throw error;
      setAssessments(data || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
    } catch (err) {
      setError('Failed to load assessments');
      toast.error('Failed to load assessments');
    } finally { setLoading(false); }
  }

  async function saveAssessment() {
    if (!formData.name.trim()) { toast.error('Name is required'); return; }
    if (formData.price < 0) { toast.error('Price cannot be negative'); return; }
    if (formData.duration_minutes < 1) { toast.error('Duration must be at least 1 minute'); return; }
    if (formData.question_count < 1) { toast.error('Must have at least 1 question'); return; }
    setSaving(true);
    try {
      const assessmentData = { ...formData, price: parseFloat(formData.price), duration_minutes: parseInt(formData.duration_minutes), question_count: parseInt(formData.question_count) };
      if (editing) {
        await supabase.from('assessments').update(assessmentData).eq('id', editing);
        toast.success('Assessment updated');
      } else {
        await supabase.from('assessments').insert({ ...assessmentData, taken_count: 0 });
        toast.success('Assessment created');
      }
      setShowForm(false);
      setEditing(null);
      resetForm();
      await loadAssessments();
      await loadStats();
    } catch (err) { toast.error('Failed to save'); }
    finally { setSaving(false); }
  }

  async function deleteAssessment(id) { setShowDeleteConfirm({ id, type: 'single' }); }
  async function confirmDelete() {
    try {
      await supabase.from('assessment_questions').delete().eq('assessment_id', showDeleteConfirm.id);
      await supabase.from('assessments').delete().eq('id', showDeleteConfirm.id);
      toast.success('Assessment deleted');
      await loadAssessments();
      await loadStats();
    } catch (err) { toast.error('Failed to delete'); }
    finally { setShowDeleteConfirm(null); }
  }

  async function bulkDelete() { setShowDeleteConfirm({ ids: Array.from(selectedAssessments), type: 'bulk', count: selectedAssessments.size }); }
  async function confirmBulkDelete() {
    try {
      for (const id of showDeleteConfirm.ids) { await supabase.from('assessment_questions').delete().eq('assessment_id', id); }
      await supabase.from('assessments').delete().in('id', showDeleteConfirm.ids);
      toast.success(`Deleted ${showDeleteConfirm.ids.length} assessments`);
      setSelectedAssessments(new Set());
      await loadAssessments();
      await loadStats();
    } catch (err) { toast.error('Failed to delete'); }
    finally { setShowDeleteConfirm(null); }
  }

  async function toggleStatus(id, currentStatus) {
    try { await supabase.from('assessments').update({ is_active: !currentStatus }).eq('id', id); toast.success(`Assessment ${!currentStatus ? 'activated' : 'deactivated'}`); await loadAssessments(); await loadStats(); }
    catch (err) { toast.error('Failed to update status'); }
  }

  function resetForm() {
    setFormData({ name: '', category: 'psychometric', description: '', price: 9.99, duration_minutes: 15, question_count: 20, is_active: true });
  }

  function handleEdit(assessment) { setEditing(assessment.id); setFormData(assessment); setShowForm(true); }
  function toggleSelectAll() { setSelectedAssessments(selectedAssessments.size === assessments.length ? new Set() : new Set(assessments.map(a => a.id))); }
  function toggleSelectAssessment(id) { const newSet = new Set(selectedAssessments); newSet.has(id) ? newSet.delete(id) : newSet.add(id); setSelectedAssessments(newSet); }

  const formatPrice = (price) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);

  useEffect(() => { setCurrentPage(1); if (isAuthorized) loadAssessments(); }, [searchTerm, selectedCategory, selectedStatus]);

  if (!isAuthorized) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff' } }} />
      <ConfirmModal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} onConfirm={showDeleteConfirm?.type === 'bulk' ? confirmBulkDelete : confirmDelete} title="Confirm Delete" message={showDeleteConfirm?.type === 'bulk' ? `Delete ${showDeleteConfirm.count} assessments?` : 'Delete this assessment?'} />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div><h1 className="text-2xl font-bold text-white flex items-center gap-2"><Brain className="w-6 h-6 text-primary-400" /> Assessment Management</h1></div>
          <button onClick={() => { resetForm(); setEditing(null); setShowForm(true); }} className="px-4 py-2 bg-primary-500 text-white rounded-lg flex items-center gap-2"><Plus className="w-4 h-4" /> Add Assessment</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-sm">Total</p><p className="text-2xl font-bold text-white">{stats.total}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-sm">Active</p><p className="text-2xl font-bold text-emerald-400">{stats.active}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-sm">Completed</p><p className="text-2xl font-bold text-blue-400">{stats.completed.toLocaleString()}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-sm">Avg Score</p><p className="text-2xl font-bold text-amber-400">68%</p></div>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg" /></div>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"><option value="all">All Categories</option>{categories.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}</select>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"><option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
            <button onClick={loadAssessments} className="px-4 py-2 bg-slate-700 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </div>
        {selectedAssessments.size > 0 && <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 mb-6 flex justify-between"><span>{selectedAssessments.size} selected</span><button onClick={bulkDelete} className="px-4 py-2 bg-red-600 rounded-lg"><Trash2 className="w-4 h-4" /> Delete</button></div>}
        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div> : error ? <div className="text-center py-12 text-red-400">{error}<button onClick={loadAssessments} className="ml-2 text-primary-400">Retry</button></div> : assessments.length === 0 ? <div className="text-center py-12"><Brain className="w-16 h-16 text-slate-700 mx-auto mb-4" /><p>No assessments found</p></div> : (
          <>
            <div className="flex items-center gap-2 mb-3"><button onClick={toggleSelectAll} className="flex items-center gap-2 text-slate-400">{selectedAssessments.size === assessments.length ? <CheckCircle className="w-4 h-4 text-primary-400" /> : <Square className="w-4 h-4" />} Select All ({assessments.length})</button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assessments.map(assessment => (
                <div key={assessment.id} className={`bg-slate-900/50 border rounded-xl overflow-hidden ${selectedAssessments.has(assessment.id) ? 'border-primary-500' : 'border-slate-800'}`}>
                  <div className="p-5">
                    <div className="flex justify-between"><div><h3 className="font-semibold text-white">{assessment.name}</h3><p className="text-sm text-slate-400">{assessment.category?.replace('_', ' ')}</p></div><button onClick={() => toggleSelectAssessment(assessment.id)}>{selectedAssessments.has(assessment.id) ? <CheckCircle className="w-5 h-5 text-primary-400" /> : <Square className="w-5 h-5 text-slate-500" />}</button></div>
                    <p className="text-slate-400 text-sm mt-2 line-clamp-2">{assessment.description}</p>
                    <div className="mt-3 flex gap-2"><span className="flex items-center gap-1 text-sm"><Clock className="w-3 h-3" /> {assessment.duration_minutes} min</span><span className="flex items-center gap-1 text-sm"><Users className="w-3 h-3" /> {assessment.question_count} Qs</span></div>
                    <div className="mt-3 flex justify-between"><span className="text-xl font-bold text-primary-400">{formatPrice(assessment.price)}</span><button onClick={() => toggleStatus(assessment.id, assessment.is_active)} className={`text-xs px-2 py-1 rounded-full ${assessment.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{assessment.is_active ? 'Active' : 'Inactive'}</button></div>
                    <div className="flex gap-2 mt-4 pt-3 border-t"><button onClick={() => handleEdit(assessment)} className="flex-1 py-1.5 bg-slate-700 rounded-lg text-sm"><Edit className="w-3.5 h-3.5" /> Edit</button><button onClick={() => deleteAssessment(assessment.id)} className="flex-1 py-1.5 bg-red-600/20 text-red-400 rounded-lg text-sm"><Trash2 className="w-3.5 h-3.5" /> Delete</button></div>
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && <div className="flex justify-between mt-6"><span>Page {currentPage} of {totalPages}</span><div className="flex gap-2"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 bg-slate-700 rounded-lg">Prev</button><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 bg-slate-700 rounded-lg">Next</button></div></div>}
          </>
        )}
      </div>
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-xl p-6 max-w-lg w-full">
            <div className="flex justify-between mb-4"><h2 className="text-xl font-bold text-white">{editing ? 'Edit' : 'Add'} Assessment</h2><button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <input type="text" placeholder="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg" />
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg">{categories.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}</select>
              <textarea placeholder="Description" rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg" />
              <div className="grid grid-cols-2 gap-4"><input type="number" step="0.01" placeholder="Price" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg" /><input type="number" placeholder="Duration (min)" value={formData.duration_minutes} onChange={e => setFormData({...formData, duration_minutes: parseInt(e.target.value)})} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg" /></div>
              <div className="grid grid-cols-2 gap-4"><input type="number" placeholder="Questions" value={formData.question_count} onChange={e => setFormData({...formData, question_count: parseInt(e.target.value)})} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg" /><select value={formData.is_active ? 'active' : 'inactive'} onChange={e => setFormData({...formData, is_active: e.target.value === 'active'})} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
              <div className="flex gap-3 pt-4"><button onClick={saveAssessment} disabled={saving} className="flex-1 py-2 bg-primary-600 text-white rounded-lg flex items-center justify-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{saving ? 'Saving...' : 'Save'}</button><button onClick={() => setShowForm(false)} className="flex-1 py-2 bg-slate-700 rounded-lg">Cancel</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Plus, Edit, Trash2, Bot, Search, RefreshCw, Loader2, AlertCircle, CheckCircle, Eye, EyeOff, X, Square, Save } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminVirtualAssistants() {
  const [vas, setVAs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedVAs, setSelectedVAs] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, tasksCompleted: 0 });
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '', specialty: '', category: 'career', description: '', price: 9.99, delivery_minutes: 30, qa_score: 95, is_active: true
  });

  const itemsPerPage = 20;
  const categories = ['career', 'resume', 'writing', 'coding', 'design', 'marketing'];

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
      loadVAs();
      loadStats();
    } catch (err) { window.location.href = '/admin-login'; }
  }

  async function loadStats() {
    try {
      const { data } = await supabase.from('virtual_assistants').select('is_active, tasks_completed');
      const total = data?.length || 0;
      const active = data?.filter(va => va.is_active === true).length || 0;
      const inactive = data?.filter(va => va.is_active === false).length || 0;
      const tasksCompleted = data?.reduce((sum, va) => sum + (va.tasks_completed || 0), 0) || 0;
      setStats({ total, active, inactive, tasksCompleted });
    } catch (err) { console.error(err); }
  }

  async function loadVAs() {
    try {
      setLoading(true);
      setError(null);
      let query = supabase.from('virtual_assistants').select('*', { count: 'exact' }).order('created_at', { ascending: false });
      if (selectedCategory !== 'all') query = query.eq('category', selectedCategory);
      if (selectedStatus !== 'all') query = query.eq('is_active', selectedStatus === 'active');
      if (searchTerm) query = query.or(`name.ilike.%${searchTerm}%,specialty.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      const from = (currentPage - 1) * itemsPerPage;
      query = query.range(from, from + itemsPerPage - 1);
      const { data, error, count } = await query;
      if (error) throw error;
      setVAs(data || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
    } catch (err) {
      setError('Failed to load VAs');
      toast.error('Failed to load VAs');
    } finally { setLoading(false); }
  }

  async function saveVA() {
    if (!formData.name.trim()) { toast.error('Name is required'); return; }
    if (!formData.specialty.trim()) { toast.error('Specialty is required'); return; }
    if (formData.price < 0) { toast.error('Price cannot be negative'); return; }
    setSaving(true);
    try {
      const vaData = { ...formData, price: parseFloat(formData.price), delivery_minutes: parseInt(formData.delivery_minutes), qa_score: parseInt(formData.qa_score) };
      if (editing) {
        await supabase.from('virtual_assistants').update(vaData).eq('id', editing);
        toast.success('VA updated');
      } else {
        await supabase.from('virtual_assistants').insert({ ...vaData, tasks_completed: 0, rating: 0 });
        toast.success('VA created');
      }
      setShowForm(false);
      setEditing(null);
      resetForm();
      await loadVAs();
      await loadStats();
    } catch (err) { toast.error('Failed to save'); }
    finally { setSaving(false); }
  }

  async function deleteVA(id) { setShowDeleteConfirm({ id, type: 'single' }); }
  async function confirmDelete() {
    try { await supabase.from('virtual_assistants').delete().eq('id', showDeleteConfirm.id); toast.success('VA deleted'); await loadVAs(); await loadStats(); }
    catch (err) { toast.error('Failed to delete'); }
    finally { setShowDeleteConfirm(null); }
  }

  async function bulkDelete() { setShowDeleteConfirm({ ids: Array.from(selectedVAs), type: 'bulk', count: selectedVAs.size }); }
  async function confirmBulkDelete() {
    try { await supabase.from('virtual_assistants').delete().in('id', showDeleteConfirm.ids); toast.success(`Deleted ${showDeleteConfirm.ids.length} VAs`); setSelectedVAs(new Set()); await loadVAs(); await loadStats(); }
    catch (err) { toast.error('Failed to delete'); }
    finally { setShowDeleteConfirm(null); }
  }

  async function toggleStatus(id, currentStatus) {
    try { await supabase.from('virtual_assistants').update({ is_active: !currentStatus }).eq('id', id); toast.success(`VA ${!currentStatus ? 'activated' : 'deactivated'}`); await loadVAs(); await loadStats(); }
    catch (err) { toast.error('Failed to update status'); }
  }

  function resetForm() {
    setFormData({ name: '', specialty: '', category: 'career', description: '', price: 9.99, delivery_minutes: 30, qa_score: 95, is_active: true });
  }

  function handleEdit(va) { setEditing(va.id); setFormData(va); setShowForm(true); }
  function toggleSelectAll() { setSelectedVAs(selectedVAs.size === vas.length ? new Set() : new Set(vas.map(v => v.id))); }
  function toggleSelectVA(id) { const newSet = new Set(selectedVAs); newSet.has(id) ? newSet.delete(id) : newSet.add(id); setSelectedVAs(newSet); }

  const formatPrice = (price) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);

  useEffect(() => { setCurrentPage(1); if (isAuthorized) loadVAs(); }, [searchTerm, selectedCategory, selectedStatus]);

  if (!isAuthorized) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff' } }} />
      <ConfirmModal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} onConfirm={showDeleteConfirm?.type === 'bulk' ? confirmBulkDelete : confirmDelete} title="Confirm Delete" message={showDeleteConfirm?.type === 'bulk' ? `Delete ${showDeleteConfirm.count} VAs?` : 'Delete this VA?'} />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div><h1 className="text-2xl font-bold text-white flex items-center gap-2"><Bot className="w-6 h-6 text-primary-400" /> Virtual Assistant Management</h1></div>
          <button onClick={() => { resetForm(); setEditing(null); setShowForm(true); }} className="px-4 py-2 bg-primary-500 text-white rounded-lg flex items-center gap-2"><Plus className="w-4 h-4" /> Add VA</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-sm">Total</p><p className="text-2xl font-bold text-white">{stats.total}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-sm">Active</p><p className="text-2xl font-bold text-emerald-400">{stats.active}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-sm">Tasks</p><p className="text-2xl font-bold text-blue-400">{stats.tasksCompleted.toLocaleString()}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-sm">Avg Rating</p><p className="text-2xl font-bold text-amber-400">4.8</p></div>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg" /></div>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"><option value="all">All Categories</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"><option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
            <button onClick={loadVAs} className="px-4 py-2 bg-slate-700 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </div>
        {selectedVAs.size > 0 && <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 mb-6 flex justify-between"><span>{selectedVAs.size} selected</span><button onClick={bulkDelete} className="px-4 py-2 bg-red-600 rounded-lg"><Trash2 className="w-4 h-4" /> Delete</button></div>}
        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div> : error ? <div className="text-center py-12 text-red-400">{error}<button onClick={loadVAs} className="ml-2 text-primary-400">Retry</button></div> : vas.length === 0 ? <div className="text-center py-12"><Bot className="w-16 h-16 text-slate-700 mx-auto mb-4" /><p>No VAs found</p></div> : (
          <>
            <div className="flex items-center gap-2 mb-3"><button onClick={toggleSelectAll} className="flex items-center gap-2 text-slate-400">{selectedVAs.size === vas.length ? <CheckCircle className="w-4 h-4 text-primary-400" /> : <Square className="w-4 h-4" />} Select All ({vas.length})</button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vas.map(va => (
                <div key={va.id} className={`bg-slate-900/50 border rounded-xl overflow-hidden ${selectedVAs.has(va.id) ? 'border-primary-500' : 'border-slate-800'}`}>
                  <div className="p-5">
                    <div className="flex justify-between"><div><h3 className="font-semibold text-white">{va.name}</h3><p className="text-sm text-slate-400">{va.specialty}</p></div><button onClick={() => toggleSelectVA(va.id)}>{selectedVAs.has(va.id) ? <CheckCircle className="w-5 h-5 text-primary-400" /> : <Square className="w-5 h-5 text-slate-500" />}</button></div>
                    <p className="text-slate-400 text-sm mt-2 line-clamp-2">{va.description}</p>
                    <div className="mt-3 flex justify-between"><span className="text-xl font-bold text-primary-400">{formatPrice(va.price)}</span><button onClick={() => toggleStatus(va.id, va.is_active)} className={`text-xs px-2 py-1 rounded-full ${va.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{va.is_active ? 'Active' : 'Inactive'}</button></div>
                    <div className="flex gap-2 mt-4 pt-3 border-t"><button onClick={() => handleEdit(va)} className="flex-1 py-1.5 bg-slate-700 rounded-lg text-sm"><Edit className="w-3.5 h-3.5" /> Edit</button><button onClick={() => deleteVA(va.id)} className="flex-1 py-1.5 bg-red-600/20 text-red-400 rounded-lg text-sm"><Trash2 className="w-3.5 h-3.5" /> Delete</button></div>
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
            <div className="flex justify-between mb-4"><h2 className="text-xl font-bold text-white">{editing ? 'Edit' : 'Add'} VA</h2><button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <input type="text" placeholder="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg" />
              <input type="text" placeholder="Specialty" value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg" />
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg">{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
              <textarea placeholder="Description" rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg" />
              <div className="grid grid-cols-3 gap-4"><input type="number" step="0.01" placeholder="Price" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg" /><input type="number" placeholder="Delivery (min)" value={formData.delivery_minutes} onChange={e => setFormData({...formData, delivery_minutes: parseInt(e.target.value)})} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg" /><input type="number" placeholder="QA Score" value={formData.qa_score} onChange={e => setFormData({...formData, qa_score: parseInt(e.target.value)})} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg" /></div>
              <div className="flex items-center gap-2"><input type="checkbox" id="is_active" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="w-4 h-4" /><label htmlFor="is_active" className="text-white">Active</label></div>
              <div className="flex gap-3 pt-4"><button onClick={saveVA} disabled={saving} className="flex-1 py-2 bg-primary-600 text-white rounded-lg flex items-center justify-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{saving ? 'Saving...' : 'Save'}</button><button onClick={() => setShowForm(false)} className="flex-1 py-2 bg-slate-700 rounded-lg">Cancel</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

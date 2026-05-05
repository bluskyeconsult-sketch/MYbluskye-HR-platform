import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Plus, Edit, Trash2, BookOpen, Search, RefreshCw, Loader2, AlertCircle, CheckCircle, Eye, EyeOff, X, Square, Save } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminBooks() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedBooks, setSelectedBooks] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [stats, setStats] = useState({ total: 0, published: 0, draft: 0, revenue: 0 });
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState('');

  const [formData, setFormData] = useState({
    title: '', author: '', description: '', price: 0, cover_image: '', status: 'draft'
  });

  const itemsPerPage = 20;

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
      loadBooks();
      loadStats();
    } catch (err) { window.location.href = '/admin-login'; }
  }

  async function loadStats() {
    try {
      const { data } = await supabase.from('books').select('status, price');
      const total = data?.length || 0;
      const published = data?.filter(b => b.status === 'published').length || 0;
      const draft = data?.filter(b => b.status === 'draft').length || 0;
      const revenue = data?.reduce((sum, b) => b.status === 'published' ? sum + (b.price || 0) : sum, 0) || 0;
      setStats({ total, published, draft, revenue });
    } catch (err) { console.error(err); }
  }

  async function loadBooks() {
    try {
      setLoading(true);
      setError(null);
      let query = supabase.from('books').select('*', { count: 'exact' }).order('created_at', { ascending: false });
      if (selectedStatus !== 'all') query = query.eq('status', selectedStatus);
      if (searchTerm) query = query.or(`title.ilike.%${searchTerm}%,author.ilike.%${searchTerm}%`);
      const from = (currentPage - 1) * itemsPerPage;
      query = query.range(from, from + itemsPerPage - 1);
      const { data, error, count } = await query;
      if (error) throw error;
      setBooks(data || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
    } catch (err) {
      setError('Failed to load books');
      toast.error('Failed to load books');
    } finally { setLoading(false); }
  }

  async function saveBook() {
    if (!formData.title.trim()) { toast.error('Title is required'); return; }
    if (!formData.author.trim()) { toast.error('Author is required'); return; }
    if (formData.price < 0) { toast.error('Price cannot be negative'); return; }
    setSaving(true);
    try {
      const bookData = { ...formData, price: parseFloat(formData.price) };
      if (editing) {
        await supabase.from('books').update(bookData).eq('id', editing);
        toast.success('Book updated');
      } else {
        await supabase.from('books').insert(bookData);
        toast.success('Book created');
      }
      setShowForm(false);
      setEditing(null);
      resetForm();
      await loadBooks();
      await loadStats();
    } catch (err) { toast.error('Failed to save'); }
    finally { setSaving(false); }
  }

  async function deleteBook(id) { setShowDeleteConfirm({ id, type: 'single' }); }
  async function confirmDelete() {
    try { await supabase.from('books').delete().eq('id', showDeleteConfirm.id); toast.success('Book deleted'); await loadBooks(); await loadStats(); }
    catch (err) { toast.error('Failed to delete'); }
    finally { setShowDeleteConfirm(null); }
  }

  async function bulkDelete() { setShowDeleteConfirm({ ids: Array.from(selectedBooks), type: 'bulk', count: selectedBooks.size }); }
  async function confirmBulkDelete() {
    try { await supabase.from('books').delete().in('id', showDeleteConfirm.ids); toast.success(`Deleted ${showDeleteConfirm.ids.length} books`); setSelectedBooks(new Set()); await loadBooks(); await loadStats(); }
    catch (err) { toast.error('Failed to delete'); }
    finally { setShowDeleteConfirm(null); }
  }

  async function toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    try { await supabase.from('books').update({ status: newStatus }).eq('id', id); toast.success(`Book ${newStatus}`); await loadBooks(); await loadStats(); }
    catch (err) { toast.error('Failed to update status'); }
  }

  function resetForm() {
    setFormData({ title: '', author: '', description: '', price: 0, cover_image: '', status: 'draft' });
    setImagePreview('');
  }

  function handleEdit(book) { setEditing(book.id); setFormData(book); setImagePreview(book.cover_image); setShowForm(true); }
  function toggleSelectAll() { setSelectedBooks(selectedBooks.size === books.length ? new Set() : new Set(books.map(b => b.id))); }
  function toggleSelectBook(id) { const newSet = new Set(selectedBooks); newSet.has(id) ? newSet.delete(id) : newSet.add(id); setSelectedBooks(newSet); }

  const formatPrice = (price) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);

  useEffect(() => { setCurrentPage(1); if (isAuthorized) loadBooks(); }, [searchTerm, selectedStatus]);

  if (!isAuthorized) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff' } }} />
      <ConfirmModal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} onConfirm={showDeleteConfirm?.type === 'bulk' ? confirmBulkDelete : confirmDelete} title="Confirm Delete" message={showDeleteConfirm?.type === 'bulk' ? `Delete ${showDeleteConfirm.count} books?` : 'Delete this book?'} />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div><h1 className="text-2xl font-bold text-white flex items-center gap-2"><BookOpen className="w-6 h-6 text-primary-400" /> Book Management</h1></div>
          <button onClick={() => { resetForm(); setEditing(null); setShowForm(true); }} className="px-4 py-2 bg-primary-500 text-white rounded-lg flex items-center gap-2"><Plus className="w-4 h-4" /> Add Book</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-sm">Total</p><p className="text-2xl font-bold text-white">{stats.total}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-sm">Published</p><p className="text-2xl font-bold text-emerald-400">{stats.published}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-sm">Drafts</p><p className="text-2xl font-bold text-amber-400">{stats.draft}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-sm">Value</p><p className="text-2xl font-bold text-purple-400">{formatPrice(stats.revenue)}</p></div>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="flex gap-4"><div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" /></div><select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"><option value="all">All</option><option value="published">Published</option><option value="draft">Draft</option></select><button onClick={loadBooks} className="px-4 py-2 bg-slate-700 rounded-lg"><RefreshCw className="w-4 h-4" /></button></div>
        </div>
        {selectedBooks.size > 0 && <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 mb-6 flex justify-between"><span>{selectedBooks.size} selected</span><button onClick={bulkDelete} className="px-4 py-2 bg-red-600 rounded-lg flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete</button></div>}
        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div> : error ? <div className="text-center py-12 text-red-400">{error}<button onClick={loadBooks} className="ml-2 text-primary-400">Retry</button></div> : books.length === 0 ? <div className="text-center py-12"><BookOpen className="w-16 h-16 text-slate-700 mx-auto mb-4" /><p>No books found</p></div> : (
          <>
            <div className="flex items-center gap-2 mb-3"><button onClick={toggleSelectAll} className="flex items-center gap-2 text-slate-400">{selectedBooks.size === books.length ? <CheckCircle className="w-4 h-4 text-primary-400" /> : <Square className="w-4 h-4" />} Select All ({books.length})</button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {books.map(book => (
                <div key={book.id} className={`bg-slate-900/50 border rounded-xl overflow-hidden ${selectedBooks.has(book.id) ? 'border-primary-500' : 'border-slate-800'}`}>
                  <div className="h-48 bg-slate-800 flex items-center justify-center">{book.cover_image ? <img src={book.cover_image} alt={book.title} className="w-full h-full object-cover" /> : <BookOpen className="w-12 h-12 text-slate-600" />}</div>
                  <div className="p-5">
                    <div className="flex justify-between"><div><h3 className="font-semibold text-white">{book.title}</h3><p className="text-sm text-slate-400">by {book.author}</p></div><button onClick={() => toggleSelectBook(book.id)}>{selectedBooks.has(book.id) ? <CheckCircle className="w-5 h-5 text-primary-400" /> : <Square className="w-5 h-5 text-slate-500" />}</button></div>
                    <p className="text-slate-400 text-sm mt-2 line-clamp-2">{book.description}</p>
                    <div className="mt-3 flex justify-between items-center"><span className="text-xl font-bold text-primary-400">{formatPrice(book.price)}</span><button onClick={() => toggleStatus(book.id, book.status)} className={`text-xs px-2 py-1 rounded-full ${book.status === 'published' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{book.status === 'published' ? <Eye className="w-3 h-3 inline mr-1" /> : <EyeOff className="w-3 h-3 inline mr-1" />}{book.status}</button></div>
                    <div className="flex gap-2 mt-4 pt-3 border-t border-slate-800"><button onClick={() => handleEdit(book)} className="flex-1 py-1.5 bg-slate-700 rounded-lg text-sm flex items-center justify-center gap-1"><Edit className="w-3.5 h-3.5" /> Edit</button><button onClick={() => deleteBook(book.id)} className="flex-1 py-1.5 bg-red-600/20 text-red-400 rounded-lg text-sm flex items-center justify-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Delete</button></div>
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && <div className="flex justify-between mt-6"><span>Page {currentPage} of {totalPages}</span><div className="flex gap-2"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 bg-slate-700 rounded-lg disabled:opacity-50">Prev</button><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 bg-slate-700 rounded-lg disabled:opacity-50">Next</button></div></div>}
          </>
        )}
      </div>
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-xl p-6 max-w-lg w-full">
            <div className="flex justify-between mb-4"><h2 className="text-xl font-bold text-white">{editing ? 'Edit' : 'Add'} Book</h2><button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <input type="text" placeholder="Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
              <input type="text" placeholder="Author" value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
              <textarea placeholder="Description" rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
              <div className="grid grid-cols-2 gap-4"><input type="number" placeholder="Price" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg" /><select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"><option value="draft">Draft</option><option value="published">Published</option></select></div>
              <input type="text" placeholder="Cover Image URL" value={formData.cover_image} onChange={e => { setFormData({...formData, cover_image: e.target.value}); setImagePreview(e.target.value); }} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg" />
              {imagePreview && <img src={imagePreview} alt="Preview" className="w-24 h-32 object-cover rounded-lg" />}
              <div className="flex gap-3 pt-4"><button onClick={saveBook} disabled={saving} className="flex-1 py-2 bg-primary-600 text-white rounded-lg flex items-center justify-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{saving ? 'Saving...' : 'Save'}</button><button onClick={() => setShowForm(false)} className="flex-1 py-2 bg-slate-700 rounded-lg">Cancel</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

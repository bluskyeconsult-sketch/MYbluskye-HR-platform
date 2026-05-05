import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Plus, Edit, Trash2, FileText, Search, RefreshCw, Loader2, AlertCircle, CheckCircle, Eye, EyeOff, X, Square, Globe, Clock, Calendar, Tag, Save } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminArticles() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedArticles, setSelectedArticles] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [stats, setStats] = useState({ total: 0, published: 0, draft: 0, views: 0 });
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const itemsPerPage = 20;
  const categories = ['article', 'news', 'blog', 'update', 'case-study', 'tutorial'];

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
      loadArticles();
      loadStats();
    } catch (err) { window.location.href = '/admin-login'; }
  }

  async function loadStats() {
    try {
      const { data } = await supabase.from('articles').select('status, view_count');
      const total = data?.length || 0;
      const published = data?.filter(a => a.status === 'published').length || 0;
      const draft = data?.filter(a => a.status === 'draft').length || 0;
      const views = data?.reduce((sum, a) => sum + (a.view_count || 0), 0) || 0;
      setStats({ total, published, draft, views });
    } catch (err) { console.error(err); }
  }

  async function loadArticles() {
    try {
      setLoading(true);
      setError(null);
      let query = supabase.from('articles').select('*', { count: 'exact' }).order('created_at', { ascending: false });
      if (selectedCategory !== 'all') query = query.eq('category', selectedCategory);
      if (selectedStatus !== 'all') query = query.eq('status', selectedStatus);
      if (searchTerm) query = query.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%,excerpt.ilike.%${searchTerm}%`);
      const from = (currentPage - 1) * itemsPerPage;
      query = query.range(from, from + itemsPerPage - 1);
      const { data, error, count } = await query;
      if (error) throw error;
      setArticles(data || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
    } catch (err) {
      setError('Failed to load articles');
      toast.error('Failed to load articles');
    } finally { setLoading(false); }
  }

  async function deleteArticle(id) { setShowDeleteConfirm({ id, type: 'single' }); }
  async function confirmDelete() {
    try { await supabase.from('articles').delete().eq('id', showDeleteConfirm.id); toast.success('Article deleted'); await loadArticles(); await loadStats(); }
    catch (err) { toast.error('Failed to delete'); }
    finally { setShowDeleteConfirm(null); }
  }

  async function bulkDelete() { setShowDeleteConfirm({ ids: Array.from(selectedArticles), type: 'bulk', count: selectedArticles.size }); }
  async function confirmBulkDelete() {
    try { await supabase.from('articles').delete().in('id', showDeleteConfirm.ids); toast.success(`Deleted ${showDeleteConfirm.ids.length} articles`); setSelectedArticles(new Set()); await loadArticles(); await loadStats(); }
    catch (err) { toast.error('Failed to delete'); }
    finally { setShowDeleteConfirm(null); }
  }

  async function toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    try { await supabase.from('articles').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id); toast.success(`Article ${newStatus === 'published' ? 'published' : 'unpublished'}`); await loadArticles(); await loadStats(); }
    catch (err) { toast.error('Failed to update status'); }
  }

  function toggleSelectAll() { setSelectedArticles(selectedArticles.size === articles.length ? new Set() : new Set(articles.map(a => a.id))); }
  function toggleSelectArticle(id) { const newSet = new Set(selectedArticles); newSet.has(id) ? newSet.delete(id) : newSet.add(id); setSelectedArticles(newSet); }

  function getStatusBadge(status) {
    return status === 'published' 
      ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-400"><Globe className="w-3 h-3" /> Published</span>
      : <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-amber-500/20 text-amber-400"><EyeOff className="w-3 h-3" /> Draft</span>;
  }

  useEffect(() => { setCurrentPage(1); if (isAuthorized) loadArticles(); }, [searchTerm, selectedCategory, selectedStatus]);

  if (!isAuthorized) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff' } }} />
      <ConfirmModal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} onConfirm={showDeleteConfirm?.type === 'bulk' ? confirmBulkDelete : confirmDelete} title="Confirm Delete" message={showDeleteConfirm?.type === 'bulk' ? `Delete ${showDeleteConfirm.count} articles?` : 'Delete this article?'} />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div><h1 className="text-2xl font-bold text-white flex items-center gap-2"><FileText className="w-6 h-6 text-primary-400" /> Article Management</h1><p className="text-slate-400 text-sm">Manage your content and blog posts</p></div>
          <a href="/admin/articles/new" className="px-4 py-2 bg-primary-500 text-white rounded-lg flex items-center gap-2"><Plus className="w-4 h-4" /> New Article</a>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-sm">Total</p><p className="text-2xl font-bold text-white">{stats.total}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-sm">Published</p><p className="text-2xl font-bold text-emerald-400">{stats.published}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-sm">Drafts</p><p className="text-2xl font-bold text-amber-400">{stats.draft}</p></div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"><p className="text-slate-400 text-sm">Total Views</p><p className="text-2xl font-bold text-blue-400">{stats.views.toLocaleString()}</p></div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Search by title or content..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" /></div>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"><option value="all">All Categories</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"><option value="all">All Status</option><option value="published">Published</option><option value="draft">Draft</option></select>
            <button onClick={loadArticles} className="px-4 py-2 bg-slate-700 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </div>

        {selectedArticles.size > 0 && <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 mb-6 flex justify-between"><span>{selectedArticles.size} selected</span><button onClick={bulkDelete} className="px-4 py-2 bg-red-600 rounded-lg flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete</button></div>}

        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div> : error ? <div className="text-center py-12 text-red-400">{error}<button onClick={loadArticles} className="ml-2 text-primary-400">Retry</button></div> : articles.length === 0 ? <div className="text-center py-12"><FileText className="w-16 h-16 text-slate-700 mx-auto mb-4" /><p>No articles found. Click "New Article" to create one.</p></div> : (
          <>
            <div className="flex items-center gap-2 mb-3"><button onClick={toggleSelectAll} className="flex items-center gap-2 text-slate-400">{selectedArticles.size === articles.length ? <CheckCircle className="w-4 h-4 text-primary-400" /> : <Square className="w-4 h-4" />} Select All ({articles.length})</button></div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800"><tr><th className="px-4 py-3 text-left text-white text-sm w-10"></th><th className="px-4 py-3 text-left text-white text-sm">Title</th><th className="px-4 py-3 text-left text-white text-sm">Category</th><th className="px-4 py-3 text-left text-white text-sm">Status</th><th className="px-4 py-3 text-left text-white text-sm">Views</th><th className="px-4 py-3 text-left text-white text-sm">Likes</th><th className="px-4 py-3 text-left text-white text-sm">Date</th><th className="px-4 py-3 text-left text-white text-sm">Actions</th></tr></thead>
                <tbody>
                  {articles.map(article => (
                    <tr key={article.id} className={`border-t border-slate-800 hover:bg-slate-800/30 ${selectedArticles.has(article.id) ? 'bg-primary-500/5' : ''}`}>
                      <td className="px-4 py-3"><button onClick={() => toggleSelectArticle(article.id)}>{selectedArticles.has(article.id) ? <CheckCircle className="w-4 h-4 text-primary-400" /> : <Square className="w-4 h-4 text-slate-500" />}</button></td>
                      <td className="px-4 py-3"><div><p className="text-white font-medium">{article.title}</p>{article.excerpt && <p className="text-slate-500 text-xs truncate max-w-xs">{article.excerpt.substring(0, 60)}...</p>}</div></td>
                      <td className="px-4 py-3"><span className="text-xs px-2 py-1 bg-primary-500/20 text-primary-400 rounded-full">{article.category}</span></td>
                      <td className="px-4 py-3"><button onClick={() => toggleStatus(article.id, article.status)} className="cursor-pointer">{getStatusBadge(article.status)}</button></td>
                      <td className="px-4 py-3 text-slate-300 text-sm"><Eye className="w-3 h-3 inline mr-1" /> {article.view_count || 0}</td>
                      <td className="px-4 py-3 text-slate-300 text-sm">❤️ {article.likes_count || 0}</td>
                      <td className="px-4 py-3 text-slate-400 text-sm whitespace-nowrap"><Calendar className="w-3 h-3 inline mr-1" /> {new Date(article.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3"><div className="flex gap-2"><a href={`/articles/${article.slug}`} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-slate-800 rounded hover:bg-slate-700"><Eye className="w-3.5 h-3.5 text-slate-300" /></a><a href={`/admin/articles/${article.id}`} className="p-1.5 bg-slate-800 rounded hover:bg-slate-700"><Edit className="w-3.5 h-3.5 text-slate-300" /></a><button onClick={() => deleteArticle(article.id)} className="p-1.5 bg-slate-800 rounded hover:bg-red-500/20"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button></div></td>
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

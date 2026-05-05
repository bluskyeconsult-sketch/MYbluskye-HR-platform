import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { 
  Plus, Edit, Trash2, FileText, Search, RefreshCw, 
  Loader2, AlertCircle, CheckCircle, Eye, EyeOff, 
  X, Square, Globe, Clock, Calendar, Tag, 
  Eye as EyeIcon, ThumbsUp, MessageCircle, Save,
  ChevronLeft, ChevronRight, Download, Filter
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

export default function AdminArticles() {
  const navigate = useNavigate();
  
  // State Management
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
  const [processingIds, setProcessingIds] = useState(new Set());

  // Refs for cleanup
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);

  const itemsPerPage = 15;
  const categories = ['article', 'news', 'blog', 'update', 'case-study', 'tutorial'];

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
        toast.error('Please login to continue');
        navigate('/admin-login');
        return; 
      }
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) throw profileError;
      
      if (profile?.user_type !== 'admin' && profile?.user_type !== 'super_admin') {
        toast.error('Access denied. Admin privileges required.');
        navigate('/dashboard');
        return;
      }
      
      if (isMountedRef.current) {
        setUser(session.user);
        setIsAuthorized(true);
        await Promise.all([loadArticles(), loadStats()]);
      }
    } catch (err) {
      console.error('Auth error:', err);
      toast.error('Authentication failed');
      navigate('/admin-login');
    }
  }

  // ============== DATA LOADING ==============
  async function loadStats() {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('status, view_count');
      
      if (error) throw error;
      
      const total = data?.length || 0;
      const published = data?.filter(a => a.status === 'published').length || 0;
      const draft = data?.filter(a => a.status === 'draft').length || 0;
      const views = data?.reduce((sum, a) => sum + (a.view_count || 0), 0) || 0;
      
      if (isMountedRef.current) {
        setStats({ total, published, draft, views });
      }
    } catch (err) { 
      console.error('Stats error:', err);
    }
  }

  async function loadArticles() {
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
        .from('articles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });
      
      // Apply filters
      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }
      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }
      if (debouncedSearch) {
        const sanitizedSearch = debouncedSearch.replace(/[%_]/g, '\\$&');
        query = query.or(`title.ilike.%${sanitizedSearch}%,content.ilike.%${sanitizedSearch}%,excerpt.ilike.%${sanitizedSearch}%`);
      }
      
      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);
      
      const { data, error, count } = await query.abortSignal(abortControllerRef.current.signal);
      
      if (error) throw error;
      
      if (isMountedRef.current) {
        setArticles(data || []);
        setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Request cancelled');
        return;
      }
      console.error('Load error:', err);
      if (isMountedRef.current) {
        setError('Failed to load articles');
        toast.error('Failed to load articles');
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
  }, [debouncedSearch, selectedCategory, selectedStatus]);

  // Load articles when dependencies change
  useEffect(() => {
    if (isAuthorized) {
      loadArticles();
    }
  }, [isAuthorized, currentPage, debouncedSearch, selectedCategory, selectedStatus]);

  // ============== CRUD OPERATIONS ==============
  async function deleteArticle(id) { 
    setShowDeleteConfirm({ id, type: 'single' }); 
  }
  
  async function confirmDelete() {
    const toastId = toast.loading('Deleting article...');
    
    try { 
      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', showDeleteConfirm.id);
      
      if (error) throw error;
      
      toast.success('Article deleted successfully', { id: toastId });
      
      if (isMountedRef.current) {
        await Promise.all([loadArticles(), loadStats()]);
      }
    } catch (err) { 
      console.error('Delete error:', err);
      toast.error('Failed to delete article', { id: toastId });
    } finally { 
      if (isMountedRef.current) {
        setShowDeleteConfirm(null);
      }
    }
  }

  async function bulkDelete() {
    setShowDeleteConfirm({ 
      ids: Array.from(selectedArticles), 
      type: 'bulk', 
      count: selectedArticles.size 
    });
  }

  async function confirmBulkDelete() {
    const toastId = toast.loading(`Deleting ${showDeleteConfirm.ids.length} articles...`);
    
    try { 
      const { error } = await supabase
        .from('articles')
        .delete()
        .in('id', showDeleteConfirm.ids);
      
      if (error) throw error;
      
      toast.success(`Deleted ${showDeleteConfirm.ids.length} articles`, { id: toastId });
      
      if (isMountedRef.current) {
        setSelectedArticles(new Set());
        await Promise.all([loadArticles(), loadStats()]);
      }
    } catch (err) { 
      console.error('Bulk delete error:', err);
      toast.error('Failed to delete articles', { id: toastId });
    } finally { 
      if (isMountedRef.current) {
        setShowDeleteConfirm(null);
      }
    }
  }

  // Optimistic update for status toggle
  async function toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    const toastId = toast.loading(`Updating status...`);
    
    // Optimistic update
    const previousArticles = [...articles];
    setArticles(articles.map(article => 
      article.id === id ? { ...article, status: newStatus } : article
    ));
    
    try { 
      const { error } = await supabase
        .from('articles')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        })
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success(`Article ${newStatus === 'published' ? 'published' : 'unpublished'}`, { id: toastId });
      await loadStats(); // Update stats in background
    } catch (err) { 
      // Rollback on error
      setArticles(previousArticles);
      console.error('Status update error:', err);
      toast.error('Failed to update status', { id: toastId });
    }
  }

  // ============== UTILITY FUNCTIONS ==============
  function toggleSelectAll() { 
    setSelectedArticles(selectedArticles.size === articles.length 
      ? new Set() 
      : new Set(articles.map(a => a.id))
    ); 
  }
  
  function toggleSelectArticle(id) { 
    const newSet = new Set(selectedArticles); 
    newSet.has(id) ? newSet.delete(id) : newSet.add(id); 
    setSelectedArticles(newSet); 
  }

  // Get unique categories for filter
  const uniqueCategories = useMemo(() => {
    const cats = new Set(articles.map(a => a.category).filter(Boolean));
    return ['all', ...Array.from(cats)];
  }, [articles]);

  const exportToJSON = () => {
    const exportData = articles.map(({ id, title, status, category, view_count, created_at }) => ({
      id, title, status, category, view_count, created_at
    }));
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `articles-export-${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast.success('Articles exported successfully');
  };

  const getStatusBadge = (status) => {
    if (status === 'published') {
      return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-400"><CheckCircle className="w-3 h-3" /> Published</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-amber-500/20 text-amber-400"><Clock className="w-3 h-3" /> Draft</span>;
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
        onConfirm={showDeleteConfirm?.type === 'bulk' ? confirmBulkDelete : confirmDelete}
        title="Confirm Delete"
        message={showDeleteConfirm?.type === 'bulk' 
          ? `Delete ${showDeleteConfirm.count} articles? This action cannot be undone.`
          : 'Delete this article? This action cannot be undone.'}
        confirmText="Delete"
        confirmVariant="danger"
      />

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary-400" />
              Article Management
            </h1>
            <p className="text-slate-400 text-sm mt-1">Create, edit, and manage your content</p>
          </div>
          <Link
            to="/admin/articles/new"
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-all flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            New Article
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Articles</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-primary-400/50" />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Published</p>
                <p className="text-2xl font-bold text-emerald-400">{stats.published}</p>
              </div>
              <Globe className="w-8 h-8 text-emerald-400/50" />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Drafts</p>
                <p className="text-2xl font-bold text-amber-400">{stats.draft}</p>
              </div>
              <EyeOff className="w-8 h-8 text-amber-400/50" />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Views</p>
                <p className="text-2xl font-bold text-purple-400">{stats.views.toLocaleString()}</p>
              </div>
              <EyeIcon className="w-8 h-8 text-purple-400/50" />
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
                placeholder="Search by title, content, or excerpt..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              />
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
            
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
            
            <button
              onClick={() => loadArticles()}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all flex items-center gap-2"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedArticles.size > 0 && (
          <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 mb-6 flex flex-wrap justify-between items-center gap-4 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary-400" />
              <span className="text-white font-medium">{selectedArticles.size} article(s) selected</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={bulkDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-all flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected
              </button>
            </div>
          </div>
        )}

        {/* Articles Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={loadArticles}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-all"
            >
              Try Again
            </button>
          </div>
        ) : articles.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
            <FileText className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Articles Found</h3>
            <p className="text-slate-400 mb-4">
              {searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first article'}
            </p>
            {!searchTerm && selectedCategory === 'all' && selectedStatus === 'all' && (
              <Link
                to="/admin/articles/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-all"
              >
                <Plus className="w-4 h-4" />
                Create First Article
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Select All and Export Row */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
              >
                {selectedArticles.size === articles.length ? (
                  <CheckCircle className="w-4 h-4 text-primary-400" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span className="text-sm">Select All ({articles.length})</span>
              </button>
              
              <button
                onClick={exportToJSON}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                Export JSON
              </button>
            </div>

            {/* Table */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-white text-sm w-10"></th>
                      <th className="px-4 py-3 text-left text-white text-sm">Title</th>
                      <th className="px-4 py-3 text-left text-white text-sm">Category</th>
                      <th className="px-4 py-3 text-left text-white text-sm">Status</th>
                      <th className="px-4 py-3 text-left text-white text-sm">Views</th>
                      <th className="px-4 py-3 text-left text-white text-sm">Likes</th>
                      <th className="px-4 py-3 text-left text-white text-sm">Comments</th>
                      <th className="px-4 py-3 text-left text-white text-sm">Date</th>
                      <th className="px-4 py-3 text-left text-white text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {articles.map((article) => (
                      <tr 
                        key={article.id} 
                        className={`border-t border-slate-800 hover:bg-slate-800/30 transition-colors ${
                          selectedArticles.has(article.id) ? 'bg-primary-500/5' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <button onClick={() => toggleSelectArticle(article.id)}>
                            {selectedArticles.has(article.id) ? (
                              <CheckCircle className="w-4 h-4 text-primary-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-500 hover:text-slate-400" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-white font-medium line-clamp-1 max-w-xs">
                              {article.title}
                            </p>
                            {article.excerpt && (
                              <p className="text-slate-500 text-xs line-clamp-1 max-w-xs mt-1">
                                {article.excerpt}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-500/20 text-primary-400 rounded-full text-xs">
                            <Tag className="w-3 h-3" />
                            {article.category || 'article'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleStatus(article.id, article.status)}
                            className="hover:opacity-80 transition-opacity"
                          >
                            {getStatusBadge(article.status)}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-sm">
                          <div className="flex items-center gap-1">
                            <EyeIcon className="w-3 h-3" />
                            {article.view_count || 0}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-sm">
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3" />
                            {article.likes_count || 0}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-sm">
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            {article.comments_count || 0}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-sm whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(article.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            {article.slug && (
                              <Link
                                to={`/articles/${article.slug}`}
                                target="_blank"
                                className="p-1.5 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors group"
                                title="View"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-300 group-hover:text-white" />
                              </Link>
                            )}
                            <Link
                              to={`/admin/articles/${article.id}`}
                              className="p-1.5 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors group"
                              title="Edit"
                            >
                              <Edit className="w-3.5 h-3.5 text-slate-300 group-hover:text-white" />
                            </Link>
                            <button
                              onClick={() => deleteArticle(article.id)}
                              className="p-1.5 bg-slate-800 rounded-lg hover:bg-red-500/20 transition-colors group"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400 group-hover:text-red-300" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-slate-400">
                  Page {currentPage} of {totalPages} ({articles.length} shown)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { 
  Plus, Edit, Eye, Trash2, CheckCircle, XCircle, 
  Search, Filter, Download, Upload, RefreshCw,
  Calendar, Eye as EyeIcon, Heart, MessageCircle,
  ChevronLeft, ChevronRight, Loader2, AlertCircle,
  Globe, Lock, FileText, Image, Tag, Users
} from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminArticles() {
  const navigate = useNavigate();
  
  // State
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedArticles, setSelectedArticles] = useState(new Set());
  const [notification, setNotification] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [stats, setStats] = useState({ total: 0, published: 0, draft: 0, views: 0 });
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  const itemsPerPage = 10;

  // Check authentication
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/admin-login');
        return;
      }
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', session.user.id)
        .single();
      
      if (profile?.user_type !== 'admin' && profile?.user_type !== 'super_admin') {
        navigate('/dashboard');
        return;
      }
      
      setUser(session.user);
      setIsAuthorized(true);
      loadArticles();
      loadStats();
    } catch (err) {
      console.error('Auth error:', err);
      navigate('/admin-login');
    }
  }

  async function loadStats() {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('status, view_count', { count: 'exact' });
      
      if (error) throw error;
      
      const total = data?.length || 0;
      const published = data?.filter(a => a.status === 'published').length || 0;
      const draft = data?.filter(a => a.status === 'draft').length || 0;
      const views = data?.reduce((sum, a) => sum + (a.view_count || 0), 0) || 0;
      
      setStats({ total, published, draft, views });
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }

  async function loadArticles() {
    try {
      setLoading(true);
      setError(null);
      
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
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%,excerpt.ilike.%${searchTerm}%`);
      }
      
      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      setArticles(data || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      
    } catch (err) {
      console.error('Error loading articles:', err);
      setError('Failed to load articles. Please refresh the page.');
      showNotification('Failed to load articles', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function deleteArticle(id) {
    setShowDeleteConfirm({ id, type: 'single' });
  }

  async function confirmDelete() {
    try {
      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', showDeleteConfirm.id);
      
      if (error) throw error;
      
      showNotification('Article deleted successfully', 'success');
      await loadArticles();
      await loadStats();
      
    } catch (err) {
      console.error('Error deleting article:', err);
      showNotification('Failed to delete article', 'error');
    } finally {
      setShowDeleteConfirm(null);
    }
  }

  async function bulkDelete() {
    setShowDeleteConfirm({ ids: Array.from(selectedArticles), type: 'bulk', count: selectedArticles.size });
  }

  async function confirmBulkDelete() {
    try {
      const { error } = await supabase
        .from('articles')
        .delete()
        .in('id', showDeleteConfirm.ids);
      
      if (error) throw error;
      
      showNotification(`Deleted ${showDeleteConfirm.ids.length} articles`, 'success');
      setSelectedArticles(new Set());
      await loadArticles();
      await loadStats();
      
    } catch (err) {
      console.error('Error deleting articles:', err);
      showNotification('Failed to delete articles', 'error');
    } finally {
      setShowDeleteConfirm(null);
    }
  }

  async function toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    
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
      
      showNotification(`Article ${newStatus === 'published' ? 'published' : 'unpublished'}`, 'success');
      await loadArticles();
      await loadStats();
      
    } catch (err) {
      console.error('Error toggling status:', err);
      showNotification('Failed to update status', 'error');
    }
  }

  function showNotification(message, type = 'success') {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  }

  function toggleSelectAll() {
    if (selectedArticles.size === articles.length) {
      setSelectedArticles(new Set());
    } else {
      setSelectedArticles(new Set(articles.map(a => a.id)));
    }
  }

  function toggleSelectArticle(id) {
    const newSelected = new Set(selectedArticles);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedArticles(newSelected);
  }

  const categories = useMemo(() => {
    const cats = new Set(articles.map(a => a.category).filter(Boolean));
    return ['all', ...Array.from(cats)];
  }, [articles]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
    loadArticles();
  }, [searchTerm, selectedCategory, selectedStatus]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 animate-slide-in-right ${
          notification.type === 'error' ? 'bg-red-600' : 
          notification.type === 'warning' ? 'bg-amber-600' : 'bg-emerald-600'
        } text-white rounded-lg shadow-lg p-4 flex items-center gap-3`}>
          {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
          <p>{notification.message}</p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <h3 className="text-xl font-bold text-white">Confirm Delete</h3>
            </div>
            <p className="text-slate-300 mb-6">
              {showDeleteConfirm.type === 'bulk' 
                ? `Are you sure you want to delete ${showDeleteConfirm.count} articles? This action cannot be undone.`
                : 'Are you sure you want to delete this article? This action cannot be undone.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={showDeleteConfirm.type === 'bulk' ? confirmBulkDelete : confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

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
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Article
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Articles</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-primary-400/50" />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Published</p>
                <p className="text-2xl font-bold text-emerald-400">{stats.published}</p>
              </div>
              <Globe className="w-8 h-8 text-emerald-400/50" />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Drafts</p>
                <p className="text-2xl font-bold text-amber-400">{stats.draft}</p>
              </div>
              <Lock className="w-8 h-8 text-amber-400/50" />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
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
                className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
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
              onClick={loadArticles}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedArticles.size > 0 && (
          <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary-400" />
              <span className="text-white">{selectedArticles.size} article(s) selected</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={bulkDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 flex items-center gap-2"
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
            <p className="text-red-400">{error}</p>
            <button
              onClick={loadArticles}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500"
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
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500"
              >
                <Plus className="w-4 h-4" />
                Create First Article
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Select All Checkbox */}
            <div className="flex items-center gap-2 mb-3 px-2">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
              >
                {selectedArticles.size === articles.length ? (
                  <CheckSquare className="w-4 h-4 text-primary-400" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span className="text-sm">Select All ({articles.length})</span>
              </button>
            </div>

            {/* Table */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800">
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
                      <tr key={article.id} className="border-t border-slate-800 hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <button onClick={() => toggleSelectArticle(article.id)}>
                            {selectedArticles.has(article.id) ? (
                              <CheckSquare className="w-4 h-4 text-primary-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-500" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-white font-medium truncate max-w-xs">
                              {article.title}
                            </p>
                            {article.excerpt && (
                              <p className="text-slate-500 text-xs truncate max-w-xs mt-1">
                                {article.excerpt.substring(0, 60)}...
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-1 bg-primary-500/20 text-primary-400 rounded-full">
                            {article.category || 'article'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleStatus(article.id, article.status)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                              article.status === 'published'
                                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                            }`}
                          >
                            {article.status === 'published' ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            {article.status}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-sm">
                          {article.view_count || 0}
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-sm">
                          {article.likes_count || 0}
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-sm">
                          {article.comments_count || 0}
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-sm whitespace-nowrap">
                          {new Date(article.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Link
                              to={`/articles/${article.slug}`}
                              target="_blank"
                              className="p-1.5 bg-slate-800 rounded hover:bg-slate-700 transition-colors"
                              title="View"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-300" />
                            </Link>
                            <Link
                              to={`/admin/articles/${article.id}`}
                              className="p-1.5 bg-slate-800 rounded hover:bg-slate-700 transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-3.5 h-3.5 text-slate-300" />
                            </Link>
                            <button
                              onClick={() => deleteArticle(article.id)}
                              className="p-1.5 bg-slate-800 rounded hover:bg-red-500/20 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
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
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Export Section */}
        {articles.length > 0 && (
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => {
                const dataStr = JSON.stringify(articles, null, 2);
                const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                const exportFileDefaultName = `articles-export-${new Date().toISOString()}.json`;
                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', exportFileDefaultName);
                linkElement.click();
              }}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export JSON
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

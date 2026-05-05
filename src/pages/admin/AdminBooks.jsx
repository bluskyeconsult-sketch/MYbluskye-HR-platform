import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Plus, Edit, Trash2, BookOpen, Search, Filter, 
  CheckCircle, XCircle, Eye, EyeOff, Download, 
  Upload, RefreshCw, Loader2, AlertCircle, 
  Calendar, DollarSign, User, Image, Tag, Globe,
  Star, TrendingUp, Clock, Save, X
} from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminBooks() {
  // State
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
  const [notification, setNotification] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [stats, setStats] = useState({ total: 0, published: 0, draft: 0, revenue: 0 });
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    description: '',
    price: 0,
    cover_image: '',
    status: 'draft',
    isbn: '',
    publication_date: '',
    category: 'business',
    pages: 0,
    language: 'English',
    featured: false
  });

  const itemsPerPage = 12;

  // Categories for books
  const categories = [
    'business', 'technology', 'hr-management', 'leadership', 
    'career-development', 'psychology', 'marketing', 'finance'
  ];

  // Languages
  const languages = ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese'];

  // Check authentication
  useEffect(() => {
    checkAuth();
  }, []);

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
        window.location.href = '/dashboard';
        return;
      }
      
      setUser(session.user);
      setIsAuthorized(true);
      loadBooks();
      loadStats();
    } catch (err) {
      console.error('Auth error:', err);
      window.location.href = '/admin-login';
    }
  }

  async function loadStats() {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('status, price', { count: 'exact' });
      
      if (error) throw error;
      
      const total = data?.length || 0;
      const published = data?.filter(b => b.status === 'published').length || 0;
      const draft = data?.filter(b => b.status === 'draft').length || 0;
      const revenue = data?.reduce((sum, b) => b.status === 'published' ? sum + (b.price || 0) : sum, 0) || 0;
      
      setStats({ total, published, draft, revenue });
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }

  async function loadBooks() {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('books')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });
      
      // Apply filters
      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,author.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }
      
      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      setBooks(data || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      
    } catch (err) {
      console.error('Error loading books:', err);
      setError('Failed to load books. Please refresh the page.');
      showNotification('Failed to load books', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function saveBook() {
    // Validation
    if (!formData.title.trim()) {
      showNotification('Book title is required', 'error');
      return;
    }
    if (!formData.author.trim()) {
      showNotification('Author name is required', 'error');
      return;
    }
    if (formData.price < 0) {
      showNotification('Price cannot be negative', 'error');
      return;
    }
    
    try {
      const bookData = {
        ...formData,
        updated_at: new Date().toISOString(),
        updated_by: user?.id
      };
      
      if (editing) {
        const { error } = await supabase
          .from('books')
          .update(bookData)
          .eq('id', editing);
        
        if (error) throw error;
        showNotification('Book updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('books')
          .insert({
            ...bookData,
            created_at: new Date().toISOString(),
            created_by: user?.id
          });
        
        if (error) throw error;
        showNotification('Book created successfully', 'success');
      }
      
      setShowForm(false);
      setEditing(null);
      resetForm();
      await loadBooks();
      await loadStats();
      
    } catch (err) {
      console.error('Error saving book:', err);
      showNotification('Failed to save book', 'error');
    }
  }

  async function deleteBook(id) {
    setShowDeleteConfirm({ id, type: 'single' });
  }

  async function confirmDelete() {
    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', showDeleteConfirm.id);
      
      if (error) throw error;
      
      showNotification('Book deleted successfully', 'success');
      await loadBooks();
      await loadStats();
      
    } catch (err) {
      console.error('Error deleting book:', err);
      showNotification('Failed to delete book', 'error');
    } finally {
      setShowDeleteConfirm(null);
    }
  }

  async function bulkDelete() {
    setShowDeleteConfirm({ ids: Array.from(selectedBooks), type: 'bulk', count: selectedBooks.size });
  }

  async function confirmBulkDelete() {
    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .in('id', showDeleteConfirm.ids);
      
      if (error) throw error;
      
      showNotification(`Deleted ${showDeleteConfirm.ids.length} books`, 'success');
      setSelectedBooks(new Set());
      await loadBooks();
      await loadStats();
      
    } catch (err) {
      console.error('Error deleting books:', err);
      showNotification('Failed to delete books', 'error');
    } finally {
      setShowDeleteConfirm(null);
    }
  }

  async function toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    
    try {
      const { error } = await supabase
        .from('books')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        })
        .eq('id', id);
      
      if (error) throw error;
      
      showNotification(`Book ${newStatus === 'published' ? 'published' : 'unpublished'}`, 'success');
      await loadBooks();
      await loadStats();
      
    } catch (err) {
      console.error('Error toggling status:', err);
      showNotification('Failed to update status', 'error');
    }
  }

  function resetForm() {
    setFormData({
      title: '',
      author: '',
      description: '',
      price: 0,
      cover_image: '',
      status: 'draft',
      isbn: '',
      publication_date: '',
      category: 'business',
      pages: 0,
      language: 'English',
      featured: false
    });
    setImagePreview('');
  }

  function handleEdit(book) {
    setEditing(book.id);
    setFormData(book);
    setImagePreview(book.cover_image);
    setShowForm(true);
  }

  function showNotification(message, type = 'success') {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  }

  function toggleSelectAll() {
    if (selectedBooks.size === books.length) {
      setSelectedBooks(new Set());
    } else {
      setSelectedBooks(new Set(books.map(b => b.id)));
    }
  }

  function toggleSelectBook(id) {
    const newSelected = new Set(selectedBooks);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedBooks(newSelected);
  }

  function handleImageUrlChange(url) {
    setFormData({...formData, cover_image: url});
    setImagePreview(url);
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(price);
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
    if (isAuthorized) {
      loadBooks();
    }
  }, [searchTerm, selectedStatus]);

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
        } text-white rounded-lg shadow-lg p-4 flex items-center gap-3 max-w-md`}>
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
                ? `Are you sure you want to delete ${showDeleteConfirm.count} books? This action cannot be undone.`
                : 'Are you sure you want to delete this book? This action cannot be undone.'}
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
              <BookOpen className="w-6 h-6 text-primary-400" />
              Book Management
            </h1>
            <p className="text-slate-400 text-sm mt-1">Manage your book catalog and inventory</p>
          </div>
          <button
            onClick={() => { resetForm(); setEditing(null); setShowForm(true); }}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Book
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Books</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <BookOpen className="w-8 h-8 text-primary-400/50" />
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
              <Clock className="w-8 h-8 text-amber-400/50" />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Value</p>
                <p className="text-2xl font-bold text-purple-400">{formatPrice(stats.revenue)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-400/50" />
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
                placeholder="Search by title, author, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            
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
              onClick={() => { loadBooks(); }}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedBooks.size > 0 && (
          <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary-400" />
              <span className="text-white">{selectedBooks.size} book(s) selected</span>
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

        {/* Book Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">
                  {editing ? 'Edit Book' : 'Add New Book'}
                </h2>
                <button onClick={() => { setShowForm(false); resetForm(); }} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Title *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Author *</label>
                    <input
                      type="text"
                      value={formData.author}
                      onChange={e => setFormData({...formData, author: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Pages</label>
                    <input
                      type="number"
                      value={formData.pages}
                      onChange={e => setFormData({...formData, pages: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">ISBN</label>
                    <input
                      type="text"
                      value={formData.isbn}
                      onChange={e => setFormData({...formData, isbn: e.target.value})}
                      placeholder="978-0-123456-7"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Publication Date</label>
                    <input
                      type="date"
                      value={formData.publication_date}
                      onChange={e => setFormData({...formData, publication_date: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>
                          {cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Language</label>
                    <select
                      value={formData.language}
                      onChange={e => setFormData({...formData, language: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                      {languages.map(lang => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Cover Image URL</label>
                  <input
                    type="text"
                    value={formData.cover_image}
                    onChange={e => handleImageUrlChange(e.target.value)}
                    placeholder="https://example.com/cover.jpg"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                  {imagePreview && (
                    <div className="mt-2">
                      <p className="text-xs text-slate-500 mb-1">Preview:</p>
                      <img src={imagePreview} alt="Cover preview" className="w-24 h-32 object-cover rounded-lg" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                  <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2 text-slate-300">
                      <input
                        type="checkbox"
                        checked={formData.featured}
                        onChange={e => setFormData({...formData, featured: e.target.checked})}
                        className="rounded bg-slate-800 border-slate-700 text-primary-500"
                      />
                      Featured Book
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={saveBook}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Book
                  </button>
                  <button
                    onClick={() => { setShowForm(false); resetForm(); }}
                    className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Books Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400">{error}</p>
            <button
              onClick={loadBooks}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500"
            >
              Try Again
            </button>
          </div>
        ) : books.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
            <BookOpen className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Books Found</h3>
            <p className="text-slate-400 mb-4">
              {searchTerm || selectedStatus !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first book'}
            </p>
            {!searchTerm && selectedStatus === 'all' && (
              <button
                onClick={() => { resetForm(); setEditing(null); setShowForm(true); }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500"
              >
                <Plus className="w-4 h-4" />
                Add Your First Book
              </button>
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
                {selectedBooks.size === books.length ? (
                  <CheckCircle className="w-4 h-4 text-primary-400" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span className="text-sm">Select All ({books.length})</span>
              </button>
            </div>

            {/* Books Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {books.map(book => (
                <div
                  key={book.id}
                  className={`bg-slate-900/50 border rounded-xl overflow-hidden transition-all ${
                    selectedBooks.has(book.id)
                      ? 'border-primary-500 bg-primary-500/5'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="relative">
                    {book.cover_image ? (
                      <img
                        src={book.cover_image}
                        alt={book.title}
                        className="w-full h-48 object-cover"
                        onError={(e) => { e.target.src = '/placeholder-book.jpg'; }}
                      />
                    ) : (
                      <div className="w-full h-48 bg-slate-800 flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-slate-600" />
                      </div>
                    )}
                    {book.featured && (
                      <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full">
                        Featured
                      </div>
                    )}
                  </div>
                  
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white">{book.title}</h3>
                        <p className="text-sm text-slate-400">by {book.author}</p>
                      </div>
                      <button onClick={() => toggleSelectBook(book.id)} className="mt-1">
                        {selectedBooks.has(book.id) ? (
                          <CheckCircle className="w-5 h-5 text-primary-400" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-500" />
                        )}
                      </button>
                    </div>
                    
                    <p className="text-slate-400 text-sm mt-2 line-clamp-2">{book.description}</p>
                    
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-xs px-2 py-1 bg-slate-800 text-slate-400 rounded-full">
                        {book.category}
                      </span>
                      {book.pages > 0 && (
                        <span className="text-xs px-2 py-1 bg-slate-800 text-slate-400 rounded-full">
                          {book.pages} pages
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-3 flex justify-between items-center">
                      <div>
                        <span className="text-2xl font-bold text-primary-400">
                          {formatPrice(book.price)}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleStatus(book.id, book.status)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                          book.status === 'published'
                            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                        }`}
                      >
                        {book.status === 'published' ? (
                          <Eye className="w-3 h-3" />
                        ) : (
                          <EyeOff className="w-3 h-3" />
                        )}
                        {book.status}
                      </button>
                    </div>
                    
                    <div className="flex gap-2 mt-4 pt-3 border-t border-slate-800">
                      <button
                        onClick={() => handleEdit(book)}
                        className="flex-1 px-3 py-1.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-1 text-sm"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => deleteBook(book.id)}
                        className="flex-1 px-3 py-1.5 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors flex items-center justify-center gap-1 text-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
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
                    className="px-3 py-1 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button

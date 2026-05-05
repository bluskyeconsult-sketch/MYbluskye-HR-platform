import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Plus, Edit, Trash2, Bot, Search, Filter,
  CheckCircle, XCircle, Eye, EyeOff, Download,
  RefreshCw, Loader2, AlertCircle, Clock, DollarSign,
  Zap, Star, TrendingUp, Users, MessageSquare,
  Code, Globe, Award, Shield, Save, X, Upload
} from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminVirtualAssistants() {
  // State
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
  const [notification, setNotification] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, tasksCompleted: 0, avgRating: 0 });
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [capabilities, setCapabilities] = useState([]);
  const [newCapability, setNewCapability] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    specialty: '',
    category: 'career',
    description: '',
    price: 9.99,
    delivery_minutes: 30,
    qa_score: 95,
    is_active: true,
    avatar_url: '',
    capabilities: [],
    tasks_completed: 0,
    rating: 0,
    language: 'English',
    availability: '24/7',
    response_time: '< 1 hour',
    integrations: [],
    featured: false
  });

  const itemsPerPage = 12;

  // Categories
  const categories = [
    'career', 'resume', 'writing', 'coding', 'design', 
    'marketing', 'sales', 'customer-support', 'data-analysis', 'research'
  ];

  // Languages
  const languages = ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Arabic'];

  // Availability options
  const availabilityOptions = ['24/7', 'Business Hours', 'Custom Schedule'];

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
      loadVAs();
      loadStats();
    } catch (err) {
      console.error('Auth error:', err);
      window.location.href = '/admin-login';
    }
  }

  async function loadStats() {
    try {
      const { data, error } = await supabase
        .from('virtual_assistants')
        .select('is_active, tasks_completed, rating', { count: 'exact' });
      
      if (error) throw error;
      
      const total = data?.length || 0;
      const active = data?.filter(va => va.is_active === true).length || 0;
      const inactive = data?.filter(va => va.is_active === false).length || 0;
      const tasksCompleted = data?.reduce((sum, va) => sum + (va.tasks_completed || 0), 0) || 0;
      const avgRating = data?.reduce((sum, va) => sum + (va.rating || 0), 0) / (data.length || 1);
      
      setStats({ total, active, inactive, tasksCompleted, avgRating: avgRating.toFixed(1) });
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }

  async function loadVAs() {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('virtual_assistants')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });
      
      // Apply filters
      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }
      if (selectedStatus !== 'all') {
        query = query.eq('is_active', selectedStatus === 'active');
      }
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,specialty.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }
      
      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      setVAs(data || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      
    } catch (err) {
      console.error('Error loading VAs:', err);
      setError('Failed to load Virtual Assistants. Please refresh the page.');
      showNotification('Failed to load Virtual Assistants', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function saveVA() {
    // Validation
    if (!formData.name.trim()) {
      showNotification('VA name is required', 'error');
      return;
    }
    if (!formData.specialty.trim()) {
      showNotification('Specialty is required', 'error');
      return;
    }
    if (formData.price < 0) {
      showNotification('Price cannot be negative', 'error');
      return;
    }
    
    try {
      const vaData = {
        ...formData,
        capabilities: capabilities,
        price: parseFloat(formData.price),
        delivery_minutes: parseInt(formData.delivery_minutes),
        qa_score: parseInt(formData.qa_score),
        updated_at: new Date().toISOString(),
        updated_by: user?.id
      };
      
      if (editing) {
        const { error } = await supabase
          .from('virtual_assistants')
          .update(vaData)
          .eq('id', editing);
        
        if (error) throw error;
        showNotification('Virtual Assistant updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('virtual_assistants')
          .insert({
            ...vaData,
            created_at: new Date().toISOString(),
            created_by: user?.id,
            tasks_completed: 0,
            rating: 0
          });
        
        if (error) throw error;
        showNotification('Virtual Assistant created successfully', 'success');
      }
      
      setShowForm(false);
      setEditing(null);
      resetForm();
      await loadVAs();
      await loadStats();
      
    } catch (err) {
      console.error('Error saving VA:', err);
      showNotification('Failed to save Virtual Assistant', 'error');
    }
  }

  async function deleteVA(id) {
    setShowDeleteConfirm({ id, type: 'single' });
  }

  async function confirmDelete() {
    try {
      const { error } = await supabase
        .from('virtual_assistants')
        .delete()
        .eq('id', showDeleteConfirm.id);
      
      if (error) throw error;
      
      showNotification('Virtual Assistant deleted successfully', 'success');
      await loadVAs();
      await loadStats();
      
    } catch (err) {
      console.error('Error deleting VA:', err);
      showNotification('Failed to delete Virtual Assistant', 'error');
    } finally {
      setShowDeleteConfirm(null);
    }
  }

  async function bulkDelete() {
    setShowDeleteConfirm({ ids: Array.from(selectedVAs), type: 'bulk', count: selectedVAs.size });
  }

  async function confirmBulkDelete() {
    try {
      const { error } = await supabase
        .from('virtual_assistants')
        .delete()
        .in('id', showDeleteConfirm.ids);
      
      if (error) throw error;
      
      showNotification(`Deleted ${showDeleteConfirm.ids.length} Virtual Assistants`, 'success');
      setSelectedVAs(new Set());
      await loadVAs();
      await loadStats();
      
    } catch (err) {
      console.error('Error deleting VAs:', err);
      showNotification('Failed to delete Virtual Assistants', 'error');
    } finally {
      setShowDeleteConfirm(null);
    }
  }

  async function toggleStatus(id, currentStatus) {
    try {
      const { error } = await supabase
        .from('virtual_assistants')
        .update({ 
          is_active: !currentStatus,
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        })
        .eq('id', id);
      
      if (error) throw error;
      
      showNotification(`VA ${!currentStatus ? 'activated' : 'deactivated'}`, 'success');
      await loadVAs();
      await loadStats();
      
    } catch (err) {
      console.error('Error toggling status:', err);
      showNotification('Failed to update status', 'error');
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      specialty: '',
      category: 'career',
      description: '',
      price: 9.99,
      delivery_minutes: 30,
      qa_score: 95,
      is_active: true,
      avatar_url: '',
      capabilities: [],
      tasks_completed: 0,
      rating: 0,
      language: 'English',
      availability: '24/7',
      response_time: '< 1 hour',
      integrations: [],
      featured: false
    });
    setCapabilities([]);
    setAvatarPreview('');
  }

  function handleEdit(va) {
    setEditing(va.id);
    setFormData(va);
    setCapabilities(va.capabilities || []);
    setAvatarPreview(va.avatar_url);
    setShowForm(true);
  }

  function addCapability() {
    if (newCapability.trim() && !capabilities.includes(newCapability.trim())) {
      setCapabilities([...capabilities, newCapability.trim()]);
      setNewCapability('');
    }
  }

  function removeCapability(capability) {
    setCapabilities(capabilities.filter(c => c !== capability));
  }

  function showNotification(message, type = 'success') {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  }

  function toggleSelectAll() {
    if (selectedVAs.size === vas.length) {
      setSelectedVAs(new Set());
    } else {
      setSelectedVAs(new Set(vas.map(va => va.id)));
    }
  }

  function toggleSelectVA(id) {
    const newSelected = new Set(selectedVAs);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedVAs(newSelected);
  }

  function handleAvatarUrlChange(url) {
    setFormData({...formData, avatar_url: url});
    setAvatarPreview(url);
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(price);
  };

  const getCategoryColor = (category) => {
    const colors = {
      career: 'text-emerald-400 bg-emerald-500/10',
      resume: 'text-blue-400 bg-blue-500/10',
      writing: 'text-purple-400 bg-purple-500/10',
      coding: 'text-amber-400 bg-amber-500/10',
      design: 'text-pink-400 bg-pink-500/10',
      marketing: 'text-indigo-400 bg-indigo-500/10'
    };
    return colors[category] || 'text-slate-400 bg-slate-500/10';
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
    if (isAuthorized) {
      loadVAs();
    }
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
                ? `Are you sure you want to delete ${showDeleteConfirm.count} Virtual Assistants? This action cannot be undone.`
                : 'Are you sure you want to delete this Virtual Assistant? This action cannot be undone.'}
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
              <Bot className="w-6 h-6 text-primary-400" />
              Virtual Assistant Management
            </h1>
            <p className="text-slate-400 text-sm mt-1">Manage your AI-powered workforce and track performance</p>
          </div>
          <button
            onClick={() => { resetForm(); setEditing(null); setShowForm(true); }}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Virtual Assistant
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total VAs</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <Bot className="w-8 h-8 text-primary-400/50" />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Active</p>
                <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
              </div>
              <Zap className="w-8 h-8 text-emerald-400/50" />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Tasks Completed</p>
                <p className="text-2xl font-bold text-blue-400">{stats.tasksCompleted.toLocaleString()}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-400/50" />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Avg Rating</p>
                <p className="text-2xl font-bold text-amber-400">{stats.avgRating}</p>
              </div>
              <Star className="w-8 h-8 text-amber-400/50" />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">QA Score</p>
                <p className="text-2xl font-bold text-purple-400">95%</p>
              </div>
              <Award className="w-8 h-8 text-purple-400/50" />
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
                placeholder="Search by name, specialty, or description..."
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
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </option>
              ))}
            </select>
            
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            
            <button
              onClick={() => { loadVAs(); }}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedVAs.size > 0 && (
          <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary-400" />
              <span className="text-white">{selectedVAs.size} VA(s) selected</span>
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

        {/* VA Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">
                  {editing ? 'Edit Virtual Assistant' : 'Create New Virtual Assistant'}
                </h2>
                <button onClick={() => { setShowForm(false); resetForm(); }} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      placeholder="e.g., Career Coach AI"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Specialty *</label>
                    <input
                      type="text"
                      value={formData.specialty}
                      onChange={e => setFormData({...formData, specialty: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      placeholder="e.g., Resume Optimization"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    placeholder="Detailed description of what this VA does..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Availability</label>
                    <select
                      value={formData.availability}
                      onChange={e => setFormData({...formData, availability: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                      {availabilityOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Delivery (minutes)</label>
                    <input
                      type="number"
                      value={formData.delivery_minutes}
                      onChange={e => setFormData({...formData, delivery_minutes: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">QA Score (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.qa_score}
                      onChange={e => setFormData({...formData, qa_score: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Avatar URL</label>
                  <input
                    type="text"
                    value={formData.avatar_url}
                    onChange={e => handleAvatarUrlChange(e.target.value)}
                    placeholder="https://example.com/avatar.png"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                  {avatarPreview && (
                    <div className="mt-2">
                      <p className="text-xs text-slate-500 mb-1">Preview:</p>
                      <img src={avatarPreview} alt="Avatar preview" className="w-16 h-16 rounded-full object-cover" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Capabilities</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newCapability}
                      onChange={e => setNewCapability(e.target.value)}
                      placeholder="Add capability (e.g., Resume Review)"
                      className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      onKeyPress={(e) => e.key === 'Enter' && addCapability()}
                    />
                    <button
                      onClick={addCapability}
                      className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {capabilities.map((cap, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-800 text-slate-300 rounded-lg text-sm">
                        {cap}
                        <button onClick={() => removeCapability(cap)} className="hover:text-red-400">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 text-slate-300">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={e => setFormData({...formData, is_active: e.target.checked})}
                      className="rounded bg-slate-800 border-slate-700 text-primary-500"
                    />
                    Active (available for hire)
                  </label>
                  <label className="flex items-center gap-2 text-slate-300">
                    <input
                      type="checkbox"
                      checked={formData.featured}
                      onChange={e => setFormData({...formData, featured: e.target.checked})}
                      className="rounded bg-slate-800 border-slate-700 text-primary-500"
                    />
                    Featured VA
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={saveVA}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Virtual Assistant
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

        {/* VAs Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400">{error}</p>
            <button
              onClick={loadVAs}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500"
            >
              Try Again
            </button>
          </div>
        ) : vas.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
            <Bot className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Virtual Assistants Found</h3>
            <p className="text-slate-400 mb-4">
              {searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first Virtual Assistant'}
            </p>
            {!searchTerm && selectedCategory === 'all' && selectedStatus === 'all' && (
              <button
                onClick={() => { resetForm(); setEditing(null); setShowForm(true); }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500"
              >
                <Plus className="w-4 h-4" />
                Create First Virtual Assistant
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
                {selectedVAs.size === vas.length ? (
                  <CheckCircle className="w-4 h-4 text-primary-400" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span className="text

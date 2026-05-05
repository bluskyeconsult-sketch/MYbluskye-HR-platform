import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Plus, Edit, Trash2, Bot, Search, RefreshCw, 
  Loader2, AlertCircle, CheckCircle, Eye, EyeOff, 
  X, Square, Zap, Star, TrendingUp, Users, 
  Clock, DollarSign, Save, Award, Shield, MessageSquare
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============== CUSTOM HOOK ==============
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function AdminVirtualAssistants() {
  // State Management
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
  const [capabilities, setCapabilities] = useState([]);
  const [newCapability, setNewCapability] = useState('');

  // Refs for request cancellation
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);

  // Form Data
  const [formData, setFormData] = useState({
    name: '',
    specialty: '',
    category: 'career',
    description: '',
    price: 9.99,
    delivery_minutes: 30,
    qa_score: 95,
    is_active: true
  });

  // Constants
  const itemsPerPage = 12;
  const categories = ['career', 'resume', 'writing', 'coding', 'design', 'marketing', 'sales', 'research'];
  
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
        window.location.href = '/admin-login'; 
        return; 
      }
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', session.user.id)
        .single();
      
      if (profile?.user_type !== 'admin' && profile?.user_type !== 'super_admin') {
        toast.error('Access denied. Admin privileges required.');
        window.location.href = '/dashboard';
        return;
      }
      
      if (isMountedRef.current) {
        setUser(session.user);
        setIsAuthorized(true);
        await Promise.all([loadVAs(), loadStats()]);
      }
    } catch (err) {
      console.error('Auth error:', err);
      window.location.href = '/admin-login';
    }
  }

  // ============== DATA LOADING ==============
  async function loadStats() {
    try {
      const { data, error } = await supabase
        .from('virtual_assistants')
        .select('is_active, tasks_completed');
      
      if (error) throw error;
      
      const total = data?.length || 0;
      const active = data?.filter(va => va.is_active === true).length || 0;
      const inactive = data?.filter(va => va.is_active === false).length || 0;
      const tasksCompleted = data?.reduce((sum, va) => sum + (va.tasks_completed || 0), 0) || 0;
      
      if (isMountedRef.current) {
        setStats({ total, active, inactive, tasksCompleted });
      }
    } catch (err) { 
      console.error('Stats error:', err);
    }
  }

  async function loadVAs() {
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
      if (debouncedSearch) {
        const sanitizedSearch = debouncedSearch.replace(/[%_]/g, '\\$&');
        query = query.or(`name.ilike.%${sanitizedSearch}%,specialty.ilike.%${sanitizedSearch}%,description.ilike.%${sanitizedSearch}%`);
      }
      
      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage;
      query = query.range(from, from + itemsPerPage - 1);
      
      const { data, error, count } = await query.abortSignal(abortControllerRef.current.signal);
      
      if (error) throw error;
      
      if (isMountedRef.current) {
        setVAs(data || []);
        setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Request cancelled');
        return;
      }
      console.error('Load error:', err);
      if (isMountedRef.current) {
        setError('Failed to load Virtual Assistants');
        toast.error('Failed to load Virtual Assistants');
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

  // Load VAs when dependencies change
  useEffect(() => {
    if (isAuthorized) {
      loadVAs();
    }
  }, [isAuthorized, currentPage, debouncedSearch, selectedCategory, selectedStatus]);

  // ============== CRUD OPERATIONS ==============
  async function saveVA() {
    // Validation
    if (!formData.name.trim()) { 
      toast.error('Name is required'); 
      return; 
    }
    if (!formData.specialty.trim()) { 
      toast.error('Specialty is required'); 
      return; 
    }
    if (formData.price < 0) { 
      toast.error('Price cannot be negative'); 
      return; 
    }
    if (formData.delivery_minutes < 1) { 
      toast.error('Delivery time must be at least 1 minute'); 
      return; 
    }
    if (formData.qa_score < 0 || formData.qa_score > 100) { 
      toast.error('QA score must be between 0 and 100'); 
      return; 
    }
    
    setSaving(true);
    const toastId = toast.loading(editing ? 'Updating...' : 'Creating...');
    
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
        toast.success('Virtual Assistant updated successfully', { id: toastId });
      } else {
        const { error } = await supabase
          .from('virtual_assistants')
          .insert([{
            ...vaData,
            created_at: new Date().toISOString(),
            created_by: user?.id,
            tasks_completed: 0,
            rating: 0
          }]);
        
        if (error) throw error;
        toast.success('Virtual Assistant created successfully', { id: toastId });
      }
      
      if (isMountedRef.current) {
        setShowForm(false);
        setEditing(null);
        resetForm();
        await Promise.all([loadVAs(), loadStats()]);
      }
    } catch (err) { 
      console.error('Save error:', err);
      toast.error('Failed to save Virtual Assistant', { id: toastId });
    } finally { 
      if (isMountedRef.current) {
        setSaving(false);
      }
    }
  }

  async function deleteVA(id) { 
    setShowDeleteConfirm({ id, type: 'single' }); 
  }
  
  async function confirmDelete() {
    const toastId = toast.loading('Deleting...');
    
    try { 
      const { error } = await supabase
        .from('virtual_assistants')
        .delete()
        .eq('id', showDeleteConfirm.id);
      
      if (error) throw error;
      
      toast.success('Virtual Assistant deleted successfully', { id: toastId });
      
      if (isMountedRef.current) {
        await Promise.all([loadVAs(), loadStats()]);
      }
    } catch (err) { 
      console.error('Delete error:', err);
      toast.error('Failed to delete Virtual Assistant', { id: toastId });
    } finally { 
      if (isMountedRef.current) {
        setShowDeleteConfirm(null);
      }
    }
  }

  async function bulkDelete() { 
    setShowDeleteConfirm({ 
      ids: Array.from(selectedVAs), 
      type: 'bulk', 
      count: selectedVAs.size 
    }); 
  }

  async function confirmBulkDelete() {
    const toastId = toast.loading(`Deleting ${showDeleteConfirm.ids.length} VAs...`);
    
    try { 
      const { error } = await supabase
        .from('virtual_assistants')
        .delete()
        .in('id', showDeleteConfirm.ids);
      
      if (error) throw error;
      
      toast.success(`Deleted ${showDeleteConfirm.ids.length} Virtual Assistants`, { id: toastId });
      
      if (isMountedRef.current) {
        setSelectedVAs(new Set());
        await Promise.all([loadVAs(), loadStats()]);
      }
    } catch (err) { 
      console.error('Bulk delete error:', err);
      toast.error('Failed to delete Virtual Assistants', { id: toastId });
    } finally { 
      if (isMountedRef.current) {
        setShowDeleteConfirm(null);
      }
    }
  }

  // Optimistic update for status toggle
  async function toggleStatus(id, currentStatus) {
    const toastId = toast.loading('Updating status...');
    
    // Optimistic update
    const previousVAs = [...vas];
    setVAs(vas.map(va => 
      va.id === id ? { ...va, is_active: !currentStatus } : va
    ));
    
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
      
      toast.success(`VA ${!currentStatus ? 'activated' : 'deactivated'}`, { id: toastId });
      await loadStats(); // Update stats in background
    } catch (err) { 
      // Rollback on error
      setVAs(previousVAs);
      console.error('Status update error:', err);
      toast.error('Failed to update status', { id: toastId });
    }
  }

  // ============== UTILITY FUNCTIONS ==============
  function addCapability() {
    if (newCapability.trim() && !capabilities.includes(newCapability.trim())) {
      setCapabilities([...capabilities, newCapability.trim()]);
      setNewCapability('');
    }
  }

  function removeCapability(capability) {
    setCapabilities(capabilities.filter(c => c !== capability));
  }

  function resetForm() {
    setFormData({
      name: '', specialty: '', category: 'career', description: '',
      price: 9.99, delivery_minutes: 30, qa_score: 95, is_active: true
    });
    setCapabilities([]);
    setNewCapability('');
  }

  function handleEdit(va) {
    setEditing(va.id);
    setFormData(va);
    setCapabilities(va.capabilities || []);
    setShowForm(true);
  }

  function toggleSelectAll() { 
    setSelectedVAs(selectedVAs.size === vas.length 
      ? new Set() 
      : new Set(vas.map(v => v.id))
    ); 
  }
  
  function toggleSelectVA(id) { 
    const newSet = new Set(selectedVAs); 
    newSet.has(id) ? newSet.delete(id) : newSet.add(id); 
    setSelectedVAs(newSet); 
  }

  const formatPrice = (price) => new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD' 
  }).format(price);

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
          ? `Delete ${showDeleteConfirm.count} Virtual Assistants? This cannot be undone.`
          : 'Delete this Virtual Assistant? This cannot be undone.'}
        confirmText="Delete"
        confirmVariant="danger"
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Bot className="w-6 h-6 text-primary-400" /> 
              Virtual Assistant Management
            </h1>
            <p className="text-slate-400 text-sm">Manage your AI-powered workforce</p>
          </div>
          <button 
            onClick={() => { resetForm(); setEditing(null); setShowForm(true); }} 
            className="px-4 py-2 bg-primary-500 text-white rounded-lg flex items-center gap-2 hover:bg-primary-600 transition-all shadow-lg"
          >
            <Plus className="w-4 h-4" /> Add Virtual Assistant
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total VAs</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <Bot className="w-8 h-8 text-primary-400/50" />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Active</p>
                <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
              </div>
              <Zap className="w-8 h-8 text-emerald-400/50" />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Tasks Completed</p>
                <p className="text-2xl font-bold text-blue-400">{stats.tasksCompleted.toLocaleString()}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-400/50" />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Avg Rating</p>
                <p className="text-2xl font-bold text-amber-400">4.8</p>
              </div>
              <Star className="w-8 h-8 text-amber-400/50" />
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by name, specialty, or description..." 
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
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
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
              onClick={() => loadVAs()} 
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all flex items-center gap-2"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedVAs.size > 0 && (
          <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 mb-6 flex justify-between items-center animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary-400" />
              <span className="text-white font-medium">{selectedVAs.size} VA(s) selected</span>
            </div>
            <button 
              onClick={bulkDelete} 
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-all flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Delete Selected
            </button>
          </div>
        )}

        {/* VAs Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400">{error}</p>
            <button 
              onClick={loadVAs} 
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-all"
            >
              Try Again
            </button>
          </div>
        ) : vas.length === 0 ? (
          <div className="text-center py-12">
            <Bot className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400">
              {searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all'
                ? 'No Virtual Assistants match your search criteria'
                : 'No Virtual Assistants found. Click "Add Virtual Assistant" to get started.'}
            </p>
            {!searchTerm && selectedCategory === 'all' && selectedStatus === 'all' && (
              <button 
                onClick={() => { resetForm(); setEditing(null); setShowForm(true); }} 
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create First VA
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Select All Checkbox */}
            <div className="flex items-center gap-2 mb-3">
              <button 
                onClick={toggleSelectAll} 
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
              >
                {selectedVAs.size === vas.length ? (
                  <CheckCircle className="w-4 h-4 text-primary-400" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span className="text-sm">Select All ({vas.length})</span>
              </button>
            </div>

            {/* VAs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vas.map(va => (
                <div 
                  key={va.id} 
                  className={`group bg-slate-900/50 border rounded-xl overflow-hidden transition-all duration-200 ${
                    selectedVAs.has(va.id)
                      ? 'border-primary-500 bg-primary-500/5'
                      : 'border-slate-800 hover:border-slate-700 hover:shadow-xl'
                  }`}
                >
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                          <Bot className="w-5 h-5 text-primary-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white group-hover:text-primary-400 transition-colors">
                            {va.name}
                          </h3>
                          <p className="text-sm text-slate-400">{va.specialty}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => toggleSelectVA(va.id)}
                        className="flex-shrink-0"
                      >
                        {selectedVAs.has(va.id) ? (
                          <CheckCircle className="w-5 h-5 text-primary-400" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-500 hover:text-slate-400" />
                        )}
                      </button>
                    </div>
                    
                    <p className="text-slate-400 text-sm line-clamp-2 mb-3">{va.description}</p>
                    
                    {/* Capabilities Tags */}
                    {va.capabilities && va.capabilities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {va.capabilities.slice(0, 3).map((cap, idx) => (
                          <span key={idx} className="text-xs px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full">
                            {cap}
                          </span>
                        ))}
                        {va.capabilities.length > 3 && (
                          <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full">
                            +{va.capabilities.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                    
                    <div className="mt-3 flex justify-between items-center">
                      <div>
                        <span className="text-xl font-bold text-primary-400">{formatPrice(va.price)}</span>
                        <span className="text-xs text-slate-500 ml-2">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {va.delivery_minutes} min
                        </span>
                      </div>
                      <button 
                        onClick={() => toggleStatus(va.id, va.is_active)} 
                        className={`text-xs px-2 py-1 rounded-full transition-all ${
                          va.is_active 
                            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' 
                            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        }`}
                      >
                        {va.is_active ? (
                          <><Eye className="w-3 h-3 inline mr-1" /> Active</>
                        ) : (
                          <><EyeOff className="w-3 h-3 inline mr-1" /> Inactive</>
                        )}
                      </button>
                    </div>
                    
                    <div className="flex gap-2 mt-4 pt-3 border-t border-slate-800">
                      <button 
                        onClick={() => handleEdit(va)} 
                        className="flex-1 py-1.5 bg-slate-700 text-white rounded-lg text-sm flex items-center justify-center gap-1 hover:bg-slate-600 transition-all"
                      >
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button 
                        onClick={() => deleteVA(va.id)} 
                        className="flex-1 py-1.5 bg-red-600/20 text-red-400 rounded-lg text-sm flex items-center justify-center gap-1 hover:bg-red-600/30 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-8">
                <span className="text-sm text-slate-400">
                  Page {currentPage} of {totalPages} ({vas.length} shown)
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                    disabled={currentPage === 1} 
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                    disabled={currentPage === totalPages} 
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-800 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">
                {editing ? 'Edit Virtual Assistant' : 'Add New Virtual Assistant'}
              </h2>
              <button 
                onClick={() => setShowForm(false)} 
                className="text-slate-400 hover:text-white transition-colors"
              >
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
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Specialty *</label>
                  <input 
                    type="text" 
                    value={formData.specialty} 
                    onChange={e => setFormData({...formData, specialty: e.target.value})} 
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
                <select 
                  value={formData.category} 
                  onChange={e => setFormData({...formData, category: e.target.value})} 
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                <textarea 
                  rows={3} 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Describe what this VA can do..."
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Price ($)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    value={formData.price} 
                    onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} 
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Delivery (minutes)</label>
                  <input 
                    type="number" 
                    min="1"
                    value={formData.delivery_minutes} 
                    onChange={e => setFormData({...formData, delivery_minutes: parseInt(e.target.value)})} 
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">QA Score (0-100)</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="100"
                    value={formData.qa_score} 
                    onChange={e => setFormData({...formData, qa_score: parseInt(e.target.value)})} 
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              
              {/* Capabilities */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Capabilities</label>
                <div className="flex gap-2 mb-2">
                  <input 
                    type="text" 
                    value={newCapability} 
                    onChange={e => setNewCapability(e.target.value)} 
                    placeholder="e.g., Resume Review, Cover Letter, Interview Prep" 
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    onKeyPress={(e) => e.key === 'Enter' && addCapability()} 
                  />
                  <button 
                    onClick={addCapability} 
                    className="

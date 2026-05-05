import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Plus, Edit, Trash2, Brain, Search, RefreshCw, 
  Loader2, AlertCircle, CheckCircle, Eye, EyeOff, 
  X, Square, Clock, DollarSign, Save, Users, BarChart3,
  TrendingUp, Award, Zap
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============== DEBOUNCE HOOK ==============
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// ============== MAIN COMPONENT ==============
export default function AdminAssessments() {
  // State Management
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
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, completed: 0, revenue: 0 });
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [saving, setSaving] = useState(false);

  // Refs for request cancellation
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);

  // Form Data
  const [formData, setFormData] = useState({
    name: '',
    category: 'psychometric',
    description: '',
    price: 9.99,
    duration_minutes: 15,
    question_count: 20,
    is_active: true,
    passing_score: 70,
    max_attempts: 3
  });

  // Constants
  const itemsPerPage = 12;
  const categories = [
    { value: 'psychometric', label: 'Psychometric', icon: Brain },
    { value: 'workplace_skill', label: 'Workplace Skill', icon: Users },
    { value: 'career_aptitude', label: 'Career Aptitude', icon: TrendingUp },
    { value: 'technical', label: 'Technical', icon: Zap },
    { value: 'language', label: 'Language', icon: Award }
  ];

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
        await Promise.all([loadAssessments(), loadStats()]);
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
        .from('assessments')
        .select('is_active, price');
      
      if (error) throw error;
      
      const total = data?.length || 0;
      const active = data?.filter(a => a.is_active === true).length || 0;
      const inactive = data?.filter(a => a.is_active === false).length || 0;
      const revenue = data?.reduce((sum, a) => a.is_active === true ? sum + (a.price || 0) : sum, 0) || 0;
      
      // Get completed assessments count
      const { count: completed } = await supabase
        .from('user_assessments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');
      
      if (isMountedRef.current) {
        setStats({ total, active, inactive, completed: completed || 0, revenue });
      }
    } catch (err) { 
      console.error('Stats error:', err);
    }
  }

  async function loadAssessments() {
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
        .from('assessments')
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
        query = query.or(`name.ilike.%${sanitizedSearch}%,description.ilike.%${sanitizedSearch}%`);
      }
      
      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage;
      query = query.range(from, from + itemsPerPage - 1);
      
      const { data, error, count } = await query.abortSignal(abortControllerRef.current.signal);
      
      if (error) throw error;
      
      if (isMountedRef.current) {
        setAssessments(data || []);
        setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Request cancelled');
        return;
      }
      console.error('Load error:', err);
      if (isMountedRef.current) {
        setError('Failed to load assessments');
        toast.error('Failed to load assessments');
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

  // Load assessments when dependencies change
  useEffect(() => {
    if (isAuthorized) {
      loadAssessments();
    }
  }, [isAuthorized, currentPage, debouncedSearch, selectedCategory, selectedStatus]);

  // ============== CRUD OPERATIONS ==============
  async function saveAssessment() {
    // Validation
    if (!formData.name.trim()) { 
      toast.error('Assessment name is required'); 
      return; 
    }
    if (formData.price < 0) { 
      toast.error('Price cannot be negative'); 
      return; 
    }
    if (formData.duration_minutes < 1) { 
      toast.error('Duration must be at least 1 minute'); 
      return; 
    }
    if (formData.question_count < 1) { 
      toast.error('Must have at least 1 question'); 
      return; 
    }
    if (formData.passing_score < 0 || formData.passing_score > 100) { 
      toast.error('Passing score must be between 0 and 100'); 
      return; 
    }
    if (formData.max_attempts < 1) { 
      toast.error('Must allow at least 1 attempt'); 
      return; 
    }
    
    setSaving(true);
    const toastId = toast.loading(editing ? 'Updating assessment...' : 'Creating assessment...');
    
    try {
      const assessmentData = { 
        ...formData, 
        price: parseFloat(formData.price),
        duration_minutes: parseInt(formData.duration_minutes),
        question_count: parseInt(formData.question_count),
        passing_score: parseInt(formData.passing_score),
        max_attempts: parseInt(formData.max_attempts),
        updated_at: new Date().toISOString(),
        updated_by: user?.id
      };
      
      if (editing) {
        const { error } = await supabase
          .from('assessments')
          .update(assessmentData)
          .eq('id', editing);
        
        if (error) throw error;
        toast.success('Assessment updated successfully', { id: toastId });
      } else {
        const { error } = await supabase
          .from('assessments')
          .insert([{
            ...assessmentData,
            created_at: new Date().toISOString(),
            created_by: user?.id,
            taken_count: 0,
            average_score: 0
          }]);
        
        if (error) throw error;
        toast.success('Assessment created successfully', { id: toastId });
      }
      
      if (isMountedRef.current) {
        setShowForm(false);
        setEditing(null);
        resetForm();
        await Promise.all([loadAssessments(), loadStats()]);
      }
    } catch (err) { 
      console.error('Save error:', err);
      toast.error('Failed to save assessment', { id: toastId });
    } finally { 
      if (isMountedRef.current) {
        setSaving(false);
      }
    }
  }

  async function deleteAssessment(id) { 
    setShowDeleteConfirm({ id, type: 'single' }); 
  }
  
  async function confirmDelete() {
    const toastId = toast.loading('Deleting assessment...');
    
    try { 
      // First delete associated questions
      const { error: questionsError } = await supabase
        .from('assessment_questions')
        .delete()
        .eq('assessment_id', showDeleteConfirm.id);
      
      if (questionsError) throw questionsError;
      
      // Then delete the assessment
      const { error: assessmentError } = await supabase
        .from('assessments')
        .delete()
        .eq('id', showDeleteConfirm.id);
      
      if (assessmentError) throw assessmentError;
      
      toast.success('Assessment deleted successfully', { id: toastId });
      
      if (isMountedRef.current) {
        await Promise.all([loadAssessments(), loadStats()]);
      }
    } catch (err) { 
      console.error('Delete error:', err);
      toast.error('Failed to delete assessment', { id: toastId });
    } finally { 
      if (isMountedRef.current) {
        setShowDeleteConfirm(null);
      }
    }
  }

  async function bulkDelete() { 
    setShowDeleteConfirm({ 
      ids: Array.from(selectedAssessments), 
      type: 'bulk', 
      count: selectedAssessments.size 
    }); 
  }

  async function confirmBulkDelete() {
    const toastId = toast.loading(`Deleting ${showDeleteConfirm.ids.length} assessments...`);
    
    try { 
      // Delete questions for all assessments
      for (const id of showDeleteConfirm.ids) {
        await supabase
          .from('assessment_questions')
          .delete()
          .eq('assessment_id', id);
      }
      
      // Delete assessments
      const { error } = await supabase
        .from('assessments')
        .delete()
        .in('id', showDeleteConfirm.ids);
      
      if (error) throw error;
      
      toast.success(`Deleted ${showDeleteConfirm.ids.length} assessments`, { id: toastId });
      
      if (isMountedRef.current) {
        setSelectedAssessments(new Set());
        await Promise.all([loadAssessments(), loadStats()]);
      }
    } catch (err) { 
      console.error('Bulk delete error:', err);
      toast.error('Failed to delete assessments', { id: toastId });
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
    const previousAssessments = [...assessments];
    setAssessments(assessments.map(a => 
      a.id === id ? { ...a, is_active: !currentStatus } : a
    ));
    
    try { 
      const { error } = await supabase
        .from('assessments')
        .update({ 
          is_active: !currentStatus,
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        })
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success(`Assessment ${!currentStatus ? 'activated' : 'deactivated'}`, { id: toastId });
      await loadStats(); // Update stats in background
    } catch (err) { 
      // Rollback on error
      setAssessments(previousAssessments);
      console.error('Status update error:', err);
      toast.error('Failed to update status', { id: toastId });
    }
  }

  // ============== UTILITY FUNCTIONS ==============
  function resetForm() {
    setFormData({
      name: '',
      category: 'psychometric',
      description: '',
      price: 9.99,
      duration_minutes: 15,
      question_count: 20,
      is_active: true,
      passing_score: 70,
      max_attempts: 3
    });
  }

  function handleEdit(assessment) {
    setEditing(assessment.id);
    setFormData(assessment);
    setShowForm(true);
  }

  function toggleSelectAll() { 
    setSelectedAssessments(selectedAssessments.size === assessments.length 
      ? new Set() 
      : new Set(assessments.map(a => a.id))
    ); 
  }
  
  function toggleSelectAssessment(id) { 
    const newSet = new Set(selectedAssessments); 
    newSet.has(id) ? newSet.delete(id) : newSet.add(id); 
    setSelectedAssessments(newSet); 
  }

  const formatPrice = (price) => new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD' 
  }).format(price);

  const getCategoryIcon = (category) => {
    const found = categories.find(c => c.value === category);
    return found?.icon || Brain;
  };

  const getCategoryColor = (category) => {
    const colors = {
      psychometric: 'purple',
      workplace_skill: 'blue',
      career_aptitude: 'emerald',
      technical: 'orange',
      language: 'pink'
    };
    return colors[category] || 'primary';
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
          ? `Delete ${showDeleteConfirm.count} assessments? This will also delete all associated questions. This cannot be undone.`
          : 'Delete this assessment? This will also delete all associated questions. This cannot be undone.'}
        confirmText="Delete"
        confirmVariant="danger"
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Brain className="w-6 h-6 text-primary-400" /> 
              Assessment Management
            </h1>
            <p className="text-slate-400 text-sm">Manage your assessment catalog and track performance</p>
          </div>
          <button 
            onClick={() => { resetForm(); setEditing(null); setShowForm(true); }} 
            className="px-4 py-2 bg-primary-500 text-white rounded-lg flex items-center gap-2 hover:bg-primary-600 transition-all shadow-lg"
          >
            <Plus className="w-4 h-4" /> Add Assessment
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <Brain className="w-8 h-8 text-primary-400/50" />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Active</p>
                <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-400/50" />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Completed</p>
                <p className="text-2xl font-bold text-blue-400">{stats.completed.toLocaleString()}</p>
              </div>
              <Users className="w-8 h-8 text-blue-400/50" />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Revenue</p>
                <p className="text-2xl font-bold text-purple-400">{formatPrice(stats.revenue)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-400/50" />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Inactive</p>
                <p className="text-2xl font-bold text-amber-400">{stats.inactive}</p>
              </div>
              <EyeOff className="w-8 h-8 text-amber-400/50" />
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
                placeholder="Search by name or description..." 
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
                <option key={c.value} value={c.value}>{c.label}</option>
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
              onClick={() => loadAssessments()} 
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all flex items-center gap-2"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedAssessments.size > 0 && (
          <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 mb-6 flex justify-between items-center animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary-400" />
              <span className="text-white font-medium">{selectedAssessments.size} assessment(s) selected</span>
            </div>
            <button 
              onClick={bulkDelete} 
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-all flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Delete Selected
            </button>
          </div>
        )}

        {/* Assessments Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 mb-4">{error}</p>
            <button 
              onClick={loadAssessments} 
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-all"
            >
              Try Again
            </button>
          </div>
        ) : assessments.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
            <Brain className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 mb-4">
              {searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all'
                ? 'No assessments match your search criteria'
                : 'No assessments found. Click "Add Assessment" to get started.'}
            </p>
            {!searchTerm && selectedCategory === 'all' && selectedStatus === 'all' && (
              <button 
                onClick={() => { resetForm(); setEditing(null); setShowForm(true); }} 
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create First Assessment
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
                {selectedAssessments.size === assessments.length ? (
                  <CheckCircle className="w-4 h-4 text-primary-400" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span className="text-sm">Select All ({assessments.length})</span>
              </button>
            </div>

            {/* Assessments Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assessments.map(assessment => {
                const CategoryIcon = getCategoryIcon(assessment.category);
                const color = getCategoryColor(assessment.category);
                
                return (
                  <div 
                    key={assessment.id} 
                    className={`group bg-slate-900/50 border rounded-xl overflow-hidden transition-all duration-200 ${
                      selectedAssessments.has(assessment.id)
                        ? 'border-primary-500 bg-primary-500/5'
                        : 'border-slate-800 hover:border-slate-700 hover:shadow-xl'
                    }`}
                  >
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg bg-${color}-500/10 flex items-center justify-center`}>
                            <CategoryIcon className={`w-5 h-5 text-${color}-400`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white group-hover:text-primary-400 transition-colors line-clamp-1">
                              {assessment.name}
                            </h3>
                            <p className="text-xs text-slate-400 capitalize">
                              {assessment.category.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => toggleSelectAssessment(assessment.id)}
                          className="flex-shrink-0"
                        >
                          {selectedAssessments.has(assessment.id) ? (
                            <CheckCircle className="w-5 h-5 text-primary-400" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-500 hover:text-slate-400" />
                          )}
                        </button>
                      </div>
                      
                      <p className="text-slate-400 text-sm line-clamp-2 mb-3">
                        {assessment.description || 'No description provided'}
                      </p>
                      
                      {/* Assessment Stats */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="text-center">
                          <div className="text-xs text-slate-500">Questions</div>
                          <div className="text-sm font-semibold text-white">{assessment.question_count}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-slate-500">Duration</div>
                          <div className="text-sm font-semibold text-white">{assessment.duration_minutes}m</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-slate-500">Passing</div>
                          <div className="text-sm font-semibold text-white">{assessment.passing_score}%</div>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex justify-between items-center">
                        <div>
                          <span className="text-xl font-bold text-primary-400">{formatPrice(assessment.price)}</span>
                          <span className="text-xs text-slate-500 ml-2">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {assessment.duration_minutes} min
                          </span>
                        </div>
                        <button 
                          onClick={() => toggleStatus(assessment.id, assessment.is_active)} 
                          className={`text-xs px-2 py-1 rounded-full transition-all ${
                            assessment.is_active 
                              ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' 
                              : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                          }`}
                        >
                          {assessment.is_active ? (
                            <><Eye className="w-3 h-3 inline mr-1" /> Active</>
                          ) : (
                            <><EyeOff className="w-3 h-3 inline mr-1" /> Inactive</>
                          )}
                        </button>
                      </div>
                      
                      <div className="flex gap-2 mt-4 pt-3 border-t border-slate-800">
                        <button 
                          onClick={() => handleEdit(assessment)} 
                          className="flex-1 py-1.5 bg-slate-700 text-white rounded-lg text-sm flex items-center justify-center gap-1 hover:bg-slate-600 transition-all"
                        >
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button 
                          onClick={() => deleteAssessment(assessment.id)} 
                          className="flex-1 py-1.5 bg-red-600/20 text-red-400 rounded-lg text-sm flex items-center justify-center gap-1 hover:bg-red-600/30 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-8">
                <span className="text-sm text-slate-400">
                  Page {currentPage} of {totalPages} ({assessments.length} shown)
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
                {editing ? 'Edit Assessment' : 'Add New Assessment'}
              </h2>
              <button 
                onClick={() => setShowForm(false)} 
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Assessment Name *</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Leadership Skills Assessment"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
                <select 
                  value={formData.category} 
                  onChange={e => setFormData({...formData, category: e.target.value})} 
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {categories.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
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
                  placeholder="Describe what this assessment measures..."
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <label className="block text-sm font-medium text-slate-300 mb-1">Duration (minutes)</label>
                  <

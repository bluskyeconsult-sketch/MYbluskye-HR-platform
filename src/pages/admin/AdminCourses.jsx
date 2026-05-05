import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Plus, Edit, Trash2, GraduationCap, Search, RefreshCw, 
  Loader2, AlertCircle, CheckCircle, Eye, EyeOff, 
  X, Square, Globe, Clock, DollarSign, Save 
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============== CUSTOM HOOKS ==============

// Debounce hook - prevents excessive API calls
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// ============== MAIN COMPONENT ==============

export default function AdminCourses() {
  // State
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCourses, setSelectedCourses] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [stats, setStats] = useState({ total: 0, published: 0, draft: 0, revenue: 0 });
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState('');

  const [formData, setFormData] = useState({
    title: '', description: '', level: 'beginner', duration_minutes: 60, 
    price: 0, thumbnail_url: '', status: 'draft'
  });

  // Refs for request cancellation
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);

  const itemsPerPage = 20;
  const levels = ['beginner', 'intermediate', 'advanced', 'expert'];

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
        await Promise.all([loadCourses(), loadStats()]);
      }
    } catch (err) {
      console.error('Auth error:', err);
      window.location.href = '/admin-login';
    }
  }

  useEffect(() => { 
    checkAuth(); 
  }, []);

  // ============== DATA LOADING ==============

  async function loadStats() {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('status, price');
      
      if (error) throw error;
      
      const total = data?.length || 0;
      const published = data?.filter(c => c.status === 'published').length || 0;
      const draft = data?.filter(c => c.status === 'draft').length || 0;
      const revenue = data?.reduce((sum, c) => 
        c.status === 'published' ? sum + (c.price || 0) : sum, 0
      ) || 0;
      
      if (isMountedRef.current) {
        setStats({ total, published, draft, revenue });
      }
    } catch (err) { 
      console.error('Stats error:', err);
    }
  }

  async function loadCourses() {
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
        .from('courses')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });
      
      // Apply filters
      if (selectedLevel !== 'all') {
        query = query.eq('level', selectedLevel);
      }
      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }
      if (debouncedSearch) {
        // Sanitize search input to prevent injection
        const sanitizedSearch = debouncedSearch.replace(/[%_]/g, '\\$&');
        query = query.or(`title.ilike.%${sanitizedSearch}%,description.ilike.%${sanitizedSearch}%`);
      }
      
      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage;
      query = query.range(from, from + itemsPerPage - 1);
      
      const { data, error, count } = await query.abortSignal(abortControllerRef.current.signal);
      
      if (error) throw error;
      
      if (isMountedRef.current) {
        setCourses(data || []);
        setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Request cancelled');
        return;
      }
      console.error('Load error:', err);
      if (isMountedRef.current) {
        setError('Failed to load courses');
        toast.error('Failed to load courses');
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
  }, [debouncedSearch, selectedLevel, selectedStatus]);

  // Load courses when dependencies change
  useEffect(() => {
    if (isAuthorized) {
      loadCourses();
    }
  }, [isAuthorized, currentPage, debouncedSearch, selectedLevel, selectedStatus]);

  // ============== CRUD OPERATIONS ==============

  async function saveCourse() {
    // Validation
    if (!formData.title.trim()) { 
      toast.error('Title is required'); 
      return; 
    }
    if (formData.price < 0) { 
      toast.error('Price cannot be negative'); 
      return; 
    }
    if (formData.duration_minutes <= 0) {
      toast.error('Duration must be positive');
      return;
    }
    
    setSaving(true);
    const toastId = toast.loading(editing ? 'Updating course...' : 'Creating course...');
    
    try {
      const courseData = { 
        ...formData, 
        price: parseFloat(formData.price), 
        duration_minutes: parseInt(formData.duration_minutes),
        updated_at: new Date().toISOString()
      };
      
      if (editing) {
        const { error } = await supabase
          .from('courses')
          .update(courseData)
          .eq('id', editing);
        
        if (error) throw error;
        toast.success('Course updated successfully', { id: toastId });
      } else {
        const { error } = await supabase
          .from('courses')
          .insert([{
            ...courseData,
            created_at: new Date().toISOString(),
            students_enrolled: 0,
            rating: 0
          }]);
        
        if (error) throw error;
        toast.success('Course created successfully', { id: toastId });
      }
      
      if (isMountedRef.current) {
        setShowForm(false);
        setEditing(null);
        resetForm();
        await Promise.all([loadCourses(), loadStats()]);
      }
    } catch (err) { 
      console.error('Save error:', err);
      toast.error('Failed to save course', { id: toastId });
    } finally { 
      if (isMountedRef.current) {
        setSaving(false);
      }
    }
  }

  async function deleteCourse(id) { 
    setShowDeleteConfirm({ id, type: 'single' }); 
  }
  
  async function confirmDelete() {
    const toastId = toast.loading('Deleting course...');
    
    try { 
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', showDeleteConfirm.id);
      
      if (error) throw error;
      
      toast.success('Course deleted successfully', { id: toastId });
      
      if (isMountedRef.current) {
        await Promise.all([loadCourses(), loadStats()]);
      }
    } catch (err) { 
      console.error('Delete error:', err);
      toast.error('Failed to delete course', { id: toastId });
    } finally { 
      if (isMountedRef.current) {
        setShowDeleteConfirm(null);
      }
    }
  }

  async function bulkDelete() { 
    setShowDeleteConfirm({ 
      ids: Array.from(selectedCourses), 
      type: 'bulk', 
      count: selectedCourses.size 
    }); 
  }

  async function confirmBulkDelete() {
    const toastId = toast.loading(`Deleting ${showDeleteConfirm.ids.length} courses...`);
    
    try { 
      const { error } = await supabase
        .from('courses')
        .delete()
        .in('id', showDeleteConfirm.ids);
      
      if (error) throw error;
      
      toast.success(`Deleted ${showDeleteConfirm.ids.length} courses`, { id: toastId });
      
      if (isMountedRef.current) {
        setSelectedCourses(new Set());
        await Promise.all([loadCourses(), loadStats()]);
      }
    } catch (err) { 
      console.error('Bulk delete error:', err);
      toast.error('Failed to delete courses', { id: toastId });
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
    
    // Optimistic update - update UI immediately
    const previousCourses = [...courses];
    setCourses(courses.map(course => 
      course.id === id ? { ...course, status: newStatus } : course
    ));
    
    try { 
      const { error } = await supabase
        .from('courses')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success(`Course ${newStatus === 'published' ? 'published' : 'unpublished'}`, { id: toastId });
      await loadStats(); // Update stats in background
    } catch (err) { 
      // Rollback on error
      setCourses(previousCourses);
      console.error('Status update error:', err);
      toast.error('Failed to update status', { id: toastId });
    }
  }

  // ============== UTILITY FUNCTIONS ==============

  function resetForm() { 
    setFormData({ 
      title: '', description: '', level: 'beginner', 
      duration_minutes: 60, price: 0, thumbnail_url: '', status: 'draft' 
    }); 
    setThumbnailPreview(''); 
  }
  
  function handleEdit(course) { 
    setEditing(course.id); 
    setFormData(course); 
    setThumbnailPreview(course.thumbnail_url); 
    setShowForm(true); 
  }
  
  function toggleSelectAll() { 
    setSelectedCourses(selectedCourses.size === courses.length 
      ? new Set() 
      : new Set(courses.map(c => c.id))
    ); 
  }
  
  function toggleSelectCourse(id) { 
    const newSet = new Set(selectedCourses); 
    newSet.has(id) ? newSet.delete(id) : newSet.add(id); 
    setSelectedCourses(newSet); 
  }

  const formatPrice = (price) => new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD' 
  }).format(price);

  const getLevelColor = (level) => {
    switch(level) {
      case 'beginner': return 'text-emerald-400 bg-emerald-500/10';
      case 'intermediate': return 'text-blue-400 bg-blue-500/10';
      case 'advanced': return 'text-amber-400 bg-amber-500/10';
      case 'expert': return 'text-purple-400 bg-purple-500/10';
      default: return 'text-slate-400 bg-slate-500/10';
    }
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
      
      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={showDeleteConfirm?.type === 'bulk' ? confirmBulkDelete : confirmDelete}
        title="Confirm Delete"
        message={showDeleteConfirm?.type === 'bulk' 
          ? `Are you sure you want to delete ${showDeleteConfirm.count} courses? This action cannot be undone.`
          : 'Are you sure you want to delete this course? This action cannot be undone.'}
        confirmText="Delete"
        confirmVariant="danger"
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-primary-400" /> 
              Course Management
            </h1>
            <p className="text-slate-400 text-sm">Manage your learning catalog</p>
          </div>
          <button 
            onClick={() => { resetForm(); setEditing(null); setShowForm(true); }} 
            className="px-4 py-2 bg-primary-500 text-white rounded-lg flex items-center gap-2 hover:bg-primary-600 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <Plus className="w-4 h-4" /> Add Course
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
            <p className="text-slate-400 text-sm">Total Courses</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
            <p className="text-slate-400 text-sm">Published</p>
            <p className="text-2xl font-bold text-emerald-400">{stats.published}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
            <p className="text-slate-400 text-sm">Drafts</p>
            <p className="text-2xl font-bold text-amber-400">{stats.draft}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
            <p className="text-slate-400 text-sm">Total Value</p>
            <p className="text-2xl font-bold text-purple-400">{formatPrice(stats.revenue)}</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by title or description..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              />
            </div>
            
            <select 
              value={selectedLevel} 
              onChange={(e) => setSelectedLevel(e.target.value)} 
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Levels</option>
              {levels.map(l => (
                <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
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
              onClick={() => loadCourses()} 
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all flex items-center gap-2"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedCourses.size > 0 && (
          <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 mb-6 flex justify-between items-center animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary-400" />
              <span className="text-white font-medium">{selectedCourses.size} course(s) selected</span>
            </div>
            <button 
              onClick={bulkDelete} 
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-all flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Delete Selected
            </button>
          </div>
        )}

        {/* Courses Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 mb-4">{error}</p>
            <button 
              onClick={loadCourses} 
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-all"
            >
              Try Again
            </button>
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
            <GraduationCap className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 mb-4">
              {searchTerm || selectedLevel !== 'all' || selectedStatus !== 'all'
                ? 'No courses match your search criteria'
                : 'No courses found. Click "Add Course" to get started.'}
            </p>
            {!searchTerm && selectedLevel === 'all' && selectedStatus === 'all' && (
              <button 
                onClick={() => { resetForm(); setEditing(null); setShowForm(true); }} 
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create First Course
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
                {selectedCourses.size === courses.length ? (
                  <CheckCircle className="w-4 h-4 text-primary-400" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span className="text-sm">Select All ({courses.length})</span>
              </button>
            </div>

            {/* Courses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map(course => (
                <div 
                  key={course.id} 
                  className={`group bg-slate-900/50 border rounded-xl overflow-hidden transition-all duration-200 ${
                    selectedCourses.has(course.id)
                      ? 'border-primary-500 bg-primary-500/5'
                      : 'border-slate-800 hover:border-slate-700 hover:shadow-xl'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="relative h-48 bg-slate-800 flex items-center justify-center overflow-hidden">
                    {course.thumbnail_url ? (
                      <img 
                        src={course.thumbnail_url} 
                        alt={course.title} 
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => { e.target.src = '/placeholder-course.jpg'; }}
                      />
                    ) : (
                      <GraduationCap className="w-12 h-12 text-slate-600" />
                    )}
                  </div>
                  
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white line-clamp-1">{course.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-1 rounded-full ${getLevelColor(course.level)}`}>
                            {course.level.charAt(0).toUpperCase() + course.level.slice(1)}
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {course.duration_minutes} min
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => toggleSelectCourse(course.id)}
                        className="ml-2 flex-shrink-0"
                      >
                        {selectedCourses.has(course.id) ? (
                          <CheckCircle className="w-5 h-5 text-primary-400" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-500 hover:text-slate-400" />
                        )}
                      </button>
                    </div>
                    
                    <p className="text-slate-400 text-sm mt-2 line-clamp-2">{course.description}</p>
                    
                    <div className="mt-3 flex justify-between items-center">
                      <span className="text-xl font-bold text-primary-400">{formatPrice(course.price)}</span>
                      <button 
                        onClick={() => toggleStatus(course.id, course.status)} 
                        className={`text-xs px-2 py-1 rounded-full transition-all ${
                          course.status === 'published' 
                            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' 
                            : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                        }`}
                      >
                        {course.status === 'published' ? (
                          <><Eye className="w-3 h-3 inline mr-1" /> Published</>
                        ) : (
                          <><EyeOff className="w-3 h-3 inline mr-1" /> Draft</>
                        )}
                      </button>
                    </div>
                    
                    <div className="flex gap-2 mt-4 pt-3 border-t border-slate-800">
                      <button 
                        onClick={() => handleEdit(course)} 
                        className="flex-1 py-1.5 bg-slate-700 text-white rounded-lg text-sm flex items-center justify-center gap-1 hover:bg-slate-600 transition-all"
                      >
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button 
                        onClick={() => deleteCourse(course.id)} 
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
                  Page {currentPage} of {totalPages} ({courses.length} shown)
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
                {editing ? 'Edit Course' : 'Add New Course'}
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
                <label className="block text-sm font-medium text-slate-300 mb-1">Title *</label>
                <input 
                  type="text" 
                  placeholder="Course title" 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})} 
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                <textarea 
                  placeholder="Course description" 
                  rows={4} 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Level</label>
                  <select 
                    value={formData.level} 
                    onChange={e => setFormData({...formData, level: e.target.value})} 
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {levels.map(l => (
                      <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Duration (minutes)</label>
                  <input 
                    type="number" 
                    placeholder="Duration" 
                    value={formData.duration_minutes} 
                    onChange={e => setFormData({...formData, duration_minutes: parseInt(e.target.value)})} 
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Price ($)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="Price" 
                    value={formData.price} 
                    onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} 
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
                  <select 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value})} 
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Thumbnail URL</label>
                <input 
                  type="text" 
                  placeholder="https://example.com/thumbnail.jpg" 
                  value={formData.thumbnail_url} 
                  onChange={e => { 
                    setFormData({...formData, thumbnail_url: e.target.value}); 
                    setThumbnailPreview(e.target.value); 
                  }} 
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {thumbnailPreview && (
                  <div className="mt-2">
                    <p className="text-xs text-slate-500 mb-1">Preview:</p>
                    <img 
                      src={thumbnailPreview} 
                      alt="Preview" 
                      className="w-32 h-24 object-cover rounded-lg border border-slate-700"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={saveCourse} 
                  disabled={saving} 
                  className="flex-1 py-2 bg-primary-600 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-primary-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save Course'}
                </button>
                <button 
                  onClick={() => setShowForm(false)} 
                  className="flex-1 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

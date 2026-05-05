import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Plus, Edit, Trash2, GraduationCap, Search, Filter,
  CheckCircle, XCircle, Eye, EyeOff, Download,
  RefreshCw, Loader2, AlertCircle, Clock, User,
  DollarSign, Image, Tag, Globe, Star, TrendingUp,
  BookOpen, Video, Award, Users, Calendar, Save, X
} from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  const [notification, setNotification] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [stats, setStats] = useState({ total: 0, published: 0, draft: 0, students: 0, revenue: 0 });
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [modules, setModules] = useState([]);
  const [newModule, setNewModule] = useState({ title: '', duration: 0, video_url: '' });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    level: 'beginner',
    duration_minutes: 60,
    price: 0,
    thumbnail_url: '',
    status: 'draft',
    instructor: '',
    prerequisites: '',
    certificate_enabled: true,
    max_students: 0,
    language: 'English',
    category: 'business',
    featured: false
  });

  const itemsPerPage = 12;

  // Categories
  const categories = [
    'business', 'technology', 'hr-management', 'leadership',
    'career-development', 'communication', 'project-management', 'data-science'
  ];

  // Levels
  const levels = ['beginner', 'intermediate', 'advanced', 'expert'];
  const languages = ['English', 'Spanish', 'French', 'German', 'Chinese'];

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
      loadCourses();
      loadStats();
    } catch (err) {
      console.error('Auth error:', err);
      window.location.href = '/admin-login';
    }
  }

  async function loadStats() {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('status, price, students_enrolled', { count: 'exact' });
      
      if (error) throw error;
      
      const total = data?.length || 0;
      const published = data?.filter(c => c.status === 'published').length || 0;
      const draft = data?.filter(c => c.status === 'draft').length || 0;
      const students = data?.reduce((sum, c) => sum + (c.students_enrolled || 0), 0) || 0;
      const revenue = data?.reduce((sum, c) => {
        if (c.status === 'published') {
          return sum + ((c.price || 0) * (c.students_enrolled || 0));
        }
        return sum;
      }, 0) || 0;
      
      setStats({ total, published, draft, students, revenue });
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }

  async function loadCourses() {
    try {
      setLoading(true);
      setError(null);
      
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
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,instructor.ilike.%${searchTerm}%`);
      }
      
      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      setCourses(data || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      
    } catch (err) {
      console.error('Error loading courses:', err);
      setError('Failed to load courses. Please refresh the page.');
      showNotification('Failed to load courses', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function saveCourse() {
    // Validation
    if (!formData.title.trim()) {
      showNotification('Course title is required', 'error');
      return;
    }
    if (!formData.instructor.trim()) {
      showNotification('Instructor name is required', 'error');
      return;
    }
    if (formData.price < 0) {
      showNotification('Price cannot be negative', 'error');
      return;
    }
    
    try {
      const courseData = {
        ...formData,
        duration_minutes: parseInt(formData.duration_minutes),
        price: parseFloat(formData.price),
        updated_at: new Date().toISOString(),
        updated_by: user?.id
      };
      
      if (editing) {
        const { error } = await supabase
          .from('courses')
          .update(courseData)
          .eq('id', editing);
        
        if (error) throw error;
        showNotification('Course updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('courses')
          .insert({
            ...courseData,
            created_at: new Date().toISOString(),
            created_by: user?.id,
            students_enrolled: 0,
            rating: 0
          });
        
        if (error) throw error;
        showNotification('Course created successfully', 'success');
      }
      
      setShowForm(false);
      setEditing(null);
      resetForm();
      await loadCourses();
      await loadStats();
      
    } catch (err) {
      console.error('Error saving course:', err);
      showNotification('Failed to save course', 'error');
    }
  }

  async function deleteCourse(id) {
    setShowDeleteConfirm({ id, type: 'single' });
  }

  async function confirmDelete() {
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', showDeleteConfirm.id);
      
      if (error) throw error;
      
      showNotification('Course deleted successfully', 'success');
      await loadCourses();
      await loadStats();
      
    } catch (err) {
      console.error('Error deleting course:', err);
      showNotification('Failed to delete course', 'error');
    } finally {
      setShowDeleteConfirm(null);
    }
  }

  async function bulkDelete() {
    setShowDeleteConfirm({ ids: Array.from(selectedCourses), type: 'bulk', count: selectedCourses.size });
  }

  async function confirmBulkDelete() {
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .in('id', showDeleteConfirm.ids);
      
      if (error) throw error;
      
      showNotification(`Deleted ${showDeleteConfirm.ids.length} courses`, 'success');
      setSelectedCourses(new Set());
      await loadCourses();
      await loadStats();
      
    } catch (err) {
      console.error('Error deleting courses:', err);
      showNotification('Failed to delete courses', 'error');
    } finally {
      setShowDeleteConfirm(null);
    }
  }

  async function toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    
    try {
      const { error } = await supabase
        .from('courses')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        })
        .eq('id', id);
      
      if (error) throw error;
      
      showNotification(`Course ${newStatus === 'published' ? 'published' : 'unpublished'}`, 'success');
      await loadCourses();
      await loadStats();
      
    } catch (err) {
      console.error('Error toggling status:', err);
      showNotification('Failed to update status', 'error');
    }
  }

  function resetForm() {
    setFormData({
      title: '',
      description: '',
      level: 'beginner',
      duration_minutes: 60,
      price: 0,
      thumbnail_url: '',
      status: 'draft',
      instructor: '',
      prerequisites: '',
      certificate_enabled: true,
      max_students: 0,
      language: 'English',
      category: 'business',
      featured: false
    });
    setThumbnailPreview('');
  }

  function handleEdit(course) {
    setEditing(course.id);
    setFormData(course);
    setThumbnailPreview(course.thumbnail_url);
    setShowForm(true);
  }

  function showNotification(message, type = 'success') {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  }

  function toggleSelectAll() {
    if (selectedCourses.size === courses.length) {
      setSelectedCourses(new Set());
    } else {
      setSelectedCourses(new Set(courses.map(c => c.id)));
    }
  }

  function toggleSelectCourse(id) {
    const newSelected = new Set(selectedCourses);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCourses(newSelected);
  }

  function handleThumbnailUrlChange(url) {
    setFormData({...formData, thumbnail_url: url});
    setThumbnailPreview(url);
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(price);
  };

  const getLevelColor = (level) => {
    switch(level) {
      case 'beginner': return 'text-emerald-400 bg-emerald-500/10';
      case 'intermediate': return 'text-blue-400 bg-blue-500/10';
      case 'advanced': return 'text-amber-400 bg-amber-500/10';
      case 'expert': return 'text-purple-400 bg-purple-500/10';
      default: return 'text-slate-400 bg-slate-500/10';
    }
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
    if (isAuthorized) {
      loadCourses();
    }
  }, [searchTerm, selectedLevel, selectedStatus]);

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
                ? `Are you sure you want to delete ${showDeleteConfirm.count} courses? This action cannot be undone.`
                : 'Are you sure you want to delete this course? This action cannot be undone.'}
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
              <GraduationCap className="w-6 h-6 text-primary-400" />
              Course Management
            </h1>
            <p className="text-slate-400 text-sm mt-1">Manage your learning catalog and track enrollment</p>
          </div>
          <button
            onClick={() => { resetForm(); setEditing(null); setShowForm(true); }}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Course
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Courses</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <GraduationCap className="w-8 h-8 text-primary-400/50" />
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
                <p className="text-slate-400 text-sm">Total Students</p>
                <p className="text-2xl font-bold text-blue-400">{stats.students.toLocaleString()}</p>
              </div>
              <Users className="w-8 h-8 text-blue-400/50" />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Revenue</p>
                <p className="text-2xl font-bold text-purple-400">{formatPrice(stats.revenue)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-400/50" />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Avg Rating</p>
                <p className="text-2xl font-bold text-amber-400">4.8</p>
              </div>
              <Star className="w-8 h-8 text-amber-400/50" />
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
                placeholder="Search by title, instructor, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Levels</option>
              {levels.map(level => (
                <option key={level} value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>
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
              onClick={() => { loadCourses(); }}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedCourses.size > 0 && (
          <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary-400" />
              <span className="text-white">{selectedCourses.size} course(s) selected</span>
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

        {/* Course Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">
                  {editing ? 'Edit Course' : 'Create New Course'}
                </h2>
                <button onClick={() => { setShowForm(false); resetForm(); }} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Course Title *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Instructor *</label>
                    <input
                      type="text"
                      value={formData.instructor}
                      onChange={e => setFormData({...formData, instructor: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      placeholder="Jane Smith"
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
                    placeholder="Course description, learning outcomes, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Prerequisites</label>
                  <textarea
                    rows={2}
                    value={formData.prerequisites}
                    onChange={e => setFormData({...formData, prerequisites: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    placeholder="Required knowledge or skills"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Level</label>
                    <select
                      value={formData.level}
                      onChange={e => setFormData({...formData, level: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                      {levels.map(level => (
                        <option key={level} value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>
                      ))}
                    </select>
                  </div>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Duration (minutes)</label>
                    <input
                      type="number"
                      value={formData.duration_minutes}
                      onChange={e => setFormData({...formData, duration_minutes: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Max Students (0 = unlimited)</label>
                    <input
                      type="number"
                      value={formData.max_students}
                      onChange={e => setFormData({...formData, max_students: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Thumbnail URL</label>
                  <input
                    type="text"
                    value={formData.thumbnail_url}
                    onChange={e => handleThumbnailUrlChange(e.target.value)}
                    placeholder="https://example.com/thumbnail.jpg"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                  {thumbnailPreview && (
                    <div className="mt-2">
                      <p className="text-xs text-slate-500 mb-1">Preview:</p>
                      <img src={thumbnailPreview} alt="Thumbnail preview" className="w-32 h-24 object-cover rounded-lg" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 text-slate-300">
                    <input
                      type="checkbox"
                      checked={formData.certificate_enabled}
                      onChange={e => setFormData({...formData, certificate_enabled: e.target.checked})}
                      className="rounded bg-slate-800 border-slate-700 text-primary-500"
                    />
                    Certificate Available
                  </label>
                  <label className="flex items-center gap-2 text-slate-300">
                    <input
                      type="checkbox"
                      checked={formData.featured}
                      onChange={e => setFormData({...formData, featured: e.target.checked})}
                      className="rounded bg-slate-800 border-slate-700 text-primary-500"
                    />
                    Featured Course
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={saveCourse}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Course
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

        {/* Courses Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400">{error}</p>
            <button
              onClick={loadCourses}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500"
            >
              Try Again
            </button>
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
            <GraduationCap className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Courses Found</h3>
            <p className="text-slate-400 mb-4">
              {searchTerm || selectedLevel !== 'all' || selectedStatus !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first course'}
            </p>
            {!searchTerm && selectedLevel === 'all' && selectedStatus === 'all' && (
              <button
                onClick={() => { resetForm(); setEditing(null); setShowForm(true); }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500"
              >
                <Plus className="w-4 h-4" />
                Create First Course
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
                  className={`bg-slate-900/50 border rounded-xl overflow-hidden transition-all ${
                    selectedCourses.has(course.id)
                      ? 'border-primary-500 bg-primary-500/5'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Thumbnail */}
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-full h-48 object-cover"
                      onError={(e) => { e.target.src = '/placeholder-course.jpg'; }}
                    />
                  ) : (
                    <div className="w-full h-48 bg-slate-800 flex items-center justify-center">
                      <GraduationCap className="w-12 h-12 text-slate-600" />
                    </div>
                  )}
                  
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex

// AdminCourses.jsx
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import * as Sentry from '@sentry/react';
import { 
  Plus, Edit, Trash2, GraduationCap, Search, RefreshCw, 
  Loader2, AlertCircle, CheckCircle, Eye, EyeOff, 
  X, Square, Globe, Clock, DollarSign, Save, Filter,
  TrendingUp, Users, Star, Award, BookOpen
} from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';
import { useAuth } from '../../hooks/useAuth';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { PerformanceMonitor } from '../../components/PerformanceMonitor';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Constants
const ITEMS_PER_PAGE = 12;
const CACHE_TIME = 5 * 60 * 1000; // 5 minutes
const STALE_TIME = 1 * 60 * 1000; // 1 minute
const RETRY_CONFIG = { retries: 3, retryDelay: attempt => Math.min(1000 * 2 ** attempt, 10000) };

// Types
const LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];
const CATEGORIES = ['business', 'technology', 'hr-management', 'leadership', 'career-development', 'communication'];
const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Chinese'];

// API Service Layer
const courseService = {
  async getCourses({ page, search, level, status, signal }) {
    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    
    let query = supabase
      .from('courses')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });
    
    if (level !== 'all') query = query.eq('level', level);
    if (status !== 'all') query = query.eq('status', status);
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,instructor.ilike.%${search}%`);
    }
    
    const { data, error, count } = await query.range(from, to).abortSignal(signal);
    if (error) throw error;
    
    return { courses: data || [], total: count || 0, totalPages: Math.ceil((count || 0) / ITEMS_PER_PAGE) };
  },
  
  async getStats(signal) {
    const { data, error } = await supabase
      .from('courses')
      .select('status, price, students_enrolled')
      .abortSignal(signal);
    
    if (error) throw error;
    
    const total = data?.length || 0;
    const published = data?.filter(c => c.status === 'published').length || 0;
    const draft = data?.filter(c => c.status === 'draft').length || 0;
    const students = data?.reduce((sum, c) => sum + (c.students_enrolled || 0), 0) || 0;
    const revenue = data?.reduce((sum, c) => 
      c.status === 'published' ? sum + ((c.price || 0) * (c.students_enrolled || 0)) : sum, 0
    ) || 0;
    
    return { total, published, draft, students, revenue };
  },
  
  async saveCourse(course, userId) {
    const courseData = {
      ...course,
      price: parseFloat(course.price),
      duration_minutes: parseInt(course.duration_minutes),
      updated_at: new Date().toISOString(),
      updated_by: userId
    };
    
    if (course.id) {
      const { error } = await supabase.from('courses').update(courseData).eq('id', course.id);
      if (error) throw error;
      return { ...courseData, id: course.id };
    } else {
      const { data, error } = await supabase.from('courses').insert({
        ...courseData,
        created_at: new Date().toISOString(),
        created_by: userId,
        students_enrolled: 0,
        rating: 0
      }).select().single();
      
      if (error) throw error;
      return data;
    }
  },
  
  async deleteCourse(id) {
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) throw error;
    return id;
  },
  
  async bulkDeleteCourses(ids) {
    const { error } = await supabase.from('courses').delete().in('id', ids);
    if (error) throw error;
    return ids;
  },
  
  async toggleCourseStatus(id, currentStatus) {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    const { error } = await supabase
      .from('courses')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) throw error;
    return { id, newStatus };
  }
};

// Custom Hooks
function useCourses(filters) {
  const [searchTerm] = useDebounce(filters.search, 300);
  
  return useQuery({
    queryKey: ['courses', filters.page, searchTerm, filters.level, filters.status],
    queryFn: ({ signal }) => courseService.getCourses({ 
      ...filters, 
      search: searchTerm,
      signal 
    }),
    staleTime: STALE_TIME,
    cacheTime: CACHE_TIME,
    retry: RETRY_CONFIG.retries,
    retryDelay: RETRY_CONFIG.retryDelay,
    onError: (error) => {
      Sentry.captureException(error, {
        tags: { component: 'AdminCourses', action: 'fetchCourses' },
        extra: { filters }
      });
      toast.error('Failed to load courses. Please refresh the page.');
    }
  });
}

function useCourseStats() {
  return useQuery({
    queryKey: ['course-stats'],
    queryFn: ({ signal }) => courseService.getStats(signal),
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    onError: (error) => {
      Sentry.captureException(error, {
        tags: { component: 'AdminCourses', action: 'fetchStats' }
      });
    }
  });
}

function useCourseMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const saveMutation = useMutation({
    mutationFn: (course) => courseService.saveCourse(course, user?.id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['course-stats'] });
      toast.success(data.id ? 'Course updated successfully' : 'Course created successfully');
    },
    onError: (error) => {
      Sentry.captureException(error, {
        tags: { component: 'AdminCourses', action: 'saveCourse' }
      });
      toast.error('Failed to save course. Please try again.');
    }
  });
  
  const deleteMutation = useMutation({
    mutationFn: courseService.deleteCourse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['course-stats'] });
      toast.success('Course deleted successfully');
    },
    onError: (error) => {
      Sentry.captureException(error, {
        tags: { component: 'AdminCourses', action: 'deleteCourse' }
      });
      toast.error('Failed to delete course');
    }
  });
  
  const bulkDeleteMutation = useMutation({
    mutationFn: courseService.bulkDeleteCourses,
    onSuccess: (ids) => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['course-stats'] });
      toast.success(`Deleted ${ids.length} courses`);
    },
    onError: (error) => {
      Sentry.captureException(error, {
        tags: { component: 'AdminCourses', action: 'bulkDelete' }
      });
      toast.error('Failed to delete courses');
    }
  });
  
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }) => courseService.toggleCourseStatus(id, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['course-stats'] });
      toast.success(`Course ${data.newStatus === 'published' ? 'published' : 'unpublished'}`);
    },
    onError: (error) => {
      Sentry.captureException(error, {
        tags: { component: 'AdminCourses', action: 'toggleStatus' }
      });
      toast.error('Failed to update course status');
    }
  });
  
  return { saveMutation, deleteMutation, bulkDeleteMutation, toggleStatusMutation };
}

// Components
const StatCard = ({ title, value, icon: Icon, color, trend }) => (
  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-slate-400 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            <TrendingUp className="w-3 h-3" />
            <span>{Math.abs(trend)}% from last month</span>
          </div>
        )}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${color}-500/10`}>
        <Icon className={`w-6 h-6 text-${color}-400`} />
      </div>
    </div>
  </div>
);

const CourseCard = ({ course, isSelected, onToggleSelect, onEdit, onDelete, onToggleStatus }) => {
  const formatPrice = (price) => new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
  
  const getLevelColor = (level) => {
    const colors = {
      beginner: 'emerald', intermediate: 'blue', advanced: 'amber', expert: 'purple'
    };
    return colors[level] || 'slate';
  };
  
  return (
    <div className={`bg-slate-900/50 border rounded-xl overflow-hidden transition-all ${
      isSelected ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-slate-800 hover:border-slate-700'
    }`}>
      {/* Thumbnail */}
      <div className="relative h-48 bg-slate-800">
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <GraduationCap className="w-12 h-12 text-slate-600" />
          </div>
        )}
        {course.featured && (
          <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full">
            Featured
          </div>
        )}
        <button
          onClick={() => onToggleSelect(course.id)}
          className="absolute top-2 left-2 bg-black/50 rounded-lg p-1 hover:bg-black/70 transition-colors"
        >
          {isSelected ? (
            <CheckCircle className="w-5 h-5 text-primary-400" />
          ) : (
            <Square className="w-5 h-5 text-white" />
          )}
        </button>
      </div>
      
      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-white line-clamp-1">{course.title}</h3>
            <p className="text-sm text-slate-400">by {course.instructor || 'Unknown'}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full bg-${getLevelColor(course.level)}-500/10 text-${getLevelColor(course.level)}-400`}>
            {course.level}
          </span>
        </div>
        
        <p className="text-slate-400 text-sm line-clamp-2 mb-3">{course.description}</p>
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Clock className="w-4 h-4" />
            <span>{Math.floor(course.duration_minutes / 60)}h {course.duration_minutes % 60}m</span>
            <Users className="w-4 h-4 ml-2" />
            <span>{course.students_enrolled || 0}</span>
          </div>
          <span className="text-xl font-bold text-primary-400">{formatPrice(course.price)}</span>
        </div>
        
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            onClick={() => onToggleStatus(course.id, course.status)}
            className={`text-xs px-2 py-1 rounded-full ${
              course.status === 'published' 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : 'bg-amber-500/20 text-amber-400'
            }`}
          >
            {course.status === 'published' ? <Eye className="w-3 h-3 inline mr-1" /> : <EyeOff className="w-3 h-3 inline mr-1" />}
            {course.status}
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(course)}
              className="p-1.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(course.id)}
              className="p-1.5 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Component
export default function AdminCourses() {
  const [filters, setFilters] = useState({
    page: 1,
    search: '',
    level: 'all',
    status: 'all'
  });
  const [selectedCourses, setSelectedCourses] = useState(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  const { user, isAuthorized, isLoading: authLoading } = useAuth();
  const { data: coursesData, isLoading: coursesLoading, error: coursesError, refetch } = useCourses(filters);
  const { data: stats, isLoading: statsLoading } = useCourseStats();
  const { saveMutation, deleteMutation, bulkDeleteMutation, toggleStatusMutation } = useCourseMutations();
  
  const courses = coursesData?.courses || [];
  const totalPages = coursesData?.totalPages || 1;
  
  // Handlers
  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: key === 'page' ? value : 1 }));
  }, []);
  
  const handleSelectAll = useCallback(() => {
    if (selectedCourses.size === courses.length) {
      setSelectedCourses(new Set());
    } else {
      setSelectedCourses(new Set(courses.map(c => c.id)));
    }
  }, [selectedCourses, courses]);
  
  const handleSelectCourse = useCallback((id) => {
    setSelectedCourses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }, []);
  
  const handleEdit = useCallback((course) => {
    setEditingCourse(course);
    setShowForm(true);
  }, []);
  
  const handleDelete = useCallback((id) => {
    setDeleteTarget({ type: 'single', id });
  }, []);
  
  const handleBulkDelete = useCallback(() => {
    setDeleteTarget({ type: 'bulk', ids: Array.from(selectedCourses), count: selectedCourses.size });
  }, [selectedCourses]);
  
  const confirmDelete = useCallback(async () => {
    if (deleteTarget.type === 'single') {
      await deleteMutation.mutateAsync(deleteTarget.id);
    } else {
      await bulkDeleteMutation.mutateAsync(deleteTarget.ids);
      setSelectedCourses(new Set());
    }
    setDeleteTarget(null);
  }, [deleteTarget, deleteMutation, bulkDeleteMutation]);
  
  const handleSaveCourse = useCallback(async (courseData) => {
    await saveMutation.mutateAsync(courseData);
    setShowForm(false);
    setEditingCourse(null);
  }, [saveMutation]);
  
  const handleToggleStatus = useCallback((id, status) => {
    toggleStatusMutation.mutate({ id, status });
  }, [toggleStatusMutation]);
  
  // Auth check
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </div>
    );
  }
  
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-slate-400">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }
  
  return (
    <ErrorBoundary>
      <PerformanceMonitor componentName="AdminCourses">
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <GraduationCap className="w-6 h-6 text-primary-400" />
                  Course Management
                </h1>
                <p className="text-slate-400 text-sm mt-1">Manage your learning catalog and track performance</p>
              </div>
              <button
                onClick={() => { setEditingCourse(null); setShowForm(true); }}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2 shadow-lg"
              >
                <Plus className="w-4 h-4" />
                Add Course
              </button>
            </div>
            
            {/* Stats Grid */}
            {!statsLoading && stats && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                <StatCard title="Total Courses" value={stats.total} icon={BookOpen} color="primary" trend={12} />
                <StatCard title="Published" value={stats.published} icon={Globe} color="emerald" trend={8} />
                <StatCard title="Total Students" value={stats.students.toLocaleString()} icon={Users} color="blue" trend={23} />
                <StatCard title="Revenue" value={`$${stats.revenue.toLocaleString()}`} icon={DollarSign} color="purple" trend={15} />
                <StatCard title="Avg Rating" value="4.8" icon={Star} color="amber" trend={5} />
              </div>
            )}
            
            {/* Filters */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6 backdrop-blur-sm">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by title, instructor, or description..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                
                <select
                  value={filters.level}
                  onChange={(e) => handleFilterChange('level', e.target.value)}
                  className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Levels</option>
                  {LEVELS.map(level => (
                    <option key={level} value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>
                  ))}
                </select>
                
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Status</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
                
                <button
                  onClick={() => refetch()}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </div>
            
            {/* Bulk Actions */}
            {selectedCourses.size > 0 && (
              <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 mb-6 flex items-center justify-between animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-primary-400" />
                  <span className="text-white font-medium">{selectedCourses.size} course(s) selected</span>
                </div>
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Selected
                </button>
              </div>
            )}
            
            {/* Courses Grid */}
            {coursesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
              </div>
            ) : coursesError ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-400 mb-4">Failed to load courses. Please try again.</p>
                <button onClick={() => refetch()} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500">
                  Retry
                </button>
              </div>
            ) : courses.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                <GraduationCap className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Courses Found</h3>
                <p className="text-slate-400 mb-4">
                  {filters.search || filters.level !== 'all' || filters.status !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Get started by creating your first course'}
                </p>
                {(!filters.search && filters.level === 'all' && filters.status === 'all') && (
                  <button
                    onClick={() => { setEditingCourse(null); setShowForm(true); }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500"
                  >
                    <Plus className="w-4 h-4" />
                    Create First Course
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3 px-2">
                  <button
                    onClick={handleSelectAll}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                  >
                    {selectedCourses.size === courses.length ? (
                      <CheckCircle className="w-4 h-4 text-primary-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    <span className="text-sm">Select All ({courses.length})</span>
                  </button>
                  <p className="text-sm text-slate-400">
                    Showing {courses.length} of {coursesData?.total} courses
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses.map(course => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      isSelected={selectedCourses.has(course.id)}
                      onToggleSelect={handleSelectCourse}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onToggleStatus={handleToggleStatus}
                    />
                  ))}
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-800">
                    <button
                      onClick={() => handleFilterChange('page', filters.page - 1)}
                      disabled={filters.page === 1}
                      className="px-4 py-2 bg-slate-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
                    >
                      Previous
                    </button>
                    <div className="flex gap-2">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) pageNum = i + 1;
                        else if (filters.page <= 3) pageNum = i + 1;
                        else if (filters.page >= totalPages - 2) pageNum = totalPages - 4 + i;
                        else pageNum = filters.page - 2 + i;
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handleFilterChange('page', pageNum)}
                            className={`px-3 py-2 rounded-lg transition-colors ${
                              filters.page === pageNum
                                ? 'bg-primary-600 text-white'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => handleFilterChange('page', filters.page + 1)}
                      disabled={filters.page === totalPages}
                      className="px-4 py-2 bg-slate-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Course Form Modal */}
          <CourseFormModal
            isOpen={showForm}
            onClose={() => { setShowForm(false); setEditingCourse(null); }}
            onSave={handleSaveCourse}
            initialData={editingCourse}
            isSaving={saveMutation.isLoading}
          />
          
          {/* Delete Confirmation Modal */}
          <ConfirmModal
            isOpen={!!deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onConfirm={confirmDelete}
            title="Confirm Delete"
            message={deleteTarget?.type === 'bulk' 
              ? `Delete ${deleteTarget.count} courses? This action cannot be undone.`
              : 'Delete this course? This action cannot be undone.'}
            isDestructive={true}
          />
        </div>
      </PerformanceMonitor>
    </ErrorBoundary>
  );
}

// Course Form Modal Component
const CourseFormModal = ({ isOpen, onClose, onSave, initialData, isSaving }) => {
  const [formData, setFormData] = useState({
    title: '', description: '', instructor: '', level: 'beginner',
    duration_minutes: 60, price: 0, thumbnail_url: '', status: 'draft',
    category: 'business', language: 'English', featured: false,
    certificate_enabled: true, max_students: 0
  });
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setThumbnailPreview(initialData.thumbnail_url);
    } else {
      resetForm();
    }
  }, [initialData]);
  
  const resetForm = () => {
    setFormData({
      title: '', description: '', instructor: '', level: 'beginner',
      duration_minutes: 60, price: 0, thumbnail_url: '', status: 'draft',
      category: 'business', language: 'English', featured: false,
      certificate_enabled: true, max_students: 0
    });
    setThumbnailPreview('');
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Course title is required');
      return;
    }
    if (!formData.instructor.trim()) {
      toast.error('Instructor name is required');
      return;
    }
    if (formData.price < 0) {
      toast.error('Price cannot be negative');
      return;
    }
    onSave(formData);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">
            {initialData ? 'Edit Course' : 'Create New Course'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Course Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Instructor *</label>
              <input
                type="text"
                value={formData.instructor}
                onChange={e => setFormData({...formData, instructor: e.target.value})}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Level</label>
              <select
                value={formData.level}
                onChange={e => setFormData({...formData, level: e.target.value})}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {LEVELS.map(level => (
                  <option key={level} value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat.replace('-', ' ').toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Language</label>
              <select
                value={formData.language}
                onChange={e => setFormData({...formData, language: e.target.value})}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-

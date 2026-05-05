import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Plus, Edit, Trash2, Brain, Search, Filter,
  CheckCircle, XCircle, Eye, EyeOff, Download,
  RefreshCw, Loader2, AlertCircle, Clock, DollarSign,
  FileText, Users, TrendingUp, Award, Shield,
  BookOpen, HelpCircle, BarChart3, Save, X
} from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminAssessments() {
  // State
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
  const [notification, setNotification] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, completed: 0, avgScore: 0 });
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showQuestions, setShowQuestions] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionData, setQuestionData] = useState({
    question_text: '',
    question_type: 'likert',
    options: [],
    order_index: 0
  });

  const [formData, setFormData] = useState({
    name: '',
    category: 'psychometric',
    description: '',
    price: 9.99,
    duration_minutes: 15,
    question_count: 20,
    is_active: true,
    passing_score: 70,
    max_attempts: 3,
    certificate_enabled: true,
    time_limit_warning: 5,
    instruction_text: '',
    tags: []
  });

  const itemsPerPage = 12;

  // Categories
  const categories = [
    'psychometric', 'workplace_skill', 'career_aptitude', 
    'technical', 'language', 'leadership', 'teamwork', 'problem_solving'
  ];

  // Question types
  const questionTypes = ['likert', 'multiple_choice', 'true_false', 'essay', 'scale'];

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
      loadAssessments();
      loadStats();
    } catch (err) {
      console.error('Auth error:', err);
      window.location.href = '/admin-login';
    }
  }

  async function loadStats() {
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select('is_active, price', { count: 'exact' });
      
      if (error) throw error;
      
      // Get completion stats from user_assessments
      const { data: completions } = await supabase
        .from('user_assessments')
        .select('score')
        .eq('status', 'completed');
      
      const total = data?.length || 0;
      const active = data?.filter(a => a.is_active === true).length || 0;
      const inactive = data?.filter(a => a.is_active === false).length || 0;
      const completed = completions?.length || 0;
      const avgScore = completions?.reduce((sum, c) => sum + (c.score || 0), 0) / (completions?.length || 1);
      
      setStats({ total, active, inactive, completed, avgScore: avgScore.toFixed(1) });
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }

  async function loadAssessments() {
    try {
      setLoading(true);
      setError(null);
      
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
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }
      
      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      setAssessments(data || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      
    } catch (err) {
      console.error('Error loading assessments:', err);
      setError('Failed to load assessments. Please refresh the page.');
      showNotification('Failed to load assessments', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadQuestions(assessmentId) {
    try {
      const { data, error } = await supabase
        .from('assessment_questions')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      setQuestions(data || []);
    } catch (err) {
      console.error('Error loading questions:', err);
      showNotification('Failed to load questions', 'error');
    }
  }

  async function saveAssessment() {
    // Validation
    if (!formData.name.trim()) {
      showNotification('Assessment name is required', 'error');
      return;
    }
    if (formData.price < 0) {
      showNotification('Price cannot be negative', 'error');
      return;
    }
    if (formData.duration_minutes < 1) {
      showNotification('Duration must be at least 1 minute', 'error');
      return;
    }
    if (formData.passing_score < 0 || formData.passing_score > 100) {
      showNotification('Passing score must be between 0 and 100', 'error');
      return;
    }
    
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
      
      let assessmentId;
      
      if (editing) {
        const { error } = await supabase
          .from('assessments')
          .update(assessmentData)
          .eq('id', editing);
        
        if (error) throw error;
        assessmentId = editing;
        showNotification('Assessment updated successfully', 'success');
      } else {
        const { data, error } = await supabase
          .from('assessments')
          .insert({
            ...assessmentData,
            created_at: new Date().toISOString(),
            created_by: user?.id,
            taken_count: 0
          })
          .select()
          .single();
        
        if (error) throw error;
        assessmentId = data.id;
        showNotification('Assessment created successfully', 'success');
      }
      
      setShowForm(false);
      setEditing(null);
      resetForm();
      await loadAssessments();
      await loadStats();
      
    } catch (err) {
      console.error('Error saving assessment:', err);
      showNotification('Failed to save assessment', 'error');
    }
  }

  async function saveQuestion() {
    if (!questionData.question_text.trim()) {
      showNotification('Question text is required', 'error');
      return;
    }
    
    try {
      if (editingQuestion) {
        const { error } = await supabase
          .from('assessment_questions')
          .update(questionData)
          .eq('id', editingQuestion);
        
        if (error) throw error;
        showNotification('Question updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('assessment_questions')
          .insert({
            ...questionData,
            assessment_id: showQuestions,
            created_at: new Date().toISOString()
          });
        
        if (error) throw error;
        showNotification('Question added successfully', 'success');
      }
      
      setShowQuestionModal(false);
      setEditingQuestion(null);
      setQuestionData({
        question_text: '',
        question_type: 'likert',
        options: [],
        order_index: questions.length
      });
      await loadQuestions(showQuestions);
      
    } catch (err) {
      console.error('Error saving question:', err);
      showNotification('Failed to save question', 'error');
    }
  }

  async function deleteQuestion(questionId) {
    if (confirm('Delete this question?')) {
      try {
        const { error } = await supabase
          .from('assessment_questions')
          .delete()
          .eq('id', questionId);
        
        if (error) throw error;
        showNotification('Question deleted', 'success');
        await loadQuestions(showQuestions);
      } catch (err) {
        console.error('Error deleting question:', err);
        showNotification('Failed to delete question', 'error');
      }
    }
  }

  async function deleteAssessment(id) {
    setShowDeleteConfirm({ id, type: 'single' });
  }

  async function confirmDelete() {
    try {
      // First delete associated questions
      await supabase
        .from('assessment_questions')
        .delete()
        .eq('assessment_id', showDeleteConfirm.id);
      
      // Then delete the assessment
      const { error } = await supabase
        .from('assessments')
        .delete()
        .eq('id', showDeleteConfirm.id);
      
      if (error) throw error;
      
      showNotification('Assessment deleted successfully', 'success');
      await loadAssessments();
      await loadStats();
      
    } catch (err) {
      console.error('Error deleting assessment:', err);
      showNotification('Failed to delete assessment', 'error');
    } finally {
      setShowDeleteConfirm(null);
    }
  }

  async function bulkDelete() {
    setShowDeleteConfirm({ ids: Array.from(selectedAssessments), type: 'bulk', count: selectedAssessments.size });
  }

  async function confirmBulkDelete() {
    try {
      // Delete questions for each assessment
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
      
      showNotification(`Deleted ${showDeleteConfirm.ids.length} assessments`, 'success');
      setSelectedAssessments(new Set());
      await loadAssessments();
      await loadStats();
      
    } catch (err) {
      console.error('Error deleting assessments:', err);
      showNotification('Failed to delete assessments', 'error');
    } finally {
      setShowDeleteConfirm(null);
    }
  }

  async function toggleStatus(id, currentStatus) {
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
      
      showNotification(`Assessment ${!currentStatus ? 'activated' : 'deactivated'}`, 'success');
      await loadAssessments();
      await loadStats();
      
    } catch (err) {
      console.error('Error toggling status:', err);
      showNotification('Failed to update status', 'error');
    }
  }

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
      max_attempts: 3,
      certificate_enabled: true,
      time_limit_warning: 5,
      instruction_text: '',
      tags: []
    });
  }

  function handleEdit(assessment) {
    setEditing(assessment.id);
    setFormData(assessment);
    setShowForm(true);
  }

  function handleViewQuestions(assessment) {
    setShowQuestions(assessment.id);
    loadQuestions(assessment.id);
  }

  function showNotification(message, type = 'success') {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  }

  function toggleSelectAll() {
    if (selectedAssessments.size === assessments.length) {
      setSelectedAssessments(new Set());
    } else {
      setSelectedAssessments(new Set(assessments.map(a => a.id)));
    }
  }

  function toggleSelectAssessment(id) {
    const newSelected = new Set(selectedAssessments);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedAssessments(newSelected);
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
      psychometric: 'text-purple-400 bg-purple-500/10',
      workplace_skill: 'text-emerald-400 bg-emerald-500/10',
      career_aptitude: 'text-blue-400 bg-blue-500/10',
      technical: 'text-amber-400 bg-amber-500/10'
    };
    return colors[category] || 'text-slate-400 bg-slate-500/10';
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
    if (isAuthorized) {
      loadAssessments();
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
                ? `Are you sure you want to delete ${showDeleteConfirm.count} assessments? This will also delete all associated questions. This action cannot be undone.`
                : 'Are you sure you want to delete this assessment? This will also delete all associated questions. This action cannot be undone.'}
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

      {/* Question Management Modal */}
      {showQuestions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Manage Questions</h2>
              <button onClick={() => setShowQuestions(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => {
                  setEditingQuestion(null);
                  setQuestionData({
                    question_text: '',
                    question_type: 'likert',
                    options: [],
                    order_index: questions.length
                  });
                  setShowQuestionModal(true);
                }}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Question
              </button>
            </div>
            
            <div className="space-y-3">
              {questions.map((question, idx) => (
                <div key={question.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-2 py-1 bg-primary-500/20 text-primary-400 rounded-full">
                          Q{idx + 1}
                        </span>
                        <span className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded-full">
                          {question.question_type}
                        </span>
                      </div>
                      <p className="text-white">{question.question_text}</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => {
                          setEditingQuestion(question.id);
                          setQuestionData(question);
                          setShowQuestionModal(true);
                        }}
                        className="text-primary-400 hover:text-primary-300"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteQuestion(question.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {questions.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  No questions added yet. Click "Add Question" to get started.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Question Form Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">
                {editingQuestion ? 'Edit Question' : 'Add Question'}
              </h3>
              <button onClick={() => setShowQuestionModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Question Text</label>
                <textarea
                  rows={3}
                  value={questionData.question_text}
                  onChange={e => setQuestionData({...questionData, question_text: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Question Type</label>
                <select
                  value={questionData.question_type}
                  onChange={e => setQuestionData({...questionData, question_type: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  {questionTypes.map(type => (
                    <option key={type} value={type}>
                      {type.replace('_', ' ').toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={saveQuestion}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500"
                >
                  Save Question
                </button>
                <button
                  onClick={() => setShowQuestionModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Brain className="w-6 h-6 text-primary-400" />
              Assessment Management
            </h1>
            <p className="text-slate-400 text-sm mt-1">Create and manage psychometric and skills assessments</p>
          </div>
          <button
            onClick={() => { resetForm(); setEditing(null); setShowForm(true); }}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Assessment
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <Brain className="w-8 h-8 text-primary-400/50" />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Active</p>
                <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-400/50" />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Completed</p>
                <p className="text-2xl font-bold text-blue-400">{stats.completed.toLocaleString()}</p>
              </div>
              <Users className="w-8 h-8 text-blue-400/50" />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Avg Score</p>
                <p className="text-2xl font-bold text-amber-400">{stats.avgScore}%</p>
              </div>
              <BarChart3 className="w-8 h-8 text-amber-400/50" />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Revenue</p>
                <p className="text-2xl font-bold text-purple-400">
                  {formatPrice(stats.active * 50)}
                </p>
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
                placeholder="Search assessments..."
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
                  {cat.replace('_', ' ').toUpperCase()}
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
              onClick={() => { loadAssessments(); }}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedAssessments.size > 0 && (
          <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary-400" />
              <span className="text-white">{selectedAssessments.size} assessment(s) selected</span>
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

        {/* Assessment Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">
                  {editing ? 'Edit Assessment' : 'Create New Assessment'}
                </h2>
                <button onClick={() => { setShowForm(false); resetForm(); }} className="text-slate-400 hover:text-white">
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
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
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
                        {cat.replace('_', ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Instructions</label>
                  <textarea
                    rows={2}
                    value={formData.instruction_text}
                    onChange={e => setFormData({...formData, instruction_text: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    placeholder="Instructions for taking this assessment..."
                  />
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
                    <label className="block text-sm font-medium text-slate-300 mb-1">Duration (minutes)</label>
                    <input
                      type="number"
                      value={formData.duration_minutes}
                      onChange={e => setFormData({...formData, duration_minutes: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Question Count</label>
                    <input
                      type="number"
                      value={formData.question_count}
                      onChange={e => setFormData({...formData, question_count: parseInt(e.target.value)})}
                      className="w-full px-3 py-

// src/pages/admin/AssessmentManager.jsx
// SUPER ADMIN - Complete AI-Assisted Assessment Builder
//
// FIXED (2026-08-07):
// 1. Removed a hardcoded admin-email backdoor (5th instance found across
//    the codebase) — now checks profiles.user_type like everywhere else.
// 2. AI generation sent `count` in the request body, but the real
//    generate-assessment handler expects `numberOfQuestions` — so whatever
//    number the admin actually requested was silently ignored, always
//    generating the handler's default of 5 questions.
// 3. The real handler's AI response shape is {question, options, correct,
//    explanation} (a multiple-choice trivia format), but this file read
//    q.question_text (undefined) and had no logic to save options/correct
//    answers — every AI-generated question was being saved with a blank
//    question_text and no answer options. Now correctly maps the real
//    response shape into assessment_questions + assessment_options, using
//    the same pattern already used by this file's own manual multiple-choice
//    form.

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
    ClipboardList, Plus, Edit2, Trash2, Eye, Loader2, 
    CheckCircle, XCircle, BarChart3, BookOpen, AlertCircle,
    ChevronDown, ChevronRight, Save, X, Sparkles, Brain,
    Wand2, Settings, TrendingUp, Award, Target, Users,
    Star, MessageSquare, Copy, Check, RefreshCw, Filter
} from 'lucide-react';

// ============================================
// CONSTANTS
// ============================================

const ASSESSMENT_TYPES = [
    { id: 'personality', name: 'Personality & Behavioral', icon: Star, color: 'purple', description: 'Understand user traits and tendencies' },
    { id: 'emotional_intelligence', name: 'Emotional Intelligence', icon: Brain, color: 'pink', description: 'EQ assessment for self-awareness' },
    { id: 'leadership', name: 'Leadership & Management', icon: Users, color: 'blue', description: 'Leadership capabilities assessment' },
    { id: 'communication', name: 'Communication Skills', icon: MessageSquare, color: 'green', description: 'Verbal and written communication' },
    { id: 'problem_solving', name: 'Problem Solving', icon: Target, color: 'amber', description: 'Critical thinking and analysis' },
    { id: 'team_collaboration', name: 'Team Collaboration', icon: Users, color: 'cyan', description: 'Teamwork and collaboration skills' },
    { id: 'career_aptitude', name: 'Career Aptitude', icon: TrendingUp, color: 'indigo', description: 'Career path recommendations' },
    { id: 'technical', name: 'Technical Skills', icon: Settings, color: 'slate', description: 'Technical competency assessment' },
    { id: 'general', name: 'General Knowledge', icon: ClipboardList, color: 'gray', description: 'General assessment' }
];

const QUESTION_TYPES = [
    { value: 'likert_scale', label: 'Likert Scale (1-5 Agreement)', icon: '📊' },
    { value: 'multiple_choice', label: 'Multiple Choice', icon: '🔘' },
    { value: 'true_false', label: 'True / False', icon: '✓✗' },
    { value: 'text', label: 'Text / Essay', icon: '📝' }
];

const DIFFICULTY_LEVELS = [
    { value: 'beginner', label: 'Beginner', color: 'emerald', description: 'Basic concepts and fundamentals' },
    { value: 'intermediate', label: 'Intermediate', color: 'amber', description: 'Practical application' },
    { value: 'advanced', label: 'Advanced', color: 'red', description: 'Complex problem-solving' }
];

// ============================================
// CUSTOM HOOKS
// ============================================

const useAdminAccess = () => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const checkAccess = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    window.location.href = '/admin-login';
                    return;
                }
                
                // FIXED: real database check instead of a hardcoded email.
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('user_type')
                    .eq('id', user.id)
                    .single();
                
                const hasAccess = profile?.user_type === 'admin' || profile?.user_type === 'super_admin';
                
                if (!hasAccess) {
                    alert('Access denied. Admin access required.');
                    window.location.href = '/admin/dashboard';
                }
                setIsAdmin(hasAccess);
            } catch (error) {
                console.error('Admin check failed:', error);
                window.location.href = '/admin-login';
            } finally {
                setLoading(false);
            }
        };
        checkAccess();
    }, []);
    
    return { isAdmin, loading };
};

const useAssessments = () => {
    const [assessments, setAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, active: 0, totalQuestions: 0 });
    
    const loadAssessments = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('assessments')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (!error && data) {
                setAssessments(data);
                setStats({
                    total: data.length,
                    active: data.filter(a => a.is_active).length,
                    totalQuestions: data.reduce((sum, a) => sum + (a.question_count || 0), 0)
                });
            }
        } catch (error) {
            console.error('Error loading assessments:', error);
        } finally {
            setLoading(false);
        }
    }, []);
    
    const deleteAssessment = async (id) => {
        if (!confirm('⚠️ Delete this assessment and all its questions? This cannot be undone.')) return false;
        
        try {
            await supabase.from('assessment_questions').delete().eq('assessment_id', id);
            await supabase.from('assessments').delete().eq('id', id);
            await loadAssessments();
            return true;
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete assessment');
            return false;
        }
    };
    
    const toggleStatus = async (id, currentStatus) => {
        try {
            await supabase
                .from('assessments')
                .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
                .eq('id', id);
            await loadAssessments();
        } catch (error) {
            console.error('Status update error:', error);
        }
    };
    
    return { assessments, loading, stats, loadAssessments, deleteAssessment, toggleStatus };
};

const useQuestions = () => {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(false);
    
    const loadQuestions = useCallback(async (assessmentId) => {
        if (!assessmentId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('assessment_questions')
                .select('*')
                .eq('assessment_id', assessmentId)
                .order('sort_order', { ascending: true });
            
            if (!error) setQuestions(data || []);
        } catch (error) {
            console.error('Error loading questions:', error);
        } finally {
            setLoading(false);
        }
    }, []);
    
    const deleteQuestion = async (id, assessmentId) => {
        if (!confirm('Delete this question?')) return false;
        
        try {
            await supabase.from('assessment_questions').delete().eq('id', id);
            if (assessmentId) await loadQuestions(assessmentId);
            return true;
        } catch (error) {
            console.error('Delete question error:', error);
            alert('Failed to delete question');
            return false;
        }
    };
    
    const updateQuestionOrder = async (questionId, newOrder) => {
        try {
            await supabase
                .from('assessment_questions')
                .update({ sort_order: newOrder })
                .eq('id', questionId);
        } catch (error) {
            console.error('Order update error:', error);
        }
    };
    
    return { questions, loading, loadQuestions, deleteQuestion, updateQuestionOrder };
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function AssessmentManager() {
    // State
    const [expandedAssessment, setExpandedAssessment] = useState(null);
    const [selectedAssessment, setSelectedAssessment] = useState(null);
    const [showAssessmentModal, setShowAssessmentModal] = useState(false);
    const [showQuestionModal, setShowQuestionModal] = useState(false);
    const [showAIGeneratorModal, setShowAIGeneratorModal] = useState(false);
    const [editingAssessment, setEditingAssessment] = useState(null);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [saving, setSaving] = useState(false);
    const [filterType, setFilterType] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    
    // AI Generation State
    const [aiTopic, setAiTopic] = useState('');
    const [aiDifficulty, setAiDifficulty] = useState('intermediate');
    const [aiQuestionCount, setAiQuestionCount] = useState(10);
    const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState([]);
    const [generating, setGenerating] = useState(false);
    
    // Custom Hooks
    const { isAdmin, loading: adminLoading } = useAdminAccess();
    const { assessments, loading: assessmentsLoading, stats, loadAssessments, deleteAssessment, toggleStatus } = useAssessments();
    const { questions, loading: questionsLoading, loadQuestions, deleteQuestion } = useQuestions();
    
    // Form States
    const [assessmentForm, setAssessmentForm] = useState({
        title: '', description: '', instructions: '', assessment_type: 'personality',
        difficulty: 'intermediate', time_limit_minutes: 30, is_active: true
    });
    
    const [questionForm, setQuestionForm] = useState({
        question_text: '', question_type: 'likert_scale', points: 1, dimension: '', sort_order: 0,
        options: ['', '', '', ''], correct_answer: 0
    });
    
    // Initial Load
    useEffect(() => {
        if (isAdmin) loadAssessments();
    }, [isAdmin, loadAssessments]);
    
    // Filtered assessments
    const filteredAssessments = assessments.filter(a => {
        if (filterType !== 'all' && a.assessment_type !== filterType) return false;
        if (searchQuery && !a.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });
    
    // ============================================
    // AI-ASSISTED FUNCTIONS
    // ============================================
    
    const generateAIQuestions = async () => {
        if (!aiTopic.trim()) {
            alert('Please enter a topic for AI question generation');
            return;
        }
        
        setGenerating(true);
        
        try {
            // FIXED (2026-08-22): generate-assessment now requires real
            // admin auth server-side (it had none at all before — see
            // index.js's requireAdmin fix). This call never sent one, so
            // it would 401 the moment that fix deployed.
            const { data: { session } } = await supabase.auth.getSession();
            // FIXED: payload key is numberOfQuestions, matching the real
            // handler — was previously sent as `count` and silently ignored.
            const response = await fetch('/api/index?action=generate-assessment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    topic: aiTopic,
                    difficulty: aiDifficulty,
                    numberOfQuestions: aiQuestionCount
                })
            });
            
            const data = await response.json();
            
            if (data.success && data.questions) {
                setAiGeneratedQuestions(data.questions);
                alert(`✨ AI generated ${data.questions.length} questions for "${aiTopic}"`);
            } else {
                throw new Error(data.error || 'Generation failed');
            }
        } catch (error) {
            console.error('AI generation error:', error);
            // Fallback mock generation
            const mockQuestions = generateMockQuestions(aiTopic, aiQuestionCount, aiDifficulty);
            setAiGeneratedQuestions(mockQuestions);
            alert(`📝 Generated ${mockQuestions.length} sample questions. Review and edit as needed.`);
        } finally {
            setGenerating(false);
        }
    };
    
    const generateMockQuestions = (topic, count, difficulty) => {
        const questions = [];
        const questionTemplates = [
            `How would you rate your experience with ${topic}?`,
            `What is your understanding of key ${topic} principles?`,
            `How confident are you in applying ${topic} concepts?`,
            `Describe your approach to ${topic} challenges.`,
            `What strategies do you use for effective ${topic} management?`
        ];
        
        for (let i = 0; i < count; i++) {
            questions.push({
                question_text: questionTemplates[i % questionTemplates.length] + ` (Question ${i + 1})`,
                question_type: 'likert_scale',
                dimension: topic.toLowerCase().replace(/\s/g, '_'),
                points: 1,
                difficulty: difficulty
            });
        }
        return questions;
    };
    
    // FIXED: the real generate-assessment handler returns questions shaped
    // {question, options, correct, explanation} — a multiple-choice format
    // — not {question_text, question_type, dimension}. This previously
    // saved every AI-generated question with a blank question_text and no
    // answer options. Now maps both possible shapes (real AI response, and
    // the mock fallback above) correctly, and saves multiple-choice options
    // into assessment_options the same way the manual question form does.
    const saveAIGeneratedQuestions = async () => {
        if (!selectedAssessment) {
            alert('Please select an assessment first');
            return;
        }
        
        setSaving(true);
        const currentMax = questions.length;
        
        try {
            for (let i = 0; i < aiGeneratedQuestions.length; i++) {
                const q = aiGeneratedQuestions[i];
                const hasOptions = Array.isArray(q.options) && q.options.length > 0;
                
                const { data: newQuestion, error } = await supabase
                    .from('assessment_questions')
                    .insert({
                        assessment_id: selectedAssessment.id,
                        question_text: q.question_text || q.question,
                        question_type: q.question_type || (hasOptions ? 'multiple_choice' : 'likert_scale'),
                        points: q.points || 1,
                        dimension: q.dimension,
                        sort_order: currentMax + i
                    })
                    .select()
                    .single();
                
                if (error) {
                    console.error('Question insert error:', error);
                    continue;
                }
                
                // Save multiple-choice options if the AI returned them.
                if (hasOptions && newQuestion) {
                    for (let j = 0; j < q.options.length; j++) {
                        await supabase.from('assessment_options').insert({
                            question_id: newQuestion.id,
                            option_text: q.options[j],
                            is_correct: j === q.correct,
                            sort_order: j
                        });
                    }
                }
            }
            
            await loadQuestions(selectedAssessment.id);
            setShowAIGeneratorModal(false);
            setAiGeneratedQuestions([]);
            setAiTopic('');
            alert(`✅ Added ${aiGeneratedQuestions.length} AI-generated questions!`);
        } catch (error) {
            console.error('Save error:', error);
            alert('Error saving questions. Please try again.');
        } finally {
            setSaving(false);
        }
    };
    
    const createAICompleteAssessment = async () => {
        if (!aiTopic.trim()) {
            alert('Please enter a topic for the assessment');
            return;
        }
        
        setGenerating(true);
        
        try {
            // FIXED (2026-08-22): same auth requirement as
            // generateAIQuestions above.
            const { data: { session } } = await supabase.auth.getSession();
            // FIXED: numberOfQuestions, not count — see generateAIQuestions.
            const questionsResponse = await fetch('/api/index?action=generate-assessment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    topic: aiTopic,
                    difficulty: aiDifficulty,
                    numberOfQuestions: aiQuestionCount
                })
            });
            
            const questionsData = await questionsResponse.json();
            const generatedQuestions = questionsData.success ? questionsData.questions : generateMockQuestions(aiTopic, aiQuestionCount, aiDifficulty);
            
            const assessmentTitle = `${aiTopic} Assessment`;
            const assessmentDescription = `Professional assessment measuring knowledge and skills in ${aiTopic}. Designed for ${aiDifficulty} level professionals.`;
            
            const { data: newAssessment, error: assessmentError } = await supabase
                .from('assessments')
                .insert({
                    title: assessmentTitle,
                    description: assessmentDescription,
                    instructions: `Complete this assessment to evaluate your ${aiTopic} knowledge. Answer each question thoughtfully.`,
                    assessment_type: 'general',
                    difficulty: aiDifficulty,
                    time_limit_minutes: Math.ceil(aiQuestionCount * 1.5),
                    question_count: generatedQuestions.length,
                    is_active: true
                })
                .select()
                .single();
            
            if (assessmentError) throw assessmentError;
            
            // FIXED: same question-shape mapping fix as saveAIGeneratedQuestions.
            for (let i = 0; i < generatedQuestions.length; i++) {
                const q = generatedQuestions[i];
                const hasOptions = Array.isArray(q.options) && q.options.length > 0;
                
                const { data: newQuestion, error: qError } = await supabase
                    .from('assessment_questions')
                    .insert({
                        assessment_id: newAssessment.id,
                        question_text: q.question_text || q.question,
                        question_type: q.question_type || (hasOptions ? 'multiple_choice' : 'likert_scale'),
                        points: q.points || 1,
                        dimension: q.dimension,
                        sort_order: i
                    })
                    .select()
                    .single();
                
                if (qError) {
                    console.error('Question insert error:', qError);
                    continue;
                }
                
                if (hasOptions && newQuestion) {
                    for (let j = 0; j < q.options.length; j++) {
                        await supabase.from('assessment_options').insert({
                            question_id: newQuestion.id,
                            option_text: q.options[j],
                            is_correct: j === q.correct,
                            sort_order: j
                        });
                    }
                }
            }
            
            await loadAssessments();
            setShowAIGeneratorModal(false);
            setAiTopic('');
            setAiGeneratedQuestions([]);
            alert(`✅ AI created complete assessment "${assessmentTitle}" with ${generatedQuestions.length} questions!`);
            
        } catch (error) {
            console.error('AI assessment creation error:', error);
            alert('Error creating AI assessment. Please try again.');
        } finally {
            setGenerating(false);
        }
    };
    
    // ============================================
    // CRUD HANDLERS
    // ============================================
    
    const handleAssessmentSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        
        try {
            if (editingAssessment) {
                await supabase
                    .from('assessments')
                    .update({ ...assessmentForm, updated_at: new Date().toISOString() })
                    .eq('id', editingAssessment.id);
            } else {
                await supabase.from('assessments').insert(assessmentForm);
            }
            
            setShowAssessmentModal(false);
            setEditingAssessment(null);
            resetAssessmentForm();
            await loadAssessments();
        } catch (error) {
            console.error('Assessment save error:', error);
            alert('Failed to save assessment');
        } finally {
            setSaving(false);
        }
    };
    
    const handleQuestionSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        
        const questionData = {
            question_text: questionForm.question_text,
            question_type: questionForm.question_type,
            points: questionForm.points,
            dimension: questionForm.dimension,
            sort_order: editingQuestion ? questionForm.sort_order : questions.length
        };
        
        try {
            let questionId;
            
            if (editingQuestion) {
                await supabase
                    .from('assessment_questions')
                    .update(questionData)
                    .eq('id', editingQuestion.id);
                questionId = editingQuestion.id;
            } else {
                const { data, error } = await supabase
                    .from('assessment_questions')
                    .insert({ ...questionData, assessment_id: selectedAssessment.id })
                    .select()
                    .single();
                if (!error) questionId = data.id;
            }
            
            // Handle options for multiple choice
            if (questionForm.question_type === 'multiple_choice' && questionForm.options.some(opt => opt.trim())) {
                await supabase.from('assessment_options').delete().eq('question_id', questionId);
                
                for (let i = 0; i < questionForm.options.length; i++) {
                    if (questionForm.options[i].trim()) {
                        await supabase.from('assessment_options').insert({
                            question_id: questionId,
                            option_text: questionForm.options[i],
                            is_correct: i === questionForm.correct_answer,
                            sort_order: i
                        });
                    }
                }
            }
            
            setShowQuestionModal(false);
            setEditingQuestion(null);
            resetQuestionForm();
            if (selectedAssessment) await loadQuestions(selectedAssessment.id);
            
            const newCount = editingQuestion ? questions.length : questions.length + 1;
            await supabase
                .from('assessments')
                .update({ question_count: newCount })
                .eq('id', selectedAssessment.id);
            
        } catch (error) {
            console.error('Question save error:', error);
            alert('Failed to save question');
        } finally {
            setSaving(false);
        }
    };
    
    const expandAssessment = async (assessment) => {
        if (expandedAssessment === assessment.id) {
            setExpandedAssessment(null);
            setSelectedAssessment(null);
        } else {
            setExpandedAssessment(assessment.id);
            setSelectedAssessment(assessment);
            await loadQuestions(assessment.id);
        }
    };
    
    const resetAssessmentForm = () => {
        setAssessmentForm({
            title: '', description: '', instructions: '', assessment_type: 'personality',
            difficulty: 'intermediate', time_limit_minutes: 30, is_active: true
        });
    };
    
    const resetQuestionForm = () => {
        setQuestionForm({
            question_text: '', question_type: 'likert_scale', points: 1, dimension: '', sort_order: 0,
            options: ['', '', '', ''], correct_answer: 0
        });
    };
    
    const getTypeBadge = (typeId) => {
        const type = ASSESSMENT_TYPES.find(t => t.id === typeId);
        const colors = {
            purple: 'bg-purple-500/20 text-purple-400 border-purple-500/20',
            pink: 'bg-pink-500/20 text-pink-400 border-pink-500/20',
            blue: 'bg-blue-500/20 text-blue-400 border-blue-500/20',
            green: 'bg-green-500/20 text-green-400 border-green-500/20',
            amber: 'bg-amber-500/20 text-amber-400 border-amber-500/20',
            cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/20',
            indigo: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/20',
            slate: 'bg-slate-500/20 text-slate-400 border-slate-500/20',
            gray: 'bg-gray-500/20 text-gray-400 border-gray-500/20'
        };
        return colors[type?.color || 'gray'] || colors.gray;
    };
    
    const getDifficultyBadge = (difficulty) => {
        const level = DIFFICULTY_LEVELS.find(d => d.value === difficulty);
        const colors = {
            beginner: 'bg-emerald-500/20 text-emerald-400',
            intermediate: 'bg-amber-500/20 text-amber-400',
            advanced: 'bg-red-500/20 text-red-400'
        };
        return colors[difficulty] || colors.intermediate;
    };
    
    if (adminLoading || assessmentsLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
                <span className="ml-2 text-slate-400">Loading assessment manager...</span>
            </div>
        );
    }
    
    if (!isAdmin) return null;
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                            <ClipboardList className="w-8 h-8 text-primary-400" />
                            Assessment Manager
                        </h1>
                        <p className="text-slate-400 mt-1">Create and manage psychometric assessments with AI assistance</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => { setShowAIGeneratorModal(true); setAiGeneratedQuestions([]); setAiTopic(''); setSelectedAssessment(null); }}
                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 flex items-center gap-2 shadow-lg shadow-purple-500/20"
                        >
                            <Sparkles className="w-4 h-4" /> AI Generate Assessment
                        </button>
                        <button
                            onClick={() => { setEditingAssessment(null); resetAssessmentForm(); setShowAssessmentModal(true); }}
                            className="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all duration-200 flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> Create Manual
                        </button>
                    </div>
                </div>
                
                {/* Stats Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                                <ClipboardList className="w-5 h-5 text-primary-400" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-white">{stats.total}</div>
                                <div className="text-sm text-slate-400">Total Assessments</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                <CheckCircle className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-white">{stats.active}</div>
                                <div className="text-sm text-slate-400">Active</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                <BarChart3 className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-white">{stats.totalQuestions}+</div>
                                <div className="text-sm text-slate-400">Total Questions</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-r from-purple-600/10 to-indigo-600/10 border border-purple-500/20 rounded-2xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                <Brain className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-purple-400">AI Powered</div>
                                <div className="text-sm text-slate-400">Smart Generation</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Filters & Search */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        <button
                            onClick={() => setFilterType('all')}
                            className={`px-3 py-1.5 rounded-lg text-sm transition ${
                                filterType === 'all' ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                        >
                            All Types
                        </button>
                        {ASSESSMENT_TYPES.map(type => (
                            <button
                                key={type.id}
                                onClick={() => setFilterType(type.id)}
                                className={`px-3 py-1.5 rounded-lg text-sm capitalize transition ${
                                    filterType === type.id ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                            >
                                {type.name.split(' ')[0]}
                            </button>
                        ))}
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search assessments..."
                            className="w-64 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
                        />
                    </div>
                </div>
                
                {/* Assessments List */}
                <div className="space-y-3">
                    {filteredAssessments.map(assessment => (
                        <div key={assessment.id} className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition">
                            <div 
                                className="p-5 flex items-center justify-between hover:bg-slate-800/30 cursor-pointer flex-wrap gap-4" 
                                onClick={() => expandAssessment(assessment)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center">
                                        <ClipboardList className="w-6 h-6 text-primary-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-semibold text-lg">{assessment.title}</h3>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeBadge(assessment.assessment_type)}`}>
                                                {ASSESSMENT_TYPES.find(t => t.id === assessment.assessment_type)?.name || assessment.assessment_type}
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${getDifficultyBadge(assessment.difficulty)}`}>
                                                {assessment.difficulty}
                                            </span>
                                            <span className="text-xs text-slate-500">{assessment.time_limit_minutes} min</span>
                                            <span className="text-xs text-slate-500">{assessment.question_count || 0} questions</span>
                                            <span className="text-xs text-slate-500">{assessment.instructions ? '📋 Has instructions' : ''}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {assessment.is_active ? (
                                        <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Active</span>
                                    ) : (
                                        <span className="text-xs text-slate-400 flex items-center gap-1"><XCircle className="w-3 h-3" /> Inactive</span>
                                    )}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); toggleStatus(assessment.id, assessment.is_active); }} 
                                        className="text-slate-400 hover:text-white text-sm transition"
                                    >
                                        {assessment.is_active ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <Link to={`/admin/assessments/${assessment.id}/edit`} onClick={(e) => e.stopPropagation()}>
                                        <button className="text-slate-400 hover:text-white transition p-1">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    </Link>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); deleteAssessment(assessment.id); }} 
                                        className="text-red-400 hover:text-red-300 transition p-1"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    {expandedAssessment === assessment.id ? 
                                        <ChevronDown className="w-5 h-5 text-slate-400" /> : 
                                        <ChevronRight className="w-5 h-5 text-slate-400" />
                                    }
                                </div>
                            </div>
                            
                            {/* Expanded Questions Section */}
                            {expandedAssessment === assessment.id && (
                                <div className="border-t border-slate-800 p-5 bg-slate-900/20">
                                    <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="w-5 h-5 text-primary-400" />
                                            <h4 className="text-white font-semibold">Questions ({questions.length})</h4>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { setSelectedAssessment(assessment); setShowAIGeneratorModal(true); setAiGeneratedQuestions([]); setAiTopic(''); }}
                                                className="px-3 py-1.5 bg-purple-600/20 text-purple-400 rounded-xl text-sm hover:bg-purple-600/30 transition flex items-center gap-1"
                                            >
                                                <Sparkles className="w-3 h-3" /> AI Generate
                                            </button>
                                            <button
                                                onClick={() => { setSelectedAssessment(assessment); setEditingQuestion(null); resetQuestionForm(); setQuestionForm(prev => ({ ...prev, sort_order: questions.length })); setShowQuestionModal(true); }}
                                                className="px-3 py-1.5 bg-primary-600 text-white rounded-xl text-sm hover:bg-primary-700 transition flex items-center gap-1"
                                            >
                                                <Plus className="w-3 h-3" /> Add Question
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {questionsLoading ? (
                                        <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-400" /></div>
                                    ) : questions.length === 0 ? (
                                        <div className="text-center py-12 bg-slate-800/30 rounded-xl">
                                            <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                                            <p className="text-slate-400">No questions yet</p>
                                            <button 
                                                onClick={() => { setSelectedAssessment(assessment); setShowAIGeneratorModal(true); setAiGeneratedQuestions([]); setAiTopic(''); }} 
                                                className="mt-3 text-purple-400 hover:underline flex items-center gap-1 mx-auto"
                                            >
                                                <Sparkles className="w-4 h-4" /> Generate questions with AI
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-96 overflow-y-auto">
                                            {questions.map((q, idx) => (
                                                <div key={q.id} className="bg-slate-800/30 rounded-xl p-3 flex justify-between items-start group hover:bg-slate-800/50 transition">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                                            <span className="text-xs text-slate-500 font-mono bg-slate-900 px-2 py-0.5 rounded">Q{idx + 1}</span>
                                                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                                q.question_type === 'likert_scale' ? 'bg-purple-500/20 text-purple-400' : 
                                                                q.question_type === 'multiple_choice' ? 'bg-emerald-500/20 text-emerald-400' :
                                                                'bg-amber-500/20 text-amber-400'
                                                            }`}>
                                                                {QUESTION_TYPES.find(t => t.value === q.question_type)?.label || q.question_type}
                                                            </span>
                                                            {q.dimension && <span className="text-xs text-slate-500">📊 {q.dimension}</span>}
                                                            <span className="text-xs text-slate-500">{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                                                        </div>
                                                        <p className="text-white text-sm">{q.question_text}</p>
                                                    </div>
                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                                        <button onClick={() => { setEditingQuestion(q); setQuestionForm({ ...q, options: ['', '', '', ''], correct_answer: 0 }); setShowQuestionModal(true); }} className="text-slate-400 hover:text-white p-1">
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => deleteQuestion(q.id, assessment.id)} className="text-red-400 hover:text-red-300 p-1">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    
                    {filteredAssessments.length === 0 && (
                        <div className="text-center py-16 bg-slate-900/50 border border-slate-800 rounded-2xl">
                            <Brain className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-400 text-lg">No assessments found</p>
                            <p className="text-slate-500 text-sm mt-1">Create your first assessment using AI or manual creation</p>
                            <button 
                                onClick={() => { setShowAIGeneratorModal(true); setSelectedAssessment(null); }} 
                                className="mt-4 px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 inline-flex items-center gap-2"
                            >
                                <Sparkles className="w-4 h-4" /> Create with AI
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Assessment Modal */}
            {showAssessmentModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white">{editingAssessment ? 'Edit Assessment' : 'Create Assessment'}</h2>
                            <button onClick={() => { setShowAssessmentModal(false); setEditingAssessment(null); resetAssessmentForm(); }} className="text-slate-400 hover:text-white transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAssessmentSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Title *</label>
                                <input 
                                    type="text" 
                                    value={assessmentForm.title} 
                                    onChange={e => setAssessmentForm({...assessmentForm, title: e.target.value})} 
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-primary-500" 
                                    required 
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Description</label>
                                <textarea 
                                    value={assessmentForm.description} 
                                    onChange={e => setAssessmentForm({...assessmentForm, description: e.target.value})} 
                                    rows="3" 
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-primary-500" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Instructions</label>
                                <textarea 
                                    value={assessmentForm.instructions} 
                                    onChange={e => setAssessmentForm({...assessmentForm, instructions: e.target.value})} 
                                    rows="2" 
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-primary-500" 
                                    placeholder="Instructions for test takers..." 
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Assessment Type</label>
                                <select 
                                    value={assessmentForm.assessment_type} 
                                    onChange={e => setAssessmentForm({...assessmentForm, assessment_type: e.target.value})} 
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-primary-500"
                                >
                                    {ASSESSMENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Difficulty</label>
                                    <select 
                                        value={assessmentForm.difficulty} 
                                        onChange={e => setAssessmentForm({...assessmentForm, difficulty: e.target.value})} 
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                                    >
                                        {DIFFICULTY_LEVELS.map(d => <option key={d.value} value={d.value} className="capitalize">{d.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Time Limit (minutes)</label>
                                    <input 
                                        type="number" 
                                        value={assessmentForm.time_limit_minutes} 
                                        onChange={e => setAssessmentForm({...assessmentForm, time_limit_minutes: parseInt(e.target.value)})} 
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white" 
                                        min="5" 
                                        max="180" 
                                    />
                                </div>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={assessmentForm.is_active} 
                                    onChange={e => setAssessmentForm({...assessmentForm, is_active: e.target.checked})} 
                                    className="w-4 h-4 rounded border-slate-600" 
                                />
                                <span className="text-white">Active (visible to users)</span>
                            </label>
                            <div className="flex gap-3 pt-2">
                                <button type="submit" disabled={saving} className="flex-1 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 transition">
                                    {saving ? 'Saving...' : (editingAssessment ? 'Update' : 'Create')}
                                </button>
                                <button type="button" onClick={() => { setShowAssessmentModal(false); setEditingAssessment(null); resetAssessmentForm(); }} className="flex-1 py-2 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 transition">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Question Modal */}
            {showQuestionModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white">{editingQuestion ? 'Edit Question' : 'Add Question'}</h2>
                            <button onClick={() => { setShowQuestionModal(false); setEditingQuestion(null); resetQuestionForm(); }} className="text-slate-400 hover:text-white transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleQuestionSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Question Text *</label>
                                <textarea 
                                    value={questionForm.question_text} 
                                    onChange={e => setQuestionForm({...questionForm, question_text: e.target.value})} 
                                    rows="3" 
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-primary-500" 
                                    required 
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Question Type</label>
                                    <select 
                                        value={questionForm.question_type} 
                                        onChange={e => setQuestionForm({...questionForm, question_type: e.target.value})} 
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                                    >
                                        {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Points</label>
                                    <input 
                                        type="number" 
                                        value={questionForm.points} 
                                        onChange={e => setQuestionForm({...questionForm, points: parseInt(e.target.value)})} 
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white" 
                                        min="1" 
                                        max="10" 
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Dimension (optional)</label>
                                <input 
                                    type="text" 
                                    value={questionForm.dimension} 
                                    onChange={e => setQuestionForm({...questionForm, dimension: e.target.value})} 
                                    placeholder="e.g., extraversion, empathy, leadership" 
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white" 
                                />
                            </div>
                            
                            {/* Multiple Choice Options */}
                            {questionForm.question_type === 'multiple_choice' && (
                                <div className="space-y-3 p-4 bg-slate-800/30 rounded-xl">
                                    <label className="block text-sm text-slate-400">Answer Options</label>
                                    {questionForm.options.map((opt, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="correct_answer"
                                                checked={questionForm.correct_answer === idx}
                                                onChange={() => setQuestionForm({...questionForm, correct_answer: idx})}
                                                className="w-4 h-4 text-emerald-500"
                                            />
                                            <input
                                                type="text"
                                                value={opt}
                                                onChange={e => {
                                                    const newOptions = [...questionForm.options];
                                                    newOptions[idx] = e.target.value;
                                                    setQuestionForm({...questionForm, options: newOptions});
                                                }}
                                                placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                                                className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                                            />
                                        </div>
                                    ))}
                                    <p className="text-xs text-slate-500 mt-2">✓ Select radio button for correct answer</p>
                                </div>
                            )}
                            
                            <div className="flex gap-3 pt-2">
                                <button type="submit" disabled={saving} className="flex-1 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 transition">
                                    {saving ? 'Saving...' : (editingQuestion ? 'Update' : 'Add Question')}
                                </button>
                                <button type="button" onClick={() => { setShowQuestionModal(false); setEditingQuestion(null); resetQuestionForm(); }} className="flex-1 py-2 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 transition">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* AI Generator Modal */}
            {showAIGeneratorModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Brain className="w-5 h-5 text-purple-400" />
                                AI Assessment Generator
                            </h2>
                            <button onClick={() => { setShowAIGeneratorModal(false); setAiGeneratedQuestions([]); setAiTopic(''); }} className="text-slate-400 hover:text-white transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="bg-gradient-to-r from-purple-600/10 to-indigo-600/10 border border-purple-500/20 rounded-xl p-4 mb-6">
                            <p className="text-purple-400 text-sm flex items-center gap-2">
                                <Sparkles className="w-4 h-4" />
                                AI will generate professional assessment questions based on your topic
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Assessment Topic *</label>
                                <input
                                    type="text"
                                    value={aiTopic}
                                    onChange={(e) => setAiTopic(e.target.value)}
                                    placeholder="e.g., Leadership in Remote Teams, Data Analytics, Customer Service Excellence"
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Difficulty Level</label>
                                    <select 
                                        value={aiDifficulty} 
                                        onChange={(e) => setAiDifficulty(e.target.value)} 
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                                    >
                                        {DIFFICULTY_LEVELS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Number of Questions</label>
                                    <input
                                        type="number"
                                        value={aiQuestionCount}
                                        onChange={(e) => setAiQuestionCount(Math.min(50, Math.max(5, parseInt(e.target.value) || 10)))}
                                        min="5"
                                        max="50"
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={selectedAssessment ? generateAIQuestions : createAICompleteAssessment}
                                disabled={generating || !aiTopic.trim()}
                                className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2"
                            >
                                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                {generating ? 'Generating...' : (selectedAssessment ? 'Generate Questions' : 'Create Complete Assessment')}
                            </button>

                            {aiGeneratedQuestions.length > 0 && (
                                <div className="mt-6 border-t border-slate-800 pt-4">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-white font-semibold">Generated Questions ({aiGeneratedQuestions.length})</h3>
                                    </div>
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {aiGeneratedQuestions.map((q, idx) => (
                                            <div key={idx} className="bg-slate-800/50 rounded-xl p-2 text-sm">
                                                <span className="text-slate-500 mr-2">{idx + 1}.</span>
                                                <span className="text-slate-300">{q.question_text || q.question}</span>
                                                {q.dimension && <span className="text-xs text-slate-500 ml-2">({q.dimension})</span>}
                                            </div>
                                        ))}
                                    </div>
                                    {selectedAssessment && (
                                        <button
                                            onClick={saveAIGeneratedQuestions}
                                            disabled={saving}
                                            className="mt-4 w-full py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all duration-200 flex items-center justify-center gap-2"
                                        >
                                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            Save {aiGeneratedQuestions.length} Questions to Assessment
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

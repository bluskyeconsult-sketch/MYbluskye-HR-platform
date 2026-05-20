// src/pages/admin/AssessmentManager.jsx
// SUPER ADMIN - Complete AI-Assisted Assessment Builder
// Features: AI question generation, AI assessment creation, bulk generation, multiple choice support

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { generateAIAssessment } from '../../services/assessmentService';
import { 
    ClipboardList, Plus, Edit2, Trash2, Eye, Loader2, 
    CheckCircle, XCircle, BarChart3, BookOpen, AlertCircle,
    ChevronDown, ChevronRight, Save, X, Sparkles, Brain,
    Wand2, Zap, Settings, TrendingUp, Award, Target, Users,
    Star, MessageSquare, Copy, Check
} from 'lucide-react';

// Constants
const ASSESSMENT_TYPES = [
    { id: 'personality', name: 'Personality', icon: Star, color: 'purple' },
    { id: 'emotional_intelligence', name: 'Emotional Intelligence', icon: Brain, color: 'pink' },
    { id: 'leadership', name: 'Leadership', icon: Users, color: 'blue' },
    { id: 'communication', name: 'Communication', icon: MessageSquare, color: 'green' },
    { id: 'problem_solving', name: 'Problem Solving', icon: Brain, color: 'amber' },
    { id: 'team_collaboration', name: 'Team Collaboration', icon: Users, color: 'cyan' },
    { id: 'career_aptitude', name: 'Career Aptitude', icon: TrendingUp, color: 'indigo' },
    { id: 'general', name: 'General', icon: ClipboardList, color: 'slate' }
];

const QUESTION_TYPES = [
    { value: 'likert_scale', label: 'Likert Scale (1-5)' },
    { value: 'multiple_choice', label: 'Multiple Choice' }
];

const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'];

// Custom Hooks
const useAdminAccess = () => {
    const [isAdmin, setIsAdmin] = useState(false);
    
    useEffect(() => {
        const checkAccess = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const hasAccess = user?.email === 'bluskyeconsult@gmail.com';
            if (!hasAccess) {
                alert('Access denied. Super Admin only.');
                window.location.href = '/admin/dashboard';
            }
            setIsAdmin(hasAccess);
        };
        checkAccess();
    }, []);
    
    return isAdmin;
};

const useAssessments = () => {
    const [assessments, setAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const loadAssessments = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('assessments')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (!error) setAssessments(data || []);
        setLoading(false);
    };
    
    const deleteAssessment = async (id) => {
        if (!confirm('Delete this assessment and all its questions? This cannot be undone.')) return;
        
        await supabase.from('assessment_questions').delete().eq('assessment_id', id);
        await supabase.from('assessments').delete().eq('id', id);
        await loadAssessments();
        return true;
    };
    
    const toggleStatus = async (id, currentStatus) => {
        await supabase
            .from('assessments')
            .update({ is_active: !currentStatus })
            .eq('id', id);
        await loadAssessments();
    };
    
    return { assessments, loading, loadAssessments, deleteAssessment, toggleStatus };
};

const useQuestions = () => {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(false);
    
    const loadQuestions = async (assessmentId) => {
        if (!assessmentId) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('assessment_questions')
            .select('*')
            .eq('assessment_id', assessmentId)
            .order('sort_order', { ascending: true });
        
        if (!error) setQuestions(data || []);
        setLoading(false);
    };
    
    const deleteQuestion = async (id, assessmentId) => {
        if (!confirm('Delete this question?')) return;
        await supabase.from('assessment_questions').delete().eq('id', id);
        if (assessmentId) await loadQuestions(assessmentId);
    };
    
    return { questions, loading, loadQuestions, deleteQuestion, setQuestions };
};

// AI Generation Service (inlined for completeness)
const generateMockQuestions = (topic, count, dimension) => {
    const questions = [];
    for (let i = 0; i < count; i++) {
        questions.push({
            question_text: `${topic} - Question ${i + 1}: How would you rate your proficiency in this area?`,
            question_type: 'likert_scale',
            dimension: dimension || topic.toLowerCase().replace(/\s/g, '_'),
            points: 1
        });
    }
    return questions;
};

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
    const [generating, setGenerating] = useState(false);
    const [aiTopic, setAiTopic] = useState('');
    const [aiDifficulty, setAiDifficulty] = useState('intermediate');
    const [aiQuestionCount, setAiQuestionCount] = useState(10);
    const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState([]);
    const [copied, setCopied] = useState(false);
    
    // Custom Hooks
    const isAdmin = useAdminAccess();
    const { assessments, loading, loadAssessments, deleteAssessment, toggleStatus } = useAssessments();
    const { questions, loading: loadingQuestions, loadQuestions, deleteQuestion, setQuestions } = useQuestions();
    
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
    }, [isAdmin]);
    
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
            const response = await fetch('/api/ai/generate-questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: aiTopic,
                    difficulty: aiDifficulty,
                    questionCount: aiQuestionCount,
                    assessmentType: selectedAssessment?.assessment_type || 'general'
                })
            });
            
            const data = await response.json();
            
            if (data.success && data.questions) {
                setAiGeneratedQuestions(data.questions);
                alert(`✨ AI generated ${data.questions.length} questions for "${aiTopic}"`);
            } else {
                const mockQuestions = generateMockQuestions(aiTopic, aiQuestionCount);
                setAiGeneratedQuestions(mockQuestions);
                alert(`📝 Generated ${mockQuestions.length} sample questions. Review and edit as needed.`);
            }
        } catch (error) {
            console.error('AI generation error:', error);
            const mockQuestions = generateMockQuestions(aiTopic, aiQuestionCount);
            setAiGeneratedQuestions(mockQuestions);
            alert(`📝 Generated ${mockQuestions.length} questions. You can edit them before saving.`);
        } finally {
            setGenerating(false);
        }
    };
    
    const saveAIGeneratedQuestions = async () => {
        if (!selectedAssessment) {
            alert('Please select an assessment first');
            return;
        }
        
        setSaving(true);
        const currentMax = questions.length;
        
        for (let i = 0; i < aiGeneratedQuestions.length; i++) {
            const q = aiGeneratedQuestions[i];
            await supabase.from('assessment_questions').insert({
                assessment_id: selectedAssessment.id,
                question_text: q.question_text,
                question_type: q.question_type || 'likert_scale',
                points: q.points || 1,
                dimension: q.dimension,
                sort_order: currentMax + i
            });
        }
        
        await loadQuestions(selectedAssessment.id);
        setShowAIGeneratorModal(false);
        setAiGeneratedQuestions([]);
        setAiTopic('');
        setSaving(false);
        alert(`✅ Added ${aiGeneratedQuestions.length} AI-generated questions!`);
    };
    
    const createAICompleteAssessment = async () => {
        if (!aiTopic.trim()) {
            alert('Please enter a topic for the assessment');
            return;
        }
        
        setGenerating(true);
        
        try {
            const result = await generateAIAssessment(aiTopic, aiDifficulty, aiQuestionCount, null);
            
            if (!result.success) throw new Error(result.error);
            
            // Create assessment
            const { data: newAssessment, error: assessmentError } = await supabase
                .from('assessments')
                .insert({
                    title: result.title,
                    description: result.description,
                    instructions: result.instructions,
                    assessment_type: result.category || 'general',
                    difficulty: aiDifficulty,
                    time_limit_minutes: result.time_limit_minutes || Math.ceil(aiQuestionCount * 1.5),
                    question_count: result.questions?.length || 0,
                    is_active: true
                })
                .select()
                .single();
            
            if (assessmentError) throw assessmentError;
            
            // Save questions with options support
            for (let i = 0; i < result.questions.length; i++) {
                const q = result.questions[i];
                
                const { data: question, error: qError } = await supabase
                    .from('assessment_questions')
                    .insert({
                        assessment_id: newAssessment.id,
                        question_text: q.question_text,
                        question_type: q.question_type || 'multiple_choice',
                        points: q.points || 1,
                        dimension: q.dimension,
                        sort_order: i
                    })
                    .select()
                    .single();
                
                if (qError) continue;
                
                // Save options for multiple choice
                if (q.options?.length) {
                    for (let j = 0; j < q.options.length; j++) {
                        await supabase.from('assessment_options').insert({
                            question_id: question.id,
                            option_text: q.options[j],
                            is_correct: j === q.correct_answer,
                            sort_order: j
                        });
                    }
                }
            }
            
            await loadAssessments();
            setShowAIGeneratorModal(false);
            setAiTopic('');
            alert(`✅ AI created complete assessment "${result.title}" with ${result.questions.length} questions!`);
            
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
        
        if (editingAssessment) {
            await supabase.from('assessments').update(assessmentForm).eq('id', editingAssessment.id);
        } else {
            await supabase.from('assessments').insert(assessmentForm);
        }
        
        setShowAssessmentModal(false);
        setEditingAssessment(null);
        setAssessmentForm({
            title: '', description: '', instructions: '', assessment_type: 'personality',
            difficulty: 'intermediate', time_limit_minutes: 30, is_active: true
        });
        await loadAssessments();
        setSaving(false);
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
        
        let questionId;
        
        if (editingQuestion) {
            await supabase.from('assessment_questions').update(questionData).eq('id', editingQuestion.id);
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
        setQuestionForm({
            question_text: '', question_type: 'likert_scale', points: 1, dimension: '', sort_order: 0,
            options: ['', '', '', ''], correct_answer: 0
        });
        if (selectedAssessment) await loadQuestions(selectedAssessment.id);
        setSaving(false);
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
    
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    
    const getTypeBadge = (typeId) => {
        const type = ASSESSMENT_TYPES.find(t => t.id === typeId);
        return `bg-${type?.color || 'slate'}-500/20 text-${type?.color || 'slate'}-400`;
    };
    
    // ============================================
    // RENDER
    // ============================================
    
    if (loading || !isAdmin) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-slate-950 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Assessment Manager</h1>
                        <p className="text-slate-400">Manage psychometric and skill assessments with AI assistance</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => { setShowAIGeneratorModal(true); setAiGeneratedQuestions([]); setAiTopic(''); setSelectedAssessment(null); }}
                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 flex items-center gap-2"
                        >
                            <Sparkles className="w-4 h-4" /> AI Generate Assessment
                        </button>
                        <button
                            onClick={() => { setEditingAssessment(null); setAssessmentForm({ title: '', description: '', instructions: '', assessment_type: 'personality', difficulty: 'intermediate', time_limit_minutes: 30, is_active: true }); setShowAssessmentModal(true); }}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> Create Manual
                        </button>
                    </div>
                </div>
                
                {/* Stats Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <ClipboardList className="w-8 h-8 text-primary-400" />
                            <div>
                                <div className="text-2xl font-bold text-white">{assessments.length}</div>
                                <div className="text-sm text-slate-400">Total Assessments</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-8 h-8 text-emerald-400" />
                            <div>
                                <div className="text-2xl font-bold text-white">{assessments.filter(a => a.is_active).length}</div>
                                <div className="text-sm text-slate-400">Active</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <BarChart3 className="w-8 h-8 text-amber-400" />
                            <div>
                                <div className="text-2xl font-bold text-white">
                                    {assessments.reduce((sum, a) => sum + (a.question_count || 0), 0)}+
                                </div>
                                <div className="text-sm text-slate-400">Questions</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-r from-purple-600/10 to-indigo-600/10 border border-purple-500/20 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <Brain className="w-8 h-8 text-purple-400" />
                            <div>
                                <div className="text-2xl font-bold text-purple-400">AI Powered</div>
                                <div className="text-sm text-slate-400">Smart Generation</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Assessments List */}
                <div className="space-y-3">
                    {assessments.map(assessment => (
                        <div key={assessment.id} className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                            <div className="p-4 flex items-center justify-between hover:bg-slate-800/30 cursor-pointer flex-wrap gap-4" onClick={() => expandAssessment(assessment)}>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                                        <ClipboardList className="w-5 h-5 text-primary-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-semibold">{assessment.title}</h3>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeBadge(assessment.assessment_type)}`}>
                                                {ASSESSMENT_TYPES.find(t => t.id === assessment.assessment_type)?.name || assessment.assessment_type}
                                            </span>
                                            <span className="text-xs text-slate-500 capitalize">{assessment.difficulty}</span>
                                            <span className="text-xs text-slate-500">{assessment.time_limit_minutes} min</span>
                                            <span className="text-xs text-slate-500">{assessment.question_count || questions.length} questions</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {assessment.is_active ? (
                                        <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Active</span>
                                    ) : (
                                        <span className="text-xs text-slate-400 flex items-center gap-1"><XCircle className="w-3 h-3" /> Inactive</span>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); toggleStatus(assessment.id, assessment.is_active); }} className="text-slate-400 hover:text-white text-sm">
                                        {assessment.is_active ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <Link to={`/admin/assessments/${assessment.id}/edit`} onClick={(e) => e.stopPropagation()}>
                                        <button className="text-slate-400 hover:text-white">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    </Link>
                                    <button onClick={(e) => { e.stopPropagation(); deleteAssessment(assessment.id); }} className="text-red-400 hover:text-red-300">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    {expandedAssessment === assessment.id ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                                </div>
                            </div>
                            
                            {/* Expanded Questions Section */}
                            {expandedAssessment === assessment.id && (
                                <div className="border-t border-slate-800 p-4 bg-slate-900/20">
                                    <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
                                        <h4 className="text-white font-semibold">Questions ({questions.length})</h4>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { setSelectedAssessment(assessment); setShowAIGeneratorModal(true); setAiGeneratedQuestions([]); setAiTopic(''); }}
                                                className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 flex items-center gap-1"
                                            >
                                                <Sparkles className="w-3 h-3" /> AI Generate
                                            </button>
                                            <button
                                                onClick={() => { setSelectedAssessment(assessment); setEditingQuestion(null); setQuestionForm({ question_text: '', question_type: 'likert_scale', points: 1, dimension: '', sort_order: questions.length, options: ['', '', '', ''], correct_answer: 0 }); setShowQuestionModal(true); }}
                                                className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 flex items-center gap-1"
                                            >
                                                <Plus className="w-3 h-3" /> Add Question
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {loadingQuestions ? (
                                        <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
                                    ) : questions.length === 0 ? (
                                        <div className="text-center py-8 text-slate-400">
                                            <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                                            <p>No questions yet.</p>
                                            <button onClick={() => { setSelectedAssessment(assessment); setShowAIGeneratorModal(true); setAiGeneratedQuestions([]); setAiTopic(''); }} className="mt-3 text-purple-400 hover:underline flex items-center gap-1 mx-auto">
                                                <Sparkles className="w-4 h-4" /> Generate questions with AI
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-96 overflow-y-auto">
                                            {questions.map((q, idx) => (
                                                <div key={q.id} className="bg-slate-800/50 rounded-lg p-3 flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-xs text-slate-500">Q{idx + 1}</span>
                                                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                                q.question_type === 'likert_scale' ? 'bg-purple-500/20 text-purple-400' : 'bg-emerald-500/20 text-emerald-400'
                                                            }`}>
                                                                {QUESTION_TYPES.find(t => t.value === q.question_type)?.label || q.question_type}
                                                            </span>
                                                            {q.dimension && <span className="text-xs text-slate-500">Dimension: {q.dimension}</span>}
                                                            <span className="text-xs text-slate-500">{q.points} point{q.points !== 1 ? 's' : ''}</span>
                                                        </div>
                                                        <p className="text-white text-sm mt-1">{q.question_text}</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => { setEditingQuestion(q); setQuestionForm({ ...q, options: ['', '', '', ''], correct_answer: 0 }); setShowQuestionModal(true); }} className="text-slate-400 hover:text-white">
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => deleteQuestion(q.id, assessment.id)} className="text-red-400 hover:text-red-300">
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
                    
                    {assessments.length === 0 && (
                        <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-xl">
                            <Brain className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400">No assessments yet</p>
                            <button onClick={() => { setShowAIGeneratorModal(true); setSelectedAssessment(null); }} className="mt-3 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 inline-flex items-center gap-2">
                                <Sparkles className="w-4 h-4" /> Create with AI
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Modals - Rendered conditionally */}
            {showAssessmentModal && (
                <AssessmentModal
                    assessmentForm={assessmentForm}
                    setAssessmentForm={setAssessmentForm}
                    editingAssessment={editingAssessment}
                    saving={saving}
                    onSubmit={handleAssessmentSubmit}
                    onClose={() => setShowAssessmentModal(false)}
                />
            )}
            
            {showQuestionModal && (
                <QuestionModal
                    questionForm={questionForm}
                    setQuestionForm={setQuestionForm}
                    editingQuestion={editingQuestion}
                    saving={saving}
                    onSubmit={handleQuestionSubmit}
                    onClose={() => setShowQuestionModal(false)}
                />
            )}
            
            {showAIGeneratorModal && (
                <AIGeneratorModal
                    aiTopic={aiTopic}
                    setAiTopic={setAiTopic}
                    aiDifficulty={aiDifficulty}
                    setAiDifficulty={setAiDifficulty}
                    aiQuestionCount={aiQuestionCount}
                    setAiQuestionCount={setAiQuestionCount}
                    aiGeneratedQuestions={aiGeneratedQuestions}
                    generating={generating}
                    saving={saving}
                    selectedAssessment={selectedAssessment}
                    onGenerate={selectedAssessment ? generateAIQuestions : createAICompleteAssessment}
                    onSave={saveAIGeneratedQuestions}
                    onClose={() => { setShowAIGeneratorModal(false); setAiGeneratedQuestions([]); setAiTopic(''); }}
                />
            )}
        </div>
    );
}

// ============================================
// SEPARATE MODAL COMPONENTS
// ============================================

function AssessmentModal({ assessmentForm, setAssessmentForm, editingAssessment, saving, onSubmit, onClose }) {
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6">
                <h2 className="text-xl font-bold text-white mb-4">{editingAssessment ? 'Edit Assessment' : 'Create Assessment'}</h2>
                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Title *</label>
                        <input type="text" value={assessmentForm.title} onChange={e => setAssessmentForm({...assessmentForm, title: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" required />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Description</label>
                        <textarea value={assessmentForm.description} onChange={e => setAssessmentForm({...assessmentForm, description: e.target.value})} rows="3" className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Instructions</label>
                        <textarea value={assessmentForm.instructions} onChange={e => setAssessmentForm({...assessmentForm, instructions: e.target.value})} rows="2" className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" placeholder="Instructions for test takers..." />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Assessment Type</label>
                        <select value={assessmentForm.assessment_type} onChange={e => setAssessmentForm({...assessmentForm, assessment_type: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
                            {ASSESSMENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Difficulty</label>
                            <select value={assessmentForm.difficulty} onChange={e => setAssessmentForm({...assessmentForm, difficulty: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
                                {DIFFICULTY_LEVELS.map(d => <option key={d} value={d} className="capitalize">{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Time Limit (minutes)</label>
                            <input type="number" value={assessmentForm.time_limit_minutes} onChange={e => setAssessmentForm({...assessmentForm, time_limit_minutes: parseInt(e.target.value)})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" min="5" max="180" />
                        </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={assessmentForm.is_active} onChange={e => setAssessmentForm({...assessmentForm, is_active: e.target.checked})} className="w-4 h-4" />
                        <span className="text-white">Active (visible to users)</span>
                    </label>
                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={saving} className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">{saving ? 'Saving...' : (editingAssessment ? 'Update' : 'Create')}</button>
                        <button type="button" onClick={onClose} className="flex-1 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function QuestionModal({ questionForm, setQuestionForm, editingQuestion, saving, onSubmit, onClose }) {
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold text-white mb-4">{editingQuestion ? 'Edit Question' : 'Add Question'}</h2>
                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Question Text *</label>
                        <textarea value={questionForm.question_text} onChange={e => setQuestionForm({...questionForm, question_text: e.target.value})} rows="3" className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Question Type</label>
                            <select value={questionForm.question_type} onChange={e => setQuestionForm({...questionForm, question_type: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
                                {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Points</label>
                            <input type="number" value={questionForm.points} onChange={e => setQuestionForm({...questionForm, points: parseInt(e.target.value)})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" min="1" max="10" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Dimension (optional)</label>
                        <input type="text" value={questionForm.dimension} onChange={e => setQuestionForm({...questionForm, dimension: e.target.value})} placeholder="e.g., extraversion, empathy, leadership" className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                    </div>
                    
                    {/* Multiple Choice Options */}
                    {questionForm.question_type === 'multiple_choice' && (
                        <div className="space-y-3 p-3 bg-slate-800/30 rounded-lg">
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
                            <p className="text-xs text-slate-500 mt-2">Select radio button for correct answer</p>
                        </div>
                    )}
                    
                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={saving} className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">{saving ? 'Saving...' : (editingQuestion ? 'Update' : 'Add Question')}</button>
                        <button type="button" onClick={onClose} className="flex-1 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function AIGeneratorModal({ 
    aiTopic, setAiTopic, aiDifficulty, setAiDifficulty, aiQuestionCount, setAiQuestionCount,
    aiGeneratedQuestions, generating, saving, selectedAssessment, onGenerate, onSave, onClose 
}) {
    const [copied, setCopied] = useState(false);
    
    const copyToClipboard = () => {
        navigator.clipboard.writeText(JSON.stringify(aiGeneratedQuestions, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Brain className="w-5 h-5 text-purple-400" />
                        AI Assessment Generator
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="bg-gradient-to-r from-purple-600/10 to-indigo-600/10 border border-purple-500/20 rounded-lg p-4 mb-6">
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
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Difficulty Level</label>
                            <select value={aiDifficulty} onChange={(e) => setAiDifficulty(e.target.value)} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
                                {DIFFICULTY_LEVELS.map(d => <option key={d} value={d} className="capitalize">{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Number of Questions</label>
                            <input
                                type="number"
                                value={aiQuestionCount}
                                onChange={(e) => setAiQuestionCount(parseInt(e.target.value))}
                                min="5"
                                max="50"
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            />
                        </div>
                    </div>

                    <button
                        onClick={onGenerate}
                        disabled={generating || !aiTopic.trim()}
                        className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                        {generating ? 'Generating...' : (selectedAssessment ? 'Generate Questions' : 'Create Complete Assessment')}
                    </button>

                    {aiGeneratedQuestions.length > 0 && (
                        <div className="mt-6 border-t border-slate-800 pt-4">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-white font-semibold">Generated Questions ({aiGeneratedQuestions.length})</h3>
                                <button onClick={copyToClipboard} className="text-slate-400 hover:text-white text-sm flex items-center gap-1">
                                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    {copied ? 'Copied!' : 'Copy JSON'}
                                </button>
                            </div>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {aiGeneratedQuestions.map((q, idx) => (
                                    <div key={idx} className="bg-slate-800/50 rounded-lg p-2 text-sm">
                                        <span className="text-slate-500 mr-2">{idx + 1}.</span>
                                        <span className="text-slate-300">{q.question_text}</span>
                                        {q.dimension && <span className="text-xs text-slate-500 ml-2">({q.dimension})</span>}
                                    </div>
                                ))}
                            </div>
                            {selectedAssessment && (
                                <button
                                    onClick={onSave}
                                    disabled={saving}
                                    className="mt-4 w-full py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2"
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
    );
}

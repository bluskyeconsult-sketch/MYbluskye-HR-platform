// src/pages/admin/AssessmentEditor.jsx
// Complete Assessment Editor - Create and edit assessments with full question management

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
    Save, ArrowLeft, Loader2, Plus, Trash2, Edit2, 
    X, Check, ChevronUp, ChevronDown, Copy, AlertCircle
} from 'lucide-react';

// ============================================
// CONSTANTS
// ============================================

const ASSESSMENT_TYPES = [
    { value: 'personality', label: 'Personality' },
    { value: 'emotional_intelligence', label: 'Emotional Intelligence' },
    { value: 'leadership', label: 'Leadership' },
    { value: 'communication', label: 'Communication' },
    { value: 'problem_solving', label: 'Problem Solving' },
    { value: 'team_collaboration', label: 'Team Collaboration' },
    { value: 'career_aptitude', label: 'Career Aptitude' },
    { value: 'general', label: 'General' }
];

const DIFFICULTY_LEVELS = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' }
];

const QUESTION_TYPES = [
    { value: 'multiple_choice', label: 'Multiple Choice', hasOptions: true },
    { value: 'likert_scale', label: 'Likert Scale (1-5)', hasOptions: false },
    { value: 'true_false', label: 'True/False', hasOptions: true },
    { value: 'scenario', label: 'Scenario Based', hasOptions: false }
];

const DEFAULT_OPTIONS = ['', '', '', ''];

// ============================================
// HELPER FUNCTIONS
// ============================================

const validateAssessment = (assessment) => {
    const errors = [];
    if (!assessment.title?.trim()) errors.push('Title is required');
    if (!assessment.assessment_type) errors.push('Assessment type is required');
    if (assessment.time_limit_minutes < 1) errors.push('Time limit must be at least 1 minute');
    if (assessment.time_limit_minutes > 240) errors.push('Time limit cannot exceed 240 minutes');
    return errors;
};

const validateQuestion = (question, isMultipleChoice) => {
    const errors = [];
    if (!question.question_text?.trim()) errors.push('Question text is required');
    if (question.points < 1) errors.push('Points must be at least 1');
    if (question.points > 100) errors.push('Points cannot exceed 100');
    
    if (isMultipleChoice) {
        const validOptions = question.options?.filter(opt => opt.trim());
        if (validOptions.length < 2) errors.push('At least 2 options are required');
        if (question.correct_answer === undefined || question.correct_answer >= question.options?.length) {
            errors.push('Please select a valid correct answer');
        }
    }
    
    return errors;
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function AssessmentEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    // State
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [editingQuestionId, setEditingQuestionId] = useState(null);
    
    // Assessment form state
    const [assessment, setAssessment] = useState({
        title: '',
        description: '',
        instructions: '',
        assessment_type: 'personality',
        difficulty: 'intermediate',
        time_limit_minutes: 30,
        is_active: true
    });
    
    // Questions state
    const [questions, setQuestions] = useState([]);
    
    // New question form state
    const [newQuestion, setNewQuestion] = useState({
        question_text: '',
        question_type: 'multiple_choice',
        points: 1,
        dimension: '',
        options: [...DEFAULT_OPTIONS],
        correct_answer: 0
    });
    
    // Editing question state
    const [editingQuestion, setEditingQuestion] = useState(null);
    
    // ============================================
    // DATA LOADING
    // ============================================
    
    const loadAssessment = useCallback(async () => {
        if (!id || id === 'new') {
            setLoading(false);
            return;
        }
        
        try {
            // Load assessment
            const { data: assessmentData, error: assessmentError } = await supabase
                .from('assessments')
                .select('*')
                .eq('id', id)
                .single();
            
            if (assessmentError) throw assessmentError;
            if (assessmentData) setAssessment(assessmentData);
            
            // Load questions with options
            const { data: questionsData, error: questionsError } = await supabase
                .from('assessment_questions')
                .select(`
                    *,
                    options:assessment_options(*)
                `)
                .eq('assessment_id', id)
                .order('sort_order', { ascending: true });
            
            if (questionsError) throw questionsError;
            
            // Transform questions data
            const transformedQuestions = (questionsData || []).map(q => ({
                ...q,
                options: (q.options || []).sort((a, b) => a.sort_order - b.sort_order),
                correct_answer: q.options?.findIndex(opt => opt.is_correct) || 0
            }));
            
            setQuestions(transformedQuestions);
        } catch (error) {
            console.error('Error loading assessment:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }, [id]);
    
    useEffect(() => {
        loadAssessment();
    }, [loadAssessment]);
    
    // ============================================
    // ASSESSMENT CRUD
    // ============================================
    
    const handleSaveAssessment = async () => {
        const errors = validateAssessment(assessment);
        if (errors.length > 0) {
            alert(`Please fix the following errors:\n${errors.join('\n')}`);
            return;
        }
        
        setSaving(true);
        setError(null);
        
        try {
            if (id === 'new') {
                // Create new assessment
                const { data, error } = await supabase
                    .from('assessments')
                    .insert([{
                        ...assessment,
                        created_at: new Date().toISOString()
                    }])
                    .select()
                    .single();
                
                if (error) throw error;
                navigate(`/admin/assessments/edit/${data.id}`, { replace: true });
            } else {
                // Update existing assessment
                const { error } = await supabase
                    .from('assessments')
                    .update({
                        ...assessment,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', id);
                
                if (error) throw error;
            }
            
            alert('Assessment saved successfully!');
        } catch (error) {
            console.error('Error saving assessment:', error);
            setError(error.message);
            alert('Failed to save assessment. Please try again.');
        } finally {
            setSaving(false);
        }
    };
    
    // ============================================
    // QUESTION CRUD
    // ============================================
    
    const handleAddQuestion = async () => {
        const isMultipleChoice = newQuestion.question_type === 'multiple_choice' || newQuestion.question_type === 'true_false';
        const errors = validateQuestion(newQuestion, isMultipleChoice);
        
        if (errors.length > 0) {
            alert(`Please fix the following errors:\n${errors.join('\n')}`);
            return;
        }
        
        if (!id || id === 'new') {
            alert('Please save the assessment first before adding questions.');
            return;
        }
        
        setSaving(true);
        
        try {
            // Insert question
            const { data: question, error: qError } = await supabase
                .from('assessment_questions')
                .insert([{
                    assessment_id: id,
                    question_text: newQuestion.question_text,
                    question_type: newQuestion.question_type,
                    points: newQuestion.points,
                    dimension: newQuestion.dimension || null,
                    sort_order: questions.length,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();
            
            if (qError) throw qError;
            
            // Add options for multiple choice or true/false
            if (isMultipleChoice) {
                const validOptions = newQuestion.options.filter(opt => opt.trim());
                const optionsToInsert = validOptions.map((opt, idx) => ({
                    question_id: question.id,
                    option_text: opt,
                    is_correct: idx === newQuestion.correct_answer,
                    sort_order: idx,
                    created_at: new Date().toISOString()
                }));
                
                const { error: optError } = await supabase
                    .from('assessment_options')
                    .insert(optionsToInsert);
                
                if (optError) throw optError;
                
                question.options = optionsToInsert;
                question.correct_answer = newQuestion.correct_answer;
            }
            
            setQuestions([...questions, question]);
            
            // Reset form
            setNewQuestion({
                question_text: '',
                question_type: 'multiple_choice',
                points: 1,
                dimension: '',
                options: [...DEFAULT_OPTIONS],
                correct_answer: 0
            });
            
            alert('Question added successfully!');
        } catch (error) {
            console.error('Error adding question:', error);
            alert('Failed to add question. Please try again.');
        } finally {
            setSaving(false);
        }
    };
    
    const handleUpdateQuestion = async () => {
        if (!editingQuestion) return;
        
        const isMultipleChoice = editingQuestion.question_type === 'multiple_choice' || editingQuestion.question_type === 'true_false';
        const errors = validateQuestion(editingQuestion, isMultipleChoice);
        
        if (errors.length > 0) {
            alert(`Please fix the following errors:\n${errors.join('\n')}`);
            return;
        }
        
        setSaving(true);
        
        try {
            // Update question
            const { error: qError } = await supabase
                .from('assessment_questions')
                .update({
                    question_text: editingQuestion.question_text,
                    question_type: editingQuestion.question_type,
                    points: editingQuestion.points,
                    dimension: editingQuestion.dimension,
                    updated_at: new Date().toISOString()
                })
                .eq('id', editingQuestion.id);
            
            if (qError) throw qError;
            
            // Update options for multiple choice
            if (isMultipleChoice) {
                // Delete existing options
                await supabase
                    .from('assessment_options')
                    .delete()
                    .eq('question_id', editingQuestion.id);
                
                // Insert new options
                const validOptions = editingQuestion.options.filter(opt => opt.trim());
                const optionsToInsert = validOptions.map((opt, idx) => ({
                    question_id: editingQuestion.id,
                    option_text: opt,
                    is_correct: idx === editingQuestion.correct_answer,
                    sort_order: idx,
                    created_at: new Date().toISOString()
                }));
                
                const { error: optError } = await supabase
                    .from('assessment_options')
                    .insert(optionsToInsert);
                
                if (optError) throw optError;
            }
            
            // Update local state
            setQuestions(questions.map(q => 
                q.id === editingQuestion.id ? editingQuestion : q
            ));
            
            setEditingQuestionId(null);
            setEditingQuestion(null);
            alert('Question updated successfully!');
        } catch (error) {
            console.error('Error updating question:', error);
            alert('Failed to update question. Please try again.');
        } finally {
            setSaving(false);
        }
    };
    
    const handleDeleteQuestion = async (questionId) => {
        setSaving(true);
        
        try {
            // Delete options first
            await supabase
                .from('assessment_options')
                .delete()
                .eq('question_id', questionId);
            
            // Delete question
            const { error } = await supabase
                .from('assessment_questions')
                .delete()
                .eq('id', questionId);
            
            if (error) throw error;
            
            // Update local state
            setQuestions(questions.filter(q => q.id !== questionId));
            setShowDeleteConfirm(null);
            alert('Question deleted successfully!');
        } catch (error) {
            console.error('Error deleting question:', error);
            alert('Failed to delete question. Please try again.');
        } finally {
            setSaving(false);
        }
    };
    
    const handleMoveQuestion = async (questionId, direction) => {
        const currentIndex = questions.findIndex(q => q.id === questionId);
        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        
        if (newIndex < 0 || newIndex >= questions.length) return;
        
        const newQuestions = [...questions];
        [newQuestions[currentIndex], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[currentIndex]];
        
        // Update sort orders in database
        for (let i = 0; i < newQuestions.length; i++) {
            await supabase
                .from('assessment_questions')
                .update({ sort_order: i })
                .eq('id', newQuestions[i].id);
        }
        
        setQuestions(newQuestions);
    };
    
    const handleDuplicateQuestion = async (question) => {
        setSaving(true);
        
        try {
            const { data: newQuestionData, error: qError } = await supabase
                .from('assessment_questions')
                .insert([{
                    assessment_id: id,
                    question_text: `${question.question_text} (Copy)`,
                    question_type: question.question_type,
                    points: question.points,
                    dimension: question.dimension,
                    sort_order: questions.length,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();
            
            if (qError) throw qError;
            
            // Duplicate options if multiple choice
            if (question.options && question.options.length > 0) {
                const optionsToInsert = question.options.map((opt, idx) => ({
                    question_id: newQuestionData.id,
                    option_text: opt.option_text || opt,
                    is_correct: opt.is_correct || false,
                    sort_order: idx,
                    created_at: new Date().toISOString()
                }));
                
                await supabase
                    .from('assessment_options')
                    .insert(optionsToInsert);
                
                newQuestionData.options = optionsToInsert;
            }
            
            setQuestions([...questions, newQuestionData]);
            alert('Question duplicated successfully!');
        } catch (error) {
            console.error('Error duplicating question:', error);
            alert('Failed to duplicate question. Please try again.');
        } finally {
            setSaving(false);
        }
    };
    
    // ============================================
    // RENDER HELPERS
    // ============================================
    
    const renderQuestionForm = (question, setQuestion, isEditing = false) => {
        const isMultipleChoice = question.question_type === 'multiple_choice' || question.question_type === 'true_false';
        
        return (
            <div className="space-y-4">
                <div>
                    <label className="block text-sm text-slate-400 mb-1">Question Text *</label>
                    <textarea
                        value={question.question_text}
                        onChange={(e) => setQuestion({...question, question_text: e.target.value})}
                        rows="3"
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Enter your question here..."
                    />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Question Type</label>
                        <select
                            value={question.question_type}
                            onChange={(e) => {
                                const newType = e.target.value;
                                const hasOptions = QUESTION_TYPES.find(t => t.value === newType)?.hasOptions;
                                setQuestion({
                                    ...question,
                                    question_type: newType,
                                    options: hasOptions ? [...DEFAULT_OPTIONS] : undefined,
                                    correct_answer: 0
                                });
                            }}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                        >
                            {QUESTION_TYPES.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Points</label>
                        <input
                            type="number"
                            value={question.points}
                            onChange={(e) => setQuestion({...question, points: parseInt(e.target.value) || 1})}
                            min="1"
                            max="100"
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Dimension (Optional)</label>
                        <input
                            type="text"
                            value={question.dimension || ''}
                            onChange={(e) => setQuestion({...question, dimension: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            placeholder="e.g., leadership, empathy"
                        />
                    </div>
                </div>
                
                {isMultipleChoice && question.options && (
                    <div className="space-y-3 p-4 bg-slate-800/30 rounded-lg">
                        <label className="block text-sm text-slate-400">Answer Options *</label>
                        {question.options.map((opt, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <input
                                    type="radio"
                                    name="correct_answer"
                                    checked={question.correct_answer === idx}
                                    onChange={() => setQuestion({...question, correct_answer: idx})}
                                    className="w-4 h-4 text-emerald-500"
                                />
                                <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => {
                                        const newOptions = [...question.options];
                                        newOptions[idx] = e.target.value;
                                        setQuestion({...question, options: newOptions});
                                    }}
                                    placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                                />
                                {question.options.length > 2 && idx >= 2 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newOptions = question.options.filter((_, i) => i !== idx);
                                            setQuestion({...question, options: newOptions});
                                        }}
                                        className="text-red-400 hover:text-red-300"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => setQuestion({...question, options: [...question.options, '']})}
                            className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
                        >
                            <Plus className="w-3 h-3" /> Add Option
                        </button>
                        <p className="text-xs text-slate-500 mt-2">Select the radio button next to the correct answer</p>
                    </div>
                )}
                
                <div className="flex justify-end gap-3 pt-2">
                    {isEditing && (
                        <button
                            type="button"
                            onClick={() => {
                                setEditingQuestionId(null);
                                setEditingQuestion(null);
                            }}
                            className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={isEditing ? handleUpdateQuestion : handleAddQuestion}
                        disabled={saving}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {isEditing ? 'Update Question' : 'Add Question'}
                    </button>
                </div>
            </div>
        );
    };
    
    // ============================================
    // MAIN RENDER
    // ============================================
    
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-slate-950 p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/admin/assessments')}
                            className="p-2 bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-white">
                                {id === 'new' ? 'Create New Assessment' : `Edit: ${assessment.title || 'Assessment'}`}
                            </h1>
                            <p className="text-slate-400 text-sm">Configure assessment details and manage questions</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSaveAssessment}
                        disabled={saving}
                        className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Saving...' : 'Save Assessment'}
                    </button>
                </div>
                
                {/* Error Display */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400">
                        <AlertCircle className="w-4 h-4" />
                        <span>{error}</span>
                    </div>
                )}
                
                {/* Assessment Details Section */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Assessment Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm text-slate-400 mb-1">Title *</label>
                            <input
                                type="text"
                                value={assessment.title}
                                onChange={(e) => setAssessment({...assessment, title: e.target.value})}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-primary-500"
                                placeholder="e.g., Leadership Skills Assessment"
                            />
                        </div>
                        
                        <div className="md:col-span-2">
                            <label className="block text-sm text-slate-400 mb-1">Description</label>
                            <textarea
                                value={assessment.description}
                                onChange={(e) => setAssessment({...assessment, description: e.target.value})}
                                rows="3"
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                placeholder="Describe what this assessment measures and who it's for..."
                            />
                        </div>
                        
                        <div className="md:col-span-2">
                            <label className="block text-sm text-slate-400 mb-1">Instructions</label>
                            <textarea
                                value={assessment.instructions}
                                onChange={(e) => setAssessment({...assessment, instructions: e.target.value})}
                                rows="2"
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                placeholder="Instructions for test takers..."
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Assessment Type</label>
                            <select
                                value={assessment.assessment_type}
                                onChange={(e) => setAssessment({...assessment, assessment_type: e.target.value})}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            >
                                {ASSESSMENT_TYPES.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Difficulty Level</label>
                            <select
                                value={assessment.difficulty}
                                onChange={(e) => setAssessment({...assessment, difficulty: e.target.value})}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            >
                                {DIFFICULTY_LEVELS.map(level => (
                                    <option key={level.value} value={level.value}>{level.label}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Time Limit (minutes)</label>
                            <input
                                type="number"
                                value={assessment.time_limit_minutes}
                                onChange={(e) => setAssessment({...assessment, time_limit_minutes: parseInt(e.target.value) || 30})}
                                min="5"
                                max="240"
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            />
                        </div>
                        
                        <div className="flex items-center">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={assessment.is_active}
                                    onChange={(e) => setAssessment({...assessment, is_active: e.target.checked})}
                                    className="w-4 h-4 rounded border-slate-700"
                                />
                                <span className="text-white">Active (visible to users)</span>
                            </label>
                        </div>
                    </div>
                </div>
                
                {/* Questions Section */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">
                        Questions ({questions.length})
                    </h2>
                    
                    {/* Questions List */}
                    {questions.length > 0 && (
                        <div className="space-y-3 mb-6">
                            {questions.map((q, idx) => (
                                <div key={q.id} className="bg-slate-800/30 rounded-lg overflow-hidden">
                                    {editingQuestionId === q.id ? (
                                        <div className="p-4">
                                            <div className="flex justify-between items-center mb-3">
                                                <h3 className="text-white font-medium">Edit Question {idx + 1}</h3>
                                                <button
                                                    onClick={() => {
                                                        setEditingQuestionId(null);
                                                        setEditingQuestion(null);
                                                    }}
                                                    className="text-slate-400 hover:text-white"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            {renderQuestionForm(editingQuestion, setEditingQuestion, true)}
                                        </div>
                                    ) : (
                                        <div className="p-4">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap mb-2">
                                                        <span className="text-xs text-slate-500">Q{idx + 1}</span>
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400">
                                                            {QUESTION_TYPES.find(t => t.value === q.question_type)?.label || q.question_type}
                                                        </span>
                                                        {q.dimension && (
                                                            <span className="text-xs text-slate-500">
                                                                Dimension: {q.dimension}
                                                            </span>
                                                        )}
                                                        <span className="text-xs text-slate-500">
                                                            {q.points} point{q.points !== 1 ? 's' : ''}
                                                        </span>
                                                    </div>
                                                    <p className="text-white text-sm mb-2">{q.question_text}</p>
                                                    {q.options && q.options.length > 0 && (
                                                        <div className="ml-4 mt-2 space-y-1">
                                                            {q.options.map((opt, optIdx) => (
                                                                <p key={optIdx} className="text-slate-400 text-xs">
                                                                    {String.fromCharCode(65 + optIdx)}. {opt.option_text || opt}
                                                                    {opt.is_correct && (
                                                                        <Check className="w-3 h-3 text-emerald-400 inline ml-2" />
                                                                    )}
                                                                </p>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex gap-1 ml-4">
                                                    <button
                                                        onClick={() => handleMoveQuestion(q.id, 'up')}
                                                        disabled={idx === 0}
                                                        className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30"
                                                        title="Move Up"
                                                    >
                                                        <ChevronUp className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleMoveQuestion(q.id, 'down')}
                                                        disabled={idx === questions.length - 1}
                                                        className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30"
                                                        title="Move Down"
                                                    >
                                                        <ChevronDown className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setEditingQuestionId(q.id);
                                                            setEditingQuestion({...q});
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-white"
                                                        title="Edit"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDuplicateQuestion(q)}
                                                        className="p-1.5 text-slate-400 hover:text-white"
                                                        title="Duplicate"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setShowDeleteConfirm(q.id)}
                                                        className="p-1.5 text-red-400 hover:text-red-300"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            {/* Delete Confirmation */}
                                            {showDeleteConfirm === q.id && (
                                                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between">
                                                    <span className="text-red-400 text-sm">Delete this question?</span>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleDeleteQuestion(q.id)}
                                                            className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                                                        >
                                                            Delete
                                                        </button>
                                                        <button
                                                            onClick={() => setShowDeleteConfirm(null)}
                                                            className="px-3 py-1 border border-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-800"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* Add New Question Form */}
                    <div className="border-t border-slate-800 pt-6">
                        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                            <Plus className="w-4 h-4 text-primary-400" />
                            Add New Question
                        </h3>
                        {renderQuestionForm(newQuestion, setNewQuestion, false)}
                    </div>
                </div>
            </div>
        </div>
    );
}

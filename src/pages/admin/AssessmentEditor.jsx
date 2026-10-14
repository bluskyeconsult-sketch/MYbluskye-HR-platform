// src/pages/admin/AssessmentEditor.jsx
// Assessment Editor - edit an assessment and manage its questions.
// Route: /admin/assessments/:id/edit (opened from Assessment Manager).
//
// REVIEWED AND FIXED (2026-10-13). Problems found and fixed:
// 1. Saving a NEW assessment sent you to /admin/assessments/edit/<id>, a
//    route that does not exist (the real one is /admin/assessments/<id>/edit),
//    so you landed on an empty page. Corrected.
// 2. Editing an existing multiple-choice question crashed the form: loaded
//    options are database rows ({option_text, is_correct}) but the form
//    treats each option as plain text, so the boxes showed "[object Object]"
//    and the Update button threw an error. Options are now converted to
//    text when editing starts, and the correct answer is worked out
//    properly (it used to fall back to the wrong answer when none was
//    marked).
// 3. The correct-answer radio button pointed at a position in the full list
//    of boxes, but the save only kept the non-empty boxes, so leaving
//    Option B blank and ticking Option C stored the wrong answer as
//    correct. The position is now mapped before blanks are dropped, and a
//    tick on a blank box is refused.
// 4. Updating a question deleted its old options first and then inserted
//    the new ones; if the second step failed the question was left with no
//    options at all. New options are now inserted first and the old ones
//    removed only afterwards.
// 5. True/False questions started with four empty boxes. They now start
//    with True and False.
// 6. Every save/delete/add popped up a browser alert, and a failed step in
//    several places was not reported at all. Results now show in one
//    banner at the top, and all database steps are checked for errors.
// 7. After adding, updating or duplicating, the list reloads from the
//    database so it always matches what is saved (ids, order, ticks).
// 8. Assessment details and questions no longer send timestamp columns the
//    database fills in itself.
//
// NOTE FOR THE OWNER (updated 2026-10-14): multiple-choice and true/false
// answers are now marked on the server (assessment-objective-check), and
// members receive questions with the answer keys removed
// (assessment-questions). After you run lock-assessment-answer-keys.sql,
// only admins can read the question and option tables directly, which is
// what this editor does, so nothing here changes.

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
    Save, ArrowLeft, Loader2, Plus, Trash2, Edit2,
    X, Check, ChevronUp, ChevronDown, Copy, AlertCircle
} from 'lucide-react';

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

const hasOptionsFor = (type) => QUESTION_TYPES.find(t => t.value === type)?.hasOptions === true;
const defaultOptionsFor = (type) => (type === 'true_false' ? ['True', 'False'] : ['', '', '', '']);
const blankQuestion = () => ({
    question_text: '',
    question_type: 'multiple_choice',
    points: 1,
    dimension: '',
    options: defaultOptionsFor('multiple_choice'),
    correct_answer: 0
});

const validateAssessment = (a) => {
    const errors = [];
    if (!a.title?.trim()) errors.push('Title is required');
    if (!a.assessment_type) errors.push('Assessment type is required');
    if (!(a.time_limit_minutes >= 1)) errors.push('Time limit must be at least 1 minute');
    if (a.time_limit_minutes > 240) errors.push('Time limit cannot exceed 240 minutes');
    return errors;
};

const validateQuestion = (q) => {
    const errors = [];
    if (!q.question_text?.trim()) errors.push('Question text is required');
    if (!(q.points >= 1)) errors.push('Points must be at least 1');
    if (q.points > 100) errors.push('Points cannot exceed 100');
    if (hasOptionsFor(q.question_type)) {
        const filled = (q.options || []).filter(o => o.trim());
        if (filled.length < 2) errors.push('At least 2 options are required');
        if (!(q.options || [])[q.correct_answer]?.trim()) errors.push('Select a correct answer that is not an empty option');
    }
    return errors;
};

// Turn a stored question (options as rows) into the shape the form edits
// (options as text, correct answer as a position).
const toFormQuestion = (q) => {
    const rows = [...(q.options || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const idx = rows.findIndex(o => o.is_correct);
    return {
        ...q,
        options: rows.map(o => (typeof o === 'string' ? o : o.option_text || '')),
        correct_answer: idx >= 0 ? idx : 0
    };
};

// Keep the position of the correct answer correct when blank boxes are dropped.
const buildOptionRows = (questionId, q) => {
    const rows = [];
    (q.options || []).forEach((text, originalIndex) => {
        if (!text.trim()) return;
        rows.push({
            question_id: questionId,
            option_text: text.trim(),
            is_correct: originalIndex === q.correct_answer,
            sort_order: rows.length
        });
    });
    return rows;
};

export default function AssessmentEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = !id || id === 'new';

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState(null); // { type: 'ok' | 'error', text }
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [editingQuestionId, setEditingQuestionId] = useState(null);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [assessment, setAssessment] = useState({
        title: '', description: '', instructions: '',
        assessment_type: 'personality', difficulty: 'intermediate',
        time_limit_minutes: 30, is_active: true
    });
    const [questions, setQuestions] = useState([]);
    const [newQuestion, setNewQuestion] = useState(blankQuestion());

    const loadQuestions = useCallback(async () => {
        const { data, error } = await supabase
            .from('assessment_questions')
            .select('*, options:assessment_options(*)')
            .eq('assessment_id', id)
            .order('sort_order', { ascending: true });
        if (error) throw error;
        setQuestions((data || []).map(q => ({
            ...q,
            options: [...(q.options || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        })));
    }, [id]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (isNew) { setLoading(false); return; }
            try {
                const { data, error } = await supabase.from('assessments').select('*').eq('id', id).single();
                if (error) throw error;
                if (!cancelled && data) setAssessment(prev => ({ ...prev, ...data }));
                await loadQuestions();
            } catch (err) {
                console.error('Error loading assessment:', err);
                if (!cancelled) setNotice({ type: 'error', text: `Could not load this assessment: ${err.message}` });
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [id, isNew, loadQuestions]);

    const detailsPayload = () => ({
        title: assessment.title.trim(),
        description: assessment.description,
        instructions: assessment.instructions,
        assessment_type: assessment.assessment_type,
        difficulty: assessment.difficulty,
        time_limit_minutes: assessment.time_limit_minutes,
        is_active: assessment.is_active
    });

    const handleSaveAssessment = async () => {
        const errors = validateAssessment(assessment);
        if (errors.length) { setNotice({ type: 'error', text: errors.join('. ') + '.' }); return; }
        setSaving(true);
        setNotice(null);
        try {
            if (isNew) {
                const { data, error } = await supabase.from('assessments').insert([detailsPayload()]).select().single();
                if (error) throw error;
                navigate(`/admin/assessments/${data.id}/edit`, { replace: true });
            } else {
                const { error } = await supabase.from('assessments').update(detailsPayload()).eq('id', id);
                if (error) throw error;
                setNotice({ type: 'ok', text: 'Assessment saved.' });
            }
        } catch (err) {
            console.error('Error saving assessment:', err);
            setNotice({ type: 'error', text: `Could not save the assessment: ${err.message}` });
        } finally {
            setSaving(false);
        }
    };

    const handleAddQuestion = async () => {
        if (isNew) { setNotice({ type: 'error', text: 'Save the assessment first, then add questions.' }); return; }
        const errors = validateQuestion(newQuestion);
        if (errors.length) { setNotice({ type: 'error', text: errors.join('. ') + '.' }); return; }
        setSaving(true);
        setNotice(null);
        try {
            const { data: question, error: qError } = await supabase
                .from('assessment_questions')
                .insert([{
                    assessment_id: id,
                    question_text: newQuestion.question_text.trim(),
                    question_type: newQuestion.question_type,
                    points: newQuestion.points,
                    dimension: newQuestion.dimension?.trim() || null,
                    sort_order: questions.length
                }])
                .select()
                .single();
            if (qError) throw qError;

            if (hasOptionsFor(newQuestion.question_type)) {
                const { error: optError } = await supabase.from('assessment_options').insert(buildOptionRows(question.id, newQuestion));
                if (optError) {
                    // Do not leave a multiple-choice question with no options.
                    await supabase.from('assessment_questions').delete().eq('id', question.id);
                    throw optError;
                }
            }
            await loadQuestions();
            setNewQuestion(blankQuestion());
            setNotice({ type: 'ok', text: 'Question added.' });
        } catch (err) {
            console.error('Error adding question:', err);
            setNotice({ type: 'error', text: `Could not add the question: ${err.message}` });
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateQuestion = async () => {
        if (!editingQuestion) return;
        const errors = validateQuestion(editingQuestion);
        if (errors.length) { setNotice({ type: 'error', text: errors.join('. ') + '.' }); return; }
        setSaving(true);
        setNotice(null);
        try {
            const { error: qError } = await supabase
                .from('assessment_questions')
                .update({
                    question_text: editingQuestion.question_text.trim(),
                    question_type: editingQuestion.question_type,
                    points: editingQuestion.points,
                    dimension: editingQuestion.dimension?.trim() || null
                })
                .eq('id', editingQuestion.id);
            if (qError) throw qError;

            // Replace the options safely: add the new set first, remove the old
            // set only once the new one is in.
            const { data: oldRows, error: oldError } = await supabase
                .from('assessment_options').select('id').eq('question_id', editingQuestion.id);
            if (oldError) throw oldError;

            if (hasOptionsFor(editingQuestion.question_type)) {
                const { error: insError } = await supabase
                    .from('assessment_options').insert(buildOptionRows(editingQuestion.id, editingQuestion));
                if (insError) throw insError;
            }
            if (oldRows && oldRows.length > 0) {
                const { error: delError } = await supabase
                    .from('assessment_options').delete().in('id', oldRows.map(r => r.id));
                if (delError) throw delError;
            }

            await loadQuestions();
            setEditingQuestionId(null);
            setEditingQuestion(null);
            setNotice({ type: 'ok', text: 'Question updated.' });
        } catch (err) {
            console.error('Error updating question:', err);
            setNotice({ type: 'error', text: `Could not update the question: ${err.message}` });
            try { await loadQuestions(); } catch { /* keep the banner */ }
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteQuestion = async (questionId) => {
        setSaving(true);
        setNotice(null);
        try {
            const { error: optError } = await supabase.from('assessment_options').delete().eq('question_id', questionId);
            if (optError) throw optError;
            const { error } = await supabase.from('assessment_questions').delete().eq('id', questionId);
            if (error) throw error;
            await loadQuestions();
            setDeleteConfirmId(null);
            setNotice({ type: 'ok', text: 'Question deleted.' });
        } catch (err) {
            console.error('Error deleting question:', err);
            setNotice({ type: 'error', text: `Could not delete the question: ${err.message}` });
        } finally {
            setSaving(false);
        }
    };

    const handleMoveQuestion = async (questionId, direction) => {
        const from = questions.findIndex(q => q.id === questionId);
        const to = direction === 'up' ? from - 1 : from + 1;
        if (to < 0 || to >= questions.length) return;
        const reordered = [...questions];
        [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
        setQuestions(reordered);
        const results = await Promise.all(
            reordered.map((q, i) => supabase.from('assessment_questions').update({ sort_order: i }).eq('id', q.id))
        );
        const failed = results.find(r => r.error);
        if (failed) {
            setNotice({ type: 'error', text: `Could not save the new order: ${failed.error.message}` });
            try { await loadQuestions(); } catch { /* keep the banner */ }
        }
    };

    const handleDuplicateQuestion = async (question) => {
        setSaving(true);
        setNotice(null);
        try {
            const { data: copy, error: qError } = await supabase
                .from('assessment_questions')
                .insert([{
                    assessment_id: id,
                    question_text: `${question.question_text} (Copy)`,
                    question_type: question.question_type,
                    points: question.points,
                    dimension: question.dimension,
                    sort_order: questions.length
                }])
                .select()
                .single();
            if (qError) throw qError;

            if (question.options && question.options.length > 0) {
                const rows = question.options.map((o, i) => ({
                    question_id: copy.id,
                    option_text: o.option_text ?? o,
                    is_correct: o.is_correct === true,
                    sort_order: i
                }));
                const { error: optError } = await supabase.from('assessment_options').insert(rows);
                if (optError) {
                    await supabase.from('assessment_questions').delete().eq('id', copy.id);
                    throw optError;
                }
            }
            await loadQuestions();
            setNotice({ type: 'ok', text: 'Question duplicated.' });
        } catch (err) {
            console.error('Error duplicating question:', err);
            setNotice({ type: 'error', text: `Could not duplicate the question: ${err.message}` });
        } finally {
            setSaving(false);
        }
    };

    const renderQuestionForm = (question, setQuestion, isEditing = false) => {
        const withOptions = hasOptionsFor(question.question_type);
        return (
            <div className="space-y-4">
                <div>
                    <label className="block text-sm text-slate-400 mb-1">Question Text *</label>
                    <textarea
                        value={question.question_text}
                        onChange={(e) => setQuestion({ ...question, question_text: e.target.value })}
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
                                const type = e.target.value;
                                setQuestion({
                                    ...question,
                                    question_type: type,
                                    options: hasOptionsFor(type) ? defaultOptionsFor(type) : [],
                                    correct_answer: 0
                                });
                            }}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                        >
                            {QUESTION_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Points</label>
                        <input
                            type="number" min="1" max="100"
                            value={question.points}
                            onChange={(e) => setQuestion({ ...question, points: parseInt(e.target.value, 10) || 1 })}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Dimension (Optional)</label>
                        <input
                            type="text"
                            value={question.dimension || ''}
                            onChange={(e) => setQuestion({ ...question, dimension: e.target.value })}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            placeholder="e.g., leadership, empathy"
                        />
                    </div>
                </div>

                {withOptions && (
                    <div className="space-y-3 p-4 bg-slate-800/30 rounded-lg">
                        <label className="block text-sm text-slate-400">Answer Options *</label>
                        {(question.options || []).map((opt, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <input
                                    type="radio"
                                    name={isEditing ? 'correct_answer_edit' : 'correct_answer_new'}
                                    checked={question.correct_answer === idx}
                                    onChange={() => setQuestion({ ...question, correct_answer: idx })}
                                    className="w-4 h-4 text-emerald-500"
                                    title="Mark as the correct answer"
                                />
                                <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => {
                                        const next = [...question.options];
                                        next[idx] = e.target.value;
                                        setQuestion({ ...question, options: next });
                                    }}
                                    placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                                />
                                {question.question_type !== 'true_false' && question.options.length > 2 && idx >= 2 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const next = question.options.filter((_, i) => i !== idx);
                                            setQuestion({
                                                ...question,
                                                options: next,
                                                correct_answer: question.correct_answer === idx ? 0 : (question.correct_answer > idx ? question.correct_answer - 1 : question.correct_answer)
                                            });
                                        }}
                                        className="text-red-400 hover:text-red-300"
                                        title="Remove this option"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                        {question.question_type !== 'true_false' && (
                            <button
                                type="button"
                                onClick={() => setQuestion({ ...question, options: [...(question.options || []), ''] })}
                                className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
                            >
                                <Plus className="w-3 h-3" /> Add Option
                            </button>
                        )}
                        <p className="text-xs text-slate-500 mt-2">Select the radio button next to the correct answer. Empty options are ignored.</p>
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                    {isEditing && (
                        <button
                            type="button"
                            onClick={() => { setEditingQuestionId(null); setEditingQuestion(null); }}
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/admin/assessments')}
                            className="p-2 bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
                            title="Back to assessments"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-white">
                                {isNew ? 'Create New Assessment' : `Edit: ${assessment.title || 'Assessment'}`}
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

                {notice && (
                    <div className={`mb-6 p-4 rounded-lg flex items-start gap-2 text-sm border ${notice.type === 'ok' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border-red-500/20 text-red-300'}`}>
                        {notice.type === 'error' ? <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                        <span>{notice.text}</span>
                    </div>
                )}

                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Assessment Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm text-slate-400 mb-1">Title *</label>
                            <input
                                type="text"
                                value={assessment.title || ''}
                                onChange={(e) => setAssessment({ ...assessment, title: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-primary-500"
                                placeholder="e.g., Leadership Skills Assessment"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm text-slate-400 mb-1">Description</label>
                            <textarea
                                value={assessment.description || ''}
                                onChange={(e) => setAssessment({ ...assessment, description: e.target.value })}
                                rows="3"
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                placeholder="Describe what this assessment measures and who it's for..."
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm text-slate-400 mb-1">Instructions</label>
                            <textarea
                                value={assessment.instructions || ''}
                                onChange={(e) => setAssessment({ ...assessment, instructions: e.target.value })}
                                rows="2"
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                placeholder="Instructions for test takers..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Assessment Type</label>
                            <select
                                value={assessment.assessment_type || 'personality'}
                                onChange={(e) => setAssessment({ ...assessment, assessment_type: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            >
                                {ASSESSMENT_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Difficulty Level</label>
                            <select
                                value={assessment.difficulty || 'intermediate'}
                                onChange={(e) => setAssessment({ ...assessment, difficulty: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            >
                                {DIFFICULTY_LEVELS.map(level => <option key={level.value} value={level.value}>{level.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Time Limit (minutes)</label>
                            <input
                                type="number" min="1" max="240"
                                value={assessment.time_limit_minutes ?? 30}
                                onChange={(e) => setAssessment({ ...assessment, time_limit_minutes: parseInt(e.target.value, 10) || 0 })}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            />
                        </div>
                        <div className="flex items-center">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={assessment.is_active !== false}
                                    onChange={(e) => setAssessment({ ...assessment, is_active: e.target.checked })}
                                    className="w-4 h-4 rounded border-slate-700"
                                />
                                <span className="text-white">Active (visible to users)</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Questions ({questions.length})</h2>

                    {questions.length > 0 && (
                        <div className="space-y-3 mb-6">
                            {questions.map((q, idx) => (
                                <div key={q.id} className="bg-slate-800/30 rounded-lg overflow-hidden">
                                    {editingQuestionId === q.id && editingQuestion ? (
                                        <div className="p-4">
                                            <div className="flex justify-between items-center mb-3">
                                                <h3 className="text-white font-medium">Edit Question {idx + 1}</h3>
                                                <button onClick={() => { setEditingQuestionId(null); setEditingQuestion(null); }} className="text-slate-400 hover:text-white">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            {renderQuestionForm(editingQuestion, setEditingQuestion, true)}
                                        </div>
                                    ) : (
                                        <div className="p-4">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap mb-2">
                                                        <span className="text-xs text-slate-500">Q{idx + 1}</span>
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400">
                                                            {QUESTION_TYPES.find(t => t.value === q.question_type)?.label || q.question_type}
                                                        </span>
                                                        {q.dimension && <span className="text-xs text-slate-500">Dimension: {q.dimension}</span>}
                                                        <span className="text-xs text-slate-500">{q.points} point{q.points !== 1 ? 's' : ''}</span>
                                                    </div>
                                                    <p className="text-white text-sm mb-2">{q.question_text}</p>
                                                    {q.options && q.options.length > 0 && (
                                                        <div className="ml-4 mt-2 space-y-1">
                                                            {q.options.map((opt, optIdx) => (
                                                                <p key={opt.id || optIdx} className="text-slate-400 text-xs">
                                                                    {String.fromCharCode(65 + optIdx)}. {opt.option_text}
                                                                    {opt.is_correct && <Check className="w-3 h-3 text-emerald-400 inline ml-2" />}
                                                                </p>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex gap-1 ml-4 flex-shrink-0">
                                                    <button onClick={() => handleMoveQuestion(q.id, 'up')} disabled={idx === 0} className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30" title="Move Up"><ChevronUp className="w-4 h-4" /></button>
                                                    <button onClick={() => handleMoveQuestion(q.id, 'down')} disabled={idx === questions.length - 1} className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30" title="Move Down"><ChevronDown className="w-4 h-4" /></button>
                                                    <button onClick={() => { setEditingQuestionId(q.id); setEditingQuestion(toFormQuestion(q)); }} className="p-1.5 text-slate-400 hover:text-white" title="Edit"><Edit2 className="w-4 h-4" /></button>
                                                    <button onClick={() => handleDuplicateQuestion(q)} disabled={saving} className="p-1.5 text-slate-400 hover:text-white disabled:opacity-40" title="Duplicate"><Copy className="w-4 h-4" /></button>
                                                    <button onClick={() => setDeleteConfirmId(q.id)} className="p-1.5 text-red-400 hover:text-red-300" title="Delete"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </div>

                                            {deleteConfirmId === q.id && (
                                                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between">
                                                    <span className="text-red-400 text-sm">Delete this question?</span>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleDeleteQuestion(q.id)} disabled={saving} className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">Delete</button>
                                                        <button onClick={() => setDeleteConfirmId(null)} className="px-3 py-1 border border-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-800">Cancel</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="border-t border-slate-800 pt-6">
                        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                            <Plus className="w-4 h-4 text-primary-400" />
                            Add New Question
                        </h3>
                        {isNew && <p className="text-amber-400 text-sm mb-3">Save the assessment first, then add questions.</p>}
                        {renderQuestionForm(newQuestion, setNewQuestion, false)}
                    </div>
                </div>
            </div>
        </div>
    );
}

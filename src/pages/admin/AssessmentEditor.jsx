// src/pages/admin/AssessmentEditor.jsx
// Assessment Editor - Create and edit assessments

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, Plus, Trash2, Save, ArrowLeft } from 'lucide-react';

export default function AssessmentEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [assessment, setAssessment] = useState({
        title: '',
        description: '',
        instructions: '',
        assessment_type: 'personality',
        difficulty: 'intermediate',
        time_limit_minutes: 30,
        is_active: true
    });
    const [questions, setQuestions] = useState([]);
    const [newQuestion, setNewQuestion] = useState({
        question_text: '',
        question_type: 'multiple_choice',
        points: 1,
        options: ['', '', '', ''],
        correct_answer: 0
    });

    useEffect(() => {
        if (id && id !== 'new') {
            loadAssessment();
        } else {
            setLoading(false);
        }
    }, [id]);

    async function loadAssessment() {
        const { data, error } = await supabase
            .from('assessments')
            .select('*')
            .eq('id', id)
            .single();
        
        if (data) setAssessment(data);
        
        const { data: questionsData } = await supabase
            .from('assessment_questions')
            .select('*')
            .eq('assessment_id', id)
            .order('sort_order');
        
        setQuestions(questionsData || []);
        setLoading(false);
    }

    async function handleSave() {
        setSaving(true);
        
        let assessmentId = id;
        
        if (id === 'new') {
            const { data, error } = await supabase
                .from('assessments')
                .insert(assessment)
                .select()
                .single();
            
            if (error) throw error;
            assessmentId = data.id;
            navigate(`/admin/assessments/edit/${assessmentId}`);
        } else {
            await supabase
                .from('assessments')
                .update(assessment)
                .eq('id', id);
        }
        
        setSaving(false);
        alert('Assessment saved successfully!');
    }

    async function addQuestion() {
        if (!newQuestion.question_text) return;
        
        const { data, error } = await supabase
            .from('assessment_questions')
            .insert({
                assessment_id: id,
                question_text: newQuestion.question_text,
                question_type: newQuestion.question_type,
                points: newQuestion.points,
                sort_order: questions.length
            })
            .select()
            .single();
        
        if (error) throw error;
        
        // Add options for multiple choice
        if (newQuestion.question_type === 'multiple_choice') {
            for (let i = 0; i < newQuestion.options.length; i++) {
                await supabase
                    .from('assessment_options')
                    .insert({
                        question_id: data.id,
                        option_text: newQuestion.options[i],
                        is_correct: i === newQuestion.correct_answer,
                        sort_order: i
                    });
            }
        }
        
        setQuestions([...questions, data]);
        setNewQuestion({
            question_text: '',
            question_type: 'multiple_choice',
            points: 1,
            options: ['', '', '', ''],
            correct_answer: 0
        });
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate('/admin/assessments')} className="p-2 bg-slate-800 rounded-lg text-slate-300 hover:text-white">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-white">
                        {id === 'new' ? 'Create Assessment' : 'Edit Assessment'}
                    </h1>
                    <p className="text-slate-400">Configure assessment details and questions</p>
                </div>
                <button onClick={handleSave} disabled={saving} className="ml-auto px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2">
                    <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Assessment'}
                </button>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-6">
                <h2 className="text-lg font-semibold text-white mb-4">Assessment Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Title</label>
                        <input type="text" value={assessment.title} onChange={(e) => setAssessment({...assessment, title: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Assessment Type</label>
                        <select value={assessment.assessment_type} onChange={(e) => setAssessment({...assessment, assessment_type: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
                            <option value="personality">Personality</option>
                            <option value="emotional_intelligence">Emotional Intelligence</option>
                            <option value="leadership">Leadership</option>
                            <option value="communication">Communication</option>
                            <option value="problem_solving">Problem Solving</option>
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm text-slate-400 mb-1">Description</label>
                        <textarea value={assessment.description} onChange={(e) => setAssessment({...assessment, description: e.target.value})} rows="3" className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                    </div>
                </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Questions</h2>
                
                <div className="space-y-4 mb-6">
                    {questions.map((q, idx) => (
                        <div key={q.id} className="bg-slate-800/30 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-white font-medium">Question {idx + 1}: {q.question_text}</p>
                                    <p className="text-slate-400 text-sm">Type: {q.question_type} | Points: {q.points}</p>
                                </div>
                                <button className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="border-t border-slate-800 pt-4">
                    <h3 className="text-white font-medium mb-3">Add New Question</h3>
                    <div className="space-y-3">
                        <textarea value={newQuestion.question_text} onChange={(e) => setNewQuestion({...newQuestion, question_text: e.target.value})} placeholder="Question text..." rows="2" className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                        <div className="grid grid-cols-2 gap-3">
                            <select value={newQuestion.question_type} onChange={(e) => setNewQuestion({...newQuestion, question_type: e.target.value})} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
                                <option value="multiple_choice">Multiple Choice</option>
                                <option value="likert_scale">Likert Scale</option>
                            </select>
                            <input type="number" value={newQuestion.points} onChange={(e) => setNewQuestion({...newQuestion, points: parseInt(e.target.value)})} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" placeholder="Points" />
                        </div>
                        {newQuestion.question_type === 'multiple_choice' && (
                            <div className="space-y-2">
                                {newQuestion.options.map((opt, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <input type="text" value={opt} onChange={(e) => {
                                            const newOpts = [...newQuestion.options];
                                            newOpts[idx] = e.target.value;
                                            setNewQuestion({...newQuestion, options: newOpts});
                                        }} placeholder={`Option ${idx + 1}`} className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                                        <label className="flex items-center gap-1"><input type="radio" name="correct_answer" checked={newQuestion.correct_answer === idx} onChange={() => setNewQuestion({...newQuestion, correct_answer: idx})} /> Correct</label>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button onClick={addQuestion} className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2">
                            <Plus className="w-4 h-4" /> Add Question
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// src/pages/AssessmentTakingPage.jsx
//
// REBUILT ENTIRELY (2026-08-23) — the previous version had no answer
// selection, no submit button, and no scoring logic at all: radio inputs
// with no value/onChange, questions assumed nonexistent option_a/b/c/d
// columns (the real schema is a normalized assessment_options table, one
// row per option), and it reinvented broken defensive Supabase queries
// (three fallback approaches, then a client-side filter over every
// question in the database) instead of using the real service that
// already existed. Meanwhile AssessmentResults.jsx is a mature, complete
// results page waiting for data that could never arrive, because nothing
// ever called the real submission pipeline.
//
// That real pipeline already existed in full, correctly built, in
// assessmentService.js (startAssessment, saveAnswer, completeAssessment) —
// supporting multiple_choice, likert_scale, and AI-scored scenario
// questions, with real dimension-based scoring and AI insights. This page
// simply never called any of it. Rebuilt to actually use it.

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { startAssessment, saveAnswer, completeAssessment } from '../services/assessmentService';
import {
    Loader2, AlertCircle, ChevronLeft, ChevronRight, CheckCircle,
    Clock, ArrowLeft, Send, Shield
} from 'lucide-react';

export default function AssessmentTakingPage() {
    // FIXED (2026-08-23): the real, confirmed route in App.jsx is
    // /assessments/:id (param name "id"), not /assessments/:assessmentId —
    // this file's original useParams() destructuring would have always
    // received undefined for the assessment id on the real, live route.
    const { id: assessmentId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [limitReached, setLimitReached] = useState(false);
    const [eligibility, setEligibility] = useState(null);

    const [assessment, setAssessment] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [sessionId, setSessionId] = useState(null);
    const [sessionDbId, setSessionDbId] = useState(null);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({}); // { [questionId]: answer }
    const [submitting, setSubmitting] = useState(false);
    const [startTime] = useState(Date.now());

    useEffect(() => {
        initAssessment();
    }, [assessmentId]);

    async function initAssessment() {
        setLoading(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            navigate(`/sign-in?redirect=/assessments/${assessmentId}`);
            return;
        }

        try {
            const result = await startAssessment(user.id, assessmentId);

            if (!result.success) {
                if (result.limitReached) {
                    setLimitReached(true);
                    setEligibility(result.eligibility);
                } else {
                    setError(result.error || 'Unable to start this assessment.');
                }
                setLoading(false);
                return;
            }

            setAssessment(result.session?.assessment || null);
            setQuestions(result.questions || []);
            setSessionId(result.sessionId);
            setSessionDbId(result.session?.id);
        } catch (err) {
            console.error('Error starting assessment:', err);
            setError('Something went wrong starting this assessment. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    const currentQuestion = questions[currentIndex];
    const isLastQuestion = currentIndex === questions.length - 1;
    const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
    const hasAnswered = currentAnswer !== undefined && currentAnswer !== '';

    const handleAnswerChange = useCallback((questionId, value) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    }, []);

    async function persistCurrentAnswer() {
        if (!currentQuestion || !sessionId) return;
        const answer = answers[currentQuestion.id];
        if (answer === undefined || answer === '') return;

        try {
            await saveAnswer(sessionId, currentQuestion.id, answer, currentIndex);
        } catch (err) {
            console.warn('Failed to save answer (continuing anyway):', err);
        }
    }

    async function handleNext() {
        await persistCurrentAnswer();
        setCurrentIndex(i => Math.min(questions.length - 1, i + 1));
    }

    function handlePrevious() {
        setCurrentIndex(i => Math.max(0, i - 1));
    }

    async function handleSubmit() {
        setSubmitting(true);
        setError(null);

        await persistCurrentAnswer();

        try {
            const timeSpentSeconds = Math.round((Date.now() - startTime) / 1000);
            const result = await completeAssessment(sessionId);

            if (!result.success) {
                setError(result.error || 'Failed to submit your assessment. Please try again.');
                setSubmitting(false);
                return;
            }

            navigate(`/assessment-results/${sessionDbId}`);
        } catch (err) {
            console.error('Error submitting assessment:', err);
            setError('Something went wrong submitting your assessment. Please try again.');
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    if (limitReached) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
                <div className="max-w-md text-center">
                    <Shield className="w-14 h-14 text-amber-400 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Monthly Limit Reached</h1>
                    <p className="text-slate-400 mb-6">
                        You've used {eligibility?.used || eligibility?.limit} of {eligibility?.limit} assessments available this month on your {eligibility?.tier} plan.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link to="/pricing" className="px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition">
                            Upgrade Plan
                        </Link>
                        <Link to="/assessments" className="px-5 py-2.5 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition">
                            Back to Assessments
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (error && questions.length === 0) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
                <div className="max-w-md text-center">
                    <AlertCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Unable to Load Assessment</h1>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <Link to="/assessments" className="text-primary-400 hover:underline">Back to Assessments</Link>
                </div>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
                <div className="max-w-md text-center">
                    <AlertCircle className="w-14 h-14 text-slate-600 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">No Questions Available</h1>
                    <p className="text-slate-400 mb-6">This assessment doesn't have any questions set up yet.</p>
                    <Link to="/assessments" className="text-primary-400 hover:underline">Back to Assessments</Link>
                </div>
            </div>
        );
    }

    const progressPct = Math.round(((currentIndex + 1) / questions.length) * 100);

    return (
        <div className="min-h-screen bg-slate-950 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                <Link to="/assessments" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition">
                    <ArrowLeft className="w-4 h-4" /> Exit Assessment
                </Link>

                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-white mb-1">{assessment?.title}</h1>
                    <p className="text-slate-400 text-sm">{assessment?.description}</p>
                </div>

                {/* Progress bar */}
                <div className="mb-8">
                    <div className="flex justify-between text-sm text-slate-400 mb-2">
                        <span>Question {currentIndex + 1} of {questions.length}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {progressPct}% complete</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                        <div
                            className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}

                {/* Question card */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 mb-6">
                    <p className="text-white text-lg font-medium mb-6">
                        {currentQuestion.question_text}
                    </p>

                    {currentQuestion.question_type === 'multiple_choice' && (
                        <div className="space-y-3">
                            {(currentQuestion.options || []).map(option => (
                                <label
                                    key={option.id}
                                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition ${
                                        currentAnswer === option.id
                                            ? 'border-primary-500 bg-primary-500/10'
                                            : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name={`question-${currentQuestion.id}`}
                                        checked={currentAnswer === option.id}
                                        onChange={() => handleAnswerChange(currentQuestion.id, option.id)}
                                        className="w-4 h-4 text-primary-500"
                                    />
                                    <span className="text-slate-200">{option.option_text}</span>
                                </label>
                            ))}
                        </div>
                    )}

                    {currentQuestion.question_type === 'likert_scale' && (
                        <div className="flex justify-between gap-2">
                            {[1, 2, 3, 4, 5].map(value => (
                                <button
                                    key={value}
                                    onClick={() => handleAnswerChange(currentQuestion.id, value)}
                                    className={`flex-1 py-4 rounded-xl border font-semibold transition ${
                                        currentAnswer === value
                                            ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                                            : 'border-slate-700 bg-slate-800/30 text-slate-400 hover:border-slate-600'
                                    }`}
                                >
                                    {value}
                                </button>
                            ))}
                        </div>
                    )}
                    {currentQuestion.question_type === 'likert_scale' && (
                        <div className="flex justify-between text-xs text-slate-500 mt-2 px-1">
                            <span>Strongly Disagree</span>
                            <span>Strongly Agree</span>
                        </div>
                    )}

                    {currentQuestion.question_type === 'scenario' && (
                        <textarea
                            value={currentAnswer || ''}
                            onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                            rows={6}
                            placeholder="Share your thoughts in detail — this will be reviewed and scored..."
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                        />
                    )}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between gap-3">
                    <button
                        onClick={handlePrevious}
                        disabled={currentIndex === 0}
                        className="px-5 py-2.5 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <ChevronLeft className="w-4 h-4" /> Previous
                    </button>

                    {isLastQuestion ? (
                        <button
                            onClick={handleSubmit}
                            disabled={!hasAnswered || submitting}
                            className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition disabled:opacity-50 flex items-center gap-2 font-medium"
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {submitting ? 'Submitting...' : 'Submit Assessment'}
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            disabled={!hasAnswered}
                            className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition disabled:opacity-50 flex items-center gap-2 font-medium"
                        >
                            Next <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Question dots */}
                <div className="flex flex-wrap gap-2 justify-center mt-8">
                    {questions.map((q, idx) => (
                        <button
                            key={q.id}
                            onClick={() => setCurrentIndex(idx)}
                            className={`w-2.5 h-2.5 rounded-full transition ${
                                idx === currentIndex
                                    ? 'bg-primary-400 w-6'
                                    : answers[q.id] !== undefined
                                        ? 'bg-emerald-500'
                                        : 'bg-slate-700'
                            }`}
                            title={`Question ${idx + 1}${answers[q.id] !== undefined ? ' (answered)' : ''}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

// src/pages/TakeAssessment.jsx
// Complete Assessment Taking Page with Timer and Scoring

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
    getAssessmentById, 
    checkUserEligibility, 
    recordAssessmentStart,
    submitAssessmentAnswers
} from '../services/assessmentService';
import { Clock, AlertCircle, Loader2, ChevronRight, ChevronLeft } from 'lucide-react';

export default function TakeAssessment() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [assessment, setAssessment] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [eligibility, setEligibility] = useState(null);
    const [userAssessmentId, setUserAssessmentId] = useState(null);
    const [error, setError] = useState(null);
    const [startTime, setStartTime] = useState(null);

    useEffect(() => {
        loadAssessment();
    }, [id]);

    async function loadAssessment() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate(`/sign-in?redirect=/assessments/${id}`);
                return;
            }
            
            const eligibilityData = await checkUserEligibility(user.id, id);
            setEligibility(eligibilityData);
            
            if (!eligibilityData.eligible) {
                setError(`You have used ${eligibilityData.limit - eligibilityData.remaining} of ${eligibilityData.limit} assessments this month. Upgrade to continue.`);
                setLoading(false);
                return;
            }
            
            const assessmentData = await getAssessmentById(id);
            setAssessment(assessmentData);
            setTimeLeft(assessmentData.time_limit_minutes * 60);
            setStartTime(Date.now());
            
            // Record start
            const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            const record = await recordAssessmentStart(user.id, id, sessionId);
            setUserAssessmentId(record.id);
            
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (timeLeft === null || timeLeft <= 0) return;
        
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        
        return () => clearInterval(timer);
    }, [timeLeft]);

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function handleAnswer(questionId, answerValue) {
        setAnswers(prev => ({ ...prev, [questionId]: answerValue }));
    }

    async function handleSubmit() {
        setSubmitting(true);
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
        
        const result = await submitAssessmentAnswers(userAssessmentId, answers, timeSpent);
        
        if (result.success) {
            navigate(`/assessment-results/${userAssessmentId}`);
        } else {
            setError('Failed to submit assessment. Please try again.');
        }
        setSubmitting(false);
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
                <div className="text-center max-w-md">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Cannot Start Assessment</h1>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <button onClick={() => navigate('/pricing')} className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                        Upgrade Plan
                    </button>
                </div>
            </div>
        );
    }

    const questions = assessment?.questions || [];
    const currentQ = questions[currentQuestion];
    const isLast = currentQuestion === questions.length - 1;

    return (
        <div className="min-h-screen bg-slate-950 py-8">
            <div className="max-w-3xl mx-auto px-4">
                {/* Header */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold text-white">{assessment?.title}</h1>
                        <p className="text-slate-400 text-sm">Question {currentQuestion + 1} of {questions.length}</p>
                    </div>
                    <div className="flex items-center gap-2 text-amber-400">
                        <Clock className="w-5 h-5" />
                        <span className="font-mono text-xl">{formatTime(timeLeft)}</span>
                    </div>
                </div>

                {/* Question */}
                {currentQ && (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <h2 className="text-xl text-white mb-6">{currentQ.question_text}</h2>
                        
                        {currentQ.question_type === 'multiple_choice' && currentQ.options?.map(option => (
                            <label key={option.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 mb-3 cursor-pointer hover:bg-slate-700 transition">
                                <input
                                    type="radio"
                                    name={`q_${currentQ.id}`}
                                    value={option.id}
                                    checked={answers[currentQ.id] === option.id}
                                    onChange={() => handleAnswer(currentQ.id, option.id)}
                                    className="w-4 h-4"
                                />
                                <span className="text-white">{option.option_text}</span>
                            </label>
                        ))}
                        
                        {currentQ.question_type === 'likert_scale' && (
                            <div className="space-y-3">
                                {[1, 2, 3, 4, 5].map(score => (
                                    <label key={score} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 cursor-pointer hover:bg-slate-700 transition">
                                        <input
                                            type="radio"
                                            name={`q_${currentQ.id}`}
                                            value={score}
                                            checked={answers[currentQ.id] === score}
                                            onChange={() => handleAnswer(currentQ.id, score)}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-white">
                                            {score === 1 ? 'Strongly Disagree' : 
                                             score === 2 ? 'Disagree' : 
                                             score === 3 ? 'Neutral' : 
                                             score === 4 ? 'Agree' : 'Strongly Agree'}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between mt-6">
                    <button
                        onClick={() => setCurrentQuestion(prev => prev - 1)}
                        disabled={currentQuestion === 0}
                        className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 disabled:opacity-50"
                    >
                        <ChevronLeft className="w-4 h-4 inline mr-1" /> Previous
                    </button>
                    
                    {isLast ? (
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || Object.keys(answers).length !== questions.length}
                            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
                            Submit Assessment
                        </button>
                    ) : (
                        <button
                            onClick={() => setCurrentQuestion(prev => prev + 1)}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                        >
                            Next <ChevronRight className="w-4 h-4 inline ml-1" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

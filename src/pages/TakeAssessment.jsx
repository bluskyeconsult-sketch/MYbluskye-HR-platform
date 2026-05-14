// src/pages/TakeAssessment.jsx
// COMPLETE ASSESSMENT TAKING PAGE - Timer, Scoring, Auto-save, All Question Types

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
    getAssessmentById, 
    checkUserEligibility, 
    recordAssessmentStart,
    submitAssessmentAnswers,
    startAssessment,
    saveAnswer,
    completeAssessment,
    canUserTakeAssessment
} from '../services/assessmentService';
import { Clock, AlertCircle, Loader2, ChevronRight, ChevronLeft, Award } from 'lucide-react';

export default function TakeAssessment() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    // State from both versions
    const [assessment, setAssessment] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [eligibility, setEligibility] = useState(null);
    const [userAssessmentId, setUserAssessmentId] = useState(null);
    const [error, setError] = useState(null);
    const [startTime, setStartTime] = useState(null);
    const [user, setUser] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [session, setSession] = useState(null);

    useEffect(() => {
        loadAssessment();
    }, [id]);

    // Timer effect
    useEffect(() => {
        if (timeLeft === null || timeLeft <= 0 || submitting) return;
        
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
    }, [timeLeft, submitting]);

    async function loadAssessment() {
        setLoading(true);
        setError(null);
        
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate(`/sign-in?redirect=/assessments/${id}`);
                return;
            }
            setUser(user);
            
            // Check eligibility (using both methods for compatibility)
            let eligibilityData;
            try {
                eligibilityData = await checkUserEligibility(user.id, id);
            } catch {
                const canTake = await canUserTakeAssessment(user.id);
                eligibilityData = {
                    eligible: canTake.allowed,
                    remaining: canTake.remaining,
                    limit: canTake.limit,
                    tier: user.user_metadata?.tier || 'free',
                    canDownloadReport: true,
                    canRetake: true,
                    isUnlimited: canTake.isUnlimited
                };
            }
            setEligibility(eligibilityData);
            
            if (!eligibilityData.eligible && !eligibilityData.isUnlimited) {
                setError(`You have used ${eligibilityData.limit - eligibilityData.remaining} of ${eligibilityData.limit} assessments this month. Upgrade to continue.`);
                setLoading(false);
                return;
            }
            
            // Get assessment details
            let assessmentData;
            try {
                assessmentData = await getAssessmentById(id);
            } catch {
                const { data } = await supabase
                    .from('assessments')
                    .select('*, questions:assessment_questions(*, options:assessment_options(*))')
                    .eq('id', id)
                    .single();
                assessmentData = data;
            }
            
            if (!assessmentData) {
                setError('Assessment not found');
                setLoading(false);
                return;
            }
            
            setAssessment(assessmentData);
            setQuestions(assessmentData.questions || []);
            setTimeLeft(assessmentData.time_limit_minutes * 60);
            setStartTime(Date.now());
            
            // Start assessment session
            const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            
            let record;
            try {
                record = await recordAssessmentStart(user.id, id, sessionId);
            } catch {
                const result = await startAssessment(user.id, id);
                record = result.session;
            }
            
            setUserAssessmentId(record?.id);
            setSession({ sessionId });
            
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    async function handleAnswer(questionId, answerValue) {
        const newAnswers = { ...answers, [questionId]: answerValue };
        setAnswers(newAnswers);
        
        // Auto-save if using the newer service
        if (session?.sessionId) {
            await saveAnswer(session.sessionId, questionId, answerValue, currentIndex);
        }
    }

    async function handleNext() {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            await handleSubmit();
        }
    }

    async function handlePrevious() {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    }

    async function handleSubmit() {
        setSubmitting(true);
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
        
        let result;
        try {
            if (userAssessmentId) {
                result = await submitAssessmentAnswers(userAssessmentId, answers, timeSpent);
            } else if (session?.sessionId) {
                result = await completeAssessment(session.sessionId);
            } else {
                throw new Error('No active assessment session');
            }
            
            if (result.success) {
                const redirectId = userAssessmentId || session?.sessionId;
                navigate(`/assessment-results/${redirectId}`);
            } else {
                setError(result.error || 'Failed to submit assessment. Please try again.');
            }
        } catch (err) {
            setError(err.message || 'Failed to submit assessment. Please try again.');
        }
        setSubmitting(false);
    }

    function renderQuestion() {
        const question = questions[currentIndex];
        if (!question) return null;
        
        const currentAnswer = answers[question.id];
        
        switch (question.question_type) {
            case 'likert_scale':
                return (
                    <div className="space-y-4">
                        <p className="text-white text-lg font-medium">{question.question_text}</p>
                        <div className="grid grid-cols-5 gap-2">
                            {[1, 2, 3, 4, 5].map(value => (
                                <button
                                    key={value}
                                    onClick={() => handleAnswer(question.id, value)}
                                    className={`py-3 rounded-lg font-semibold transition ${
                                        currentAnswer === value
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                                >
                                    {value === 1 ? 'Strongly\nDisagree' : 
                                     value === 2 ? 'Disagree' : 
                                     value === 3 ? 'Neutral' : 
                                     value === 4 ? 'Agree' : 
                                     'Strongly\nAgree'}
                                </button>
                            ))}
                        </div>
                    </div>
                );
                
            case 'multiple_choice':
                return (
                    <div className="space-y-3">
                        <p className="text-white text-lg font-medium">{question.question_text}</p>
                        <div className="space-y-2">
                            {question.options?.map(option => (
                                <label
                                    key={option.id}
                                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                                        currentAnswer === option.id
                                            ? 'bg-primary-600/20 border border-primary-500'
                                            : 'bg-slate-800/50 hover:bg-slate-700 border border-slate-700'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name={`question_${question.id}`}
                                        value={option.id}
                                        checked={currentAnswer === option.id}
                                        onChange={() => handleAnswer(question.id, option.id)}
                                        className="w-4 h-4 text-primary-500 focus:ring-primary-500"
                                    />
                                    <span className="text-white">{option.option_text}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                );
                
            case 'scenario':
            case 'text':
                return (
                    <div className="space-y-4">
                        <p className="text-white text-lg font-medium">{question.question_text}</p>
                        <textarea
                            value={currentAnswer || ''}
                            onChange={(e) => handleAnswer(question.id, e.target.value)}
                            rows={6}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
                            placeholder="Type your answer here..."
                        />
                    </div>
                );
                
            default:
                return (
                    <div className="space-y-4">
                        <p className="text-white text-lg font-medium">{question.question_text}</p>
                        <textarea
                            value={currentAnswer || ''}
                            onChange={(e) => handleAnswer(question.id, e.target.value)}
                            rows={4}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            placeholder="Type your answer here..."
                        />
                    </div>
                );
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-3" />
                    <p className="text-slate-400">Loading assessment...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-950 py-12">
                <div className="max-w-2xl mx-auto px-4 text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Cannot Start Assessment</h1>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <div className="flex gap-3 justify-center">
                        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                            Try Again
                        </button>
                        <a href="/assessments" className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800">
                            Back to Assessments
                        </a>
                        {error.includes('Upgrade') && (
                            <a href="/pricing" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                                Upgrade Plan
                            </a>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
    const currentQuestion = questions[currentIndex];
    const hasAnswered = currentQuestion ? answers[currentQuestion.id] !== undefined : false;

    return (
        <div className="min-h-screen bg-slate-950 py-12">
            <div className="max-w-3xl mx-auto px-4">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-2">
                        <h1 className="text-2xl font-bold text-white">{assessment?.title}</h1>
                        {timeLeft !== null && (
                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full w-fit ${
                                timeLeft < 60 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-slate-800 text-slate-300'
                            }`}>
                                <Clock className="w-4 h-4" />
                                <span className="text-sm font-mono font-bold">{formatTime(timeLeft)}</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex justify-between text-sm text-slate-400 mb-2">
                        <span>Question {currentIndex + 1} of {questions.length}</span>
                        <span>{Math.round(progress)}% complete</span>
                    </div>
                    
                    <div className="mt-2 w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div 
                            className="bg-primary-500 h-2 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>

                {/* Question Card */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-6">
                    {renderQuestion()}
                </div>

                {/* Navigation */}
                <div className="flex justify-between gap-3">
                    <button
                        onClick={handlePrevious}
                        disabled={currentIndex === 0}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white transition"
                    >
                        <ChevronLeft className="w-4 h-4" /> Previous
                    </button>
                    
                    <button
                        onClick={handleNext}
                        disabled={!hasAnswered}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white transition font-medium"
                    >
                        {currentIndex === questions.length - 1 ? (
                            submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Award className="w-4 h-4" />
                                    Submit Assessment
                                </>
                            )
                        ) : (
                            <>
                                Next <ChevronRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
                
                {/* Warning for unanswered questions */}
                {!hasAnswered && currentQuestion && (
                    <p className="text-xs text-amber-400 text-center mt-4">
                        Please answer this question before continuing
                    </p>
                )}
            </div>
        </div>
    );
}

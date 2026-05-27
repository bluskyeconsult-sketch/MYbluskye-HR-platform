// src/pages/TakeAssessment.jsx
// COMPLETE ASSESSMENT TAKING PAGE - Timer, Scoring, Auto-save, All Question Types, Eligibility Check

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
    getAssessmentById, 
    checkUserEligibility, 
    recordAssessmentStart,
    submitAssessmentAnswers,
    saveAnswer,
    completeAssessment
} from '../services/assessmentService';
import { Clock, AlertCircle, Loader2, ChevronRight, ChevronLeft, Award, Save } from 'lucide-react';

export default function TakeAssessment() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    // State
    const [assessment, setAssessment] = useState(null);
    const [questions, setQuestions] = useState([]);
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
    const [sessionId, setSessionId] = useState(null);
    const [autoSaveStatus, setAutoSaveStatus] = useState(null);

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

    // Auto-save effect
    useEffect(() => {
        if (!sessionId || Object.keys(answers).length === 0) return;
        
        const autoSaveTimer = setTimeout(async () => {
            try {
                await saveAnswer(sessionId, answers);
                setAutoSaveStatus('saved');
                setTimeout(() => setAutoSaveStatus(null), 2000);
            } catch (err) {
                console.warn('Auto-save failed:', err);
                setAutoSaveStatus('error');
            }
        }, 3000);
        
        return () => clearTimeout(autoSaveTimer);
    }, [answers, sessionId]);

    async function loadAssessment() {
        setLoading(true);
        setError(null);
        
        try {
            // 1. Check authentication
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) {
                navigate(`/sign-in?redirect=/assessments/${id}`);
                return;
            }
            setUser(authUser);
            
            // 2. Check eligibility
            let eligibilityData;
            try {
                eligibilityData = await checkUserEligibility(authUser.id, id);
            } catch (err) {
                // Fallback: manually check using profiles table
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('tier, user_type')
                    .eq('id', authUser.id)
                    .single();
                
                const isUnlimited = profile?.tier === 'super_admin' || 
                                   profile?.tier === 'admin' || 
                                   profile?.user_type === 'super_admin' ||
                                   profile?.user_type === 'admin';
                
                eligibilityData = {
                    eligible: isUnlimited,
                    remaining: isUnlimited ? 999 : 3,
                    limit: isUnlimited ? 999 : 3,
                    tier: profile?.tier || 'free',
                    canDownloadReport: true,
                    canRetake: true,
                    isUnlimited: isUnlimited
                };
            }
            setEligibility(eligibilityData);
            
            if (!eligibilityData.eligible && !eligibilityData.isUnlimited) {
                setError(`You have used ${eligibilityData.limit - eligibilityData.remaining} of ${eligibilityData.limit} assessments this month. Upgrade to continue.`);
                setLoading(false);
                return;
            }
            
            // 3. Get assessment with questions
            let assessmentData;
            try {
                assessmentData = await getAssessmentById(id);
            } catch {
                const { data, error } = await supabase
                    .from('assessments')
                    .select('*')
                    .eq('id', id)
                    .single();
                
                if (error) throw error;
                
                // Get questions with options
                const { data: questionsData } = await supabase
                    .from('assessment_questions')
                    .select('*, options:assessment_options(*)')
                    .eq('assessment_id', id)
                    .order('sort_order', { ascending: true });
                
                assessmentData = { ...data, questions: questionsData || [] };
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
            
            // 4. Start assessment session
            const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            setSessionId(newSessionId);
            
            let record;
            try {
                record = await recordAssessmentStart(authUser.id, id, newSessionId);
            } catch {
                const result = await startAssessment(authUser.id, id);
                record = result?.session;
            }
            
            setUserAssessmentId(record?.id);
            
        } catch (err) {
            console.error('Error loading assessment:', err);
            setError(err.message || 'Failed to load assessment');
        } finally {
            setLoading(false);
        }
    }

    function formatTime(seconds) {
        if (!seconds && seconds !== 0) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    async function handleAnswer(questionId, answerValue) {
        const newAnswers = { ...answers, [questionId]: answerValue };
        setAnswers(newAnswers);
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
        if (submitting) return;
        
        setSubmitting(true);
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
        
        try {
            let result;
            if (userAssessmentId) {
                result = await submitAssessmentAnswers(userAssessmentId, answers, timeSpent);
            } else if (sessionId) {
                result = await completeAssessment(sessionId, answers);
            } else {
                throw new Error('No active assessment session');
            }
            
            if (result.success) {
                const redirectId = userAssessmentId || sessionId;
                navigate(`/assessment-results/${redirectId}`);
            } else {
                setError(result.error || 'Failed to submit assessment. Please try again.');
            }
        } catch (err) {
            console.error('Submit error:', err);
            setError(err.message || 'Failed to submit assessment. Please try again.');
        } finally {
            setSubmitting(false);
        }
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
                            {[1, 2, 3, 4, 5].map(value => {
                                const labels = {
                                    1: 'Strongly\nDisagree',
                                    2: 'Disagree',
                                    3: 'Neutral',
                                    4: 'Agree',
                                    5: 'Strongly\nAgree'
                                };
                                return (
                                    <button
                                        key={value}
                                        onClick={() => handleAnswer(question.id, value)}
                                        className={`py-3 rounded-lg font-semibold transition whitespace-pre-line text-center ${
                                            currentAnswer === value
                                                ? 'bg-primary-600 text-white'
                                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                        }`}
                                    >
                                        {labels[value]}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
                
            case 'multiple_choice':
                return (
                    <div className="space-y-3">
                        <p className="text-white text-lg font-medium">{question.question_text}</p>
                        <div className="space-y-2">
                            {(question.options || []).map(option => (
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
                                    <span className="text-white">{option.option_text || option.text}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                );
                
            case 'true_false':
                return (
                    <div className="space-y-3">
                        <p className="text-white text-lg font-medium">{question.question_text}</p>
                        <div className="grid grid-cols-2 gap-3">
                            {['True', 'False'].map(value => (
                                <button
                                    key={value}
                                    onClick={() => handleAnswer(question.id, value.toLowerCase())}
                                    className={`py-3 rounded-lg font-semibold transition ${
                                        currentAnswer === value.toLowerCase()
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                                >
                                    {value}
                                </button>
                            ))}
                        </div>
                    </div>
                );
                
            case 'scenario':
            case 'text':
            case 'essay':
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
                    <div className="flex gap-3 justify-center flex-wrap">
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

    if (questions.length === 0) {
        return (
            <div className="min-h-screen bg-slate-950 py-12">
                <div className="max-w-2xl mx-auto px-4 text-center">
                    <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">No Questions Available</h1>
                    <p className="text-slate-400 mb-6">This assessment doesn't have any questions yet.</p>
                    <a href="/assessments" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                        Back to Assessments
                    </a>
                </div>
            </div>
        );
    }

    const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
    const currentQuestion = questions[currentIndex];
    const hasAnswered = currentQuestion ? answers[currentQuestion.id] !== undefined : false;

    return (
        <div className="min-h-screen bg-slate-950 py-8 md:py-12">
            <div className="max-w-3xl mx-auto px-4">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-2">
                        <h1 className="text-xl md:text-2xl font-bold text-white">{assessment?.title}</h1>
                        <div className="flex items-center gap-3">
                            {autoSaveStatus === 'saved' && (
                                <span className="flex items-center gap-1 text-xs text-emerald-400">
                                    <Save className="w-3 h-3" /> Saved
                                </span>
                            )}
                            {autoSaveStatus === 'error' && (
                                <span className="text-xs text-red-400">Auto-save failed</span>
                            )}
                            {timeLeft !== null && (
                                <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                                    timeLeft < 60 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-slate-800 text-slate-300'
                                }`}>
                                    <Clock className="w-4 h-4" />
                                    <span className="text-sm font-mono font-bold">{formatTime(timeLeft)}</span>
                                </div>
                            )}
                        </div>
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
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 md:p-6 mb-6">
                    {renderQuestion()}
                </div>

                {/* Navigation */}
                <div className="flex justify-between gap-3">
                    <button
                        onClick={handlePrevious}
                        disabled={currentIndex === 0}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white transition"
                    >
                        <ChevronLeft className="w-4 h-4" /> Previous
                    </button>
                    
                    <button
                        onClick={handleNext}
                        disabled={!hasAnswered || submitting}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white transition font-medium"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Submitting...
                            </>
                        ) : currentIndex === questions.length - 1 ? (
                            <>
                                <Award className="w-4 h-4" />
                                Submit Assessment
                            </>
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

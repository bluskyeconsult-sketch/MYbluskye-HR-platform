// src/pages/TakeAssessment.jsx
// COMPLETE ASSESSMENT TAKING PAGE - Timer, Scoring, Auto-save, All Question Types, Eligibility Check, Proper Question Loading

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
    checkUserEligibility, 
    recordAssessmentStart,
    submitAssessmentAnswers,
    saveAnswer,
    completeAssessment,
    startAssessment
} from '../services/assessmentService';
import { Clock, AlertCircle, Loader2, ChevronRight, ChevronLeft, Award, Save, HelpCircle } from 'lucide-react';

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
    
    // Refs for cleanup
    const timerRef = useRef(null);
    const autoSaveRef = useRef(null);

    // Load assessment on mount
    useEffect(() => {
        loadAssessment();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
        };
    }, [id]);

    // Timer effect
    useEffect(() => {
        if (timeLeft === null || timeLeft <= 0 || submitting) return;
        
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [timeLeft, submitting]);

    // Auto-save effect
    useEffect(() => {
        if (!sessionId || Object.keys(answers).length === 0) return;
        
        if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
        
        autoSaveRef.current = setTimeout(async () => {
            try {
                await saveAnswer(sessionId, answers);
                setAutoSaveStatus('saved');
                setTimeout(() => setAutoSaveStatus(null), 2000);
            } catch (err) {
                console.warn('Auto-save failed:', err);
                setAutoSaveStatus('error');
            }
        }, 3000);
        
        return () => {
            if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
        };
    }, [answers, sessionId]);

    // ✅ Load assessment with proper question fetching
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
            
            // 3. Load assessment details
            const { data: assessmentData, error: aError } = await supabase
                .from('assessments')
                .select('*')
                .eq('id', id)
                .single();
            
            if (aError) throw aError;
            setAssessment(assessmentData);
            setTimeLeft(assessmentData.time_limit_minutes * 60);
            setStartTime(Date.now());
            
            // 4. ✅ CRITICAL FIX: Load questions with options using proper Supabase join
            // Using the syntax that works: assessment_options (not options:)
            const { data: questionsData, error: qError } = await supabase
                .from('assessment_questions')
                .select(`
                    id,
                    question_text,
                    question_type,
                    points,
                    dimension,
                    sort_order,
                    assessment_options (
                        id,
                        option_text,
                        option_value,
                        is_correct,
                        sort_order
                    )
                `)
                .eq('assessment_id', id)
                .order('sort_order', { ascending: true });
            
            if (qError) {
                console.error('Questions error:', qError);
                throw qError;
            }
            
            // 5. Process questions - ensure options is an array
            const processedQuestions = (questionsData || []).map(q => ({
                ...q,
                options: q.assessment_options || []
            }));
            
            // 6. Filter questions based on type
            const validQuestions = processedQuestions.filter(q => {
                // Text-based questions don't need options
                if (q.question_type === 'text' || q.question_type === 'essay' || q.question_type === 'scenario') {
                    return true;
                }
                // Likert and True/False don't need options array
                if (q.question_type === 'likert_scale' || q.question_type === 'true_false') {
                    return true;
                }
                // Multiple choice needs options
                if (q.question_type === 'multiple_choice') {
                    const hasOptions = q.options && Array.isArray(q.options) && q.options.length > 0;
                    if (!hasOptions) {
                        console.warn(`Question ${q.id} has no options:`, q.question_text);
                    }
                    return hasOptions;
                }
                return true;
            });
            
            if (validQuestions.length === 0) {
                setError('This assessment has no valid questions configured yet. Please contact support.');
                setLoading(false);
                return;
            }
            
            setQuestions(validQuestions);
            
            // 7. Start assessment session
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

    // ✅ Validate question has required content
    function hasValidContent(question) {
        if (!question) return false;
        
        // Text-based questions don't need options
        if (question.question_type === 'text' || question.question_type === 'essay' || question.question_type === 'scenario') {
            return true;
        }
        
        // Likert scale and true/false don't need options array
        if (question.question_type === 'likert_scale' || question.question_type === 'true_false') {
            return true;
        }
        
        // Multiple choice needs options
        if (question.question_type === 'multiple_choice') {
            return question.options && Array.isArray(question.options) && question.options.length > 0;
        }
        
        return false;
    }

    function renderQuestion() {
        const question = questions[currentIndex];
        if (!question) return null;
        
        const currentAnswer = answers[question.id];
        const hasContent = hasValidContent(question);
        
        // Safety guard for invalid questions
        if (!hasContent) {
            return (
                <div className="space-y-4">
                    <p className="text-white text-lg font-medium">{question.question_text}</p>
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <div className="flex items-center gap-2 text-amber-400 mb-2">
                            <HelpCircle className="w-5 h-5" />
                            <span className="font-semibold">Question Not Fully Configured</span>
                        </div>
                        <p className="text-slate-400 text-sm">
                            This question is still being set up. Please contact support if this persists.
                        </p>
                        <button
                            onClick={() => handleNext()}
                            className="mt-3 px-4 py-2 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-600 transition"
                        >
                            Skip to Next Question
                        </button>
                    </div>
                </div>
            );
        }
        
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
                        <button onClick={() => navigate('/assessments')} className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800">
                            Back to Assessments
                        </button>
                        {error.includes('Upgrade') && (
                            <button onClick={() => navigate('/pricing')} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                                Upgrade Plan
                            </button>
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
                    <p className="text-slate-400 mb-6">This assessment doesn't have any questions configured yet.</p>
                    <button onClick={() => navigate('/assessments')} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                        Back to Assessments
                    </button>
                </div>
            </div>
        );
    }

    const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
    const currentQuestion = questions[currentIndex];
    const hasValidContentFlag = currentQuestion ? hasValidContent(currentQuestion) : false;
    const hasAnswered = currentQuestion ? answers[currentQuestion.id] !== undefined : false;
    const canProceed = hasValidContentFlag ? hasAnswered : true;

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
                        disabled={(!canProceed && hasValidContentFlag) || submitting}
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
                {!hasAnswered && hasValidContentFlag && currentQuestion && (
                    <p className="text-xs text-amber-400 text-center mt-4">
                        Please answer this question before continuing
                    </p>
                )}
            </div>
        </div>
    );
}

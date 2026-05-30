// src/pages/TakeAssessment.jsx
// COMPLETE PROFESSIONAL ASSESSMENT TAKING PAGE - With unified API, auto-save, timer, and all question types

import { useState, useEffect, useRef, useCallback } from 'react';
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
import { Clock, AlertCircle, Loader2, ChevronRight, ChevronLeft, Award, Save, HelpCircle, Shield, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

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
    const [isLastQuestion, setIsLastQuestion] = useState(false);
    const [questionStartTime, setQuestionStartTime] = useState(null);
    
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
                // ✅ Using unified API for auto-save
                const response = await fetch('/api/index?action=assessment-auto-save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        sessionId, 
                        answers,
                        currentIndex,
                        timeSpent: Math.floor((Date.now() - startTime) / 1000)
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    setAutoSaveStatus('saved');
                    setTimeout(() => setAutoSaveStatus(null), 2000);
                } else {
                    throw new Error(result.error);
                }
            } catch (err) {
                console.warn('Auto-save failed:', err);
                setAutoSaveStatus('error');
            }
        }, 3000);
        
        return () => {
            if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
        };
    }, [answers, sessionId, currentIndex, startTime]);

    // Track time spent per question
    useEffect(() => {
        if (currentIndex !== undefined && !loading) {
            setQuestionStartTime(Date.now());
        }
    }, [currentIndex, loading]);

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
            
            // 2. Check eligibility via unified API
            try {
                const eligibilityResponse = await fetch(`/api/index?action=user-eligibility&userId=${authUser.id}&type=assessment&assessmentId=${id}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });
                const eligibilityResult = await eligibilityResponse.json();
                
                if (eligibilityResult.success) {
                    setEligibility(eligibilityResult.data);
                } else {
                    throw new Error(eligibilityResult.error);
                }
            } catch (err) {
                // Fallback to direct check
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('tier, user_type')
                    .eq('id', authUser.id)
                    .single();
                
                const isUnlimited = profile?.tier === 'super_admin' || 
                                   profile?.tier === 'admin' || 
                                   profile?.user_type === 'super_admin' ||
                                   profile?.user_type === 'admin';
                
                setEligibility({
                    eligible: isUnlimited,
                    remaining: isUnlimited ? 999 : 3,
                    limit: isUnlimited ? 999 : 3,
                    tier: profile?.tier || 'free',
                    canDownloadReport: true,
                    canRetake: true,
                    isUnlimited: isUnlimited
                });
            }
            
            const currentEligibility = eligibility || await (async () => {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('tier, user_type')
                    .eq('id', authUser.id)
                    .single();
                return {
                    eligible: profile?.tier === 'super_admin' || profile?.tier === 'admin',
                    remaining: 999,
                    limit: 999,
                    isUnlimited: true
                };
            })();
            
            if (!currentEligibility.eligible && !currentEligibility.isUnlimited) {
                setError(`You have used ${currentEligibility.limit - currentEligibility.remaining} of ${currentEligibility.limit} assessments this month. Upgrade to continue.`);
                setLoading(false);
                return;
            }
            
            // 3. Load assessment via unified API
            const assessmentResponse = await fetch(`/api/index?action=assessment&id=${id}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const assessmentResult = await assessmentResponse.json();
            
            if (!assessmentResult.success) throw new Error(assessmentResult.error);
            
            const assessmentData = assessmentResult.data;
            setAssessment(assessmentData);
            setTimeLeft(assessmentData.time_limit_minutes * 60);
            setStartTime(Date.now());
            
            // 4. Load questions with options via unified API
            const questionsResponse = await fetch(`/api/index?action=assessment-questions&assessmentId=${id}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const questionsResult = await questionsResponse.json();
            
            if (!questionsResult.success) throw new Error(questionsResult.error);
            
            const questionsData = questionsResult.data || [];
            
            // 5. Process questions - ensure options is an array
            const processedQuestions = questionsData.map(q => ({
                ...q,
                options: q.options || []
            }));
            
            // 6. Validate questions
            const validQuestions = processedQuestions.filter(q => {
                if (q.question_type === 'text' || q.question_type === 'essay' || q.question_type === 'scenario') {
                    return true;
                }
                if (q.question_type === 'likert_scale' || q.question_type === 'true_false') {
                    return true;
                }
                if (q.question_type === 'multiple_choice') {
                    const hasOptions = q.options && q.options.length > 0;
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
            setIsLastQuestion(validQuestions.length === 1);
            console.log(`✅ Loaded ${validQuestions.length} questions with options`);
            
            // 7. Start assessment session via unified API
            const sessionResponse = await fetch('/api/index?action=assessment-start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: authUser.id, assessmentId: id })
            });
            
            const sessionResult = await sessionResponse.json();
            
            if (sessionResult.success) {
                setSessionId(sessionResult.data.sessionId);
                setUserAssessmentId(sessionResult.data.userAssessmentId);
            } else {
                throw new Error(sessionResult.error);
            }
            
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

    const handleAnswer = useCallback((questionId, answerValue) => {
        setAnswers(prev => ({ ...prev, [questionId]: answerValue }));
    }, []);

    async function handleNext() {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setIsLastQuestion(currentIndex + 1 === questions.length - 1);
        } else {
            await handleSubmit();
        }
    }

    async function handlePrevious() {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setIsLastQuestion(currentIndex - 1 === questions.length - 1);
        }
    }

    async function handleSubmit() {
        if (submitting) return;
        
        setSubmitting(true);
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
        
        try {
            // ✅ Using unified API for submission
            const response = await fetch('/api/index?action=assessment-submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userAssessmentId: userAssessmentId || sessionId,
                    answers,
                    timeSpent,
                    sessionId
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                const redirectId = result.data.redirectId || userAssessmentId || sessionId;
                toast.success('Assessment submitted successfully!');
                navigate(`/assessment-results/${redirectId}`);
            } else {
                setError(result.error || 'Failed to submit assessment. Please try again.');
                toast.error(result.error || 'Submission failed');
            }
        } catch (err) {
            console.error('Submit error:', err);
            setError(err.message || 'Failed to submit assessment. Please try again.');
            toast.error(err.message || 'Submission failed');
        } finally {
            setSubmitting(false);
        }
    }

    function hasValidContent(question) {
        if (!question) return false;
        
        if (question.question_type === 'text' || question.question_type === 'essay' || question.question_type === 'scenario') {
            return true;
        }
        
        if (question.question_type === 'likert_scale' || question.question_type === 'true_false') {
            return true;
        }
        
        if (question.question_type === 'multiple_choice') {
            return question.options && question.options.length > 0;
        }
        
        return false;
    }

    function renderQuestion() {
        const question = questions[currentIndex];
        if (!question) return null;
        
        const currentAnswer = answers[question.id];
        const hasContent = hasValidContent(question);
        
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
                            {question.options.map(option => (
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
                        <p className="text-xs text-slate-500">
                            {currentAnswer?.length || 0} characters
                        </p>
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
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-3" />
                    <p className="text-slate-400">Loading assessment...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 py-12">
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
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 py-12">
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
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 py-8 md:py-12">
            <div className="max-w-3xl mx-auto px-4">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-2">
                        <h1 className="text-xl md:text-2xl font-bold text-white">{assessment?.title}</h1>
                        <div className="flex items-center gap-3">
                            {eligibility?.isUnlimited && (
                                <span className="flex items-center gap-1 text-xs text-purple-400">
                                    <Shield className="w-3 h-3" /> Unlimited
                                </span>
                            )}
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
                
                {/* Question type indicator */}
                {currentQuestion && (
                    <p className="text-xs text-slate-500 text-center mt-3">
                        {currentQuestion.question_type === 'multiple_choice' && '✓ Select one answer'}
                        {currentQuestion.question_type === 'likert_scale' && '⭐ Select your level of agreement'}
                        {currentQuestion.question_type === 'true_false' && '✓ Select True or False'}
                        {(currentQuestion.question_type === 'text' || currentQuestion.question_type === 'essay') && '✏️ Type your answer'}
                    </p>
                )}
            </div>
        </div>
    );
}

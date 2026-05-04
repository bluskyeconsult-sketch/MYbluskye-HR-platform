import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { ArrowLeft, ArrowRight, Clock, CheckCircle, Save, AlertCircle } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function TakeAssessment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userAssessmentId, setUserAssessmentId] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    if (id) {
      loadAssessment();
    } else {
      navigate('/assessments');
    }
  }, [id]);

  async function loadAssessment() {
    try {
      // Load assessment details
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', id)
        .single();

      if (assessmentError) throw assessmentError;
      setAssessment(assessmentData);
      setTimeLeft(assessmentData?.duration_minutes * 60);

      // Load questions for this assessment
      const { data: questionsData, error: questionsError } = await supabase
        .from('assessment_questions')
        .select('*')
        .eq('assessment_id', id)
        .order('order_index', { ascending: true });

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);

      // Get or create user assessment session
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      if (user) {
        const { data: existing, error: existingError } = await supabase
          .from('user_assessments')
          .select('id')
          .eq('user_id', user.id)
          .eq('assessment_id', id)
          .eq('status', 'in_progress')
          .single();
        
        if (existingError && existingError.code !== 'PGRST116') throw existingError;
        
        if (existing) {
          setUserAssessmentId(existing.id);
          const { data: existingAnswers, error: answersError } = await supabase
            .from('assessment_answers')
            .select('question_id, answer, score')
            .eq('user_assessment_id', existing.id);
          
          if (answersError) throw answersError;
          
          const answersMap = {};
          existingAnswers?.forEach(a => { 
            answersMap[a.question_id] = { answer: a.answer, score: a.score }; 
          });
          setAnswers(answersMap);
        } else {
          const { data: newUserAssessment, error: insertError } = await supabase
            .from('user_assessments')
            .insert({ user_id: user.id, assessment_id: id, status: 'in_progress' })
            .select()
            .single();
          
          if (insertError) throw insertError;
          setUserAssessmentId(newUserAssessment.id);
        }
      }
    } catch (error) {
      console.error('Error loading assessment:', error);
      setSaveError('Failed to load assessment. Redirecting...');
      setTimeout(() => navigate('/assessments'), 2000);
    } finally {
      setLoading(false);
    }
  }

  // Timer effect
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          submitAssessment(true); // Auto-submit when time expires
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Auto-save effect with debouncing
  useEffect(() => {
    if (!userAssessmentId || Object.keys(answers).length === 0) return;
    
    const saveTimeout = setTimeout(() => {
      saveAnswersToDatabase();
    }, 800); // Debounce saves by 800ms
    
    return () => clearTimeout(saveTimeout);
  }, [answers, userAssessmentId]);

  async function saveAnswersToDatabase() {
    if (!userAssessmentId) return;
    
    setSaveStatus('saving');
    setSaveError(null);
    
    try {
      // Prepare all answers for upsert
      const answersToSave = Object.entries(answers).map(([questionId, data]) => ({
        user_assessment_id: userAssessmentId,
        question_id: parseInt(questionId),
        answer: data.answer,
        score: data.score,
        updated_at: new Date().toISOString()
      }));
      
      if (answersToSave.length === 0) return;
      
      const { error } = await supabase
        .from('assessment_answers')
        .upsert(answersToSave, { onConflict: 'user_assessment_id,question_id' });
      
      if (error) throw error;
      
      setSaveStatus('saved');
      // Clear success message after 2 seconds
      setTimeout(() => {
        if (saveStatus === 'saved') setSaveStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Error saving answers:', error);
      setSaveStatus('error');
      setSaveError('Failed to auto-save. Check your connection.');
    }
  }

  function formatTime(seconds) {
    if (seconds === null || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function handleAnswer(questionId, answer, score) {
    setAnswers(prev => ({ 
      ...prev, 
      [questionId]: { answer, score, timestamp: new Date().toISOString() } 
    }));
  }

  function getLikertOptions() {
    return ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];
  }

  async function submitAssessment(isAutoSubmit = false) {
    if (submitting) return;
    
    setSubmitting(true);
    setSaveStatus('saving');
    
    try {
      // Final save before submission
      await saveAnswersToDatabase();
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      const totalScore = Object.values(answers).reduce((sum, a) => sum + (a.score || 0), 0);
      const maxScore = questions.length * 5;
      const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
      
      const { error: updateError } = await supabase
        .from('user_assessments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          score: percentage,
          completed_automatically: isAutoSubmit
        })
        .eq('id', userAssessmentId);
      
      if (updateError) throw updateError;
      
      navigate(`/assessment/results/${userAssessmentId}`);
    } catch (error) {
      console.error('Error submitting assessment:', error);
      setSaveStatus('error');
      setSaveError('Failed to submit. Please try again.');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-slate-400 mb-2">Loading assessment...</div>
          <div className="text-sm text-slate-600">This may take a moment</div>
        </div>
      </div>
    );
  }
  
  if (!assessment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">Assessment not found</p>
          <button 
            onClick={() => navigate('/assessments')}
            className="text-primary-500 hover:text-primary-400"
          >
            Return to Assessments
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const isLast = currentQuestion === questions.length - 1;
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const hasCurrentAnswer = answers[currentQ?.id]?.answer;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <button 
            onClick={() => navigate('/assessments')} 
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Assessments
          </button>
          
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">{assessment.name}</h1>
            
            {/* Auto-save indicator */}
            <div className="flex items-center gap-2">
              {saveStatus === 'saving' && (
                <div className="flex items-center gap-1 text-amber-400">
                  <Save className="w-4 h-4 animate-pulse" />
                  <span className="text-xs">Saving...</span>
                </div>
              )}
              {saveStatus === 'saved' && (
                <div className="flex items-center gap-1 text-emerald-500">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-xs">Saved</span>
                </div>
              )}
              {saveStatus === 'error' && (
                <div className="flex items-center gap-1 text-red-500" title={saveError}>
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs">Save failed</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <p className="text-slate-400">
              Question {currentQuestion + 1} of {questions.length}
              {hasCurrentAnswer && <span className="ml-2 text-xs text-emerald-500">✓ Answered</span>}
            </p>
            <div className="flex items-center gap-2 text-amber-400">
              <Clock className="w-4 h-4" />
              <span className="font-mono">{formatTime(timeLeft)}</span>
            </div>
          </div>
          
          <div className="w-full bg-slate-800 rounded-full h-2 mt-3">
            <div 
              className="bg-primary-500 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question */}
        {currentQ && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-6">{currentQ.question_text}</h2>
            
            {currentQ.question_type === 'likert' && (
              <div className="space-y-3">
                {getLikertOptions().map((option, idx) => {
                  const score = idx + 1;
                  const isSelected = answers[currentQ.id]?.answer === option;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(currentQ.id, option, score)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        isSelected
                          ? 'bg-primary-600/20 border border-primary-500 text-white'
                          : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            )}
            
            {/* Add support for other question types */}
            {currentQ.question_type === 'multiple_choice' && (
              <div className="space-y-3">
                {/* Multiple choice options would go here */}
                <p className="text-slate-400">Multiple choice questions coming soon</p>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => setCurrentQuestion(prev => prev - 1)}
            disabled={currentQuestion === 0}
            className="px-5 py-2 bg-slate-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
          >
            Previous
          </button>
          
          <div className="text-xs text-slate-500">
            {Object.keys(answers).length} of {questions.length} answered
          </div>
          
          {!isLast ? (
            <button
              onClick={() => setCurrentQuestion(prev => prev + 1)}
              disabled={!hasCurrentAnswer}
              className="px-5 py-2 bg-primary-500 text-white rounded-lg flex items-center gap-2 hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => submitAssessment(false)}
              disabled={!hasCurrentAnswer || submitting}
              className="px-5 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2 hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit Assessment <CheckCircle className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
        
        {/* Error message display */}
        {saveError && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {saveError}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

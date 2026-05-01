import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { ArrowLeft, ArrowRight, Clock, CheckCircle } from 'lucide-react';

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

  useEffect(() => { loadAssessment(); }, [id]);

  async function loadAssessment() {
    const { data: assessmentData } = await supabase
      .from('assessments')
      .select('*')
      .eq('id', id)
      .single();
    setAssessment(assessmentData);
    setTimeLeft(assessmentData?.duration_minutes * 60);

    const { data: questionsData } = await supabase
      .from('assessment_questions')
      .select('*')
      .eq('assessment_id', id)
      .order('order_index', { ascending: true });
    setQuestions(questionsData || []);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: existing } = await supabase
        .from('user_assessments')
        .select('id')
        .eq('user_id', user.id)
        .eq('assessment_id', id)
        .eq('status', 'in_progress')
        .single();
      
      if (existing) {
        setUserAssessmentId(existing.id);
        const { data: existingAnswers } = await supabase
          .from('assessment_answers')
          .select('question_id, answer, score')
          .eq('user_assessment_id', existing.id);
        
        const answersMap = {};
        existingAnswers?.forEach(a => { answersMap[a.question_id] = { answer: a.answer, score: a.score }; });
        setAnswers(answersMap);
      } else {
        const { data: newUserAssessment } = await supabase
          .from('user_assessments')
          .insert({ user_id: user.id, assessment_id: id })
          .select()
          .single();
        setUserAssessmentId(newUserAssessment.id);
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          submitAssessment();
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

  function handleAnswer(questionId, answer, score) {
    setAnswers(prev => ({ ...prev, [questionId]: { answer, score } }));
    
    if (userAssessmentId) {
      supabase.from('assessment_answers').upsert({
        user_assessment_id: userAssessmentId,
        question_id: questionId,
        answer: answer,
        score: score
      });
    }
  }

  function getLikertOptions() {
    return ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];
  }

  async function submitAssessment() {
    setSubmitting(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    const totalScore = Object.values(answers).reduce((sum, a) => sum + (a.score || 0), 0);
    const maxScore = questions.length * 5;
    const percentage = Math.round((totalScore / maxScore) * 100);
    
    await supabase
      .from('user_assessments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        score: percentage
      })
      .eq('id', userAssessmentId);
    
    navigate(`/assessment-results/${userAssessmentId}`);
  }

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-slate-400">Loading assessment...</div></div>;
  if (!assessment) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-slate-400">Assessment not found</p></div>;

  const currentQ = questions[currentQuestion];
  const isLast = currentQuestion === questions.length - 1;
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <button onClick={() => navigate('/assessments')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Assessments
          </button>
          <h1 className="text-2xl font-bold text-white">{assessment.name}</h1>
          <div className="flex items-center justify-between mt-3">
            <p className="text-slate-400">Question {currentQuestion + 1} of {questions.length}</p>
            <div className="flex items-center gap-2 text-amber-400">
              <Clock className="w-4 h-4" />
              <span className="font-mono">{formatTime(timeLeft)}</span>
            </div>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 mt-3">
            <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
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
                          ? 'bg-emerald-600/20 border border-emerald-500 text-white'
                          : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={() => setCurrentQuestion(prev => prev - 1)}
            disabled={currentQuestion === 0}
            className="px-5 py-2 bg-slate-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700"
          >
            Previous
          </button>
          
          {!isLast ? (
            <button
              onClick={() => setCurrentQuestion(prev => prev + 1)}
              disabled={!answers[currentQ?.id]}
              className="px-5 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2 hover:bg-emerald-500 disabled:opacity-50"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={submitAssessment}
              disabled={!answers[currentQ?.id] || submitting}
              className="px-5 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2 hover:bg-emerald-500 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Assessment'} <CheckCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

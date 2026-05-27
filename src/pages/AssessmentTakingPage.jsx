// src/pages/AssessmentTakingPage.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useParams } from 'react-router-dom';

export default function AssessmentTakingPage() {
  const { assessmentId } = useParams();
  const [assessment, setAssessment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadAssessmentAndQuestions() {
      console.log("🔍 Loading assessment ID:", assessmentId);
      
      // 1. Get the assessment details
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();
      
      if (assessmentError) {
        console.error("Assessment error:", assessmentError);
        setError(`Failed to load assessment: ${assessmentError.message}`);
        setLoading(false);
        return;
      }
      
      setAssessment(assessmentData);
      console.log("✅ Found assessment:", assessmentData.title);
      
      // 2. Get questions - TRY MULTIPLE APPROACHES
      let questionsData = null;
      let questionsError = null;
      
      // Approach 1: Direct by assessment_id
      const result1 = await supabase
        .from('assessment_questions')
        .select('*')
        .eq('assessment_id', assessmentId);
      
      if (result1.error) {
        console.log("Approach 1 failed:", result1.error.message);
        
        // Approach 2: Try by assessmentId (camelCase)
        const result2 = await supabase
          .from('assessment_questions')
          .select('*')
          .eq('assessmentId', assessmentId);
        
        if (result2.error) {
          console.log("Approach 2 failed:", result2.error.message);
          
          // Approach 3: Get ALL questions and filter client-side
          const result3 = await supabase
            .from('assessment_questions')
            .select('*');
          
          questionsData = result3.data;
          questionsError = result3.error;
          
          // Client-side filter
          if (questionsData) {
            questionsData = questionsData.filter(q => 
              q.assessment_id === assessmentId || 
              q.assessmentId === assessmentId ||
              q.assessment_id?.toString() === assessmentId ||
              q.assessmentId?.toString() === assessmentId
            );
            console.log(`Filtered to ${questionsData.length} questions client-side`);
          }
        } else {
          questionsData = result2.data;
          questionsError = result2.error;
        }
      } else {
        questionsData = result1.data;
        questionsError = result1.error;
      }
      
      if (questionsError) {
        console.error("Questions error:", questionsError);
        setError(`Failed to load questions: ${questionsError.message}`);
      } else if (!questionsData || questionsData.length === 0) {
        setError(`No questions found for this assessment. Assessment ID: ${assessmentId}`);
        console.log("Available assessments in DB:", await supabase.from('assessments').select('id, title'));
        console.log("Sample question from DB:", await supabase.from('assessment_questions').select('assessment_id, question_text').limit(3));
      } else {
        console.log(`✅ Loaded ${questionsData.length} questions`);
        setQuestions(questionsData);
      }
      
      setLoading(false);
    }
    
    if (assessmentId) {
      loadAssessmentAndQuestions();
    }
  }, [assessmentId]);

  if (loading) return <div className="p-8">Loading assessment...</div>;
  if (error) return (
    <div className="p-8 text-red-600">
      <h2 className="text-xl font-bold">Error Loading Assessment</h2>
      <p>{error}</p>
      <button 
        onClick={() => window.location.reload()}
        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
      >
        Try Again
      </button>
    </div>
  );

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{assessment?.title}</h1>
      <p className="mb-6">{assessment?.description}</p>
      
      <div className="space-y-6">
        {questions.map((q, index) => (
          <div key={q.id} className="border rounded-lg p-4">
            <p className="font-medium mb-3">
              {index + 1}. {q.question_text || q.text || q.question}
            </p>
            <div className="space-y-2 ml-4">
              {q.option_a && <label className="flex items-center gap-2"><input type="radio" name={`q${q.id}`} /> A. {q.option_a}</label>}
              {q.option_b && <label className="flex items-center gap-2"><input type="radio" name={`q${q.id}`} /> B. {q.option_b}</label>}
              {q.option_c && <label className="flex items-center gap-2"><input type="radio" name={`q${q.id}`} /> C. {q.option_c}</label>}
              {q.option_d && <label className="flex items-center gap-2"><input type="radio" name={`q${q.id}`} /> D. {q.option_d}</label>}
            </div>
          </div>
        ))}
      </div>
      
      {questions.length === 0 && (
        <div className="text-center text-gray-500 mt-8">
          No questions loaded. Please check database connection.
        </div>
      )}
    </div>
  );
}

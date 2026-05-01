import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Award, TrendingUp, FileText, Share2, Download, ArrowLeft } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AssessmentResults() {
  const { id } = useParams();
  const [result, setResult] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadResults(); }, [id]);

  async function loadResults() {
    const { data: resultData } = await supabase
      .from('user_assessments')
      .select('*, assessments:assessment_id(*)')
      .eq('id', id)
      .single();
    
    if (resultData) {
      setResult(resultData);
      setAssessment(resultData.assessments);
    }
    setLoading(false);
  }

  function getScoreColor(score) {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-sky-400';
    if (score >= 40) return 'text-amber-400';
    return 'text-red-400';
  }

  function getScoreMessage(score) {
    if (score >= 80) return 'Excellent! You show strong proficiency in this area.';
    if (score >= 60) return 'Good! You have solid foundational knowledge.';
    if (score >= 40) return 'Developing. Focus on improving key areas.';
    return 'Needs improvement. Consider taking recommended courses.';
  }

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-slate-400">Loading results...</div></div>;
  if (!result) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-slate-400">Results not found</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link to="/assessments" className="flex items-center gap-2 text-slate-400 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Assessments
        </Link>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 mb-4">
            <Award className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">{assessment?.name} Results</h1>
          <p className="text-slate-400">Completed on {new Date(result.completed_at).toLocaleDateString()}</p>
        </div>

        {/* Score Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center mb-8">
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-slate-800 mb-4">
            <span className={`text-4xl font-bold ${getScoreColor(result.score)}`}>{result.score}%</span>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Your Score</h2>
          <p className="text-slate-400 max-w-md mx-auto">{getScoreMessage(result.score)}</p>
        </div>

        {/* Insights */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-400" /> Key Insights</h3>
          <ul className="space-y-3 text-slate-300">
            <li className="flex items-start gap-2"><span className="text-emerald-400">✓</span> You scored in the top {100 - (result.percentile || 50)}% of test-takers</li>
            <li className="flex items-start gap-2"><span className="text-emerald-400">✓</span> Your strengths lie in analytical and structured thinking</li>
            <li className="flex items-start gap-2"><span className="text-amber-400">⟳</span> Consider developing your communication and collaboration skills</li>
          </ul>
        </div>

        {/* Recommended Actions */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Recommended Next Steps</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a href="/courses" className="p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors">
              <h4 className="font-medium text-white mb-1">📚 Recommended Courses</h4>
              <p className="text-sm text-slate-400">Based on your results, we suggest Communication Skills and Leadership courses.</p>
            </a>
            <a href="/hire-va" className="p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors">
              <h4 className="font-medium text-white mb-1">🤖 Hire a Virtual Assistant</h4>
              <p className="text-sm text-slate-400">Get personalized coaching and development plan.</p>
            </a>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 justify-center">
          <button className="px-5 py-2 bg-slate-800 text-white rounded-lg flex items-center gap-2 hover:bg-slate-700">
            <Download className="w-4 h-4" /> Download Report (PDF)
          </button>
          <button className="px-5 py-2 bg-slate-800 text-white rounded-lg flex items-center gap-2 hover:bg-slate-700">
            <Share2 className="w-4 h-4" /> Share with Employer
          </button>
          <Link to={`/assessments/${assessment?.id}`} className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500">
            Retake Assessment
          </Link>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Clock, DollarSign, Brain, Briefcase, Users, TrendingUp, ChevronRight, Award } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [user, setUser] = useState(null);
  const [userResults, setUserResults] = useState({});

  useEffect(() => {
    loadUser();
    loadAssessments();
  }, []);

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      const { data: results } = await supabase
        .from('user_assessments')
        .select('assessment_id, score, completed_at')
        .eq('user_id', user.id)
        .eq('status', 'completed');
      
      const resultsMap = {};
      results?.forEach(r => { resultsMap[r.assessment_id] = r.score; });
      setUserResults(resultsMap);
    }
  }

  async function loadAssessments() {
    let query = supabase.from('assessments').select('*').eq('is_active', true);
    const { data, error } = await query;
    if (!error) setAssessments(data || []);
    setLoading(false);
  }

  const categories = [
    { value: 'all', label: 'All Assessments', icon: Brain },
    { value: 'psychometric', label: 'Psychometric', icon: Brain },
    { value: 'workplace_skill', label: 'Workplace Skills', icon: Briefcase },
    { value: 'career_aptitude', label: 'Career Aptitude', icon: TrendingUp },
  ];

  const filteredAssessments = selectedCategory === 'all' 
    ? assessments 
    : assessments.filter(a => a.category === selectedCategory);

  const getCategoryIcon = (category) => {
    switch(category) {
      case 'psychometric': return <Brain className="w-5 h-5 text-purple-400" />;
      case 'workplace_skill': return <Briefcase className="w-5 h-5 text-emerald-400" />;
      case 'career_aptitude': return <TrendingUp className="w-5 h-5 text-sky-400" />;
      default: return <Award className="w-5 h-5 text-amber-400" />;
    }
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-slate-400">Loading assessments...</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-white mb-4">Assessments</h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Discover your strengths, identify growth opportunities, and unlock your full potential with our scientifically designed assessments.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-3 justify-center mb-10">
          {categories.map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-5 py-2 rounded-full flex items-center gap-2 transition-all ${
                selectedCategory === cat.value
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <cat.icon className="w-4 h-4" />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Assessments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssessments.map(assessment => (
            <div key={assessment.id} className="group bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-emerald-500/30 hover:bg-slate-900/70 transition-all hover:-translate-y-1">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center">
                    {getCategoryIcon(assessment.category)}
                  </div>
                  {userResults[assessment.id] && (
                    <div className="text-right">
                      <span className="text-xs text-slate-500">Your Score</span>
                      <div className="text-xl font-bold text-emerald-400">{userResults[assessment.id]}%</div>
                    </div>
                  )}
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2">{assessment.name}</h3>
                <p className="text-slate-400 text-sm mb-4">{assessment.description}</p>
                
                <div className="flex items-center justify-between mb-5 text-sm text-slate-500">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{assessment.duration_minutes} min</span>
                  <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{assessment.price === 0 ? 'Free' : `$${assessment.price}`}</span>
                  <span>{assessment.question_count} questions</span>
                </div>
                
                <a
                  href={`/assessments/${assessment.id}`}
                  className="w-full py-2.5 bg-emerald-600 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-emerald-500 transition-colors group-hover:shadow-lg group-hover:shadow-emerald-600/20"
                >
                  {userResults[assessment.id] ? 'Retake Assessment' : 'Start Assessment'}
                  <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Free Tier Notice */}
        <div className="mt-12 p-4 bg-slate-900/30 border border-slate-800 rounded-lg text-center">
          <p className="text-slate-400 text-sm">
            🎓 Free users get 1 free assessment per month. {' '}
            <a href="/pricing" className="text-emerald-400 hover:underline">Upgrade to Professional</a> for unlimited access and detailed reports.
          </p>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { 
  Clock, DollarSign, Brain, Briefcase, TrendingUp, 
  ChevronRight, Award, AlertCircle, Filter, Search,
  Star, Zap, Users, BookOpen, CheckCircle, XCircle
} from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name'); // name, price_asc, price_desc, duration
  const [user, setUser] = useState(null);
  const [userResults, setUserResults] = useState({});
  const [userAttempts, setUserAttempts] = useState({});

  // Load user and assessments on mount
  useEffect(() => {
    loadUser();
    loadAssessments();
  }, []);

  async function loadUser() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      setUser(user);
      if (user) {
        // Load completed assessments with scores
        const { data: results, error: resultsError } = await supabase
          .from('user_assessments')
          .select('assessment_id, score, completed_at, status')
          .eq('user_id', user.id)
          .eq('status', 'completed');
        
        if (resultsError) throw resultsError;
        
        const resultsMap = {};
        const attemptsMap = {};
        results?.forEach(r => {
          resultsMap[r.assessment_id] = r.score;
          attemptsMap[r.assessment_id] = (attemptsMap[r.assessment_id] || 0) + 1;
        });
        setUserResults(resultsMap);
        setUserAttempts(attemptsMap);
      }
    } catch (err) {
      console.error('Error loading user data:', err);
    }
  }

  async function loadAssessments() {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: assessmentsError } = await supabase
        .from('assessments')
        .select('*')
        .eq('is_active', true);
      
      if (assessmentsError) throw assessmentsError;
      
      setAssessments(data || []);
    } catch (err) {
      console.error('Error loading assessments:', err);
      setError('Failed to load assessments. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }

  const categories = useMemo(() => [
    { value: 'all', label: 'All Assessments', icon: Brain, color: 'purple' },
    { value: 'psychometric', label: 'Psychometric', icon: Brain, color: 'purple' },
    { value: 'workplace_skill', label: 'Workplace Skills', icon: Briefcase, color: 'emerald' },
    { value: 'career_aptitude', label: 'Career Aptitude', icon: TrendingUp, color: 'sky' },
    { value: 'technical', label: 'Technical', icon: Zap, color: 'amber' },
  ], []);

  const sortOptions = [
    { value: 'name', label: 'Name A-Z' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'duration', label: 'Duration: Shortest First' },
    { value: 'popularity', label: 'Most Popular' },
  ];

  // Filter and sort assessments
  const filteredAndSortedAssessments = useMemo(() => {
    let filtered = selectedCategory === 'all' 
      ? assessments 
      : assessments.filter(a => a.category === selectedCategory);
    
    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a => 
        a.name.toLowerCase().includes(term) ||
        a.description.toLowerCase().includes(term) ||
        a.category?.toLowerCase().includes(term)
      );
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'price_asc':
        filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price_desc':
        filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'duration':
        filtered.sort((a, b) => (a.duration_minutes || 0) - (b.duration_minutes || 0));
        break;
      case 'popularity':
        filtered.sort((a, b) => (b.taken_count || 0) - (a.taken_count || 0));
        break;
      default:
        break;
    }
    
    return filtered;
  }, [assessments, selectedCategory, searchTerm, sortBy]);

  const getCategoryIcon = useCallback((category) => {
    switch(category) {
      case 'psychometric': return <Brain className="w-5 h-5 text-purple-400" />;
      case 'workplace_skill': return <Briefcase className="w-5 h-5 text-emerald-400" />;
      case 'career_aptitude': return <TrendingUp className="w-5 h-5 text-sky-400" />;
      case 'technical': return <Zap className="w-5 h-5 text-amber-400" />;
      default: return <Award className="w-5 h-5 text-slate-400" />;
    }
  }, []);

  const getScoreColor = useCallback((score) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-red-400';
  }, []);

  const formatPrice = useCallback((price) => {
    if (price === 0) return 'Free';
    return `$${price}`;
  }, []);

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading assessments...</p>
          <p className="text-xs text-slate-600 mt-2">Preparing your personalized recommendations</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Unable to Load Assessments</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
            >
              Try Again
            </button>
            <Link 
              to="/"
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/10 to-purple-600/10" />
        <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-600/20 text-emerald-400 rounded-full text-sm mb-4">
              <Brain className="w-4 h-4" />
              Professional Assessments
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Discover Your Potential
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-8">
              Science-backed assessments to help you understand your strengths and identify growth opportunities.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-md mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search assessments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="sticky top-16 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Category Filters */}
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                    selectedCategory === cat.value
                      ? `bg-${cat.color}-600 text-white shadow-lg shadow-${cat.color}-600/20`
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                  aria-pressed={selectedCategory === cat.value}
                >
                  <cat.icon className="w-4 h-4" aria-hidden="true" />
                  {cat.label}
                </button>
              ))}
            </div>
            
            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {sortOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results Stats */}
      <div className="max-w-7xl mx-auto px-4 pt-6 pb-2 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <p className="text-sm text-slate-400">
            Showing {filteredAndSortedAssessments.length} of {assessments.length} assessments
          </p>
          {(searchTerm || selectedCategory !== 'all') && (
            <button 
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
              }}
              className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <XCircle className="w-3 h-3" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Assessments Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6 pb-20 sm:px-6 lg:px-8">
        {filteredAndSortedAssessments.length === 0 ? (
          <div className="text-center py-16">
            <Brain className="w-20 h-20 text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Assessments Found</h3>
            <p className="text-slate-400 mb-4">
              {searchTerm 
                ? `No results for "${searchTerm}". Try a different search term.`
                : 'No assessments available in this category yet.'}
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
              }}
              className="text-emerald-400 hover:text-emerald-300"
            >
              View all assessments
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedAssessments.map(assessment => (
              <div 
                key={assessment.id} 
                className="group bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-emerald-500/30 hover:bg-slate-900/70 transition-all hover:-translate-y-2 duration-300"
              >
                <div className="p-6">
                  {/* Header with Icon and Score */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                      {getCategoryIcon(assessment.category)}
                    </div>
                    {userResults[assessment.id] && (
                      <div className="text-right">
                        <span className="text-xs text-slate-500">Your Score</span>
                        <div className={`text-2xl font-bold ${getScoreColor(userResults[assessment.id])}`}>
                          {userResults[assessment.id]}%
                        </div>
                        {userAttempts[assessment.id] > 1 && (
                          <span className="text-xs text-slate-500">
                            Taken {userAttempts[assessment.id]} times
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Assessment Info */}
                  <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">
                    {assessment.name}
                  </h3>
                  <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                    {assessment.description}
                  </p>
                  
                  {/* Meta Info */}
                  <div className="flex items-center justify-between mb-5 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                      {assessment.duration_minutes} min
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" aria-hidden="true" />
                      {formatPrice(assessment.price)}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                      {assessment.question_count} questions
                    </span>
                  </div>
                  
                  {/* Difficulty Badge (if available) */}
                  {assessment.difficulty && (
                    <div className="mb-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        assessment.difficulty === 'beginner' ? 'bg-emerald-500/20 text-emerald-400' :
                        assessment.difficulty === 'intermediate' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {assessment.difficulty.charAt(0).toUpperCase() + assessment.difficulty.slice(1)}
                      </span>
                    </div>
                  )}
                  
                  {/* CTA Button */}
                  <Link
                    to={`/assessment/${assessment.id}`}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-lg flex items-center justify-center gap-2 hover:from-emerald-500 hover:to-emerald-400 transition-all duration-200 group-hover:shadow-lg group-hover:shadow-emerald-600/20 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                    aria-label={`Start ${assessment.name} assessment`}
                  >
                    {userResults[assessment.id] ? (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Retake Assessment
                      </>
                    ) : (
                      <>
                        <Star className="w-4 h-4" />
                        Start Assessment
                      </>
                    )}
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Free Tier Notice */}
      {!user && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 animate-slide-up">
          <div className="bg-gradient-to-r from-emerald-600 to-purple-600 rounded-xl shadow-2xl p-4 max-w-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">Sign in to track your progress</p>
                <p className="text-white/80 text-xs">Get personalized recommendations and save your results</p>
              </div>
              <Link 
                to="/sign-in"
                className="px-3 py-1.5 bg-white text-emerald-600 rounded-lg text-sm font-semibold hover:bg-white/90 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Banner for Free Users */}
      {user && !userResults && (
        <div className="max-w-7xl mx-auto px-4 pb-12 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-emerald-600/10 to-purple-600/10 border border-emerald-500/20 rounded-xl p-6 text-center">
            <p className="text-slate-400 text-sm">
              🎓 Free users get 1 free assessment per month.{' '}
              <Link to="/pricing" className="text-emerald-400 hover:underline font-medium">
                Upgrade to Professional
              </Link>{' '}
              for unlimited access and detailed reports.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Add this CSS to your global styles
const styles = `
  @keyframes slide-up {
    from {
      opacity: 0;
      transform: translate(-50%, 20px);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }

  .animate-slide-up {
    animation: slide-up 0.3s ease-out;
  }

  .line-clamp-1 {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

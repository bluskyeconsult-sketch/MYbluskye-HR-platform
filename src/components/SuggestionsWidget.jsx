// src/components/SuggestionsWidget.jsx
// Personalized suggestions for users

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { BookOpen, Briefcase, TrendingUp, Sparkles, ChevronRight } from 'lucide-react';

export default function SuggestionsWidget() {
  const [suggestions, setSuggestions] = useState({
    articles: [],
    courses: [],
    jobs: []
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    getUserAndSuggestions();
  }, []);

  async function getUserAndSuggestions() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    await loadSuggestions(user?.id);
  }

  async function loadSuggestions(userId) {
    setLoading(true);
    
    try {
      // Fetch recent articles
      const { data: articles } = await supabase
        .from('articles')
        .select('id, title, slug, excerpt, cover_image')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(3);
      
      // Fetch popular courses
      const { data: courses } = await supabase
        .from('courses')
        .select('id, title, slug, description, difficulty, cover_image')
        .eq('is_published', true)
        .order('enrollment_count', { ascending: false })
        .limit(3);
      
      // Fetch recent jobs
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title, company, location, salary_min')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(3);
      
      setSuggestions({
        articles: articles || [],
        courses: courses || [],
        jobs: jobs || []
      });
    } catch (error) {
      console.error('Error loading suggestions:', error);
      // Fallback suggestions
      setSuggestions({
        articles: [
          { id: 1, title: 'The Future of AI in HR', slug: 'future-of-ai-in-hr', excerpt: 'How artificial intelligence is transforming human resources...' },
          { id: 2, title: 'New Employment Laws 2026', slug: 'employment-law-changes-2026', excerpt: 'Stay compliant with the latest regulations...' },
          { id: 3, title: 'Skill Trust Score Explained', slug: 'skill-trust-score-explained', excerpt: 'Understanding our verification system...' }
        ],
        courses: [
          { id: 1, title: 'AI for HR Professionals', slug: 'ai-for-hr', description: 'Master AI tools for HR', difficulty: 'Intermediate' },
          { id: 2, title: 'Workforce Analytics', slug: 'workforce-analytics', description: 'Data-driven HR decisions', difficulty: 'Beginner' },
          { id: 3, title: 'Leadership Skills', slug: 'leadership-skills', description: 'Become a better leader', difficulty: 'Advanced' }
        ],
        jobs: [
          { id: 1, title: 'Senior HR Manager', company: 'Tech Corp', location: 'London', salary_min: 60000 },
          { id: 2, title: 'AI Specialist', company: 'ODUSBABA', location: 'Remote', salary_min: 80000 },
          { id: 3, title: 'Workforce Analyst', company: 'Global Solutions', location: 'Oxford', salary_min: 45000 }
        ]
      });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-slate-900/50 rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-slate-800 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-3 bg-slate-800 rounded w-full"></div>
          <div className="h-3 bg-slate-800 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Suggested Articles */}
      {suggestions.articles.length > 0 && (
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-primary-400" />
            <h3 className="text-white font-semibold">Latest Articles</h3>
            <span className="text-xs text-slate-500 ml-auto">For you</span>
          </div>
          <div className="space-y-3">
            {suggestions.articles.map(article => (
              <Link 
                key={article.id} 
                to={`/articles/${article.slug}`}
                className="block group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-white text-sm font-medium group-hover:text-primary-400 transition">
                      {article.title}
                    </h4>
                    <p className="text-slate-400 text-xs mt-1 line-clamp-1">
                      {article.excerpt?.substring(0, 80)}...
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-primary-400 transition flex-shrink-0 mt-1" />
                </div>
              </Link>
            ))}
          </div>
          <Link to="/articles" className="text-primary-400 text-xs hover:underline mt-3 inline-block">
            View all articles →
          </Link>
        </div>
      )}

      {/* Suggested Courses */}
      {suggestions.courses.length > 0 && (
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <h3 className="text-white font-semibold">Trending Courses</h3>
            <span className="text-xs text-slate-500 ml-auto">Popular now</span>
          </div>
          <div className="space-y-3">
            {suggestions.courses.map(course => (
              <Link 
                key={course.id} 
                to={`/courses/${course.slug}`}
                className="block group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-white text-sm font-medium group-hover:text-primary-400 transition">
                      {course.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        course.difficulty === 'Beginner' ? 'bg-green-500/20 text-green-400' :
                        course.difficulty === 'Intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {course.difficulty}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-primary-400 transition flex-shrink-0 mt-1" />
                </div>
              </Link>
            ))}
          </div>
          <Link to="/courses" className="text-primary-400 text-xs hover:underline mt-3 inline-block">
            Browse all courses →
          </Link>
        </div>
      )}

      {/* Suggested Jobs */}
      {suggestions.jobs.length > 0 && (
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="w-5 h-5 text-amber-400" />
            <h3 className="text-white font-semibold">Recent Jobs</h3>
            <span className="text-xs text-slate-500 ml-auto">New this week</span>
          </div>
          <div className="space-y-3">
            {suggestions.jobs.map(job => (
              <Link 
                key={job.id} 
                to={`/jobs/${job.id}`}
                className="block group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-white text-sm font-medium group-hover:text-primary-400 transition">
                      {job.title}
                    </h4>
                    <p className="text-slate-400 text-xs mt-1">
                      {job.company} • {job.location}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-primary-400 transition flex-shrink-0 mt-1" />
                </div>
              </Link>
            ))}
          </div>
          <Link to="/jobs" className="text-primary-400 text-xs hover:underline mt-3 inline-block">
            View all jobs →
          </Link>
        </div>
      )}
    </div>
  );
}

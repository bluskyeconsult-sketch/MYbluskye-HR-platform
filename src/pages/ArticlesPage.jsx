import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Calendar, User, Eye, ArrowRight, Flame, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ArticlesPage() {
  const [articles, setArticles] = useState([]);
  const [featuredArticles, setFeaturedArticles] = useState([]);
  const [trendingTopics, setTrendingTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArticles();
    loadTrendingTopics();
  }, []);

  async function loadArticles() {
    const { data } = await supabase
      .from('articles')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (data) {
      setFeaturedArticles(data.filter(a => a.is_featured === true).slice(0, 3));
      setArticles(data);
    }
    setLoading(false);
  }

  async function loadTrendingTopics() {
    // Get popular tags from articles
    const { data } = await supabase.from('articles').select('tags');
    if (data) {
      const tagCounts = {};
      data.forEach(article => {
        if (article.tags) {
          article.tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        }
      });
      const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
      setTrendingTopics(sorted.map(([tag]) => tag));
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading articles...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Articles & Research</h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            In-depth insights, research findings, and expert analysis on HR trends, employment laws, and workforce intelligence.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1">
            {/* Featured Articles Section */}
            {featuredArticles.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <span className="w-1 h-6 bg-primary-500 rounded-full"></span>
                  Featured Articles
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {featuredArticles.map(article => (
                    <Link
                      key={article.id}
                      to={`/articles/${article.slug}`}
                      className="group bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-primary-500/30 hover:bg-slate-900/70 transition-all hover:-translate-y-1"
                    >
                      <div className="p-6">
                        <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(article.published_at).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1"><User className="w-3 h-3" />{article.author}</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary-400 transition-colors">{article.title}</h3>
                        <p className="text-slate-400 text-sm mb-4 line-clamp-2">{article.excerpt}</p>
                        <div className="flex items-center gap-2 text-primary-400 text-sm font-medium group-hover:gap-3 transition-all">
                          Read more <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* All Articles Grid */}
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-1 h-6 bg-primary-500 rounded-full"></span>
              All Articles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map(article => (
                <Link
                  key={article.id}
                  to={`/articles/${article.slug}`}
                  className="group bg-slate-900/30 border border-slate-800 rounded-xl p-5 hover:border-primary-500/30 hover:bg-slate-900/50 transition-all hover:-translate-y-1"
                >
                  <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(article.published_at).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{article.author}</span>
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{article.view_count || 0}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-primary-400 transition-colors">{article.title}</h3>
                  <p className="text-slate-400 text-sm line-clamp-2">{article.excerpt}</p>
                </Link>
              ))}
            </div>

            {articles.length === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-400">No articles yet. Check back soon for insights and research.</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:w-80 space-y-6">
            {/* Trending Topics */}
            {trendingTopics.length > 0 && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 sticky top-24">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-400" /> Trending Topics
                </h3>
                <div className="flex flex-wrap gap-2">
                  {trendingTopics.map(topic => (
                    <span key={topic} className="px-3 py-1 bg-slate-800 rounded-full text-sm text-slate-300 hover:bg-slate-700 cursor-pointer">
                      #{topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

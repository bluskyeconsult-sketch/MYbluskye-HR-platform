import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Calendar, User, Eye, ArrowLeft, Share2, Send, Megaphone, Sparkles } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ArticleDetail() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAIAssist, setShowAIAssist] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadArticle();
    checkUser();
  }, [slug]);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  }

  async function loadArticle() {
    const { data } = await supabase
      .from('articles')
      .select('*')
      .eq('slug', slug)
      .single();

    if (data) {
      setArticle(data);
      // Increment view count
      await supabase
        .from('articles')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', data.id);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading article...</div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Article Not Found</h1>
          <Link to="/articles" className="text-primary-400 hover:underline">Back to Articles</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Back button */}
        <Link to="/articles" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Articles
        </Link>

        {/* Article Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{new Date(article.published_at).toLocaleDateString()}</span>
            <span className="flex items-center gap-1"><User className="w-4 h-4" />{article.author}</span>
            <span className="flex items-center gap-1"><Eye className="w-4 h-4" />{article.view_count} views</span>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">{article.title}</h1>
          <p className="text-xl text-slate-300">{article.excerpt}</p>
        </div>

        {/* Action Buttons (Admin only) */}
        {user && (
          <div className="flex flex-wrap gap-3 mb-8 p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
            <button
              onClick={() => setShowAIAssist(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 border border-purple-500/30 rounded-lg text-purple-400 text-sm hover:bg-purple-600/30 transition-colors"
            >
              <Sparkles className="w-4 h-4" /> AI Assist
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm hover:bg-emerald-600/30 transition-colors">
              <Send className="w-4 h-4" /> Send as Newsletter
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-amber-600/20 border border-amber-500/30 rounded-lg text-amber-400 text-sm hover:bg-amber-600/30 transition-colors">
              <Megaphone className="w-4 h-4" /> Push to Announcement
            </button>
          </div>
        )}

        {/* Article Content */}
        <div className="prose prose-invert prose-lg max-w-none">
          <div className="text-slate-300 leading-relaxed space-y-4 whitespace-pre-wrap">
            {article.content}
          </div>
        </div>

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="flex flex-wrap gap-2">
              {article.tags.map(tag => (
                <span key={tag} className="px-3 py-1 bg-slate-800 rounded-full text-xs text-slate-400">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Share Section */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-sm">Share this article:</span>
            <button
              onClick={() => navigator.share?.({ title: article.title, url: window.location.href })}
              className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <Share2 className="w-4 h-4 text-slate-300" />
            </button>
          </div>
        </div>
      </div>

      {/* AI Assist Modal */}
      {showAIAssist && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">AI Content Assistant</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Suggest Headlines</label>
                <button className="w-full text-left p-3 bg-slate-800 rounded-lg text-slate-300 hover:bg-slate-700">
                  💡 "The Ultimate Guide to {article.title}"
                </button>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Generate Social Posts</label>
                <button className="w-full text-left p-3 bg-slate-800 rounded-lg text-slate-300 hover:bg-slate-700">
                  📱 "Check out our latest article on {article.title}!"
                </button>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Improve Readability</label>
                <button className="w-full text-left p-3 bg-slate-800 rounded-lg text-slate-300 hover:bg-slate-700">
                  ✍️ Simplify complex sentences
                </button>
              </div>
            </div>
            <button onClick={() => setShowAIAssist(false)} className="mt-6 w-full py-2 bg-slate-700 text-white rounded-lg">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

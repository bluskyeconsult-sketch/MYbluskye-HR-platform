// src/pages/ArticleDetail.jsx
// COMPLETE PROFESSIONAL ARTICLE DETAIL PAGE - With API integration, AI assist, sharing, and related articles

import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { 
    Calendar, User, Eye, ArrowLeft, Share2, Send, Megaphone, 
    Sparkles, Loader2, AlertCircle, ThumbsUp, MessageCircle, 
    Bookmark, Twitter, Linkedin, Facebook, Copy, Check,
    Clock, Tag, TrendingUp, Shield, Award
} from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ArticleDetail() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [article, setArticle] = useState(null);
    const [relatedArticles, setRelatedArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAIAssist, setShowAIAssist] = useState(false);
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [user, setUser] = useState(null);
    const [isSaved, setIsSaved] = useState(false);
    const [copied, setCopied] = useState(false);
    const [aiGenerating, setAiGenerating] = useState(false);

    useEffect(() => {
        checkUser();
        loadArticle();
    }, [slug]);

    async function checkUser() {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (user) {
            // Check if article is saved
            const { data } = await supabase
                .from('saved_articles')
                .select('id')
                .eq('user_id', user.id)
                .eq('article_id', article?.id)
                .maybeSingle();
            setIsSaved(!!data);
        }
    }

    async function loadArticle() {
        setLoading(true);
        setError(null);
        
        try {
            // Try API first
            const response = await fetch(`/api/index?action=article&slug=${slug}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.article) {
                    setArticle(data.article);
                    await loadRelatedArticles(data.article);
                    return;
                }
            }
        } catch (err) {
            console.warn('API fetch failed, falling back to Supabase:', err);
        }
        
        // Fallback to Supabase
        const { data, error: supabaseError } = await supabase
            .from('articles')
            .select('*')
            .eq('slug', slug)
            .single();

        if (supabaseError || !data) {
            setError('Article not found');
            setLoading(false);
            return;
        }

        setArticle(data);
        await loadRelatedArticles(data);
        
        // Increment view count (non-blocking)
        await supabase
            .from('articles')
            .update({ view_count: (data.view_count || 0) + 1 })
            .eq('id', data.id);
            
        setLoading(false);
    }

    async function loadRelatedArticles(currentArticle) {
        if (!currentArticle) return;
        
        const { data } = await supabase
            .from('articles')
            .select('id, title, slug, excerpt, published_at, view_count')
            .eq('status', 'published')
            .neq('id', currentArticle.id)
            .limit(3);
        
        setRelatedArticles(data || []);
    }

    async function handleSaveArticle() {
        if (!user) {
            navigate('/sign-in?redirect=' + encodeURIComponent(`/articles/${slug}`));
            return;
        }
        
        if (isSaved) {
            await supabase
                .from('saved_articles')
                .delete()
                .eq('user_id', user.id)
                .eq('article_id', article.id);
            setIsSaved(false);
        } else {
            await supabase
                .from('saved_articles')
                .insert({ user_id: user.id, article_id: article.id });
            setIsSaved(true);
        }
    }

    async function handleAICommand(command) {
        setAiGenerating(true);
        
        try {
            const response = await fetch('/api/index?action=ai-assist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    command, 
                    title: article?.title,
                    content: article?.content 
                })
            });
            
            const data = await response.json();
            if (data.success && data.result) {
                alert(data.result);
            } else {
                throw new Error('AI command failed');
            }
        } catch (error) {
            console.error('AI command error:', error);
            alert('AI assist temporarily unavailable. Please try again later.');
        } finally {
            setAiGenerating(false);
        }
    }

    async function handleSendNewsletter() {
        if (!user) {
            navigate('/sign-in');
            return;
        }
        
        const response = await fetch('/api/index?action=newsletter-send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                articleId: article.id,
                action: 'send_article'
            })
        });
        
        if (response.ok) {
            alert('Newsletter sent to subscribers!');
        } else {
            alert('Failed to send newsletter. Please try again.');
        }
    }

    const shareUrls = {
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(article?.title)}&url=${encodeURIComponent(window.location.href)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
        copy: () => {
            navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    if (error || !article) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
                <div className="text-center max-w-md">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Article Not Found</h1>
                    <p className="text-slate-400 mb-6">The article you're looking for doesn't exist or has been removed.</p>
                    <Link to="/articles" className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                        Back to Articles
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                
                {/* Back button */}
                <Link 
                    to="/articles" 
                    className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition" /> 
                    Back to Articles
                </Link>

                {/* Article Header */}
                <div className="mb-8">
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-4">
                        <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(article.published_at).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })}
                        </span>
                        <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {article.author}
                        </span>
                        <span className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            {article.view_count || 0} views
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {Math.ceil((article.content?.length || 0) / 1000)} min read
                        </span>
                    </div>
                    
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
                        {article.title}
                    </h1>
                    
                    {article.excerpt && (
                        <p className="text-xl text-slate-300 leading-relaxed">
                            {article.excerpt}
                        </p>
                    )}
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
                        <button
                            onClick={handleSendNewsletter}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm hover:bg-emerald-600/30 transition-colors"
                        >
                            <Send className="w-4 h-4" /> Send as Newsletter
                        </button>
                        <button
                            className="flex items-center gap-2 px-4 py-2 bg-amber-600/20 border border-amber-500/30 rounded-lg text-amber-400 text-sm hover:bg-amber-600/30 transition-colors"
                        >
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
                                <Link 
                                    key={tag} 
                                    to={`/articles?tag=${encodeURIComponent(tag)}`}
                                    className="px-3 py-1.5 bg-slate-800 rounded-full text-xs text-slate-400 hover:bg-slate-700 hover:text-primary-400 transition"
                                >
                                    #{tag}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Action Bar */}
                <div className="mt-8 pt-6 border-t border-slate-800">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            {/* Save Button */}
                            <button
                                onClick={handleSaveArticle}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                                    isSaved 
                                        ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30' 
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                            >
                                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-primary-400' : ''}`} />
                                {isSaved ? 'Saved' : 'Save'}
                            </button>
                            
                            {/* Share Button */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowShareMenu(!showShareMenu)}
                                    className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg text-slate-400 hover:bg-slate-700 transition"
                                >
                                    <Share2 className="w-4 h-4" />
                                    Share
                                </button>
                                
                                {showShareMenu && (
                                    <div className="absolute bottom-full left-0 mb-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-2 flex gap-2">
                                        <a
                                            href={shareUrls.twitter}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 hover:bg-slate-700 rounded-lg transition text-[#1DA1F2]"
                                        >
                                            <Twitter className="w-4 h-4" />
                                        </a>
                                        <a
                                            href={shareUrls.linkedin}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 hover:bg-slate-700 rounded-lg transition text-[#0077B5]"
                                        >
                                            <Linkedin className="w-4 h-4" />
                                        </a>
                                        <a
                                            href={shareUrls.facebook}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 hover:bg-slate-700 rounded-lg transition text-[#1877F2]"
                                        >
                                            <Facebook className="w-4 h-4" />
                                        </a>
                                        <button
                                            onClick={shareUrls.copy}
                                            className="p-2 hover:bg-slate-700 rounded-lg transition text-slate-400"
                                        >
                                            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* AI Summary Button */}
                        <button
                            onClick={() => handleAICommand('summarize')}
                            disabled={aiGenerating}
                            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-500/30 rounded-lg text-purple-400 text-sm hover:bg-purple-600/30 transition disabled:opacity-50"
                        >
                            {aiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            AI Summary
                        </button>
                    </div>
                </div>

                {/* Related Articles */}
                {relatedArticles.length > 0 && (
                    <div className="mt-12 pt-8 border-t border-slate-800">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary-400" />
                            Related Articles
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {relatedArticles.map(related => (
                                <Link
                                    key={related.id}
                                    to={`/articles/${related.slug}`}
                                    className="group bg-slate-900/30 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 hover:bg-slate-900/50 transition-all hover:-translate-y-1"
                                >
                                    <h4 className="text-white font-semibold mb-2 group-hover:text-primary-400 transition line-clamp-2">
                                        {related.title}
                                    </h4>
                                    <p className="text-slate-400 text-sm line-clamp-2">
                                        {related.excerpt}
                                    </p>
                                    <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(related.published_at).toLocaleDateString()}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Eye className="w-3 h-3" />
                                            {related.view_count || 0}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* AI Assist Modal */}
                {showAIAssist && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-purple-400" />
                                    AI Content Assistant
                                </h3>
                                <button onClick={() => setShowAIAssist(false)} className="text-slate-400 hover:text-white">
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="space-y-3">
                                <button
                                    onClick={() => handleAICommand('headlines')}
                                    disabled={aiGenerating}
                                    className="w-full text-left p-3 bg-slate-800 rounded-lg text-slate-300 hover:bg-slate-700 transition flex items-center justify-between group"
                                >
                                    <span>💡 Suggest alternative headlines</span>
                                    <Sparkles className="w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100 transition" />
                                </button>
                                
                                <button
                                    onClick={() => handleAICommand('social')}
                                    disabled={aiGenerating}
                                    className="w-full text-left p-3 bg-slate-800 rounded-lg text-slate-300 hover:bg-slate-700 transition flex items-center justify-between group"
                                >
                                    <span>📱 Generate social media posts</span>
                                    <Sparkles className="w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100 transition" />
                                </button>
                                
                                <button
                                    onClick={() => handleAICommand('improve')}
                                    disabled={aiGenerating}
                                    className="w-full text-left p-3 bg-slate-800 rounded-lg text-slate-300 hover:bg-slate-700 transition flex items-center justify-between group"
                                >
                                    <span>✍️ Improve readability</span>
                                    <Sparkles className="w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100 transition" />
                                </button>
                                
                                <button
                                    onClick={() => handleAICommand('keypoints')}
                                    disabled={aiGenerating}
                                    className="w-full text-left p-3 bg-slate-800 rounded-lg text-slate-300 hover:bg-slate-700 transition flex items-center justify-between group"
                                >
                                    <span>📋 Extract key takeaways</span>
                                    <Sparkles className="w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100 transition" />
                                </button>
                            </div>
                            
                            {aiGenerating && (
                                <div className="mt-4 flex items-center justify-center gap-2 text-purple-400">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-sm">Generating response...</span>
                                </div>
                            )}
                            
                            <button
                                onClick={() => setShowAIAssist(false)}
                                className="mt-6 w-full py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Import missing icon
import { XCircle } from 'lucide-react';

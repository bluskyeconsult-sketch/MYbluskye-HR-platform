// src/pages/ArticleDetail.jsx
// COMPLETE PROFESSIONAL ARTICLE DETAIL PAGE - With API integration, AI assist, sharing, and related articles
//
// ✅ UPGRADED: Typography and readability improvements
// - Larger, more readable font sizes
// - Better line height and spacing
// - Improved headings hierarchy
// - Enhanced mobile readability
// - All existing functionality preserved

import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCapability } from '../hooks/useCapability';
import ReactMarkdown from 'react-markdown';
import { 
    Calendar, User, Eye, ArrowLeft, Share2, Send, Sparkles, Loader2,
    AlertCircle, Bookmark, Twitter, Linkedin, Facebook, Copy, Check,
    Clock, TrendingUp, XCircle
} from 'lucide-react';

const SEO_URL_BASE = 'https://bluskyeconsult.com';

export default function ArticleDetail() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { capabilities } = useCapability();
    const isAdmin = capabilities?.isAdmin;
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
        loadArticle();
    }, [slug]);

    async function checkUserSavedStatus(currentArticleId) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);

        if (currentUser && currentArticleId) {
            const { data } = await supabase
                .from('saved_articles')
                .select('id')
                .eq('user_id', currentUser.id)
                .eq('article_id', currentArticleId)
                .maybeSingle();
            setIsSaved(!!data);
        }
    }

    async function loadArticle() {
        setLoading(true);
        setError(null);

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
        await checkUserSavedStatus(data.id);
        await loadRelatedArticles(data);
        
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
            .select('id, title, slug, excerpt, created_at, view_count')
            .eq('is_published', true)
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

        const prompts = {
            headlines: 'Suggest 3 alternative headlines for this article that are compelling and SEO-friendly. Return as a simple numbered list.',
            social: 'Write 2 short social media posts (one for LinkedIn, one for Twitter/X) promoting this article.',
            improve: 'Give 3 specific, actionable suggestions to improve this article\'s readability and flow.',
            keypoints: 'Extract the 3-5 most important key takeaways from this article as a bullet list.'
        };

        try {
            const response = await fetch('/api/index?action=chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: `Article title: "${article?.title}"\n\nContent: ${(article?.content || '').substring(0, 3000)}`,
                    systemPrompt: `You are an editorial assistant. ${prompts[command] || prompts.improve}`,
                    temperature: 0.6,
                    maxTokens: 500,
                    userId: user?.id
                })
            });
            
            const data = await response.json();
            if (data.success && data.response) {
                alert(data.response);
            } else {
                throw new Error(data.error || 'AI command failed');
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

        if (!confirm('Send this article to all active newsletter subscribers?')) return;

        try {
            const { data: subscribers, error: subError } = await supabase
                .from('newsletter_subscribers')
                .select('email')
                .eq('status', 'active');

            if (subError) throw subError;
            if (!subscribers || subscribers.length === 0) {
                alert('No active subscribers to send to.');
                return;
            }

            let successCount = 0;
            for (const sub of subscribers) {
                try {
                    const res = await fetch('/api/index?action=email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            to: sub.email,
                            subject: article.title,
                            type: 'newsletter',
                            templateData: { content: `${article.excerpt || ''}\n\n${article.content}` }
                        })
                    });
                    const data = await res.json();
                    if (data.success) successCount++;
                } catch (sendErr) {
                    console.warn('Failed to send to', sub.email, sendErr);
                }
            }

            alert(`Article sent to ${successCount} of ${subscribers.length} subscribers.`);
        } catch (error) {
            console.error('Newsletter send error:', error);
            alert('Failed to send newsletter: ' + error.message);
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

    // SEO Structured Data (unchanged)
    useEffect(() => {
        if (!article) return;

        const jsonLdScript = document.createElement('script');
        jsonLdScript.type = 'application/ld+json';
        jsonLdScript.id = 'article-jsonld';
        jsonLdScript.textContent = JSON.stringify({
            '@context': 'https://schema.org/',
            '@type': 'Article',
            headline: article.title,
            description: article.excerpt || '',
            datePublished: article.created_at,
            author: { '@type': 'Organization', name: article.author || 'ODUSBABA Team' },
            publisher: { '@type': 'Organization', name: 'BluSkye Integrated Consult' },
            url: `${SEO_URL_BASE}/articles/${article.slug}`
        });
        document.head.appendChild(jsonLdScript);

        document.title = article.seo_title || `${article.title} | ODUSBABA`;

        const metaTags = [
            { property: 'og:title', content: article.seo_title || article.title },
            { property: 'og:description', content: article.seo_description || article.excerpt || '' },
            { property: 'og:type', content: 'article' },
            { property: 'og:url', content: `${SEO_URL_BASE}/articles/${article.slug}` },
            { name: 'twitter:card', content: 'summary' },
            { name: 'twitter:title', content: article.seo_title || article.title },
            { name: 'twitter:description', content: article.seo_description || article.excerpt || '' }
        ];

        const addedTags = metaTags.map(tag => {
            const el = document.createElement('meta');
            if (tag.property) el.setAttribute('property', tag.property);
            if (tag.name) el.setAttribute('name', tag.name);
            el.setAttribute('content', tag.content);
            el.setAttribute('data-dynamic-seo', 'true');
            document.head.appendChild(el);
            return el;
        });

        return () => {
            const existing = document.getElementById('article-jsonld');
            if (existing) existing.remove();
            addedTags.forEach(el => el.remove());
        };
    }, [article]);

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

    // ============================================
    // MAIN RENDER - UPGRADED TYPOGRAPHY
    // ============================================
    return (
        <div className="min-h-screen bg-slate-950">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                
                {/* Back button - Unchanged */}
                <Link 
                    to="/articles" 
                    className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition" /> 
                    Back to Articles
                </Link>

                {/* Article Header - Unchanged */}
                <div className="mb-8">
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-4">
                        <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(article.created_at).toLocaleDateString('en-US', { 
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
                    
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
                        {article.title}
                    </h1>
                    
                    {article.excerpt && (
                        <p className="text-lg sm:text-xl text-slate-300 leading-relaxed max-w-3xl">
                            {article.excerpt}
                        </p>
                    )}
                </div>

                {/* Action Buttons (Admin only) - Unchanged */}
                {isAdmin && (
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
                    </div>
                )}

                {/* ============================================
                    ARTICLE CONTENT - UPGRADED READABILITY
                    ============================================ */}
                <div className="article-content prose prose-invert max-w-none">
                    <div className="text-slate-300 leading-relaxed space-y-6 markdown-content">
                        <ReactMarkdown
                            components={{
                                // Custom heading rendering for better hierarchy
                                h1: ({ children }) => (
                                    <h1 className="text-3xl sm:text-4xl font-bold text-white mt-10 mb-4 leading-tight">
                                        {children}
                                    </h1>
                                ),
                                h2: ({ children }) => (
                                    <h2 className="text-2xl sm:text-3xl font-bold text-white mt-8 mb-3 leading-snug">
                                        {children}
                                    </h2>
                                ),
                                h3: ({ children }) => (
                                    <h3 className="text-xl sm:text-2xl font-semibold text-white mt-6 mb-2 leading-snug">
                                        {children}
                                    </h3>
                                ),
                                h4: ({ children }) => (
                                    <h4 className="text-lg sm:text-xl font-semibold text-white mt-4 mb-2 leading-snug">
                                        {children}
                                    </h4>
                                ),
                                // Custom paragraph rendering
                                p: ({ children }) => (
                                    <p className="text-base sm:text-lg text-slate-300 leading-relaxed mb-5 max-w-3xl">
                                        {children}
                                    </p>
                                ),
                                // Custom list rendering
                                ul: ({ children }) => (
                                    <ul className="text-base sm:text-lg text-slate-300 leading-relaxed mb-5 space-y-2 list-disc pl-6 max-w-3xl">
                                        {children}
                                    </ul>
                                ),
                                ol: ({ children }) => (
                                    <ol className="text-base sm:text-lg text-slate-300 leading-relaxed mb-5 space-y-2 list-decimal pl-6 max-w-3xl">
                                        {children}
                                    </ol>
                                ),
                                li: ({ children }) => (
                                    <li className="mb-1.5 leading-relaxed">
                                        {children}
                                    </li>
                                ),
                                // Blockquote styling
                                blockquote: ({ children }) => (
                                    <blockquote className="border-l-4 border-primary-500 pl-4 sm:pl-6 py-1 my-6 text-slate-300 text-base sm:text-lg italic max-w-3xl">
                                        {children}
                                    </blockquote>
                                ),
                                // Code block styling
                                code: ({ children, inline }) => (
                                    inline ? (
                                        <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-primary-400 font-mono">
                                            {children}
                                        </code>
                                    ) : (
                                        <code className="block bg-slate-800 p-4 rounded-lg text-sm text-slate-300 font-mono overflow-x-auto">
                                            {children}
                                        </code>
                                    )
                                ),
                                // Image styling
                                img: ({ src, alt }) => (
                                    <img 
                                        src={src} 
                                        alt={alt || ''} 
                                        className="rounded-xl max-w-full h-auto my-6"
                                        loading="lazy"
                                    />
                                ),
                                // Link styling
                                a: ({ href, children }) => (
                                    <a 
                                        href={href} 
                                        target={href?.startsWith('http') ? '_blank' : '_self'}
                                        rel={href?.startsWith('http') ? 'noopener noreferrer' : ''}
                                        className="text-primary-400 hover:text-primary-300 underline transition-colors"
                                    >
                                        {children}
                                    </a>
                                ),
                            }}
                        >
                            {article.content}
                        </ReactMarkdown>
                    </div>
                </div>

                {/* Tags - Unchanged */}
                {article.tags && article.tags.length > 0 && (
                    <div className="mt-10 pt-6 border-t border-slate-800">
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

                {/* Action Bar - Unchanged */}
                <div className="mt-8 pt-6 border-t border-slate-800">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
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
                        
                        <button
                            onClick={() => handleAICommand('keypoints')}
                            disabled={aiGenerating}
                            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-500/30 rounded-lg text-purple-400 text-sm hover:bg-purple-600/30 transition disabled:opacity-50"
                        >
                            {aiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            AI Summary
                        </button>
                    </div>
                </div>

                {/* Related Articles - Unchanged */}
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
                                            {new Date(related.created_at).toLocaleDateString()}
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

                {/* AI Assist Modal - Unchanged */}
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

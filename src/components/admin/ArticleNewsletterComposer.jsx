// src/components/admin/ArticleNewsletterComposer.jsx
//
// NEW (2026-09-16): the actual "newsletter under Articles" feature -
// distinct from the existing generate-newsletter-digest (which mixes
// jobs+courses+articles into one pre-written blob with no per-item
// choice). This is specifically article-focused: pulls a real,
// current pool of articles plus real trending search topics, offers
// an optional AI industry-focus assist that ranks/suggests from that
// real pool (never invents content), and lets the admin choose
// exactly which items to include before compiling a properly
// structured newsletter draft.

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Sparkles, Loader2, X, Mail, TrendingUp, CheckSquare, Square } from 'lucide-react';

export default function ArticleNewsletterComposer({ onClose, onDraftReady }) {
    const [loading, setLoading] = useState(false);
    const [pulled, setPulled] = useState(false);
    const [articles, setArticles] = useState([]);
    const [trendingTopics, setTrendingTopics] = useState([]);
    const [suggestedAngles, setSuggestedAngles] = useState([]);
    const [industryFocus, setIndustryFocus] = useState('');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [selectedTopics, setSelectedTopics] = useState(new Set());
    const [customIntro, setCustomIntro] = useState('');
    const [compiling, setCompiling] = useState(false);

    async function handlePull(withFocus = false) {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/index?action=newsletter-article-pool', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ industryFocus: withFocus ? industryFocus.trim() : undefined })
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.error);

            setArticles(data.articles || []);
            setTrendingTopics(data.trendingTopics || []);
            setSuggestedAngles(data.suggestedAngles || []);
            setPulled(true);
            // Nothing pre-selected - a genuine, deliberate choice by
            // the admin every time, not an assumed default.
            setSelectedIds(new Set());
            setSelectedTopics(new Set());
        } catch (error) {
            alert('Failed to pull articles: ' + error.message);
        } finally {
            setLoading(false);
        }
    }

    function toggleArticle(id) {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }

    function toggleTopic(topic) {
        setSelectedTopics(prev => {
            const next = new Set(prev);
            if (next.has(topic)) next.delete(topic); else next.add(topic);
            return next;
        });
    }

    async function handleCompile() {
        if (selectedIds.size === 0) {
            alert('Select at least one article to include.');
            return;
        }
        setCompiling(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/index?action=newsletter-compile-selection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    selectedArticleIds: Array.from(selectedIds),
                    includedTrendingTopics: Array.from(selectedTopics),
                    customIntro: customIntro.trim() || undefined
                })
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.error);

            onDraftReady(data.draft);
        } catch (error) {
            alert('Failed to compile newsletter: ' + error.message);
        } finally {
            setCompiling(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Mail className="w-5 h-5 text-primary-400" /> Article Newsletter
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {!pulled ? (
                    <div className="space-y-4">
                        <p className="text-slate-400 text-sm">
                            Pull your site's real, current articles and trending search topics from the last 30 days — optionally focused on a specific industry or field.
                        </p>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Industry/field focus (optional)</label>
                            <input
                                type="text"
                                value={industryFocus}
                                onChange={(e) => setIndustryFocus(e.target.value)}
                                placeholder="e.g. Healthcare HR, Remote Work, Immigration Policy"
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => handlePull(false)}
                                disabled={loading}
                                className="flex-1 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "What's Trending"}
                            </button>
                            <button
                                onClick={() => handlePull(true)}
                                disabled={loading || !industryFocus.trim()}
                                className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                AI Assist Pull
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {suggestedAngles.length > 0 && (
                            <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-3">
                                <p className="text-primary-300 text-sm font-medium mb-1 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5" /> AI-suggested angles for future articles
                                </p>
                                <ul className="text-slate-300 text-sm space-y-1">
                                    {suggestedAngles.map((angle, i) => <li key={i}>• {angle}</li>)}
                                </ul>
                            </div>
                        )}

                        <div>
                            <p className="text-white font-medium mb-2">Select articles to include ({selectedIds.size} selected)</p>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {articles.length === 0 ? (
                                    <p className="text-slate-500 text-sm">No recent articles found in the last 30 days.</p>
                                ) : articles.map(article => (
                                    <button
                                        key={article.id}
                                        onClick={() => toggleArticle(article.id)}
                                        className="w-full text-left p-3 bg-slate-800/50 border border-slate-800 rounded-lg hover:border-slate-700 transition flex items-start gap-3"
                                    >
                                        {selectedIds.has(article.id) ? (
                                            <CheckSquare className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
                                        ) : (
                                            <Square className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                                        )}
                                        <div>
                                            <p className="text-white text-sm font-medium">{article.title}</p>
                                            <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{article.excerpt}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {trendingTopics.length > 0 && (
                            <div>
                                <p className="text-white font-medium mb-2 flex items-center gap-1.5">
                                    <TrendingUp className="w-4 h-4 text-amber-400" /> Trending searches to mention (optional)
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {trendingTopics.map(({ topic }) => (
                                        <button
                                            key={topic}
                                            onClick={() => toggleTopic(topic)}
                                            className={`px-3 py-1 rounded-full text-xs transition ${
                                                selectedTopics.has(topic)
                                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                            }`}
                                        >
                                            {topic}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Custom intro (optional)</label>
                            <textarea
                                value={customIntro}
                                onChange={(e) => setCustomIntro(e.target.value)}
                                rows={2}
                                placeholder="A short personal note to open the newsletter..."
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setPulled(false)}
                                className="flex-1 py-2.5 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition"
                            >
                                Pull Again
                            </button>
                            <button
                                onClick={handleCompile}
                                disabled={compiling || selectedIds.size === 0}
                                className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition disabled:opacity-50"
                            >
                                {compiling ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Create Draft from Selection'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

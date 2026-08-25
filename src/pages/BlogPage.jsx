// src/pages/BlogPage.jsx
//
// FIXED (2026-08-23): queried .eq('status', 'published') — but the real,
// confirmed articles schema uses is_published (boolean), verified
// independently via ArticleEditor.jsx and ArticleDetail.jsx earlier this
// session. Since nothing anywhere sets a 'status' column to 'published'
// (that column likely doesn't exist on this table at all, or if it does,
// nothing writes to it), this page has always silently returned zero
// articles — showing "No articles found. Check back soon!" regardless of
// how many real, published articles actually existed. Same bug class
// already found and fixed in aiArticleService.js.
//
// Also worth flagging, not fixed here: this page and /articles
// (ArticlesPage.jsx) both read from the exact same `articles` table —
// worth a decision on whether /blog is meant to be a genuinely distinct
// experience or should be consolidated with /articles, now that both
// actually work against the same real data.

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Calendar, User, ArrowRight, Search, Tag } from 'lucide-react';

export default function BlogPage() {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    useEffect(() => {
        loadBlogArticles();
    }, []);

    async function loadBlogArticles() {
        try {
            const { data, error } = await supabase
                .from('articles')
                .select('*')
                .eq('is_published', true)
                .order('published_at', { ascending: false });

            if (error) throw error;
            setArticles(data || []);
        } catch (error) {
            console.error('Error loading blog articles:', error);
        } finally {
            setLoading(false);
        }
    }

    const categories = ['all', 'News', 'Tips', 'Success Stories', 'Industry Insights'];
    
    const filteredArticles = articles.filter(article => {
        const matchesSearch = article.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             article.content?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-white mb-4">Blog & Insights</h1>
                    <p className="text-xl text-slate-400">Latest news, tips, and success stories</p>
                </div>

                {/* Search and Filter */}
                <div className="mb-8 flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search articles..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat.toLowerCase())}
                                className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                                    selectedCategory === cat.toLowerCase()
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Articles Grid */}
                {filteredArticles.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-slate-400">No articles found. Check back soon!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredArticles.map((article) => (
                            <article key={article.id} className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all">
                                {article.featured_image && (
                                    <img 
                                        src={article.featured_image} 
                                        alt={article.title}
                                        className="w-full h-48 object-cover"
                                    />
                                )}
                                <div className="p-6">
                                    <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            {new Date(article.published_at || article.created_at).toLocaleDateString()}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <User className="w-4 h-4" />
                                            {article.author || 'Admin'}
                                        </span>
                                    </div>
                                    <h2 className="text-xl font-bold text-white mb-2">{article.title}</h2>
                                    <p className="text-slate-400 mb-4 line-clamp-3">
                                        {article.excerpt || article.content?.substring(0, 150)}
                                    </p>
                                    <Link 
                                        to={`/articles/${article.slug || article.id}`}
                                        className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300"
                                    >
                                        Read More <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

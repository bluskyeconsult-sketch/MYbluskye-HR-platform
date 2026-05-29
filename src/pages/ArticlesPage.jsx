// src/pages/ArticlesPage.jsx
// COMPLETE PROFESSIONAL ARTICLES PAGE - With API integration, search, categories, and trending topics

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
    Calendar, User, Eye, ArrowRight, Flame, TrendingUp, 
    Search, Filter, BookOpen, Clock, ChevronRight, 
    Award, Sparkles, Tag, Loader2, AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ArticlesPage() {
    const [articles, setArticles] = useState([]);
    const [featuredArticles, setFeaturedArticles] = useState([]);
    const [trendingTopics, setTrendingTopics] = useState([]);
    const [filteredArticles, setFilteredArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedTag, setSelectedTag] = useState(null);
    const [categories, setCategories] = useState([]);

    // Fetch articles via API or Supabase
    const loadArticles = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            // Try API first
            const response = await fetch('/api/index?action=articles-list', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.articles) {
                    processArticles(data.articles);
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
            .eq('status', 'published')
            .order('published_at', { ascending: false });
        
        if (supabaseError) {
            setError('Failed to load articles. Please refresh the page.');
            setLoading(false);
            return;
        }
        
        processArticles(data || []);
    }, []);

    const processArticles = (data) => {
        setArticles(data);
        setFilteredArticles(data);
        setFeaturedArticles(data.filter(a => a.is_featured === true).slice(0, 3));
        
        // Extract unique categories
        const uniqueCategories = [...new Set(data.map(a => a.category).filter(Boolean))];
        setCategories(uniqueCategories);
        
        setLoading(false);
    };

    const loadTrendingTopics = useCallback(async () => {
        try {
            const response = await fetch('/api/index?action=trending-topics', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.topics) {
                    setTrendingTopics(data.topics);
                    return;
                }
            }
        } catch (err) {
            console.warn('Could not fetch trending topics:', err);
        }
        
        // Fallback: Get popular tags from articles
        const { data } = await supabase.from('articles').select('tags');
        if (data) {
            const tagCounts = {};
            data.forEach(article => {
                if (article.tags && Array.isArray(article.tags)) {
                    article.tags.forEach(tag => {
                        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                    });
                }
            });
            const sorted = Object.entries(tagCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6);
            setTrendingTopics(sorted.map(([tag]) => tag));
        }
    }, []);

    useEffect(() => {
        loadArticles();
        loadTrendingTopics();
    }, [loadArticles, loadTrendingTopics]);

    useEffect(() => {
        // Filter articles based on search, category, and tag
        let filtered = [...articles];
        
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(a => 
                a.title?.toLowerCase().includes(query) ||
                a.excerpt?.toLowerCase().includes(query) ||
                a.content?.toLowerCase().includes(query) ||
                a.author?.toLowerCase().includes(query)
            );
        }
        
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(a => a.category === selectedCategory);
        }
        
        if (selectedTag) {
            filtered = filtered.filter(a => 
                a.tags && Array.isArray(a.tags) && a.tags.includes(selectedTag)
            );
        }
        
        setFilteredArticles(filtered);
    }, [searchQuery, selectedCategory, selectedTag, articles]);

    const handleTagClick = (tag) => {
        if (selectedTag === tag) {
            setSelectedTag(null);
        } else {
            setSelectedTag(tag);
            setSearchQuery('');
            setSelectedCategory('all');
        }
    };

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedCategory('all');
        setSelectedTag(null);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
                <div className="text-center max-w-md">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Unable to Load Articles</h1>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <button onClick={() => window.location.reload()} className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
                        <BookOpen className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        Articles & Research
                    </h1>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                        In-depth insights, research findings, and expert analysis on HR trends, 
                        employment laws, and workforce intelligence.
                    </p>
                </div>

                {/* Search Bar */}
                <div className="max-w-2xl mx-auto mb-8">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search articles by title, author, or keyword..."
                            className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Main Content */}
                    <div className="flex-1">
                        {/* Featured Articles Section */}
                        {featuredArticles.length > 0 && (
                            <div className="mb-12">
                                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                                    <Sparkles className="w-5 h-5 text-amber-400" />
                                    Featured Articles
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {featuredArticles.map(article => (
                                        <Link
                                            key={article.id}
                                            to={`/articles/${article.slug}`}
                                            className="group bg-gradient-to-br from-slate-900/50 to-slate-800/30 border border-slate-700 rounded-xl overflow-hidden hover:border-primary-500/30 hover:shadow-lg hover:shadow-primary-500/10 transition-all hover:-translate-y-1"
                                        >
                                            <div className="p-6">
                                                <div className="flex items-center gap-3 text-xs text-slate-500 mb-3 flex-wrap">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(article.published_at).toLocaleDateString()}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        {article.author}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Eye className="w-3 h-3" />
                                                        {article.view_count || 0}
                                                    </span>
                                                </div>
                                                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary-400 transition-colors line-clamp-2">
                                                    {article.title}
                                                </h3>
                                                <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                                                    {article.excerpt}
                                                </p>
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
                        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                <TrendingUp className="w-5 h-5 text-primary-400" />
                                All Articles
                            </h2>
                            <p className="text-sm text-slate-400">
                                Showing {filteredArticles.length} of {articles.length} articles
                            </p>
                        </div>

                        {filteredArticles.length === 0 ? (
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                                <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-white mb-2">No articles found</h3>
                                <p className="text-slate-400 mb-4">
                                    {articles.length === 0 
                                        ? 'No articles are currently available. Please check back soon.'
                                        : 'No articles match your search criteria.'}
                                </p>
                                {(searchQuery || selectedCategory !== 'all' || selectedTag) && (
                                    <button
                                        onClick={clearFilters}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                                    >
                                        Clear Filters
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredArticles.map(article => (
                                    <Link
                                        key={article.id}
                                        to={`/articles/${article.slug}`}
                                        className="group bg-slate-900/30 border border-slate-800 rounded-xl p-5 hover:border-primary-500/30 hover:bg-slate-900/50 transition-all hover:-translate-y-1"
                                    >
                                        <div className="flex items-center gap-3 text-xs text-slate-500 mb-3 flex-wrap">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(article.published_at).toLocaleDateString()}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <User className="w-3 h-3" />
                                                {article.author}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Eye className="w-3 h-3" />
                                                {article.view_count || 0}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-primary-400 transition-colors line-clamp-2">
                                            {article.title}
                                        </h3>
                                        <p className="text-slate-400 text-sm line-clamp-2">
                                            {article.excerpt}
                                        </p>
                                        {article.tags && article.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-3">
                                                {article.tags.slice(0, 2).map(tag => (
                                                    <span key={tag} className="text-xs px-2 py-0.5 bg-slate-800 rounded-full text-slate-400">
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="lg:w-80 space-y-6">
                        {/* Category Filter */}
                        {categories.length > 0 && (
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-primary-400" />
                                    Categories
                                </h3>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => setSelectedCategory('all')}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                                            selectedCategory === 'all'
                                                ? 'bg-primary-600 text-white'
                                                : 'text-slate-400 hover:bg-slate-800'
                                        }`}
                                    >
                                        All Categories
                                    </button>
                                    {categories.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedCategory(cat)}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                                                selectedCategory === cat
                                                    ? 'bg-primary-600 text-white'
                                                    : 'text-slate-400 hover:bg-slate-800'
                                            }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Trending Topics */}
                        {trendingTopics.length > 0 && (
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 sticky top-24">
                                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                    <Flame className="w-5 h-5 text-orange-400" />
                                    Trending Topics
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {trendingTopics.map(topic => (
                                        <button
                                            key={topic}
                                            onClick={() => handleTagClick(topic)}
                                            className={`px-3 py-1.5 rounded-full text-sm transition ${
                                                selectedTag === topic
                                                    ? 'bg-primary-600 text-white'
                                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                            }`}
                                        >
                                            #{topic}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Newsletter CTA */}
                        <div className="bg-gradient-to-br from-primary-900/20 to-sky-900/20 border border-primary-500/30 rounded-xl p-5">
                            <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-primary-400" />
                                Stay Updated
                            </h3>
                            <p className="text-slate-400 text-sm mb-4">
                                Get the latest articles and insights delivered to your inbox.
                            </p>
                            <Link
                                to="/newsletter"
                                className="block w-full text-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm"
                            >
                                Subscribe to Newsletter
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

import { useEffect, useState } from 'react';
import { TrendingUp, Flame, Eye } from 'lucide-react';
import { getTrendingTopics, getTrendingArticles } from '../services/contentService';

export default function TrendingTopics() {
    const [trendingTopics, setTrendingTopics] = useState([]);
    const [trendingArticles, setTrendingArticles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTrending();
    }, []);

    async function loadTrending() {
        const topics = await getTrendingTopics('week', 5);
        const articles = await getTrendingArticles(3);
        setTrendingTopics(topics);
        setTrendingArticles(articles);
        setLoading(false);
    }

    if (loading) return <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 animate-pulse">Loading trends...</div>;

    return (
        <div className="space-y-6">
            {/* Trending Topics */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-400" /> Trending Topics
                </h3>
                <div className="flex flex-wrap gap-2">
                    {trendingTopics.map(topic => (
                        <span key={topic.topic} className="px-3 py-1 bg-slate-800 rounded-full text-sm text-slate-300 hover:bg-slate-700 cursor-pointer">
                            #{topic.topic}
                        </span>
                    ))}
                </div>
            </div>

            {/* Trending Articles */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" /> Most Read
                </h3>
                <div className="space-y-3">
                    {trendingArticles.map(article => (
                        <a key={article.id} href={`/articles/${article.slug}`} className="block p-2 hover:bg-slate-800 rounded-lg transition-colors">
                            <p className="text-sm font-medium text-white">{article.title}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                <Eye className="w-3 h-3" /> {article.view_count} views
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
}

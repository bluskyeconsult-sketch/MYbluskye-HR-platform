import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Plus, Edit, Eye, Trash2, CheckCircle, XCircle } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminArticles() {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadArticles(); }, []);

    async function loadArticles() {
        const { data } = await supabase.from('articles').select('*').order('created_at', { ascending: false });
        setArticles(data || []);
        setLoading(false);
    }

    async function deleteArticle(id) {
        if (confirm('Are you sure you want to delete this article?')) {
            await supabase.from('articles').delete().eq('id', id);
            loadArticles();
        }
    }

    async function toggleStatus(id, currentStatus) {
        const newStatus = currentStatus === 'published' ? 'draft' : 'published';
        await supabase.from('articles').update({ status: newStatus }).eq('id', id);
        loadArticles();
    }

    if (loading) return <div className="p-8 text-center text-slate-400">Loading...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white">Articles Management</h1>
                <Link to="/admin/articles/new" className="px-4 py-2 bg-primary-500 text-white rounded-lg flex items-center gap-2 hover:bg-primary-600">
                    <Plus className="w-4 h-4" /> New Article
                </Link>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-800">
                        <tr>
                            <th className="px-6 py-3 text-left text-white">Title</th>
                            <th className="px-6 py-3 text-left text-white">Category</th>
                            <th className="px-6 py-3 text-left text-white">Status</th>
                            <th className="px-6 py-3 text-left text-white">Views</th>
                            <th className="px-6 py-3 text-left text-white">Date</th>
                            <th className="px-6 py-3 text-left text-white">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {articles.map(article => (
                            <tr key={article.id} className="border-t border-slate-800">
                                <td className="px-6 py-4 text-white">{article.title}</td>
                                <td className="px-6 py-4 text-slate-300">{article.category || '-'}</td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${article.status === 'published' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                        {article.status === 'published' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                        {article.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-300">{article.view_count || 0}</td>
                                <td className="px-6 py-4 text-slate-300">{new Date(article.created_at).toLocaleDateString()}</td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-2">
                                        <Link to={`/articles/${article.slug}`} target="_blank" className="p-1.5 bg-slate-800 rounded hover:bg-slate-700">
                                            <Eye className="w-4 h-4 text-slate-300" />
                                        </Link>
                                        <Link to={`/admin/articles/${article.id}`} className="p-1.5 bg-slate-800 rounded hover:bg-slate-700">
                                            <Edit className="w-4 h-4 text-slate-300" />
                                        </Link>
                                        <button onClick={() => toggleStatus(article.id, article.status)} className="p-1.5 bg-slate-800 rounded hover:bg-slate-700">
                                            {article.status === 'published' ? <XCircle className="w-4 h-4 text-amber-400" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />}
                                        </button>
                                        <button onClick={() => deleteArticle(article.id)} className="p-1.5 bg-slate-800 rounded hover:bg-red-500/20">
                                            <Trash2 className="w-4 h-4 text-red-400" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

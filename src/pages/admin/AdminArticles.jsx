// src/pages/admin/AdminArticles.jsx
// COMPLETE PROFESSIONAL ARTICLE MANAGEMENT - With API integration, bulk actions, advanced filters, and analytics

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Link, useNavigate } from 'react-router-dom';
import { 
    Plus, Edit, Trash2, FileText, Search, RefreshCw, Loader2, 
    AlertCircle, CheckCircle, Eye, EyeOff, X, Square, Globe, 
    Clock, Calendar, Tag, Save, Filter, Download, TrendingUp,
    Award, Shield, Users, Zap, Copy, Check, ChevronLeft, ChevronRight
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminArticles() {
    const navigate = useNavigate();
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedArticles, setSelectedArticles] = useState(new Set());
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [stats, setStats] = useState({ total: 0, published: 0, draft: 0, views: 0, avgReadTime: 0 });
    const [user, setUser] = useState(null);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [dateRange, setDateRange] = useState({ from: '', to: '' });

    const itemsPerPage = 20;
    const categories = ['AI & Technology', 'Employment Law', 'HR Strategy', 'Workforce Trends', 'Career Development', 'Skill Verification', 'Remote Work', 'Diversity & Inclusion', 'Leadership', 'Recruitment', 'Productivity', 'Wellness'];

    useEffect(() => { checkAuth(); }, []);

    async function checkAuth() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { window.location.href = '/admin-login'; return; }
            
            // Try API first
            try {
                const response = await fetch('/api/index?action=admin-check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: session.user.id })
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.authorized) {
                        setUser(session.user);
                        setIsAuthorized(true);
                        loadArticles();
                        loadStats();
                        return;
                    }
                }
            } catch (err) { console.warn('API check failed, falling back to Supabase:', err); }
            
            // Fallback to Supabase
            const { data: profile } = await supabase
                .from('profiles')
                .select('user_type')
                .eq('id', session.user.id)
                .single();
            
            const isAdmin = profile?.user_type === 'admin' || profile?.user_type === 'super_admin';
            if (!isAdmin) {
                toast.error('Access denied. Admin privileges required.');
                window.location.href = '/dashboard';
                return;
            }
            
            setUser(session.user);
            setIsAuthorized(true);
            loadArticles();
            loadStats();
        } catch (err) { 
            console.error('Auth error:', err);
            window.location.href = '/admin-login'; 
        }
    }

    async function loadStats() {
        try {
            const response = await fetch('/api/index?action=article-stats', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.stats) {
                    setStats(data.stats);
                    return;
                }
            }
        } catch (err) { console.warn('API stats failed:', err); }
        
        // Fallback
        const { data } = await supabase.from('articles').select('status, view_count, content');
        const total = data?.length || 0;
        const published = data?.filter(a => a.status === 'published').length || 0;
        const draft = data?.filter(a => a.status === 'draft').length || 0;
        const views = data?.reduce((sum, a) => sum + (a.view_count || 0), 0) || 0;
        const totalWords = data?.reduce((sum, a) => sum + (a.content?.length || 0), 0) || 0;
        const avgReadTime = Math.round(totalWords / (published || 1) / 200);
        setStats({ total, published, draft, views, avgReadTime });
    }

    async function loadArticles() {
        try {
            setLoading(true);
            setError(null);
            
            // Try API first
            const params = new URLSearchParams({
                page: currentPage,
                limit: itemsPerPage,
                search: searchTerm,
                category: selectedCategory,
                status: selectedStatus,
                from: dateRange.from,
                to: dateRange.to
            });
            
            const response = await fetch(`/api/index?action=articles-list-admin&${params}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setArticles(data.articles || []);
                    setTotalPages(Math.ceil((data.total || 0) / itemsPerPage));
                    return;
                }
            }
        } catch (err) { console.warn('API fetch failed, falling back to Supabase:', err); }
        
        // Fallback to Supabase
        let query = supabase
            .from('articles')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false });
        
        if (selectedCategory !== 'all') query = query.eq('category', selectedCategory);
        if (selectedStatus !== 'all') query = query.eq('status', selectedStatus);
        if (searchTerm) query = query.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%,excerpt.ilike.%${searchTerm}%`);
        if (dateRange.from) query = query.gte('created_at', dateRange.from);
        if (dateRange.to) query = query.lte('created_at', dateRange.to);
        
        const from = (currentPage - 1) * itemsPerPage;
        query = query.range(from, from + itemsPerPage - 1);
        
        const { data, error, count } = await query;
        if (error) throw error;
        
        setArticles(data || []);
        setTotalPages(Math.ceil((count || 0) / itemsPerPage));
    } catch (err) {
        setError('Failed to load articles');
        toast.error('Failed to load articles');
    } finally { setLoading(false); }
}

    async function deleteArticle(id) { setShowDeleteConfirm({ id, type: 'single' }); }

    async function confirmDelete() {
        try {
            const response = await fetch('/api/index?action=article-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ articleId: showDeleteConfirm.id })
            });
            
            if (!response.ok) {
                await supabase.from('articles').delete().eq('id', showDeleteConfirm.id);
            }
            
            toast.success('Article deleted');
            await loadArticles();
            await loadStats();
            setSelectedArticles(new Set());
        } catch (err) { 
            toast.error('Failed to delete'); 
        } finally { setShowDeleteConfirm(null); }
    }

    async function bulkDelete() { setShowDeleteConfirm({ ids: Array.from(selectedArticles), type: 'bulk', count: selectedArticles.size }); }

    async function confirmBulkDelete() {
        try {
            const response = await fetch('/api/index?action=articles-bulk-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ articleIds: showDeleteConfirm.ids })
            });
            
            if (!response.ok) {
                await supabase.from('articles').delete().in('id', showDeleteConfirm.ids);
            }
            
            toast.success(`Deleted ${showDeleteConfirm.ids.length} articles`);
            setSelectedArticles(new Set());
            await loadArticles();
            await loadStats();
        } catch (err) { 
            toast.error('Failed to delete'); 
        } finally { setShowDeleteConfirm(null); }
    }

    async function toggleStatus(id, currentStatus) {
        const newStatus = currentStatus === 'published' ? 'draft' : 'published';
        try {
            const response = await fetch('/api/index?action=article-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ articleId: id, status: newStatus })
            });
            
            if (!response.ok) {
                await supabase
                    .from('articles')
                    .update({ status: newStatus, updated_at: new Date().toISOString() })
                    .eq('id', id);
            }
            
            toast.success(`Article ${newStatus === 'published' ? 'published' : 'unpublished'}`);
            await loadArticles();
            await loadStats();
        } catch (err) { 
            toast.error('Failed to update status'); 
        }
    }

    async function exportArticles() {
        setExporting(true);
        try {
            const response = await fetch('/api/index?action=articles-export', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const data = await response.json();
                const csv = convertToCSV(data.articles || articles);
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `articles_export_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success('Articles exported');
            }
        } catch (err) { 
            toast.error('Export failed'); 
        } finally { setExporting(false); }
    }

    function convertToCSV(articles) {
        const headers = ['Title', 'Category', 'Status', 'Views', 'Created At', 'Author'];
        const rows = articles.map(a => [
            `"${a.title?.replace(/"/g, '""')}"`,
            a.category,
            a.status,
            a.view_count || 0,
            new Date(a.created_at).toLocaleDateString(),
            a.author
        ]);
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    function toggleSelectAll() { 
        setSelectedArticles(selectedArticles.size === articles.length ? new Set() : new Set(articles.map(a => a.id))); 
    }
    
    function toggleSelectArticle(id) { 
        const newSet = new Set(selectedArticles); 
        newSet.has(id) ? newSet.delete(id) : newSet.add(id); 
        setSelectedArticles(newSet); 
    }

    function getStatusBadge(status) {
        return status === 'published' 
            ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-400"><Globe className="w-3 h-3" /> Published</span>
            : <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-amber-500/20 text-amber-400"><EyeOff className="w-3 h-3" /> Draft</span>;
    }

    useEffect(() => { 
        if (isAuthorized) {
            setCurrentPage(1);
            loadArticles();
        }
    }, [searchTerm, selectedCategory, selectedStatus, dateRange]);

    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
            <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff' } }} />
            
            <ConfirmModal 
                isOpen={!!showDeleteConfirm} 
                onClose={() => setShowDeleteConfirm(null)} 
                onConfirm={showDeleteConfirm?.type === 'bulk' ? confirmBulkDelete : confirmDelete} 
                title="Confirm Delete" 
                message={showDeleteConfirm?.type === 'bulk' ? `Delete ${showDeleteConfirm.count} articles? This action cannot be undone.` : 'Delete this article? This action cannot be undone.'} 
            />

            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <FileText className="w-6 h-6 text-primary-400" /> 
                            Article Management
                        </h1>
                        <p className="text-slate-400 text-sm">Manage your content and blog posts</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={exportArticles}
                            disabled={exporting}
                            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition flex items-center gap-2"
                        >
                            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            Export
                        </button>
                        <Link 
                            to="/admin/articles/new" 
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> 
                            New Article
                        </Link>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition group">
                        <p className="text-slate-400 text-sm">Total Articles</p>
                        <p className="text-2xl font-bold text-white">{stats.total}</p>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition group">
                        <p className="text-slate-400 text-sm">Published</p>
                        <p className="text-2xl font-bold text-emerald-400">{stats.published}</p>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition group">
                        <p className="text-slate-400 text-sm">Drafts</p>
                        <p className="text-2xl font-bold text-amber-400">{stats.draft}</p>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition group">
                        <p className="text-slate-400 text-sm">Total Views</p>
                        <p className="text-2xl font-bold text-blue-400">{stats.views.toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition group">
                        <p className="text-slate-400 text-sm">Avg Read Time</p>
                        <p className="text-2xl font-bold text-purple-400">{stats.avgReadTime || 5} min</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
                    <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px] relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Search by title or content..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500" 
                            />
                        </div>
                        <select 
                            value={selectedCategory} 
                            onChange={(e) => setSelectedCategory(e.target.value)} 
                            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="all">All Categories</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select 
                            value={selectedStatus} 
                            onChange={(e) => setSelectedStatus(e.target.value)} 
                            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="all">All Status</option>
                            <option value="published">Published</option>
                            <option value="draft">Draft</option>
                        </select>
                        <input 
                            type="date" 
                            value={dateRange.from} 
                            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))} 
                            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" 
                            placeholder="From"
                        />
                        <input 
                            type="date" 
                            value={dateRange.to} 
                            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))} 
                            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" 
                            placeholder="To"
                        />
                        <button onClick={loadArticles} className="px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        {(searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all' || dateRange.from || dateRange.to) && (
                            <button 
                                onClick={() => {
                                    setSearchTerm('');
                                    setSelectedCategory('all');
                                    setSelectedStatus('all');
                                    setDateRange({ from: '', to: '' });
                                }} 
                                className="px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Bulk Actions Bar */}
                {selectedArticles.size > 0 && (
                    <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 mb-6 flex justify-between items-center flex-wrap gap-3">
                        <span className="text-primary-400">{selectedArticles.size} article(s) selected</span>
                        <button onClick={bulkDelete} className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition flex items-center gap-2">
                            <Trash2 className="w-4 h-4" /> Delete Selected
                        </button>
                    </div>
                )}

                {/* Loading State */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
                    </div>
                ) : error ? (
                    <div className="text-center py-12 text-red-400">
                        <AlertCircle className="w-12 h-12 mx-auto mb-3" />
                        <p>{error}</p>
                        <button onClick={loadArticles} className="mt-3 text-primary-400 hover:underline">Retry</button>
                    </div>
                ) : articles.length === 0 ? (
                    <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-xl">
                        <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400">No articles found. Click "New Article" to create one.</p>
                    </div>
                ) : (
                    <>
                        {/* Select All Button */}
                        <div className="flex items-center gap-2 mb-3">
                            <button onClick={toggleSelectAll} className="flex items-center gap-2 text-slate-400 hover:text-white transition">
                                {selectedArticles.size === articles.length ? <CheckCircle className="w-4 h-4 text-primary-400" /> : <Square className="w-4 h-4" />}
                                Select All ({articles.length})
                            </button>
                        </div>

                        {/* Articles Table */}
                        <div className="overflow-x-auto bg-slate-900/50 border border-slate-800 rounded-xl">
                            <table className="w-full">
                                <thead className="bg-slate-800/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-white text-sm w-10"></th>
                                        <th className="px-4 py-3 text-left text-white text-sm">Title</th>
                                        <th className="px-4 py-3 text-left text-white text-sm">Category</th>
                                        <th className="px-4 py-3 text-left text-white text-sm">Status</th>
                                        <th className="px-4 py-3 text-left text-white text-sm">Views</th>
                                        <th className="px-4 py-3 text-left text-white text-sm">Date</th>
                                        <th className="px-4 py-3 text-left text-white text-sm">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {articles.map(article => (
                                        <tr key={article.id} className={`border-t border-slate-800 hover:bg-slate-800/30 transition ${selectedArticles.has(article.id) ? 'bg-primary-500/5' : ''}`}>
                                            <td className="px-4 py-3">
                                                <button onClick={() => toggleSelectArticle(article.id)}>
                                                    {selectedArticles.has(article.id) ? <CheckCircle className="w-4 h-4 text-primary-400" /> : <Square className="w-4 h-4 text-slate-500" />}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="text-white font-medium line-clamp-1">{article.title}</p>
                                                    {article.excerpt && (
                                                        <p className="text-slate-500 text-xs truncate max-w-xs">{article.excerpt.substring(0, 60)}...</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs px-2 py-1 bg-primary-500/20 text-primary-400 rounded-full">{article.category || 'Uncategorized'}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button onClick={() => toggleStatus(article.id, article.status)} className="cursor-pointer">
                                                    {getStatusBadge(article.status)}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-slate-300 text-sm">
                                                <Eye className="w-3 h-3 inline mr-1" /> {article.view_count || 0}
                                            </td>
                                            <td className="px-4 py-3 text-slate-400 text-sm whitespace-nowrap">
                                                <Calendar className="w-3 h-3 inline mr-1" /> {new Date(article.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2">
                                                    <a href={`/articles/${article.slug}`} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-slate-800 rounded hover:bg-slate-700 transition" title="View">
                                                        <Eye className="w-3.5 h-3.5 text-slate-300" />
                                                    </a>
                                                    <Link to={`/admin/articles/${article.id}`} className="p-1.5 bg-slate-800 rounded hover:bg-slate-700 transition" title="Edit">
                                                        <Edit className="w-3.5 h-3.5 text-slate-300" />
                                                    </Link>
                                                    <button onClick={() => deleteArticle(article.id)} className="p-1.5 bg-slate-800 rounded hover:bg-red-500/20 transition" title="Delete">
                                                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-between items-center mt-6">
                                <p className="text-slate-400 text-sm">Page {currentPage} of {totalPages}</p>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                                        disabled={currentPage === 1} 
                                        className="px-3 py-1 bg-slate-700 rounded-lg hover:bg-slate-600 disabled:opacity-50 transition flex items-center gap-1"
                                    >
                                        <ChevronLeft className="w-4 h-4" /> Prev
                                    </button>
                                    <button 
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                                        disabled={currentPage === totalPages} 
                                        className="px-3 py-1 bg-slate-700 rounded-lg hover:bg-slate-600 disabled:opacity-50 transition flex items-center gap-1"
                                    >
                                        Next <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

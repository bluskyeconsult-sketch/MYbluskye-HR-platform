// src/pages/admin/NewsletterAdmin.jsx
// COMPLETE PROFESSIONAL NEWSLETTER ADMIN - With API integration, preview, scheduling, and analytics

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import { 
    Mail, Send, Calendar, Users, Loader2, Eye, TrendingUp, 
    Clock, CheckCircle, XCircle, AlertCircle, Edit, Trash2,
    Copy, Play, Pause, BarChart3, Plus, Search, Filter
} from 'lucide-react';

export default function NewsletterAdmin() {
    const [newsletters, setNewsletters] = useState([]);
    const [subscribers, setSubscribers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [selectedNewsletter, setSelectedNewsletter] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        subject: '',
        content: '',
        scheduled_for: '',
        send_now: false
    });
    const [sending, setSending] = useState(false);
    const [stats, setStats] = useState({
        totalSent: 0,
        openRate: 0,
        clickRate: 0,
        bounceRate: 0
    });
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
        loadStats();
    }, []);

    async function loadData() {
        setLoading(true);
        
        // Load newsletters
        let query = supabase.from('newsletters').select('*').order('created_at', { ascending: false });
        
        if (filterStatus !== 'all') {
            query = query.eq('status', filterStatus);
        }
        
        const { data: newsData } = await query;
        
        // Load subscribers
        const { data: subData } = await supabase
            .from('newsletter_subscribers')
            .select('*')
            .eq('status', 'active');
        
        setNewsletters(newsData || []);
        setSubscribers(subData || []);
        setLoading(false);
    }

    async function loadStats() {
        try {
            const response = await fetch('/api/index?action=newsletter-stats', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.stats) {
                    setStats(data.stats);
                }
            }
        } catch (err) {
            console.warn('Could not fetch stats:', err);
        }
    }

    async function handleCreateNewsletter(e) {
        e.preventDefault();
        setSending(true);
        
        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            // Try API first
            const response = await fetch('/api/index?action=newsletter-create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formData.title,
                    subject: formData.subject,
                    content: formData.content,
                    content_html: formData.content,
                    scheduled_for: formData.scheduled_for || null,
                    send_now: formData.send_now,
                    created_by: user.id
                })
            });
            
            if (!response.ok) {
                // Fallback to direct Supabase insert
                await supabase.from('newsletters').insert({
                    title: formData.title,
                    subject: formData.subject,
                    content: formData.content,
                    content_html: formData.content,
                    status: formData.scheduled_for ? 'scheduled' : (formData.send_now ? 'sending' : 'draft'),
                    scheduled_for: formData.scheduled_for || null,
                    created_by: user.id
                });
            }
            
            setShowCreateModal(false);
            setFormData({ title: '', subject: '', content: '', scheduled_for: '', send_now: false });
            loadData();
            loadStats();
            
        } catch (error) {
            console.error('Error creating newsletter:', error);
            alert('Failed to create newsletter. Please try again.');
        } finally {
            setSending(false);
        }
    }

    async function handleSendTest(newsletter) {
        setSelectedNewsletter(newsletter);
        try {
            const response = await fetch('/api/index?action=newsletter-send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newsletterId: newsletter.id, test: true })
            });
            
            if (response.ok) {
                alert('Test email sent to admin!');
            }
        } catch (error) {
            console.error('Error sending test:', error);
            alert('Failed to send test email.');
        }
    }

    async function handleDelete(newsletterId) {
        if (!confirm('Are you sure you want to delete this newsletter?')) return;
        
        await supabase.from('newsletters').delete().eq('id', newsletterId);
        loadData();
    }

    function getStatusBadge(status) {
        const statusConfig = {
            draft: { label: 'Draft', color: 'bg-slate-500/20 text-slate-400', icon: Edit },
            scheduled: { label: 'Scheduled', color: 'bg-amber-500/20 text-amber-400', icon: Calendar },
            sending: { label: 'Sending...', color: 'bg-blue-500/20 text-blue-400', icon: Loader2 },
            sent: { label: 'Sent', color: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle },
            failed: { label: 'Failed', color: 'bg-red-500/20 text-red-400', icon: XCircle }
        };
        const config = statusConfig[status] || statusConfig.draft;
        const Icon = config.icon;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${config.color}`}>
                <Icon className="w-3 h-3" />
                {config.label}
            </span>
        );
    }

    const filteredNewsletters = newsletters.filter(n => {
        const matchesStatus = filterStatus === 'all' || n.status === filterStatus;
        const matchesSearch = searchTerm === '' || 
            n.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            n.subject?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    if (loading) {
        return (
            <AdminLayout title="Newsletter Manager" description="Create, schedule, and manage email newsletters">
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="Newsletter Manager" description="Create, schedule, and manage email newsletters">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">Total Newsletters</p>
                            <p className="text-2xl font-bold text-white">{newsletters.length}</p>
                        </div>
                        <Mail className="w-8 h-8 text-primary-400 opacity-50" />
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">Active Subscribers</p>
                            <p className="text-2xl font-bold text-white">{subscribers.length}</p>
                        </div>
                        <Users className="w-8 h-8 text-emerald-400 opacity-50" />
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">Open Rate</p>
                            <p className="text-2xl font-bold text-white">{stats.openRate}%</p>
                        </div>
                        <Eye className="w-8 h-8 text-amber-400 opacity-50" />
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">Click Rate</p>
                            <p className="text-2xl font-bold text-white">{stats.clickRate}%</p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-purple-400 opacity-50" />
                    </div>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Create Newsletter
                </button>
                
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search newsletters..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="all">All Status</option>
                        <option value="draft">Draft</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="sent">Sent</option>
                    </select>
                </div>
            </div>

            {/* Newsletters List */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                {filteredNewsletters.length === 0 ? (
                    <div className="text-center py-12">
                        <Mail className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">No newsletters found</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="mt-3 text-primary-400 hover:text-primary-300 text-sm"
                        >
                            Create your first newsletter →
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-800/50 border-b border-slate-800">
                                <tr>
                                    <th className="px-4 py-3 text-left text-white text-sm font-semibold">Title</th>
                                    <th className="px-4 py-3 text-left text-white text-sm font-semibold">Subject</th>
                                    <th className="px-4 py-3 text-left text-white text-sm font-semibold">Status</th>
                                    <th className="px-4 py-3 text-left text-white text-sm font-semibold">Created</th>
                                    <th className="px-4 py-3 text-left text-white text-sm font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredNewsletters.map(newsletter => (
                                    <tr key={newsletter.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition">
                                        <td className="px-4 py-3">
                                            <p className="text-white font-medium">{newsletter.title}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-slate-400 text-sm line-clamp-1">{newsletter.subject}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            {getStatusBadge(newsletter.status)}
                                            {newsletter.scheduled_for && (
                                                <p className="text-xs text-slate-500 mt-1">
                                                    <Calendar className="w-3 h-3 inline mr-1" />
                                                    {new Date(newsletter.scheduled_for).toLocaleString()}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-slate-400 text-sm">
                                            {new Date(newsletter.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedNewsletter(newsletter);
                                                        setShowPreviewModal(true);
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-white transition"
                                                    title="Preview"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                {newsletter.status === 'draft' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleSendTest(newsletter)}
                                                            className="p-1.5 text-slate-400 hover:text-white transition"
                                                            title="Send Test"
                                                        >
                                                            <Send className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(newsletter.id)}
                                                            className="p-1.5 text-red-400 hover:text-red-300 transition"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-white">Create Newsletter</h2>
                                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <form onSubmit={handleCreateNewsletter} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Title *</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={e => setFormData({...formData, title: e.target.value})}
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Subject Line *</label>
                                    <input
                                        type="text"
                                        value={formData.subject}
                                        onChange={e => setFormData({...formData, subject: e.target.value})}
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Content (HTML) *</label>
                                    <textarea
                                        value={formData.content}
                                        onChange={e => setFormData({...formData, content: e.target.value})}
                                        rows="8"
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        required
                                        placeholder="<h1>Hello</h1><p>Your content here...</p>"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">HTML formatting supported</p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Schedule (Optional)</label>
                                        <input
                                            type="datetime-local"
                                            value={formData.scheduled_for}
                                            onChange={e => setFormData({...formData, scheduled_for: e.target.value})}
                                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.send_now}
                                                onChange={e => setFormData({...formData, send_now: e.target.checked})}
                                                className="w-4 h-4 rounded border-slate-600 text-primary-500 focus:ring-primary-500"
                                            />
                                            <span className="text-sm text-slate-300">Send immediately</span>
                                        </label>
                                    </div>
                                </div>
                                
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="submit"
                                        disabled={sending}
                                        className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        {sending ? 'Creating...' : (formData.send_now ? 'Create & Send' : 'Create Newsletter')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {showPreviewModal && selectedNewsletter && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-white">Preview: {selectedNewsletter.title}</h2>
                                <button onClick={() => setShowPreviewModal(false)} className="text-slate-400 hover:text-white">
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="bg-white rounded-lg p-6 text-gray-800">
                                <div dangerouslySetInnerHTML={{ __html: selectedNewsletter.content || selectedNewsletter.content_html }} />
                            </div>
                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={() => setShowPreviewModal(false)}
                                    className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

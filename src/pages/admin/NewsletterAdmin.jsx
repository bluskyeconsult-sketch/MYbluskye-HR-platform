// src/pages/admin/NewsletterAdmin.jsx
// Complete Newsletter Admin with AdminLayout

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import { Mail, Send, Calendar, Users, Loader2, Eye, TrendingUp } from 'lucide-react';

export default function NewsletterAdmin() {
    const [newsletters, setNewsletters] = useState([]);
    const [subscribers, setSubscribers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        subject: '',
        content: '',
        scheduled_for: ''
    });
    const [sending, setSending] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        const { data: newsData } = await supabase
            .from('newsletters')
            .select('*')
            .order('created_at', { ascending: false });
        
        const { data: subData } = await supabase
            .from('newsletter_subscribers')
            .select('*')
            .eq('status', 'active');
        
        setNewsletters(newsData || []);
        setSubscribers(subData || []);
        setLoading(false);
    }

    async function handleCreateNewsletter(e) {
        e.preventDefault();
        setSending(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        
        await supabase.from('newsletters').insert({
            title: formData.title,
            subject: formData.subject,
            content: formData.content,
            content_html: formData.content,
            status: formData.scheduled_for ? 'scheduled' : 'draft',
            scheduled_for: formData.scheduled_for || null,
            created_by: user.id
        });
        
        setShowCreateModal(false);
        setFormData({ title: '', subject: '', content: '', scheduled_for: '' });
        loadData();
        setSending(false);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <AdminLayout title="Newsletter Manager" description="Create, schedule, and manage email newsletters">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div><p className="text-slate-400 text-sm">Newsletters</p><p className="text-2xl font-bold text-white">{newsletters.length}</p></div>
                        <Mail className="w-8 h-8 text-primary-400 opacity-50" />
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div><p className="text-slate-400 text-sm">Subscribers</p><p className="text-2xl font-bold text-white">{subscribers.length}</p></div>
                        <Users className="w-8 h-8 text-emerald-400 opacity-50" />
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div><p className="text-slate-400 text-sm">Open Rate</p><p className="text-2xl font-bold text-white">45%</p></div>
                        <Eye className="w-8 h-8 text-amber-400 opacity-50" />
                    </div>
                </div>
            </div>

            {/* Create Button */}
            <div className="mb-6">
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                    + Create Newsletter
                </button>
            </div>

            {/* Newsletters List */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-800/50 border-b border-slate-800">
                            <tr>
                                <th className="px-4 py-3 text-left text-white">Title</th>
                                <th className="px-4 py-3 text-left text-white">Status</th>
                                <th className="px-4 py-3 text-left text-white">Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {newsletters.map(newsletter => (
                                <tr key={newsletter.id} className="border-b border-slate-800">
                                    <td className="px-4 py-3 text-white">{newsletter.title}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs ${
                                            newsletter.status === 'sent' ? 'bg-emerald-500/20 text-emerald-400' :
                                            newsletter.status === 'scheduled' ? 'bg-amber-500/20 text-amber-400' :
                                            'bg-slate-500/20 text-slate-400'
                                        }`}>
                                            {newsletter.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-400">{new Date(newsletter.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6">
                        <h2 className="text-xl font-bold text-white mb-4">Create Newsletter</h2>
                        <form onSubmit={handleCreateNewsletter} className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Title</label>
                                <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" required />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Subject Line</label>
                                <input type="text" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" required />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Content (HTML)</label>
                                <textarea value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} rows="6" className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm" required />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Schedule (Optional)</label>
                                <input type="datetime-local" value={formData.scheduled_for} onChange={e => setFormData({...formData, scheduled_for: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                            </div>
                            <div className="flex gap-3">
                                <button type="submit" disabled={sending} className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">{sending ? 'Creating...' : 'Create Newsletter'}</button>
                                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

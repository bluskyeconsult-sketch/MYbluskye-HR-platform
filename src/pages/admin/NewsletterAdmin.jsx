// src/pages/admin/NewsletterAdmin.jsx
// Complete Newsletter Admin Dashboard

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    Mail, Calendar, Users, BarChart3, Send, Clock, 
    Eye, MousePointer, TrendingUp, Plus, Edit2, Trash2,
    Loader2, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';
import {
    createNewsletter,
    scheduleNewsletter,
    dispatchNewsletter,
    getNewsletterAnalytics,
    subscribeToNewsletter,
    unsubscribeFromNewsletter
} from '../../services/newsletterService';

export default function NewsletterAdmin() {
    const [newsletters, setNewsletters] = useState([]);
    const [subscribers, setSubscribers] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedNewsletter, setSelectedNewsletter] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        subject: '',
        content: '',
        scheduled_for: '',
        segments: ['general']
    });
    const [sending, setSending] = useState(false);
    const [subscriberEmail, setSubscriberEmail] = useState('');
    const [subscriberName, setSubscriberName] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        
        // Load newsletters
        const { data: newsData } = await supabase
            .from('newsletters')
            .select('*')
            .order('created_at', { ascending: false });
        setNewsletters(newsData || []);

        // Load subscribers
        const { data: subData } = await supabase
            .from('newsletter_subscribers')
            .select('*')
            .order('subscribed_at', { ascending: false })
            .limit(50);
        setSubscribers(subData || []);

        // Load analytics for last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: recentSends } = await supabase
            .from('newsletter_sends')
            .select('*')
            .gte('sent_at', thirtyDaysAgo.toISOString());
        
        if (recentSends && recentSends.length > 0) {
            const opens = recentSends.filter(s => s.opened_at).length;
            const clicks = recentSends.filter(s => s.clicked_at).length;
            setAnalytics({
                total_sent: recentSends.length,
                open_rate: Math.round((opens / recentSends.length) * 100),
                click_rate: Math.round((clicks / recentSends.length) * 100),
                total_subscribers: subData?.length || 0
            });
        }

        setLoading(false);
    }

    async function handleCreateNewsletter(e) {
        e.preventDefault();
        setSending(true);
        
        const result = await createNewsletter({
            ...formData,
            created_by: (await supabase.auth.getUser()).data.user?.id
        });
        
        if (result.success) {
            setShowCreateModal(false);
            setFormData({ title: '', subject: '', content: '', scheduled_for: '', segments: ['general'] });
            loadData();
            alert('Newsletter created successfully!');
        } else {
            alert('Error creating newsletter');
        }
        setSending(false);
    }

    async function handleSendNow(newsletterId) {
        if (confirm('Send this newsletter now?')) {
            setSending(true);
            const result = await dispatchNewsletter(newsletterId);
            alert(`Sent: ${result.sent}, Failed: ${result.failed}`);
            loadData();
            setSending(false);
        }
    }

    async function handleSendTest(newsletterId) {
        const testEmail = prompt('Enter test email address:');
        if (testEmail) {
            setSending(true);
            await dispatchNewsletter(newsletterId, true, testEmail);
            alert(`Test email sent to ${testEmail}`);
            setSending(false);
        }
    }

    async function handleAddSubscriber(e) {
        e.preventDefault();
        if (!subscriberEmail) return;
        
        const result = await subscribeToNewsletter(subscriberEmail, subscriberName, 'admin_import');
        if (result.success) {
            alert('Subscriber added successfully!');
            setSubscriberEmail('');
            setSubscriberName('');
            loadData();
        } else {
            alert('Error adding subscriber');
        }
    }

    async function handleRemoveSubscriber(email) {
        if (confirm(`Remove ${email} from newsletter?`)) {
            await unsubscribeFromNewsletter(email);
            loadData();
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Newsletter Management</h1>
                    <p className="text-slate-400">Create, schedule, and track newsletters</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Create Newsletter
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <Users className="w-8 h-8 text-primary-400" />
                        <div>
                            <div className="text-2xl font-bold text-white">{subscribers.length}</div>
                            <div className="text-sm text-slate-400">Active Subscribers</div>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <Mail className="w-8 h-8 text-emerald-400" />
                        <div>
                            <div className="text-2xl font-bold text-white">{newsletters.length}</div>
                            <div className="text-sm text-slate-400">Total Newsletters</div>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <Eye className="w-8 h-8 text-blue-400" />
                        <div>
                            <div className="text-2xl font-bold text-white">{analytics?.open_rate || 0}%</div>
                            <div className="text-sm text-slate-400">Open Rate</div>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <MousePointer className="w-8 h-8 text-purple-400" />
                        <div>
                            <div className="text-2xl font-bold text-white">{analytics?.click_rate || 0}%</div>
                            <div className="text-sm text-slate-400">Click Rate</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Subscriber Management */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Add Subscriber
                </h2>
                <form onSubmit={handleAddSubscriber} className="flex gap-3">
                    <input
                        type="text"
                        value={subscriberName}
                        onChange={(e) => setSubscriberName(e.target.value)}
                        placeholder="Name (optional)"
                        className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                    <input
                        type="email"
                        value={subscriberEmail}
                        onChange={(e) => setSubscriberEmail(e.target.value)}
                        placeholder="Email *"
                        required
                        className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                    <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                        Add Subscriber
                    </button>
                </form>
            </div>

            {/* Newsletters List */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                <div className="p-5 border-b border-slate-800">
                    <h2 className="text-lg font-semibold text-white">Newsletters</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-800/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-white">Title</th>
                                <th className="px-4 py-3 text-left text-white">Status</th>
                                <th className="px-4 py-3 text-left text-white">Created</th>
                                <th className="px-4 py-3 text-left text-white">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {newsletters.map(newsletter => (
                                <tr key={newsletter.id} className="border-t border-slate-800">
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
                                    <td className="px-4 py-3 text-slate-400">
                                        {new Date(newsletter.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            {newsletter.status !== 'sent' && (
                                                <>
                                                    <button
                                                        onClick={() => handleSendNow(newsletter.id)}
                                                        disabled={sending}
                                                        className="p-1.5 bg-emerald-600 rounded-lg text-white hover:bg-emerald-500"
                                                    >
                                                        <Send className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleSendTest(newsletter.id)}
                                                        className="p-1.5 bg-primary-600 rounded-lg text-white hover:bg-primary-500"
                                                    >
                                                        <Mail className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                            {newsletter.status === 'sent' && (
                                                <button
                                                    onClick={() => setSelectedNewsletter(newsletter)}
                                                    className="p-1.5 bg-slate-700 rounded-lg text-slate-300 hover:text-white"
                                                >
                                                    <BarChart3 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Newsletter Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-white mb-4">Create Newsletter</h2>
                        <form onSubmit={handleCreateNewsletter} className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Title</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Subject Line</label>
                                <input
                                    type="text"
                                    value={formData.subject}
                                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Content (HTML)</label>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                                    rows="8"
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Schedule (Optional)</label>
                                <input
                                    type="datetime-local"
                                    value={formData.scheduled_for}
                                    onChange={(e) => setFormData({...formData, scheduled_for: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="submit" disabled={sending} className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                                    {sending ? 'Creating...' : 'Create Newsletter'}
                                </button>
                                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

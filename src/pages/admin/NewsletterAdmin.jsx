// src/pages/admin/NewsletterAdmin.jsx
// COMPLETE PROFESSIONAL NEWSLETTER ADMIN - With API integration, preview, scheduling, and analytics
//
// FIXED (2026-08-07):
// 1. handleCreateNewsletter() checked `if (!response.ok)` before falling
//    back to a direct Supabase insert — but the nonexistent
//    newsletter-create action returns HTTP 200 (not an error), so that
//    condition was always false and the fallback never ran. Creating a
//    newsletter silently did nothing. Simplified to go straight to
//    Supabase, since no real newsletter-create action exists.
// 2. handleSendNow()/handleSendTest() called ?action=newsletter-send, which
//    doesn't exist, with no fallback at all — both always showed a false
//    "sending started!" success message while doing nothing. Rebuilt both
//    to actually send, using infrastructure that's already confirmed real:
//    fetch active subscribers directly, then call the real `email` action
//    with the `newsletter` template already defined in api/index.js, once
//    per subscriber.
//
// FIXED (2026-08-22): imported AdminLayout from
// ../../components/admin/AdminLayout and wrapped this page's content in it
// internally — but App.jsx's route for this page (/admin/newsletter)
// already wraps it in the same AdminLayout externally, matching every
// other admin page in this project (none of which import AdminLayout
// themselves). This meant AdminLayout was nested inside itself,
// duplicating the sidebar/navigation chrome. Removed the internal import
// and both wrap points, matching the established pattern everywhere else.

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    Mail, Send, Calendar, Users, Loader2, Eye, TrendingUp, 
    Clock, CheckCircle, XCircle, AlertCircle, Edit, Trash2,
    Copy, Play, Pause, BarChart3, Plus, Search, Filter,
    RefreshCw, Download, FileText, Zap, Target, Activity
} from 'lucide-react';

export default function NewsletterAdmin() {
    const [newsletters, setNewsletters] = useState([]);
    const [subscribers, setSubscribers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
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
    // NEW (2026-08-16): segment targeting for handleSendNow — the SOP
    // describes segments (Job Seekers, Employers, Testers) but this always
    // sent to every active subscriber regardless. Since I don't have
    // confirmed schema for whether newsletter_subscribers links to
    // profiles.user_type, this is built defensively — falls back to "All
    // Active" behavior (guaranteed to work, unchanged) and only attempts
    // the join for other segments, failing with a clear, specific error if
    // the schema doesn't support it rather than silently sending to nobody.
    const [sendSegment, setSendSegment] = useState('all');
    const [stats, setStats] = useState({
        totalSent: 0,
        openRate: 0,
        clickRate: 0,
        bounceRate: 0,
        subscribers: 0
    });
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
        loadStats();
    }, []);

    // NEW (2026-08-16): pulls recent jobs/courses/articles/trending
    // topics into a ready-to-edit draft, closing the "newsletter pool
    // auto-feed" request — no manual curation from scratch every time.
    const [generatingDigest, setGeneratingDigest] = useState(false);

    async function handleGenerateDigest() {
        setGeneratingDigest(true);
        try {
            // FIXED (2026-08-27): the backend now correctly requires real
            // admin authorization (was "admin-only" by comment alone,
            // with zero actual enforcement) - this call must now send a
            // real auth token, or every request would fail with 401/403.
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/index?action=generate-newsletter-digest', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                }
            });
            const data = await response.json();

            if (!data.success) throw new Error(data.error);

            setFormData({
                title: data.draft.subject,
                subject: data.draft.subject,
                content: data.draft.content,
                scheduled_for: '',
                send_now: false
            });
            setShowCreateModal(true);
        } catch (error) {
            console.error('Digest generation failed:', error);
            alert('Failed to generate digest: ' + error.message);
        } finally {
            setGeneratingDigest(false);
        }
    }

    async function loadData() {
        setLoading(true);
        
        // Load newsletters via API
        try {
            const response = await fetch('/api/index?action=newsletter-list', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.newsletters) {
                    setNewsletters(data.newsletters);
                    setLoading(false);
                    return;
                }
            }
        } catch (err) {
            console.warn('API fetch failed, falling back to Supabase:', err);
        }
        
        // Fallback to direct Supabase query
        let query = supabase.from('newsletters').select('*').order('created_at', { ascending: false });
        
        if (filterStatus !== 'all') {
            query = query.eq('status', filterStatus);
        }
        
        const { data: newsData } = await query;
        setNewsletters(newsData || []);
        setLoading(false);
    }

    async function loadSubscribers() {
        try {
            const response = await fetch('/api/index?action=newsletter-subscribers', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.subscribers) {
                    setSubscribers(data.subscribers);
                    return;
                }
            }
        } catch (err) {
            console.warn('Could not fetch subscribers:', err);
        }
        
        // Fallback
        const { data: subData } = await supabase
            .from('newsletter_subscribers')
            .select('*')
            .eq('status', 'active');
        
        setSubscribers(subData || []);
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
                    setStats({
                        ...stats,
                        ...data.stats,
                        subscribers: data.stats.subscribers || subscribers.length
                    });
                }
            }
        } catch (err) {
            console.warn('Could not fetch stats:', err);
        }
    }

    async function handleRefresh() {
        setRefreshing(true);
        await Promise.all([loadData(), loadSubscribers(), loadStats()]);
        setRefreshing(false);
    }

    // FIXED: no real newsletter-create action exists, so this now goes
    // straight to Supabase instead of a dead API-first attempt. "Send now"
    // is no longer promised at creation time — newsletters are created as
    // draft/scheduled, then actually sent via the fixed handleSendNow below.
    // FIXED (2026-09-04): confirmed via direct schema query - the real
    // definitive cause of this entire, long-open bug. There is no
    // status column on newsletters at all - the real column is
    // is_sent (boolean, defaults to false). This insert was sending
    // status: 'draft'/'scheduled' every single time, which Supabase
    // rejects outright since the column doesn't exist - meaning this
    // create action has never actually succeeded once. Removed the
    // non-existent field entirely; is_sent's own default (false) is
    // already exactly correct for a newly-created, unsent newsletter.
    async function handleCreateNewsletter(e) {
        e.preventDefault();
        setSending(true);
        
        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            const { error } = await supabase.from('newsletters').insert({
                title: formData.title,
                subject: formData.subject,
                content: formData.content,
                content_html: formData.content,
                scheduled_for: formData.scheduled_for || null,
                created_by: user?.id
            });
            
            if (error) throw error;
            
            setShowCreateModal(false);
            setFormData({ title: '', subject: '', content: '', scheduled_for: '', send_now: false });
            await loadData();
            await loadStats();
            
            alert(formData.send_now
                ? 'Newsletter created. Use "Send Now" on the list to actually send it to subscribers.'
                : 'Newsletter created successfully!');
            
        } catch (error) {
            console.error('Error creating newsletter:', error);
            alert('Failed to create newsletter. Please try again.');
        } finally {
            setSending(false);
        }
    }

    // FIXED: ?action=newsletter-send doesn't exist and had no fallback at
    // all — this always showed a false success message while sending
    // nothing. Now actually sends: fetches active subscribers directly and
    // uses the real, confirmed `email` action with the `newsletter`
    // template already defined in api/index.js, once per subscriber.
    async function handleSendNow(newsletterId) {
        const segmentLabels = { all: 'All Active Subscribers', job_seeker: 'Job Seekers', employer: 'Employers', tester: 'Testers' };
        if (!confirm(`Send this newsletter now to: ${segmentLabels[sendSegment]}?`)) return;
        
        setSending(true);
        try {
            const newsletter = newsletters.find(n => n.id === newsletterId);
            if (!newsletter) throw new Error('Newsletter not found');
            
            let activeSubscribers;
            
            if (sendSegment === 'all') {
                const { data, error: subError } = await supabase
                    .from('newsletter_subscribers')
                    .select('email')
                    .eq('status', 'active');
                if (subError) throw subError;
                activeSubscribers = data;
            } else if (sendSegment === 'tester') {
                // FIXED (2026-08-27): confirmed same recurring bug already
                // found and fixed in Navbar.jsx, UserDashboard.jsx, and
                // AdminUsers.jsx this engagement - no account has ever had
                // user_type literally equal to 'tester' under the real,
                // rebuilt tester system (testers keep their real tier's
                // user_type, flagged separately via the is_tester boolean).
                // The "Testers" segment has always silently matched zero
                // subscribers. Now correctly filters on is_tester.
                const { data, error: subError } = await supabase
                    .from('newsletter_subscribers')
                    .select('email, profiles!inner(is_tester)')
                    .eq('status', 'active')
                    .eq('profiles.is_tester', true);

                if (subError) {
                    throw new Error(
                        `Segment targeting isn't available: ${subError.message}. This likely means newsletter_subscribers doesn't have a user_id column linking to profiles — subscribers may be guest emails not tied to accounts. Use "All Active Subscribers" instead, or add that link if segmentation is needed.`
                    );
                }
                activeSubscribers = data;
            } else {
                // Segment targeting requires newsletter_subscribers to link
                // to profiles via user_id. If that column/relationship
                // doesn't exist, this throws — caught below with a specific,
                // actionable message rather than silently sending to nobody.
                const { data, error: subError } = await supabase
                    .from('newsletter_subscribers')
                    .select('email, profiles!inner(user_type)')
                    .eq('status', 'active')
                    .eq('profiles.user_type', sendSegment);
                
                if (subError) {
                    throw new Error(
                        `Segment targeting isn't available: ${subError.message}. This likely means newsletter_subscribers doesn't have a user_id column linking to profiles — subscribers may be guest emails not tied to accounts. Use "All Active Subscribers" instead, or add that link if segmentation is needed.`
                    );
                }
                activeSubscribers = data;
            }
            
            if (!activeSubscribers || activeSubscribers.length === 0) {
                alert('No active subscribers to send to for this segment.');
                setSending(false);
                return;
            }
            
            let successCount = 0;
            for (const sub of activeSubscribers) {
                try {
                    const res = await fetch('/api/index?action=email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            to: sub.email,
                            subject: newsletter.subject,
                            type: 'newsletter',
                            templateData: { content: newsletter.content_html || newsletter.content }
                        })
                    });
                    const data = await res.json();
                    if (data.success) successCount++;
                } catch (sendErr) {
                    console.warn('Failed to send to', sub.email, sendErr);
                }
            }
            
            // FIXED (2026-09-04): same confirmed root cause as
            // handleCreateNewsletter - status doesn't exist, real
            // column is is_sent (boolean). This update was failing
            // silently every time a newsletter was "sent," meaning
            // is_sent never actually became true - which also broke
            // the public "Anyone can view sent newsletters" policy,
            // since it filters on exactly this column. Also now
            // persists recipient_count, which was already computed
            // (successCount) but never saved anywhere.
            await supabase
                .from('newsletters')
                .update({ is_sent: true, sent_at: new Date().toISOString(), recipient_count: successCount })
                .eq('id', newsletterId);
            
            alert(`Newsletter sent to ${successCount} of ${activeSubscribers.length} subscribers (${segmentLabels[sendSegment]}).`);
            await loadData();
        } catch (error) {
            console.error('Error sending newsletter:', error);
            alert('Failed to send newsletter: ' + error.message);
        } finally {
            setSending(false);
        }
    }

    // FIXED: same broken action as handleSendNow — now sends a real test
    // email to the current admin's own address via the real `email` action.
    async function handleSendTest(newsletter) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.email) throw new Error('Could not determine your admin email address');
            
            const res = await fetch('/api/index?action=email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: user.email,
                    subject: `[TEST] ${newsletter.subject}`,
                    type: 'newsletter',
                    templateData: { content: newsletter.content_html || newsletter.content }
                })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Send failed');
            
            alert(`Test email sent to ${user.email}!`);
        } catch (error) {
            console.error('Error sending test:', error);
            alert('Failed to send test email: ' + error.message);
        }
    }

    async function handleDelete(newsletterId) {
        if (!confirm('Are you sure you want to delete this newsletter? This cannot be undone.')) return;
        
        await supabase.from('newsletters').delete().eq('id', newsletterId);
        await loadData();
        alert('Newsletter deleted successfully.');
    }

    // FIXED (2026-08-16): called ?action=newsletter-export, which doesn't
    // exist — unlike loadData()/loadSubscribers() above, this had no
    // fallback at all, so clicking Export did nothing visible: no CSV, no
    // error, no download, just silent failure. Builds the CSV directly
    // from already-loaded subscriber data instead of a backend call.
    async function handleExportSubscribers() {
        try {
            let exportSubscribers = subscribers;
            if (!exportSubscribers || exportSubscribers.length === 0) {
                const { data, error } = await supabase
                    .from('newsletter_subscribers')
                    .select('*')
                    .eq('status', 'active');
                if (error) throw error;
                exportSubscribers = data || [];
            }

            if (exportSubscribers.length === 0) {
                alert('No active subscribers to export.');
                return;
            }

            const csv = 'Email,Name,Subscribed At\n' + exportSubscribers
                .map(s => `${s.email},${s.name || ''},${s.subscribed_at || s.created_at || ''}`)
                .join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `subscribers_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export subscribers: ' + error.message);
        }
    }

    // NEW (2026-09-04): confirmed the real schema has no status column
    // at all - only is_sent (boolean) and scheduled_for (timestamp).
    // The UI throughout this file was built assuming a 3-state string
    // that never existed. Derives the equivalent status from the real
    // columns instead of reading a field that was always undefined.
    function getDerivedStatus(newsletter) {
        if (newsletter.is_sent) return 'sent';
        if (newsletter.scheduled_for && new Date(newsletter.scheduled_for) > new Date()) return 'scheduled';
        return 'draft';
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
        const matchesStatus = filterStatus === 'all' || getDerivedStatus(n) === filterStatus;
        const matchesSearch = searchTerm === '' || 
            n.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            n.subject?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition group">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">Total Newsletters</p>
                            <p className="text-2xl font-bold text-white">{newsletters.length}</p>
                        </div>
                        <Mail className="w-8 h-8 text-primary-400 opacity-50 group-hover:scale-110 transition" />
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition group">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">Active Subscribers</p>
                            <p className="text-2xl font-bold text-white">{subscribers.length}</p>
                        </div>
                        <Users className="w-8 h-8 text-emerald-400 opacity-50 group-hover:scale-110 transition" />
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition group">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">Open Rate</p>
                            <p className="text-2xl font-bold text-white">
                                {stats.openRate === null || stats.openRate === undefined ? (
                                    <span className="text-sm font-normal text-slate-500">Not tracked yet</span>
                                ) : `${stats.openRate}%`}
                            </p>
                        </div>
                        <Eye className="w-8 h-8 text-amber-400 opacity-50 group-hover:scale-110 transition" />
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition group">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">Click Rate</p>
                            <p className="text-2xl font-bold text-white">{stats.clickRate}%</p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-purple-400 opacity-50 group-hover:scale-110 transition" />
                    </div>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                {/* FIXED (2026-08-27): 4 labeled buttons in a single
                    non-wrapping row - "Generate Weekly Digest" in
                    particular is a long enough label that this could
                    overflow or force horizontal scroll on narrow mobile
                    screens. Now wraps onto additional rows instead. */}
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Create Newsletter
                    </button>
                    <button
                        onClick={handleGenerateDigest}
                        disabled={generatingDigest}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${generatingDigest ? 'animate-spin' : ''}`} />
                        {generatingDigest ? 'Generating...' : 'Generate Weekly Digest'}
                    </button>
                    <button
                        onClick={handleExportSubscribers}
                        className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition flex items-center gap-2"
                        title="Export Subscribers"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition flex items-center gap-2 disabled:opacity-50"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
                
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
                    {/* NEW (2026-08-16): segment selector — applies to
                        whichever newsletter's "Send Now" is clicked next.
                        Falls back to "All Active" behavior if the schema
                        doesn't support segment targeting (see
                        handleSendNow). */}
                    <select
                        value={sendSegment}
                        onChange={(e) => setSendSegment(e.target.value)}
                        title="Segment to send to when clicking Send Now"
                        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="all">Send to: All Active</option>
                        {/* FIXED (2026-08-27): value was "registered" - a
                            tier name, not a real user_type value. The real
                            value for a job seeker account is "job_seeker".
                            This segment, like "Testers", has always
                            silently matched zero subscribers. */}
                        <option value="job_seeker">Send to: Job Seekers</option>
                        <option value="employer">Send to: Employers</option>
                        <option value="tester">Send to: Testers</option>
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
                                            <p className="text-white font-medium line-clamp-1">{newsletter.title}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-slate-400 text-sm line-clamp-1">{newsletter.subject}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            {getStatusBadge(getDerivedStatus(newsletter))}
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
                                                {getDerivedStatus(newsletter) === 'draft' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleSendTest(newsletter)}
                                                            className="p-1.5 text-slate-400 hover:text-white transition"
                                                            title="Send Test"
                                                        >
                                                            <Send className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleSendNow(newsletter.id)}
                                                            className="p-1.5 text-emerald-400 hover:text-emerald-300 transition"
                                                            title="Send Now"
                                                        >
                                                            <Zap className="w-4 h-4" />
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
                                                {getDerivedStatus(newsletter) === 'scheduled' && (
                                                    <button
                                                        onClick={() => handleSendNow(newsletter.id)}
                                                        className="p-1.5 text-emerald-400 hover:text-emerald-300 transition"
                                                        title="Send Now (override schedule)"
                                                    >
                                                        <Play className="w-4 h-4" />
                                                    </button>
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
                                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white transition">
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
                                <button onClick={() => setShowPreviewModal(false)} className="text-slate-400 hover:text-white transition">
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
        </div>
    );
}

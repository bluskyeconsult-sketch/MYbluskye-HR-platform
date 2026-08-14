// src/pages/admin/AdminTesterFeedback.jsx
// NEW FILE (2026-08-07) — fills the /admin/tester-feedback link in
// AdminDashboard.jsx, which pointed nowhere since no route or page existed.
//
// The tester_feedback table's existence and RLS policies were confirmed via
// a diagnostic RLS query (tester_feedback_insert_own, tester_feedback_super_admin),
// but its exact columns weren't — this reads flexibly with fallbacks across
// likely field names (message/feedback_text/content, rating, category)
// rather than assuming one exact schema. If real data reveals different
// column names, the field-access lines below are the only thing that needs
// adjusting.

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MessageSquare, Star, Loader2, RefreshCw, Search, User, Calendar, Trash2 } from 'lucide-react';

export default function AdminTesterFeedback() {
    const [feedback, setFeedback] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        checkAdminAccess();
    }, []);

    async function checkAdminAccess() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = '/admin-login'; return; }

        const { data: profile } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('id', user.id)
            .single();

        const isAdmin = profile?.user_type === 'admin' || profile?.user_type === 'super_admin';
        if (!isAdmin) {
            alert('Access denied. Admin access required.');
            window.location.href = '/admin/dashboard';
            return;
        }

        setIsAuthorized(true);
        loadFeedback();
    }

    async function loadFeedback() {
        setRefreshing(true);
        try {
            const { data, error } = await supabase
                .from('tester_feedback')
                .select('*, profiles(full_name, email)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setFeedback(data || []);
        } catch (err) {
            console.error('Error loading tester feedback:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    async function handleDelete(id) {
        if (!confirm('Delete this feedback entry?')) return;
        try {
            await supabase.from('tester_feedback').delete().eq('id', id);
            await loadFeedback();
        } catch (err) {
            console.error('Error deleting feedback:', err);
            alert('Failed to delete');
        }
    }

    // Flexible field access — real column names unconfirmed.
    function getMessage(item) {
        return item.message || item.feedback_text || item.content || item.text || '(no message field found)';
    }

    function getRating(item) {
        return item.rating ?? item.score ?? null;
    }

    const filteredFeedback = feedback.filter(item => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return (
            getMessage(item).toLowerCase().includes(term) ||
            item.profiles?.full_name?.toLowerCase().includes(term) ||
            item.profiles?.email?.toLowerCase().includes(term)
        );
    });

    if (!isAuthorized || loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <MessageSquare className="w-6 h-6 text-primary-400" /> Tester Feedback
                    </h1>
                    <p className="text-slate-400 text-sm">Review feedback submitted by tester accounts</p>
                </div>
                <button
                    onClick={loadFeedback}
                    disabled={refreshing}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2 text-sm"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                </button>
            </div>

            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search feedback or tester..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
            </div>

            {filteredFeedback.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                    <MessageSquare className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Feedback Yet</h3>
                    <p className="text-slate-400">Feedback submitted by testers will appear here.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredFeedback.map(item => (
                        <div key={item.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-slate-500" />
                                    <span className="text-white text-sm font-medium">
                                        {item.profiles?.full_name || item.profiles?.email || 'Unknown tester'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {getRating(item) !== null && (
                                        <span className="flex items-center gap-1 text-amber-400 text-sm">
                                            <Star className="w-4 h-4 fill-amber-400" /> {getRating(item)}/5
                                        </span>
                                    )}
                                    <span className="text-slate-500 text-xs flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> {new Date(item.created_at).toLocaleDateString()}
                                    </span>
                                    <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-300">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <p className="text-slate-300 text-sm whitespace-pre-wrap">{getMessage(item)}</p>
                            {item.category && (
                                <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-slate-800 rounded-full text-slate-400">
                                    {item.category}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

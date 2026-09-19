// src/components/admin/ArticleTopicsManager.jsx
//
// NEW (2026-09-19): the genuine missing piece - bulk-list article
// topics, then generate real, full article content for each one on
// demand, with optional scheduling for future publication.

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Loader2, Sparkles, Plus, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function ArticleTopicsManager({ onClose, onArticleGenerated }) {
    const [bulkText, setBulkText] = useState('');
    const [adding, setAdding] = useState(false);
    const [topics, setTopics] = useState([]);
    const [loadingTopics, setLoadingTopics] = useState(true);
    const [generatingId, setGeneratingId] = useState(null);
    const [scheduleDates, setScheduleDates] = useState({});
    const [error, setError] = useState('');

    useEffect(() => {
        loadTopics();
    }, []);

    async function authHeaders() {
        const { data: { session } } = await supabase.auth.getSession();
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
        };
    }

    async function loadTopics() {
        setLoadingTopics(true);
        try {
            const headers = await authHeaders();
            const response = await fetch('/api/index?action=admin-get-article-topics', { headers });
            const data = await response.json();
            if (data.topics) setTopics(data.topics);
        } catch (err) {
            console.error('Failed to load topics:', err);
        } finally {
            setLoadingTopics(false);
        }
    }

    async function handleBulkAdd() {
        setError('');
        const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length === 0) {
            setError('Enter at least one topic, one per line.');
            return;
        }

        setAdding(true);
        try {
            const headers = await authHeaders();
            const response = await fetch('/api/index?action=admin-bulk-add-article-topics', {
                method: 'POST',
                headers,
                body: JSON.stringify({ topics: lines })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to add topics');

            setBulkText('');
            await loadTopics();
        } catch (err) {
            setError(err.message);
        } finally {
            setAdding(false);
        }
    }

    async function handleGenerate(topicId) {
        setGeneratingId(topicId);
        setError('');
        try {
            const headers = await authHeaders();
            const scheduledFor = scheduleDates[topicId] || null;
            const response = await fetch('/api/index?action=generate-article-from-topic', {
                method: 'POST',
                headers,
                body: JSON.stringify({ topicId, scheduledFor })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Generation failed');

            await loadTopics();
            if (onArticleGenerated) onArticleGenerated(data.article);
        } catch (err) {
            setError(err.message);
            await loadTopics();
        } finally {
            setGeneratingId(null);
        }
    }

    function statusBadge(status) {
        if (status === 'generated') return <span className="flex items-center gap-1 text-emerald-400 text-xs"><CheckCircle className="w-3 h-3" /> Generated</span>;
        if (status === 'failed') return <span className="flex items-center gap-1 text-red-400 text-xs"><XCircle className="w-3 h-3" /> Failed</span>;
        if (status === 'generating') return <span className="flex items-center gap-1 text-amber-400 text-xs"><Loader2 className="w-3 h-3 animate-spin" /> Generating</span>;
        return <span className="flex items-center gap-1 text-slate-400 text-xs"><Clock className="w-3 h-3" /> Pending</span>;
    }

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary-400" /> Bulk Article Topics
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <p className="text-slate-400 text-sm mb-3">
                    List as many topics as you like, one per line. Generate full article content for each one whenever you're ready — no need to write from scratch.
                </p>

                <textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    rows={5}
                    placeholder={"How to write a standout CV in 2026\nRemote work interview tips\nNegotiating your first salary"}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm mb-3"
                />

                <button
                    onClick={handleBulkAdd}
                    disabled={adding}
                    className="w-full py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition disabled:opacity-50 flex items-center justify-center gap-2 mb-6"
                >
                    {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Add Topics
                </button>

                {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

                <p className="text-slate-300 text-sm font-medium mb-2">Topics List ({topics.length})</p>
                {loadingTopics ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary-400" /></div>
                ) : topics.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-6">No topics yet — add some above to get started.</p>
                ) : (
                    <div className="space-y-2">
                        {topics.map(topic => (
                            <div key={topic.id} className="bg-slate-800/50 rounded-lg p-3">
                                <div className="flex justify-between items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm truncate">{topic.topic}</p>
                                        {statusBadge(topic.status)}
                                        {topic.error_message && <p className="text-red-400 text-xs mt-1">{topic.error_message}</p>}
                                    </div>
                                    {topic.status !== 'generated' && (
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <input
                                                type="datetime-local"
                                                value={scheduleDates[topic.id] || ''}
                                                onChange={(e) => setScheduleDates(prev => ({ ...prev, [topic.id]: e.target.value }))}
                                                className="text-xs px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white"
                                                title="Optional: schedule for future publication"
                                            />
                                            <button
                                                onClick={() => handleGenerate(topic.id)}
                                                disabled={generatingId === topic.id}
                                                className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition disabled:opacity-50 text-xs flex items-center gap-1"
                                            >
                                                {generatingId === topic.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                                Generate
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// src/components/admin/ArticleTopicsManager.jsx
//
// NEW (2026-09-19): the genuine missing piece - bulk-list article
// topics, then generate real, full article content for each one on
// demand, with optional scheduling for future publication.

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AiGuidanceField from './AiGuidanceField';
import { X, Loader2, Sparkles, Plus, Calendar, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react';

export default function ArticleTopicsManager({ onClose, onArticleGenerated }) {
    const [bulkText, setBulkText] = useState('');
    // NEW (2026-10-14): one brief applied to every topic in the batch that has no description of its own.
    const [sharedGuidance, setSharedGuidance] = useState('');
    const [adding, setAdding] = useState(false);
    const [topics, setTopics] = useState([]);
    const [loadingTopics, setLoadingTopics] = useState(true);
    const [generatingId, setGeneratingId] = useState(null);
    const [scheduleDates, setScheduleDates] = useState({});
    const [error, setError] = useState('');

    useEffect(() => {
        loadTopics();
    }, []);

    // The popup must always be closable: Escape closes it, clicking the dark area
    // outside it closes it, and the page behind it cannot scroll while it is open.
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
        window.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [onClose]);

    async function deleteTopics(body, confirmText) {
        if (confirmText && !confirm(confirmText)) return;
        setError('');
        try {
            const headers = await authHeaders();
            const response = await fetch('/api/index?action=admin-delete-article-topics', {
                method: 'POST', headers, body: JSON.stringify(body)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Could not delete');
            await loadTopics();
        } catch (err) {
            setError(err.message);
        }
    }

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

        if (lines.length > 15 && !confirm(`This will add ${lines.length} separate topics, one per line. Is that what you meant?`)) {
            return;
        }

        setAdding(true);
        try {
            const headers = await authHeaders();
            const response = await fetch('/api/index?action=admin-bulk-add-article-topics', {
                method: 'POST',
                headers,
                body: JSON.stringify({ topics: lines, sharedGuidance: sharedGuidance.trim() || undefined })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to add topics');

            setBulkText('');
            setSharedGuidance('');
            await loadTopics();
        } catch (err) {
            setError(err.message);
        } finally {
            setAdding(false);
        }
    }

    const [publishNow, setPublishNow] = useState(false);

    async function handleGenerate(topicId) {
        setGeneratingId(topicId);
        setError('');
        try {
            const headers = await authHeaders();
            const scheduledFor = scheduleDates[topicId] || null;
            const response = await fetch('/api/index?action=generate-article-from-topic', {
                method: 'POST',
                headers,
                body: JSON.stringify({ topicId, scheduledFor, publishNow })
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
        <div
            className="fixed inset-0 bg-black/70 flex items-start sm:items-center justify-center z-[100] p-4 pt-24"
            onMouseDown={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}
        >
            <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full max-h-[calc(100vh-7rem)] overflow-y-auto">
                <div className="sticky top-0 z-10 flex justify-between items-center px-6 py-4 bg-slate-900 border-b border-slate-800 rounded-t-xl">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary-400" /> Bulk Article Topics
                    </h2>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white text-sm"
                    >
                        <X className="w-4 h-4" /> Close
                    </button>
                </div>
                <div className="p-6">

                <label className="flex items-start gap-2 text-xs text-slate-400 mb-3 bg-slate-950/50 border border-slate-800 rounded-lg p-2">
                    <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} className="mt-0.5" />
                    <span>Publish immediately. Leave this off to save each article as a draft you read first (recommended: AI can state laws and figures wrongly). A schedule date set below still applies.</span>
                </label>
                <p className="text-slate-400 text-sm mb-3">
                    List as many topics as you like, one per line. To give one topic its own brief, write it as <span className="text-slate-300">Topic | short description</span>. Generate full article content for each one whenever you're ready.
                </p>

                <textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    rows={5}
                    placeholder={"How to write a standout CV in 2026\nRemote work interview tips\nNegotiating your first salary"}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm mb-3"
                />

                <AiGuidanceField
                    className="mb-3"
                    value={sharedGuidance}
                    onChange={setSharedGuidance}
                    label="Brief description for all these topics (optional)"
                    rows={2}
                    placeholder={'Audience, angle and tone for the whole batch. e.g. "For care workers and small care providers in England. Plain English, practical, UK law only."'}
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

                <div className="flex items-center justify-between mb-2">
                    <p className="text-slate-300 text-sm font-medium">Topics List ({topics.length})</p>
                    {topics.some(t => t.status !== 'generated') && (
                        <button
                            onClick={() => deleteTopics({ allPending: true }, 'Delete every topic that has not produced an article yet? Topics that already generated an article are kept.')}
                            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                        >
                            <Trash2 className="w-3 h-3" /> Clear all not generated
                        </button>
                    )}
                </div>
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
                                        {topic.description && <p className="text-slate-400 text-xs mt-0.5 line-clamp-2" title={topic.description}>{topic.description}</p>}
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
                                            <button
                                                onClick={() => deleteTopics({ topicIds: [topic.id] })}
                                                aria-label="Delete topic"
                                                title="Delete this topic"
                                                className="p-1.5 text-slate-400 hover:text-red-400"
                                            >
                                                <Trash2 className="w-4 h-4" />
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
        </div>
    );
}

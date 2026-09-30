// src/components/admin/ManageBookChapters.jsx
//
// NEW (2026-09-27): the genuinely missing chapter-content UI -
// confirmed directly that no admin UI existed at all to add real
// chapter content, which is exactly why "Convert to Course" always
// failed with "no chapters with real content yet" for every book.
//
// Usage: <ManageBookChapters bookId={book.id} bookTitle={book.title} />

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { BookOpen, Loader2, X, Plus, Trash2, ChevronUp, ChevronDown, Save, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ManageBookChapters({ bookId, bookTitle }) {
    const [showModal, setShowModal] = useState(false);
    const [chapters, setChapters] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeChapterId, setActiveChapterId] = useState(null);
    const [draftTitle, setDraftTitle] = useState('');
    const [draftContent, setDraftContent] = useState('');
    const [saving, setSaving] = useState(false);
    const [detecting, setDetecting] = useState(null);
    const [detectError, setDetectError] = useState(null);

    useEffect(() => {
        if (showModal) loadChapters();
    }, [showModal]);

    async function authHeaders() {
        const { data: { session } } = await supabase.auth.getSession();
        return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` };
    }

    async function handleAutoDetect(source) {
        if (chapters.length > 0 && !confirm(`This will replace all existing chapters with ones detected from the uploaded ${source.toUpperCase()}. Continue?`)) {
            return;
        }
        setDetecting(source);
        setDetectError(null);
        try {
            const headers = await authHeaders();
            const response = await fetch(`/api/index?action=extract-chapters-from-${source}`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ bookId })
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.error);

            toast.success(`Detected and saved ${data.detectedCount} chapters from the uploaded ${source.toUpperCase()}.`);
            loadChapters();
        } catch (err) {
            setDetectError(err.message);
        } finally {
            setDetecting(null);
        }
    }

    async function loadChapters() {
        setLoading(true);
        try {
            const headers = await authHeaders();
            const response = await fetch(`/api/index?action=get-book-chapters&bookId=${bookId}`, { headers });
            const data = await response.json();
            if (!data.success) throw new Error(data.error);
            setChapters(data.chapters || []);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }

    function openChapter(chapter) {
        setActiveChapterId(chapter?.id || 'new');
        setDraftTitle(chapter?.title || '');
        setDraftContent(chapter?.content || '');
    }

    function closeChapterEditor() {
        setActiveChapterId(null);
        setDraftTitle('');
        setDraftContent('');
    }

    async function handleSaveChapter() {
        if (!draftTitle.trim()) {
            toast.error('Chapter title is required');
            return;
        }
        setSaving(true);
        try {
            const headers = await authHeaders();
            const isNew = activeChapterId === 'new';
            const response = await fetch('/api/index?action=save-book-chapter', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    chapterId: isNew ? undefined : activeChapterId,
                    bookId,
                    title: draftTitle,
                    content: draftContent
                })
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.error);

            toast.success(isNew ? 'Chapter added' : 'Chapter saved');
            closeChapterEditor();
            loadChapters();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteChapter(chapterId) {
        if (!confirm('Delete this chapter? This cannot be undone.')) return;
        try {
            const headers = await authHeaders();
            const response = await fetch('/api/index?action=delete-book-chapter', {
                method: 'POST',
                headers,
                body: JSON.stringify({ chapterId })
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.error);
            toast.success('Chapter deleted');
            loadChapters();
        } catch (err) {
            toast.error(err.message);
        }
    }

    async function handleMove(index, direction) {
        const newChapters = [...chapters];
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= newChapters.length) return;

        [newChapters[index], newChapters[targetIndex]] = [newChapters[targetIndex], newChapters[index]];
        setChapters(newChapters);

        try {
            const headers = await authHeaders();
            await fetch('/api/index?action=reorder-book-chapters', {
                method: 'POST',
                headers,
                body: JSON.stringify({ orderedIds: newChapters.map(c => c.id) })
            });
        } catch (err) {
            toast.error('Failed to save new order');
            loadChapters();
        }
    }

    const chaptersWithContent = chapters.filter(c => c.content && c.content.trim().length > 0).length;

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="px-3 py-1.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition flex items-center justify-center"
                title="Manage chapters"
            >
                <BookOpen className="w-4 h-4" />
            </button>

            {showModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-primary-400" /> Chapters
                                </h2>
                                <p className="text-slate-400 text-sm">{bookTitle}</p>
                            </div>
                            <button onClick={() => { setShowModal(false); closeChapterEditor(); }} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {!loading && (
                            <p className="text-xs text-slate-500 mb-4">
                                {chaptersWithContent} of {chapters.length} chapter{chapters.length === 1 ? '' : 's'} have real content — needed before this book can be converted to a course.
                            </p>
                        )}

                        {!activeChapterId && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                                <button
                                    onClick={() => handleAutoDetect('epub')}
                                    disabled={!!detecting}
                                    className="py-2.5 bg-slate-800 border border-slate-700 text-slate-200 hover:text-white hover:border-slate-500 rounded-lg transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                                >
                                    {detecting === 'epub' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                    {detecting === 'epub' ? 'Detecting...' : 'Auto-Detect from EPUB'}
                                </button>
                                <button
                                    onClick={() => handleAutoDetect('pdf')}
                                    disabled={!!detecting}
                                    className="py-2.5 bg-slate-800 border border-slate-700 text-slate-200 hover:text-white hover:border-slate-500 rounded-lg transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                                >
                                    {detecting === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                    {detecting === 'pdf' ? 'Detecting...' : 'Auto-Detect from PDF'}
                                </button>
                            </div>
                        )}

                        {detectError && (
                            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4">
                                <p className="text-amber-200 text-sm">{detectError}</p>
                            </div>
                        )}

                        {activeChapterId ? (
                            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4">
                                <input
                                    type="text"
                                    value={draftTitle}
                                    onChange={(e) => setDraftTitle(e.target.value)}
                                    placeholder="Chapter title"
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm mb-3"
                                />
                                <textarea
                                    value={draftContent}
                                    onChange={(e) => setDraftContent(e.target.value)}
                                    placeholder="Chapter content..."
                                    rows={12}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm mb-3"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSaveChapter}
                                        disabled={saving}
                                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition disabled:opacity-50 flex items-center gap-2 text-sm"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Save Chapter
                                    </button>
                                    <button
                                        onClick={closeChapterEditor}
                                        disabled={saving}
                                        className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition text-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => openChapter(null)}
                                className="w-full mb-4 py-2.5 border border-dashed border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 rounded-lg transition flex items-center justify-center gap-2 text-sm"
                            >
                                <Plus className="w-4 h-4" /> Add Chapter
                            </button>
                        )}

                        {loading ? (
                            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary-400" /></div>
                        ) : chapters.length === 0 ? (
                            <p className="text-slate-500 text-sm text-center py-6">No chapters yet - add one above to get started.</p>
                        ) : (
                            <div className="space-y-2">
                                {chapters.map((chapter, index) => (
                                    <div key={chapter.id} className="flex items-center gap-2 bg-slate-800/30 border border-slate-800 rounded-lg p-3">
                                        <div className="flex flex-col">
                                            <button onClick={() => handleMove(index, -1)} disabled={index === 0} className="text-slate-500 hover:text-white disabled:opacity-30">
                                                <ChevronUp className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => handleMove(index, 1)} disabled={index === chapters.length - 1} className="text-slate-500 hover:text-white disabled:opacity-30">
                                                <ChevronDown className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <button onClick={() => openChapter(chapter)} className="flex-1 text-left">
                                            <p className="text-white text-sm font-medium">{chapter.title}</p>
                                            <p className="text-slate-500 text-xs">
                                                {chapter.content?.trim() ? `${chapter.content.trim().split(/\s+/).length} words` : '⚠️ No content yet'}
                                            </p>
                                        </button>
                                        <button onClick={() => handleDeleteChapter(chapter.id)} className="text-slate-500 hover:text-red-400 transition">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

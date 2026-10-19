// src/components/admin/ConvertBookToCourseButton.jsx
//
// NEW (2026-09-21): drop-in button that converts a book's real
// chapters into a real course - pass it the book's id and title.
// Mount this wherever the admin book-management UI renders each
// book's row/card (e.g. AdminBooks.jsx), alongside its other actions.
//
// UPDATED (2026-09-25): replaced the crude window.confirm() prompts
// with a real, polished modal - a genuine checkbox for AI elaboration
// instead of a second confirm() dialog, matching the platform's own
// UI style instead of a native browser dialog.
//
// Usage: <ConvertBookToCourseButton bookId={book.id} bookTitle={book.title} />

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { GraduationCap, Loader2, X, Sparkles, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ConvertBookToCourseButton({ bookId, bookTitle, onConverted }) {
    const navigate = useNavigate();
    const [showModal, setShowModal] = useState(false);
    const [elaborateWithAI, setElaborateWithAI] = useState(true);
    // NEW (2026-10-19): 'expand' = real course lessons grown from the chapter; 'preserve' = chapter text kept whole
    const [mode, setMode] = useState('expand');
    const [guidance, setGuidance] = useState('');
    const [converting, setConverting] = useState(false);
    const [conversionError, setConversionError] = useState(null);

    async function handleConvert() {
        setConverting(true);
        setConversionError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/index?action=generate-course-from-book', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ bookId, elaborateWithAI, mode, guidance: guidance.trim() || undefined })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Conversion failed');

            // FIXED (2026-09-27): confirmed the real, honest cause of
            // "just rolling and did nothing" - this never navigated
            // anywhere after success at all, only closing the modal
            // and showing a toast easy to miss. Now genuinely
            // navigates to the real course-management page, where the
            // new course (as a draft) is visible to open and publish.
            toast.success(`Course created with ${data.lessonsCreated} lessons — it's saved as a draft, ready to review before publishing.`);
            setShowModal(false);
            if (onConverted) onConverted(data.course);
            navigate('/admin/courses');
        } catch (err) {
            toast.error(err.message);
            setConversionError(err.message);
        } finally {
            setConverting(false);
        }
    }

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="px-3 py-1.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition disabled:opacity-50 flex items-center justify-center"
                title="Convert this book's chapters into a course"
            >
                <GraduationCap className="w-4 h-4" />
            </button>

            {showModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <GraduationCap className="w-5 h-5 text-primary-400" /> Convert to Course
                            </h2>
                            <button onClick={() => setShowModal(false)} disabled={converting} className="text-slate-400 hover:text-white disabled:opacity-50">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-slate-300 text-sm mb-4">
                            Convert <strong className="text-white">"{bookTitle}"</strong> into a course. Each chapter with real content becomes one lesson, saved as a draft for you to review.
                        </p>

                        <label className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800 mb-3">
                            <input
                                type="checkbox"
                                checked={elaborateWithAI}
                                onChange={(e) => setElaborateWithAI(e.target.checked)}
                                className="mt-1"
                            />
                            <div>
                                <p className="text-white text-sm font-medium flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-primary-400" /> Use AI Assist
                                </p>
                                <p className="text-slate-400 text-xs mt-0.5">
                                    Uncheck to copy the chapter text as it is, with no AI.
                                </p>
                            </div>
                        </label>

                        {elaborateWithAI && (
                            <div className="mb-3 space-y-2">
                                <label className={`block p-3 rounded-lg cursor-pointer border ${mode === 'expand' ? 'border-primary-500 bg-primary-500/10' : 'border-slate-700 bg-slate-800/50'}`}>
                                    <input type="radio" name="convmode" checked={mode === 'expand'} onChange={() => setMode('expand')} className="mr-2" />
                                    <span className="text-white text-sm font-medium">Build a proper course (recommended)</span>
                                    <p className="text-slate-400 text-xs mt-1 ml-5">Each chapter becomes a taught lesson: a hook, objectives, clear sections, worked examples, a practice task, a self-check question and a recap, flowing into the next lesson. It stays within what the book says and will not invent facts or statistics.</p>
                                </label>
                                <label className={`block p-3 rounded-lg cursor-pointer border ${mode === 'preserve' ? 'border-primary-500 bg-primary-500/10' : 'border-slate-700 bg-slate-800/50'}`}>
                                    <input type="radio" name="convmode" checked={mode === 'preserve'} onChange={() => setMode('preserve')} className="mr-2" />
                                    <span className="text-white text-sm font-medium">Keep the book's text whole</span>
                                    <p className="text-slate-400 text-xs mt-1 ml-5">Adds learning objectives and key takeaways around the chapter's own text, unchanged.</p>
                                </label>
                                {mode === 'expand' && (
                                    <textarea
                                        value={guidance}
                                        onChange={(e) => setGuidance(e.target.value)}
                                        rows={2}
                                        maxLength={600}
                                        placeholder="Optional: tell the AI how to teach it (for example: for new managers, practical, friendly tone)"
                                        className="w-full p-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500"
                                    />
                                )}
                            </div>
                        )}

                        {conversionError && (
                            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
                                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                <p className="text-red-300 text-sm">{conversionError}</p>
                            </div>
                        )}

                        <button
                            onClick={handleConvert}
                            disabled={converting}
                            className="w-full py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {converting ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4" />}
                            {converting ? 'Converting...' : 'Convert to Course'}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

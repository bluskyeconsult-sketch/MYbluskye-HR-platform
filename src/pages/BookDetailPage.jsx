// src/pages/BookDetailPage.jsx
// NEW (2026-08-23) — fills the missing /books/:id route. Handles all
// three real purchase paths per the confirmed business model:
// - Hardcopy: direct external link to Amazon (or another retailer) —
//   this site never processes that payment.
// - E-copy: real Stripe checkout on this site, gated by a genuine
//   purchase record before the file is ever accessible.
// - Free preview: opens the same BookReader against a separate,
//   intentionally public sample file.

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { authenticatedFetch } from '../lib/authFetch';
import BookReader from '../components/BookReader';
import AudiobookListener from '../components/AudiobookListener';
import {
    ArrowLeft, ExternalLink, Download, BookOpen, Loader2,
    AlertCircle, CheckCircle, ShoppingCart, Eye
} from 'lucide-react';

export default function BookDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [book, setBook] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const [hasPurchased, setHasPurchased] = useState(false);
    const [checkingOut, setCheckingOut] = useState(false);
    const [readerOpen, setReaderOpen] = useState(false);
    const [readerMode, setReaderMode] = useState('preview'); // 'preview' | 'full'
    const [readerUrl, setReaderUrl] = useState(null);
    const [readerLoading, setReaderLoading] = useState(false);
    // NEW (2026-09-04): real chapters + audio listening - a genuinely
    // new, parallel way to experience a book's content, alongside the
    // existing PDF-based reading above. This page previously had no
    // concept of chapters at all.
    const [chapters, setChapters] = useState([]);
    const [expandedChapterId, setExpandedChapterId] = useState(null);
    const [listeningChapterId, setListeningChapterId] = useState(null);
    const [generatingAudioFor, setGeneratingAudioFor] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        loadBook();
    }, [id]);

    async function loadBook() {
        setLoading(true);
        setError(null);
        try {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            setUser(currentUser);

            const { data, error: bookError } = await supabase
                .from('books')
                .select('*')
                .eq('id', id)
                .eq('is_published', true)
                .single();

            if (bookError || !data) {
                setError('This book could not be found.');
                return;
            }
            setBook(data);

            if (currentUser) {
                const { data: purchase } = await supabase
                    .from('book_purchases')
                    .select('id')
                    .eq('user_id', currentUser.id)
                    .eq('book_id', id)
                    .maybeSingle();
                setHasPurchased(!!purchase);

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('user_type')
                    .eq('id', currentUser.id)
                    .maybeSingle();
                setIsAdmin(profile?.user_type === 'admin' || profile?.user_type === 'super_admin');
            }

            // Chapters are a genuinely separate, optional feature from
            // the PDF-based reading above - not every book will have
            // these populated, and that's fine; the section below
            // simply won't render if there's nothing here.
            const { data: chaptersData } = await supabase
                .from('book_chapters')
                .select('id, title, content, audio_segments, order_index')
                .eq('book_id', id)
                .order('order_index', { ascending: true });
            setChapters(chaptersData || []);
        } catch (err) {
            console.error('Error loading book:', err);
            setError('Something went wrong loading this book.');
        } finally {
            setLoading(false);
        }
    }

    async function handleBuyEcopy() {
        if (!user) {
            navigate(`/sign-in?redirect=/books/${id}`);
            return;
        }

        setCheckingOut(true);
        try {
            // FIXED (2026-08-28): confirmed real, live regression - same
            // missing-Authorization-header pattern found across ~9 other
            // files, never previously caught here. Book e-copy purchases
            // have been failing for every real, logged-in user since the
            // backend security fix went out. Uses the new shared
            // authenticatedFetch utility rather than hand-assembling
            // headers again - the whole point of building it.
            const data = await authenticatedFetch('create-book-checkout-session', {
                bookId: id,
                userId: user.id,
                userEmail: user.email
            });
            window.location.href = data.url;
        } catch (err) {
            alert('Unable to start checkout: ' + err.message);
        } finally {
            setCheckingOut(false);
        }
    }

    async function openPreview() {
        if (!book.preview_file_url) {
            alert('No free preview is available for this book yet.');
            return;
        }
        setReaderMode('preview');
        setReaderUrl(book.preview_file_url);
        setReaderOpen(true);
    }

    async function openFullBook() {
        if (!user) {
            navigate(`/sign-in?redirect=/books/${id}`);
            return;
        }

        setReaderLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/index?action=get-book-read-url', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ bookId: id })
            });
            const data = await response.json();

            if (!data.success) throw new Error(data.error || 'Unable to open this book');

            setReaderMode('full');
            setReaderUrl(data.url);
            setReaderOpen(true);
        } catch (err) {
            alert(err.message);
        } finally {
            setReaderLoading(false);
        }
    }

    async function handleGenerateChapterAudio(chapterId) {
        setGeneratingAudioFor(chapterId);
        try {
            const data = await authenticatedFetch('generateChapterAudio', { chapterId });
            if (!data.success) throw new Error(data.error || 'Audio generation failed');
            // Refresh this chapter's data so the new audio_segments show up
            setChapters(prev => prev.map(c => c.id === chapterId ? { ...c, audio_segments: data.segments } : c));
        } catch (err) {
            alert('Failed to generate audio: ' + err.message);
        } finally {
            setGeneratingAudioFor(null);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    if (error || !book) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
                <div className="text-center">
                    <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Book Not Found</h1>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <Link to="/books" className="text-primary-400 hover:underline">Back to Books</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-8 md:py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
                <Link to="/books" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition">
                    <ArrowLeft className="w-4 h-4" /> Back to Books
                </Link>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Cover */}
                    <div>
                        <div className="aspect-[3/4] rounded-xl overflow-hidden bg-gradient-to-br from-primary-500/20 to-sky-500/20 flex items-center justify-center border border-slate-800">
                            {book.cover_url ? (
                                <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                            ) : (
                                <BookOpen className="w-16 h-16 text-primary-400/50" />
                            )}
                        </div>
                    </div>

                    {/* Details */}
                    <div className="md:col-span-2">
                        <h1 className="text-3xl font-bold text-white mb-1">{book.title}</h1>
                        <p className="text-slate-400 mb-4">by {book.author}</p>
                        <p className="text-slate-300 mb-6 leading-relaxed">{book.description}</p>

                        {/* Hardcopy */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 mb-4">
                            <h3 className="text-white font-semibold mb-2">Hardcopy</h3>
                            {book.external_purchase_url ? (
                                <>
                                    <p className="text-slate-400 text-sm mb-3">
                                        {book.price ? `$${Number(book.price).toFixed(2)} — ` : ''}
                                        Fulfilled and shipped directly by the retailer.
                                    </p>
                                    <a
                                        href={book.external_purchase_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
                                    >
                                        <ExternalLink className="w-4 h-4" /> Buy Hardcopy
                                    </a>
                                </>
                            ) : (
                                <p className="text-slate-500 text-sm">Hardcopy not currently available for this title.</p>
                            )}
                        </div>

                        {/* E-copy */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                            <h3 className="text-white font-semibold mb-2">E-Copy</h3>
                            {book.ebook_price ? (
                                <>
                                    {hasPurchased ? (
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                            <span className="flex items-center gap-1.5 text-emerald-400 text-sm">
                                                <CheckCircle className="w-4 h-4" /> You own this e-copy
                                            </span>
                                            <button
                                                onClick={openFullBook}
                                                disabled={readerLoading}
                                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition disabled:opacity-50"
                                            >
                                                {readerLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
                                                Read Now
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-slate-300 text-lg font-semibold mb-3">
                                                ${Number(book.ebook_price).toFixed(2)}
                                            </p>
                                            <div className="flex flex-wrap gap-3">
                                                <button
                                                    onClick={handleBuyEcopy}
                                                    disabled={checkingOut}
                                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition disabled:opacity-50"
                                                >
                                                    {checkingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                                                    Buy E-Copy
                                                </button>
                                                {book.preview_file_url && (
                                                    <button
                                                        onClick={openPreview}
                                                        className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition"
                                                    >
                                                        <Eye className="w-4 h-4" /> Free Preview
                                                    </button>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </>
                            ) : (
                                <p className="text-slate-500 text-sm">E-copy not currently available for this title.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Chapters - a genuinely new, separate way to experience
                this book's content, alongside the PDF reading above.
                Only renders if chapters actually exist for this book. */}
            {chapters.length > 0 && (
                <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-8">
                    <h2 className="text-xl font-bold text-white mb-4">Chapters</h2>
                    <div className="space-y-2">
                        {chapters.map((chapter, idx) => {
                            const isExpanded = expandedChapterId === chapter.id;
                            const isListening = listeningChapterId === chapter.id;
                            const hasAudio = chapter.audio_segments && chapter.audio_segments.length > 0;
                            const isGenerating = generatingAudioFor === chapter.id;

                            return (
                                <div key={chapter.id} className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                                    <div className="flex items-center justify-between p-4">
                                        <button
                                            onClick={() => setExpandedChapterId(isExpanded ? null : chapter.id)}
                                            className="flex-1 text-left flex items-center gap-3"
                                        >
                                            <span className="text-slate-500 text-sm">{idx + 1}.</span>
                                            <span className="text-white font-medium">{chapter.title}</span>
                                        </button>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {hasAudio ? (
                                                <button
                                                    onClick={() => setListeningChapterId(isListening ? null : chapter.id)}
                                                    className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-sm rounded-lg transition"
                                                >
                                                    {isListening ? 'Hide Player' : 'Listen'}
                                                </button>
                                            ) : isAdmin ? (
                                                <button
                                                    onClick={() => handleGenerateChapterAudio(chapter.id)}
                                                    disabled={isGenerating || !chapter.content}
                                                    className="px-3 py-1.5 border border-slate-700 text-slate-300 text-sm rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
                                                    title={!chapter.content ? 'This chapter has no content to narrate' : ''}
                                                >
                                                    {isGenerating ? 'Generating...' : 'Generate Audio'}
                                                </button>
                                            ) : null}
                                        </div>
                                    </div>

                                    {isExpanded && chapter.content && (
                                        <div className="px-4 pb-4 border-t border-slate-800 pt-3">
                                            <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                                                {chapter.content}
                                            </p>
                                        </div>
                                    )}

                                    {isListening && hasAudio && (
                                        <div className="px-4 pb-4">
                                            <AudiobookListener
                                                segments={chapter.audio_segments}
                                                chapterTitle={chapter.title}
                                                onClose={() => setListeningChapterId(null)}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {readerOpen && (
                <BookReader
                    fileUrl={readerUrl}
                    title={book.title}
                    isPreview={readerMode === 'preview'}
                    onClose={() => setReaderOpen(false)}
                />
            )}
        </div>
    );
}

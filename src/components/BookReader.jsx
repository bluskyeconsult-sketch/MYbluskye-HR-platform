// src/components/BookReader.jsx
//
// UPGRADED (2026-10-11): animated page turns, fit-to-screen pages, reader themes
// (Paper / Sepia / Night), page slider and progress bar, swipe on phones, keyboard
// shortcuts, real fullscreen, focus mode, remembers the last page read, and an end card
// on free previews. Props are unchanged: { fileUrl, title, isPreview, onClose }.
//
// NEW (2026-08-23) — the in-browser reading experience for both free
// previews and purchased e-copies. Same component serves both cases;
// the only difference is which URL it's handed:
// - Preview mode: books.preview_file_url — a genuinely public sample
//   file, safe to link directly.
// - Full mode: a short-lived signed URL from the get-book-read-url
//   backend action, only ever obtainable after a confirmed real
//   purchase.
//
// Uses react-pdf (a React wrapper around Mozilla's pdf.js) — requires
// adding the `react-pdf` npm package. Renders one page at a time with
// navigation, zoom, and fullscreen, rather than a long scrolling list
// of every page at once, which is both a better reading experience and
// meaningfully lighter on memory for long books.

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Document, Page, pdfjs } from 'react-pdf';
import {
    ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2,
    Minimize2, X, Loader2, AlertCircle, BookOpen, Eye, EyeOff
} from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// pdf.js needs its worker script — loaded from a CDN matching the
// installed react-pdf/pdf.js version, standard setup for this library.
// FIXED (2026-08-23): the original CDN-string approach
// (cdnjs.cloudflare.com/.../pdf.worker.min.js) matched an older
// react-pdf/pdf.js setup convention. Confirmed react-pdf's current
// version (10.x) expects the worker resolved through the bundler
// instead, via a direct import.meta.url reference to the .mjs worker
// file inside pdfjs-dist (a dependency of react-pdf itself) — Vite,
// being ESM-native, resolves this correctly with no extra config.
// This also removes a dependency on a third-party CDN staying
// available, which the old approach silently relied on.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

const THEMES = {
    paper: { label: 'Paper', bg: 'bg-slate-900', filter: 'none', dot: 'bg-white' },
    sepia: { label: 'Sepia', bg: 'bg-amber-950', filter: 'sepia(0.6) brightness(0.96) contrast(0.95)', dot: 'bg-amber-200' },
    night: { label: 'Night', bg: 'bg-black', filter: 'invert(0.9) hue-rotate(180deg) brightness(0.95)', dot: 'bg-slate-700' }
};

function store(key, value) {
    try { if (value === undefined) return window.localStorage.getItem(key); window.localStorage.setItem(key, value); } catch { /* storage blocked: ignore */ }
    return null;
}

const pageVariants = {
    enter: (d) => ({ opacity: 0, x: d * 48, rotateY: d * -7 }),
    center: { opacity: 1, x: 0, rotateY: 0 },
    exit: (d) => ({ opacity: 0, x: d * -48, rotateY: d * 7 })
};

export default function BookReader({ fileUrl, title, isPreview = false, onClose }) {
    const reduce = useReducedMotion();
    const rootRef = useRef(null);
    const areaRef = useRef(null);
    const touchRef = useRef(null);
    const pageKey = `odusbaba_book_page:${title || 'book'}`;

    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [direction, setDirection] = useState(1);
    const [zoom, setZoom] = useState(1);
    const [theme, setTheme] = useState(() => (THEMES[store('odusbaba_reader_theme')] ? store('odusbaba_reader_theme') : 'paper'));
    const [areaWidth, setAreaWidth] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [focusMode, setFocusMode] = useState(false);
    const [resumed, setResumed] = useState(null);
    const [loadError, setLoadError] = useState(null);

    const canFullscreen = typeof document !== 'undefined' && !!document.documentElement.requestFullscreen;

    const onDocumentLoadSuccess = useCallback(({ numPages: total }) => {
        setNumPages(total);
        setLoadError(null);
        const saved = parseInt(store(pageKey) || '', 10);
        if (saved > 1 && saved <= total) {
            setPageNumber(saved);
            setResumed(saved);
            setTimeout(() => setResumed(null), 3500);
        } else {
            setPageNumber(1);
        }
    }, [pageKey]);

    const onDocumentLoadError = useCallback((err) => {
        console.error('Failed to load book file:', err);
        setLoadError('Unable to load this book right now. Please try again shortly.');
    }, []);

    const goTo = useCallback((n) => {
        setPageNumber((p) => {
            const target = Math.min(Math.max(1, n), numPages || p);
            if (target !== p) setDirection(target > p ? 1 : -1);
            return target;
        });
    }, [numPages]);
    const next = useCallback(() => goTo(pageNumber + 1), [goTo, pageNumber]);
    const prev = useCallback(() => goTo(pageNumber - 1), [goTo, pageNumber]);

    // Remember where the reader stopped.
    useEffect(() => { if (numPages) store(pageKey, String(pageNumber)); }, [pageNumber, numPages, pageKey]);
    useEffect(() => { store('odusbaba_reader_theme', theme); }, [theme]);

    // Fit the page to the screen.
    useEffect(() => {
        const el = areaRef.current;
        if (!el) return;
        const measure = () => setAreaWidth(el.clientWidth);
        measure();
        if (typeof ResizeObserver === 'undefined') { window.addEventListener('resize', measure); return () => window.removeEventListener('resize', measure); }
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Real fullscreen.
    useEffect(() => {
        const onFs = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onFs);
        return () => document.removeEventListener('fullscreenchange', onFs);
    }, []);
    const toggleFullscreen = useCallback(() => {
        try {
            if (document.fullscreenElement) document.exitFullscreen();
            else rootRef.current?.requestFullscreen?.();
        } catch { /* not allowed: ignore */ }
    }, []);

    // Keyboard.
    useEffect(() => {
        const onKey = (e) => {
            const tag = (e.target?.tagName || '').toLowerCase();
            if (tag === 'input' && e.target.type === 'number') { if (e.key === 'Escape') e.target.blur(); return; }
            if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && tag !== 'button')) { e.preventDefault(); next(); }
            else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
            else if (e.key === 'Home') goTo(1);
            else if (e.key === 'End') goTo(numPages || 1);
            else if (e.key === '+' || e.key === '=') setZoom(z => Math.min(2.4, +(z + 0.2).toFixed(1)));
            else if (e.key === '-') setZoom(z => Math.max(0.6, +(z - 0.2).toFixed(1)));
            else if (e.key === 'f' || e.key === 'F') setFocusMode(f => !f);
            else if (e.key === 'Escape' && !document.fullscreenElement && onClose) onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [next, prev, goTo, numPages, onClose]);

    // Swipe to turn pages (only when not zoomed in, so panning still works).
    const onTouchStart = (e) => { const t = e.touches[0]; touchRef.current = { x: t.clientX, y: t.clientY }; };
    const onTouchEnd = (e) => {
        const s = touchRef.current; touchRef.current = null;
        if (!s || zoom > 1.05) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - s.x, dy = t.clientY - s.y;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { dx < 0 ? next() : prev(); }
    };

    const th = THEMES[theme];
    const pageWidth = Math.max(240, Math.min(areaWidth - 32, 860)) * zoom;
    const pct = numPages ? Math.round((pageNumber / numPages) * 100) : 0;
    const atEnd = numPages && pageNumber >= numPages;
    const dur = reduce ? 0 : 0.28;
    const iconBtn = 'p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition';

    return (
        <motion.div
            ref={rootRef}
            className={`fixed inset-0 z-50 ${th.bg} flex flex-col transition-colors duration-500`}
            initial={reduce ? false : { opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            role="dialog"
            aria-label={`Reading ${title || 'book'}`}
        >
            {/* Reading progress */}
            <div className="h-1 bg-slate-800/60 flex-shrink-0" aria-hidden="true">
                <motion.div className="h-full bg-gradient-to-r from-primary-500 to-primary-300" animate={{ width: `${pct}%` }} transition={{ duration: dur + 0.1 }} />
            </div>

            {/* Top bar */}
            <AnimatePresence initial={false}>
                {!focusMode && (
                    <motion.div
                        key="top"
                        className="flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-900/95 border-b border-slate-800 flex-shrink-0"
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <BookOpen className="w-5 h-5 text-primary-400 flex-shrink-0" />
                            <h2 className="text-white font-semibold truncate">{title}</h2>
                            {isPreview && (
                                <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full flex-shrink-0">Preview</span>
                            )}
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                            <div className="hidden sm:flex items-center gap-1 mr-1 px-1.5 py-1 rounded-lg bg-slate-800/70" role="group" aria-label="Reader colour">
                                {Object.entries(THEMES).map(([key, t]) => (
                                    <button
                                        key={key}
                                        onClick={() => setTheme(key)}
                                        title={t.label}
                                        aria-label={`${t.label} theme`}
                                        aria-pressed={theme === key}
                                        className={`w-5 h-5 rounded-full ${t.dot} border ${theme === key ? 'border-primary-400 ring-2 ring-primary-400/50' : 'border-slate-600'} transition`}
                                    />
                                ))}
                            </div>
                            <button onClick={() => setZoom(z => Math.max(0.6, +(z - 0.2).toFixed(1)))} className={iconBtn} title="Zoom out (-)" aria-label="Zoom out"><ZoomOut className="w-4 h-4" /></button>
                            <span className="hidden sm:inline text-xs text-slate-500 w-9 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
                            <button onClick={() => setZoom(z => Math.min(2.4, +(z + 0.2).toFixed(1)))} className={iconBtn} title="Zoom in (+)" aria-label="Zoom in"><ZoomIn className="w-4 h-4" /></button>
                            <button onClick={() => setFocusMode(true)} className={`${iconBtn} hidden sm:block`} title="Focus mode (F)" aria-label="Focus mode"><Eye className="w-4 h-4" /></button>
                            {canFullscreen && (
                                <button onClick={toggleFullscreen} className={`${iconBtn} hidden sm:block`} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} aria-label="Fullscreen">
                                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                </button>
                            )}
                            {onClose && (
                                <button onClick={onClose} className={iconBtn} title="Close (Esc)" aria-label="Close"><X className="w-5 h-5" /></button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Reading area */}
            <div className="relative flex-1 min-h-0">
                <div
                    ref={areaRef}
                    className="absolute inset-0 overflow-auto flex justify-center p-4 sm:p-8"
                    onTouchStart={onTouchStart}
                    onTouchEnd={onTouchEnd}
                    style={{ perspective: 1400 }}
                >
                    {loadError ? (
                        <div className="text-center max-w-sm self-center">
                            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                            <p className="text-slate-300">{loadError}</p>
                        </div>
                    ) : (
                        <Document
                            file={fileUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={onDocumentLoadError}
                            className="m-auto"
                            loading={
                                <div className="flex flex-col items-center gap-3 py-24">
                                    <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
                                    <p className="text-slate-400 text-sm">Opening book...</p>
                                </div>
                            }
                        >
                            <AnimatePresence mode="wait" custom={direction} initial={false}>
                                <motion.div
                                    key={pageNumber}
                                    custom={direction}
                                    variants={pageVariants}
                                    initial={reduce ? false : 'enter'}
                                    animate="center"
                                    exit={reduce ? undefined : 'exit'}
                                    transition={{ duration: dur, ease: 'easeOut' }}
                                    style={{ filter: th.filter, transformOrigin: direction > 0 ? 'left center' : 'right center' }}
                                    className="rounded-lg overflow-hidden shadow-2xl shadow-black/60 bg-white"
                                >
                                    <Page
                                        pageNumber={pageNumber}
                                        width={pageWidth}
                                        renderAnnotationLayer={true}
                                        renderTextLayer={true}
                                        loading={<div className="bg-white animate-pulse" style={{ width: pageWidth, height: pageWidth * 1.35 }} />}
                                    />
                                </motion.div>
                            </AnimatePresence>

                            {isPreview && atEnd && (
                                <motion.div
                                    className="mt-6 mx-auto max-w-md rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-center"
                                    initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}
                                >
                                    <p className="font-semibold text-amber-200">That is the end of the free preview</p>
                                    <p className="mt-1 text-sm text-slate-300">Enjoyed it? Go back to the book page to see how to get the full book.</p>
                                    {onClose && <button onClick={onClose} className="mt-3 px-5 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium transition">Back to the book</button>}
                                </motion.div>
                            )}
                        </Document>
                    )}
                </div>

                {/* Edge arrows (desktop) */}
                {numPages && (
                    <>
                        <button onClick={prev} disabled={pageNumber <= 1} aria-label="Previous page"
                            className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 items-center justify-center rounded-full bg-slate-900/70 text-white opacity-30 hover:opacity-100 disabled:opacity-0 transition">
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button onClick={next} disabled={pageNumber >= numPages} aria-label="Next page"
                            className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 items-center justify-center rounded-full bg-slate-900/70 text-white opacity-30 hover:opacity-100 disabled:opacity-0 transition">
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    </>
                )}

                {/* Focus-mode exit */}
                <AnimatePresence>
                    {focusMode && (
                        <motion.button
                            key="unfocus"
                            onClick={() => setFocusMode(false)}
                            className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 px-3 py-1.5 text-xs text-slate-200 hover:text-white"
                            initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} whileHover={{ opacity: 1 }} exit={{ opacity: 0 }}
                        >
                            <EyeOff className="w-3.5 h-3.5" /> Show controls
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* Resumed toast */}
                <AnimatePresence>
                    {resumed && (
                        <motion.div
                            key="resumed"
                            className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-slate-900/90 border border-slate-700 px-4 py-2 text-sm text-slate-200 shadow-lg"
                            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        >
                            Continuing from page {resumed}
                            <button onClick={() => { goTo(1); setResumed(null); }} className="ml-3 text-primary-300 underline underline-offset-2">Start over</button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom navigation */}
            {numPages && !focusMode && (
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/95 border-t border-slate-800 flex-shrink-0">
                    <button onClick={prev} disabled={pageNumber <= 1} aria-label="Previous page"
                        className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <input
                        type="range" min={1} max={numPages} value={pageNumber}
                        onChange={(e) => goTo(parseInt(e.target.value, 10))}
                        aria-label="Go to page"
                        className="flex-1 accent-primary-500 cursor-pointer"
                    />
                    <div className="flex items-center gap-2 text-sm text-slate-300 flex-shrink-0">
                        <input
                            type="number" min={1} max={numPages} value={pageNumber}
                            onChange={(e) => { const v = parseInt(e.target.value, 10); if (v >= 1 && v <= numPages) goTo(v); }}
                            aria-label="Page number"
                            className="w-14 px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-white text-center"
                        />
                        <span className="text-slate-500 whitespace-nowrap">of {numPages}<span className="hidden sm:inline"> &middot; {pct}%</span></span>
                    </div>
                    <button onClick={next} disabled={pageNumber >= numPages} aria-label="Next page"
                        className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            )}
        </motion.div>
    );
}

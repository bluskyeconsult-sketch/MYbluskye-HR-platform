// src/components/BookReader.jsx
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

import { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import {
    ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2,
    Minimize2, X, Loader2, AlertCircle, BookOpen
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

export default function BookReader({ fileUrl, title, isPreview = false, onClose }) {
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.2);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [loadError, setLoadError] = useState(null);

    const onDocumentLoadSuccess = useCallback(({ numPages: total }) => {
        setNumPages(total);
        setPageNumber(1);
        setLoadError(null);
    }, []);

    const onDocumentLoadError = useCallback((err) => {
        console.error('Failed to load book file:', err);
        setLoadError('Unable to load this book right now. Please try again shortly.');
    }, []);

    function goToPrevPage() {
        setPageNumber(p => Math.max(1, p - 1));
    }

    function goToNextPage() {
        setPageNumber(p => Math.min(numPages || p, p + 1));
    }

    function handleKeyDown(e) {
        if (e.key === 'ArrowLeft') goToPrevPage();
        if (e.key === 'ArrowRight') goToNextPage();
        if (e.key === 'Escape' && onClose) onClose();
    }

    return (
        <div
            className={`fixed inset-0 z-50 bg-slate-950 flex flex-col ${isFullscreen ? '' : ''}`}
            onKeyDown={handleKeyDown}
            tabIndex={0}
        >
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-900 border-b border-slate-800 flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                    <BookOpen className="w-5 h-5 text-primary-400 flex-shrink-0" />
                    <h2 className="text-white font-semibold truncate">{title}</h2>
                    {isPreview && (
                        <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full flex-shrink-0">
                            Preview
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <button
                        onClick={() => setScale(s => Math.max(0.6, s - 0.2))}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                        title="Zoom out"
                    >
                        <ZoomOut className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setScale(s => Math.min(2.4, s + 0.2))}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                        title="Zoom in"
                    >
                        <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setIsFullscreen(f => !f)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition hidden sm:block"
                        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                    >
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                            title="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Reading area */}
            <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-900/50 p-4 sm:p-8">
                {loadError ? (
                    <div className="text-center max-w-sm">
                        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                        <p className="text-slate-300">{loadError}</p>
                    </div>
                ) : (
                    <Document
                        file={fileUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={onDocumentLoadError}
                        loading={
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
                                <p className="text-slate-400 text-sm">Loading book...</p>
                            </div>
                        }
                    >
                        <Page
                            pageNumber={pageNumber}
                            scale={scale}
                            className="shadow-2xl rounded-lg overflow-hidden"
                            renderAnnotationLayer={true}
                            renderTextLayer={true}
                        />
                    </Document>
                )}
            </div>

            {/* Bottom navigation */}
            {numPages && (
                <div className="flex items-center justify-center gap-4 px-4 py-3 bg-slate-900 border-t border-slate-800 flex-shrink-0">
                    <button
                        onClick={goToPrevPage}
                        disabled={pageNumber <= 1}
                        className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                        <input
                            type="number"
                            min={1}
                            max={numPages}
                            value={pageNumber}
                            onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (val >= 1 && val <= numPages) setPageNumber(val);
                            }}
                            className="w-14 px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-white text-center"
                        />
                        <span className="text-slate-500">of {numPages}</span>
                    </div>
                    <button
                        onClick={goToNextPage}
                        disabled={pageNumber >= numPages}
                        className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
}

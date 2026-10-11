// src/components/LessonReader.jsx
//
// NEW (2026-10-11): the full-screen lesson reader for course learners.
// Replaces one long wall of text with:
//   - short steps (about a minute each) with Back / Continue and a progress bar,
//   - code shown in its own framed panel with a Copy button,
//   - a lesson list beside the lesson (desktop) or above it (phone),
//   - a recap step styled as "Key takeaways",
//   - arrow-key navigation.
// All the splitting logic lives in src/lib/lessonChunker.js.

import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
    X, ChevronLeft, ChevronRight, CheckCircle, Circle, Clock, Copy, Check, Loader2,
    Lightbulb, BookOpen, Code2, ListChecks, Info, AlertTriangle, FlaskConical, Sparkles,
    ZoomIn, HelpCircle, Quote as QuoteIcon, XCircle
} from 'lucide-react';
import { chunkLesson, readingMinutes, inlinePieces, safeImageSrc } from '../lib/lessonChunker';

function Inline({ text }) {
    return (
        <>
            {inlinePieces(text).map((p, i) =>
                p.t === 'code'
                    ? <code key={i} className="px-1.5 py-0.5 mx-0.5 rounded-md bg-slate-800 border border-slate-700 text-primary-300 text-[0.92em] font-mono break-words">{p.v}</code>
                    : p.t === 'bold'
                        ? <strong key={i} className="text-white font-semibold">{p.v}</strong>
                        : p.t === 'link'
                            ? <a key={i} href={p.href} target="_blank" rel="noopener noreferrer" className="text-primary-300 underline underline-offset-2 hover:text-primary-200">{p.v}</a>
                            : <span key={i}>{p.v}</span>
            )}
        </>
    );
}

function CodeBlock({ code, lang }) {
    const [copied, setCopied] = useState(false);
    async function copy() {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch { /* clipboard blocked: nothing to do */ }
    }
    return (
        <div className="my-5 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 shadow-lg">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800/80 border-b border-slate-700">
                <span className="flex items-center gap-2 text-xs font-medium text-slate-300">
                    <span className="flex gap-1" aria-hidden="true">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
                    </span>
                    <Code2 className="w-3.5 h-3.5 ml-1 text-slate-400" /> {lang || 'Code'}
                </span>
                <button
                    onClick={copy}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-2 py-1 rounded-md hover:bg-slate-700 transition"
                    aria-label="Copy code"
                >
                    {copied ? <><Check className="w-3.5 h-3.5 text-emerald-400" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                </button>
            </div>
            <pre className="p-4 overflow-x-auto text-[0.85rem] leading-relaxed text-slate-100 font-mono"><code>{code}</code></pre>
        </div>
    );
}

// ---------- Rich blocks ----------

function Figure({ block, onZoom, reduce, wide }) {
    const [state, setState] = useState('loading');   // loading | ok | failed
    if (state === 'failed') return null;               // a broken picture never leaves an ugly hole
    return (
        <motion.figure
            className="my-6"
            initial={reduce ? false : { opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
        >
            <button
                type="button"
                onClick={() => onZoom(block)}
                className="group relative block w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/60 shadow-xl shadow-black/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
                aria-label={`Enlarge picture: ${block.alt || 'illustration'}`}
            >
                {state === 'loading' && <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-slate-800 via-slate-700/60 to-slate-800" />}
                <img
                    src={block.src}
                    alt={block.alt || ''}
                    loading="lazy"
                    onLoad={() => setState('ok')}
                    onError={() => setState('failed')}
                    className={`w-full ${wide ? 'max-h-[26rem]' : 'max-h-[22rem]'} object-cover transition duration-700 group-hover:scale-[1.03] ${state === 'ok' ? 'opacity-100' : 'opacity-0'}`}
                />
                <span className="absolute right-3 top-3 rounded-full bg-slate-950/70 p-2 text-slate-200 opacity-0 transition group-hover:opacity-100"><ZoomIn className="w-4 h-4" /></span>
            </button>
            {block.caption ? <figcaption className="mt-2 text-center text-sm italic text-slate-400">{block.caption}</figcaption> : null}
        </motion.figure>
    );
}

const CALLOUT_STYLE = {
    tip:     { icon: Lightbulb,     label: 'Tip',        box: 'border-emerald-500/40 bg-emerald-500/10', ico: 'text-emerald-300' },
    note:    { icon: Info,          label: 'Note',       box: 'border-sky-500/40 bg-sky-500/10',         ico: 'text-sky-300' },
    warning: { icon: AlertTriangle, label: 'Watch out',  box: 'border-amber-500/40 bg-amber-500/10',     ico: 'text-amber-300' },
    example: { icon: FlaskConical,  label: 'Example',    box: 'border-violet-500/40 bg-violet-500/10',   ico: 'text-violet-300' },
    key:     { icon: Sparkles,      label: 'Key idea',   box: 'border-primary-500/40 bg-primary-500/10', ico: 'text-primary-300' }
};

function Callout({ block }) {
    const st = CALLOUT_STYLE[block.tone] || CALLOUT_STYLE.note;
    const Icon = st.icon;
    return (
        <div className={`my-5 flex gap-3 rounded-xl border-l-4 border ${st.box} p-4`}>
            <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${st.ico}`} />
            <div className="min-w-0">
                <p className={`text-xs font-semibold uppercase tracking-wide ${st.ico}`}>{block.title || st.label}</p>
                <p className="mt-1 leading-7 text-slate-200"><Inline text={block.text} /></p>
            </div>
        </div>
    );
}

function Term({ block }) {
    return (
        <div className="my-4 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 flex gap-3 items-start">
            <BookOpen className="w-4 h-4 mt-1.5 text-primary-300 flex-shrink-0" />
            <p className="leading-7 text-slate-300"><span className="font-semibold text-white">{block.word}</span> <span className="text-slate-500">&middot;</span> <Inline text={block.text} /></p>
        </div>
    );
}

function Steps({ block, reduce }) {
    return (
        <div className="my-6">
            {block.title ? <p className="text-sm font-semibold text-white mb-3">{block.title}</p> : null}
            <ol className="relative space-y-4">
                {block.items.map((it, i) => (
                    <motion.li
                        key={i}
                        className="relative flex gap-4"
                        initial={reduce ? false : { opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.35, delay: reduce ? 0 : 0.12 * i }}
                    >
                        {i < block.items.length - 1 && <span className="absolute left-[15px] top-8 bottom-[-1rem] w-px bg-slate-700" aria-hidden="true" />}
                        <span className="z-10 w-8 h-8 rounded-full bg-primary-600 text-white text-sm font-semibold flex items-center justify-center flex-shrink-0 ring-4 ring-slate-900">{i + 1}</span>
                        <p className="pt-1 leading-7 text-slate-200"><Inline text={it} /></p>
                    </motion.li>
                ))}
            </ol>
        </div>
    );
}

// Counts up to a leading number ("85%" -> 0..85) so figures feel alive; plain text if there is no number.
function CountUp({ value, reduce }) {
    const m = String(value).match(/^(\D*)(\d[\d,]*(?:\.\d+)?)(.*)$/);
    const target = m ? parseFloat(m[2].replace(/,/g, '')) : NaN;
    const [n, setN] = useState(reduce || !m ? target : 0);
    useEffect(() => {
        if (reduce || !m || Number.isNaN(target)) return;
        let raf, start;
        const dur = 900;
        const tick = (t) => {
            if (start === undefined) start = t;
            const p = Math.min(1, (t - start) / dur);
            setN(target * (1 - Math.pow(1 - p, 3)));
            if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [value]);   // eslint-disable-line react-hooks/exhaustive-deps
    if (!m || Number.isNaN(target)) return <>{value}</>;
    const decimals = (m[2].split('.')[1] || '').length;
    const shown = decimals ? n.toFixed(decimals) : Math.round(n).toLocaleString();
    return <>{m[1]}{shown}{m[3]}</>;
}

function Stats({ block, reduce }) {
    return (
        <div className="my-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {block.items.map((it, i) => (
                <motion.div
                    key={i}
                    className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-center"
                    initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: reduce ? 0 : 0.1 * i }}
                >
                    <p className="text-3xl font-bold text-primary-300"><CountUp value={it.value} reduce={reduce} /></p>
                    <p className="mt-1 text-sm text-slate-400">{it.label}</p>
                </motion.div>
            ))}
        </div>
    );
}

function DataTable({ block }) {
    return (
        <div className="my-6 overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-800 text-slate-200">
                    <tr>{block.head.map((h, i) => <th key={i} className="px-4 py-3 font-semibold whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                    {block.rows.map((r, ri) => (
                        <tr key={ri} className="odd:bg-slate-900/40">
                            {r.map((c, ci) => <td key={ci} className="px-4 py-3 align-top"><Inline text={c} /></td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Pullquote({ block }) {
    return (
        <blockquote className="my-6 border-l-4 border-primary-500 pl-5 py-1">
            <QuoteIcon className="w-5 h-5 text-primary-400 mb-1" />
            <p className="text-lg italic leading-8 text-slate-200"><Inline text={block.text} /></p>
        </blockquote>
    );
}

function VideoBlock({ block }) {
    return (
        <div className="my-5 overflow-hidden rounded-2xl border border-slate-700 bg-black shadow-xl">
            {block.kind === 'iframe' ? (
                <div className="aspect-video">
                    <iframe
                        src={block.src}
                        title="Lesson video"
                        className="w-full h-full"
                        loading="lazy"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                        allowFullScreen
                    />
                </div>
            ) : (
                <video src={block.src} controls preload="metadata" className="w-full max-h-[28rem]" />
            )}
        </div>
    );
}

function CheckBlock({ block }) {
    const [picked, setPicked] = useState(-1);
    const [shown, setShown] = useState(false);
    if (!block.question || block.options.length < 2) return null;
    const hasKey = block.correct >= 0;
    const right = hasKey && picked === block.correct;
    return (
        <div className="my-4 rounded-2xl border border-primary-500/30 bg-primary-500/5 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-primary-300 mb-2"><HelpCircle className="w-4 h-4" /> Quick check</p>
            <p className="text-lg text-white leading-7 mb-4"><Inline text={block.question} /></p>
            <div className="space-y-2">
                {block.options.map((o, i) => {
                    const isPicked = picked === i;
                    const state = !shown ? (isPicked ? 'ring-2 ring-primary-400 bg-slate-800' : 'bg-slate-800/60 hover:bg-slate-800')
                        : hasKey && i === block.correct ? 'ring-2 ring-emerald-400 bg-emerald-500/10'
                        : isPicked ? 'ring-2 ring-red-400 bg-red-500/10' : 'bg-slate-800/40 opacity-70';
                    return (
                        <button
                            key={i}
                            disabled={shown}
                            onClick={() => setPicked(i)}
                            className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left text-slate-200 transition ${state}`}
                        >
                            <span className="w-6 h-6 rounded-full border border-slate-600 text-xs flex items-center justify-center flex-shrink-0">{String.fromCharCode(65 + i)}</span>
                            <span className="flex-1"><Inline text={o} /></span>
                            {shown && hasKey && i === block.correct && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                            {shown && isPicked && !(hasKey && i === block.correct) && <XCircle className="w-5 h-5 text-red-400" />}
                        </button>
                    );
                })}
            </div>
            {!shown ? (
                <button onClick={() => setShown(true)} disabled={picked < 0} className="mt-4 px-5 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium disabled:opacity-40 transition">Check answer</button>
            ) : (
                <div className="mt-4">
                    {hasKey && <p className={`font-semibold ${right ? 'text-emerald-300' : 'text-amber-300'}`}>{right ? 'Correct!' : 'Not quite.'}</p>}
                    {block.explain ? <p className="mt-1 text-slate-300 leading-7"><Inline text={block.explain} /></p> : null}
                    {!right && <button onClick={() => { setShown(false); setPicked(-1); }} className="mt-3 text-sm text-primary-300 hover:text-primary-200 underline underline-offset-2">Try again</button>}
                </div>
            )}
        </div>
    );
}

function Block({ block, onZoom, reduce }) {
    switch (block.type) {
        case 'code': return <CodeBlock code={block.text} lang={block.lang} />;
        case 'figure': return <Figure block={block} onZoom={onZoom} reduce={reduce} />;
        case 'callout': return <Callout block={block} />;
        case 'term': return <Term block={block} />;
        case 'steps': return <Steps block={block} reduce={reduce} />;
        case 'stats': return <Stats block={block} reduce={reduce} />;
        case 'table': return <DataTable block={block} />;
        case 'quote': return <Pullquote block={block} />;
        case 'video': return <VideoBlock block={block} />;
        case 'check': return <CheckBlock block={block} />;
        case 'h3': return <h4 className="text-lg font-semibold text-white mt-6 mb-2">{block.text}</h4>;
        case 'ul': return (
            <ul className="my-4 space-y-2">
                {block.items.map((it, i) => (
                    <li key={i} className="flex gap-3 text-slate-300 leading-relaxed"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary-400 flex-shrink-0" /><span><Inline text={it} /></span></li>
                ))}
            </ul>
        );
        case 'ol': return (
            <ol className="my-4 space-y-2">
                {block.items.map((it, i) => (
                    <li key={i} className="flex gap-3 text-slate-300 leading-relaxed"><span className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-300 text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span><span><Inline text={it} /></span></li>
                ))}
            </ol>
        );
        default: return <p className="text-[1.05rem] leading-8 text-slate-300 my-4"><Inline text={block.text} /></p>;
    }
}

function Lightbox({ item, onClose }) {
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [onClose]);
    return (
        <motion.div
            className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} role="dialog" aria-modal="true" aria-label="Enlarged picture"
        >
            <button className="absolute right-4 top-4 rounded-full bg-slate-800 p-2 text-white" onClick={onClose} aria-label="Close picture"><X className="w-5 h-5" /></button>
            <figure className="max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
                <img src={item.src} alt={item.alt || ''} className="w-full max-h-[80vh] object-contain rounded-xl" />
                {item.caption ? <figcaption className="mt-3 text-center text-slate-300 italic">{item.caption}</figcaption> : null}
            </figure>
        </motion.div>
    );
}

export default function LessonReader({
    courseTitle, lessons, activeIdx, direction = 1, done, updating,
    onClose, onPrevLesson, onNextLesson, onComplete, onSelectLesson, completedLessonIds = []
}) {
    const lesson = lessons[activeIdx];
    const steps = useMemo(() => {
        const base = chunkLesson(lesson?.content);
        // A lesson picture saved by the course editor (course_images) opens the lesson, unless the text already uses it.
        const hero = (lesson?.images || []).map(im => ({ src: safeImageSrc(im.image_url, true), alt: im.alt_text || lesson?.title || '' })).find(h => h.src);
        if (hero && !String(lesson?.content || '').includes(hero.src.slice(0, 80))) {
            const figure = { type: 'figure', src: hero.src, alt: hero.alt, caption: '', hero: true };
            if (base.length === 0) return [{ title: '', kind: 'step', label: 'Introduction', blocks: [figure] }];
            base[0] = { ...base[0], blocks: [figure, ...base[0].blocks] };
        }
        return base;
    }, [lesson?.id, lesson?.content, lesson?.images]);   // eslint-disable-line react-hooks/exhaustive-deps
    const [stepIdx, setStepIdx] = useState(0);
    const [stepDir, setStepDir] = useState(1);
    const [listOpen, setListOpen] = useState(false);
    const [zoomed, setZoomed] = useState(null);
    const reduce = useReducedMotion();

    // A different lesson always starts at its first step.
    useEffect(() => { setStepIdx(0); setStepDir(1); setListOpen(false); }, [lesson?.id]);

    const total = steps.length;
    const atFirst = stepIdx === 0;
    const atLast = total === 0 || stepIdx === total - 1;
    const isLastLesson = activeIdx === lessons.length - 1;
    const completedCount = completedLessonIds.length;
    const courseProgress = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;

    const nextStep = useCallback(() => {
        if (stepIdx < total - 1) { setStepDir(1); setStepIdx(i => i + 1); }
    }, [stepIdx, total]);
    const prevStep = useCallback(() => {
        if (stepIdx > 0) { setStepDir(-1); setStepIdx(i => i - 1); }
    }, [stepIdx]);

    // Arrow keys move between steps; Escape closes.
    useEffect(() => {
        function onKey(e) {
            const tag = (e.target?.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea') return;
            if (e.key === 'ArrowRight') nextStep();
            else if (e.key === 'ArrowLeft') prevStep();
            else if (e.key === 'Escape' && !zoomed) onClose();
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [nextStep, prevStep, onClose, zoomed]);

    // Lock the page behind the reader.
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, []);

    if (!lesson) return null;
    const step = steps[stepIdx];
    const minutes = lesson.duration_minutes ? null : readingMinutes(lesson.content);

    return (
        <motion.div
            className="fixed inset-0 z-50 bg-slate-950 flex flex-col"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            role="dialog" aria-modal="true" aria-label={`Lesson: ${lesson.title}`}
        >
            {/* Top bar */}
            <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
                    <button onClick={onClose} className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition text-sm">
                        <X className="w-5 h-5" /> <span className="hidden sm:inline">Close</span>
                    </button>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{courseTitle}</p>
                        <div className="mt-1 h-1.5 rounded-full bg-slate-800 overflow-hidden" aria-label={`Course progress ${courseProgress}%`}>
                            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${courseProgress}%` }} />
                        </div>
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap">{courseProgress}% done</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
                    {/* Lesson list */}
                    <aside className="mb-5 lg:mb-0 lg:sticky lg:top-6 lg:self-start">
                        <button
                            onClick={() => setListOpen(o => !o)}
                            className="lg:hidden w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white"
                            aria-expanded={listOpen}
                        >
                            <span className="flex items-center gap-2"><ListChecks className="w-4 h-4 text-primary-400" /> Lesson {activeIdx + 1} of {lessons.length}</span>
                            <ChevronRight className={`w-4 h-4 transition ${listOpen ? 'rotate-90' : ''}`} />
                        </button>
                        <nav className={`${listOpen ? 'block' : 'hidden'} lg:block mt-2 lg:mt-0 rounded-xl bg-slate-900/60 border border-slate-800 p-2 max-h-[60vh] overflow-y-auto`} aria-label="Lessons">
                            <p className="hidden lg:flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-wide text-slate-500"><BookOpen className="w-3.5 h-3.5" /> Lessons</p>
                            {lessons.map((l, i) => {
                                const isDone = completedLessonIds.includes(l.id);
                                const isActive = i === activeIdx;
                                return (
                                    <button
                                        key={l.id}
                                        onClick={() => onSelectLesson(l.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition ${isActive ? 'bg-primary-600/20 text-white ring-1 ring-primary-500/40' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                                        aria-current={isActive ? 'step' : undefined}
                                    >
                                        {isDone ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <Circle className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-primary-400' : 'text-slate-600'}`} />}
                                        <span className="flex-1 min-w-0 truncate">{l.title}</span>
                                        {l.duration_minutes ? <span className="text-xs text-slate-500">{l.duration_minutes}m</span> : null}
                                    </button>
                                );
                            })}
                        </nav>
                    </aside>

                    {/* Lesson */}
                    <main className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mb-2">
                            <span className="uppercase tracking-wide text-primary-300 font-semibold">Lesson {activeIdx + 1}</span>
                            {lesson.duration_minutes ? <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {lesson.duration_minutes} min</span>
                                : minutes ? <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> about {minutes} min read</span> : null}
                            {done && <span className="flex items-center gap-1 text-emerald-400"><CheckCircle className="w-3.5 h-3.5" /> Completed</span>}
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-5">{lesson.title}</h1>

                        {total > 1 && (
                            <div className="flex gap-1.5 mb-4" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={stepIdx + 1} aria-label="Steps in this lesson">
                                {steps.map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { setStepDir(i > stepIdx ? 1 : -1); setStepIdx(i); }}
                                        className={`h-2 flex-1 rounded-full transition ${i < stepIdx ? 'bg-primary-500' : i === stepIdx ? 'bg-primary-400' : 'bg-slate-800 hover:bg-slate-700'}`}
                                        aria-label={`Go to step ${i + 1}: ${s.label}`}
                                    />
                                ))}
                            </div>
                        )}

                        {/* The framed card */}
                        <div className="rounded-2xl border border-slate-700/80 bg-gradient-to-b from-slate-900 to-slate-900/60 shadow-2xl shadow-black/30 overflow-hidden">
                            {total === 0 ? (
                                <div className="p-8 text-center text-slate-400">No written content for this lesson yet.</div>
                            ) : (
                                <>
                                    <div className="px-5 sm:px-8 pt-5 flex items-center justify-between">
                                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${step.kind === 'recap' ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30' : 'bg-primary-500/15 text-primary-300 ring-1 ring-primary-500/30'}`}>
                                            {step.kind === 'recap' ? <Lightbulb className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
                                            {step.kind === 'recap' ? 'Key takeaways' : step.label}
                                        </span>
                                        <span className="text-xs text-slate-500">Step {stepIdx + 1} of {total}</span>
                                    </div>

                                    <div className="px-5 sm:px-8 py-4 min-h-[16rem]">
                                        <AnimatePresence mode="wait" custom={stepDir}>
                                            <motion.div
                                                key={`${lesson.id}-${stepIdx}`}
                                                initial={{ opacity: 0, x: stepDir > 0 ? 28 : -28 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: stepDir > 0 ? -28 : 28 }}
                                                transition={{ duration: 0.2 }}
                                                className={step.kind === 'recap' ? 'rounded-xl bg-amber-500/5 border border-amber-500/20 px-5 py-2 my-2' : ''}
                                            >
                                                {step.title && step.kind !== 'recap' && step.title !== step.label
                                                    ? <h2 className="text-xl font-semibold text-white mt-1">{step.title}</h2> : null}
                                                {step.blocks.map((b, i) => (
                                                    <motion.div key={i} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: reduce ? 0 : Math.min(i, 6) * 0.07 }}>
                                                        <Block block={b} onZoom={setZoomed} reduce={reduce} />
                                                    </motion.div>
                                                ))}
                                            </motion.div>
                                        </AnimatePresence>
                                    </div>

                                    {/* Step controls */}
                                    <div className="flex items-center justify-between gap-3 px-5 sm:px-8 py-4 border-t border-slate-800 bg-slate-900/60">
                                        <button
                                            onClick={prevStep}
                                            disabled={atFirst}
                                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                        >
                                            <ChevronLeft className="w-4 h-4" /> Back
                                        </button>
                                        {!atLast ? (
                                            <button onClick={nextStep} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-medium transition">
                                                Continue <ChevronRight className="w-4 h-4" />
                                            </button>
                                        ) : done ? (
                                            <button onClick={onNextLesson} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-medium transition">
                                                {isLastLesson ? 'Finish' : 'Next lesson'} <ChevronRight className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <button onClick={onComplete} disabled={updating} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition disabled:opacity-50">
                                                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Mark lesson complete
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex items-center justify-between mt-4 text-sm">
                            <button onClick={onPrevLesson} disabled={activeIdx === 0} className="inline-flex items-center gap-1.5 text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition">
                                <ChevronLeft className="w-4 h-4" /> Previous lesson
                            </button>
                            {!isLastLesson && (
                                <button onClick={onNextLesson} className="inline-flex items-center gap-1.5 text-slate-500 hover:text-white transition">
                                    Skip to next lesson <ChevronRight className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <p className="hidden sm:block text-center text-xs text-slate-600 mt-6">Tip: use the left and right arrow keys to move between steps.</p>
                    </main>
                </div>
            </div>
            <AnimatePresence>{zoomed && <Lightbox item={zoomed} onClose={() => setZoomed(null)} />}</AnimatePresence>
        </motion.div>
    );
}

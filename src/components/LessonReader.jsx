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
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, ChevronLeft, ChevronRight, CheckCircle, Circle, Clock, Copy, Check, Loader2,
    Lightbulb, BookOpen, Code2, ListChecks
} from 'lucide-react';
import { chunkLesson, readingMinutes, inlinePieces } from '../lib/lessonChunker';

function Inline({ text }) {
    return (
        <>
            {inlinePieces(text).map((p, i) =>
                p.t === 'code'
                    ? <code key={i} className="px-1.5 py-0.5 mx-0.5 rounded-md bg-slate-800 border border-slate-700 text-primary-300 text-[0.92em] font-mono break-words">{p.v}</code>
                    : p.t === 'bold'
                        ? <strong key={i} className="text-white font-semibold">{p.v}</strong>
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

function Block({ block }) {
    if (block.type === 'code') return <CodeBlock code={block.text} lang={block.lang} />;
    if (block.type === 'h3') return <h4 className="text-lg font-semibold text-white mt-6 mb-2">{block.text}</h4>;
    if (block.type === 'ul') return (
        <ul className="my-4 space-y-2">
            {block.items.map((it, i) => (
                <li key={i} className="flex gap-3 text-slate-300 leading-relaxed"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary-400 flex-shrink-0" /><span><Inline text={it} /></span></li>
            ))}
        </ul>
    );
    if (block.type === 'ol') return (
        <ol className="my-4 space-y-2">
            {block.items.map((it, i) => (
                <li key={i} className="flex gap-3 text-slate-300 leading-relaxed"><span className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-300 text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span><span><Inline text={it} /></span></li>
            ))}
        </ol>
    );
    return <p className="text-[1.05rem] leading-8 text-slate-300 my-4"><Inline text={block.text} /></p>;
}

export default function LessonReader({
    courseTitle, lessons, activeIdx, direction = 1, done, updating,
    onClose, onPrevLesson, onNextLesson, onComplete, onSelectLesson, completedLessonIds = []
}) {
    const lesson = lessons[activeIdx];
    const steps = useMemo(() => chunkLesson(lesson?.content), [lesson?.id, lesson?.content]);
    const [stepIdx, setStepIdx] = useState(0);
    const [stepDir, setStepDir] = useState(1);
    const [listOpen, setListOpen] = useState(false);

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
            else if (e.key === 'Escape') onClose();
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [nextStep, prevStep, onClose]);

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
                                                {step.blocks.map((b, i) => <Block key={i} block={b} />)}
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
        </motion.div>
    );
}

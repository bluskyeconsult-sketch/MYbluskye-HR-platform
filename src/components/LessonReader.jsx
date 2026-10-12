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

import { Inline, CodeBlock, Block, Lightbox } from './RichBlocks';


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

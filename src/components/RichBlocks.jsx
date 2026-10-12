// src/components/RichBlocks.jsx
//
// NEW (2026-10-11): the shared building blocks for every long-form reading surface on
// the site: lessons (LessonReader), articles and book chapters (RichContent /
// ContentRenderer), HR tool output. One look, one set of animations.
//
// `scroll` mode: blocks animate when they scroll into view (articles, chapters).
// Default mode: blocks animate as they mount (the stepped lesson reader).
// Everything respects "reduce motion" through the `reduce` flag.

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
    X, CheckCircle, Copy, Check,
    Lightbulb, BookOpen, Code2, Info, AlertTriangle, FlaskConical, Sparkles,
    ZoomIn, HelpCircle, Quote as QuoteIcon, XCircle
} from 'lucide-react';
import { inlinePieces } from '../lib/lessonChunker';

// Builds framer-motion props for either mount-time or scroll-into-view reveal.
export function mp(reduce, scroll, from, delay = 0, duration = 0.45) {
    const to = { opacity: 1, x: 0, y: 0, scale: 1 };
    const base = { initial: reduce ? false : from, transition: { duration, delay: reduce ? 0 : delay, ease: 'easeOut' } };
    return scroll
        ? { ...base, whileInView: to, viewport: { once: true, margin: '-40px' } }
        : { ...base, animate: to };
}

// Wraps any element so it fades up when scrolled into view.
export function Reveal({ children, reduce, scroll = true, delay = 0, className = '' }) {
    return <motion.div className={className} {...mp(reduce, scroll, { opacity: 0, y: 18 }, delay, 0.5)}>{children}</motion.div>;
}

export function Inline({ text }) {
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

// Splits text into sentences (ignoring full stops inside `code`), so each can fade in one after another.
function sentences(text) {
    const out = []; let cur = ''; let inCode = false;
    const t = String(text ?? '');
    for (let i = 0; i < t.length; i++) {
        const ch = t[i];
        cur += ch;
        if (ch === '`') inCode = !inCode;
        if (!inCode && /[.!?]/.test(ch) && /\s/.test(t[i + 1] || '') && !/\b(e\.g|i\.e|etc|vs)\.$/i.test(cur)) {
            out.push(cur); cur = '';
            while (/\s/.test(t[i + 1] || '')) i++;
            cur = '';
        }
    }
    if (cur.trim()) out.push(cur);
    return out.length ? out : [t];
}

// A paragraph whose sentences appear one by one.
export function Lines({ text, reduce, scroll, delay = 0, step = 0.11, className = '' }) {
    const parts = sentences(text);
    return (
        <p className={className}>
            {parts.map((sn, i) => (
                <motion.span key={i} className="inline" {...mp(reduce, scroll, { opacity: 0, y: 8 }, delay + i * step, 0.4)}>
                    <Inline text={sn} />{i < parts.length - 1 ? ' ' : ''}
                </motion.span>
            ))}
        </p>
    );
}

export function CodeBlock({ code, lang }) {
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

function Figure({ block, onZoom, reduce, wide, scroll }) {
    const [state, setState] = useState('loading');   // loading | ok | failed
    if (state === 'failed') return null;               // a broken picture never leaves an ugly hole
    return (
        <motion.figure
            className="my-6"
            {...mp(reduce, scroll, { opacity: 0, scale: 0.97, y: 14 }, 0, 0.55)}
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
                <p className="mt-1 leading-7 font-medium text-slate-100"><Inline text={block.text} /></p>
            </div>
        </div>
    );
}

function Term({ block }) {
    return (
        <div className="my-4 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 flex gap-3 items-start">
            <BookOpen className="w-4 h-4 mt-1.5 text-primary-300 flex-shrink-0" />
            <p className="leading-7 font-medium text-slate-100"><span className="font-bold text-white">{block.word}</span> <span className="text-slate-500">&middot;</span> <Inline text={block.text} /></p>
        </div>
    );
}

function Steps({ block, reduce, scroll }) {
    return (
        <div className="my-6">
            {block.title ? <p className="text-sm font-semibold text-white mb-3">{block.title}</p> : null}
            <ol className="relative space-y-4">
                {block.items.map((it, i) => (
                    <motion.li
                        key={i}
                        className="relative flex gap-4"
                        {...mp(reduce, scroll, { opacity: 0, x: -16 }, 0.12 * i, 0.35)}
                    >
                        {i < block.items.length - 1 && <span className="absolute left-[15px] top-8 bottom-[-1rem] w-px bg-slate-700" aria-hidden="true" />}
                        <span className="z-10 w-8 h-8 rounded-full bg-primary-600 text-white text-sm font-semibold flex items-center justify-center flex-shrink-0 ring-4 ring-slate-900">{i + 1}</span>
                        <p className="pt-1 text-[1.05rem] leading-7 font-medium text-slate-100"><Inline text={it} /></p>
                    </motion.li>
                ))}
            </ol>
        </div>
    );
}

// Counts up to a leading number ("85%" -> 0..85) once it scrolls into view; plain text if there is no number.
function CountUp({ value, reduce }) {
    const m = String(value).match(/^(\D*)(\d[\d,]*(?:\.\d+)?)(.*)$/);
    const target = m ? parseFloat(m[2].replace(/,/g, '')) : NaN;
    const ref = useRef(null);
    const [seen, setSeen] = useState(false);
    const [n, setN] = useState(reduce || !m ? target : 0);
    useEffect(() => {
        if (reduce || !m || typeof IntersectionObserver === 'undefined') { setSeen(true); return; }
        const io = new IntersectionObserver((es) => { if (es.some(e => e.isIntersecting)) { setSeen(true); io.disconnect(); } }, { threshold: 0.4 });
        if (ref.current) io.observe(ref.current);
        return () => io.disconnect();
    }, [value]);   // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!seen || reduce || !m || Number.isNaN(target)) { if (seen && !Number.isNaN(target)) setN(target); return; }
        let raf, start;
        const dur = 1000;
        const tick = (t) => {
            if (start === undefined) start = t;
            const p = Math.min(1, (t - start) / dur);
            setN(target * (1 - Math.pow(1 - p, 3)));
            if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [seen, value]);   // eslint-disable-line react-hooks/exhaustive-deps
    if (!m || Number.isNaN(target)) return <>{value}</>;
    const decimals = (m[2].split('.')[1] || '').length;
    const shown = decimals ? n.toFixed(decimals) : Math.round(n).toLocaleString();
    return <span ref={ref}>{m[1]}{shown}{m[3]}</span>;
}

function Stats({ block, reduce, scroll }) {
    return (
        <div className="my-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {block.items.map((it, i) => (
                <motion.div
                    key={i}
                    className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-center"
                    {...mp(reduce, scroll, { opacity: 0, y: 14 }, 0.1 * i, 0.4)}
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
            <p className="text-xl font-medium italic leading-8 text-white"><Inline text={block.text} /></p>
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

export function Block({ block, onZoom, reduce, scroll = false, delay = 0 }) {
    switch (block.type) {
        case 'code': return <CodeBlock code={block.text} lang={block.lang} />;
        case 'figure': return <Figure block={block} onZoom={onZoom} reduce={reduce} scroll={scroll} />;
        case 'callout': return <Callout block={block} />;
        case 'term': return <Term block={block} />;
        case 'steps': return <Steps block={block} reduce={reduce} scroll={scroll} />;
        case 'stats': return <Stats block={block} reduce={reduce} scroll={scroll} />;
        case 'table': return <DataTable block={block} />;
        case 'quote': return <Pullquote block={block} />;
        case 'video': return <VideoBlock block={block} />;
        case 'check': return <CheckBlock block={block} />;
        case 'h3': return <h4 className="text-lg font-semibold text-white mt-6 mb-2">{block.text}</h4>;
        case 'ul': return (
            <ul className="my-4 space-y-2">
                {block.items.map((it, i) => (
                    <motion.li key={i} className="flex gap-3 text-[1.08rem] font-medium text-slate-100 leading-relaxed" {...mp(reduce, scroll, { opacity: 0, x: -14 }, delay + i * 0.12, 0.4)}><span className="mt-2.5 w-2 h-2 rounded-full bg-primary-400 flex-shrink-0" /><span><Inline text={it} /></span></motion.li>
                ))}
            </ul>
        );
        case 'ol': return (
            <ol className="my-4 space-y-2">
                {block.items.map((it, i) => (
                    <motion.li key={i} className="flex gap-3 text-[1.08rem] font-medium text-slate-100 leading-relaxed" {...mp(reduce, scroll, { opacity: 0, x: -14 }, delay + i * 0.12, 0.4)}><span className="w-7 h-7 rounded-full bg-primary-500/20 text-primary-300 text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span><span><Inline text={it} /></span></motion.li>
                ))}
            </ol>
        );
        default: return <Lines text={block.text} reduce={reduce} scroll={scroll} delay={delay} className="text-[1.12rem] leading-8 font-medium text-slate-100 my-4" />;
    }
}

export function Lightbox({ item, onClose }) {
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

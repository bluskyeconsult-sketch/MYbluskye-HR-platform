// src/components/RichContent.jsx
//
// NEW (2026-10-11): scroll-style reader for long text that uses the rich lesson markup
// (callouts, steps, stats, term cards, pictures, tables, quick-check questions...).
// Used for articles, book chapters and HR tool output. Blocks fade up as they scroll into
// view; pictures open in a lightbox; code has a Copy button. Respects "reduce motion".

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { parseBlocks } from '../lib/lessonChunker';
import { Block, Inline, Lightbox, Reveal, mp } from './RichBlocks';

export function slugify(text) {
    return String(text).toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
}

// A thin bar fixed to the bottom of the screen that fills as the reader moves through the content.
export function ReadingProgress({ targetRef }) {
    const barRef = useRef(null);
    const wrapRef = useRef(null);
    useEffect(() => {
        let raf = 0;
        const update = () => {
            raf = 0;
            const el = targetRef?.current;
            if (!el || !barRef.current || !wrapRef.current) return;
            const r = el.getBoundingClientRect();
            const vh = window.innerHeight || 800;
            const long = r.height > vh * 1.5;
            const total = Math.max(1, r.height - vh * 0.6);
            const p = Math.min(1, Math.max(0, -r.top / total));
            wrapRef.current.style.opacity = long && r.top < vh * 0.5 && r.bottom > 0 ? '1' : '0';
            barRef.current.style.transform = `scaleX(${p})`;
        };
        const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (raf) cancelAnimationFrame(raf); };
    }, [targetRef]);
    return (
        <div ref={wrapRef} className="pointer-events-none fixed inset-x-0 bottom-0 z-40 h-1 bg-slate-800/60 transition-opacity duration-300" style={{ opacity: 0 }} aria-hidden="true">
            <div ref={barRef} className="h-full origin-left bg-gradient-to-r from-primary-500 to-primary-300" style={{ transform: 'scaleX(0)' }} />
        </div>
    );
}

const SELF_ANIMATED = new Set(['figure', 'steps', 'stats']);

export default function RichContent({ content, dropCap = true }) {
    const reduce = useReducedMotion();
    const blocks = useMemo(() => parseBlocks(content), [content]);
    const [zoomed, setZoomed] = useState(null);
    let firstPara = true;

    return (
        <div className="max-w-3xl">
            {blocks.map((b, i) => {
                if (b.type === 'h2') {
                    return (
                        <motion.h2
                            key={i}
                            id={slugify(b.text)}
                            className="scroll-mt-24 mt-10 mb-3 text-2xl sm:text-3xl font-bold text-white leading-snug"
                            {...mp(reduce, true, { opacity: 0, y: 14 }, 0, 0.5)}
                        >
                            <span className="mr-3 inline-block h-6 w-1.5 -mb-0.5 rounded-full bg-primary-500" aria-hidden="true" />
                            {b.text}
                        </motion.h2>
                    );
                }
                if (b.type === 'h3') {
                    return (
                        <motion.h3 key={i} id={slugify(b.text)} className="scroll-mt-24 mt-7 mb-2 text-xl font-semibold text-white" {...mp(reduce, true, { opacity: 0, y: 10 }, 0, 0.4)}>
                            {b.text}
                        </motion.h3>
                    );
                }
                if (b.type === 'p' && dropCap && firstPara) {
                    firstPara = false;
                    return (
                        <Reveal key={i} reduce={reduce}>
                            <p className="my-4 text-[1.12rem] leading-8 font-medium text-slate-100 first-letter:float-left first-letter:mr-2 first-letter:text-5xl first-letter:font-bold first-letter:leading-none first-letter:text-primary-400">
                                <Inline text={b.text} />
                            </p>
                        </Reveal>
                    );
                }
                if (b.type === 'p') firstPara = false;
                if (SELF_ANIMATED.has(b.type)) {
                    return <Block key={i} block={b} onZoom={setZoomed} reduce={reduce} scroll />;
                }
                return (
                    <Reveal key={i} reduce={reduce}>
                        <Block block={b} onZoom={setZoomed} reduce={reduce} scroll />
                    </Reveal>
                );
            })}
            <AnimatePresence>{zoomed && <Lightbox item={zoomed} onClose={() => setZoomed(null)} />}</AnimatePresence>
        </div>
    );
}

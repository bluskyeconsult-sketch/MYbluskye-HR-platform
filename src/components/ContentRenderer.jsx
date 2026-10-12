// src/components/ContentRenderer.jsx
//
// UPGRADED (2026-10-11): the one place long-form content is shown (articles, HR tool
// output, editor preview, book chapters). Two paths, same look and animation:
//   - Content that uses the rich lesson markup (callouts, steps, stats, pictures, quick
//     checks, see Lesson-Design-Guide.md) is shown by RichContent.
//   - Ordinary markdown keeps the existing ReactMarkdown rendering, now with
//     scroll-into-view animation, a Copy button on code, click-to-enlarge pictures
//     and a reading-progress bar.
// A table of contents still appears for longer pieces. Nothing about stored content changes.

import { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { List, ChevronDown, ChevronUp } from 'lucide-react';
import RichContent, { ReadingProgress } from './RichContent';
import { CodeBlock, Lightbox, mp } from './RichBlocks';
import { hasRichMarkup } from '../lib/lessonChunker';

function slugify(text) {
    return String(text).toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
}

// Extracts h2/h3 headings from raw markdown text for the table of
// contents, without needing a second markdown parse pass.
function extractHeadings(content) {
    if (!content) return [];
    const lines = content.split('\n');
    const headings = [];
    for (const line of lines) {
        const h2Match = line.match(/^##\s+(.+)/);
        const h3Match = line.match(/^###\s+(.+)/);
        if (h2Match) headings.push({ level: 2, text: h2Match[1].trim(), id: slugify(h2Match[1]) });
        else if (h3Match) headings.push({ level: 3, text: h3Match[1].trim(), id: slugify(h3Match[1]) });
    }
    return headings;
}

export default function ContentRenderer({ content, showTableOfContents = true }) {
    const [tocOpen, setTocOpen] = useState(true);
    const [zoomed, setZoomed] = useState(null);
    const reduce = useReducedMotion();
    const rootRef = useRef(null);
    const headings = useMemo(() => extractHeadings(content), [content]);
    const rich = useMemo(() => hasRichMarkup(content), [content]);
    const showToc = showTableOfContents && headings.length >= 3;
    let paragraphIndex = 0;

    if (!content) return null;

    // Scroll-into-view reveal shared by the markdown elements below.
    const rv = mp(reduce, true, { opacity: 0, y: 16 }, 0, 0.5);

    return (
        <div className="content-renderer" ref={rootRef}>
            <ReadingProgress targetRef={rootRef} />
            {showToc && (
                <motion.div
                    className="mb-8 bg-slate-900/50 border border-slate-800 rounded-xl p-4 sm:p-5 max-w-3xl"
                    initial={reduce ? false : { opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <button
                        onClick={() => setTocOpen(!tocOpen)}
                        className="flex items-center justify-between w-full text-left"
                    >
                        <span className="flex items-center gap-2 text-white font-semibold text-sm sm:text-base">
                            <List className="w-4 h-4 text-primary-400" /> In this article
                        </span>
                        {tocOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>
                    <AnimatePresence initial={false}>
                        {tocOpen && (
                            <motion.ul
                                key="toc"
                                className="mt-3 space-y-1.5 overflow-hidden"
                                initial={reduce ? false : { height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                            >
                                {headings.map((h, i) => (
                                    <li key={i} className={h.level === 3 ? 'ml-4' : ''}>
                                        <a
                                            href={`#${h.id}`}
                                            onClick={(e) => {
                                                const el = document.getElementById(h.id);
                                                if (el) { e.preventDefault(); el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }
                                            }}
                                            className="text-slate-400 hover:text-primary-400 text-sm transition-colors"
                                        >
                                            {h.text}
                                        </a>
                                    </li>
                                ))}
                            </motion.ul>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}

            {rich ? (
                <RichContent content={content} />
            ) : (
            <div className="text-slate-300 leading-relaxed space-y-6 markdown-content">
                <ReactMarkdown
                    components={{
                        h1: ({ children }) => (
                            <motion.h1 {...rv} className="text-3xl sm:text-4xl font-bold text-white mt-10 mb-4 leading-tight">
                                {children}
                            </motion.h1>
                        ),
                        h2: ({ children }) => (
                            <motion.h2
                                {...rv}
                                id={slugify(String(children))}
                                className="text-2xl sm:text-3xl font-bold text-white mt-8 mb-3 leading-snug scroll-mt-24"
                            >
                                <span className="mr-3 inline-block h-6 w-1.5 -mb-0.5 rounded-full bg-primary-500" aria-hidden="true" />
                                {children}
                            </motion.h2>
                        ),
                        h3: ({ children }) => (
                            <motion.h3
                                {...rv}
                                id={slugify(String(children))}
                                className="text-xl sm:text-2xl font-semibold text-white mt-6 mb-2 leading-snug scroll-mt-24"
                            >
                                {children}
                            </motion.h3>
                        ),
                        h4: ({ children }) => (
                            <h4 className="text-lg sm:text-xl font-semibold text-white mt-4 mb-2 leading-snug">
                                {children}
                            </h4>
                        ),
                        // The very first paragraph gets a drop cap; every later one is plain.
                        p: ({ children }) => {
                            const isFirst = paragraphIndex === 0;
                            paragraphIndex++;
                            if (isFirst) {
                                return (
                                    <motion.p {...rv} className="text-base sm:text-lg text-slate-300 leading-relaxed mb-5 max-w-3xl first-letter:text-5xl first-letter:font-bold first-letter:text-primary-400 first-letter:mr-1 first-letter:float-left first-letter:leading-none">
                                        {children}
                                    </motion.p>
                                );
                            }
                            return (
                                <motion.p {...rv} className="text-base sm:text-lg text-slate-300 leading-relaxed mb-5 max-w-3xl">
                                    {children}
                                </motion.p>
                            );
                        },
                        ul: ({ children }) => (
                            <motion.ul {...rv} className="text-base sm:text-lg text-slate-300 leading-relaxed mb-5 space-y-2 list-disc pl-6 max-w-3xl marker:text-primary-400">
                                {children}
                            </motion.ul>
                        ),
                        ol: ({ children }) => (
                            <motion.ol {...rv} className="text-base sm:text-lg text-slate-300 leading-relaxed mb-5 space-y-2 list-decimal pl-6 max-w-3xl marker:text-primary-400 marker:font-semibold">
                                {children}
                            </motion.ol>
                        ),
                        li: ({ children }) => (
                            <li className="mb-1.5 leading-relaxed">
                                {children}
                            </li>
                        ),
                        blockquote: ({ children }) => (
                            <motion.blockquote {...rv} className="border-l-4 border-primary-500 bg-primary-500/5 rounded-r-xl pl-4 sm:pl-6 pr-4 py-2 my-6 text-slate-300 text-base sm:text-lg italic max-w-3xl">
                                {children}
                            </motion.blockquote>
                        ),
                        code: ({ children, inline, className }) => {
                            // A bullet list with leading whitespace is misparsed by react-markdown
                            // as an indented code block (the "odd looking font" bug). Rescue it
                            // into a real list.
                            const text = Array.isArray(children) ? children.join('') : children;
                            if (!inline && typeof text === 'string') {
                                const lines = text.trim().split('\n').filter(l => l.trim().length > 0);
                                if (lines.length > 0 && lines.every(l => l.trim().startsWith('- '))) {
                                    return (
                                        <ul className="list-disc list-outside ml-5 space-y-1.5 text-slate-300 mb-5">
                                            {lines.map((line, i) => (
                                                <li key={i}>{line.trim().replace(/^- /, '')}</li>
                                            ))}
                                        </ul>
                                    );
                                }
                            }
                            const isBlock = inline === false || /language-/.test(className || '') || (typeof text === 'string' && text.includes('\n'));
                            if (isBlock && typeof text === 'string') {
                                const lang = ((className || '').match(/language-(\w+)/) || [])[1];
                                return <CodeBlock code={text.replace(/\n$/, '')} lang={lang ? lang.charAt(0).toUpperCase() + lang.slice(1) : 'Code'} />;
                            }
                            return (
                                <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-primary-400 font-mono">
                                    {children}
                                </code>
                            );
                        },
                        pre: ({ children }) => <>{children}</>,
                        img: ({ src, alt }) => (
                            <motion.span {...mp(reduce, true, { opacity: 0, scale: 0.97, y: 14 }, 0, 0.55)} className="block my-6">
                                <button
                                    type="button"
                                    onClick={() => setZoomed({ src, alt })}
                                    className="group block w-full overflow-hidden rounded-2xl border border-slate-700 shadow-xl shadow-black/30 cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
                                    aria-label={`Enlarge picture${alt ? ': ' + alt : ''}`}
                                >
                                    <img
                                        src={src}
                                        alt={alt || ''}
                                        className="max-w-full w-full h-auto transition duration-700 group-hover:scale-[1.02]"
                                        loading="lazy"
                                    />
                                </button>
                                {alt ? <span className="mt-2 block text-center text-sm italic text-slate-400">{alt}</span> : null}
                            </motion.span>
                        ),
                        a: ({ href, children }) => (
                            <a
                                href={href}
                                target={href?.startsWith('http') ? '_blank' : '_self'}
                                rel={href?.startsWith('http') ? 'noopener noreferrer' : ''}
                                className="text-primary-400 hover:text-primary-300 underline underline-offset-2 transition-colors"
                            >
                                {children}
                            </a>
                        ),
                    }}
                >
                    {content}
                </ReactMarkdown>
            </div>
            )}
            <AnimatePresence>{zoomed && <Lightbox item={zoomed} onClose={() => setZoomed(null)} />}</AnimatePresence>
        </div>
    );
}

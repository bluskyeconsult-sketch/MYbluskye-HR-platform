// src/components/ContentRenderer.jsx
//
// NEW (2026-09-14): extracted from ArticleDetail.jsx's already
// well-built ReactMarkdown component configuration, so the same
// professional formatting genuinely applies everywhere user-facing
// long-form content is shown - not just articles. Confirmed via direct
// review that CourseDetail.jsx was rendering lesson content as raw
// whitespace-pre-wrap text with zero formatting at all - a real
// inconsistency this closes, since a markdown renderer handles plain
// prose gracefully too (paragraphs render correctly even with no
// markdown syntax present).
//
// Adds two genuine new touches beyond what existed before: a
// drop-cap-style opening paragraph (a real, common editorial technique
// signaling "professional publication," not just default browser
// text), and a lightweight, auto-generated table of contents for
// longer pieces, built from the actual h2/h3 headings present in the
// content - not shown at all for short content where it wouldn't add
// value.

import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { List, ChevronDown, ChevronUp } from 'lucide-react';

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
    const headings = useMemo(() => extractHeadings(content), [content]);
    const showToc = showTableOfContents && headings.length >= 3;
    let paragraphIndex = 0;

    if (!content) return null;

    return (
        <div className="content-renderer">
            {showToc && (
                <div className="mb-8 bg-slate-900/50 border border-slate-800 rounded-xl p-4 sm:p-5 max-w-3xl">
                    <button
                        onClick={() => setTocOpen(!tocOpen)}
                        className="flex items-center justify-between w-full text-left"
                    >
                        <span className="flex items-center gap-2 text-white font-semibold text-sm sm:text-base">
                            <List className="w-4 h-4 text-primary-400" /> In this article
                        </span>
                        {tocOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>
                    {tocOpen && (
                        <ul className="mt-3 space-y-1.5">
                            {headings.map((h, i) => (
                                <li key={i} className={h.level === 3 ? 'ml-4' : ''}>
                                    <a
                                        href={`#${h.id}`}
                                        className="text-slate-400 hover:text-primary-400 text-sm transition-colors"
                                    >
                                        {h.text}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            <div className="text-slate-300 leading-relaxed space-y-6 markdown-content">
                <ReactMarkdown
                    components={{
                        h1: ({ children }) => (
                            <h1 className="text-3xl sm:text-4xl font-bold text-white mt-10 mb-4 leading-tight">
                                {children}
                            </h1>
                        ),
                        h2: ({ children }) => (
                            <h2
                                id={slugify(String(children))}
                                className="text-2xl sm:text-3xl font-bold text-white mt-8 mb-3 leading-snug scroll-mt-24"
                            >
                                {children}
                            </h2>
                        ),
                        h3: ({ children }) => (
                            <h3
                                id={slugify(String(children))}
                                className="text-xl sm:text-2xl font-semibold text-white mt-6 mb-2 leading-snug scroll-mt-24"
                            >
                                {children}
                            </h3>
                        ),
                        h4: ({ children }) => (
                            <h4 className="text-lg sm:text-xl font-semibold text-white mt-4 mb-2 leading-snug">
                                {children}
                            </h4>
                        ),
                        // NEW: the very first paragraph of a piece gets
                        // a genuine editorial drop-cap treatment - a
                        // real, common professional-publication
                        // technique, not just default text styling.
                        // Every paragraph after the first renders
                        // exactly as before.
                        p: ({ children }) => {
                            const isFirst = paragraphIndex === 0;
                            paragraphIndex++;
                            if (isFirst) {
                                return (
                                    <p className="text-base sm:text-lg text-slate-300 leading-relaxed mb-5 max-w-3xl first-letter:text-5xl first-letter:font-bold first-letter:text-primary-400 first-letter:mr-1 first-letter:float-left first-letter:leading-none">
                                        {children}
                                    </p>
                                );
                            }
                            return (
                                <p className="text-base sm:text-lg text-slate-300 leading-relaxed mb-5 max-w-3xl">
                                    {children}
                                </p>
                            );
                        },
                        ul: ({ children }) => (
                            <ul className="text-base sm:text-lg text-slate-300 leading-relaxed mb-5 space-y-2 list-disc pl-6 max-w-3xl">
                                {children}
                            </ul>
                        ),
                        ol: ({ children }) => (
                            <ol className="text-base sm:text-lg text-slate-300 leading-relaxed mb-5 space-y-2 list-decimal pl-6 max-w-3xl">
                                {children}
                            </ol>
                        ),
                        li: ({ children }) => (
                            <li className="mb-1.5 leading-relaxed">
                                {children}
                            </li>
                        ),
                        blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-primary-500 pl-4 sm:pl-6 py-1 my-6 text-slate-300 text-base sm:text-lg italic max-w-3xl">
                                {children}
                            </blockquote>
                        ),
                        code: ({ children, inline }) => (
                            inline ? (
                                <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-primary-400 font-mono">
                                    {children}
                                </code>
                            ) : (
                                <code className="block bg-slate-800 p-4 rounded-lg text-sm text-slate-300 font-mono overflow-x-auto">
                                    {children}
                                </code>
                            )
                        ),
                        img: ({ src, alt }) => (
                            <img
                                src={src}
                                alt={alt || ''}
                                className="rounded-xl max-w-full h-auto my-6"
                                loading="lazy"
                            />
                        ),
                        a: ({ href, children }) => (
                            <a
                                href={href}
                                target={href?.startsWith('http') ? '_blank' : '_self'}
                                rel={href?.startsWith('http') ? 'noopener noreferrer' : ''}
                                className="text-primary-400 hover:text-primary-300 underline transition-colors"
                            >
                                {children}
                            </a>
                        ),
                    }}
                >
                    {content}
                </ReactMarkdown>
            </div>
        </div>
    );
}

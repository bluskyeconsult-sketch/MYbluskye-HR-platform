// src/components/PageEdgeBanner.jsx
// REDESIGNED (2026-09-06): previously sat inline at the top of the page,
// pushing all real content below it down on arrival - explicitly asked
// to be moved to a persistent right-side card instead, visible without
// affecting the main content's layout at all. Used identically across
// 8 pages (ArticlesPage, AssessmentsPage, BlogPage, BooksPage,
// CoursesPage, HRToolsPage, HireVirtualAssistant, JobsPage,
// VerifiedEmployersPage) - fixing this one shared component updates
// every one of them at once.
//
// Design choices:
// - Fixed positioning pulls it completely out of document flow, so it
//   can never push anything else down, regardless of its own content
//   length.
// - Dismissible per-session (not permanently, via localStorage) since
//   this is a per-page hint, not a one-time notice - a person visiting
//   a different page should still see that page's own hint.
// - Collapses to a small floating icon on narrow/mobile viewports,
//   matching the existing floating-icon pattern already used elsewhere
//   on this site, rather than overlapping real content on a small
//   screen.

import { useState } from 'react';
import { Sparkles, X, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PageEdgeBanner({ children, icon: Icon = Sparkles }) {
    const [dismissed, setDismissed] = useState(false);
    const [expanded, setExpanded] = useState(true);

    if (dismissed) return null;

    return (
        <>
            {/* Desktop / tablet: persistent right-side card, fixed so it
                never affects page layout or scroll position. */}
            <div className="hidden md:block fixed top-24 right-4 z-40 w-72 lg:w-80">
                <AnimatePresence>
                    {expanded ? (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                            className="px-4 py-3 bg-primary-500/10 border border-primary-500/20 rounded-xl shadow-lg backdrop-blur-sm relative"
                        >
                            <button
                                onClick={() => setDismissed(true)}
                                className="absolute top-2 right-2 text-slate-500 hover:text-white transition"
                                aria-label="Dismiss"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                            <div className="flex items-start gap-3 pr-4">
                                <Icon className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-slate-300">{children}</p>
                            </div>
                            <button
                                onClick={() => setExpanded(false)}
                                className="text-xs text-slate-500 hover:text-slate-300 mt-2 transition"
                            >
                                Minimize
                            </button>
                        </motion.div>
                    ) : (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={() => setExpanded(true)}
                            className="w-11 h-11 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center shadow-lg ml-auto"
                            aria-label="Show page tip"
                        >
                            <Icon className="w-5 h-5 text-primary-400" />
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>

            {/* Mobile: collapses to a small floating icon rather than a
                fixed card, which would overlap too much of a narrow
                screen - matches this site's existing floating-icon
                pattern used elsewhere. */}
            <div className="md:hidden fixed bottom-24 right-4 z-40">
                <AnimatePresence>
                    {expanded ? (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="w-64 px-4 py-3 bg-primary-500/10 border border-primary-500/20 rounded-xl shadow-lg backdrop-blur-sm relative mb-2"
                        >
                            <button
                                onClick={() => setDismissed(true)}
                                className="absolute top-2 right-2 text-slate-500 hover:text-white transition"
                                aria-label="Dismiss"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                            <div className="flex items-start gap-3 pr-4">
                                <Icon className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-slate-300">{children}</p>
                            </div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="w-11 h-11 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center shadow-lg ml-auto"
                    aria-label="Toggle page tip"
                >
                    <Lightbulb className="w-5 h-5 text-primary-400" />
                </button>
            </div>
        </>
    );
}

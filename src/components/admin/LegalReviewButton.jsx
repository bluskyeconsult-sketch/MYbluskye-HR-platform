// src/components/admin/LegalReviewButton.jsx
//
// NEW (2026-10-18): "Ask a Law Expert" - an admin-only legal review that drops in next to any place the
// admin generates or edits content (courses, lessons, articles, assessments, HR tools, virtual
// assistants, newsletters). It sends the text to the server action 'legal-review', which reviews it the
// way an international employment/HR lawyer would and returns findings with suggested wording.
//
// It is an AI review to support the admin, not legal advice, and the panel says so. Nothing is changed
// automatically: the admin copies any suggested wording they agree with.
//
// Usage:
//   <LegalReviewButton content={lessonText} contentType="course lesson" context="Audience: new line managers in the UK" />
//   (content may also be a function that returns the text, so it is read at the moment of the click)

import { useState } from 'react';
import { Scale, Loader2, X, Copy, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { authenticatedFetch } from '../../lib/authFetch';

const PLACES = ['UK', 'EU', 'US', 'Canada', 'Australia', 'Nigeria', 'Ireland', 'UAE', 'India', 'South Africa', 'Global principles'];
const STORE_KEY = 'legal_review_places';

function loadPlaces() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
        if (Array.isArray(saved) && saved.length) return saved.filter(p => PLACES.includes(p));
    } catch (e) { /* storage may be unavailable */ }
    return ['UK', 'Global principles'];
}

const RISK_STYLE = {
    low: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    medium: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    high: 'bg-red-500/15 text-red-300 border-red-500/30',
    unknown: 'bg-slate-500/15 text-slate-300 border-slate-500/30'
};

export default function LegalReviewButton({ content, contentType = 'content', context = '', className = '', label = 'Ask a Law Expert' }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [places, setPlaces] = useState(loadPlaces);

    function togglePlace(p) {
        setPlaces(prev => {
            const next = prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p];
            try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch (e) { /* ignore */ }
            return next;
        });
    }

    function getText() {
        const raw = typeof content === 'function' ? content() : content;
        return typeof raw === 'string' ? raw : '';
    }

    async function runReview() {
        const text = getText();
        if (!text || text.trim().length < 20) {
            toast.error('There is not enough content to review yet.');
            return;
        }
        setOpen(true);
        setLoading(true);
        setResult(null);
        try {
            const data = await authenticatedFetch('legal-review', {
                content: text,
                contentType,
                context,
                jurisdictions: places.length ? places : ['Global principles']
            });
            setResult(data);
        } catch (err) {
            toast.error(err.message || 'The legal review could not be completed.');
            setOpen(false);
        } finally {
            setLoading(false);
        }
    }

    function copy(text) {
        try {
            navigator.clipboard.writeText(text);
            toast.success('Copied');
        } catch (e) {
            toast.error('Could not copy. Select the text and copy it manually.');
        }
    }

    const review = result?.review;

    return (
        <>
            <button
                type="button"
                onClick={runReview}
                disabled={loading}
                title="AI legal review of this content - not legal advice"
                className={`text-xs px-2.5 py-1.5 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition disabled:opacity-50 inline-flex items-center gap-1.5 ${className}`}
            >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Scale className="w-3 h-3 text-primary-400" />}
                {loading ? 'Reviewing...' : label}
            </button>

            {open && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 p-3 sm:p-6 overflow-y-auto" onClick={() => !loading && setOpen(false)}>
                    <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl my-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-700">
                            <div className="flex items-center gap-2 min-w-0">
                                <Scale className="w-5 h-5 text-primary-400 shrink-0" />
                                <div className="min-w-0">
                                    <h3 className="text-white font-semibold leading-tight">Legal review</h3>
                                    <p className="text-slate-500 text-xs truncate">{contentType}</p>
                                </div>
                            </div>
                            <button type="button" onClick={() => setOpen(false)} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800" aria-label="Close">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="px-5 py-4 space-y-4">
                            <div>
                                <p className="text-slate-400 text-xs mb-2">Countries and regions to review against</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {PLACES.map(p => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => togglePlace(p)}
                                            className={`text-xs px-2.5 py-1 rounded-full border transition ${places.includes(p) ? 'bg-primary-600/30 border-primary-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'}`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={runReview}
                                    disabled={loading}
                                    className="mt-3 text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition disabled:opacity-50 inline-flex items-center gap-1.5"
                                >
                                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Scale className="w-3 h-3" />}
                                    {loading ? 'Reviewing...' : (review ? 'Review again' : 'Run review')}
                                </button>
                            </div>

                            {loading && (
                                <div className="flex items-center gap-2 text-slate-300 text-sm py-6 justify-center">
                                    <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
                                    Reading the content like an employment lawyer. This can take up to a minute.
                                </div>
                            )}

                            {!loading && review && (
                                <div className="space-y-4">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className={`text-xs px-3 py-1 rounded-full border font-semibold uppercase tracking-wide ${RISK_STYLE[review.overall_risk] || RISK_STYLE.unknown}`}>
                                            {review.overall_risk === 'unknown' ? 'Risk not rated' : `${review.overall_risk} risk`}
                                        </span>
                                        <span className="text-slate-500 text-xs">
                                            Reviewed for: {(result.jurisdictions || []).join(', ') || 'global principles'}
                                            {result.truncated ? ' (only the first part of a long text was reviewed)' : ''}
                                        </span>
                                    </div>

                                    {review.summary && <p className="text-slate-200 text-sm leading-relaxed">{review.summary}</p>}

                                    {review.issues.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="text-white text-sm font-semibold flex items-center gap-1.5">
                                                <AlertTriangle className="w-4 h-4 text-amber-400" /> Points to adjust ({review.issues.length})
                                            </h4>
                                            {review.issues.map((it, i) => (
                                                <div key={i} className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 space-y-2">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase font-semibold ${RISK_STYLE[it.severity] || RISK_STYLE.unknown}`}>{it.severity}</span>
                                                        {it.law_area && <span className="text-slate-400 text-xs">{it.law_area}</span>}
                                                        {it.jurisdictions.length > 0 && <span className="text-slate-500 text-xs">· {it.jurisdictions.join(', ')}</span>}
                                                    </div>
                                                    {it.quote && <p className="text-slate-300 text-xs italic border-l-2 border-slate-600 pl-2">"{it.quote}"</p>}
                                                    <p className="text-slate-200 text-sm">{it.problem}</p>
                                                    {it.suggested_wording && (
                                                        <div className="bg-slate-900 border border-slate-700 rounded-lg p-2.5">
                                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                                <span className="text-emerald-400 text-xs font-medium">Suggested wording</span>
                                                                <button type="button" onClick={() => copy(it.suggested_wording)} className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1">
                                                                    <Copy className="w-3 h-3" /> Copy
                                                                </button>
                                                            </div>
                                                            <p className="text-slate-200 text-sm">{it.suggested_wording}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {review.jurisdiction_notes.length > 0 && (
                                        <div>
                                            <h4 className="text-white text-sm font-semibold mb-1.5">Where the law differs</h4>
                                            <ul className="space-y-1.5">
                                                {review.jurisdiction_notes.map((n, i) => (
                                                    <li key={i} className="text-sm text-slate-300"><span className="text-white font-medium">{n.jurisdiction}:</span> {n.note}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {review.missing_notices.length > 0 && (
                                        <div>
                                            <h4 className="text-white text-sm font-semibold mb-1.5">Notices or caveats to add</h4>
                                            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-300">
                                                {review.missing_notices.map((m, i) => <li key={i}>{m}</li>)}
                                            </ul>
                                        </div>
                                    )}

                                    {review.verify_with_a_lawyer.length > 0 && (
                                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                                            <h4 className="text-amber-300 text-sm font-semibold mb-1.5 flex items-center gap-1.5">
                                                <ShieldAlert className="w-4 h-4" /> Confirm with a qualified lawyer
                                            </h4>
                                            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-300">
                                                {review.verify_with_a_lawyer.map((m, i) => <li key={i}>{m}</li>)}
                                            </ul>
                                        </div>
                                    )}

                                    {review.looks_sound.length > 0 && (
                                        <div>
                                            <h4 className="text-white text-sm font-semibold mb-1.5 flex items-center gap-1.5">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Looks sound
                                            </h4>
                                            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-300">
                                                {review.looks_sound.map((m, i) => <li key={i}>{m}</li>)}
                                            </ul>
                                        </div>
                                    )}

                                    <p className="text-slate-500 text-xs border-t border-slate-800 pt-3">
                                        AI review to support your own judgement. It is not legal advice, it can miss things or be out of date, and laws differ by country and change over time. Nothing has been changed in your content.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

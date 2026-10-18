// src/components/AiDisclaimer.jsx
//
// NEW (2026-10-18): the standard notice shown beside AI answers that members see (chat, HR tools,
// virtual assistants, Career Coach). The server also builds a silent legal self-review into those
// services (see LEGAL_SELF_REVIEW in api/index.js); this is the visible half. It is a separate element,
// not text added to the answer, so letters and documents stay clean to copy and send.
//
// Usage: <AiDisclaimer />   or   <AiDisclaimer compact />   (compact is a single short line)

import { Info } from 'lucide-react';

export const AI_DISCLAIMER_FULL =
    'This is an AI-generated response. It is built to follow the best rules and good practice for a reliable result, but it can contain errors or be out of date, and laws and workplace rules differ by country and change over time. It is not legal advice. Please use it with discretion and check anything important with a qualified professional before you act on it.';

export const AI_DISCLAIMER_SHORT =
    'AI-generated response. It aims to be reliable but can contain errors, and it is not legal advice. Please use it with discretion and check important points with a qualified professional.';

export default function AiDisclaimer({ compact = false, className = '' }) {
    return (
        <p className={`flex items-start gap-1.5 text-slate-500 ${compact ? 'text-[11px] leading-snug' : 'text-xs leading-relaxed'} ${className}`}>
            <Info className={`shrink-0 ${compact ? 'w-3 h-3 mt-px' : 'w-3.5 h-3.5 mt-0.5'}`} />
            <span>{compact ? AI_DISCLAIMER_SHORT : AI_DISCLAIMER_FULL}</span>
        </p>
    );
}

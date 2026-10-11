// src/pages/CareerCoachNoticePage.jsx
// NEW (2026-10-10): public Career Coach privacy notice and terms (content in
// src/services/careerCoachLegal.js). Public route: /career-coach-notice

import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { NOTICE_SECTIONS, NOTICE_UPDATED, fillNotice } from '../services/careerCoachLegal';

export default function CareerCoachNoticePage() {
    return (
        <div className="min-h-screen bg-slate-950 py-12 px-4">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-3 mb-2">
                    <ShieldCheck className="w-7 h-7 text-emerald-400" />
                    <h1 className="text-3xl font-bold text-white">Career Coach: privacy notice and terms</h1>
                </div>
                <p className="text-slate-400 text-sm mb-8">Last updated {NOTICE_UPDATED}. <Link to="/career-coach" className="text-primary-400 hover:underline">Back to Career Coach</Link></p>
                <nav className="mb-8 flex flex-wrap gap-2" aria-label="Sections">
                    {NOTICE_SECTIONS.map(s => <a key={s.id} href={`#${s.id}`} className="text-xs px-3 py-1 rounded-full border border-slate-700 text-slate-300 hover:text-white">{s.title.replace(/^\d+\.\s*/, '')}</a>)}
                </nav>
                <div className="space-y-8">
                    {NOTICE_SECTIONS.map(s => (
                        <section key={s.id} id={s.id}>
                            <h2 className="text-xl font-semibold text-white mb-2">{s.title}</h2>
                            <div className="space-y-3 text-slate-300 leading-relaxed">{s.body.map((p, i) => <p key={i}>{fillNotice(p)}</p>)}</div>
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
}

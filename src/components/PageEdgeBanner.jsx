// src/components/PageEdgeBanner.jsx
// NEW (2026-08-27) — a small, reusable, consistently-styled callout
// giving visitors and regular users a genuine, specific hint about what
// makes this particular page's version of a feature different, right
// where they land on it. Deliberately NOT generic marketing copy - every
// instance of this component states something real and confirmed about
// this platform, not a decorative tagline.

import { Sparkles } from 'lucide-react';

export default function PageEdgeBanner({ children, icon: Icon = Sparkles }) {
    return (
        <div className="max-w-3xl mx-auto mb-8 px-4 py-3 bg-primary-500/10 border border-primary-500/20 rounded-xl flex items-start gap-3">
            <Icon className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-slate-300">{children}</p>
        </div>
    );
}

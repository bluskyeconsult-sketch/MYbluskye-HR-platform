// src/components/ComingSoonBanner.jsx
// Creative "Coming Soon" banner for empty sections

import { Link } from 'react-router-dom';
import { Sparkles, Bell, ArrowRight } from 'lucide-react';

export default function ComingSoonBanner({ feature, expectedDate, description }) {
    return (
        <div className="bg-gradient-to-r from-primary-900/20 via-slate-900 to-primary-900/20 border border-primary-500/20 rounded-xl p-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/20 border border-primary-500/30 mb-4">
                <Sparkles className="w-3 h-3 text-primary-400" />
                <span className="text-primary-400 text-xs font-semibold">COMING SOON</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{feature}</h3>
            <p className="text-slate-400 text-sm mb-4">{description}</p>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mb-4">
                <Bell className="w-3 h-3" />
                <span>Expected: {expectedDate}</span>
            </div>
            <Link to="/tester-register" className="inline-flex items-center gap-1 text-primary-400 text-sm hover:gap-2 transition-all">
                Get notified when ready <ArrowRight className="w-3 h-3" />
            </Link>
        </div>
    );
}

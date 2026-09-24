// src/components/AffiliatePromoBanner.jsx
//
// NEW (2026-09-24): simple, dismissible banner promoting the already
// fully-built affiliate program - genuinely just needs visibility,
// since it was sitting unused. Respects dismissal via localStorage
// (7-day cooldown), same proven pattern as other subtle prompts on
// this platform.

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Gift, X } from 'lucide-react';

const STORAGE_KEY = 'affiliate_promo_banner_dismissed_at';
const COOLDOWN_DAYS = 7;

export default function AffiliatePromoBanner() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        try {
            const dismissedAt = localStorage.getItem(STORAGE_KEY);
            if (dismissedAt) {
                const daysSince = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
                if (daysSince < COOLDOWN_DAYS) return;
            }
            setVisible(true);
        } catch {
            setVisible(true);
        }
    }, []);

    function handleDismiss() {
        setVisible(false);
        try {
            localStorage.setItem(STORAGE_KEY, String(Date.now()));
        } catch {
            // Non-critical if this doesn't persist.
        }
    }

    if (!visible) return null;

    return (
        <div className="bg-gradient-to-r from-primary-600/20 to-emerald-600/20 border border-primary-500/30 rounded-xl p-4 mb-6 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                    <Gift className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                    <p className="text-white font-medium text-sm">Know someone job hunting?</p>
                    <p className="text-slate-400 text-xs">Invite them to ODUSBABA and earn on every successful referral.</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Link
                    to="/affiliate"
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition text-sm font-medium whitespace-nowrap"
                >
                    Start Referring
                </Link>
                <button onClick={handleDismiss} className="text-slate-500 hover:text-white transition" aria-label="Dismiss">
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

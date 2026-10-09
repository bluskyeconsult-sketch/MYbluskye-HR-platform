// src/components/JobAlertsBanner.jsx
//
// NEW (2026-09-24): simple, dismissible banner promoting job alerts -
// genuinely fully working now (creation via JobAlertsPage.jsx,
// dispatch via the real cron), just needed real visibility on the one
// page where it's most directly relevant. Same proven dismissal
// pattern (localStorage, real cooldown) as other subtle prompts here.

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, X } from 'lucide-react';

const STORAGE_KEY = 'job_alerts_banner_dismissed_at';
const COOLDOWN_DAYS = 14;

export default function JobAlertsBanner() {
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

    // COMPACTED (2026-10-09): was a two-line box; now a single slim strip.
    return (
        <div className="mt-2 px-3 py-1.5 bg-emerald-900/20 border border-emerald-500/30 rounded-lg max-w-2xl mx-auto flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-xs sm:text-sm text-white min-w-0">
                <Bell className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="truncate"><span className="font-medium">Never miss a match</span>
                <span className="hidden sm:inline text-slate-400"> · free alerts straight to your inbox</span></span>
            </p>
            <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                    to="/job-alerts"
                    className="px-2.5 py-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-500 transition text-xs font-medium whitespace-nowrap"
                >
                    Set Up Alert
                </Link>
                <button onClick={handleDismiss} className="text-slate-500 hover:text-white transition" aria-label="Dismiss">
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

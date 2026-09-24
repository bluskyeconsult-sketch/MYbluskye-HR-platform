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

    return (
        <div className="mt-3 sm:mt-4 p-3 bg-gradient-to-r from-emerald-900/20 to-primary-900/20 border border-emerald-500/30 rounded-xl max-w-2xl mx-auto flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 flex-shrink-0" />
                <div>
                    <p className="text-white text-xs sm:text-sm font-medium">Never miss a match</p>
                    <p className="text-slate-400 text-[10px] sm:text-xs">Set a free alert and new jobs like these come straight to your inbox</p>
                </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                    to="/job-alerts"
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition text-xs sm:text-sm font-medium whitespace-nowrap"
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

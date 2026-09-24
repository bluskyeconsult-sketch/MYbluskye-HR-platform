// src/components/VisitorEngagementPrompt.jsx
//
// NEW (2026-09-23): subtle, non-blocking prompt for anonymous
// visitors, converting real, active traffic into registered accounts
// - genuinely different from a popup ad: small corner toast (never a
// full-screen modal), only appears after real engagement (not on
// page load), rotates its message by what page the visitor is
// actually on, and respects a real dismissal cooldown via
// localStorage (no account exists yet to track this server-side).
//
// What this deliberately does NOT do: show to logged-in users, show
// twice in one cooldown window, show immediately on arrival, or block
// the page underneath it.

import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { X, Mail, Bell, UserPlus, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const DISMISS_COOLDOWN_DAYS = 7;
const ENGAGEMENT_DELAY_MS = 35000; // only after genuine time-on-site
const STORAGE_KEY = 'visitor_engagement_prompt';

// Picks the message that's genuinely most relevant to where the
// visitor actually is, rather than one generic pitch everywhere.
function getPromptForPath(pathname) {
    if (pathname.startsWith('/jobs')) {
        return {
            icon: Bell,
            title: 'Never miss a match',
            body: "Get new jobs like these sent to you - set up a free alert.",
            cta: 'Set Up Job Alerts',
            action: 'signup-for-alerts'
        };
    }
    if (pathname.startsWith('/blog') || pathname.startsWith('/articles')) {
        return {
            icon: Mail,
            title: 'Enjoying the read?',
            body: 'Get our best career insights and job tips, straight to your inbox.',
            cta: 'Join the Newsletter',
            action: 'newsletter'
        };
    }
    if (pathname.startsWith('/courses') || pathname.startsWith('/books')) {
        return {
            icon: UserPlus,
            title: 'Save your progress',
            body: 'Create a free account to track courses, save favorites, and pick up where you left off.',
            cta: 'Create Free Account',
            action: 'signup'
        };
    }
    return {
        icon: Users,
        title: 'Know someone job hunting?',
        body: 'Invite a friend to ODUSBABA - free to join, free to explore.',
        cta: 'Refer a Friend',
        action: 'signup-for-referral'
    };
}

export default function VisitorEngagementPrompt() {
    const location = useLocation();
    const navigate = useNavigate();
    const [visible, setVisible] = useState(false);
    const [prompt, setPrompt] = useState(null);
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        checkEligibility();
    }, []);

    async function checkEligibility() {
        // Never show to a signed-in visitor - they already have
        // everything this offers.
        const { data: { user } } = await supabase.auth.getUser();
        if (user) return;

        try {
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            if (stored.subscribed) return; // already converted - never ask again
            if (stored.dismissedAt) {
                const daysSince = (Date.now() - stored.dismissedAt) / (1000 * 60 * 60 * 24);
                if (daysSince < DISMISS_COOLDOWN_DAYS) return;
            }
        } catch {
            // Malformed storage - treat as never shown.
        }

        const timer = setTimeout(() => {
            setPrompt(getPromptForPath(location.pathname));
            setVisible(true);
        }, ENGAGEMENT_DELAY_MS);

        return () => clearTimeout(timer);
    }

    function handleDismiss() {
        setVisible(false);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ dismissedAt: Date.now() }));
        } catch {
            // Storage unavailable - dismissal just won't persist, not
            // worth failing the interaction over.
        }
    }

    function handleCtaClick() {
        if (prompt.action === 'newsletter') return; // handled by the inline form instead
        if (prompt.action === 'signup-for-alerts') {
            navigate('/sign-up?redirect=/job-alerts');
        } else if (prompt.action === 'signup-for-referral') {
            navigate('/sign-up?redirect=/affiliate');
        } else {
            navigate('/sign-up');
        }
        handleDismiss();
    }

    async function handleNewsletterSubmit(e) {
        e.preventDefault();
        if (!email.trim()) return;
        setSubmitting(true);
        try {
            const response = await fetch('/api/index?action=newsletter-subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Subscription failed');

            setSubmitted(true);
            toast.success("You're subscribed!");
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({ subscribed: true }));
            } catch {
                // Non-critical if this doesn't persist.
            }
            setTimeout(() => setVisible(false), 2000);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    if (!visible || !prompt) return null;

    const Icon = prompt.icon;

    return (
        <div className="fixed bottom-4 right-4 z-40 max-w-sm w-[calc(100%-2rem)] sm:w-96 bg-slate-900 border border-slate-800 rounded-xl shadow-xl p-4 animate-in slide-in-from-bottom-4">
            <button
                onClick={handleDismiss}
                className="absolute top-2 right-2 text-slate-500 hover:text-white transition"
                aria-label="Dismiss"
            >
                <X className="w-4 h-4" />
            </button>

            {submitted ? (
                <div className="text-center py-2">
                    <p className="text-emerald-400 text-sm font-medium">You're all set - thanks for joining!</p>
                </div>
            ) : (
                <>
                    <div className="flex items-start gap-3 mb-3">
                        <div className="w-9 h-9 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-5 h-5 text-primary-400" />
                        </div>
                        <div>
                            <p className="text-white font-semibold text-sm">{prompt.title}</p>
                            <p className="text-slate-400 text-xs mt-0.5">{prompt.body}</p>
                        </div>
                    </div>

                    {prompt.action === 'newsletter' ? (
                        <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@email.com"
                                required
                                className="flex-1 min-w-0 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                            />
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition disabled:opacity-50 text-sm font-medium whitespace-nowrap"
                            >
                                {submitting ? '...' : 'Join'}
                            </button>
                        </form>
                    ) : (
                        <button
                            onClick={handleCtaClick}
                            className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition text-sm font-medium"
                        >
                            {prompt.cta}
                        </button>
                    )}
                </>
            )}
        </div>
    );
}

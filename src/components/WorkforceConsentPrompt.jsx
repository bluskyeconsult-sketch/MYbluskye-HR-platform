// src/components/WorkforceConsentPrompt.jsx
// NEW (2026-09-11): asks new users, once, whether they'd like to be
// listed on the Workforce Marketplace - never asks again if they've
// already accepted or already have a profile, and if dismissed without
// an explicit answer, waits a real cooldown period before showing
// again rather than repeating on every page load. "Accept" navigates
// to the real onboarding flow (/workforce/setup) rather than silently
// creating an incomplete workforce_profiles row, since that table
// genuinely requires headline/skills/etc. that this prompt can't
// supply on its own.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Briefcase, X } from 'lucide-react';

const REMINDER_COOLDOWN_DAYS = 7;

export default function WorkforceConsentPrompt() {
    const navigate = useNavigate();
    const [visible, setVisible] = useState(false);
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        checkWhetherToShow();
    }, []);

    async function checkWhetherToShow() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('workforce_consent_status, workforce_consent_last_shown_at')
                .eq('id', user.id)
                .single();

            if (!profile) return;

            // Never ask again once accepted or explicitly declined -
            // only 'not_asked' or 'dismissed' (closed without an
            // answer) are ever eligible to show again.
            if (profile.workforce_consent_status === 'accepted' || profile.workforce_consent_status === 'declined') {
                return;
            }

            // Already has a real profile - no need to ask at all,
            // regardless of what status says.
            const { data: existingProfile } = await supabase
                .from('workforce_profiles')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();
            if (existingProfile) return;

            if (profile.workforce_consent_status === 'not_asked') {
                setUserId(user.id);
                setVisible(true);
                return;
            }

            // 'dismissed' - only show again after the cooldown has
            // genuinely passed, so this never becomes something that
            // interrupts every session.
            if (profile.workforce_consent_last_shown_at) {
                const lastShown = new Date(profile.workforce_consent_last_shown_at);
                const daysSince = (Date.now() - lastShown.getTime()) / (1000 * 60 * 60 * 24);
                if (daysSince >= REMINDER_COOLDOWN_DAYS) {
                    setUserId(user.id);
                    setVisible(true);
                }
            }
        } catch (err) {
            console.warn('Could not check workforce consent status:', err.message);
        }
    }

    async function recordStatus(status) {
        if (!userId) return;
        try {
            await supabase
                .from('profiles')
                .update({
                    workforce_consent_status: status,
                    workforce_consent_last_shown_at: new Date().toISOString()
                })
                .eq('id', userId);
        } catch (err) {
            console.warn('Could not record workforce consent status:', err.message);
        }
    }

    function handleAccept() {
        recordStatus('accepted');
        setVisible(false);
        navigate('/workforce/setup');
    }

    function handleDecline() {
        recordStatus('declined');
        setVisible(false);
    }

    function handleDismiss() {
        // Explicitly distinct from "decline" - this is "not now",
        // eligible to ask again after the cooldown; decline means "no,
        // stop asking."
        recordStatus('dismissed');
        setVisible(false);
    }

    if (!visible) return null;

    return (
        <div className="fixed bottom-4 right-4 z-40 max-w-sm bg-slate-900 border border-slate-700 rounded-xl shadow-xl p-5">
            <button onClick={handleDismiss} className="absolute top-3 right-3 text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-3">
                <div className="p-2 bg-primary-500/20 rounded-lg flex-shrink-0">
                    <Briefcase className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                    <h3 className="text-white font-semibold text-sm mb-1">Join the Workforce Marketplace?</h3>
                    <p className="text-slate-400 text-xs mb-3">
                        List your skills and get discovered by employers looking for talent like yours - free to set up, takes a few minutes.
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={handleAccept}
                            className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-medium hover:bg-primary-700 transition"
                        >
                            Set Up Profile
                        </button>
                        <button
                            onClick={handleDecline}
                            className="px-3 py-1.5 text-slate-400 hover:text-white text-xs transition"
                        >
                            No thanks
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

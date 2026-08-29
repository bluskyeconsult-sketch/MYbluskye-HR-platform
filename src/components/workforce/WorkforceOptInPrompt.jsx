// src/components/workforce/WorkforceOptInPrompt.jsx
// NEW (2026-08-27) — the real registration opt-in prompt, rebuilt from
// scratch against the corrected schema after the earlier version (built
// before workforceService.js/WorkforceOnboarding.jsx were known) targeted
// a since-discarded, competing set of tables.
//
// DELIBERATE DESIGN: this is a lightweight launcher, not a second form.
// WorkforceOnboarding.jsx already has a real, complete, working multi-step
// flow (category choice, basic info, skills, pricing/portfolio, review).
// Duplicating this here would create exactly the kind of parallel,
// competing implementation this whole engagement has repeatedly found and
// fixed elsewhere. This component only ever asks "yes/no/later," then
// either launches the real onboarding flow in a modal, or dismisses.
//
// WHY THIS RUNS ON THE DASHBOARD, NOT RIGHT AFTER SIGNUP: immediately
// after SignUpPage.jsx's signUp() call, the account may not have a real
// authenticated session yet if email confirmation is required -
// WorkforceOnboarding's real submission needs supabase.auth.getUser() to
// return a genuine user. The dashboard is the first point a real,
// confirmed session is guaranteed to exist.

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import WorkforceOnboarding from './WorkforceOnboarding';
import { ShieldCheck, X } from 'lucide-react';

export default function WorkforceOptInPrompt({ userId, onDismiss }) {
    const [showOnboarding, setShowOnboarding] = useState(false);

    // Real, DB-backed dismissal (add-workforce-prompt-dismissal.sql) -
    // not localStorage, so this genuinely never nags again regardless of
    // which device or browser the person uses next.
    async function handleDismiss() {
        try {
            await supabase
                .from('profiles')
                .update({ workforce_prompt_dismissed_at: new Date().toISOString() })
                .eq('id', userId);
        } catch (err) {
            console.warn('Could not persist workforce prompt dismissal:', err);
        }
        onDismiss();
    }

    // Once the real onboarding flow completes, the dismissal timestamp is
    // set too - a completed listing is just as real a resolution as an
    // explicit "no thanks," and either way this shouldn't be shown again.
    async function handleOnboardingComplete() {
        await handleDismiss();
    }

    if (showOnboarding) {
        return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 my-8">
                    <div className="flex justify-end mb-2">
                        <button onClick={handleDismiss} className="text-slate-500 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <WorkforceOnboarding onComplete={handleOnboardingComplete} />
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6">
                <div className="flex justify-between items-start mb-4">
                    <ShieldCheck className="w-8 h-8 text-primary-400 flex-shrink-0" />
                    <button onClick={handleDismiss} className="text-slate-500 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Get Discovered by Employers?</h2>
                <p className="text-slate-400 text-sm mb-6">
                    This is different from applying to a job — it lists an abridged version of your profile for
                    employers browsing for talent. Your skills are visible to everyone; your contact details and
                    exact location are only ever shared with an employer after they choose to unlock them. Takes
                    about a minute, and it's free for job seekers.
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={handleDismiss}
                        className="flex-1 py-2.5 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition text-sm"
                    >
                        Maybe later
                    </button>
                    <button
                        onClick={() => setShowOnboarding(true)}
                        className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm font-medium"
                    >
                        Yes, show me
                    </button>
                </div>
            </div>
        </div>
    );
}

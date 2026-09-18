// src/pages/ConfirmPage.jsx
// NEW (2026-09-09): confirmed via a real, live confirmation link that
// Supabase's own email template points to /confirm?token=pkce_... - a
// route that never existed in this app at all, causing every single
// email confirmation to land on a 404. The "pkce_" token prefix
// confirms Supabase is using the PKCE flow specifically, which
// requires genuine client-side code to complete - it cannot be handled
// by a plain redirect to an existing page, since the token itself must
// be exchanged for a real session here.

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function ConfirmPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('confirming'); // confirming | success | error
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        confirmToken();
    }, []);

    async function confirmToken() {
        const token = searchParams.get('token');
        // FIXED (2026-09-17): confirmed via the real, live email
        // templates that magiclink/recovery/reauth links all point to
        // this same page (via /auth/confirm), each with a real type
        // parameter in the URL - only the original signup confirmation
        // link omits it. Reading it dynamically, defaulting to 'email'
        // only when genuinely absent, rather than hardcoding 'email'
        // for every token type regardless of what it actually is.
        const tokenType = searchParams.get('type') || 'email';

        if (!token) {
            setStatus('error');
            setErrorMessage('This confirmation link is missing its token. Please try signing up again or request a new confirmation email.');
            return;
        }

        try {
            const { error } = await supabase.auth.verifyOtp({
                token_hash: token,
                type: tokenType
            });

            if (error) throw error;

            // FIXED (2026-09-17): a password recovery link succeeding
            // here doesn't mean the user is done - it means they now
            // have a real session and need to actually set a new
            // password. Sending them to /dashboard at this point would
            // genuinely skip the one thing they came here to do.
            if (tokenType === 'recovery') {
                setStatus('success');
                setTimeout(() => navigate('/reset-password', { replace: true }), 1000);
                return;
            }

            setStatus('success');

            // NEW (2026-09-13): confirmed real, structural bug - this
            // "go to your dashboard" welcome email previously fired
            // immediately at signup, before confirmation. A new user
            // clicking it first (before the separate confirmation
            // email) would be told to go to their dashboard while
            // their account genuinely couldn't sign in yet - a direct
            // contributor to the "invalid email or password" confusion
            // multiple real users hit. Moved here, where it's now
            // truthfully accurate: the user really can go to their
            // dashboard at this exact moment.
            // FIXED (2026-09-17): only send this for a genuine new
            // signup confirmation - a magic-link or reauth sign-in
            // isn't someone new joining, and shouldn't get a "welcome"
            // email each time they use one.
            if (tokenType === 'email') {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.user) {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('full_name, user_type, is_tester')
                            .eq('id', session.user.id)
                            .single();

                        await fetch('/api/index?action=email', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                to: session.user.email,
                                type: profile?.is_tester ? 'tester_welcome' : 'welcome',
                                templateData: {
                                    name: profile?.full_name || 'there',
                                    userType: profile?.user_type
                                }
                            })
                        });
                    }
                } catch (emailErr) {
                    // Never let a welcome-email failure block the actual
                    // confirmation success the user is already seeing.
                    console.warn('Welcome email failed to send:', emailErr);
                }
            }

            // Brief pause so the success state is genuinely visible
            // before moving on, rather than an instant, jarring redirect.
            setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
        } catch (err) {
            console.error('Email confirmation error:', err);
            setStatus('error');
            setErrorMessage(
                err.message?.includes('expired')
                    ? 'This confirmation link has expired. Please sign up again or request a new one.'
                    : 'This confirmation link is invalid or has already been used. If you already confirmed your email, try signing in directly.'
            );
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                {status === 'confirming' && (
                    <>
                        <Loader2 className="w-12 h-12 text-primary-400 animate-spin mx-auto mb-4" />
                        <h1 className="text-xl font-semibold text-white mb-2">Confirming your email...</h1>
                        <p className="text-slate-400 text-sm">This will only take a moment.</p>
                    </>
                )}
                {status === 'success' && (
                    <>
                        <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                        <h1 className="text-xl font-semibold text-white mb-2">Email confirmed!</h1>
                        <p className="text-slate-400 text-sm">Taking you to your dashboard...</p>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                        <h1 className="text-xl font-semibold text-white mb-2">Confirmation failed</h1>
                        <p className="text-slate-400 text-sm mb-6">{errorMessage}</p>
                        <div className="flex gap-3 justify-center">
                            <Link to="/sign-in" className="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition">
                                Sign In
                            </Link>
                            <Link to="/sign-up" className="px-5 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition">
                                Sign Up Again
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

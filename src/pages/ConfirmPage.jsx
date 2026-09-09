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

        if (!token) {
            setStatus('error');
            setErrorMessage('This confirmation link is missing its token. Please try signing up again or request a new confirmation email.');
            return;
        }

        try {
            // FIXED (2026-09-09): confirmed via a real, live test that
            // exchangeCodeForSession was the wrong method entirely - that
            // API expects a `code` parameter from an OAuth-style redirect.
            // A `token=pkce_...` value in a `token` query parameter is
            // actually Supabase's signup verification flow, which
            // requires verifyOtp with token_hash - a genuinely different
            // method. This was a real bug in the first version of this
            // fix, not a deployment issue.
            const { error } = await supabase.auth.verifyOtp({
                token_hash: token,
                type: 'signup'
            });

            if (error) throw error;

            setStatus('success');
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

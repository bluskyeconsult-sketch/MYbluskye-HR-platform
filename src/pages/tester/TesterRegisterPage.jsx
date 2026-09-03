// src/pages/tester/TesterRegisterPage.jsx
//
// REBUILT (2026-08-30) — this page previously just redirected to
// /sign-up, since it had no real purpose of its own after the earlier
// hardcoded-master-code vulnerability was removed. It now has a real,
// distinct purpose: a genuinely automated way for someone who
// discovers the platform with no prior relationship to an admin to
// request a tester invite code, without either requiring real-time
// manual approval or exposing a working code publicly on the page
// (which would defeat the point of gating tester access at all).
//
// Bounded by a real, admin-configurable cap (tester_max_total_count in
// system_config, checked server-side in the request-tester-code
// action) - under the cap, a genuinely unique, single-use code is
// emailed directly to the requester; at or over the cap, they're added
// to a real waitlist instead. Either way, this page never displays a
// working code itself - only /sign-up (via the existing, real
// invite-code + consume_invite_code() system) actually redeems one.

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Mail, Loader2, CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';

export default function TesterRegisterPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    // NEW (2026-08-30): confirmed via direct review of
    // TesterVisibilitySettings.jsx that registration_mode is a real,
    // saved setting (Hidden/Invite Only/Public) that nothing anywhere
    // in the app actually read - including this page. An admin setting
    // it to "Hidden" would have had zero effect here; this page would
    // stay fully public regardless. Now genuinely checked before the
    // form ever renders.
    const [registrationMode, setRegistrationMode] = useState(null);
    const [checkingMode, setCheckingMode] = useState(true);

    useEffect(() => {
        async function checkRegistrationMode() {
            try {
                const { data } = await supabase
                    .from('system_config')
                    .select('config_value')
                    .eq('config_key', 'tester_visibility')
                    .maybeSingle();
                setRegistrationMode(data?.config_value?.registration_mode || 'invite_only');
            } catch (err) {
                console.warn('Could not check registration mode, defaulting to invite_only:', err.message);
                setRegistrationMode('invite_only');
            } finally {
                setCheckingMode(false);
            }
        }
        checkRegistrationMode();
    }, []);

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError('');
        setResult(null);

        try {
            const response = await fetch('/api/index?action=request-tester-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() })
            });

            const data = await response.json();

            if (!response.ok && !data.success) {
                throw new Error(data.error || 'Something went wrong. Please try again.');
            }

            setResult(data);
        } catch (err) {
            console.error('Tester code request error:', err);
            setError(err.message || 'Unable to process your request. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    // Genuinely respects registration_mode now - "hidden" means this
    // page shows nothing but a plain, honest message, not the form.
    if (checkingMode) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
            </div>
        );
    }

    if (registrationMode === 'hidden') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
                <div className="max-w-md w-full text-center">
                    <XCircle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Not Currently Available</h1>
                    <p className="text-slate-400">
                        The tester program isn't accepting new requests right now. Check back later, or if you already have an invite code, you can{' '}
                        <Link to="/sign-up" className="text-primary-400 hover:text-primary-300">sign up directly</Link>.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Become a Tester</h1>
                    <p className="text-slate-400">
                        Get early, free access to ODUSBABA and help shape what we build next.
                    </p>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 sm:p-8 backdrop-blur-sm">
                    {!result ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-red-400 text-sm">{error}</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-xl font-medium transition flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                {loading ? 'Sending...' : 'Request Tester Access'}
                            </button>

                            <p className="text-xs text-slate-500 text-center">
                                We'll email you an invite code if a spot is available - no need to know anyone here first.
                            </p>
                        </form>
                    ) : (
                        <div className="text-center py-4">
                            {result.waitlisted ? (
                                <>
                                    <Clock className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                                    <h2 className="text-xl font-semibold text-white mb-2">You're on the waitlist</h2>
                                    <p className="text-slate-400 text-sm">{result.message}</p>
                                </>
                            ) : result.alreadyRegistered ? (
                                <>
                                    <CheckCircle className="w-12 h-12 text-primary-400 mx-auto mb-4" />
                                    <h2 className="text-xl font-semibold text-white mb-2">Account already exists</h2>
                                    <p className="text-slate-400 text-sm mb-4">{result.message}</p>
                                    <Link to="/sign-in" className="text-primary-400 hover:text-primary-300 text-sm font-medium">
                                        Go to Sign In →
                                    </Link>
                                </>
                            ) : result.success ? (
                                <>
                                    <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                                    <h2 className="text-xl font-semibold text-white mb-2">Check your email</h2>
                                    <p className="text-slate-400 text-sm mb-4">{result.message}</p>
                                    <p className="text-slate-500 text-xs">
                                        Once you have your code, head to{' '}
                                        <Link to="/sign-up" className="text-primary-400 hover:text-primary-300">sign up</Link>
                                        {' '}to complete registration.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                                    <h2 className="text-xl font-semibold text-white mb-2">Almost there</h2>
                                    <p className="text-slate-400 text-sm">{result.error}</p>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <p className="text-center text-slate-500 text-sm mt-6">
                    Already have an invite code?{' '}
                    <Link to="/sign-up" className="text-primary-400 hover:text-primary-300 font-medium">
                        Sign up directly
                    </Link>
                </p>
            </div>
        </div>
    );
}

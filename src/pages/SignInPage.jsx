// src/pages/SignInPage.jsx
// ODUSBABA SIGN IN PAGE — written 2026-08-07 by Claude, since no real
// SignInPage.jsx was available to review at that time. This file's own
// original header carried an explicit warning that if a different real
// file existed and differed from this, that one should be treated as
// authoritative — that ambiguity was never resolved by the time this was
// sent back for the rate-limiting work below, so it's noted here plainly
// rather than silently dropped.
//
// UPGRADED (2026-08-24) — real, server-side rate limiting/lockout on
// sign-in, same underlying principle as the equivalent AdminLogin.jsx
// build, but deliberately different thresholds and primary signal:
// regular users can legitimately share one public IP (an office, a
// campus network) in a way a handful of admin accounts never do, so
// IP-based lockout here would risk locking out everyone on a shared
// network over one person's typo. The new user-login backend action
// tracks failures primarily by the targeted email (protects the specific
// account without punishing everyone nearby), with IP-based tracking
// kept only as a much more generous, spray-attack-specific secondary
// signal. Sign-in no longer calls supabase.auth.signInWithPassword()
// directly — that call never passed through the backend gateway, which
// is exactly why attempts couldn't be tracked server-side before.
//
// Behavior otherwise unchanged:
// - Supports a `?redirect=` query param (ProtectedRoute in App.jsx already
//   sends users here with one, e.g. /sign-in?redirect=/dashboard) and returns
//   them there after login.
// - Falls back to /admin/dashboard for admin/super_admin users with no
//   redirect specified, otherwise /dashboard.
// - Includes a simple "forgot password" flow using Supabase's built-in
//   resetPasswordForEmail, since no dedicated reset-password route exists in
//   the confirmed real route list (App.jsx) — sending a reset link by email
//   avoids linking to a page that isn't there.

import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, CheckCircle, ArrowLeft, LogIn } from 'lucide-react';

const API_BASE = '/api/index';

export default function SignInPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectTo = searchParams.get('redirect');

    const [formData, setFormData] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetSent, setResetSent] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [resetError, setResetError] = useState('');

    // If already logged in, skip straight past this page.
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                navigate(redirectTo || '/dashboard', { replace: true });
            }
        };
        checkSession();
    }, [navigate, redirectTo]);

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // FIXED (2026-08-24): no longer calls
            // supabase.auth.signInWithPassword() directly from the
            // browser — routes through the new user-login backend action
            // instead, which is what makes real rate limiting/lockout
            // possible at all (a direct client call never passes through
            // the backend gateway and can't be tracked server-side).
            const response = await fetch(`${API_BASE}?action=user-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formData.email, password: formData.password })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || result.error || 'Sign in failed. Please try again.');
            }

            // Real session tokens, obtained server-side after the real
            // check passed — established in the browser exactly as if
            // signInWithPassword had been called directly.
            const { error: setSessionError } = await supabase.auth.setSession({
                access_token: result.session.access_token,
                refresh_token: result.session.refresh_token
            });

            if (setSessionError) throw setSessionError;

            // Same destination logic as before, just using the isAdmin
            // flag the backend already determined rather than a second
            // profile query here.
            if (redirectTo) {
                navigate(redirectTo, { replace: true });
                return;
            }

            navigate(result.isAdmin ? '/admin/dashboard' : '/dashboard', { replace: true });

        } catch (err) {
            console.error('Sign in error:', err);
            // Deliberately generic message preserved — doesn't reveal
            // whether an email is registered, same philosophy as before,
            // now also true of the rate-limit messaging itself.
            setError(err.message || 'Unable to sign in. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    async function handleForgotPassword(e) {
        e.preventDefault();
        setResetLoading(true);
        setResetError('');

        try {
            const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resetEmail, {
                redirectTo: `${window.location.origin}/sign-in`
            });
            if (resetErr) throw resetErr;
            setResetSent(true);
        } catch (err) {
            console.error('Password reset error:', err);
            setResetError(err.message || 'Unable to send reset email. Please try again.');
        } finally {
            setResetLoading(false);
        }
    }

    if (showForgotPassword) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
                <div className="max-w-md w-full">
                    <button
                        onClick={() => { setShowForgotPassword(false); setResetSent(false); setResetError(''); }}
                        className="mb-6 inline-flex items-center gap-2 text-slate-400 hover:text-white transition text-sm group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition" />
                        Back to Sign In
                    </button>

                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 sm:p-8 backdrop-blur-sm">
                        {resetSent ? (
                            <div className="text-center">
                                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                                <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
                                <p className="text-slate-400 text-sm">
                                    If an account exists for {resetEmail}, we've sent a password reset link.
                                </p>
                            </div>
                        ) : (
                            <>
                                <h1 className="text-2xl font-bold text-white mb-2">Reset your password</h1>
                                <p className="text-slate-400 text-sm mb-6">
                                    Enter your email and we'll send you a reset link.
                                </p>

                                {resetError && (
                                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                        <p className="text-red-400 text-sm">{resetError}</p>
                                    </div>
                                )}

                                <form onSubmit={handleForgotPassword} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                            Email Address
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <input
                                                type="email"
                                                value={resetEmail}
                                                onChange={(e) => setResetEmail(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                                                placeholder="you@example.com"
                                                autoComplete="email"
                                                required
                                                disabled={resetLoading}
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={resetLoading}
                                        className="w-full py-2.5 bg-gradient-to-r from-primary-600 to-sky-600 text-white rounded-lg hover:from-primary-700 hover:to-sky-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                                    >
                                        {resetLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            'Send reset link'
                                        )}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
            <div className="max-w-md w-full">
                <div className="mb-6">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition text-sm group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition" />
                        Back to Home
                    </Link>
                </div>

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
                        <LogIn className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
                    <p className="text-slate-400 mt-2">Sign in to continue to ODUSBABA</p>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 sm:p-8 backdrop-blur-sm">
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-sm font-medium text-slate-300">
                                    Password
                                </label>
                                <button
                                    type="button"
                                    onClick={() => { setShowForgotPassword(true); setResetEmail(formData.email); }}
                                    className="text-xs text-primary-400 hover:underline"
                                >
                                    Forgot password?
                                </button>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full pl-10 pr-10 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    required
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 bg-gradient-to-r from-primary-600 to-sky-600 text-white rounded-lg hover:from-primary-700 hover:to-sky-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium shadow-lg shadow-primary-500/20"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    <LogIn className="w-4 h-4" />
                                    Sign In
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-slate-500">
                            Don't have an account?{' '}
                            <Link to="/sign-up" className="text-primary-400 hover:underline transition">
                                Sign Up
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

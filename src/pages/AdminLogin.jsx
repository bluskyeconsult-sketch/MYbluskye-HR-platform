// src/pages/AdminLogin.jsx
//
// CONSOLIDATED (2026-08-24) — replaced two conflicting implementations,
// neither of which had a working admin-role check (see prior fix notes
// in project history for the full account).
//
// UPGRADED (2026-08-24) — real, server-side rate limiting/lockout, now
// actually built. Sign-in no longer calls supabase.auth.signInWithPassword()
// directly from the browser — that call bypassed the backend gateway
// entirely, which is exactly why failed attempts could never be tracked
// server-side before. Now posts to the new admin-login backend action,
// which performs the real credential check itself, logs every attempt
// (security_events), and locks out an IP after 5 failed attempts within
// 15 minutes (blocked_ips) — reusing the same proven security
// infrastructure already used elsewhere in this gateway, not a new
// parallel system. On success, the real session tokens are handed back
// and established in the browser via supabase.auth.setSession().

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, clearAuthAndRetry } from '../lib/supabase';
import { Shield, Mail, Lock, Loader2, AlertCircle, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';

const API_BASE = '/api/index';

export default function AdminLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [redirecting, setRedirecting] = useState(false);
    const [sessionCleared, setSessionCleared] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('cleared') === '1') {
            setSessionCleared(true);
            setTimeout(() => setSessionCleared(false), 5000);
            window.history.replaceState({}, '', '/admin-login');
        }
        checkExistingSession();
    }, []);

    async function checkExistingSession() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            // FIXED: real role check instead of a hardcoded email —
            // matches the pattern used everywhere else in this admin panel.
            const { data: profile } = await supabase
                .from('profiles')
                .select('user_type')
                .eq('id', session.user.id)
                .single();

            if (profile?.user_type === 'admin' || profile?.user_type === 'super_admin') {
                navigate('/admin/dashboard');
            }
        } catch (err) {
            console.error('Session check:', err);
        }
    }

    async function handleLogin(e) {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!email.trim() || !password) {
            setError('Please enter both email and password');
            setLoading(false);
            return;
        }

        try {
            // FIXED (2026-08-24): no longer calls
            // supabase.auth.signInWithPassword() directly from the
            // browser — that call never passed through the backend
            // gateway, which is exactly why rate limiting/lockout could
            // never be tracked before. The real credential check, role
            // verification, attempt logging, and lockout enforcement all
            // happen server-side now, in the admin-login action.
            //
            // FIXED (2026-08-27): confirmed real report of this page
            // spinning indefinitely with no resolution. The backend fix
            // (making security-event logging fire-and-forget rather than
            // blocking every login response) addresses the most likely
            // cause, but this timeout is a real, independent safety net —
            // if anything ever causes the request to genuinely hang, the
            // person sees a clear, actionable error at 15 seconds instead
            // of a spinner with no way to know something went wrong.
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const response = await fetch(`${API_BASE}?action=admin-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim(), password }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || result.error || 'Login failed');
            }

            // Real session tokens, obtained server-side after every real
            // check passed — established in the browser's own Supabase
            // client so the rest of the app sees a normal, authenticated
            // session exactly as if signInWithPassword had been called
            // directly.
            const { error: setSessionError } = await supabase.auth.setSession({
                access_token: result.session.access_token,
                refresh_token: result.session.refresh_token
            });

            if (setSessionError) throw setSessionError;

            setRedirecting(true);
            setTimeout(() => navigate('/admin/dashboard'), 500);

        } catch (err) {
            console.error('Login error:', err);
            setError(err.name === 'AbortError' ? 'The request took too long and was stopped. Please try again — if this keeps happening, the site may be experiencing an issue.' : err.message);
        } finally {
            if (!redirecting) setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
            <div className="max-w-md w-full">
                <div className="mb-6">
                    <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition text-sm group">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition" />
                        Back to Home
                    </Link>
                </div>

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Admin Login</h1>
                    <p className="text-slate-400 mt-2">Access the ODUSBABA administration panel</p>
                </div>

                {sessionCleared && (
                    <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <p className="text-emerald-400 text-sm">Session cleared successfully. Please log in.</p>
                    </div>
                )}

                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
                                    required
                                    disabled={loading || redirecting}
                                    autoComplete="email"
                                    placeholder="admin@example.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
                                    required
                                    disabled={loading || redirecting}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-red-400 text-sm">{error}</p>
                                    {(error.includes('token') || error.includes('extensible')) && (
                                        <button
                                            onClick={clearAuthAndRetry}
                                            className="mt-2 text-red-400 underline text-sm hover:text-red-300"
                                        >
                                            Clear corrupted session and retry
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {redirecting && (
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                                <p className="text-emerald-400 text-sm">Login successful! Redirecting to dashboard...</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || redirecting}
                            className="w-full py-2.5 bg-gradient-to-r from-primary-600 to-sky-600 text-white rounded-lg hover:from-primary-700 hover:to-sky-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium shadow-lg shadow-primary-500/20"
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Authenticating...</>
                            ) : redirecting ? (
                                <><CheckCircle className="w-4 h-4" /> Redirecting...</>
                            ) : (
                                <><Shield className="w-4 h-4" /> Login as Admin</>
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-xs text-slate-500 mt-6">
                    Only authorized administrators can access this panel.
                </p>
            </div>
        </div>
    );
}

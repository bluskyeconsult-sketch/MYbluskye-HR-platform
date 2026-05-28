// src/pages/AdminLogin.jsx - COMPLETE PRODUCTION READY
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, clearAuthAndRetry } from '../lib/supabase';
import { Shield, Mail, Lock, Loader2, AlertCircle, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';

export default function AdminLogin() {
    const [email, setEmail] = useState('bluskyeconsult@gmail.com');
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
            if (session?.user?.email === 'bluskyeconsult@gmail.com') {
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
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password
            });

            if (signInError) {
                if (signInError.message.includes('Invalid login credentials')) {
                    throw new Error('Invalid email or password');
                }
                throw signInError;
            }

            if (!data.user) throw new Error('Login failed');

            if (data.user?.email !== 'bluskyeconsult@gmail.com') {
                await supabase.auth.signOut();
                throw new Error('Not authorized as admin');
            }

            setRedirecting(true);
            setTimeout(() => navigate('/admin/dashboard'), 500);

        } catch (err) {
            console.error('Login error:', err);
            setError(err.message);
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

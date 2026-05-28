// src/pages/AdminLogin.jsx - PRODUCTION READY VERSION
// Features: Session clearing, token error handling, force clear button, admin detection

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, forceClearAuth, recoverSession, isAuthCorrupted } from '../lib/supabase';
import { Shield, Mail, Lock, Loader2, AlertCircle, Eye, EyeOff, ArrowLeft, CheckCircle, RefreshCw } from 'lucide-react';

export default function AdminLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [redirecting, setRedirecting] = useState(false);
    const [showClearButton, setShowClearButton] = useState(false);
    const [sessionCleared, setSessionCleared] = useState(false);
    const navigate = useNavigate();

    // Check URL params and existing session on mount
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Check if cleared flag is present
        if (urlParams.get('cleared') === '1') {
            console.log('✅ Session cleared, ready to login');
            setSessionCleared(true);
            // Remove the param from URL without reloading
            window.history.replaceState({}, '', '/admin-login');
            
            // Clear the success message after 5 seconds
            setTimeout(() => setSessionCleared(false), 5000);
        }
        
        // Check for corrupted session
        checkCorruptedSession();
        
        // Check existing session
        checkExistingSession();
    }, []);

    async function checkCorruptedSession() {
        const isCorrupted = await isAuthCorrupted();
        if (isCorrupted) {
            console.warn('⚠️ Detected corrupted session, offering clear option');
            setShowClearButton(true);
            setError('Session corruption detected. Click "Clear Session" below to fix.');
        }
    }

    async function checkExistingSession() {
        try {
            const { session } = await recoverSession();
            if (session && session.user) {
                // Check if admin by email or metadata
                const isAdmin = session.user.email === 'bluskyeconsult@gmail.com' ||
                               session.user.user_metadata?.is_admin === true;
                
                if (isAdmin) {
                    navigate('/admin/dashboard');
                }
            }
        } catch (err) {
            console.error('Session check failed:', err);
            // If session check fails with token error, show clear button
            if (err.message?.includes('token') || err.message?.includes('extensible')) {
                setShowClearButton(true);
            }
        }
    }

    const handleClearSession = async () => {
        setLoading(true);
        await forceClearAuth();
        // forceClearAuth redirects, so no need to set loading false
    };

    async function handleLogin(e) {
        e.preventDefault();
        setLoading(true);
        setError('');
        setShowClearButton(false);

        // Basic validation
        if (!email.trim()) {
            setError('Please enter your email address');
            setLoading(false);
            return;
        }

        if (!password) {
            setError('Please enter your password');
            setLoading(false);
            return;
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
        if (!emailRegex.test(email.trim())) {
            setError('Please enter a valid email address');
            setLoading(false);
            return;
        }

        try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password
            });

            if (signInError) {
                // Check for token/refresh errors
                if (signInError.message?.includes('refresh') || 
                    signInError.message?.includes('token') ||
                    signInError.message?.includes('extensible')) {
                    setShowClearButton(true);
                    throw new Error('Session error detected. Click "Clear Session" below to fix.');
                }
                throw signInError;
            }

            if (!data.user) {
                throw new Error('Login failed. Please try again.');
            }

            // Check if admin (by email or metadata)
            const isAdmin = data.user.email === 'bluskyeconsult@gmail.com' ||
                           data.user.user_metadata?.is_admin === true;

            if (!isAdmin) {
                await supabase.auth.signOut();
                throw new Error('Access denied. Admin privileges required.');
            }

            // Successful login - redirect
            setRedirecting(true);
            setTimeout(() => {
                navigate('/admin/dashboard');
            }, 500);

        } catch (err) {
            console.error('Login error:', err);
            setError(err.message || 'Login failed. Please check your credentials.');
            
            // Check if error indicates corrupted session
            if (err.message?.includes('object is not extensible') || 
                err.message?.includes('refresh') || 
                err.message?.includes('token') ||
                err.message?.includes('corrupted')) {
                setShowClearButton(true);
            }
        } finally {
            if (!redirecting) {
                setLoading(false);
            }
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
            <div className="max-w-md w-full">
                {/* Back to Home Link */}
                <div className="mb-6">
                    <Link 
                        to="/" 
                        className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition text-sm group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition" />
                        Back to Home
                    </Link>
                </div>

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Admin Login</h1>
                    <p className="text-slate-400 mt-2">Access the ODUSBABA administration panel</p>
                </div>

                {/* Session Cleared Success Message */}
                {sessionCleared && (
                    <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <p className="text-emerald-400 text-sm">Session cleared successfully. Please log in.</p>
                    </div>
                )}

                {/* Login Form */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
                    <form onSubmit={handleLogin} className="space-y-4">
                        {/* Email Field */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition"
                                    placeholder="admin@bluskyeconsult.com"
                                    required
                                    disabled={loading || redirecting}
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition"
                                    placeholder="••••••••"
                                    required
                                    disabled={loading || redirecting}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-red-400 text-sm">{error}</p>
                                </div>
                            </div>
                        )}

                        {/* Redirecting Message */}
                        {redirecting && (
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                                <p className="text-emerald-400 text-sm">Login successful! Redirecting to dashboard...</p>
                            </div>
                        )}

                        {/* Clear Session Button (shown when corruption detected) */}
                        {showClearButton && (
                            <button
                                type="button"
                                onClick={handleClearSession}
                                disabled={loading}
                                className="w-full py-2.5 bg-amber-600/30 text-amber-400 rounded-lg hover:bg-amber-600/50 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 text-sm border border-amber-500/30"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Clear Corrupted Session & Retry
                            </button>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || redirecting}
                            className="w-full py-2.5 bg-gradient-to-r from-primary-600 to-sky-600 text-white rounded-lg hover:from-primary-700 hover:to-sky-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium shadow-lg shadow-primary-500/20"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Authenticating...
                                </>
                            ) : redirecting ? (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    Redirecting...
                                </>
                            ) : (
                                <>
                                    <Shield className="w-4 h-4" />
                                    Login as Admin
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer Note */}
                <p className="text-center text-xs text-slate-500 mt-6">
                    Only authorized administrators can access this panel.
                    Unauthorized access is prohibited and will be logged.
                </p>
            </div>
        </div>
    );
}

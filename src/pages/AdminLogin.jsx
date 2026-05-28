// src/pages/AdminLogin.jsx
// COMPLETE WORKING ADMIN LOGIN PAGE - With improved error handling, security, session management, and force clear

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, forceClearAndRedirect } from '../lib/supabase';
import { Shield, Mail, Lock, Loader2, AlertCircle, Eye, EyeOff, ArrowLeft, CheckCircle, RefreshCw } from 'lucide-react';

export default function AdminLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [redirecting, setRedirecting] = useState(false);
    const [loginAttempts, setLoginAttempts] = useState(0);
    const [isLocked, setIsLocked] = useState(false);
    const [showClearButton, setShowClearButton] = useState(false);
    const navigate = useNavigate();

    // Check if already logged in as admin
    useEffect(() => {
        checkExistingSession();
        
        // Load login attempts from localStorage
        const attempts = localStorage.getItem('admin_login_attempts');
        if (attempts) {
            setLoginAttempts(parseInt(attempts));
            if (parseInt(attempts) >= 5) {
                setIsLocked(true);
                setTimeout(() => {
                    localStorage.removeItem('admin_login_attempts');
                    setLoginAttempts(0);
                    setIsLocked(false);
                }, 15 * 60 * 1000); // 15 minute lockout
            }
        }
        
        // Check URL param for cleared flag
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('cleared') === '1') {
            console.log('✅ Session cleared, please login');
            // Show success message briefly
            const timer = setTimeout(() => {
                const clearedParam = new URLSearchParams(window.location.search);
                clearedParam.delete('cleared');
                const newUrl = `${window.location.pathname}?${clearedParam.toString()}`;
                window.history.replaceState({}, '', newUrl);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, []);

    async function checkExistingSession() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('user_type')
                    .eq('id', session.user.id)
                    .single();

                const userType = profile?.user_type;
                if (userType === 'admin' || userType === 'super_admin' || session.user.email === 'bluskyeconsult@gmail.com') {
                    navigate('/admin/dashboard');
                }
            }
        } catch (err) {
            console.error('Session check error:', err);
        }
    }

    function recordFailedAttempt() {
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        localStorage.setItem('admin_login_attempts', newAttempts.toString());
        
        if (newAttempts >= 5) {
            setIsLocked(true);
            setTimeout(() => {
                localStorage.removeItem('admin_login_attempts');
                setLoginAttempts(0);
                setIsLocked(false);
            }, 15 * 60 * 1000);
            setError('Too many failed attempts. Please try again in 15 minutes.');
        }
    }

    const handleClearAndRetry = () => {
        forceClearAndRedirect();
    };

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError('');
        setShowClearButton(false);

        // Check if locked
        if (isLocked) {
            setError('Account temporarily locked due to multiple failed attempts. Please try again later.');
            setLoading(false);
            return;
        }

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
            // Attempt sign in
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password
            });

            if (signInError) {
                recordFailedAttempt();
                
                // Check for token/refresh errors
                if (signInError.message?.includes('refresh') || 
                    signInError.message?.includes('token') ||
                    signInError.message?.includes('object is not extensible')) {
                    setShowClearButton(true);
                    setError('Session error detected. Click the button below to clear and retry.');
                } else if (signInError.message === 'Invalid login credentials') {
                    throw new Error('Invalid email or password');
                } else {
                    throw signInError;
                }
                setLoading(false);
                return;
            }

            if (!data.user) {
                recordFailedAttempt();
                throw new Error('Login failed. Please try again.');
            }

            // Check admin privileges
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('user_type, tier')
                .eq('id', data.user.id)
                .single();

            if (profileError) {
                console.warn('Profile fetch error:', profileError);
            }

            const userType = profile?.user_type;
            const isAuthorized = userType === 'admin' || 
                                userType === 'super_admin' || 
                                data.user.email === 'bluskyeconsult@gmail.com';

            if (!isAuthorized) {
                recordFailedAttempt();
                setError('Access denied. Admin privileges required.');
                await supabase.auth.signOut();
                setLoading(false);
                return;
            }

            // Reset login attempts on successful login
            localStorage.removeItem('admin_login_attempts');
            setLoginAttempts(0);

            // Successful login - redirect
            setRedirecting(true);
            setTimeout(() => {
                navigate('/admin/dashboard');
            }, 800);

        } catch (err) {
            console.error('Admin login error:', err);
            setError(err.message || 'Login failed. Please check your credentials.');
            
            // Check if error indicates corrupted session
            if (err.message?.includes('object is not extensible') || 
                err.message?.includes('refresh') || 
                err.message?.includes('token')) {
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
                {new URLSearchParams(window.location.search).get('cleared') === '1' && (
                    <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <p className="text-emerald-400 text-sm">Session cleared successfully. Please log in.</p>
                    </div>
                )}

                {/* Login Form */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
                    <form onSubmit={handleSubmit} className="space-y-4">
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
                                    disabled={loading || redirecting || isLocked}
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
                                    disabled={loading || redirecting || isLocked}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                                    tabIndex={-1}
                                    disabled={isLocked}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Locked Warning */}
                        {isLocked && (
                            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-400" />
                                <p className="text-amber-400 text-sm">
                                    Too many failed attempts. Please try again in 15 minutes.
                                </p>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && !isLocked && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-red-400 text-sm">{error}</p>
                                    {showClearButton && (
                                        <button
                                            onClick={handleClearAndRetry}
                                            className="mt-2 text-red-400 underline text-sm hover:text-red-300 transition flex items-center gap-1"
                                        >
                                            <RefreshCw className="w-3 h-3" />
                                            Click here to clear corrupted session and try again
                                        </button>
                                    )}
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

                        {/* Attempts Warning */}
                        {loginAttempts > 0 && loginAttempts < 5 && !redirecting && !isLocked && (
                            <p className="text-xs text-amber-400/70 text-center">
                                {5 - loginAttempts} attempts remaining before temporary lockout
                            </p>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || redirecting || isLocked}
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

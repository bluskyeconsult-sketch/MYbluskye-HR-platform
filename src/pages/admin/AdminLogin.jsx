// src/pages/AdminLogin.jsx
// COMPLETE PROFESSIONAL ADMIN LOGIN PAGE - Unified API, enhanced security, rate limiting, session management

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, apiCall } from '../lib/supabase';
import { 
    Shield, Mail, Lock, Loader2, AlertCircle, Eye, EyeOff, 
    ArrowLeft, CheckCircle, RefreshCw, ShieldCheck, Fingerprint,
    Clock, AlertTriangle
} from 'lucide-react';

// Rate limiting configuration
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;
const SESSION_TIMEOUT_MINUTES = 60;

export default function AdminLogin() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [redirecting, setRedirecting] = useState(false);
    const [loginAttempts, setLoginAttempts] = useState(0);
    const [isLocked, setIsLocked] = useState(false);
    const [lockoutTimeRemaining, setLockoutTimeRemaining] = useState(0);
    const [showClearButton, setShowClearButton] = useState(false);
    const [sessionChecked, setSessionChecked] = useState(false);

    // Load login attempts and check existing session
    useEffect(() => {
        checkExistingSession();
        loadLoginAttempts();
        
        // Check URL for cleared flag
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('cleared') === '1') {
            setSuccess('Session cleared successfully. Please log in.');
            setTimeout(() => setSuccess(''), 5000);
            window.history.replaceState({}, '', '/admin-login');
        }
    }, []);

    // Lockout timer effect
    useEffect(() => {
        if (isLocked && lockoutTimeRemaining > 0) {
            const timer = setInterval(() => {
                setLockoutTimeRemaining(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        setIsLocked(false);
                        localStorage.removeItem('admin_login_attempts');
                        setLoginAttempts(0);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [isLocked, lockoutTimeRemaining]);

    async function loadLoginAttempts() {
        try {
            const response = await apiCall('get-login-attempts', {}, 'GET');
            if (response.success && response.data) {
                const { attempts, lockedUntil } = response.data;
                setLoginAttempts(attempts || 0);
                
                if (lockedUntil && new Date(lockedUntil) > new Date()) {
                    const remainingSeconds = Math.floor((new Date(lockedUntil) - new Date()) / 1000);
                    setLockoutTimeRemaining(remainingSeconds);
                    setIsLocked(true);
                }
            }
        } catch (error) {
            // Fallback to localStorage
            const savedAttempts = localStorage.getItem('admin_login_attempts');
            if (savedAttempts) {
                const attempts = parseInt(savedAttempts);
                setLoginAttempts(attempts);
                if (attempts >= MAX_LOGIN_ATTEMPTS) {
                    const lockoutExpiry = localStorage.getItem('admin_login_lockout_expiry');
                    if (lockoutExpiry && new Date(lockoutExpiry) > new Date()) {
                        const remaining = Math.floor((new Date(lockoutExpiry) - new Date()) / 1000);
                        setLockoutTimeRemaining(remaining);
                        setIsLocked(true);
                    }
                }
            }
        }
    }

    async function checkExistingSession() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                // Check if user is admin
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('user_type, tier')
                    .eq('id', session.user.id)
                    .single();

                const isAuthorized = profile?.user_type === 'admin' || 
                                    profile?.user_type === 'super_admin' || 
                                    session.user.email === 'bluskyeconsult@gmail.com';
                
                if (isAuthorized) {
                    navigate('/admin/dashboard');
                }
            }
        } catch (err) {
            console.error('Session check error:', err);
        } finally {
            setSessionChecked(true);
        }
    }

    function recordFailedAttempt() {
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        
        // Save to localStorage as fallback
        localStorage.setItem('admin_login_attempts', newAttempts.toString());
        
        if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
            const lockoutExpiry = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
            localStorage.setItem('admin_login_lockout_expiry', lockoutExpiry.toISOString());
            const remainingSeconds = LOCKOUT_DURATION_MINUTES * 60;
            setLockoutTimeRemaining(remainingSeconds);
            setIsLocked(true);
            setError(`Too many failed attempts. Please try again in ${LOCKOUT_DURATION_MINUTES} minutes.`);
        }
        
        // Report failed attempt to API
        apiCall('record-login-attempt', { success: false, email: formData.email }).catch(() => {});
    }

    const handleClearAndRetry = useCallback(() => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/admin-login?cleared=1';
    }, []);

    async function handleSubmit(e) {
        e.preventDefault();
        
        // Reset error on new attempt
        setError('');
        setSuccess('');
        
        // Check if locked
        if (isLocked) {
            setError(`Account temporarily locked. Please try again in ${Math.ceil(lockoutTimeRemaining / 60)} minutes.`);
            return;
        }

        // Validate inputs
        if (!formData.email.trim()) {
            setError('Please enter your email address');
            return;
        }

        if (!formData.password) {
            setError('Please enter your password');
            return;
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
        if (!emailRegex.test(formData.email.trim())) {
            setError('Please enter a valid email address');
            return;
        }

        setLoading(true);

        try {
            // Attempt sign in via Supabase (direct, not through unified API for auth)
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: formData.email.trim(),
                password: formData.password
            });

            if (signInError) {
                recordFailedAttempt();
                if (signInError.message === 'Invalid login credentials') {
                    setError('Invalid email or password');
                } else if (signInError.message.includes('Email not confirmed')) {
                    setError('Please verify your email address before logging in.');
                } else {
                    setError(signInError.message);
                }
                setLoading(false);
                return;
            }

            if (!data.user) {
                recordFailedAttempt();
                setError('Login failed. Please try again.');
                setLoading(false);
                return;
            }

            // Check admin privileges via unified API
            const adminCheck = await apiCall('verify-admin', { userId: data.user.id });
            
            const isAuthorized = adminCheck.data?.isAdmin || 
                                data.user.email === 'bluskyeconsult@gmail.com';

            if (!isAuthorized) {
                recordFailedAttempt();
                setError('Access denied. Admin privileges required.');
                await supabase.auth.signOut();
                setLoading(false);
                return;
            }

            // Reset login attempts on success
            localStorage.removeItem('admin_login_attempts');
            localStorage.removeItem('admin_login_lockout_expiry');
            setLoginAttempts(0);
            
            // Record successful login
            await apiCall('record-login-attempt', { 
                success: true, 
                email: formData.email,
                userId: data.user.id 
            });

            // Show success and redirect
            setSuccess('Login successful! Redirecting to dashboard...');
            setRedirecting(true);
            
            setTimeout(() => {
                navigate('/admin/dashboard');
            }, 800);

        } catch (err) {
            console.error('Admin login error:', err);
            setError(err.message || 'Login failed. Please check your credentials.');
            
            // Check for session corruption
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

    // Format lockout time
    const formatLockoutTime = () => {
        const minutes = Math.floor(lockoutTimeRemaining / 60);
        const seconds = lockoutTimeRemaining % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    if (!sessionChecked) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4 py-12">
            <div className="max-w-md w-full">
                {/* Back to Home Link */}
                <div className="mb-6">
                    <Link 
                        to="/" 
                        className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-all duration-200 text-sm group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Home
                    </Link>
                </div>

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary-500/20 animate-pulse">
                        <Shield className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Admin Login</h1>
                    <p className="text-slate-400">Secure access to ODUSBABA administration panel</p>
                </div>

                {/* Session Cleared Success Message */}
                {success && !redirecting && (
                    <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 animate-fade-in">
                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <p className="text-emerald-400 text-sm">{success}</p>
                    </div>
                )}

                {/* Login Form */}
                <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email Field */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                    placeholder="admin@bluskyeconsult.com"
                                    required
                                    disabled={loading || redirecting || isLocked}
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                                    className="w-full pl-10 pr-10 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
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
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Locked Warning */}
                        {isLocked && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-red-400 text-sm">Too many failed attempts.</p>
                                    <p className="text-red-400/70 text-xs mt-0.5">
                                        Try again in <span className="font-mono">{formatLockoutTime()}</span>
                                    </p>
                                </div>
                                <Clock className="w-4 h-4 text-red-400/50" />
                            </div>
                        )}

                        {/* Error Message */}
                        {error && !isLocked && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-red-400 text-sm">{error}</p>
                                    {showClearButton && (
                                        <button
                                            onClick={handleClearAndRetry}
                                            className="mt-2 text-red-400 underline text-xs hover:text-red-300 transition flex items-center gap-1"
                                        >
                                            <RefreshCw className="w-3 h-3" />
                                            Clear corrupted session and retry
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Redirecting Message */}
                        {redirecting && (
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                                <p className="text-emerald-400 text-sm">Login successful! Redirecting to dashboard...</p>
                            </div>
                        )}

                        {/* Attempts Warning */}
                        {loginAttempts > 0 && loginAttempts < MAX_LOGIN_ATTEMPTS && !redirecting && !isLocked && (
                            <div className="flex items-center justify-center gap-2">
                                <AlertTriangle className="w-3 h-3 text-amber-400" />
                                <p className="text-xs text-amber-400/70">
                                    {MAX_LOGIN_ATTEMPTS - loginAttempts} attempt{MAX_LOGIN_ATTEMPTS - loginAttempts !== 1 ? 's' : ''} remaining
                                </p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || redirecting || isLocked}
                            className="w-full py-2.5 bg-gradient-to-r from-primary-600 to-sky-600 text-white rounded-xl hover:from-primary-700 hover:to-sky-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold shadow-lg shadow-primary-500/20 mt-2"
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

                {/* Security Footer */}
                <div className="mt-6 text-center space-y-2">
                    <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        Secured with industry-standard encryption
                    </p>
                    <p className="text-[10px] text-slate-600">
                        Only authorized administrators can access this panel.
                        Unauthorized access is prohibited and will be logged.
                    </p>
                </div>
            </div>
        </div>
    );
}

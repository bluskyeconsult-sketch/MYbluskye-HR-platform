// src/pages/SignUpPage.jsx - UNIFIED & OPTIMIZED
// ODUSBABA Sign Up Page - Complete with Unified API & Autocomplete

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, AlertCircle, Loader2, CheckCircle, XCircle } from 'lucide-react';

// ============================================
// CONSTANTS
// ============================================

const API_BASE = '/api/index';

// ============================================
// MAIN COMPONENT
// ============================================

export default function SignUpPage() {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        agreeToTerms: false
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState({
        score: 0,
        feedback: []
    });
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    // Check if already logged in
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                navigate('/dashboard');
            }
        };
        checkSession();
    }, [navigate]);

    // Password strength checker
    useEffect(() => {
        const checks = [];
        let score = 0;
        const pwd = formData.password;

        if (pwd.length >= 8) { score++; checks.push('At least 8 characters'); }
        if (/[a-z]/.test(pwd)) { score++; checks.push('Contains lowercase'); }
        if (/[A-Z]/.test(pwd)) { score++; checks.push('Contains uppercase'); }
        if (/[0-9]/.test(pwd)) { score++; checks.push('Contains number'); }
        if (/[^a-zA-Z0-9]/.test(pwd)) { score++; checks.push('Contains special character'); }

        setPasswordStrength({
            score: Math.min(score, 5),
            feedback: checks
        });
    }, [formData.password]);

    // ============================================
    // HANDLE SIGNUP WITH UNIFIED API
    // ============================================

    async function handleSignup(e) {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters');
            setLoading(false);
            return;
        }

        if (!formData.agreeToTerms) {
            setError('Please agree to the Terms of Service');
            setLoading(false);
            return;
        }

        try {
            // ✅ Using unified API for signup
            const response = await fetch(`${API_BASE}?action=sign-up`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    fullName: formData.fullName,
                    userType: 'user'
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Signup failed');
            }

            setSuccess(true);
            setTimeout(() => {
                navigate('/dashboard');
            }, 2000);
        } catch (error) {
            console.error('Signup error:', error);
            setError(error.message || 'Failed to create account. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    // ============================================
    // FALLBACK: DIRECT SUPABASE SIGNUP
    // ============================================

    async function handleSignupFallback(e) {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { error, data } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                        user_type: 'user'
                    }
                }
            });

            if (error) {
                throw new Error(error.message);
            }

            // Create profile
            if (data.user) {
                await supabase.from('profiles').insert({
                    id: data.user.id,
                    full_name: formData.fullName,
                    email: formData.email,
                    user_type: 'user'
                });
            }

            setSuccess(true);
            setTimeout(() => {
                navigate('/dashboard');
            }, 2000);
        } catch (error) {
            console.error('Signup fallback error:', error);
            setError(error.message || 'Failed to create account. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    const handleSubmit = async (e) => {
        try {
            await handleSignup(e);
        } catch (error) {
            console.warn('Unified API signup failed, trying fallback...');
            await handleSignupFallback(e);
        }
    };

    // ============================================
    // RENDER
    // ============================================

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950 px-4">
                <div className="bg-slate-900/50 border border-emerald-500/20 rounded-xl p-8 w-full max-w-md text-center">
                    <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Account Created! 🎉</h2>
                    <p className="text-slate-400">Redirecting you to your dashboard...</p>
                    <Loader2 className="w-6 h-6 text-primary-400 animate-spin mx-auto mt-4" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950 px-4 py-8">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 sm:p-8 w-full max-w-md backdrop-blur-sm">
                {/* Logo */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white">Create Account</h1>
                    <p className="text-slate-400 text-sm mt-1">Join ODUSBABA today</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}

                {/* Signup Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Full Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                            Full Name
                        </label>
                        <input
                            type="text"
                            value={formData.fullName}
                            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                            placeholder="John Doe"
                            autoComplete="name"
                            required
                            disabled={loading}
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                            placeholder="you@example.com"
                            autoComplete="email"
                            required
                            disabled={loading}
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={formData.password}
                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition pr-10"
                                placeholder="••••••••"
                                autoComplete="new-password"  // ← ADDED from Code 2
                                required
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition"
                                tabIndex="-1"
                            >
                                {showPassword ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                        
                        {/* Password Strength Indicator */}
                        {formData.password && (
                            <div className="mt-2">
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((level) => (
                                        <div
                                            key={level}
                                            className={`h-1 flex-1 rounded-full ${
                                                level <= passwordStrength.score
                                                    ? level <= 2
                                                        ? 'bg-red-500'
                                                        : level <= 3
                                                        ? 'bg-amber-500'
                                                        : 'bg-emerald-500'
                                                    : 'bg-slate-700'
                                            }`}
                                        />
                                    ))}
                                </div>
                                <ul className="mt-1.5 space-y-0.5">
                                    {passwordStrength.feedback.map((check, index) => (
                                        <li key={index} className="text-xs text-slate-400 flex items-center gap-1.5">
                                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                                            {check}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                            Confirm Password
                        </label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition pr-10"
                                placeholder="••••••••"
                                autoComplete="new-password"  // ← ADDED from Code 2
                                required
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition"
                                tabIndex="-1"
                            >
                                {showConfirmPassword ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                        {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                            <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                                <XCircle className="w-3 h-3" /> Passwords do not match
                            </p>
                        )}
                    </div>

                    {/* Terms */}
                    <div className="flex items-start gap-2">
                        <input
                            type="checkbox"
                            checked={formData.agreeToTerms}
                            onChange={(e) => setFormData({...formData, agreeToTerms: e.target.checked})}
                            className="w-4 h-4 bg-slate-800 border-slate-700 rounded focus:ring-primary-500 focus:ring-2 mt-1"
                            required
                            disabled={loading}
                        />
                        <label className="text-sm text-slate-400">
                            I agree to the{' '}
                            <Link to="/legal/terms" className="text-primary-400 hover:underline">
                                Terms of Service
                            </Link>
                            {' '}and{' '}
                            <Link to="/legal/privacy" className="text-primary-400 hover:underline">
                                Privacy Policy
                            </Link>
                        </label>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-primary-600 to-sky-600 text-white font-semibold rounded-lg hover:from-primary-700 hover:to-sky-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Creating account...
                            </>
                        ) : (
                            'Create Account'
                        )}
                    </button>
                </form>

                {/* Divider */}
                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-800"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-3 bg-slate-900/50 text-slate-500">or</span>
                    </div>
                </div>

                {/* Sign In Link */}
                <p className="text-center text-slate-400 text-sm">
                    Already have an account?{' '}
                    <Link to="/sign-in" className="text-primary-400 hover:text-primary-300 font-medium transition">
                        Sign In
                    </Link>
                </p>
            </div>
        </div>
    );
}

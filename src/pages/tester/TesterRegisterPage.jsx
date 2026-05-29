// src/pages/tester/TesterRegisterPage.jsx
// COMPLETE PROFESSIONAL TESTER REGISTRATION PAGE - Master invite code system with usage tracking
// Features: Master invite code (TESTER2026), usage tracking, admin panel, password strength, email validation, unified API

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
    FlaskConical, Mail, Lock, User, Loader2, AlertCircle, 
    CheckCircle, Key, Copy, Check, Eye, EyeOff, Shield,
    ArrowLeft, Calendar, Clock, Zap, Award, Sparkles
} from 'lucide-react';

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================

// Master invite code configuration
const MASTER_INVITE_CODE = {
    CODE: 'TESTER2026',
    MAX_USES: 100,
    RESET_INTERVAL_DAYS: 30
};

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;

// Password requirements
const PASSWORD_REQUIREMENTS = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true
};

// Unified API endpoint
const API_BASE = '/api/index';

// Tester benefits
const TESTER_BENEFITS = [
    '10 free uses of ODUSBABA features',
    '30 days of unlimited access',
    'AI Career Chat integration',
    'CV optimization tools',
    'Job matching algorithm',
    'Priority support during testing'
];

// ============================================
// HELPER FUNCTIONS
// ============================================

const validateEmail = (email) => EMAIL_REGEX.test(email);

const validatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= PASSWORD_REQUIREMENTS.minLength) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    return { strength, isValid: strength >= 3 };
};

const getPasswordStrengthText = (strength) => {
    if (strength === 0) return '';
    if (strength === 1) return 'Weak';
    if (strength === 2) return 'Fair';
    if (strength === 3) return 'Good';
    return 'Strong';
};

const getPasswordStrengthColor = (strength) => {
    if (strength <= 1) return 'bg-red-500';
    if (strength === 2) return 'bg-yellow-500';
    if (strength === 3) return 'bg-blue-500';
    return 'bg-green-500';
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function TesterRegisterPage() {
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        full_name: '',
        invite_code: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [inviteCodeStats, setInviteCodeStats] = useState(null);
    const [copied, setCopied] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [requireInviteCode, setRequireInviteCode] = useState(true);
    const [validatingCode, setValidatingCode] = useState(false);
    const [codeValid, setCodeValid] = useState(false);
    const [touchedFields, setTouchedFields] = useState({});

    // Check admin status and load settings
    useEffect(() => {
        checkAdminStatus();
        loadSettings();
        loadInviteCodeStats();
    }, []);

    async function checkAdminStatus() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('user_type')
                    .eq('id', user.id)
                    .single();
                setIsAdmin(profile?.user_type === 'super_admin' || profile?.user_type === 'admin');
            }
        } catch (err) {
            console.error('Error checking admin status:', err);
        }
    }

    async function loadSettings() {
        try {
            const { data } = await supabase
                .from('system_config')
                .select('config_value')
                .eq('config_key', 'tester_visibility')
                .single();
            
            if (data?.config_value) {
                setRequireInviteCode(data.config_value.registration_mode !== 'public');
            }
        } catch (err) {
            console.error('Error loading tester settings:', err);
        }
    }

    async function loadInviteCodeStats() {
        try {
            const { data, error } = await supabase
                .from('tester_invites')
                .select('used_count, max_uses, last_reset')
                .eq('code', MASTER_INVITE_CODE.CODE)
                .single();
            
            if (!error && data) {
                setInviteCodeStats(data);
            } else {
                // Create master invite record if it doesn't exist
                await supabase
                    .from('tester_invites')
                    .insert({
                        code: MASTER_INVITE_CODE.CODE,
                        max_uses: MASTER_INVITE_CODE.MAX_USES,
                        used_count: 0,
                        is_master: true,
                        created_at: new Date().toISOString()
                    });
                setInviteCodeStats({ used_count: 0, max_uses: MASTER_INVITE_CODE.MAX_USES });
            }
        } catch (err) {
            console.error('Error loading invite stats:', err);
        }
    }

    // Step 1: Validate invite code FIRST (before any auth)
    async function validateInviteCode() {
        if (!formData.invite_code.trim()) {
            setError('Invite code is required for tester registration');
            return false;
        }
        
        setValidatingCode(true);
        setError('');
        
        const upperCode = formData.invite_code.toUpperCase().trim();
        
        if (upperCode !== MASTER_INVITE_CODE.CODE) {
            setValidatingCode(false);
            setError('Invalid invite code');
            setCodeValid(false);
            return false;
        }
        
        try {
            const { data, error } = await supabase
                .from('tester_invites')
                .select('used_count, max_uses')
                .eq('code', MASTER_INVITE_CODE.CODE)
                .single();
            
            setValidatingCode(false);
            
            if (error) {
                setCodeValid(true);
                return true;
            }
            
            if (data.used_count >= (data.max_uses || MASTER_INVITE_CODE.MAX_USES)) {
                setError('Invite code has reached maximum usage limit');
                setCodeValid(false);
                return false;
            }
            
            setCodeValid(true);
            return true;
        } catch (err) {
            setValidatingCode(false);
            setError('Error validating invite code');
            setCodeValid(false);
            return false;
        }
    }

    // Increment invite usage
    const incrementInviteUsage = useCallback(async () => {
        if (!inviteCodeStats) return;
        
        setInviteCodeStats(prev => prev ? { ...prev, used_count: prev.used_count + 1 } : prev);
        
        await supabase
            .from('tester_invites')
            .update({ used_count: (inviteCodeStats.used_count || 0) + 1 })
            .eq('code', MASTER_INVITE_CODE.CODE);
    }, [inviteCodeStats]);

    // Reset invite code usage (admin only)
    async function resetInviteCodeUsage() {
        if (!isAdmin) return;
        
        const { error } = await supabase
            .from('tester_invites')
            .update({
                used_count: 0,
                last_reset: new Date().toISOString()
            })
            .eq('code', MASTER_INVITE_CODE.CODE);
        
        if (!error) {
            await loadInviteCodeStats();
            setSuccess('Invite code usage has been reset');
            setTimeout(() => setSuccess(''), 3000);
        }
    }

    // Copy invite code
    const copyInviteCode = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(MASTER_INVITE_CODE.CODE);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }, []);

    // Send welcome email via unified API
    async function sendWelcomeEmail(email, fullName) {
        try {
            await fetch(`${API_BASE}?action=email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: email,
                    subject: 'Welcome to ODUSBABA Tester Program!',
                    template: 'tester_welcome',
                    data: { 
                        fullName, 
                        testerDays: 30,
                        testerUses: 10,
                        inviteCode: MASTER_INVITE_CODE.CODE,
                        dashboardUrl: 'https://www.bluskyeconsult.com/tester-dashboard',
                        benefits: TESTER_BENEFITS
                    }
                })
            });
        } catch (err) {
            console.warn('Welcome email notification failed:', err);
        }
    }

    // Handle registration
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        setError('');
        
        // First, validate the invite code
        const isValid = await validateInviteCode();
        if (!isValid) return;
        
        if (!validateEmail(formData.email)) {
            setError('Please enter a valid email address');
            return;
        }
        
        const { isValid: isPasswordValid, strength } = validatePasswordStrength(formData.password);
        if (!isPasswordValid) {
            setError('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
            return;
        }
        setPasswordStrength(strength);
        
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        
        if (requireInviteCode && !formData.invite_code) {
            setError('Invite code is required to register as a tester');
            return;
        }
        
        setLoading(true);
        
        try {
            // Increment usage counter
            await incrementInviteUsage();
            
            // Register user
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.full_name,
                        user_type: 'tester',
                        is_tester: true,
                        registered_at: new Date().toISOString(),
                        registered_with: 'master_invite_code'
                    }
                }
            });
            
            if (signUpError) throw signUpError;
            if (!authData.user) throw new Error('Registration failed');
            
            // Set tester expiry (30 days)
            const testerExpiry = new Date();
            testerExpiry.setDate(testerExpiry.getDate() + 30);
            
            // Update profile
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    user_type: 'tester',
                    is_tester: true,
                    tester_expires_at: testerExpiry.toISOString(),
                    tier: 'free',
                    full_name: formData.full_name,
                    country_code: 'GB',
                    updated_at: new Date().toISOString(),
                    ai_credits_remaining: 10,
                    va_credits_balance: 10
                })
                .eq('id', authData.user.id);
            
            if (profileError) {
                console.warn('Profile update warning:', profileError);
            }
            
            // Create tester allocation
            await supabase
                .from('tester_allocations')
                .insert({
                    user_id: authData.user.id,
                    allocated_uses: 10,
                    used_uses: 0,
                    remaining_uses: 10,
                    expires_at: testerExpiry.toISOString(),
                    status: 'active',
                    created_at: new Date().toISOString()
                });
            
            // Send welcome email (non-blocking)
            sendWelcomeEmail(formData.email, formData.full_name);
            
            setSuccess(true);
            setTimeout(() => navigate('/tester-login'), 3000);
            
        } catch (err) {
            console.error('Registration error:', err);
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [formData, requireInviteCode, incrementInviteUsage, navigate]);

    const handleFieldBlur = (field) => {
        setTouchedFields(prev => ({ ...prev, [field]: true }));
    };

    const { isValid: isPasswordValid, strength } = validatePasswordStrength(formData.password);
    const isEmailValid = touchedFields.email ? validateEmail(formData.email) : true;
    const doPasswordsMatch = touchedFields.confirmPassword ? formData.password === formData.confirmPassword : true;

    if (success) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
                <div className="max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Tester Registration Successful!</h1>
                    <p className="text-slate-400 mb-4">
                        You now have 10 free uses for 30 days. A confirmation email has been sent to your inbox.
                    </p>
                    <p className="text-slate-500 text-sm">Redirecting to login...</p>
                </div>
            </div>
        );
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
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/20">
                        <FlaskConical className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Become a Tester</h1>
                    <p className="text-slate-400 mt-2">Get 10 free uses for 30 days</p>
                </div>

                {/* Admin: Master Invite Code Panel */}
                {isAdmin && inviteCodeStats && (
                    <div className="mb-6 p-4 bg-purple-600/10 border border-purple-500/20 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-purple-400 flex items-center gap-2">
                                <Shield className="w-4 h-4" />
                                Master Invite Code
                            </span>
                            <span className="text-xs text-slate-500">
                                Used: {inviteCodeStats.used_count || 0} / {MASTER_INVITE_CODE.MAX_USES}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 px-3 py-2 bg-slate-800 rounded-lg text-purple-400 font-mono text-sm text-center">
                                {MASTER_INVITE_CODE.CODE}
                            </code>
                            <button
                                onClick={copyInviteCode}
                                className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
                                title="Copy invite code"
                            >
                                {copied ? (
                                    <Check className="w-4 h-4 text-emerald-400" />
                                ) : (
                                    <Copy className="w-4 h-4 text-slate-400" />
                                )}
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            Share this code with potential testers. Max {MASTER_INVITE_CODE.MAX_USES} uses.
                        </p>
                        {inviteCodeStats.used_count >= MASTER_INVITE_CODE.MAX_USES && (
                            <div className="mt-3">
                                <p className="text-xs text-red-400 mb-2">⚠️ Usage limit reached.</p>
                                <button
                                    onClick={resetInviteCodeUsage}
                                    className="w-full px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-500 transition-colors"
                                >
                                    Reset Usage Counter
                                </button>
                            </div>
                        )}
                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                            <Calendar className="w-3 h-3" />
                            Resets every {MASTER_INVITE_CODE.RESET_INTERVAL_DAYS} days
                        </div>
                    </div>
                )}

                {/* Registration Form */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Invite Code */}
                        {requireInviteCode && (
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">
                                    Invite Code <span className="text-red-400">*</span>
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={formData.invite_code}
                                        onChange={(e) => setFormData({...formData, invite_code: e.target.value.toUpperCase()})}
                                        className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                                        placeholder="TESTER2026"
                                        required={requireInviteCode}
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={validateInviteCode}
                                        disabled={validatingCode || loading}
                                        className="px-4 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 transition flex items-center gap-1"
                                    >
                                        {validatingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                        {validatingCode ? 'Checking...' : 'Check'}
                                    </button>
                                </div>
                                {codeValid && (
                                    <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" /> Valid invite code
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Full Name */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                                Full Name <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                                    onBlur={() => handleFieldBlur('full_name')}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                                    placeholder="John Doe"
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                                Email Address <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    onBlur={() => handleFieldBlur('email')}
                                    className={`w-full pl-10 pr-4 py-2.5 bg-slate-800 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition ${
                                        touchedFields.email && !isEmailValid ? 'border-red-500' : 'border-slate-700'
                                    }`}
                                    placeholder="you@example.com"
                                    required
                                    disabled={loading}
                                />
                            </div>
                            {touchedFields.email && !isEmailValid && (
                                <p className="text-xs text-red-400 mt-1">Please enter a valid email address</p>
                            )}
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                                Password <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={(e) => {
                                        setFormData({...formData, password: e.target.value});
                                        const { strength: newStrength } = validatePasswordStrength(e.target.value);
                                        setPasswordStrength(newStrength);
                                    }}
                                    onBlur={() => handleFieldBlur('password')}
                                    className="w-full pl-10 pr-10 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                                    placeholder="••••••••"
                                    required
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            
                            {/* Password Strength */}
                            {formData.password && (
                                <div className="mt-2">
                                    <div className="flex gap-1 h-1.5 mb-1">
                                        {[1, 2, 3, 4].map((level) => (
                                            <div 
                                                key={level}
                                                className={`flex-1 rounded-full transition-all ${
                                                    level <= passwordStrength ? getPasswordStrengthColor(passwordStrength) : 'bg-slate-700'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        Strength: {getPasswordStrengthText(passwordStrength)}
                                    </p>
                                    {touchedFields.password && !isPasswordValid && (
                                        <p className="text-xs text-red-400 mt-1">
                                            Password must have at least 8 characters, uppercase, lowercase, number, and special character
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                                Confirm Password <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                                    onBlur={() => handleFieldBlur('confirmPassword')}
                                    className={`w-full pl-10 pr-4 py-2.5 bg-slate-800 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition ${
                                        touchedFields.confirmPassword && !doPasswordsMatch ? 'border-red-500' : 'border-slate-700'
                                    }`}
                                    placeholder="••••••••"
                                    required
                                    disabled={loading}
                                />
                            </div>
                            {touchedFields.confirmPassword && !doPasswordsMatch && (
                                <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                            )}
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Tester Benefits Box */}
                        <div className="p-4 bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-500/30 rounded-lg">
                            <div className="flex items-center gap-2 mb-3">
                                <Award className="w-4 h-4 text-purple-400" />
                                <span className="text-xs font-medium text-purple-400">What You Get:</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {TESTER_BENEFITS.map((benefit, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-400">
                                        <Sparkles className="w-3 h-3 text-purple-400" />
                                        {benefit}
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 pt-2 border-t border-purple-500/20 flex items-center justify-between text-xs">
                                <span className="text-slate-500">⏱️ Expires in 30 days</span>
                                <span className="text-slate-500">🎯 10 free uses included</span>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || (requireInviteCode && !codeValid)}
                            className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-500 hover:to-indigo-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium shadow-lg shadow-purple-500/20"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Registering...
                                </>
                            ) : (
                                <>
                                    <FlaskConical className="w-4 h-4" />
                                    Register as Tester
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <p className="text-center text-sm text-slate-500 mt-6">
                        Already a tester?{' '}
                        <Link to="/tester-login" className="text-purple-400 hover:underline transition">
                            Sign In
                        </Link>
                    </p>
                    <p className="text-center text-xs text-slate-600 mt-4">
                        By registering, you agree to our testing program terms and conditions
                    </p>
                </div>
            </div>
        </div>
    );
}

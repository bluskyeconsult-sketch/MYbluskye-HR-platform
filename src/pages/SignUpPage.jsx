// src/pages/SignUpPage.jsx
// ODUSBABA SIGNUP PAGE v4.0 - PRODUCTION READY
// ✅ Complete professional signup with tier selection
// ✅ Password strength meter, email validation
// ✅ Tester mode integration with database sync
// ✅ Company profiles for employers
// ✅ Unified API for email notifications

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
    UserPlus, Mail, Lock, User, Loader2, AlertCircle, 
    CheckCircle, Briefcase, Building2, Sparkles, Star, 
    Eye, EyeOff, ArrowLeft, Shield, Zap, Crown, Users
} from 'lucide-react';

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================

// Map tiers to correct user_type values (matching database constraint)
const TIER_TO_USER_TYPE_MAP = {
    'free': 'job_seeker',
    'registered': 'job_seeker', 
    'professional': 'job_seeker',
    'employer': 'employer',
    'business': 'business_owner'
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

export default function SignUpPage() {
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        full_name: '',
        selectedTier: 'free',
        company_name: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [testingMode, setTestingMode] = useState(null);
    const [testingConfig, setTestingConfig] = useState({
        enabled: false,
        default_tester_days: 30,
        default_tester_uses: 10
    });
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [touchedFields, setTouchedFields] = useState({});

    // Tiers configuration
    const tiers = [
        { 
            id: 'free', 
            name: 'Free', 
            price: '$0', 
            description: 'Browse jobs only',
            features: ['Job browsing', 'Basic profile', 'Company listings'],
            requiresPayment: false,
            redirect: '/dashboard',
            icon: User,
            color: 'slate'
        },
        { 
            id: 'registered', 
            name: 'Registered', 
            price: '$0', 
            description: 'Apply to jobs, submit skills',
            features: ['Job applications', 'Skill submission', 'Job alerts'],
            requiresPayment: false,
            redirect: '/dashboard',
            icon: UserPlus,
            color: 'blue'
        },
        { 
            id: 'professional', 
            name: 'Professional', 
            price: '$39.99', 
            description: 'Unlimited applications, AI features',
            features: ['Unlimited applications', 'AI resume review', 'Priority support'],
            requiresPayment: true,
            redirect: '/dashboard',
            icon: Star,
            color: 'purple'
        },
        { 
            id: 'employer', 
            name: 'Employer', 
            price: '$129.99', 
            description: 'Post jobs, view applicants',
            features: ['Job posting', 'Applicant tracking', 'Company branding'],
            requiresPayment: true,
            redirect: '/employer/dashboard',
            icon: Briefcase,
            color: 'emerald'
        },
        { 
            id: 'business', 
            name: 'Business', 
            price: '$399.99', 
            description: 'Unlimited jobs, team accounts',
            features: ['Unlimited jobs', '5 team accounts', 'API access', 'Dedicated support'],
            requiresPayment: true,
            redirect: '/employer/dashboard',
            icon: Building2,
            color: 'amber'
        }
    ];

    // Check testing mode on load (direct database check)
    useEffect(() => {
        checkTestingMode();
    }, []);

    async function checkTestingMode() {
        try {
            // Direct database check for testing mode
            const { data, error } = await supabase
                .from('system_config')
                .select('config_value')
                .eq('config_key', 'testing_mode')
                .maybeSingle();
            
            if (error) throw error;
            
            const isTestingMode = data?.config_value === 'enabled';
            setTestingMode(isTestingMode);
            
            // Also check localStorage fallback
            if (!data && localStorage.getItem('testing_mode') === 'enabled') {
                setTestingMode(true);
            }
        } catch (err) {
            console.error('Error checking testing mode:', err);
            // Fallback to localStorage
            const saved = localStorage.getItem('testing_mode');
            setTestingMode(saved === 'enabled');
        }
    }

    // Send welcome email via unified API
    async function sendWelcomeEmail(email, fullName, userType, isTestingMode) {
        try {
            await fetch(`${API_BASE}?action=email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: email,
                    type: isTestingMode ? 'tester_welcome' : 'welcome',
                    templateData: { 
                        name: fullName, 
                        userType,
                        uses: testingConfig.default_tester_uses,
                        days: testingConfig.default_tester_days
                    }
                })
            });
        } catch (err) {
            console.warn('Email notification failed:', err);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validation
        if (!validateEmail(formData.email)) {
            setError('Please enter a valid email address');
            setLoading(false);
            return;
        }
        
        const { isValid, strength } = validatePasswordStrength(formData.password);
        if (!isValid) {
            setError('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
            setLoading(false);
            return;
        }
        setPasswordStrength(strength);
        
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        try {
            // Re-check testing mode status (fresh from database)
            const { data: modeData, error: modeError } = await supabase
                .from('system_config')
                .select('config_value')
                .eq('config_key', 'testing_mode')
                .maybeSingle();
            
            const isTestingMode = modeData?.config_value === 'enabled';
            
            // Determine user type based on testing mode
            let userType;
            let tier;
            
            if (isTestingMode) {
                userType = 'tester';
                tier = 'free';
            } else {
                userType = TIER_TO_USER_TYPE_MAP[formData.selectedTier] || 'job_seeker';
                tier = formData.selectedTier;
            }

            // Create auth user
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.full_name,
                        user_type: userType,
                        tier: tier,
                        company_name: isTestingMode ? null : formData.company_name,
                        is_tester: isTestingMode || false,
                        registered_at: new Date().toISOString()
                    }
                }
            });

            if (signUpError) throw signUpError;
            if (!authData.user) throw new Error('User creation failed');

            // Create profile (fallback if trigger doesn't fire)
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: authData.user.id,
                    email: formData.email,
                    full_name: formData.full_name,
                    user_type: userType,
                    tier: tier,
                    country_code: 'GB',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    ai_credits_remaining: isTestingMode ? testingConfig.default_tester_uses : 5,
                    va_credits_balance: isTestingMode ? testingConfig.default_tester_uses : 0
                });

            if (profileError) {
                console.warn('Profile creation warning:', profileError);
            }

            // Create company profile for employers (non-testing mode)
            if (!isTestingMode && (formData.selectedTier === 'employer' || formData.selectedTier === 'business')) {
                await supabase.from('company_profiles').upsert({
                    user_id: authData.user.id,
                    company_name: formData.company_name || 'My Company',
                    industry: null,
                    size: null,
                    created_at: new Date().toISOString()
                });
            }

            // If tester mode, create tester allocation
            if (isTestingMode) {
                const testerExpiry = new Date();
                testerExpiry.setDate(testerExpiry.getDate() + testingConfig.default_tester_days);
                
                await supabase
                    .from('tester_allocations')
                    .upsert({
                        user_id: authData.user.id,
                        allocated_uses: testingConfig.default_tester_uses,
                        used_uses: 0,
                        remaining_uses: testingConfig.default_tester_uses,
                        expires_at: testerExpiry.toISOString(),
                        status: 'active'
                    });
            }

            // Send welcome email (non-blocking)
            sendWelcomeEmail(formData.email, formData.full_name, userType, isTestingMode);

            setSuccess(true);
            
            // Auto redirect after 3 seconds
            setTimeout(() => {
                if (isTestingMode) {
                    navigate('/tester-login');
                } else {
                    const selected = tiers.find(t => t.id === formData.selectedTier);
                    if (selected?.requiresPayment) {
                        navigate('/pricing', { state: { selectedTier: formData.selectedTier } });
                    } else {
                        navigate('/sign-in');
                    }
                }
            }, 3000);

        } catch (err) {
            console.error('Signup error:', err);
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    const handleFieldBlur = (field) => {
        setTouchedFields(prev => ({ ...prev, [field]: true }));
    };

    // Loading state
    if (testingMode === null) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    // Success state
    if (success) {
        const selected = tiers.find(t => t.id === formData.selectedTier);
        const isTester = testingMode;
        
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
                <div className="max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Registration Successful!</h1>
                    <p className="text-slate-400 mb-4">
                        {isTester 
                            ? `Your tester account has been created. You now have ${testingConfig.default_tester_uses} free uses for ${testingConfig.default_tester_days} days.`
                            : selected?.requiresPayment 
                                ? `Please complete payment for ${selected.name} plan (${selected.price}/month) to activate your account.`
                                : 'Your account has been created. Please check your email to verify your account.'}
                    </p>
                    <p className="text-slate-500 text-sm">Redirecting to {isTester ? 'tester login' : 'sign in'}...</p>
                </div>
            </div>
        );
    }

    const { isValid: isPasswordValid, strength } = validatePasswordStrength(formData.password);
    const isEmailValid = touchedFields.email ? validateEmail(formData.email) : true;
    const doPasswordsMatch = touchedFields.confirmPassword ? formData.password === formData.confirmPassword : true;

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
            <div className="max-w-2xl w-full">
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
                        <UserPlus className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Create Account</h1>
                    <p className="text-slate-400 mt-2">
                        {testingMode 
                            ? '🎁 Tester registration is open! Get 10 free uses.'
                            : 'Join ODUSBABA to start your career journey'}
                    </p>
                </div>

                {/* Testing Mode Banner */}
                {testingMode && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-500/30 rounded-lg">
                        <p className="text-purple-400 text-sm text-center flex items-center justify-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            <strong>Tester Mode Active</strong> - You will get {testingConfig.default_tester_uses} free uses for {testingConfig.default_tester_days} days
                        </p>
                    </div>
                )}

                {/* Sign Up Form */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
                    <form onSubmit={handleSubmit} className="space-y-4">
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
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
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
                                    className={`w-full pl-10 pr-4 py-2.5 bg-slate-800 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition ${
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
                                    className="w-full pl-10 pr-10 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
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
                            
                            {/* Password Strength Indicator */}
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
                                        Password strength: {getPasswordStrengthText(passwordStrength)}
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
                                    className={`w-full pl-10 pr-4 py-2.5 bg-slate-800 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition ${
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

                        {/* Company Name (Employer/Business only) */}
                        {!testingMode && (formData.selectedTier === 'employer' || formData.selectedTier === 'business') && (
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">
                                    Company Name <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        value={formData.company_name}
                                        onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                                        placeholder="Your company name"
                                        required={formData.selectedTier === 'employer' || formData.selectedTier === 'business'}
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Tier Selection (non-testing mode only) */}
                        {!testingMode && (
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-3">Select your plan</label>
                                <div className="space-y-3">
                                    {tiers.map(tier => {
                                        const Icon = tier.icon;
                                        const isSelected = formData.selectedTier === tier.id;
                                        return (
                                            <label 
                                                key={tier.id} 
                                                className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${
                                                    isSelected 
                                                        ? `border-${tier.color}-500 bg-${tier.color}-500/10` 
                                                        : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                                                }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <input
                                                        type="radio"
                                                        name="tier"
                                                        value={tier.id}
                                                        checked={isSelected}
                                                        onChange={() => setFormData({...formData, selectedTier: tier.id})}
                                                        className="w-4 h-4 text-primary-500"
                                                    />
                                                    <div className={`w-8 h-8 rounded-lg bg-${tier.color}-500/10 flex items-center justify-center`}>
                                                        <Icon className={`w-4 h-4 text-${tier.color}-400`} />
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-white">{tier.name}</div>
                                                        <div className="text-sm text-slate-400">{tier.description}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-primary-400">{tier.price}</div>
                                                    {tier.id === 'business' && <div className="text-xs text-slate-500">/month</div>}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Info Box showing user_type mapping */}
                        {!testingMode && (
                            <div className="p-3 bg-slate-800/30 border border-slate-700 rounded-lg">
                                <p className="text-xs text-slate-400 text-center">
                                    Account type will be: <span className="text-primary-400 font-medium">
                                        {TIER_TO_USER_TYPE_MAP[formData.selectedTier] || 'job_seeker'}
                                    </span>
                                </p>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 bg-gradient-to-r from-primary-600 to-sky-600 text-white rounded-lg hover:from-primary-700 hover:to-sky-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium shadow-lg shadow-primary-500/20"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating Account...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-4 h-4" />
                                    {testingMode ? 'Register as Tester' : 'Sign Up'}
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer Links */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-slate-500">
                            Already have an account?{' '}
                            <Link to="/sign-in" className="text-primary-400 hover:underline transition">
                                Sign In
                            </Link>
                        </p>
                        <p className="text-xs text-slate-600 mt-4">
                            By signing up, you agree to our{' '}
                            <Link to="/legal/terms" className="text-primary-400 hover:underline">Terms of Service</Link>
                            {' '}and{' '}
                            <Link to="/legal/privacy" className="text-primary-400 hover:underline">Privacy Policy</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

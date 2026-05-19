// src/pages/SignUpPage.jsx
// COMPLETE SIGNUP PAGE - Handles tier selection, tester mode, profile creation, and RLS policies
// FIXED: Correct user_type mapping to match database constraint with proper error handling

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { UserPlus, Mail, Lock, User, Loader2, AlertCircle, CheckCircle, Briefcase, Building2, Sparkles, Star, Eye, EyeOff } from 'lucide-react';

// Map tiers to correct user_type values (matching database constraint)
const TIER_TO_USER_TYPE_MAP = {
    'free': 'job_seeker',
    'registered': 'job_seeker', 
    'professional': 'job_seeker',
    'employer': 'employer',
    'business': 'business_owner'
};

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

    // Tiers configuration with display info
    const tiers = [
        { 
            id: 'free', 
            name: 'Free', 
            price: '$0', 
            description: 'Browse jobs only',
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
            requiresPayment: true,
            redirect: '/employer/dashboard',
            icon: Briefcase,
            color: 'emerald'
        },
        { 
            id: 'business', 
            name: 'Business', 
            price: '$399.99', 
            description: 'Unlimited jobs, team accounts (5 users)',
            requiresPayment: true,
            redirect: '/employer/dashboard',
            icon: Building2,
            color: 'amber'
        }
    ];

    // Check testing mode on load
    useEffect(() => {
        checkTestingMode();
    }, []);

    async function checkTestingMode() {
        const { data } = await supabase
            .from('system_config')
            .select('config_value')
            .eq('config_key', 'testing_mode')
            .single();
        
        if (data?.config_value === 'enabled') {
            setTestingMode(true);
            setTestingConfig(prev => ({ ...prev, enabled: true }));
        } else {
            setTestingMode(false);
        }
    }

    // Password validation
    const validatePassword = (password) => {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
        if (password.match(/[0-9]/)) strength++;
        if (password.match(/[^a-zA-Z0-9]/)) strength++;
        setPasswordStrength(strength);
        return strength >= 3;
    };

    // Email validation
    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
        return emailRegex.test(email);
    };

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
        
        if (!validatePassword(formData.password)) {
            setError('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
            setLoading(false);
            return;
        }
        
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        try {
            const selected = tiers.find(t => t.id === formData.selectedTier);
            
            // Use the correct user_type mapping
            let userType;
            let tier;
            
            if (testingMode) {
                userType = 'job_seeker';  // Testers are job seekers
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
                        company_name: testingMode ? null : formData.company_name,
                        is_tester: testingMode || false
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
                    ai_credits_remaining: 5,
                    va_credits_balance: testingMode ? 10 : 0
                });

            if (profileError) {
                console.warn('Profile creation warning:', profileError);
            }

            // Create company profile for employers (non-testing mode)
            if (!testingMode && (formData.selectedTier === 'employer' || formData.selectedTier === 'business')) {
                await supabase.from('company_profiles').upsert({
                    user_id: authData.user.id,
                    company_name: formData.company_name || 'My Company',
                    created_at: new Date().toISOString()
                });
            }

            // If tester mode, create tester allocation
            if (testingMode) {
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

            setSuccess(true);
            
            // Auto redirect after 3 seconds
            setTimeout(() => {
                if (testingMode) {
                    navigate('/tester-login');
                } else if (selected.requiresPayment) {
                    navigate('/pricing');
                } else {
                    navigate('/sign-in');
                }
            }, 3000);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    // Password strength text
    const passwordStrengthText = () => {
        if (passwordStrength === 0) return '';
        if (passwordStrength === 1) return 'Weak';
        if (passwordStrength === 2) return 'Fair';
        if (passwordStrength === 3) return 'Good';
        return 'Strong';
    };

    const passwordStrengthColor = () => {
        if (passwordStrength <= 1) return 'bg-red-500';
        if (passwordStrength === 2) return 'bg-yellow-500';
        if (passwordStrength === 3) return 'bg-blue-500';
        return 'bg-green-500';
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
                            : selected.requiresPayment 
                                ? `Please complete payment for ${selected.name} plan (${selected.price}/month) to activate your account.`
                                : 'Your account has been created. Please check your email to verify your account.'}
                    </p>
                    <p className="text-slate-500 text-sm">Redirecting...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
            <div className="max-w-2xl w-full">
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
                    <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                        <p className="text-purple-400 text-sm text-center flex items-center justify-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            <strong>Tester Mode Active</strong> - You will get {testingConfig.default_tester_uses} free uses for {testingConfig.default_tester_days} days
                        </p>
                    </div>
                )}

                {/* Sign Up Form */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Full Name */}
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={(e) => {
                                        setFormData({...formData, password: e.target.value});
                                        validatePassword(e.target.value);
                                    }}
                                    className="w-full pl-10 pr-10 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
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
                                                    level <= passwordStrength ? passwordStrengthColor() : 'bg-slate-700'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        Password strength: {passwordStrengthText()}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                                <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                            )}
                        </div>

                        {/* Company Name (Employer/Business only) */}
                        {!testingMode && (formData.selectedTier === 'employer' || formData.selectedTier === 'business') && (
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Company Name</label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        value={formData.company_name}
                                        onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                        placeholder="Your company name"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Tier Selection (non-testing mode only) */}
                        {!testingMode && (
                            <div>
                                <label className="block text-sm text-slate-400 mb-3">Select your plan</label>
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
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-red-400" />
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                            {loading ? 'Creating Account...' : testingMode ? 'Register as Tester' : 'Sign Up'}
                        </button>
                    </form>

                    {/* Footer Links */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-slate-500">
                            Already have an account?{' '}
                            <Link to="/sign-in" className="text-primary-400 hover:underline">
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

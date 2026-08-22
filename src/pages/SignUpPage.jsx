// src/pages/SignUpPage.jsx
// ODUSBABA SIGNUP PAGE v4.2 - PRODUCTION READY
// ✅ Complete professional signup with tier selection
// ✅ Password strength meter, email validation
// ✅ Tester mode integration with database sync
// ✅ Company profiles for employers
// ✅ Unified API for email notifications
//
// FIXED (2026-08-07): credits were being written to `profiles.ai_credits_remaining`
// and `profiles.va_credits_balance` — columns the real credit system never reads.
// The confirmed real credit system (GovernanceContext.jsx, api/index.js's
// va-credits handler) keeps credits in a separate `va_credits` table with a
// `balance` column keyed by user_id. New users previously got no va_credits row
// at all until something else lazily created one. Now creates it directly here,
// with the same default balances the va-credits handler already uses elsewhere
// (free:5, registered:10, professional:25, employer:20, tester:10), so a new
// user's credit balance is correct immediately.
//
// CHANGED (2026-08-07): paid tiers (Professional/Employer/Business) no longer
// grant real capabilities at signup. Since Stripe isn't live yet, selecting a
// paid tier previously set profiles.tier immediately, giving full paid-tier
// capabilities via GovernanceContext.jsx with no payment ever happening. Now:
// the account is created at a safe 'registered' tier instead, the user is still
// redirected to /pricing to complete payment, and only testing mode or an
// explicit promo_mode toggle (new — mirrors the existing testing_mode pattern,
// flip it in system_config to run a promotion) grants the requested tier
// immediately. Admin accounts are never created through this public signup form
// at all — that carve-out is structural, not something this file needs to handle.
// TODO (Stage 3 / Stripe integration): once payment exists, upgrade profiles.tier
// to the originally-requested tier after payment confirmation, rather than
// leaving paid-tier signups permanently on 'registered'.
//
// REBUILT (2026-08-21): the tester system, per ODUSBABA's explicit design —
//
//   testing_mode OFF -> unchanged, exactly the behavior above.
//   testing_mode ON  -> signup requires a valid invite code (new — previously
//     testing_mode alone let ANYONE register as a tester, no code needed at
//     all). The person still picks a real tier and gets THAT tier's real
//     capabilities (previously this branch forced everyone to
//     userType='tester', tier='free', discarding whichever tier they'd
//     selected — so a tester could never actually test the employer or
//     business experience). Paid tiers are granted immediately during
//     testing mode, same as promo_mode already does, since a tester isn't
//     expected to pay. A separate is_tester flag marks the account so a
//     hard, tier-independent OpenAI usage cap applies (enforced in
//     va-execute via tester_allocations — see tester-system-setup.sql) —
//     someone testing at 'business' tier doesn't get business-tier request
//     volume just because they're testing.
//
// FIXED (2026-08-21): tester_allocations was being written by two
// different paths with incompatible key columns — the admin's
// tester-create action keys by email (pre-allocating before the person
// has an account), this signup flow keys by user_id (once it exists).
// Initially treated tester-create as effectively superseded under the
// new shared-code model, since there's no single "specific person" to
// pre-approve when anyone with a code can become a tester — but the
// confirmed real schema shows tester_allocations genuinely has both
// columns, meaning the two paths were meant to reconcile with each
// other, not compete. Now does: on signup, check for a still-valid,
// unclaimed pre-allocation matching this email first, and attach this
// account to it (preserving whatever custom allowance the admin set)
// rather than leaving it permanently orphaned. tester-create remains a
// real, intentional feature — for giving a specific person a deliberate,
// non-default allocation ahead of time — rather than dead code.
//
// FIXED (2026-08-21): testingConfig.default_tester_uses / default_tester_days
// were never actually fetched from anywhere — decorative state permanently
// stuck on its hardcoded initial defaults (10 uses / 30 days) no matter what
// an admin configured. Now fetched for real from system_config
// (tester_ai_call_cap / tester_access_days) alongside the testing_mode check.

import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
    UserPlus, Mail, Lock, User, Loader2, AlertCircle, 
    CheckCircle, Briefcase, Building2, Sparkles, Star, 
    Eye, EyeOff, ArrowLeft, KeyRound
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

// Default VA credit balances by tier — matches api/index.js's va-credits handler
// so a new user's balance is correct from the moment they sign up. Used for
// every account, tester or not — a tester's OpenAI usage cap is enforced
// separately via tester_allocations, not by this number.
const TIER_DEFAULT_CREDITS = {
    free: 5,
    registered: 10,
    professional: 25,
    employer: 20,
    business: 20
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
    // NEW (2026-08-16): referral capture — closes the affiliate program
    // loop. Nothing previously read the ?ref= param at all, so referred
    // signups were never attributed to the affiliate who sent them.
    const [searchParams] = useSearchParams();
    const referralCode = searchParams.get('ref');
    
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
    // REBUILT (2026-08-21): these now come from real system_config reads
    // (see checkTestingMode below) instead of sitting permanently on their
    // hardcoded initial values.
    const [testingConfig, setTestingConfig] = useState({
        aiCallCap: 15,
        accessDays: 30
    });
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [touchedFields, setTouchedFields] = useState({});
    // NEW: tracks whether the account was created at a lower tier than requested
    // because payment isn't wired up yet, so the success screen can say so accurately.
    const [tierDowngraded, setTierDowngraded] = useState(false);

    // NEW (2026-08-21): invite code state — required input during testing_mode.
    const [inviteCode, setInviteCode] = useState('');
    const [codeError, setCodeError] = useState('');
    // NEW (2026-08-21): reads TesterVisibilitySettings.jsx's real
    // require_invite_code config key (that admin page already writes this
    // to system_config, but per its own header comment, nothing anywhere
    // previously read it back — toggling it had no visible effect on the
    // site at all). Defaults true, matching that page's own default state.
    const [requireInviteCode, setRequireInviteCode] = useState(true);

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

            // NEW (2026-08-21): fetch the real, admin-configurable tester
            // cap values — these were previously never read at all.
            //
            // FIXED (2026-08-22): require_invite_code was being queried as
            // its own top-level config_key — but TesterVisibilitySettings.jsx
            // actually stores it NESTED inside a single row's JSON value
            // (config_key: 'tester_visibility', config_value: { ...,
            // require_invite_code, ... }). The flat-key query above always
            // returned nothing, so this silently fell back to its default
            // (true) regardless of what the admin actually configured —
            // meaning the toggle this was specifically built to respect
            // never actually worked. Now reads the correct nested shape.
            if (isTestingMode) {
                const [{ data: capData }, { data: daysData }, { data: visibilityData }] = await Promise.all([
                    supabase.from('system_config').select('config_value').eq('config_key', 'tester_ai_call_cap').maybeSingle(),
                    supabase.from('system_config').select('config_value').eq('config_key', 'tester_access_days').maybeSingle(),
                    supabase.from('system_config').select('config_value').eq('config_key', 'tester_visibility').maybeSingle()
                ]);

                setTestingConfig({
                    aiCallCap: capData?.config_value ? parseInt(capData.config_value, 10) : 15,
                    accessDays: daysData?.config_value ? parseInt(daysData.config_value, 10) : 30
                });

                // Default true (matching TesterVisibilitySettings.jsx's own
                // default) if the row hasn't been saved yet at all.
                const visibilitySettings = visibilityData?.config_value;
                setRequireInviteCode(visibilitySettings?.require_invite_code !== false);
            }
        } catch (err) {
            console.error('Error checking testing mode:', err);
            // Fallback to localStorage
            const saved = localStorage.getItem('testing_mode');
            setTestingMode(saved === 'enabled');
        }
    }

    // NEW: checks the promo_mode toggle in system_config — same pattern as
    // testing_mode. When enabled, paid tiers are granted immediately without
    // payment, for running a promotion. Defaults to disabled/false if the key
    // doesn't exist, so this is safe even before anyone sets it up.
    async function checkPromoMode() {
        try {
            const { data, error } = await supabase
                .from('system_config')
                .select('config_value')
                .eq('config_key', 'promo_mode')
                .maybeSingle();
            
            if (error) throw error;
            return data?.config_value === 'enabled';
        } catch (err) {
            console.warn('Error checking promo mode (defaulting to disabled):', err);
            return false;
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
                        uses: testingConfig.aiCallCap,
                        days: testingConfig.accessDays
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
        setCodeError('');

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

            // NEW (2026-08-21): invite code is required to proceed at all
            // only when testing mode AND the admin-configurable
            // require_invite_code toggle (TesterVisibilitySettings.jsx)
            // are both true. Validated against the real backend action
            // (checks the code atomically against tester_invite_codes and
            // consumes one use in the same operation — see
            // add-invite-code-validation-function.sql) BEFORE any account
            // is created, so an invalid code never results in a
            // half-created account.
            if (isTestingMode && requireInviteCode) {
                if (!inviteCode.trim()) {
                    setCodeError('An invite code is required while tester registration is open');
                    setLoading(false);
                    return;
                }

                const codeResponse = await fetch(`${API_BASE}?action=validate-invite-code`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: inviteCode.trim() })
                });
                const codeResult = await codeResponse.json();

                if (!codeResponse.ok || !codeResult.valid) {
                    setCodeError(codeResult.reason || 'Invalid invite code');
                    setLoading(false);
                    return;
                }
            }

            const isPromoActive = isTestingMode ? false : await checkPromoMode();
            
            // REBUILT (2026-08-21): testers now keep their real selected
            // tier's user_type and capabilities — previously this branch
            // forced userType='tester', tier='free' unconditionally,
            // discarding whatever tier the person had actually picked.
            const userType = TIER_TO_USER_TYPE_MAP[formData.selectedTier] || 'job_seeker';
            let tier;
            let downgraded = false;

            const selectedTierInfo = tiers.find(t => t.id === formData.selectedTier);
            const needsPayment = selectedTierInfo?.requiresPayment === true;

            if (needsPayment && !isPromoActive && !isTestingMode) {
                // Paid tier requested, no promo active, not a tester, and
                // payment isn't wired up yet — grant a safe free tier now
                // instead of full paid access. User still gets redirected
                // to /pricing below.
                tier = 'registered';
                downgraded = true;
            } else {
                // Free tier, a paid tier during an active promo, or ANY
                // tier during testing mode (testers aren't expected to
                // pay) — grant as requested.
                tier = formData.selectedTier;
            }
            setTierDowngraded(downgraded);

            // Create auth user
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.full_name,
                        user_type: userType,
                        tier: tier,
                        requested_tier: formData.selectedTier,
                        company_name: formData.company_name,
                        is_tester: isTestingMode || false,
                        registered_at: new Date().toISOString()
                    }
                }
            });

            if (signUpError) throw signUpError;
            if (!authData.user) throw new Error('User creation failed');

            // Create profile (fallback if trigger doesn't fire)
            // FIXED: removed ai_credits_remaining / va_credits_balance — the real
            // credit system reads from a separate va_credits table, not these
            // profiles columns. See the va_credits upsert below instead.
            // NEW (2026-08-21): is_tester now actually persisted to the
            // profiles row itself (previously only ever set in auth
            // metadata, never copied into the actual table — va-execute's
            // tester-cap check reads profiles.is_tester directly, so this
            // was a real gap, not just an oversight).
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: authData.user.id,
                    email: formData.email,
                    full_name: formData.full_name,
                    user_type: userType,
                    tier: tier,
                    is_tester: isTestingMode || false,
                    country_code: 'GB',
                    // NEW (2026-08-16): referral attribution — only set
                    // when a real ?ref= code was present, so this never
                    // overwrites anything for direct (non-referred)
                    // signups.
                    ...(referralCode ? { referred_by_affiliate_code: referralCode, referred_at: new Date().toISOString() } : {}),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });

            if (profileError) {
                console.warn('Profile creation warning:', profileError);
            }

            // FIXED: create the user's real credit balance in va_credits (the table
            // the app actually reads from), instead of writing it to profiles.
            // Uses the tier actually granted, not the tier requested, so a
            // downgraded paid-tier signup gets 'registered' credits, not
            // 'professional' credits it hasn't paid for. Granted uniformly
            // now, tester or not — a tester's real usage limit is the
            // separate, tier-independent cap in tester_allocations, enforced
            // in va-execute; this va_credits balance is for consistency with
            // any other credit-gated feature that isn't tester-cap-aware.
            const initialCredits = TIER_DEFAULT_CREDITS[tier] ?? 5;

            const { error: creditsError } = await supabase
                .from('va_credits')
                .upsert({
                    user_id: authData.user.id,
                    balance: initialCredits
                });

            if (creditsError) {
                console.warn('Credit initialization warning:', creditsError);
            }

            // Create company profile for employers (both testers and real
            // signups — a tester testing the employer tier needs a company
            // profile to actually exercise that tier's features).
            if (formData.selectedTier === 'employer' || formData.selectedTier === 'business') {
                await supabase.from('company_profiles').upsert({
                    user_id: authData.user.id,
                    company_name: formData.company_name || 'My Company',
                    industry: null,
                    size: null,
                    created_at: new Date().toISOString()
                });
            }

            // FIXED (2026-08-21): tester_allocations genuinely has both an
            // email column (written by the admin's tester-create action,
            // pre-allocating a slot to a specific person before they've
            // even signed up — user_id null at that point) and a user_id
            // column (written here, once the account exists). Previously
            // this just upserted a brand-new row keyed by user_id
            // unconditionally, meaning an admin's pre-allocation was left
            // permanently orphaned (user_id forever null) the moment that
            // person actually signed up — the two never reconciled. Now
            // checks for a still-valid, unclaimed pre-allocation matching
            // this email FIRST, and if one exists, attaches this account
            // to it by setting user_id — deliberately preserving the
            // admin's original allocated_uses/expires_at rather than
            // overwriting them with the generic testingConfig values,
            // since the whole point of a manual pre-allocation is giving
            // that specific person a deliberate, possibly custom
            // allowance. Falls back to the normal fresh-allocation path
            // (unchanged) when no valid pre-allocation exists.
            if (isTestingMode) {
                const { data: pendingAllocation } = await supabase
                    .from('tester_allocations')
                    .select('id, expires_at')
                    .is('user_id', null)
                    .eq('status', 'active')
                    .ilike('email', formData.email)
                    .maybeSingle();

                const hasValidPendingAllocation =
                    pendingAllocation && new Date(pendingAllocation.expires_at) > new Date();

                if (hasValidPendingAllocation) {
                    // Reconcile: attach this new account to the admin's
                    // existing pre-allocation instead of creating a
                    // separate, disconnected row.
                    await supabase
                        .from('tester_allocations')
                        .update({ user_id: authData.user.id, updated_at: new Date().toISOString() })
                        .eq('id', pendingAllocation.id);
                } else {
                    // No valid pending pre-allocation (none exists, or the
                    // one that did has already expired) — create a fresh
                    // allocation via the standard code-gated flow, same as
                    // before.
                    const testerExpiry = new Date();
                    testerExpiry.setDate(testerExpiry.getDate() + testingConfig.accessDays);

                    await supabase
                        .from('tester_allocations')
                        .upsert({
                            user_id: authData.user.id,
                            allocated_uses: testingConfig.aiCallCap,
                            used_uses: 0,
                            remaining_uses: testingConfig.aiCallCap,
                            expires_at: testerExpiry.toISOString(),
                            status: 'active'
                        });
                }
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
                    if (selected?.requiresPayment && !isPromoActive) {
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
                            ? `Your tester account is active on the ${selected?.name} plan. You have ${testingConfig.aiCallCap} AI-assisted requests available for ${testingConfig.accessDays} days.`
                            : tierDowngraded
                                ? `Your account is active on the Free plan. Complete payment for the ${selected?.name} plan (${selected?.price}/month) to unlock its full features.`
                                : selected?.requiresPayment
                                    ? `Your ${selected.name} plan is active! Please check your email to verify your account.`
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
                            ? 'Tester registration is open — an invite code is required.'
                            : 'Join ODUSBABA to start your career journey'}
                    </p>
                </div>

                {/* Testing Mode Banner */}
                {testingMode && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-500/30 rounded-lg">
                        <p className="text-purple-400 text-sm text-center flex items-center justify-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            <strong>Tester Mode Active</strong> — pick any plan below to test it fully, no payment needed. Capped at {testingConfig.aiCallCap} AI-assisted requests for {testingConfig.accessDays} days.
                        </p>
                    </div>
                )}

                {/* Sign Up Form */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* NEW (2026-08-21): Invite Code — shown and required only
                            during testing mode. Gates entry into the whole form;
                            checked again server-side in handleSubmit regardless of
                            what's shown here, since client-side gating alone is
                            never a real security boundary. */}
                        {testingMode && (
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">
                                    Invite Code <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        value={inviteCode}
                                        onChange={(e) => { setInviteCode(e.target.value); setCodeError(''); }}
                                        className={`w-full pl-10 pr-4 py-2.5 bg-slate-800 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition ${
                                            codeError ? 'border-red-500' : 'border-slate-700'
                                        }`}
                                        placeholder="Enter your tester invite code"
                                        required
                                        disabled={loading}
                                    />
                                </div>
                                {codeError && (
                                    <p className="text-xs text-red-400 mt-1">{codeError}</p>
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

                        {/* Company Name (Employer/Business — shown regardless of
                            testing mode now, since a tester testing the employer
                            tier needs to exercise this field too) */}
                        {(formData.selectedTier === 'employer' || formData.selectedTier === 'business') && (
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

                        {/* Tier Selection — now shown during testing mode too
                            (previously hidden entirely, forcing every tester onto
                            a generic 'tester' account with no tier choice at all). */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-3">
                                {testingMode ? 'Select the plan you want to test' : 'Select your plan'}
                            </label>
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
                                                <div className="font-bold text-primary-400">
                                                    {testingMode && tier.requiresPayment ? 'Free (testing)' : tier.price}
                                                </div>
                                                {tier.id === 'business' && !testingMode && <div className="text-xs text-slate-500">/month</div>}
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                            {/* Payment note — suppressed during testing mode, since
                                no tier requires payment for a tester. */}
                            {!testingMode && tiers.find(t => t.id === formData.selectedTier)?.requiresPayment && (
                                <p className="text-xs text-slate-500 mt-2">
                                    This plan requires payment. Your account will start on the Free plan until payment is complete.
                                </p>
                            )}
                        </div>

                        {/* Info Box showing user_type mapping */}
                        <div className="p-3 bg-slate-800/30 border border-slate-700 rounded-lg">
                            <p className="text-xs text-slate-400 text-center">
                                Account type will be: <span className="text-primary-400 font-medium">
                                    {TIER_TO_USER_TYPE_MAP[formData.selectedTier] || 'job_seeker'}
                                </span>
                                {testingMode && <span className="text-purple-400"> (tester)</span>}
                            </p>
                        </div>

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

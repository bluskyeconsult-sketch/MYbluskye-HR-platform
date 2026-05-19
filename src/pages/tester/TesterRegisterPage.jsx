// src/pages/tester/TesterRegisterPage.jsx
// COMPLETE TESTER REGISTRATION PAGE - Master invite code system with usage tracking
// Features: Master invite code (TESTER2026), usage tracking, admin panel, password strength, email validation

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
    FlaskConical, Mail, Lock, User, Loader2, AlertCircle, 
    CheckCircle, Key, Copy, Check, Eye, EyeOff, Shield 
} from 'lucide-react';

// Master invite code configuration
const MASTER_INVITE_CODE = {
    CODE: 'TESTER2026',
    MAX_USES: 100,
    RESET_INTERVAL_DAYS: 30
};

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

    // Check admin status and load settings
    useEffect(() => {
        checkAdminStatus();
        loadSettings();
        loadInviteCodeStats();
    }, []);

    async function checkAdminStatus() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('user_type')
                .eq('id', user.id)
                .single();
            setIsAdmin(profile?.user_type === 'super_admin' || profile?.user_type === 'admin');
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

    // Password validation
    const validatePassword = useCallback((password) => {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
        if (password.match(/[0-9]/)) strength++;
        if (password.match(/[^a-zA-Z0-9]/)) strength++;
        setPasswordStrength(strength);
        return strength >= 3;
    }, []);

    // Email validation
    const validateEmail = useCallback((email) => {
        const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
        return emailRegex.test(email);
    }, []);

    // Validate master invite code
    const validateMasterInviteCode = useCallback(async (code) => {
        const upperCode = code.toUpperCase().trim();
        
        if (upperCode !== MASTER_INVITE_CODE.CODE) {
            return { valid: false, message: 'Invalid invite code' };
        }

        try {
            const { data, error } = await supabase
                .from('tester_invites')
                .select('used_count, max_uses')
                .eq('code', MASTER_INVITE_CODE.CODE)
                .single();

            if (error) return { valid: true, isMaster: true };

            if (data.used_count >= (data.max_uses || MASTER_INVITE_CODE.MAX_USES)) {
                return { valid: false, message: 'Invite code has reached maximum usage limit' };
            }

            return { valid: true, isMaster: true, currentUses: data.used_count };
        } catch (err) {
            console.error('Error validating invite code:', err);
            return { valid: true, isMaster: true };
        }
    }, []);

    // Increment invite usage
    const incrementInviteUsage = useCallback(async () => {
        if (!inviteCodeStats) return;
        
        setInviteCodeStats(prev => prev ? { ...prev, used_count: prev.used_count + 1 } : prev);
        
        supabase
            .from('tester_invites')
            .update({ used_count: (inviteCodeStats.used_count || 0) + 1 })
            .eq('code', MASTER_INVITE_CODE.CODE)
            .then(({ error }) => {
                if (error) console.error('Error updating usage count:', error);
            });
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

    // Handle registration
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        setError('');
        
        if (!validateEmail(formData.email)) {
            setError('Please enter a valid email address');
            return;
        }
        
        if (!validatePassword(formData.password)) {
            setError('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
            return;
        }
        
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
            // Validate invite code
            if (requireInviteCode && formData.invite_code) {
                const validation = await validateMasterInviteCode(formData.invite_code);
                if (!validation.valid) {
                    setError(validation.message);
                    setLoading(false);
                    return;
                }
                await incrementInviteUsage();
            }
            
            // Register user
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.full_name,
                        user_type: 'tester',
                        is_tester: true
                    }
                }
            });
            
            if (signUpError) throw signUpError;
            if (!authData.user) throw new Error('Registration failed');
            
            // Set tester expiry (30 days)
            const testerExpiry = new Date();
            testerExpiry.setDate(testerExpiry.getDate() + 30);
            
            // Update profile
            await supabase
                .from('profiles')
                .update({
                    user_type: 'tester',
                    is_tester: true,
                    tester_expires_at: testerExpiry.toISOString(),
                    tier: 'free',
                    full_name: formData.full_name,
                    country_code: 'GB',
                    updated_at: new Date().toISOString()
                })
                .eq('id', authData.user.id);
            
            // Create tester allocation
            await supabase
                .from('tester_allocations')
                .insert({
                    user_id: authData.user.id,
                    allocated_uses: 10,
                    used_uses: 0,
                    remaining_uses: 10,
                    expires_at: testerExpiry.toISOString(),
                    status: 'active'
                });
            
            setSuccess(true);
            setTimeout(() => navigate('/tester-login'), 3000);
            
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [formData, requireInviteCode, validateEmail, validatePassword, validateMasterInviteCode, incrementInviteUsage, navigate]);

    // Password strength text
    const passwordStrengthText = useMemo(() => {
        if (passwordStrength === 0) return '';
        if (passwordStrength === 1) return 'Weak';
        if (passwordStrength === 2) return 'Fair';
        if (passwordStrength === 3) return 'Good';
        return 'Strong';
    }, [passwordStrength]);

    const passwordStrengthColor = useMemo(() => {
        if (passwordStrength <= 1) return 'bg-red-500';
        if (passwordStrength === 2) return 'bg-yellow-500';
        if (passwordStrength === 3) return 'bg-blue-500';
        return 'bg-green-500';
    }, [passwordStrength]);

    if (success) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
                <div className="max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Tester Registration Successful!</h1>
                    <p className="text-slate-400 mb-4">
                        You now have 10 free uses for 30 days. Start exploring ODUSBABA!
                    </p>
                    <p className="text-slate-500 text-sm">Redirecting to login...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
            <div className="max-w-md w-full">
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
                    </div>
                )}

                {/* Registration Form */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Invite Code */}
                        {requireInviteCode && (
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">
                                    Invite Code <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.invite_code}
                                    onChange={(e) => setFormData({...formData, invite_code: e.target.value.toUpperCase()})}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="TESTER2026"
                                    required={requireInviteCode}
                                />
                            </div>
                        )}

                        {/* Full Name */}
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                                    className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                                    className="w-full pl-10 pr-10 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                                                    level <= passwordStrength ? passwordStrengthColor : 'bg-slate-700'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        Strength: {passwordStrengthText}
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
                                    className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                                <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                            )}
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-500 hover:to-indigo-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                            {loading ? 'Registering...' : 'Register as Tester'}
                        </button>
                    </form>

                    {/* Footer */}
                    <p className="text-center text-sm text-slate-500 mt-6">
                        Already a tester?{' '}
                        <Link to="/tester-login" className="text-purple-400 hover:underline">
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

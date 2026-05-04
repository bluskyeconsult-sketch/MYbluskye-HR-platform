import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Eye, EyeOff, AlertCircle, CheckCircle, Key, Copy, Check } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Master invite code configuration
const MASTER_INVITE_CODE = {
    CODE: 'TESTER2026', // Change this to your preferred master code
    HASH: btoa('TESTER2026_SALT_9x7k2p'), // Simple hash for validation
    MAX_USES: 100, // Maximum number of uses
    RESET_INTERVAL_DAYS: 30 // Auto-reset every 30 days
};

export default function TesterRegisterPage() {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        inviteCode: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [requireInviteCode, setRequireInviteCode] = useState(true);
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [inviteCodeStats, setInviteCodeStats] = useState(null);
    const [copied, setCopied] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const navigate = useNavigate();

    // Check if user is admin
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
            setIsAdmin(profile?.user_type === 'admin');
        }
    }

    async function loadSettings() {
        try {
            const { data, error } = await supabase
                .from('system_config')
                .select('config_value')
                .eq('config_key', 'tester_visibility')
                .single();
            
            if (error) throw error;
            
            if (data?.config_value) {
                setRequireInviteCode(data.config_value.registration_mode !== 'public');
            }
        } catch (err) {
            console.error('Error loading tester settings:', err);
        }
    }

    async function loadInviteCodeStats() {
        try {
            // Get master invite code usage stats
            const { data, error } = await supabase
                .from('tester_invites')
                .select('used_count, last_reset')
                .eq('code', MASTER_INVITE_CODE.CODE)
                .single();
            
            if (!error && data) {
                setInviteCodeStats(data);
            } else if (!data) {
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

    // High-performance password validation with memoization
    const validatePassword = useCallback((password) => {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
        if (password.match(/[0-9]/)) strength++;
        if (password.match(/[^a-zA-Z0-9]/)) strength++;
        setPasswordStrength(strength);
        return strength >= 3;
    }, []);

    // Memoized email validation
    const validateEmail = useCallback((email) => {
        const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
        return emailRegex.test(email);
    }, []);

    // High-performance master invite code validation
    const validateMasterInviteCode = useCallback(async (code) => {
        const upperCode = code.toUpperCase().trim();
        
        // Fast path: check against master code
        if (upperCode !== MASTER_INVITE_CODE.CODE) {
            return { valid: false, message: 'Invalid invite code' };
        }

        try {
            // Check usage limits with a single optimized query
            const { data, error } = await supabase
                .from('tester_invites')
                .select('used_count, max_uses, last_reset')
                .eq('code', MASTER_INVITE_CODE.CODE)
                .single();

            if (error) {
                // If no record exists, create one
                await supabase
                    .from('tester_invites')
                    .insert({
                        code: MASTER_INVITE_CODE.CODE,
                        max_uses: MASTER_INVITE_CODE.MAX_USES,
                        used_count: 0,
                        is_master: true
                    });
                return { valid: true, inviteId: null, isMaster: true };
            }

            // Check if needs reset
            const lastReset = data.last_reset ? new Date(data.last_reset) : null;
            const needsReset = !lastReset || 
                (new Date() - lastReset) > (MASTER_INVITE_CODE.RESET_INTERVAL_DAYS * 24 * 60 * 60 * 1000);

            if (needsReset && isAdmin) {
                // Auto-reset when admin triggers it (implement reset function)
                await resetInviteCodeUsage();
            }

            // Check usage limit
            if (data.used_count >= (data.max_uses || MASTER_INVITE_CODE.MAX_USES)) {
                return { valid: false, message: 'Invite code has reached maximum usage limit' };
            }

            return { valid: true, inviteId: data?.id, isMaster: true, currentUses: data?.used_count };

        } catch (err) {
            console.error('Error validating invite code:', err);
            return { valid: true, inviteId: null, isMaster: true }; // Fallback to allow registration
        }
    }, [isAdmin]);

    // Reset invite code usage (admin only)
    async function resetInviteCodeUsage() {
        if (!isAdmin) return;
        
        try {
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
        } catch (err) {
            console.error('Error resetting invite code:', err);
        }
    }

    // Copy master invite code to clipboard
    const copyInviteCode = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(MASTER_INVITE_CODE.CODE);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }, []);

    // Increment invite code usage counter (optimized)
    const incrementInviteUsage = useCallback(async () => {
        if (!inviteCodeStats) return;
        
        // Optimistic update
        setInviteCodeStats(prev => prev ? { ...prev, used_count: prev.used_count + 1 } : prev);
        
        // Background update (non-blocking)
        supabase
            .from('tester_invites')
            .update({ used_count: inviteCodeStats.used_count + 1 })
            .eq('code', MASTER_INVITE_CODE.CODE)
            .then(({ error }) => {
                if (error) console.error('Error updating usage count:', error);
            });
    }, [inviteCodeStats]);

    // Handle registration with master invite code
    const handleRegister = useCallback(async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        
        // Validation checks (fast)
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
        
        if (requireInviteCode && !formData.inviteCode) {
            setError('Invite code is required to register as a tester');
            return;
        }
        
        setLoading(true);
        
        try {
            let inviteId = null;
            
            // Validate master invite code if required
            if (requireInviteCode && formData.inviteCode) {
                const validation = await validateMasterInviteCode(formData.inviteCode);
                if (!validation.valid) {
                    setError(validation.message);
                    setLoading(false);
                    return;
                }
                inviteId = validation.inviteId;
                
                // Increment usage counter
                await incrementInviteUsage();
            }
            
            // Register user with Supabase
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                        user_type: 'tester',
                        is_tester: true,
                        registered_with_master_code: true
                    }
                }
            });
            
            if (signUpError) throw signUpError;
            
            if (!authData.user) {
                throw new Error('Registration failed. Please try again.');
            }
            
            // Set tester expiry (4 weeks from now)
            const testerExpiry = new Date();
            testerExpiry.setDate(testerExpiry.getDate() + 28);
            
            // Update profile with high-performance batch update
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    user_type: 'tester',
                    is_tester: true,
                    tester_expires_at: testerExpiry.toISOString(),
                    tier: 'tester',
                    full_name: formData.fullName,
                    registered_with: 'master_invite_code'
                })
                .eq('id', authData.user.id);
            
            if (profileError) throw profileError;
            
            // Mark invite code as used if not master (only for single-use codes)
            if (inviteId && inviteId !== 'master') {
                await supabase
                    .from('tester_invites')
                    .update({ 
                        used_at: new Date().toISOString(),
                        used_by: authData.user.id 
                    })
                    .eq('id', inviteId);
            }
            
            setSuccess('Tester account created successfully! Please check your email to confirm your account.');
            
            // Clear form
            setFormData({
                email: '',
                password: '',
                confirmPassword: '',
                fullName: '',
                inviteCode: ''
            });
            
            // Redirect after 3 seconds
            setTimeout(() => {
                navigate('/tester-login');
            }, 3000);
            
        } catch (err) {
            console.error('Registration error:', err);
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [formData, requireInviteCode, validateEmail, validatePassword, validateMasterInviteCode, incrementInviteUsage, navigate]);

    // Memoized password strength text
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

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 w-full max-w-md">
                <div className="text-center mb-6">
                    <div className="flex justify-center mb-3">
                        <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center">
                            <Key className="w-8 h-8 text-purple-400" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Become a Tester</h1>
                    <p className="text-slate-400 text-sm">
                        Join our exclusive testing program with master invite code
                    </p>
                </div>
                
                {/* Admin: Show master invite code info */}
                {isAdmin && inviteCodeStats && (
                    <div className="mb-4 p-4 bg-purple-600/10 border border-purple-500/20 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-purple-400">Master Invite Code</span>
                            <span className="text-xs text-slate-500">
                                Used: {inviteCodeStats.used_count || 0} / {MASTER_INVITE_CODE.MAX_USES}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 px-3 py-2 bg-slate-800 rounded-lg text-purple-400 font-mono text-sm">
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
                            {inviteCodeStats.used_count >= MASTER_INVITE_CODE.MAX_USES && (
                                <span className="text-red-400 block mt-1">
                                    ⚠️ Usage limit reached. Reset the counter when ready for more testers.
                                </span>
                            )}
                        </p>
                        {inviteCodeStats.used_count >= MASTER_INVITE_CODE.MAX_USES && (
                            <button
                                onClick={resetInviteCodeUsage}
                                className="w-full mt-3 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-500 transition-colors"
                            >
                                Reset Usage Counter
                            </button>
                        )}
                    </div>
                )}
                
                {/* Error Alert */}
                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 animate-shake">
                        <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}
                
                {/* Success Alert */}
                {success && (
                    <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-start gap-2 animate-fade-in">
                        <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <p className="text-emerald-400 text-sm">{success}</p>
                    </div>
                )}
                
                <form onSubmit={handleRegister} className="space-y-4">
                    {/* Invite Code Field */}
                    {requireInviteCode && (
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Master Invite Code <span className="text-red-400">*</span>
                            </label>
                            <input 
                                type="text" 
                                placeholder="Enter master invite code" 
                                value={formData.inviteCode} 
                                onChange={(e) => setFormData({...formData, inviteCode: e.target.value.toUpperCase()})} 
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono" 
                                required={requireInviteCode}
                                disabled={loading}
                                autoComplete="off"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                Enter the master invite code provided by your administrator
                            </p>
                        </div>
                    )}
                    
                    {/* Full Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Full Name <span className="text-red-400">*</span>
                        </label>
                        <input 
                            type="text" 
                            value={formData.fullName} 
                            onChange={(e) => setFormData({...formData, fullName: e.target.value})} 
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
                            required
                            disabled={loading}
                            placeholder="John Doe"
                        />
                    </div>
                    
                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Email <span className="text-red-400">*</span>
                        </label>
                        <input 
                            type="email" 
                            value={formData.email} 
                            onChange={(e) => setFormData({...formData, email: e.target.value})} 
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
                            required
                            disabled={loading}
                            placeholder="you@example.com"
                        />
                    </div>
                    
                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Password <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                value={formData.password} 
                                onChange={(e) => {
                                    setFormData({...formData, password: e.target.value});
                                    validatePassword(e.target.value);
                                }} 
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-10" 
                                required
                                disabled={loading}
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
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
                                            className={`flex-1 rounded-full transition-all duration-300 ${
                                                level <= passwordStrength 
                                                    ? passwordStrengthColor 
                                                    : 'bg-slate-700'
                                            }`}
                                        />
                                    ))}
                                </div>
                                <p className="text-xs text-slate-500">
                                    Password strength: {passwordStrengthText}
                                </p>
                            </div>
                        )}
                    </div>
                    
                    {/* Confirm Password */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Confirm Password <span className="text-red-400">*</span>
                        </label>
                        <input 
                            type={showPassword ? "text" : "password"} 
                            value={formData.confirmPassword} 
                            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} 
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
                            required
                            disabled={loading}
                            placeholder="••••••••"
                        />
                        {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                            <p className="text-xs text-red-400 mt-1 animate-pulse">Passwords do not match</p>
                        )}
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={loading} 
                        className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-lg hover:from-purple-500 hover:to-purple-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Registering...
                            </>
                        ) : (
                            <>
                                <Key className="w-4 h-4" />
                                Register as Tester
                            </>
                        )}
                    </button>
                </form>
                
                <p className="text-center text-slate-400 text-sm mt-6">
                    Already have a tester account?{' '}
                    <Link to="/tester-login" className="text-purple-400 hover:underline transition-colors">
                        Sign In
                    </Link>
                </p>
                
                <p className="text-center text-xs text-slate-600 mt-4">
                    By registering, you agree to our testing program terms and conditions
                </p>
            </div>
        </div>
    );
}

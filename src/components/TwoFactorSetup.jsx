// src/components/TwoFactorSetup.jsx
// COMPLETE 2FA SETUP COMPONENT - TOTP with backup codes, enable/disable, admin requirements

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { 
    Shield, Copy, CheckCircle, Download, RefreshCw, 
    Smartphone, Key, AlertCircle, X 
} from 'lucide-react';

// ============================================
// 2FA SERVICE FUNCTIONS (integrated)
// ============================================

async function isTwoFactorEnabled(userId) {
    const { data, error } = await supabase
        .from('profiles')
        .select('two_factor_enabled')
        .eq('id', userId)
        .single();
    
    if (error) return false;
    return data?.two_factor_enabled || false;
}

async function isAdminUser(userId) {
    const { data, error } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', userId)
        .single();
    
    if (error) return false;
    return data?.user_type === 'admin' || data?.user_type === 'super_admin';
}

async function setupTwoFactor(userId, email) {
    const { data, error } = await supabase.functions.invoke('generate-2fa-secret', {
        body: { userId, email }
    });
    
    if (error) throw new Error(error.message);
    return {
        secret: data.secret,
        qrCodeUrl: data.qrCode,
        backupCodes: data.backupCodes
    };
}

async function verifyAndEnableTwoFactor(userId, code, secret, backupCodes) {
    const { error: verifyError } = await supabase.functions.invoke('verify-2fa', {
        body: { userId, code, secret }
    });

    if (verifyError) {
        return { verified: false, message: verifyError.message };
    }

    // Save backup codes and enable 2FA
    await supabase
        .from('profiles')
        .update({ 
            two_factor_enabled: true,
            two_factor_backup_codes: backupCodes,
            two_factor_secret: secret
        })
        .eq('id', userId);

    return { verified: true };
}

async function disableTwoFactor(userId, token) {
    const { error } = await supabase.functions.invoke('disable-2fa', {
        body: { userId, token }
    });
    
    if (error) throw new Error(error.message);
    
    await supabase
        .from('profiles')
        .update({ 
            two_factor_enabled: false,
            two_factor_backup_codes: null,
            two_factor_secret: null
        })
        .eq('id', userId);
    
    return { success: true };
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function TwoFactorSetup({ onComplete, onSkip }) {
    const [step, setStep] = useState('start'); // start, setup, verify, backup, complete
    const [secret, setSecret] = useState('');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [backupCodes, setBackupCodes] = useState([]);
    const [verificationCode, setVerificationCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [copied, setCopied] = useState(false);
    const [is2faEnabled, setIs2faEnabled] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        loadUserAndStatus();
    }, []);

    async function loadUserAndStatus() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        setUser(user);
        
        const enabled = await isTwoFactorEnabled(user.id);
        const admin = await isAdminUser(user.id);
        
        setIs2faEnabled(enabled);
        setIsAdmin(admin);
    }

    const handleSetup = async () => {
        setLoading(true);
        setError('');
        
        try {
            const result = await setupTwoFactor(user.id, user.email);
            setSecret(result.secret);
            setQrCodeUrl(result.qrCodeUrl);
            setBackupCodes(result.backupCodes);
            setStep('setup');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        if (!verificationCode || verificationCode.length !== 6) {
            setError('Please enter a valid 6-digit code');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const result = await verifyAndEnableTwoFactor(
                user.id, 
                verificationCode, 
                secret, 
                backupCodes
            );
            
            if (result.verified) {
                setIs2faEnabled(true);
                setStep('backup');
            } else {
                setError(result.message || 'Invalid verification code');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDisable = async () => {
        const token = prompt('Enter your current 2FA code to disable:');
        if (!token || token.length !== 6) {
            setError('Please enter a valid 6-digit code');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const result = await disableTwoFactor(user.id, token);
            
            if (result.success) {
                setIs2faEnabled(false);
                setSuccess('2FA has been disabled successfully');
                setTimeout(() => setSuccess(''), 3000);
                if (onComplete) onComplete();
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const downloadBackupCodes = () => {
        const content = backupCodes.join('\n');
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'odusbaba-backup-codes.txt';
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!user) {
        return (
            <div className="text-center py-8 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                Loading...
            </div>
        );
    }

    // Step 1: Start / Status Display
    if (step === 'start') {
        return (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-primary-950 to-slate-900">
                    <div className="flex items-center gap-3">
                        <Shield className="w-6 h-6 text-primary-400" />
                        <h2 className="text-xl font-semibold text-white">
                            Two-Factor Authentication
                        </h2>
                        {is2faEnabled && (
                            <span className="ml-auto px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                                Enabled
                            </span>
                        )}
                    </div>
                    <p className="text-slate-400 text-sm mt-1">
                        {isAdmin 
                            ? 'Required for admin accounts - Add an extra layer of security'
                            : 'Optional - Add an extra layer of security to your account'
                        }
                    </p>
                </div>

                <div className="p-6">
                    {/* Success Message */}
                    {success && (
                        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                            <p className="text-emerald-400 text-sm">{success}</p>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    {is2faEnabled ? (
                        <div>
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 mb-6">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                                    <p className="text-emerald-400 font-medium">
                                        2FA is currently ENABLED
                                    </p>
                                </div>
                                <p className="text-emerald-300/70 text-sm mt-1">
                                    Your account is protected with two-factor authentication
                                </p>
                            </div>
                            <button
                                onClick={handleDisable}
                                disabled={loading}
                                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Processing...' : 'Disable 2FA'}
                            </button>
                        </div>
                    ) : (
                        <div>
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6">
                                <p className="text-amber-400 font-medium">
                                    2FA is currently DISABLED
                                </p>
                                <p className="text-amber-300/70 text-sm mt-1">
                                    {isAdmin 
                                        ? 'Admin accounts require 2FA. Please enable it now.'
                                        : 'Enable 2FA to protect your account from unauthorized access'
                                    }
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleSetup}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                                >
                                    {loading ? 'Setting up...' : 'Enable 2FA'}
                                </button>
                                {onSkip && !isAdmin && (
                                    <button
                                        onClick={onSkip}
                                        className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
                                    >
                                        Remind Me Later
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Step 2: Setup (QR Code + Manual Entry)
    if (step === 'setup') {
        return (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-2">Set Up Two-Factor Authentication</h2>
                <p className="text-slate-400 text-sm mb-6">
                    Scan the QR code with your authenticator app
                </p>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}

                {/* QR Code */}
                <div className="text-center mb-6">
                    {qrCodeUrl && (
                        <div className="inline-block p-4 bg-white rounded-lg">
                            <QRCodeSVG value={qrCodeUrl} size={200} />
                        </div>
                    )}
                </div>

                {/* Manual Secret */}
                <div className="mb-6">
                    <p className="text-sm text-slate-400 mb-2">Or enter this code manually:</p>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 p-2 bg-slate-800 rounded font-mono text-sm text-primary-400 text-center">
                            {secret}
                        </code>
                        <button
                            onClick={() => copyToClipboard(secret)}
                            className="p-2 text-slate-400 hover:text-white transition-colors"
                            title="Copy secret"
                        >
                            {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Verification */}
                <div className="border-t border-slate-800 pt-6">
                    <h3 className="text-lg font-medium text-white mb-4">Verify Code</h3>
                    <p className="text-sm text-slate-400 mb-4">
                        Enter the 6-digit code from your authenticator app to confirm setup
                    </p>
                    
                    <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-center text-2xl font-mono tracking-widest mb-4"
                        maxLength={6}
                        autoFocus
                    />
                    
                    <button
                        onClick={handleVerify}
                        disabled={loading || verificationCode.length !== 6}
                        className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Verifying...' : 'Verify & Enable 2FA'}
                    </button>
                </div>
            </div>
        );
    }

    // Step 3: Backup Codes Display
    if (step === 'backup') {
        return (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Shield className="w-8 h-8 text-primary-400" />
                    <h2 className="text-xl font-bold text-white">2FA Enabled Successfully!</h2>
                </div>
                
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-4">
                    <h3 className="text-amber-400 font-semibold mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        ⚠️ Save Your Backup Codes
                    </h3>
                    <p className="text-sm text-slate-300 mb-3">
                        These codes can be used to access your account if you lose your authenticator device.
                        Store them in a safe place.
                    </p>
                    <div className="bg-slate-800 p-3 rounded font-mono text-sm text-center mb-3">
                        <div className="grid grid-cols-2 gap-2">
                            {backupCodes.map((code, i) => (
                                <div key={i} className="text-primary-400">{code}</div>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => copyToClipboard(backupCodes.join('\n'))} 
                            className="flex-1 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center justify-center gap-2"
                        >
                            {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copied ? 'Copied!' : 'Copy Codes'}
                        </button>
                        <button 
                            onClick={downloadBackupCodes} 
                            className="flex-1 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center justify-center gap-2"
                        >
                            <Download className="w-4 h-4" /> Download
                        </button>
                    </div>
                </div>
                
                <button 
                    onClick={() => {
                        setStep('complete');
                        if (onComplete) onComplete();
                    }} 
                    className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                    Continue to Dashboard
                </button>
            </div>
        );
    }

    // Step 4: Complete
    if (step === 'complete') {
        return (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">2FA Enabled Successfully!</h3>
                <p className="text-slate-400 mb-6">
                    Your account is now protected with two-factor authentication.
                    You'll need to enter a verification code each time you log in.
                </p>
                <button
                    onClick={() => setStep('start')}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                    Done
                </button>
            </div>
        );
    }

    return null;
}

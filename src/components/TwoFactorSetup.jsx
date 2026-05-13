// src/components/TwoFactorSetup.jsx
// Complete 2FA setup with TOTP and backup codes

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { Shield, Copy, CheckCircle, Download, RefreshCw } from 'lucide-react';

export default function TwoFactorSetup({ onComplete, onSkip }) {
    const [secret, setSecret] = useState(null);
    const [qrCode, setQrCode] = useState(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [backupCodes, setBackupCodes] = useState([]);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        generateSecret();
    }, []);

    async function generateSecret() {
        setLoading(true);
        const { data, error } = await supabase.functions.invoke('generate-2fa-secret');
        if (error) {
            setError(error.message);
        } else {
            setSecret(data.secret);
            setQrCode(data.qrCode);
            setBackupCodes(data.backupCodes);
        }
        setLoading(false);
    }

    async function verifyAndEnable() {
        if (!verificationCode || verificationCode.length !== 6) {
            setError('Please enter a valid 6-digit code');
            return;
        }

        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error: verifyError } = await supabase.functions.invoke('verify-2fa', {
            body: { userId: user.id, code: verificationCode, secret }
        });

        if (verifyError) {
            setError('Invalid verification code');
            setLoading(false);
            return;
        }

        // Save backup codes to database
        await supabase
            .from('profiles')
            .update({ 
                two_factor_enabled: true,
                two_factor_backup_codes: backupCodes,
                two_factor_secret: secret
            })
            .eq('id', user.id);

        setStep(3);
        setLoading(false);
        if (onComplete) onComplete();
    }

    function copyBackupCodes() {
        navigator.clipboard.writeText(backupCodes.join('\n'));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    function downloadBackupCodes() {
        const blob = new Blob([backupCodes.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'odusbaba-backup-codes.txt';
        a.click();
        URL.revokeObjectURL(url);
    }

    if (step === 1) {
        return (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Shield className="w-8 h-8 text-primary-400" />
                    <h2 className="text-xl font-bold text-white">Secure Your Account with 2FA</h2>
                </div>
                <p className="text-slate-400 mb-6">
                    Two-factor authentication adds an extra layer of security to your account.
                    You'll need to enter a verification code from your authenticator app when logging in.
                </p>
                <div className="flex gap-3">
                    <button onClick={() => setStep(2)} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                        Set Up 2FA
                    </button>
                    {onSkip && (
                        <button onClick={onSkip} className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800">
                            Remind Me Later
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (step === 2) {
        return (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Step 1: Scan QR Code</h2>
                {qrCode && (
                    <div className="flex justify-center mb-4">
                        <QRCodeSVG value={qrCode} size={200} />
                    </div>
                )}
                <p className="text-slate-400 text-sm mb-2">Or enter this code manually:</p>
                <code className="block bg-slate-800 p-2 rounded text-center font-mono mb-4">{secret}</code>
                
                <h2 className="text-xl font-bold text-white mb-4">Step 2: Enter Verification Code</h2>
                <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="000000"
                    maxLength="6"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-center text-2xl tracking-widest mb-4"
                />
                {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
                <button
                    onClick={verifyAndEnable}
                    disabled={loading}
                    className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                    {loading ? 'Verifying...' : 'Verify and Enable'}
                </button>
            </div>
        );
    }

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
                <h2 className="text-xl font-bold text-white">2FA Enabled Successfully!</h2>
            </div>
            
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-4">
                <h3 className="text-amber-400 font-semibold mb-2">⚠️ Save Your Backup Codes</h3>
                <p className="text-sm text-slate-300 mb-3">
                    These codes can be used to access your account if you lose your authenticator device.
                    Store them in a safe place.
                </p>
                <div className="bg-slate-800 p-3 rounded font-mono text-sm text-center mb-3">
                    {backupCodes.map((code, i) => (
                        <div key={i}>{code}</div>
                    ))}
                </div>
                <div className="flex gap-3">
                    <button onClick={copyBackupCodes} className="flex-1 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center justify-center gap-2">
                        {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copied!' : 'Copy Codes'}
                    </button>
                    <button onClick={downloadBackupCodes} className="flex-1 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center justify-center gap-2">
                        <Download className="w-4 h-4" /> Download
                    </button>
                </div>
            </div>
            
            <button onClick={onComplete} className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                Continue to Dashboard
            </button>
        </div>
    );
}

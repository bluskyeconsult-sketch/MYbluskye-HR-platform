// ============================================
// Two-Factor Authentication Modal
// Shows during login for users with 2FA enabled
// ============================================

import React, { useState } from 'react';
import { verifyTwoFactorLogin, verifyBackupCode } from '../lib/totpService';
import { Shield, AlertCircle, Key, Smartphone } from 'lucide-react';

export default function TwoFactorModal({ userId, onSuccess, onCancel }) {
    const [code, setCode] = useState('');
    const [useBackup, setUseBackup] = useState(false);
    const [backupCode, setBackupCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleVerify = async () => {
        if (!useBackup && (!code || code.length !== 6)) {
            setError('Please enter a valid 6-digit code');
            return;
        }

        if (useBackup && (!backupCode || backupCode.length < 6)) {
            setError('Please enter a valid backup code');
            return;
        }

        setLoading(true);
        setError('');

        try {
            let result;
            if (useBackup) {
                result = await verifyBackupCode(userId, backupCode);
            } else {
                result = await verifyTwoFactorLogin(userId, code);
            }

            if (result.verified) {
                onSuccess();
            } else {
                setError(result.message || 'Invalid verification code');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl shadow-2xl">
                <div className="p-6">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Shield className="w-8 h-8 text-primary-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Two-Factor Authentication</h2>
                        <p className="text-slate-400 text-sm mt-1">
                            Enter the verification code from your authenticator app
                        </p>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    {!useBackup ? (
                        <div>
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="000000"
                                className="w-full p-4 bg-slate-800 border border-slate-700 rounded-lg text-white text-center text-2xl font-mono tracking-widest mb-4"
                                maxLength={6}
                                autoFocus
                            />
                            <button
                                onClick={handleVerify}
                                disabled={loading || code.length !== 6}
                                className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? 'Verifying...' : 'Verify'}
                            </button>
                            <button
                                onClick={() => setUseBackup(true)}
                                className="w-full mt-3 py-2 text-sm text-primary-400 hover:text-primary-300 transition-colors"
                            >
                                Use backup code instead
                            </button>
                        </div>
                    ) : (
                        <div>
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4">
                                <p className="text-amber-400 text-sm flex items-start gap-2">
                                    <Key className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <span>Using a backup code will mark it as used. Each backup code can only be used once.</span>
                                </p>
                            </div>
                            <input
                                type="text"
                                value={backupCode}
                                onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                                placeholder="XXXXXXXX"
                                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-center font-mono mb-4"
                                autoFocus
                            />
                            <button
                                onClick={handleVerify}
                                disabled={loading || !backupCode}
                                className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                            >
                                {loading ? 'Verifying...' : 'Verify Backup Code'}
                            </button>
                            <button
                                onClick={() => {
                                    setUseBackup(false);
                                    setBackupCode('');
                                }}
                                className="w-full mt-3 py-2 text-sm text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2"
                            >
                                <Smartphone className="w-4 h-4" />
                                Use authenticator app instead
                            </button>
                        </div>
                    )}

                    {onCancel && (
                        <button
                            onClick={onCancel}
                            className="w-full mt-3 py-2 border border-slate-700 text-slate-400 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

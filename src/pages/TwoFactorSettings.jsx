// src/pages/TwoFactorSettings.jsx
//
// NEW (2026-08-21): first real UI for two-factor authentication. The
// underlying profiles columns (two_factor_enabled, two_factor_secret,
// two_factor_backup_codes, two_factor_last_verified) already existed in
// the real schema, but nothing anywhere read or wrote them before this —
// same "schema built ahead of the feature" pattern already found
// elsewhere in this project (is_tester, ai_credits_remaining). Built as a
// general feature any authenticated user can enable, not admin-gated,
// per explicit decision — motivated by hardening the break-glass
// super_admin account, but usable by anyone.
//
// IMPORTANT — this page alone does not make sign-in actually check 2FA.
// It correctly sets up and stores a real, working secret and backup
// codes via the new setup-2fa/confirm-2fa-setup/disable-2fa backend
// actions, but the sign-in flow itself (wherever that lives) still needs
// a corresponding change: after password auth succeeds, if
// profiles.two_factor_enabled is true, it must prompt for a code and
// call ?action=verify-2fa BEFORE completing sign-in — otherwise this
// page enables a real credential that nothing ever actually challenges
// for, making it decorative rather than a real security control. That
// sign-in-flow change is a separate, still-needed piece.

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    Shield, ShieldCheck, ShieldOff, Loader2, AlertCircle,
    CheckCircle, Copy, Eye, EyeOff, KeyRound, Download
} from 'lucide-react';

const API_BASE = '/api/index';

export default function TwoFactorSettings() {
    const [loading, setLoading] = useState(true);
    const [is2FAEnabled, setIs2FAEnabled] = useState(false);
    const [step, setStep] = useState('overview'); // overview | setup | confirm | backup-codes | disable
    const [qrCode, setQrCode] = useState(null);
    const [manualKey, setManualKey] = useState(null);
    const [showManualKey, setShowManualKey] = useState(false);
    const [confirmCode, setConfirmCode] = useState('');
    const [disableCode, setDisableCode] = useState('');
    const [backupCodes, setBackupCodes] = useState([]);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [copiedKey, setCopiedKey] = useState(false);

    useEffect(() => {
        loadStatus();
    }, []);

    async function getAuthHeaders() {
        const { data: { session } } = await supabase.auth.getSession();
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
        };
    }

    async function loadStatus() {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('two_factor_enabled')
                .eq('id', user.id)
                .single();

            setIs2FAEnabled(profile?.two_factor_enabled || false);
        } catch (err) {
            console.error('Error loading 2FA status:', err);
        } finally {
            setLoading(false);
        }
    }

    async function startSetup() {
        setError('');
        setSaving(true);
        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`${API_BASE}?action=setup-2fa`, {
                method: 'POST',
                headers
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to start 2FA setup');
            }

            setQrCode(data.qrCode);
            setManualKey(data.manualEntryKey);
            setStep('setup');
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    async function confirmSetup(e) {
        e.preventDefault();
        setError('');
        setSaving(true);
        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`${API_BASE}?action=confirm-2fa-setup`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ code: confirmCode })
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Invalid code');
            }

            setBackupCodes(data.backupCodes);
            setIs2FAEnabled(true);
            setStep('backup-codes');
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleDisable(e) {
        e.preventDefault();
        setError('');
        setSaving(true);
        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`${API_BASE}?action=disable-2fa`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ code: disableCode })
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Invalid code');
            }

            setIs2FAEnabled(false);
            setStep('overview');
            setDisableCode('');
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    function copyManualKey() {
        navigator.clipboard.writeText(manualKey);
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
    }

    function downloadBackupCodes() {
        const text = `ODUSBABA HR Platform — 2FA Backup Codes\nGenerated: ${new Date().toLocaleString()}\n\nEach code can be used once if you lose access to your authenticator app.\n\n${backupCodes.join('\n')}`;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'backup-codes.txt';
        a.click();
        URL.revokeObjectURL(url);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[40vh]">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-lg mx-auto p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${is2FAEnabled ? 'bg-emerald-500/20' : 'bg-slate-800'}`}>
                    {is2FAEnabled ? <ShieldCheck className="w-6 h-6 text-emerald-400" /> : <Shield className="w-6 h-6 text-slate-400" />}
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white">Two-Factor Authentication</h1>
                    <p className="text-slate-400 text-sm">
                        {is2FAEnabled ? 'Enabled — your account has an extra layer of protection' : 'Add an extra layer of protection to your account'}
                    </p>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            )}

            {/* Overview */}
            {step === 'overview' && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    {is2FAEnabled ? (
                        <div>
                            <p className="text-slate-300 text-sm mb-4">
                                Two-factor authentication is currently active on your account. You'll need a code from your authenticator app each time you sign in.
                            </p>
                            <button
                                onClick={() => setStep('disable')}
                                className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition text-sm font-medium flex items-center gap-2"
                            >
                                <ShieldOff className="w-4 h-4" />
                                Disable 2FA
                            </button>
                        </div>
                    ) : (
                        <div>
                            <p className="text-slate-300 text-sm mb-4">
                                Once enabled, signing in will require both your password and a code from an authenticator app (like Google Authenticator or Authy).
                            </p>
                            <button
                                onClick={startSetup}
                                disabled={saving}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                                Enable 2FA
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Setup — scan QR */}
            {step === 'setup' && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <h2 className="text-white font-semibold mb-3">Scan this QR code</h2>
                    <p className="text-slate-400 text-sm mb-4">
                        Open your authenticator app and scan the code below.
                    </p>
                    {qrCode && (
                        <div className="bg-white p-4 rounded-lg w-fit mx-auto mb-4">
                            <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                        </div>
                    )}

                    <button
                        onClick={() => setShowManualKey(!showManualKey)}
                        className="text-primary-400 text-sm hover:underline mb-2"
                    >
                        {showManualKey ? 'Hide' : "Can't scan? Enter code manually"}
                    </button>

                    {showManualKey && (
                        <div className="flex items-center gap-2 mb-4 p-3 bg-slate-800 rounded-lg">
                            <code className="text-slate-300 text-sm flex-1 break-all">{manualKey}</code>
                            <button onClick={copyManualKey} className="text-slate-400 hover:text-white flex-shrink-0">
                                {copiedKey ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                    )}

                    <form onSubmit={confirmSetup} className="mt-4">
                        <label className="block text-sm text-slate-400 mb-1">Enter the 6-digit code from your app</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={confirmCode}
                                onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ''))}
                                className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-center tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="000000"
                                required
                                disabled={saving}
                            />
                            <button
                                type="submit"
                                disabled={saving || confirmCode.length !== 6}
                                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 flex items-center gap-2"
                            >
                                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                Verify
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Backup codes — shown exactly once */}
            {step === 'backup-codes' && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                        <h2 className="text-white font-semibold">2FA Enabled</h2>
                    </div>
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4">
                        <p className="text-amber-400 text-sm">
                            Save these backup codes now — they won't be shown again. Each one works once if you lose access to your authenticator app.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        {backupCodes.map((code, i) => (
                            <code key={i} className="p-2 bg-slate-800 rounded-lg text-slate-300 text-sm text-center">
                                {code}
                            </code>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={downloadBackupCodes}
                            className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition text-sm flex items-center justify-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Download codes
                        </button>
                        <button
                            onClick={() => setStep('overview')}
                            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}

            {/* Disable */}
            {step === 'disable' && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <h2 className="text-white font-semibold mb-3">Disable Two-Factor Authentication</h2>
                    <p className="text-slate-400 text-sm mb-4">
                        Enter a current code from your authenticator app (or a backup code) to confirm.
                    </p>
                    <form onSubmit={handleDisable}>
                        <div className="relative mb-4">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                value={disableCode}
                                onChange={(e) => setDisableCode(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="Code from app or backup code"
                                required
                                disabled={saving}
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => { setStep('overview'); setDisableCode(''); setError(''); }}
                                className="flex-1 px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                Confirm Disable
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

// src/pages/ResetPasswordPage.jsx
//
// NEW (2026-09-17): confirmed genuinely missing entirely - the
// password recovery email template links through /auth/confirm,
// which correctly verifies the token and establishes a real session,
// but nothing existed for the user to actually land on to set their
// new password. This is that missing page - by the time someone
// reaches this page, ConfirmPage.jsx has already verified their
// recovery token and they have a real, valid session, so this only
// needs to call updateUser() with the new password.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle, Lock } from 'lucide-react';

export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            // By this point, ConfirmPage.jsx's verifyOtp() call for the
            // recovery token has already succeeded and established a
            // real session - this is the same, standard way to set a
            // new password once that session exists.
            const { error: updateError } = await supabase.auth.updateUser({ password });
            if (updateError) throw updateError;

            setSuccess(true);
            setTimeout(() => navigate('/dashboard', { replace: true }), 2000);
        } catch (err) {
            setError(err.message?.includes('session')
                ? 'Your reset link has expired or was already used. Please request a new password reset.'
                : err.message || 'Could not update your password. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    if (success) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
                <div className="max-w-md w-full text-center">
                    <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                    <h1 className="text-xl font-semibold text-white mb-2">Password updated!</h1>
                    <p className="text-slate-400 text-sm">Taking you to your dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-6">
                    <Lock className="w-10 h-10 text-primary-400 mx-auto mb-3" />
                    <h1 className="text-xl font-semibold text-white">Set a new password</h1>
                    <p className="text-slate-400 text-sm mt-1">Choose a new password for your account.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">New password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="new-password"
                            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Confirm new password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            autoComplete="new-password"
                            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                            required
                        />
                    </div>

                    {error && <p className="text-red-400 text-sm">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Update Password
                    </button>
                </form>
            </div>
        </div>
    );
}

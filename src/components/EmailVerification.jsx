// src/components/EmailVerification.jsx
// Email verification enforcement component

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function EmailVerification({ user, onVerified }) {
    const [verificationSent, setVerificationSent] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isVerified, setIsVerified] = useState(false);

    useEffect(() => {
        checkVerificationStatus();
    }, [user]);

    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    async function checkVerificationStatus() {
        if (!user) return;
        
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser?.email_confirmed_at) {
            setIsVerified(true);
            if (onVerified) onVerified();
        }
    }

    async function sendVerificationEmail() {
        setLoading(true);
        setError('');
        
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email: user.email
        });
        
        if (error) {
            setError(error.message);
        } else {
            setVerificationSent(true);
            setResendCooldown(60);
        }
        setLoading(false);
    }

    if (isVerified) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Mail className="w-8 h-8 text-amber-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Verify Your Email Address</h2>
                    <p className="text-slate-400 mt-2">
                        We've sent a verification link to <strong className="text-white">{user?.email}</strong>
                    </p>
                </div>

                {verificationSent ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                            <p className="text-emerald-400 text-sm">Verification email sent! Check your inbox.</p>
                        </div>
                    </div>
                ) : null}

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4">
                    <p className="text-amber-400 text-sm flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>You must verify your email before accessing full account features. Check your spam folder if you don't see the email.</span>
                    </p>
                </div>

                <button
                    onClick={sendVerificationEmail}
                    disabled={loading || resendCooldown > 0}
                    className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Verification Email'}
                </button>

                <button
                    onClick={() => supabase.auth.signOut()}
                    className="w-full mt-3 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800"
                >
                    Sign Out
                </button>
            </div>
        </div>
    );
}

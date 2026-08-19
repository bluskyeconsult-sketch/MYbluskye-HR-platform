// src/pages/RequestRefundPage.jsx
// NEW FILE (2026-08-16) — makes the 14-day money-back guarantee
// (AboutPage.jsx) a real, working process. Not a self-service automatic
// refund — submits a request for admin review, matching the same pattern
// as fraud reports and employer verification.

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Shield, Clock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function RequestRefundPage() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) {
            navigate('/sign-in?redirect=/request-refund');
            return;
        }
        setUser(currentUser);

        const { data } = await supabase
            .from('profiles')
            .select('tier, subscribed_at')
            .eq('id', currentUser.id)
            .single();
        setProfile(data);
        setLoading(false);
    }

    const daysRemaining = profile?.subscribed_at
        ? Math.max(0, 14 - Math.floor((Date.now() - new Date(profile.subscribed_at).getTime()) / (1000 * 60 * 60 * 24)))
        : null;
    const isEligible = profile?.tier && profile.tier !== 'free' && daysRemaining > 0;

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const response = await fetch('/api/index?action=request-refund', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, reason })
            });
            const data = await response.json();

            if (!data.success) throw new Error(data.error);
            setSubmitted(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
                <div className="max-w-md text-center">
                    <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Request Submitted</h1>
                    <p className="text-slate-400">Our team will review your refund request and process it shortly. You'll be notified once it's complete.</p>
                    <Link to="/dashboard" className="inline-block mt-6 text-primary-400 hover:underline">Back to Dashboard</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-12 px-4">
            <div className="max-w-lg mx-auto">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-8 h-8 text-primary-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Request a Refund</h1>
                    <p className="text-slate-400 text-sm">Covered by our 14-day money-back guarantee</p>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    {!isEligible ? (
                        <div className="text-center py-4">
                            <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                            <p className="text-white font-medium mb-1">
                                {!profile?.tier || profile.tier === 'free'
                                    ? 'No active paid subscription found'
                                    : 'This subscription is outside the 14-day refund window'}
                            </p>
                            <p className="text-slate-400 text-sm">
                                {!profile?.tier || profile.tier === 'free'
                                    ? "You don't currently have a paid plan eligible for a refund."
                                    : 'Refund requests must be made within 14 days of your first payment.'}
                            </p>
                            <Link to="/contact" className="inline-block mt-4 text-primary-400 hover:underline text-sm">Contact support for other questions</Link>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 mb-5 p-3 bg-primary-500/10 rounded-lg border border-primary-500/20">
                                <Clock className="w-4 h-4 text-primary-400 flex-shrink-0" />
                                <p className="text-sm text-slate-300">
                                    <span className="font-medium text-white">{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</span> remaining in your refund window
                                </p>
                            </div>

                            {error && (
                                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-red-400 text-sm">{error}</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                        Reason (optional, helps us improve)
                                    </label>
                                    <textarea
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        rows={4}
                                        disabled={submitting}
                                        placeholder="Let us know why you're requesting a refund..."
                                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition resize-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    {submitting ? 'Submitting...' : 'Submit Refund Request'}
                                </button>

                                <p className="text-xs text-slate-500 text-center">
                                    Your subscription will be cancelled once the refund is processed.
                                </p>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

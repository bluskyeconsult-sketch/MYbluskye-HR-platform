// src/pages/AffiliateDashboard.jsx
// COMPLETE PROFESSIONAL AFFILIATE DASHBOARD - With unified API, enhanced UI, and analytics

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
    Users, MousePointer, DollarSign, CreditCard, Copy, CheckCircle, 
    ExternalLink, TrendingUp, Calendar, Clock, Wallet, Gift,
    BarChart3, Award, Share2, Twitter, Facebook, Linkedin,
    Mail, AlertCircle, Loader2, X, ChevronRight, Star
} from 'lucide-react';

// FIXED (2026-08-16):
// 1. Disconnected Supabase client (same pattern found and fixed
//    repeatedly this session) — now uses the shared singleton.
// 2. This page called ?action=affiliate-stats and ?action=affiliate-
//    withdraw, neither of which existed anywhere in the backend — this is
//    the actual reason the affiliate link "couldn't be found anywhere":
//    the page has never once loaded successfully. Both actions built
//    alongside this fix, including auto-creating an affiliate record with
//    a real referral link on first visit.

export default function AffiliateDashboard() {
    const navigate = useNavigate();
    const [affiliate, setAffiliate] = useState(null);
    const [stats, setStats] = useState({ clicks: 0, signups: 0, earnings: 0, available: 0 });
    const [recentSignups, setRecentSignups] = useState([]);
    const [withdrawals, setWithdrawals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawMethod, setWithdrawMethod] = useState('paypal');
    const [withdrawEmail, setWithdrawEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [timeframe, setTimeframe] = useState('month');

    useEffect(() => {
        loadAffiliateData();
    }, []);

    async function loadAffiliateData() {
        try {
            setLoading(true);
            setError(null);
            
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/sign-in?redirect=/affiliate');
                return;
            }

            // ✅ Using unified API endpoint
            const response = await fetch('/api/index?action=affiliate-stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });
            
            const result = await response.json();
            
            if (!result.success) throw new Error(result.error);
            
            const { affiliate: affiliateData, stats: statsData, signups, withdrawals: withdrawalsData } = result.data;
            
            setAffiliate(affiliateData);
            setStats(statsData);
            setRecentSignups(signups || []);
            setWithdrawals(withdrawalsData || []);
            
        } catch (err) {
            console.error('Error loading affiliate data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function copyReferralLink() {
        if (!affiliate?.referral_link) return;
        await navigator.clipboard.writeText(affiliate.referral_link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    async function requestWithdrawal() {
        const amount = parseFloat(withdrawAmount);
        
        if (!withdrawAmount || amount <= 0) {
            setError('Please enter a valid amount');
            return;
        }
        
        if (amount < 50) {
            setError('Minimum withdrawal amount is $50');
            return;
        }
        
        if (amount > stats.available) {
            setError('Insufficient balance');
            return;
        }
        
        if (!withdrawEmail) {
            setError('Please enter your payment email');
            return;
        }
        
        setSubmitting(true);
        setError(null);
        
        try {
            const response = await fetch('/api/index?action=affiliate-withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    affiliateId: affiliate.id,
                    amount: amount,
                    paymentMethod: withdrawMethod,
                    paymentEmail: withdrawEmail
                })
            });
            
            const result = await response.json();
            
            if (!result.success) throw new Error(result.error);
            
            alert('Withdrawal request submitted successfully!');
            setShowWithdrawModal(false);
            setWithdrawAmount('');
            setWithdrawEmail('');
            loadAffiliateData();
            
        } catch (err) {
            console.error('Withdrawal error:', err);
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    function shareOnSocial(platform) {
        const text = `Join me on ODUSBABA and get amazing career opportunities! ${affiliate?.referral_link}`;
        const urls = {
            twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(affiliate?.referral_link)}`,
            linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(affiliate?.referral_link)}`
        };
        window.open(urls[platform], '_blank', 'width=600,height=400');
    }

    function getCommissionBadge(level) {
        const config = {
            bronze: { label: 'Bronze', color: 'bg-amber-600/20 text-amber-400', icon: Star },
            silver: { label: 'Silver', color: 'bg-slate-400/20 text-slate-400', icon: Star },
            gold: { label: 'Gold', color: 'bg-yellow-500/20 text-yellow-400', icon: Award },
            platinum: { label: 'Platinum', color: 'bg-cyan-500/20 text-cyan-400', icon: Award }
        };
        const { label, color, icon: Icon } = config[level] || config.bronze;
        return (
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${color}`}>
                <Icon className="w-3 h-3" />
                {label}
            </span>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    const commissionRate = affiliate?.commission_rate || 10;
    const isActive = affiliate?.status === 'active';
    // FIXED (2026-08-23): affiliate.tier is never set anywhere in the real
    // backend (the affiliate-stats handler's insert only creates clicks/
    // signups/earnings/balance fields) — this always defaulted to
    // 'bronze' regardless of real performance, while the "Next Tier"
    // progress bar right next to it WAS correctly computed from real
    // earnings. That's a visible, confusing inconsistency: someone past
    // the Gold threshold would still see a Bronze badge. Now derives the
    // current tier the same way the next-tier logic already does, from
    // real stats.earnings, instead of a field that's never populated.
    const currentTier = stats.earnings >= 1000 ? 'platinum' : stats.earnings >= 500 ? 'gold' : stats.earnings >= 100 ? 'silver' : 'bronze';
    const nextTier = stats.earnings >= 1000 ? 'Platinum' : stats.earnings >= 500 ? 'Gold' : stats.earnings >= 100 ? 'Silver' : 'Bronze';

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
            <div className="max-w-7xl mx-auto px-4 py-12">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Share2 className="w-8 h-8 text-primary-400" />
                            <h1 className="text-3xl font-bold text-white">Affiliate Dashboard</h1>
                        </div>
                        <p className="text-slate-400">Earn commissions by referring professionals to ODUSBABA</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {getCommissionBadge(currentTier)}
                        {isActive ? (
                            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Active
                            </span>
                        ) : (
                            <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Pending Approval
                            </span>
                        )}
                    </div>
                </div>

                {/* Pending Approval Banner */}
                {!isActive && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-400" />
                        <p className="text-amber-400 text-sm flex-1">
                            Your affiliate account is pending admin approval. You'll be notified when approved.
                        </p>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition group">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Total Clicks</p>
                                <p className="text-2xl font-bold text-white group-hover:text-primary-400 transition">{stats.clicks.toLocaleString()}</p>
                            </div>
                            <MousePointer className="w-8 h-8 text-sky-400 opacity-50 group-hover:scale-110 transition" />
                        </div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition group">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Signups</p>
                                <p className="text-2xl font-bold text-white group-hover:text-primary-400 transition">{stats.signups.toLocaleString()}</p>
                            </div>
                            <Users className="w-8 h-8 text-emerald-400 opacity-50 group-hover:scale-110 transition" />
                        </div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition group">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Total Earnings</p>
                                <p className="text-2xl font-bold text-white group-hover:text-primary-400 transition">${stats.earnings.toLocaleString()}</p>
                            </div>
                            <DollarSign className="w-8 h-8 text-amber-400 opacity-50 group-hover:scale-110 transition" />
                        </div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition group">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Available Balance</p>
                                <p className="text-2xl font-bold text-white group-hover:text-primary-400 transition">${stats.available.toLocaleString()}</p>
                            </div>
                            <Wallet className="w-8 h-8 text-purple-400 opacity-50 group-hover:scale-110 transition" />
                        </div>
                    </div>
                </div>

                {/* Commission Rate Card */}
                <div className="bg-gradient-to-r from-primary-900/20 to-sky-900/20 border border-primary-500/30 rounded-xl p-5 mb-8">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <p className="text-slate-400 text-sm">Your Commission Rate</p>
                            <p className="text-3xl font-bold text-white">{commissionRate}%</p>
                            <p className="text-slate-400 text-xs mt-1">on every successful referral</p>
                        </div>
                        <div className="text-right">
                            <p className="text-slate-400 text-sm">Next Tier: {nextTier}</p>
                            <div className="w-48 h-2 bg-slate-700 rounded-full mt-2">
                                <div 
                                    className="h-2 bg-gradient-to-r from-primary-500 to-sky-500 rounded-full transition-all"
                                    style={{ width: `${Math.min(100, (stats.earnings / (stats.earnings >= 1000 ? 1500 : stats.earnings >= 500 ? 1000 : 500)) * 100)}%` }}
                                />
                            </div>
                            <p className="text-slate-500 text-xs mt-1">
                                {stats.earnings >= 1000 ? '🏆 Platinum Tier' : stats.earnings >= 500 ? '🥇 Gold Tier' : stats.earnings >= 100 ? '🥈 Silver Tier' : '🥉 Bronze Tier'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Referral Link Section */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-8">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Gift className="w-5 h-5 text-primary-400" />
                        Your Referral Link
                    </h2>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={affiliate?.referral_link || ''}
                                readOnly
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm pr-24"
                            />
                            <button
                                onClick={copyReferralLink}
                                className="absolute right-1 top-1/2 transform -translate-y-1/2 px-3 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-500 transition text-sm flex items-center gap-1"
                            >
                                {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-3">
                        Share this link with friends and earn {commissionRate}% commission on their purchases!
                    </p>
                    
                    {/* Social Share Buttons */}
                    {isActive && (
                        <div className="flex gap-2 mt-4">
                            <button onClick={() => shareOnSocial('twitter')} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition">
                                <Twitter className="w-4 h-4 text-sky-400" />
                            </button>
                            <button onClick={() => shareOnSocial('facebook')} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition">
                                <Facebook className="w-4 h-4 text-blue-400" />
                            </button>
                            <button onClick={() => shareOnSocial('linkedin')} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition">
                                <Linkedin className="w-4 h-4 text-blue-500" />
                            </button>
                            <button onClick={copyReferralLink} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition">
                                <Mail className="w-4 h-4 text-slate-400" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Withdrawal Section */}
                {isActive && stats.available >= 50 && (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-8">
                        <div className="flex justify-between items-center flex-wrap gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-white">Withdraw Earnings</h2>
                                <p className="text-slate-400 text-sm mt-1">Minimum withdrawal: $50</p>
                            </div>
                            <button
                                onClick={() => setShowWithdrawModal(true)}
                                className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-all duration-200 flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                            >
                                <CreditCard className="w-4 h-4" />
                                Request Withdrawal
                            </button>
                        </div>
                    </div>
                )}

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Recent Signups */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-emerald-400" />
                            Recent Referrals
                        </h2>
                        {recentSignups.length === 0 ? (
                            <div className="text-center py-8">
                                <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                <p className="text-slate-400">No referrals yet. Share your link!</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {recentSignups.map(signup => (
                                    <div key={signup.id} className="flex justify-between items-center p-3 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition">
                                        <div>
                                            <p className="text-white font-medium">{signup.profiles?.email || 'New User'}</p>
                                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                Joined {new Date(signup.signed_up_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-emerald-400 font-semibold">+${signup.commission_earned}</p>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                signup.is_paid 
                                                    ? 'bg-emerald-500/20 text-emerald-400' 
                                                    : 'bg-amber-500/20 text-amber-400'
                                            }`}>
                                                {signup.is_paid ? 'Paid' : 'Pending'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Withdrawal History */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-primary-400" />
                            Withdrawal History
                        </h2>
                        {withdrawals.length === 0 ? (
                            <div className="text-center py-8">
                                <CreditCard className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                <p className="text-slate-400">No withdrawal requests yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {withdrawals.map(w => (
                                    <div key={w.id} className="flex justify-between items-center p-3 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition">
                                        <div>
                                            <p className="text-white font-medium">${w.amount}</p>
                                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(w.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div>
                                            <span className={`px-2 py-1 rounded-full text-xs ${
                                                w.status === 'completed' 
                                                    ? 'bg-emerald-500/20 text-emerald-400' 
                                                    : w.status === 'pending' 
                                                        ? 'bg-amber-500/20 text-amber-400' 
                                                        : 'bg-red-500/20 text-red-400'
                                            }`}>
                                                {w.status === 'completed' ? 'Completed' : w.status === 'pending' ? 'Pending' : 'Rejected'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Withdrawal Modal */}
                {showWithdrawModal && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-white">Request Withdrawal</h2>
                                <button 
                                    onClick={() => setShowWithdrawModal(false)}
                                    className="text-slate-400 hover:text-white transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">
                                        Amount <span className="text-red-400">*</span>
                                    </label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input
                                            type="number"
                                            step="10"
                                            min="50"
                                            max={stats.available}
                                            value={withdrawAmount}
                                            onChange={(e) => setWithdrawAmount(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            placeholder="Minimum $50"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">Available: ${stats.available}</p>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Payment Method</label>
                                    <select
                                        value={withdrawMethod}
                                        onChange={(e) => setWithdrawMethod(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="paypal">PayPal</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="stripe">Stripe</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">
                                        Email / Account <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={withdrawEmail}
                                        onChange={(e) => setWithdrawEmail(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="your@email.com"
                                        required
                                    />
                                </div>
                                
                                {error && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-red-400" />
                                        <p className="text-red-400 text-sm">{error}</p>
                                    </div>
                                )}
                                
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={requestWithdrawal}
                                        disabled={submitting}
                                        className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                        {submitting ? 'Processing...' : 'Submit Request'}
                                    </button>
                                    <button
                                        onClick={() => setShowWithdrawModal(false)}
                                        className="flex-1 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

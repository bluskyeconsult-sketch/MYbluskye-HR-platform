import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Link } from 'react-router-dom';
import { Users, MousePointer, DollarSign, CreditCard, Copy, CheckCircle, ExternalLink } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AffiliateDashboard() {
  const [affiliate, setAffiliate] = useState(null);
  const [stats, setStats] = useState({ clicks: 0, signups: 0, earnings: 0, available: 0 });
  const [recentSignups, setRecentSignups] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('paypal');
  const [withdrawEmail, setWithdrawEmail] = useState('');

  useEffect(() => { loadAffiliateData(); }, []);

  async function loadAffiliateData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/sign-in'; return; }

    let { data: affiliateData } = await supabase.from('affiliates').select('*').eq('user_id', user.id).single();
    
    if (!affiliateData) {
      const code = generateCode();
      const referralLink = `${window.location.origin}/?ref=${code}`;
      const { data: newAffiliate } = await supabase.from('affiliates').insert({
        user_id: user.id, affiliate_code: code, referral_link: referralLink, status: 'pending'
      }).select().single();
      affiliateData = newAffiliate;
    }
    
    setAffiliate(affiliateData);
    
    const { data: clickCount } = await supabase.from('affiliate_clicks').select('id', { count: 'exact', head: true }).eq('affiliate_id', affiliateData.id);
    const { data: signupCount } = await supabase.from('affiliate_signups').select('id', { count: 'exact', head: true }).eq('affiliate_id', affiliateData.id);
    const { data: signups } = await supabase.from('affiliate_signups').select('*, profiles:referred_user_id (email, full_name, created_at)').eq('affiliate_id', affiliateData.id).order('signed_up_at', { ascending: false }).limit(10);
    const { data: withdrawalData } = await supabase.from('affiliate_withdrawals').select('*').eq('affiliate_id', affiliateData.id).order('created_at', { ascending: false });
    
    setStats({ clicks: clickCount || 0, signups: signupCount || 0, earnings: affiliateData.total_earnings || 0, available: affiliateData.available_balance || 0 });
    setRecentSignups(signups || []);
    setWithdrawals(withdrawalData || []);
    setLoading(false);
  }

  function generateCode() { return Math.random().toString(36).substring(2, 10).toUpperCase(); }

  async function copyReferralLink() {
    await navigator.clipboard.writeText(affiliate?.referral_link || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function requestWithdrawal() {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) { alert('Please enter a valid amount'); return; }
    if (parseFloat(withdrawAmount) > stats.available) { alert('Insufficient balance'); return; }
    
    const { error } = await supabase.from('affiliate_withdrawals').insert({
      affiliate_id: affiliate.id, amount: parseFloat(withdrawAmount), payment_method: withdrawMethod, payment_details: { email: withdrawEmail }, status: 'pending'
    });
    
    if (error) alert('Error: ' + error.message);
    else { alert('Withdrawal request submitted!'); setShowWithdrawModal(false); setWithdrawAmount(''); loadAffiliateData(); }
  }

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-slate-400">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Affiliate Dashboard</h1>
          {affiliate?.status === 'active' ? <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm">Active</span> : <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm">Pending Approval</span>}
        </div>
        
        {affiliate?.status !== 'active' && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
            <p className="text-amber-400 text-sm">Your affiliate account is pending admin approval. You'll be notified when approved.</p>
          </div>
        )}
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><div className="flex items-center gap-3"><MousePointer className="w-5 h-5 text-sky-400" /><div><div className="text-2xl font-bold text-white">{stats.clicks}</div><div className="text-xs text-slate-400">Total Clicks</div></div></div></div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><div className="flex items-center gap-3"><Users className="w-5 h-5 text-emerald-400" /><div><div className="text-2xl font-bold text-white">{stats.signups}</div><div className="text-xs text-slate-400">Signups</div></div></div></div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><div className="flex items-center gap-3"><DollarSign className="w-5 h-5 text-amber-400" /><div><div className="text-2xl font-bold text-white">${stats.earnings}</div><div className="text-xs text-slate-400">Total Earnings</div></div></div></div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><div className="flex items-center gap-3"><CreditCard className="w-5 h-5 text-purple-400" /><div><div className="text-2xl font-bold text-white">${stats.available}</div><div className="text-xs text-slate-400">Available Balance</div></div></div></div>
        </div>
        
        {/* Referral Link Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Your Referral Link</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input type="text" value={affiliate?.referral_link || ''} readOnly className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm" />
            <button onClick={copyReferralLink} className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors flex items-center gap-2 justify-center">
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-3">Share this link with friends and earn {affiliate?.commission_rate || 10}% commission on their purchases!</p>
        </div>
        
        {/* Withdrawal Section */}
        {stats.available >= 50 && affiliate?.status === 'active' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
            <div className="flex justify-between items-center"><h2 className="text-xl font-bold text-white">Withdraw Earnings</h2><button onClick={() => setShowWithdrawModal(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500">Request Withdrawal</button></div>
            <p className="text-slate-400 text-sm mt-2">Minimum withdrawal: $50</p>
          </div>
        )}
        
        {/* Recent Signups */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Recent Referrals</h2>
          {recentSignups.length === 0 ? <p className="text-slate-400">No referrals yet. Share your link!</p> : <div className="space-y-3">{recentSignups.map(signup => (<div key={signup.id} className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg"><div><p className="text-white font-medium">{signup.profiles?.email || 'New User'}</p><p className="text-xs text-slate-500">Joined {new Date(signup.signed_up_at).toLocaleDateString()}</p></div><div className="text-right"><p className="text-emerald-400 font-semibold">+${signup.commission_earned}</p>{signup.is_paid ? <span className="text-xs text-green-500">Paid</span> : <span className="text-xs text-amber-500">Pending</span>}</div></div>))}</div>}
        </div>
        
        {/* Withdrawal History */}
        {withdrawals.length > 0 && (<div className="bg-slate-900 border border-slate-800 rounded-xl p-6"><h2 className="text-xl font-bold text-white mb-4">Withdrawal History</h2><div className="space-y-3">{withdrawals.map(w => (<div key={w.id} className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg"><div><p className="text-white font-medium">${w.amount}</p><p className="text-xs text-slate-500">{new Date(w.created_at).toLocaleDateString()}</p></div><div><span className={`px-2 py-1 rounded-full text-xs ${w.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : w.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>{w.status}</span></div></div>))}</div></div>)}
      </div>
      
      {/* Withdrawal Modal */}
      {showWithdrawModal && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md"><h2 className="text-xl font-bold text-white mb-4">Request Withdrawal</h2><div className="space-y-4"><div><label className="block text-sm font-medium text-slate-300 mb-1">Amount</label><input type="number" step="10" min="50" max={stats.available} value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" placeholder="Minimum $50" /></div><div><label className="block text-sm font-medium text-slate-300 mb-1">Payment Method</label><select value={withdrawMethod} onChange={e => setWithdrawMethod(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"><option value="paypal">PayPal</option><option value="bank_transfer">Bank Transfer</option><option value="stripe">Stripe</option></select></div><div><label className="block text-sm font-medium text-slate-300 mb-1">Email / Account</label><input type="email" value={withdrawEmail} onChange={e => setWithdrawEmail(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" placeholder="your@email.com" required /></div><div className="flex gap-3"><button onClick={requestWithdrawal} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500">Submit Request</button><button onClick={() => setShowWithdrawModal(false)} className="flex-1 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600">Cancel</button></div></div></div></div>)}
    </div>
  );
}

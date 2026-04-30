import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Users, DollarSign, CheckCircle, XCircle, Eye } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AffiliateManagement() {
  const [affiliates, setAffiliates] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, totalPaid: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: affiliateData } = await supabase.from('affiliates').select('*, profiles:user_id (email, full_name)').order('created_at', { ascending: false });
    const { data: withdrawalData } = await supabase.from('affiliate_withdrawals').select('*, affiliates:affiliate_id (user_id, profiles:user_id (email))').eq('status', 'pending').order('created_at', { ascending: true });
    
    setAffiliates(affiliateData || []);
    setWithdrawals(withdrawalData || []);
    setStats({ total: affiliateData?.length || 0, active: affiliateData?.filter(a => a.status === 'active').length || 0, pending: affiliateData?.filter(a => a.status === 'pending').length || 0, totalPaid: affiliateData?.reduce((sum, a) => sum + (a.withdrawn_amount || 0), 0) || 0 });
    setLoading(false);
  }

  async function updateAffiliateStatus(affiliateId, status) {
    await supabase.from('affiliates').update({ status, approved_at: status === 'active' ? new Date().toISOString() : null }).eq('id', affiliateId);
    loadData();
  }

  async function processWithdrawal(withdrawalId, status) {
    const withdrawal = withdrawals.find(w => w.id === withdrawalId);
    if (status === 'completed') {
      await supabase.from('affiliates').update({ available_balance: supabase.raw('available_balance - ?', [withdrawal.amount]), withdrawn_amount: supabase.raw('withdrawn_amount + ?', [withdrawal.amount]) }).eq('id', withdrawal.affiliate_id);
    }
    await supabase.from('affiliate_withdrawals').update({ status, processed_at: new Date().toISOString() }).eq('id', withdrawalId);
    loadData();
  }

  if (loading) return <div className="p-8 text-center text-slate-400">Loading...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Affiliate Management</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><div className="text-2xl font-bold text-white">{stats.total}</div><div className="text-xs text-slate-400">Total Affiliates</div></div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><div className="text-2xl font-bold text-emerald-400">{stats.active}</div><div className="text-xs text-slate-400">Active</div></div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><div className="text-2xl font-bold text-amber-400">{stats.pending}</div><div className="text-xs text-slate-400">Pending Approval</div></div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><div className="text-2xl font-bold text-purple-400">${stats.totalPaid}</div><div className="text-xs text-slate-400">Total Paid Out</div></div>
      </div>
      
      {/* Pending Withdrawals */}
      {withdrawals.length > 0 && (<div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6"><h2 className="text-lg font-semibold text-white mb-4">Pending Withdrawals</h2><div className="space-y-3">{withdrawals.map(w => (<div key={w.id} className="flex justify-between items-center p-4 bg-slate-800/50 rounded-lg"><div><p className="text-white font-medium">{w.affiliates?.profiles?.email}</p><p className="text-sm text-slate-400">Amount: ${w.amount} • {w.payment_method}</p><p className="text-xs text-slate-500">{new Date(w.created_at).toLocaleDateString()}</p></div><div className="flex gap-2"><button onClick={() => processWithdrawal(w.id, 'completed')} className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-500"><CheckCircle className="w-4 h-4" /></button><button onClick={() => processWithdrawal(w.id, 'rejected')} className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-500"><XCircle className="w-4 h-4" /></button></div></div>))}</div></div>)}
      
      {/* Affiliates List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full"><thead className="bg-slate-800"><tr><th className="px-6 py-3 text-left text-white">Affiliate</th><th className="px-6 py-3 text-left text-white">Code</th><th className="px-6 py-3 text-left text-white">Clicks</th><th className="px-6 py-3 text-left text-white">Signups</th><th className="px-6 py-3 text-left text-white">Earnings</th><th className="px-6 py-3 text-left text-white">Status</th><th className="px-6 py-3 text-left text-white">Actions</th></tr></thead>
        <tbody>{affiliates.map(aff => (<tr key={aff.id} className="border-t border-slate-800"><td className="px-6 py-4"><p className="text-white">{aff.profiles?.full_name || 'N/A'}</p><p className="text-xs text-slate-500">{aff.profiles?.email}</p></td><td className="px-6 py-4"><code className="text-xs bg-slate-800 px-2 py-1 rounded">{aff.affiliate_code}</code></td><td className="px-6 py-4 text-white">{aff.total_clicks}</td><td className="px-6 py-4 text-white">{aff.total_signups}</td><td className="px-6 py-4 text-white">${aff.total_earnings}</td><td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs ${aff.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : aff.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>{aff.status}</span></td><td className="px-6 py-4"><div className="flex gap-2">{aff.status === 'pending' && <button onClick={() => updateAffiliateStatus(aff.id, 'active')} className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-500">Approve</button>}<button className="px-3 py-1 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-600">View</button></div></td></tr>))}</tbody></table>
      </div>
    </div>
  );
}

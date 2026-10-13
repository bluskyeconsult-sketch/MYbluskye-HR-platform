// src/pages/admin/AffiliateManagement.jsx
//
// EARLIER FIXES (2026-08-09): shared Supabase client; replaced the
// non-existent supabase.raw(); the View button now does something.
//
// REWORKED (2026-10-13):
// 1. Withdrawals are now approved/rejected through the server action
//    admin-process-withdrawal instead of being changed from the browser.
//    The old code read the balance, then wrote a new one, with nothing to
//    stop a double click (or two admins) paying the same withdrawal twice
//    or taking the balance below zero. The server checks the request is
//    still pending, the balance covers it, and applies the balance change
//    only if nobody else changed it in between.
// 2. The pending list now shows the payout method and the PAYMENT EMAIL
//    the affiliate asked to be paid at. Before, only the account email was
//    shown, so an admin could not tell where to send the money.
// 3. Approving now asks for confirmation naming amount, method and email,
//    because completing a withdrawal records that the money was paid.
// 4. Status changes (approve, suspend, reactivate) check for errors and
//    report them; before, a refused write looked like success.
// 5. Table is scrollable on small screens; details open in a panel
//    instead of a browser alert; money is shown to two decimals.
//
// NOTE: this page records payouts, it does not send money. Pay the
// affiliate first (bank, PayPal etc.), then press Mark paid.

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { authenticatedFetch } from '../../lib/authFetch';
import { CheckCircle, XCircle, Eye, Loader2, X } from 'lucide-react';

const money = (n) => `$${Number(n || 0).toFixed(2)}`;

export default function AffiliateManagement() {
  const [affiliates, setAffiliates] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, totalPaid: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState(null); // { type, text }
  const [busyId, setBusyId] = useState(null);
  const [detail, setDetail] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [affRes, wdRes] = await Promise.all([
        supabase.from('affiliates').select('*, profiles:user_id (email, full_name)').order('created_at', { ascending: false }),
        supabase.from('affiliate_withdrawals').select('*, affiliates:affiliate_id (user_id, profiles:user_id (email, full_name))').eq('status', 'pending').order('created_at', { ascending: true })
      ]);
      if (affRes.error) throw affRes.error;
      if (wdRes.error) throw wdRes.error;

      const affiliateData = affRes.data || [];
      setAffiliates(affiliateData);
      setWithdrawals(wdRes.data || []);
      setStats({
        total: affiliateData.length,
        active: affiliateData.filter(a => a.status === 'active').length,
        pending: affiliateData.filter(a => a.status === 'pending').length,
        totalPaid: affiliateData.reduce((sum, a) => sum + (Number(a.withdrawn_amount) || 0), 0)
      });
      setLoadError('');
    } catch (err) {
      console.error('Affiliate load error:', err);
      setLoadError(err.message || 'Could not load affiliates.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function updateAffiliateStatus(aff, status) {
    const verb = status === 'active' ? (aff.status === 'suspended' ? 'Reactivate' : 'Approve') : 'Suspend';
    if (!confirm(`${verb} ${aff.profiles?.full_name || aff.profiles?.email || 'this affiliate'}?`)) return;
    setBusyId(aff.id);
    setNotice(null);
    const { error } = await supabase
      .from('affiliates')
      .update({ status, approved_at: status === 'active' ? new Date().toISOString() : aff.approved_at || null })
      .eq('id', aff.id);
    setBusyId(null);
    if (error) {
      setNotice({ type: 'error', text: `Could not change status: ${error.message}` });
      return;
    }
    setNotice({ type: 'ok', text: { Approve: 'Affiliate approved.', Suspend: 'Affiliate suspended.', Reactivate: 'Affiliate reactivated.' }[verb] });
    loadData();
  }

  async function processWithdrawal(w, decision) {
    const who = w.affiliates?.profiles?.full_name || w.affiliates?.profiles?.email || 'this affiliate';
    const message = decision === 'completed'
      ? `Mark this withdrawal as PAID?\n\n${who}\nAmount: ${money(w.amount)}\nMethod: ${w.payment_method}\nPay to: ${w.payment_email || 'no payment email recorded'}\n\nOnly confirm after you have actually sent the money. This reduces their available balance.`
      : `Reject the ${money(w.amount)} withdrawal request from ${who}? Their balance is not changed.`;
    if (!confirm(message)) return;

    setBusyId(w.id);
    setNotice(null);
    try {
      await authenticatedFetch('admin-process-withdrawal', { withdrawalId: w.id, decision });
      setNotice({ type: 'ok', text: decision === 'completed' ? `Recorded as paid: ${money(w.amount)} to ${who}.` : 'Withdrawal rejected.' });
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setBusyId(null);
      loadData();
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Loading...</div>;

  const statusBadge = (status) => (
    <span className={`px-2 py-1 rounded-full text-xs ${status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>{status}</span>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Affiliate Management</h1>

      {loadError && <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm">Could not load affiliates: {loadError}</div>}
      {notice && (
        <div className={`mb-4 p-3 rounded-lg text-sm border ${notice.type === 'ok' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border-red-500/20 text-red-300'}`}>{notice.text}</div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><div className="text-2xl font-bold text-white">{stats.total}</div><div className="text-xs text-slate-400">Total Affiliates</div></div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><div className="text-2xl font-bold text-emerald-400">{stats.active}</div><div className="text-xs text-slate-400">Active</div></div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><div className="text-2xl font-bold text-amber-400">{stats.pending}</div><div className="text-xs text-slate-400">Pending Approval</div></div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><div className="text-2xl font-bold text-purple-400">{money(stats.totalPaid)}</div><div className="text-xs text-slate-400">Total Paid Out</div></div>
      </div>

      {withdrawals.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-1">Pending Withdrawals</h2>
          <p className="text-xs text-slate-500 mb-4">Pay the affiliate first, then press Mark paid. This page records the payout; it does not send money.</p>
          <div className="space-y-3">
            {withdrawals.map(w => (
              <div key={w.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-4 bg-slate-800/50 rounded-lg">
                <div className="min-w-0">
                  <p className="text-white font-medium">{w.affiliates?.profiles?.full_name || w.affiliates?.profiles?.email}</p>
                  <p className="text-sm text-slate-300">{money(w.amount)} via {w.payment_method}</p>
                  <p className="text-sm text-slate-400 break-all">Pay to: <span className="text-white">{w.payment_email || 'not recorded'}</span></p>
                  <p className="text-xs text-slate-500">Requested {new Date(w.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button disabled={busyId === w.id} onClick={() => processWithdrawal(w, 'completed')} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-500 flex items-center gap-1 disabled:opacity-50">
                    {busyId === w.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Mark paid
                  </button>
                  <button disabled={busyId === w.id} onClick={() => processWithdrawal(w, 'rejected')} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-500 flex items-center gap-1 disabled:opacity-50">
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead className="bg-slate-800">
            <tr>
              {['Affiliate', 'Code', 'Clicks', 'Signups', 'Earnings', 'Balance', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-white text-sm">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {affiliates.map(aff => (
              <tr key={aff.id} className="border-t border-slate-800">
                <td className="px-4 py-3"><p className="text-white">{aff.profiles?.full_name || 'N/A'}</p><p className="text-xs text-slate-500">{aff.profiles?.email}</p></td>
                <td className="px-4 py-3"><code className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-200">{aff.affiliate_code}</code></td>
                <td className="px-4 py-3 text-white">{aff.total_clicks || 0}</td>
                <td className="px-4 py-3 text-white">{aff.total_signups || 0}</td>
                <td className="px-4 py-3 text-white">{money(aff.total_earnings)}</td>
                <td className="px-4 py-3 text-white">{money(aff.available_balance)}</td>
                <td className="px-4 py-3">{statusBadge(aff.status)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 flex-wrap">
                    {aff.status === 'pending' && <button disabled={busyId === aff.id} onClick={() => updateAffiliateStatus(aff, 'active')} className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-500 disabled:opacity-50">Approve</button>}
                    {aff.status === 'active' && <button disabled={busyId === aff.id} onClick={() => updateAffiliateStatus(aff, 'suspended')} className="px-3 py-1 bg-red-600/80 text-white rounded-lg text-sm hover:bg-red-600 disabled:opacity-50">Suspend</button>}
                    {aff.status === 'suspended' && <button disabled={busyId === aff.id} onClick={() => updateAffiliateStatus(aff, 'active')} className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-500 disabled:opacity-50">Reactivate</button>}
                    <button onClick={() => setDetail(aff)} className="px-3 py-1 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-600 flex items-center gap-1"><Eye className="w-3 h-3" /> View</button>
                  </div>
                </td>
              </tr>
            ))}
            {affiliates.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No affiliates yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-white">Affiliate details</h2>
              <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <dl className="space-y-2 text-sm">
              {[
                ['Name', detail.profiles?.full_name || 'N/A'],
                ['Email', detail.profiles?.email || 'no email'],
                ['Code', detail.affiliate_code],
                ['Status', detail.status],
                ['Clicks', detail.total_clicks || 0],
                ['Signups', detail.total_signups || 0],
                ['Total earnings', money(detail.total_earnings)],
                ['Available balance', money(detail.available_balance)],
                ['Already withdrawn', money(detail.withdrawn_amount)],
                ['Joined', detail.created_at ? new Date(detail.created_at).toLocaleDateString() : 'unknown']
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4"><dt className="text-slate-400">{k}</dt><dd className="text-white text-right break-all">{String(v)}</dd></div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}

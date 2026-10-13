// src/pages/admin/AdminRefundRequests.jsx
// Admin side of the refund fulfilment flow.
// Approving triggers a real Stripe refund via admin-process-refund; this
// page itself never touches Stripe directly.
//
// FIXED (2026-10-13): both server actions this page calls
// (admin-refund-requests and admin-process-refund) require a signed-in
// admin's login token, but the page used plain fetch() calls that sent
// none - so the list always came back empty (the 401 was swallowed) and
// Approve/Reject would have failed. Now uses the shared authenticatedFetch
// helper. The client no longer sends adminUserId either: the server
// ignores it and takes the verified admin from the token. Load errors
// are now shown instead of hidden, and the page tells the admin exactly
// what an approval will do.

import { useState, useEffect, useCallback } from 'react';
import { authenticatedFetch } from '../../lib/authFetch';
import { RefreshCw, CheckCircle, XCircle, Loader2, DollarSign, Clock } from 'lucide-react';

export default function AdminRefundRequests() {
    const [requests, setRequests] = useState([]);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [processingId, setProcessingId] = useState(null);
    const [loadError, setLoadError] = useState('');
    const [notice, setNotice] = useState(null); // { type: 'ok' | 'error', text }

    const loadRequests = useCallback(async () => {
        setRefreshing(true);
        try {
            const data = await authenticatedFetch(`admin-refund-requests&status=${encodeURIComponent(statusFilter)}`);
            setRequests(data.requests || []);
            setLoadError('');
        } catch (err) {
            console.error('Failed to load refund requests:', err);
            setRequests([]);
            setLoadError(err.message || 'Could not load refund requests.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        loadRequests();
    }, [loadRequests]);

    async function handleDecision(req, decision) {
        const who = req.profiles?.full_name || req.profiles?.email || 'this member';
        const confirmMsg = decision === 'approved'
            ? `Approve and refund ${who}?\n\nThis will:\n- issue a real refund of their latest payment in Stripe\n- cancel their subscription immediately\n- move their account back to the free plan\n\nThis cannot be undone.`
            : `Reject the refund request from ${who}?`;
        if (!confirm(confirmMsg)) return;

        let adminNotes = null;
        if (decision === 'rejected') {
            adminNotes = prompt('Reason for rejection (optional, kept in your records and not sent to the member automatically):') || null;
        }

        setProcessingId(req.id);
        setNotice(null);
        try {
            await authenticatedFetch('admin-process-refund', { requestId: req.id, decision, adminNotes });
            setNotice({
                type: 'ok',
                text: decision === 'approved'
                    ? `Refund processed for ${who}. Record it under Finance & Compliance > Income & Costs as a refund so your profit figure stays right.`
                    : `Request from ${who} rejected.`
            });
            await loadRequests();
        } catch (err) {
            setNotice({ type: 'error', text: `Could not complete that: ${err.message}` });
        } finally {
            setProcessingId(null);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6 gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <DollarSign className="w-6 h-6 text-primary-400" /> Refund Requests
                    </h1>
                    <p className="text-slate-400 text-sm">14-day money-back guarantee fulfilment</p>
                </div>
                <button onClick={loadRequests} disabled={refreshing} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2 text-sm">
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                </button>
            </div>

            {notice && (
                <div className={`mb-4 p-3 rounded-lg text-sm border ${notice.type === 'ok' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border-red-500/20 text-red-300'}`}>
                    {notice.text}
                </div>
            )}

            {loadError && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm">
                    Could not load refund requests: {loadError}
                </div>
            )}

            <div className="flex gap-2 border-b border-slate-800 mb-6">
                {['pending', 'processed', 'rejected'].map(status => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-4 py-2 text-sm font-medium transition capitalize ${
                            statusFilter === status ? 'text-primary-400 border-b-2 border-primary-400' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {requests.length === 0 && !loadError ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                    <DollarSign className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white">No {statusFilter} refund requests</h3>
                </div>
            ) : (
                <div className="space-y-3">
                    {requests.map(req => (
                        <div key={req.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                            <div className="flex justify-between items-start mb-3 gap-3">
                                <div>
                                    <p className="text-white font-semibold">{req.profiles?.full_name || 'Unknown'}</p>
                                    <p className="text-slate-500 text-xs">{req.profiles?.email}</p>
                                </div>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 capitalize">{req.profiles?.tier}</span>
                            </div>

                            <p className="text-sm text-slate-400 mb-1 flex items-center gap-1.5 flex-wrap">
                                <Clock className="w-3.5 h-3.5" /> Requested {new Date(req.requested_at).toLocaleDateString()}
                                {req.profiles?.subscribed_at && ` · Subscribed ${new Date(req.profiles.subscribed_at).toLocaleDateString()}`}
                                {req.profiles?.subscribed_at && req.requested_at && (() => {
                                    const days = Math.floor((new Date(req.requested_at) - new Date(req.profiles.subscribed_at)) / 86400000);
                                    return ` · ${days} day${days === 1 ? '' : 's'} after subscribing${days > 14 ? ' (outside the 14-day guarantee)' : ''}`;
                                })()}
                            </p>

                            {req.reason && (
                                <div className="bg-slate-800/50 rounded-lg p-3 mt-3">
                                    <p className="text-sm text-slate-300">{req.reason}</p>
                                </div>
                            )}

                            {req.admin_notes && (
                                <div className="bg-slate-800/30 rounded-lg p-3 mt-2">
                                    <p className="text-xs text-slate-500">Admin notes: {req.admin_notes}</p>
                                </div>
                            )}

                            {req.status === 'pending' && (
                                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-800">
                                    <button
                                        onClick={() => handleDecision(req, 'approved')}
                                        disabled={processingId === req.id}
                                        className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 flex items-center gap-1.5 disabled:opacity-50"
                                    >
                                        {processingId === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                        Approve & Refund
                                    </button>
                                    <button
                                        onClick={() => handleDecision(req, 'rejected')}
                                        disabled={processingId === req.id}
                                        className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 flex items-center gap-1.5 disabled:opacity-50"
                                    >
                                        <XCircle className="w-3.5 h-3.5" /> Reject
                                    </button>
                                </div>
                            )}

                            {req.stripe_refund_id && (
                                <p className="text-xs text-slate-500 mt-2">Stripe refund: {req.stripe_refund_id}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

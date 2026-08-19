// src/pages/admin/AdminRefundRequests.jsx
// NEW FILE (2026-08-16) — admin side of the refund fulfillment flow.
// Approving triggers a real Stripe refund via admin-process-refund; this
// page itself never touches Stripe directly.

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { RefreshCw, CheckCircle, XCircle, Loader2, DollarSign, Clock } from 'lucide-react';

export default function AdminRefundRequests() {
    const [requests, setRequests] = useState([]);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        loadRequests();
    }, [statusFilter]);

    async function loadRequests() {
        setRefreshing(true);
        try {
            const response = await fetch(`/api/index?action=admin-refund-requests&status=${statusFilter}`);
            const data = await response.json();
            if (data.success) setRequests(data.requests || []);
        } catch (err) {
            console.error('Failed to load refund requests:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    async function handleDecision(requestId, decision) {
        const confirmMsg = decision === 'approved'
            ? 'Approve and process this refund? This will issue a real refund via Stripe and cancel the subscription immediately.'
            : 'Reject this refund request?';
        if (!confirm(confirmMsg)) return;

        let adminNotes = null;
        if (decision === 'rejected') {
            adminNotes = prompt('Reason for rejection (optional, not shown to user automatically):') || null;
        }

        setProcessingId(requestId);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const response = await fetch('/api/index?action=admin-process-refund', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId, decision, adminNotes, adminUserId: user?.id })
            });
            const data = await response.json();

            if (!data.success) throw new Error(data.error);

            alert(decision === 'approved' ? 'Refund processed successfully.' : 'Request rejected.');
            loadRequests();
        } catch (err) {
            alert('Failed: ' + err.message);
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
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <DollarSign className="w-6 h-6 text-primary-400" /> Refund Requests
                    </h1>
                    <p className="text-slate-400 text-sm">14-day money-back guarantee fulfillment</p>
                </div>
                <button onClick={loadRequests} disabled={refreshing} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2 text-sm">
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                </button>
            </div>

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

            {requests.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                    <DollarSign className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white">No {statusFilter} refund requests</h3>
                </div>
            ) : (
                <div className="space-y-3">
                    {requests.map(req => (
                        <div key={req.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <p className="text-white font-semibold">{req.profiles?.full_name || 'Unknown'}</p>
                                    <p className="text-slate-500 text-xs">{req.profiles?.email}</p>
                                </div>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 capitalize">{req.profiles?.tier}</span>
                            </div>

                            <p className="text-sm text-slate-400 mb-1 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" /> Requested {new Date(req.requested_at).toLocaleDateString()}
                                {req.profiles?.subscribed_at && ` · Subscribed ${new Date(req.profiles.subscribed_at).toLocaleDateString()}`}
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
                                        onClick={() => handleDecision(req.id, 'approved')}
                                        disabled={processingId === req.id}
                                        className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 flex items-center gap-1.5 disabled:opacity-50"
                                    >
                                        {processingId === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                        Approve & Refund
                                    </button>
                                    <button
                                        onClick={() => handleDecision(req.id, 'rejected')}
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

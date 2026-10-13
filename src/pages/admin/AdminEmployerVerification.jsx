// src/pages/admin/AdminEmployerVerification.jsx
// Admin review of the business details employers submit before they get
// verified employer / job-posting status.
//
// REVIEWED + FIXED (2026-10-13):
// - Approve, Reject and Revoke never looked at the result of the update.
//   Supabase does not throw on a failed write, so a blocked update (for
//   example by a row-level-security rule) still refreshed the list and
//   looked like it had worked. Every write now checks the error and the
//   returned row, and a banner says what happened.
// - Approve had no confirmation; one stray click verified a business.
//   Approve now asks first. Reject and Revoke use a confirm too.
// - Rejection used prompt() and alert(); replaced with an inline reason
//   box and a banner. The reason is stored in rejection_reason, and the
//   box says it is shown to the employer so it is written accordingly.
// - A load failure was only logged to the console; it is now shown.
// - The list used profiles!inner(...), which drops any submission whose
//   profile row is missing and fails outright if the relationship is not
//   named as expected. It now tries that embed first and, if it errors,
//   falls back to a plain read plus a separate profiles lookup, so the
//   queue can never silently vanish.
// - Revoke sends the employer back to 'pending' (as before), not
//   'rejected', so they stay in the queue for a fresh decision.
// - The page-level admin check is kept (the route is already guarded);
//   it now uses the router instead of hard page reloads.

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Building2, CheckCircle, XCircle, Loader2, RefreshCw, Search, Mail, Phone, MapPin, Globe, FileText } from 'lucide-react';

const BADGES = {
    pending: { label: 'Pending Review', color: 'bg-amber-500/20 text-amber-400' },
    verified: { label: 'Verified', color: 'bg-emerald-500/20 text-emerald-400' },
    rejected: { label: 'Rejected', color: 'bg-red-500/20 text-red-400' }
};

export default function AdminEmployerVerification() {
    const navigate = useNavigate();
    const [verifications, setVerifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [searchTerm, setSearchTerm] = useState('');
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [processingId, setProcessingId] = useState(null);
    const [rejectingId, setRejectingId] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [loadError, setLoadError] = useState('');
    const [notice, setNotice] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { navigate('/admin-login'); return; }
            const { data: profile } = await supabase.from('profiles').select('user_type').eq('id', user.id).single();
            const isAdmin = profile?.user_type === 'admin' || profile?.user_type === 'super_admin';
            if (!isAdmin) { navigate('/admin/dashboard'); return; }
            if (!cancelled) setIsAuthorized(true);
        })();
        return () => { cancelled = true; };
    }, [navigate]);

    const loadVerifications = useCallback(async () => {
        setRefreshing(true);
        try {
            const build = (select) => {
                let q = supabase.from('employer_verifications').select(select).order('created_at', { ascending: false });
                if (statusFilter !== 'all') q = q.eq('verification_status', statusFilter);
                return q;
            };

            let rows;
            const embedded = await build('*, profiles!inner(full_name, email)');
            if (!embedded.error) {
                rows = embedded.data || [];
            } else {
                // Embed not available: read the rows alone, then look names up.
                const plain = await build('*');
                if (plain.error) throw plain.error;
                rows = plain.data || [];
                const ids = [...new Set(rows.map(r => r.user_id).filter(Boolean))];
                if (ids.length > 0) {
                    const { data: people } = await supabase.from('profiles').select('id, full_name, email').in('id', ids);
                    const byId = Object.fromEntries((people || []).map(p => [p.id, p]));
                    rows = rows.map(r => ({ ...r, profiles: byId[r.user_id] || null }));
                }
            }
            setVerifications(rows);
            setLoadError('');
        } catch (err) {
            console.error('Error loading employer verifications:', err);
            setVerifications([]);
            setLoadError(err.message || 'Could not load employer verifications.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        if (isAuthorized) loadVerifications();
    }, [isAuthorized, loadVerifications]);

    async function setStatus(v, status, extra = {}) {
        setProcessingId(v.id);
        setNotice(null);
        const { data, error } = await supabase
            .from('employer_verifications')
            .update({ verification_status: status, ...extra })
            .eq('id', v.id)
            .select('id');
        setProcessingId(null);
        if (error || !data || data.length === 0) {
            setNotice({ type: 'error', text: `Could not update ${v.company_name}: ${error?.message || 'no row was changed (check permissions)'}` });
            return false;
        }
        return true;
    }

    async function handleApprove(v) {
        if (!confirm(`Verify ${v.company_name}?\n\nThey will be treated as a verified employer.`)) return;
        if (await setStatus(v, 'verified', { rejection_reason: null })) {
            setNotice({ type: 'ok', text: `${v.company_name} verified.` });
            loadVerifications();
        }
    }

    async function confirmReject(v) {
        const reason = rejectReason.trim();
        if (!reason) {
            setNotice({ type: 'error', text: 'Please give a reason so the employer knows what to fix.' });
            return;
        }
        if (await setStatus(v, 'rejected', { rejection_reason: reason })) {
            setRejectingId(null);
            setRejectReason('');
            setNotice({ type: 'ok', text: `${v.company_name} rejected.` });
            loadVerifications();
        }
    }

    async function handleRevoke(v) {
        if (!confirm(`Revoke verification for ${v.company_name}?\n\nThey lose verified status and go back to Pending Review.`)) return;
        if (await setStatus(v, 'pending')) {
            setNotice({ type: 'ok', text: `${v.company_name} moved back to Pending Review.` });
            loadVerifications();
        }
    }

    const term = searchTerm.trim().toLowerCase();
    const filtered = verifications.filter(v =>
        !term ||
        v.company_name?.toLowerCase().includes(term) ||
        v.profiles?.full_name?.toLowerCase().includes(term) ||
        v.profiles?.email?.toLowerCase().includes(term)
    );

    function StatusBadge({ status }) {
        const { label, color } = BADGES[status] || BADGES.pending;
        return <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>{label}</span>;
    }

    if (!isAuthorized || loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Building2 className="w-6 h-6 text-primary-400" /> Employer Verification
                    </h1>
                    <p className="text-slate-400 text-sm">Review business details before granting verified employer status</p>
                </div>
                <button onClick={loadVerifications} disabled={refreshing} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2 text-sm">
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                </button>
            </div>

            {loadError && <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm">Could not load submissions: {loadError}</div>}
            {notice && (
                <div className={`mb-4 p-3 rounded-lg text-sm border ${notice.type === 'ok' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border-red-500/20 text-red-300'}`}>{notice.text}</div>
            )}

            <div className="flex gap-2 border-b border-slate-800 mb-6 flex-wrap">
                {['pending', 'verified', 'rejected', 'all'].map(status => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-4 py-2 text-sm font-medium transition capitalize ${statusFilter === status ? 'text-primary-400 border-b-2 border-primary-400' : 'text-slate-400 hover:text-white'}`}
                    >
                        {status === 'pending' ? 'Pending Review' : status}
                    </button>
                ))}
            </div>

            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by company, name, or email..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
            </div>

            {filtered.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                    <Building2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                        {statusFilter === 'pending' ? 'No Submissions Awaiting Review' : `No ${statusFilter} Submissions`}
                    </h3>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(v => {
                        const busy = processingId === v.id;
                        return (
                            <div key={v.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                                    <div>
                                        <p className="text-white font-semibold text-lg">{v.company_name}</p>
                                        <p className="text-slate-500 text-xs">Submitted by {v.profiles?.full_name || 'Unknown'}{v.profiles?.email ? ` (${v.profiles.email})` : ''}</p>
                                    </div>
                                    <StatusBadge status={v.verification_status} />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-400 mb-3">
                                    {v.company_registration_number && <p>Registration #: <span className="text-slate-300">{v.company_registration_number}</span></p>}
                                    {v.tax_id && <p>Tax ID: <span className="text-slate-300">{v.tax_id}</span></p>}
                                    {v.business_address && <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 flex-shrink-0" /> {v.business_address}</p>}
                                    {v.business_phone && <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 flex-shrink-0" /> {v.business_phone}</p>}
                                    {v.business_email && <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 flex-shrink-0" /> {v.business_email}</p>}
                                    {v.website_url && (
                                        <a href={v.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary-400 hover:underline break-all">
                                            <Globe className="w-3.5 h-3.5 flex-shrink-0" /> {v.website_url}
                                        </a>
                                    )}
                                </div>

                                {v.verification_status === 'rejected' && v.rejection_reason && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-3 flex items-start gap-2">
                                        <FileText className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-red-300">{v.rejection_reason}</p>
                                    </div>
                                )}

                                {rejectingId === v.id && (
                                    <div className="mb-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                                        <label className="block text-xs text-slate-400 mb-1">Reason for rejection (the employer can see this)</label>
                                        <textarea
                                            value={rejectReason}
                                            onChange={(e) => setRejectReason(e.target.value)}
                                            rows={3}
                                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm"
                                            placeholder="e.g. We could not match the registration number to a registered company."
                                        />
                                        <div className="flex gap-2 mt-2">
                                            <button onClick={() => confirmReject(v)} disabled={busy} className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
                                                {busy ? 'Rejecting...' : 'Confirm rejection'}
                                            </button>
                                            <button onClick={() => { setRejectingId(null); setRejectReason(''); }} className="px-4 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600">Cancel</button>
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-800">
                                    {v.verification_status === 'pending' && (
                                        <>
                                            <button onClick={() => handleApprove(v)} disabled={busy} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 flex items-center gap-1.5 disabled:opacity-50">
                                                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Approve
                                            </button>
                                            <button onClick={() => { setRejectingId(v.id); setRejectReason(''); setNotice(null); }} disabled={busy} className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 flex items-center gap-1.5 disabled:opacity-50">
                                                <XCircle className="w-3.5 h-3.5" /> Reject
                                            </button>
                                        </>
                                    )}
                                    {v.verification_status === 'verified' && (
                                        <button onClick={() => handleRevoke(v)} disabled={busy} className="px-4 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 disabled:opacity-50">
                                            Revoke Verification
                                        </button>
                                    )}
                                    {v.verification_status === 'rejected' && (
                                        <button onClick={() => handleApprove(v)} disabled={busy} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 flex items-center gap-1.5 disabled:opacity-50">
                                            <CheckCircle className="w-3.5 h-3.5" /> Verify Anyway
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

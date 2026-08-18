// src/pages/admin/AdminEmployerVerification.jsx
// NEW FILE (2026-08-16) — the missing half of employer verification.
// EmployerVerification.jsx lets employers submit their business details,
// but nothing ever approved or rejected them — verification_status would
// sit on 'pending' forever. Same pattern as AdminWorkforce.jsx.

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Building2, CheckCircle, XCircle, Loader2, RefreshCw, Search, Mail, Phone, MapPin, Globe, FileText } from 'lucide-react';

export default function AdminEmployerVerification() {
    const [verifications, setVerifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [searchTerm, setSearchTerm] = useState('');
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        checkAdminAccess();
    }, []);

    useEffect(() => {
        if (isAuthorized) loadVerifications();
    }, [statusFilter, isAuthorized]);

    async function checkAdminAccess() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = '/admin-login'; return; }

        const { data: profile } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('id', user.id)
            .single();

        const isAdmin = profile?.user_type === 'admin' || profile?.user_type === 'super_admin';
        if (!isAdmin) {
            alert('Access denied. Admin access required.');
            window.location.href = '/admin/dashboard';
            return;
        }

        setIsAuthorized(true);
    }

    async function loadVerifications() {
        setRefreshing(true);
        try {
            let query = supabase
                .from('employer_verifications')
                .select('*, profiles!inner(full_name, email)')
                .order('created_at', { ascending: false });

            if (statusFilter !== 'all') {
                query = query.eq('verification_status', statusFilter);
            }

            const { data, error } = await query;
            if (error) throw error;
            setVerifications(data || []);
        } catch (err) {
            console.error('Error loading employer verifications:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    async function handleApprove(id) {
        setProcessingId(id);
        try {
            await supabase
                .from('employer_verifications')
                .update({ verification_status: 'verified' })
                .eq('id', id);
            await loadVerifications();
        } catch (err) {
            console.error('Error approving verification:', err);
            alert('Failed to approve: ' + err.message);
        } finally {
            setProcessingId(null);
        }
    }

    async function handleReject(id) {
        const reason = prompt('Reason for rejection (shown to the employer):');
        if (reason === null) return;
        setProcessingId(id);
        try {
            await supabase
                .from('employer_verifications')
                .update({ verification_status: 'rejected', rejection_reason: reason || null })
                .eq('id', id);
            await loadVerifications();
        } catch (err) {
            console.error('Error rejecting verification:', err);
            alert('Failed to reject: ' + err.message);
        } finally {
            setProcessingId(null);
        }
    }

    async function handleRevoke(id) {
        if (!confirm('Revoke verification? This employer will lose verified status.')) return;
        setProcessingId(id);
        try {
            await supabase
                .from('employer_verifications')
                .update({ verification_status: 'pending' })
                .eq('id', id);
            await loadVerifications();
        } catch (err) {
            console.error('Error revoking verification:', err);
        } finally {
            setProcessingId(null);
        }
    }

    const filtered = verifications.filter(v => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return (
            v.company_name?.toLowerCase().includes(term) ||
            v.profiles?.full_name?.toLowerCase().includes(term) ||
            v.profiles?.email?.toLowerCase().includes(term)
        );
    });

    function getStatusBadge(status) {
        const config = {
            pending: { label: 'Pending Review', color: 'bg-amber-500/20 text-amber-400' },
            verified: { label: 'Verified', color: 'bg-emerald-500/20 text-emerald-400' },
            rejected: { label: 'Rejected', color: 'bg-red-500/20 text-red-400' }
        };
        const { label, color } = config[status] || config.pending;
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
                    <p className="text-slate-400 text-sm">Review business details before granting employer/job-posting access</p>
                </div>
                <button onClick={loadVerifications} disabled={refreshing} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2 text-sm">
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                </button>
            </div>

            <div className="flex gap-2 border-b border-slate-800 mb-6 flex-wrap">
                {['pending', 'verified', 'rejected', 'all'].map(status => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-4 py-2 text-sm font-medium transition capitalize ${
                            statusFilter === status ? 'text-primary-400 border-b-2 border-primary-400' : 'text-slate-400 hover:text-white'
                        }`}
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
                    {filtered.map(v => (
                        <div key={v.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                                <div>
                                    <p className="text-white font-semibold text-lg">{v.company_name}</p>
                                    <p className="text-slate-500 text-xs">Submitted by {v.profiles?.full_name || 'Unknown'} ({v.profiles?.email})</p>
                                </div>
                                {getStatusBadge(v.verification_status)}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-400 mb-3">
                                {v.company_registration_number && <p>Registration #: <span className="text-slate-300">{v.company_registration_number}</span></p>}
                                {v.tax_id && <p>Tax ID: <span className="text-slate-300">{v.tax_id}</span></p>}
                                <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {v.business_address}</p>
                                <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {v.business_phone}</p>
                                <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {v.business_email}</p>
                                {v.website_url && (
                                    <a href={v.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary-400 hover:underline">
                                        <Globe className="w-3.5 h-3.5" /> {v.website_url}
                                    </a>
                                )}
                            </div>

                            {v.verification_status === 'rejected' && v.rejection_reason && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-3 flex items-start gap-2">
                                    <FileText className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-300">{v.rejection_reason}</p>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-800">
                                {v.verification_status === 'pending' && (
                                    <>
                                        <button
                                            onClick={() => handleApprove(v.id)}
                                            disabled={processingId === v.id}
                                            className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 flex items-center gap-1.5 disabled:opacity-50"
                                        >
                                            {processingId === v.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => handleReject(v.id)}
                                            disabled={processingId === v.id}
                                            className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 flex items-center gap-1.5 disabled:opacity-50"
                                        >
                                            <XCircle className="w-3.5 h-3.5" /> Reject
                                        </button>
                                    </>
                                )}
                                {v.verification_status === 'verified' && (
                                    <button
                                        onClick={() => handleRevoke(v.id)}
                                        disabled={processingId === v.id}
                                        className="px-4 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600"
                                    >
                                        Revoke Verification
                                    </button>
                                )}
                                {v.verification_status === 'rejected' && (
                                    <button
                                        onClick={() => handleApprove(v.id)}
                                        disabled={processingId === v.id}
                                        className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 flex items-center gap-1.5"
                                    >
                                        <CheckCircle className="w-3.5 h-3.5" /> Verify Anyway
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

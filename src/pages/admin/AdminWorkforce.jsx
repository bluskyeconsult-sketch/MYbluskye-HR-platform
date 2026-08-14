// src/pages/admin/AdminWorkforce.jsx
// NEW FILE (2026-08-08) — fills /admin/workforce, confirmed by the
// platform's own product documentation (SOP 4.3) as the page where admins
// verify workforce_profiles before they're allowed to appear on the public
// marketplace. This was the missing link: WorkforceMarketplace.jsx already
// filters strictly on verification_status = 'verified' (per ODUSBABA's own
// decision to make the richer workforce model the real one), but without
// this page there was no way to ever set that status — combined with the
// RLS gaps just fixed in fix-workforce-rls.sql, the marketplace could have
// shown zero professionals indefinitely.

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, CheckCircle, XCircle, Loader2, RefreshCw, Search, Star, DollarSign, Clock, ExternalLink } from 'lucide-react';

export default function AdminWorkforce() {
    const [profiles, setProfiles] = useState([]);
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
        if (isAuthorized) loadProfiles();
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

    async function loadProfiles() {
        setRefreshing(true);
        try {
            let query = supabase
                .from('workforce_profiles')
                .select('*, profiles!inner(full_name, email, avatar_url)')
                .order('created_at', { ascending: false });

            if (statusFilter !== 'all') {
                query = query.eq('verification_status', statusFilter);
            }

            const { data, error } = await query;
            if (error) throw error;
            setProfiles(data || []);
        } catch (err) {
            console.error('Error loading workforce profiles:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    async function handleVerify(profileId) {
        setProcessingId(profileId);
        try {
            await supabase
                .from('workforce_profiles')
                .update({ verification_status: 'verified' })
                .eq('id', profileId);
            await loadProfiles();
        } catch (err) {
            console.error('Error verifying profile:', err);
            alert('Failed to verify: ' + err.message);
        } finally {
            setProcessingId(null);
        }
    }

    async function handleReject(profileId) {
        const reason = prompt('Optional: reason for rejection (not stored, informational only)');
        if (reason === null) return;
        setProcessingId(profileId);
        try {
            await supabase
                .from('workforce_profiles')
                .update({ verification_status: 'rejected' })
                .eq('id', profileId);
            await loadProfiles();
        } catch (err) {
            console.error('Error rejecting profile:', err);
            alert('Failed to reject: ' + err.message);
        } finally {
            setProcessingId(null);
        }
    }

    async function handleRevoke(profileId) {
        if (!confirm('Revoke verification? This professional will disappear from the public marketplace.')) return;
        setProcessingId(profileId);
        try {
            await supabase
                .from('workforce_profiles')
                .update({ verification_status: 'pending' })
                .eq('id', profileId);
            await loadProfiles();
        } catch (err) {
            console.error('Error revoking verification:', err);
        } finally {
            setProcessingId(null);
        }
    }

    const filteredProfiles = profiles.filter(p => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return (
            p.profiles?.full_name?.toLowerCase().includes(term) ||
            p.profiles?.email?.toLowerCase().includes(term) ||
            p.headline?.toLowerCase().includes(term) ||
            (Array.isArray(p.skills) && p.skills.some(s => s.toLowerCase().includes(term)))
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
                        <Users className="w-6 h-6 text-primary-400" /> Workforce Verification
                    </h1>
                    <p className="text-slate-400 text-sm">Review and verify professional profiles before they appear on the public marketplace</p>
                </div>
                <button onClick={loadProfiles} disabled={refreshing} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2 text-sm">
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
                    placeholder="Search by name, email, headline, or skill..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
            </div>

            {filteredProfiles.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                    <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                        {statusFilter === 'pending' ? 'No Profiles Awaiting Review' : `No ${statusFilter} Profiles`}
                    </h3>
                    <p className="text-slate-400">
                        {statusFilter === 'pending' && 'New professional applications will appear here.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredProfiles.map(profile => (
                        <div key={profile.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-sky-500 flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0">
                                        {profile.profiles?.avatar_url ? (
                                            <img src={profile.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            profile.profiles?.full_name?.[0]?.toUpperCase() || '?'
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">{profile.profiles?.full_name || 'Unknown'}</p>
                                        <p className="text-slate-500 text-xs">{profile.profiles?.email}</p>
                                    </div>
                                </div>
                                {getStatusBadge(profile.verification_status)}
                            </div>

                            <p className="text-primary-400 text-sm font-medium mb-1">{profile.headline}</p>
                            <p className="text-slate-400 text-sm mb-3 line-clamp-2">{profile.bio}</p>

                            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mb-3">
                                <span>{profile.experience_years || 0} years experience</span>
                                {profile.hourly_rate && (
                                    <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {profile.hourly_rate}/hr</span>
                                )}
                                {profile.rating_avg > 0 && (
                                    <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {profile.rating_avg.toFixed(1)} ({profile.rating_count || 0} reviews)</span>
                                )}
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Applied {new Date(profile.created_at).toLocaleDateString()}</span>
                            </div>

                            {Array.isArray(profile.skills) && profile.skills.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-4">
                                    {profile.skills.map((skill, idx) => (
                                        <span key={idx} className="text-xs px-2 py-0.5 bg-slate-800 rounded-full text-slate-300">{skill}</span>
                                    ))}
                                </div>
                            )}

                            {Array.isArray(profile.portfolio_urls) && profile.portfolio_urls.length > 0 && (
                                <div className="flex flex-wrap gap-3 mb-4">
                                    {profile.portfolio_urls.map((url, idx) => (
                                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-400 hover:underline flex items-center gap-1">
                                            <ExternalLink className="w-3 h-3" /> Portfolio {idx + 1}
                                        </a>
                                    ))}
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-800">
                                {profile.verification_status === 'pending' && (
                                    <>
                                        <button
                                            onClick={() => handleVerify(profile.id)}
                                            disabled={processingId === profile.id}
                                            className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 flex items-center gap-1.5 disabled:opacity-50"
                                        >
                                            {processingId === profile.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                            Verify
                                        </button>
                                        <button
                                            onClick={() => handleReject(profile.id)}
                                            disabled={processingId === profile.id}
                                            className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 flex items-center gap-1.5 disabled:opacity-50"
                                        >
                                            <XCircle className="w-3.5 h-3.5" /> Reject
                                        </button>
                                    </>
                                )}
                                {profile.verification_status === 'verified' && (
                                    <button
                                        onClick={() => handleRevoke(profile.id)}
                                        disabled={processingId === profile.id}
                                        className="px-4 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 flex items-center gap-1.5"
                                    >
                                        Revoke Verification
                                    </button>
                                )}
                                {profile.verification_status === 'rejected' && (
                                    <button
                                        onClick={() => handleVerify(profile.id)}
                                        disabled={processingId === profile.id}
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

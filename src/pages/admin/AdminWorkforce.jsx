// src/pages/admin/AdminWorkforce.jsx
// Admin verification of workforce (professional) profiles. WorkforceMarketplace
// shows ONLY profiles whose verification_status is 'verified', so this page is
// what decides who the public can see and hire.
//
// REVIEWED + FIXED (2026-10-13):
// - Verify, Reject and Revoke ignored the result of the update. Supabase
//   does not throw on a failed write, so a blocked update still refreshed
//   the list and looked successful. Every write now checks the error and
//   the returned row and shows a banner.
// - Rejection asked for a reason with a prompt that said it was "not
//   stored". No reason column is known to exist, so none is collected:
//   the confirmation now says plainly that nothing is stored or sent, so
//   you contact the person yourself if they need to know why.
// - Verify now confirms first, because it publishes the person on the
//   public marketplace; Revoke spells out that they disappear from it.
// - Load failures are shown instead of only logged.
// - profiles!inner dropped any workforce profile with no profile row and
//   failed outright if the relationship was not named as expected. It now
//   tries that embed first and falls back to a plain read plus a separate
//   profiles lookup (by user_id, then id).
// - Rating shown safely (rating_avg may be null), pay shown as a plain
//   number with /hr, and the admin check uses the router.

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Users, CheckCircle, XCircle, Loader2, RefreshCw, Search, Star, DollarSign, Clock, ExternalLink } from 'lucide-react';

const BADGES = {
    pending: { label: 'Pending Review', color: 'bg-amber-500/20 text-amber-400' },
    verified: { label: 'Verified', color: 'bg-emerald-500/20 text-emerald-400' },
    rejected: { label: 'Rejected', color: 'bg-red-500/20 text-red-400' }
};

export default function AdminWorkforce() {
    const navigate = useNavigate();
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [searchTerm, setSearchTerm] = useState('');
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [processingId, setProcessingId] = useState(null);
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

    const loadProfiles = useCallback(async () => {
        setRefreshing(true);
        try {
            const build = (select) => {
                let q = supabase.from('workforce_profiles').select(select).order('created_at', { ascending: false });
                if (statusFilter !== 'all') q = q.eq('verification_status', statusFilter);
                return q;
            };

            let rows;
            const embedded = await build('*, profiles!inner(full_name, email, avatar_url)');
            if (!embedded.error) {
                rows = embedded.data || [];
            } else {
                const plain = await build('*');
                if (plain.error) throw plain.error;
                rows = plain.data || [];
                const ids = [...new Set(rows.map(r => r.user_id || r.id).filter(Boolean))];
                if (ids.length > 0) {
                    const { data: people } = await supabase.from('profiles').select('id, full_name, email, avatar_url').in('id', ids);
                    const byId = Object.fromEntries((people || []).map(p => [p.id, p]));
                    rows = rows.map(r => ({ ...r, profiles: byId[r.user_id || r.id] || null }));
                }
            }
            setProfiles(rows);
            setLoadError('');
        } catch (err) {
            console.error('Error loading workforce profiles:', err);
            setProfiles([]);
            setLoadError(err.message || 'Could not load workforce profiles.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        if (isAuthorized) loadProfiles();
    }, [isAuthorized, loadProfiles]);

    const nameOf = (p) => p.profiles?.full_name || p.profiles?.email || 'this professional';

    async function setStatus(p, status, doneText) {
        setProcessingId(p.id);
        setNotice(null);
        const { data, error } = await supabase
            .from('workforce_profiles')
            .update({ verification_status: status })
            .eq('id', p.id)
            .select('id');
        setProcessingId(null);
        if (error || !data || data.length === 0) {
            setNotice({ type: 'error', text: `Could not update ${nameOf(p)}: ${error?.message || 'no row was changed (check permissions)'}` });
            return;
        }
        setNotice({ type: 'ok', text: doneText });
        loadProfiles();
    }

    function handleVerify(p) {
        if (!confirm(`Verify ${nameOf(p)}?\n\nThey will appear on the public marketplace.`)) return;
        setStatus(p, 'verified', `${nameOf(p)} verified and now visible on the marketplace.`);
    }

    function handleReject(p) {
        if (!confirm(`Reject ${nameOf(p)}?\n\nThey will not appear on the marketplace. No reason is stored or sent, so contact them yourself if they need one.`)) return;
        setStatus(p, 'rejected', `${nameOf(p)} rejected. Nothing was sent to them.`);
    }

    function handleRevoke(p) {
        if (!confirm(`Revoke verification for ${nameOf(p)}?\n\nThey will disappear from the public marketplace and return to Pending Review.`)) return;
        setStatus(p, 'pending', `${nameOf(p)} removed from the marketplace and returned to Pending Review.`);
    }

    const term = searchTerm.trim().toLowerCase();
    const filteredProfiles = profiles.filter(p =>
        !term ||
        p.profiles?.full_name?.toLowerCase().includes(term) ||
        p.profiles?.email?.toLowerCase().includes(term) ||
        p.headline?.toLowerCase().includes(term) ||
        (Array.isArray(p.skills) && p.skills.some(s => String(s).toLowerCase().includes(term)))
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
                        <Users className="w-6 h-6 text-primary-400" /> Workforce Verification
                    </h1>
                    <p className="text-slate-400 text-sm">Only verified professionals appear on the public marketplace</p>
                </div>
                <button onClick={loadProfiles} disabled={refreshing} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2 text-sm">
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                </button>
            </div>

            {loadError && <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm">Could not load profiles: {loadError}</div>}
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
                    {statusFilter === 'pending' && <p className="text-slate-400">New professional applications will appear here.</p>}
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredProfiles.map(profile => {
                        const busy = processingId === profile.id;
                        const rating = Number(profile.rating_avg);
                        return (
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
                                    <StatusBadge status={profile.verification_status} />
                                </div>

                                {profile.headline && <p className="text-primary-400 text-sm font-medium mb-1">{profile.headline}</p>}
                                {profile.bio && <p className="text-slate-400 text-sm mb-3 line-clamp-2">{profile.bio}</p>}

                                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mb-3">
                                    <span>{profile.experience_years || 0} years experience</span>
                                    {profile.hourly_rate ? (
                                        <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {profile.hourly_rate}/hr</span>
                                    ) : null}
                                    {rating > 0 && (
                                        <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {rating.toFixed(1)} ({profile.rating_count || 0} reviews)</span>
                                    )}
                                    {profile.created_at && (
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Applied {new Date(profile.created_at).toLocaleDateString()}</span>
                                    )}
                                </div>

                                {Array.isArray(profile.skills) && profile.skills.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-4">
                                        {profile.skills.map((skill, idx) => (
                                            <span key={idx} className="text-xs px-2 py-0.5 bg-slate-800 rounded-full text-slate-300">{String(skill)}</span>
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
                                            <button onClick={() => handleVerify(profile)} disabled={busy} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 flex items-center gap-1.5 disabled:opacity-50">
                                                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Verify
                                            </button>
                                            <button onClick={() => handleReject(profile)} disabled={busy} className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 flex items-center gap-1.5 disabled:opacity-50">
                                                <XCircle className="w-3.5 h-3.5" /> Reject
                                            </button>
                                        </>
                                    )}
                                    {profile.verification_status === 'verified' && (
                                        <button onClick={() => handleRevoke(profile)} disabled={busy} className="px-4 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 disabled:opacity-50">
                                            Revoke Verification
                                        </button>
                                    )}
                                    {profile.verification_status === 'rejected' && (
                                        <button onClick={() => handleVerify(profile)} disabled={busy} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 flex items-center gap-1.5 disabled:opacity-50">
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

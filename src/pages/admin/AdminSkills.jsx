// src/pages/admin/AdminSkills.jsx
// Admin Skills Verification Page
//
// REWORKED (2026-10-13): this page read a table called skill_submissions,
// but nothing in the project writes to that table - members add skills
// through the user-skill-add action, which stores them in user_skills with
// verification_status 'pending'. So the page always showed "No Pending
// Verifications" however many skills were waiting, and members' skills
// could never move from pending to verified. It now reads and updates
// user_skills, which is what the member's My Skills page and the
// marketplace listing tier read.
//
// Why verifying matters: three verified skills (or a completed course or
// assessment) lift a marketplace listing from Basic to Enhanced, so a
// verification here changes what the public sees.
//
// Names are looked up in a second step instead of an embedded join, so a
// missing foreign-key name can no longer make the whole list vanish.
// Every write now checks for an error. Mobile card list and desktop table
// kept from the earlier version.

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle, XCircle, Loader2, RefreshCw, Search, Award } from 'lucide-react';

const STATUS_TABS = ['pending', 'verified', 'rejected'];

export default function AdminSkills() {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('pending');
    const [busyId, setBusyId] = useState(null);
    const [loadError, setLoadError] = useState('');
    const [notice, setNotice] = useState(null);

    const loadSubmissions = useCallback(async () => {
        setRefreshing(true);
        try {
            const { data: skills, error } = await supabase
                .from('user_skills')
                .select('*')
                .eq('verification_status', statusFilter)
                .limit(500);
            if (error) throw error;

            const ids = [...new Set((skills || []).map(s => s.user_id).filter(Boolean))];
            let people = {};
            if (ids.length > 0) {
                const { data: profiles, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, full_name, email')
                    .in('id', ids);
                if (profileError) throw profileError;
                people = Object.fromEntries((profiles || []).map(p => [p.id, p]));
            }
            // Newest first when the table records a date; the column is not
            // assumed, so a missing one can never break the list.
            const rows = (skills || []).map(s => ({ ...s, person: people[s.user_id] || null }));
            rows.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
            setSubmissions(rows);
            setLoadError('');
        } catch (err) {
            console.error('Error loading skills:', err);
            setSubmissions([]);
            setLoadError(err.message || 'Could not load skills.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        loadSubmissions();
    }, [loadSubmissions]);

    async function verifySkill(sub, isValid) {
        const who = sub.person?.full_name || sub.person?.email || 'this member';
        if (!isValid && !confirm(`Reject "${sub.skill_name}" for ${who}?`)) return;
        setBusyId(sub.id);
        setNotice(null);
        const { data, error } = await supabase
            .from('user_skills')
            .update({ verification_status: isValid ? 'verified' : 'rejected' })
            .eq('id', sub.id)
            .select('id');
        setBusyId(null);
        if (error || !data || data.length === 0) {
            setNotice({ type: 'error', text: `Could not update "${sub.skill_name}": ${error?.message || 'no row was changed (check permissions)'}` });
            return;
        }
        setNotice({ type: 'ok', text: `"${sub.skill_name}" ${isValid ? 'verified' : 'rejected'} for ${who}.` });
        loadSubmissions();
    }

    const term = searchTerm.trim().toLowerCase();
    const filteredSubmissions = submissions.filter(s =>
        !term ||
        s.skill_name?.toLowerCase().includes(term) ||
        s.category?.toLowerCase().includes(term) ||
        s.person?.full_name?.toLowerCase().includes(term) ||
        s.person?.email?.toLowerCase().includes(term)
    );

    function ActionButtons({ sub, compact }) {
        const busy = busyId === sub.id;
        const size = compact ? 'px-3 py-1 text-sm' : 'flex-1 py-2 text-sm justify-center';
        return (
            <div className="flex gap-2">
                {sub.verification_status !== 'verified' && (
                    <button disabled={busy} onClick={() => verifySkill(sub, true)} className={`${size} bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1.5 disabled:opacity-50`}>
                        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Verify
                    </button>
                )}
                {sub.verification_status !== 'rejected' && (
                    <button disabled={busy} onClick={() => verifySkill(sub, false)} className={`${size} bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1.5 disabled:opacity-50`}>
                        <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                )}
            </div>
        );
    }

    const detailLine = (sub) => [
        sub.category,
        sub.proficiency_level,
        sub.years_experience ? `${sub.years_experience} yr${sub.years_experience === 1 ? '' : 's'}` : null
    ].filter(Boolean).join(' · ');

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Skill Verification</h1>
                    <p className="text-slate-400">Review skills members have added to their profile. Three verified skills help lift a marketplace listing to Enhanced.</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative flex-1 sm:flex-none">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search skills or members..."
                            className="w-full sm:w-64 pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                        />
                    </div>
                    <button onClick={loadSubmissions} disabled={refreshing} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2 flex-shrink-0">
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </div>
            </div>

            <div className="flex gap-2 border-b border-slate-800 mb-6">
                {STATUS_TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setStatusFilter(tab)}
                        className={`px-4 py-2 text-sm font-medium transition capitalize ${statusFilter === tab ? 'text-primary-400 border-b-2 border-primary-400' : 'text-slate-400 hover:text-white'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {loadError && <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm">Could not load skills: {loadError}</div>}
            {notice && (
                <div className={`mb-4 p-3 rounded-lg text-sm border ${notice.type === 'ok' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border-red-500/20 text-red-300'}`}>{notice.text}</div>
            )}

            {filteredSubmissions.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                    <Award className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                        {submissions.length === 0 ? `No ${statusFilter} skills` : 'No skills match your search'}
                    </h3>
                    <p className="text-slate-400">
                        {statusFilter === 'pending' && submissions.length === 0 ? 'Every submitted skill has been reviewed.' : ''}
                    </p>
                </div>
            ) : (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="md:hidden divide-y divide-slate-800">
                        {filteredSubmissions.map(sub => (
                            <div key={sub.id} className="p-4">
                                <div className="mb-2">
                                    <p className="text-white text-sm font-medium">{sub.person?.full_name || 'N/A'}</p>
                                    <p className="text-slate-500 text-xs">{sub.person?.email}</p>
                                </div>
                                <div className="flex items-center justify-between mb-1 gap-2">
                                    <span className="px-2 py-1 rounded-full text-xs bg-primary-500/20 text-primary-400">{sub.skill_name}</span>
                                    <span className="text-slate-500 text-xs">{sub.created_at ? new Date(sub.created_at).toLocaleDateString() : '-'}</span>
                                </div>
                                <p className="text-slate-500 text-xs mb-3 capitalize">{detailLine(sub)}</p>
                                <ActionButtons sub={sub} />
                            </div>
                        ))}
                    </div>

                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-800/50 border-b border-slate-800">
                                <tr>
                                    <th className="px-4 py-3 text-left text-white">Member</th>
                                    <th className="px-4 py-3 text-left text-white">Skill</th>
                                    <th className="px-4 py-3 text-left text-white">Details</th>
                                    <th className="px-4 py-3 text-left text-white">Added</th>
                                    <th className="px-4 py-3 text-left text-white">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSubmissions.map(sub => (
                                    <tr key={sub.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                                        <td className="px-4 py-3">
                                            <p className="text-white text-sm">{sub.person?.full_name || 'N/A'}</p>
                                            <p className="text-slate-500 text-xs">{sub.person?.email}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-1 rounded-full text-xs bg-primary-500/20 text-primary-400">{sub.skill_name}</span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-400 text-sm capitalize">{detailLine(sub) || '-'}</td>
                                        <td className="px-4 py-3 text-slate-400 text-sm">{sub.created_at ? new Date(sub.created_at).toLocaleDateString() : '-'}</td>
                                        <td className="px-4 py-3"><ActionButtons sub={sub} compact /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

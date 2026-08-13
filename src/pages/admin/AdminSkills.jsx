// src/pages/admin/AdminSkills.jsx
// Admin Skills Verification Page
//
// FIXED (2026-08-07): backend logic was already correct (no changes needed
// when first reviewed in Phase 9). This adds the mobile responsiveness fix
// applied across all admin table pages — a 4-column table with only
// overflow-x-auto is unusable on a phone screen. Added a stacked card list
// below the md breakpoint, table preserved for md: and up.

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle, XCircle, Loader2, RefreshCw, Search, Users, Award } from 'lucide-react';

export default function AdminSkills() {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadSubmissions();
    }, []);

    async function loadSubmissions() {
        setRefreshing(true);
        const { data, error } = await supabase
            .from('skill_submissions')
            .select('*, profiles!user_id(full_name, email)')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
        
        if (!error) setSubmissions(data || []);
        setLoading(false);
        setRefreshing(false);
    }

    async function verifySkill(submissionId, isValid) {
        await supabase
            .from('skill_submissions')
            .update({ 
                status: isValid ? 'verified' : 'rejected',
                verified_at: new Date().toISOString()
            })
            .eq('id', submissionId);
        loadSubmissions();
    }

    const filteredSubmissions = submissions.filter(s => 
        s.skill_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                    <p className="text-slate-400">Review and verify user-submitted skills</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative flex-1 sm:flex-none">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search skills or users..."
                            className="w-full sm:w-auto pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                        />
                    </div>
                    <button onClick={loadSubmissions} disabled={refreshing} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2 flex-shrink-0">
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </div>
            </div>

            {submissions.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                    <Award className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Pending Verifications</h3>
                    <p className="text-slate-400">All skill submissions have been reviewed.</p>
                </div>
            ) : (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                    {/* Mobile card list */}
                    <div className="md:hidden divide-y divide-slate-800">
                        {filteredSubmissions.map(sub => (
                            <div key={sub.id} className="p-4">
                                <div className="mb-2">
                                    <p className="text-white text-sm font-medium">{sub.profiles?.full_name || 'N/A'}</p>
                                    <p className="text-slate-500 text-xs">{sub.profiles?.email}</p>
                                </div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="px-2 py-1 rounded-full text-xs bg-primary-500/20 text-primary-400">
                                        {sub.skill_name}
                                    </span>
                                    <span className="text-slate-500 text-xs">
                                        {new Date(sub.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => verifySkill(sub.id, true)}
                                        className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm flex items-center justify-center gap-1.5"
                                    >
                                        <CheckCircle className="w-4 h-4" /> Verify
                                    </button>
                                    <button
                                        onClick={() => verifySkill(sub.id, false)}
                                        className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm flex items-center justify-center gap-1.5"
                                    >
                                        <XCircle className="w-4 h-4" /> Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-800/50 border-b border-slate-800">
                                <tr>
                                    <th className="px-4 py-3 text-left text-white">User</th>
                                    <th className="px-4 py-3 text-left text-white">Skill</th>
                                    <th className="px-4 py-3 text-left text-white">Submitted</th>
                                    <th className="px-4 py-3 text-left text-white">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSubmissions.map(sub => (
                                    <tr key={sub.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="text-white text-sm">{sub.profiles?.full_name || 'N/A'}</p>
                                                <p className="text-slate-500 text-xs">{sub.profiles?.email}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-1 rounded-full text-xs bg-primary-500/20 text-primary-400">
                                                {sub.skill_name}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-400 text-sm">
                                            {new Date(sub.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => verifySkill(sub.id, true)}
                                                    className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 flex items-center gap-1"
                                                >
                                                    <CheckCircle className="w-3 h-3" /> Verify
                                                </button>
                                                <button
                                                    onClick={() => verifySkill(sub.id, false)}
                                                    className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 flex items-center gap-1"
                                                >
                                                    <XCircle className="w-3 h-3" /> Reject
                                                </button>
                                            </div>
                                        </td>
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

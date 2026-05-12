// src/pages/admin/AdminSkills.jsx
// Admin Skills Verification Page

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
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Skill Verification</h1>
                    <p className="text-slate-400">Review and verify user-submitted skills</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search skills or users..."
                            className="pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                        />
                    </div>
                    <button onClick={loadSubmissions} disabled={refreshing} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2">
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
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
                    <div className="overflow-x-auto">
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

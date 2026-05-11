// src/pages/admin/AdminFraudReports.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Flag, Search, Loader2, CheckCircle, XCircle, AlertCircle, Eye, Mail, Calendar, User } from 'lucide-react';

export default function AdminFraudReports() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredReports, setFilteredReports] = useState([]);

    useEffect(() => {
        checkAdminAndLoadReports();
    }, []);

    useEffect(() => {
        filterReports();
    }, [searchTerm, reports]);

    async function checkAdminAndLoadReports() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || user.email !== 'bluskyeconsult@gmail.com') {
            window.location.href = '/admin-login';
            return;
        }
        await loadReports();
    }

    async function loadReports() {
        const { data, error } = await supabase
            .from('fraud_reports')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (!error) {
            setReports(data || []);
            setFilteredReports(data || []);
        }
        setLoading(false);
    }

    async function updateReportStatus(reportId, status) {
        await supabase
            .from('fraud_reports')
            .update({ status: status, resolved_at: status === 'resolved' ? new Date().toISOString() : null })
            .eq('id', reportId);
        loadReports();
    }

    function getStatusBadge(status) {
        const config = {
            pending: { color: 'bg-amber-500/20 text-amber-400', icon: AlertCircle, label: 'Pending' },
            investigating: { color: 'bg-blue-500/20 text-blue-400', icon: Eye, label: 'Investigating' },
            resolved: { color: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle, label: 'Resolved' },
            dismissed: { color: 'bg-red-500/20 text-red-400', icon: XCircle, label: 'Dismissed' }
        };
        const cfg = config[status] || config.pending;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${cfg.color}`}>
                <cfg.icon className="w-3 h-3" /> {cfg.label}
            </span>
        );
    }

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
                    <h1 className="text-2xl font-bold text-white">Fraud Reports</h1>
                    <p className="text-slate-400">Review and investigate fraud reports from users</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search reports..."
                        className="pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                    />
                </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-800/50 border-b border-slate-800">
                            <tr>
                                <th className="px-4 py-3 text-left text-white text-sm">Type</th>
                                <th className="px-4 py-3 text-left text-white text-sm">Description</th>
                                <th className="px-4 py-3 text-left text-white text-sm">Reported</th>
                                <th className="px-4 py-3 text-left text-white text-sm">Status</th>
                                <th className="px-4 py-3 text-left text-white text-sm">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReports.map(report => (
                                <tr key={report.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">
                                            {report.report_type?.replace('_', ' ') || 'Unknown'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-300 text-sm max-w-xs truncate">
                                        {report.description?.substring(0, 80)}...
                                    </td>
                                    <td className="px-4 py-3 text-slate-400 text-sm">
                                        {new Date(report.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        {getStatusBadge(report.status)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            {report.status === 'pending' && (
                                                <button
                                                    onClick={() => updateReportStatus(report.id, 'investigating')}
                                                    className="px-3 py-1 bg-blue-600 rounded-lg text-xs text-white hover:bg-blue-700"
                                                >
                                                    Investigate
                                                </button>
                                            )}
                                            {report.status === 'investigating' && (
                                                <>
                                                    <button
                                                        onClick={() => updateReportStatus(report.id, 'resolved')}
                                                        className="px-3 py-1 bg-emerald-600 rounded-lg text-xs text-white hover:bg-emerald-700"
                                                    >
                                                        Resolve
                                                    </button>
                                                    <button
                                                        onClick={() => updateReportStatus(report.id, 'dismissed')}
                                                        className="px-3 py-1 bg-red-600 rounded-lg text-xs text-white hover:bg-red-700"
                                                    >
                                                        Dismiss
                                                    </button>
                                                </>
                                            )}
                                            <button className="px-3 py-1 bg-slate-700 rounded-lg text-xs text-slate-300 hover:bg-slate-600">
                                                <Eye className="w-3 h-3 inline mr-1" /> Details
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredReports.length === 0 && (
                    <div className="text-center py-8 text-slate-400">No fraud reports found</div>
                )}
            </div>
        </div>
    );
}

// src/pages/admin/AdminFraudReports.jsx
// Fraud Reports Management

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Flag, AlertTriangle, CheckCircle, XCircle, Eye, Loader2, RefreshCw, Clock, User, Mail } from 'lucide-react';

export default function AdminFraudReports() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);

    useEffect(() => {
        loadReports();
    }, []);

    async function loadReports() {
        setRefreshing(true);
        const { data, error } = await supabase
            .from('fraud_reports')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (!error) setReports(data || []);
        setLoading(false);
        setRefreshing(false);
    }

    async function updateStatus(reportId, status) {
        await supabase
            .from('fraud_reports')
            .update({ status, resolved_at: status === 'resolved' ? new Date().toISOString() : null })
            .eq('id', reportId);
        loadReports();
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
                    <p className="text-slate-400">Review and manage fraud reports from users</p>
                </div>
                <button onClick={loadReports} disabled={refreshing} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2">
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-800/50 border-b border-slate-800">
                            <tr><th className="px-4 py-3 text-left text-white">Type</th><th className="px-4 py-3 text-left text-white">Description</th><th className="px-4 py-3 text-left text-white">Date</th><th className="px-4 py-3 text-left text-white">Status</th><th className="px-4 py-3 text-left text-white">Actions</th></tr>
                        </thead>
                        <tbody>
                            {reports.map(report => (
                                <tr key={report.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                                    <td className="px-4 py-3"><span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">{report.report_type?.replace(/_/g, ' ')}</span></td>
                                    <td className="px-4 py-3 text-slate-300 text-sm max-w-xs truncate">{report.description}</td>
                                    <td className="px-4 py-3 text-slate-400 text-sm">{new Date(report.created_at).toLocaleDateString()}</td>
                                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs ${report.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-400' : report.status === 'investigating' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>{report.status}</span></td>
                                    <td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => updateStatus(report.id, 'investigating')} className="px-2 py-1 bg-blue-600 rounded text-xs text-white">Investigate</button><button onClick={() => updateStatus(report.id, 'resolved')} className="px-2 py-1 bg-emerald-600 rounded text-xs text-white">Resolve</button><button onClick={() => setSelectedReport(report)} className="px-2 py-1 bg-slate-700 rounded text-xs text-white"><Eye className="w-3 h-3 inline" /></button></div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {reports.length === 0 && <div className="text-center py-8 text-slate-400">No fraud reports found</div>}
            </div>
        </div>
    );
}

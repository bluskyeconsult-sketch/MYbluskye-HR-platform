// src/pages/admin/AdminFraudReports.jsx
// COMPLETE FRAUD REPORTS MANAGEMENT
//
// FIXED (2026-08-07):
// 1. Rendered <Link className="..." /> as an icon in the Evidence section,
//    but Link was never imported from lucide-react (and this file doesn't
//    import React Router's Link either) — any report with evidence_urls
//    would crash the details modal with a ReferenceError. Imported
//    lucide-react's Link icon under a distinct name to avoid any ambiguity.
// 2. loadReports() correctly checks data.success before using the API
//    response (falls back to Supabase correctly), but updateStatus() only
//    checked response.ok — true even for the meaningless metadata response
//    returned by the nonexistent admin-update-report-status action — so
//    clicking Investigate/Resolve/Dismiss silently did nothing. Simplified
//    to go straight to Supabase, matching the fix applied to the equivalent
//    bug in AdminJobs.jsx and AdminUsers.jsx.

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    Flag, AlertTriangle, CheckCircle, XCircle, Eye, Loader2, 
    RefreshCw, Clock, User, Mail, Shield, FileText, Filter,
    Search, ChevronDown, Download, Ban, MessageCircle, Calendar,
    Briefcase, Building2, AlertCircle, ThumbsUp, ThumbsDown,
    Link as LinkIcon
} from 'lucide-react';

export default function AdminFraudReports() {
    const [reports, setReports] = useState([]);
    const [filteredReports, setFilteredReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        investigating: 0,
        resolved: 0,
        dismissed: 0
    });

    const statuses = [
        { value: 'all', label: 'All Reports', color: 'slate', icon: Flag },
        { value: 'pending', label: 'Pending', color: 'amber', icon: Clock },
        { value: 'investigating', label: 'Investigating', color: 'blue', icon: AlertTriangle },
        { value: 'resolved', label: 'Resolved', color: 'emerald', icon: CheckCircle },
        { value: 'dismissed', label: 'Dismissed', color: 'red', icon: XCircle }
    ];

    const reportTypes = [
        { value: 'all', label: 'All Types' },
        { value: 'fraudulent_job', label: 'Fraudulent Job' },
        { value: 'scam_employer', label: 'Scam Employer' },
        { value: 'fake_profile', label: 'Fake Profile' },
        { value: 'spam', label: 'Spam' },
        { value: 'harassment', label: 'Harassment' },
        { value: 'other', label: 'Other' }
    ];

    useEffect(() => {
        loadReports();
    }, []);

    useEffect(() => {
        filterReports();
    }, [reports, searchTerm, statusFilter, typeFilter]);

    async function loadReports() {
        setLoading(true);
        setRefreshing(true);
        
        try {
            const { data, error } = await supabase
                .from('fraud_reports')
                .select('*, reporter:reporter_id(email, full_name), reported_user:reported_user_id(email, full_name)')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setReports(data || []);
            calculateStats(data || []);
        } catch (err) {
            console.error('Error loading fraud reports:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    async function refreshReports() {
        await loadReports();
    }

    function calculateStats(reportList) {
        const total = reportList.length;
        const pending = reportList.filter(r => r.status === 'pending').length;
        const investigating = reportList.filter(r => r.status === 'investigating').length;
        const resolved = reportList.filter(r => r.status === 'resolved').length;
        const dismissed = reportList.filter(r => r.status === 'dismissed').length;
        
        setStats({ total, pending, investigating, resolved, dismissed });
    }

    function filterReports() {
        let filtered = [...reports];
        
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(r => 
                r.description?.toLowerCase().includes(term) ||
                r.report_type?.toLowerCase().includes(term) ||
                r.reporter?.email?.toLowerCase().includes(term) ||
                r.reported_user?.email?.toLowerCase().includes(term)
            );
        }
        
        if (statusFilter !== 'all') {
            filtered = filtered.filter(r => r.status === statusFilter);
        }
        
        if (typeFilter !== 'all') {
            filtered = filtered.filter(r => r.report_type === typeFilter);
        }
        
        setFilteredReports(filtered);
    }

    async function updateStatus(reportId, status) {
        try {
            await supabase
                .from('fraud_reports')
                .update({ 
                    status, 
                    resolved_at: status === 'resolved' ? new Date().toISOString() : null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', reportId);
            await loadReports();
        } catch (err) {
            console.error('Error updating report status:', err);
        }
    }

    function getStatusBadge(status) {
        const config = {
            pending: { label: 'Pending', color: 'bg-amber-500/20 text-amber-400', icon: Clock },
            investigating: { label: 'Investigating', color: 'bg-blue-500/20 text-blue-400', icon: AlertTriangle },
            resolved: { label: 'Resolved', color: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle },
            dismissed: { label: 'Dismissed', color: 'bg-red-500/20 text-red-400', icon: XCircle }
        };
        const { label, color, icon: Icon } = config[status] || config.pending;
        return (
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${color}`}>
                <Icon className="w-3 h-3" />
                {label}
            </span>
        );
    }

    function getTypeBadge(type) {
        const config = {
            fraudulent_job: { label: 'Fraudulent Job', color: 'bg-red-500/20 text-red-400' },
            scam_employer: { label: 'Scam Employer', color: 'bg-orange-500/20 text-orange-400' },
            fake_profile: { label: 'Fake Profile', color: 'bg-purple-500/20 text-purple-400' },
            spam: { label: 'Spam', color: 'bg-amber-500/20 text-amber-400' },
            harassment: { label: 'Harassment', color: 'bg-pink-500/20 text-pink-400' },
            other: { label: 'Other', color: 'bg-slate-500/20 text-slate-400' }
        };
        const { label, color } = config[type] || { label: type?.replace(/_/g, ' ') || 'Unknown', color: 'bg-slate-500/20 text-slate-400' };
        return <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>{label}</span>;
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
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Fraud Reports</h1>
                    <p className="text-slate-400">Review and manage fraud reports from users</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={refreshReports}
                        disabled={refreshing}
                        className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                    <button
                        onClick={() => {
                            const dataStr = JSON.stringify(filteredReports, null, 2);
                            const blob = new Blob([dataStr], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `fraud-reports-${new Date().toISOString().split('T')[0]}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                        }}
                        className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 text-center cursor-pointer hover:border-amber-500/30 transition" onClick={() => setStatusFilter('all')}>
                    <p className="text-2xl font-bold text-white">{stats.total}</p>
                    <p className="text-xs text-slate-400">Total Reports</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 text-center cursor-pointer hover:border-amber-500/30 transition" onClick={() => setStatusFilter('pending')}>
                    <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
                    <p className="text-xs text-slate-400">Pending</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 text-center cursor-pointer hover:border-blue-500/30 transition" onClick={() => setStatusFilter('investigating')}>
                    <p className="text-2xl font-bold text-blue-400">{stats.investigating}</p>
                    <p className="text-xs text-slate-400">Investigating</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 text-center cursor-pointer hover:border-emerald-500/30 transition" onClick={() => setStatusFilter('resolved')}>
                    <p className="text-2xl font-bold text-emerald-400">{stats.resolved}</p>
                    <p className="text-xs text-slate-400">Resolved</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 text-center cursor-pointer hover:border-red-500/30 transition" onClick={() => setStatusFilter('dismissed')}>
                    <p className="text-2xl font-bold text-red-400">{stats.dismissed}</p>
                    <p className="text-xs text-slate-400">Dismissed</p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by description, reporter, or reported user..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        {statuses.map(status => (
                            <option key={status.value} value={status.value}>{status.label}</option>
                        ))}
                    </select>
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        {reportTypes.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                    </select>
                    {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all') && (
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setStatusFilter('all');
                                setTypeFilter('all');
                            }}
                            className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition text-sm"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Reports Table */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-800/50 border-b border-slate-800">
                            <tr>
                                <th className="px-4 py-3 text-left text-white text-sm font-semibold">Type</th>
                                <th className="px-4 py-3 text-left text-white text-sm font-semibold">Description</th>
                                <th className="px-4 py-3 text-left text-white text-sm font-semibold">Reporter</th>
                                <th className="px-4 py-3 text-left text-white text-sm font-semibold">Reported</th>
                                <th className="px-4 py-3 text-left text-white text-sm font-semibold">Date</th>
                                <th className="px-4 py-3 text-left text-white text-sm font-semibold">Status</th>
                                <th className="px-4 py-3 text-left text-white text-sm font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReports.map((report) => (
                                <tr key={report.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition group">
                                    <td className="px-4 py-3">
                                        {getTypeBadge(report.report_type)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-slate-300 text-sm max-w-xs truncate">
                                            {report.description || 'No description provided'}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <User className="w-3 h-3 text-slate-500" />
                                            <span className="text-slate-400 text-sm">
                                                {report.reporter?.email?.split('@')[0] || 'Unknown'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <User className="w-3 h-3 text-slate-500" />
                                            <span className="text-slate-400 text-sm">
                                                {report.reported_user?.email?.split('@')[0] || 'Unknown'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3 text-slate-500" />
                                            <span className="text-slate-400 text-sm">
                                                {new Date(report.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {getStatusBadge(report.status)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            {report.status === 'pending' && (
                                                <button
                                                    onClick={() => updateStatus(report.id, 'investigating')}
                                                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs text-white transition flex items-center gap-1"
                                                >
                                                    <AlertTriangle className="w-3 h-3" />
                                                    Investigate
                                                </button>
                                            )}
                                            {(report.status === 'pending' || report.status === 'investigating') && (
                                                <button
                                                    onClick={() => updateStatus(report.id, 'resolved')}
                                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 rounded text-xs text-white transition flex items-center gap-1"
                                                >
                                                    <CheckCircle className="w-3 h-3" />
                                                    Resolve
                                                </button>
                                            )}
                                            {report.status !== 'dismissed' && (
                                                <button
                                                    onClick={() => updateStatus(report.id, 'dismissed')}
                                                    className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs text-white transition flex items-center gap-1"
                                                >
                                                    <XCircle className="w-3 h-3" />
                                                    Dismiss
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setSelectedReport(report);
                                                    setShowDetailsModal(true);
                                                }}
                                                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white transition flex items-center gap-1"
                                                title="View details"
                                            >
                                                <Eye className="w-3 h-3" />
                                                View
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {filteredReports.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        <Flag className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                        <p>No fraud reports found matching your criteria</p>
                        {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all') && (
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setStatusFilter('all');
                                    setTypeFilter('all');
                                }}
                                className="mt-3 text-sm text-primary-400 hover:underline"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Report Details Modal */}
            {showDetailsModal && selectedReport && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
                        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Flag className="w-5 h-5 text-red-400" />
                                <h2 className="text-xl font-bold text-white">Report Details</h2>
                            </div>
                            <button onClick={() => setShowDetailsModal(false)} className="text-slate-400 hover:text-white">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            {/* Report Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-500">Report Type</p>
                                    <div className="mt-1">{getTypeBadge(selectedReport.report_type)}</div>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">Status</p>
                                    <div className="mt-1">{getStatusBadge(selectedReport.status)}</div>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">Reported Date</p>
                                    <p className="text-white text-sm">{new Date(selectedReport.created_at).toLocaleString()}</p>
                                </div>
                                {selectedReport.resolved_at && (
                                    <div>
                                        <p className="text-xs text-slate-500">Resolved Date</p>
                                        <p className="text-white text-sm">{new Date(selectedReport.resolved_at).toLocaleString()}</p>
                                    </div>
                                )}
                            </div>
                            
                            {/* Reporter Info */}
                            <div className="border-t border-slate-800 pt-4">
                                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                                    <User className="w-4 h-4 text-primary-400" />
                                    Reporter Information
                                </h3>
                                <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                                    <p className="text-sm text-slate-300">
                                        <span className="text-slate-500">Email:</span> {selectedReport.reporter?.email || 'Unknown'}
                                    </p>
                                    <p className="text-sm text-slate-300">
                                        <span className="text-slate-500">Name:</span> {selectedReport.reporter?.full_name || 'N/A'}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Reported User Info */}
                            <div className="border-t border-slate-800 pt-4">
                                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-400" />
                                    Reported User
                                </h3>
                                <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                                    <p className="text-sm text-slate-300">
                                        <span className="text-slate-500">Email:</span> {selectedReport.reported_user?.email || 'Unknown'}
                                    </p>
                                    <p className="text-sm text-slate-300">
                                        <span className="text-slate-500">Name:</span> {selectedReport.reported_user?.full_name || 'N/A'}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Description */}
                            <div className="border-t border-slate-800 pt-4">
                                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-primary-400" />
                                    Report Description
                                </h3>
                                <div className="bg-slate-800/50 rounded-lg p-3">
                                    <p className="text-slate-300 text-sm whitespace-pre-wrap">
                                        {selectedReport.description || 'No description provided'}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Evidence */}
                            {selectedReport.evidence_urls && selectedReport.evidence_urls.length > 0 && (
                                <div className="border-t border-slate-800 pt-4">
                                    <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                                        <LinkIcon className="w-4 h-4 text-primary-400" />
                                        Evidence
                                    </h3>
                                    <div className="space-y-2">
                                        {selectedReport.evidence_urls.map((url, idx) => (
                                            <a
                                                key={idx}
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block text-primary-400 text-sm hover:underline break-all"
                                            >
                                                {url}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4 border-t border-slate-800">
                                {selectedReport.status === 'pending' && (
                                    <button
                                        onClick={() => {
                                            updateStatus(selectedReport.id, 'investigating');
                                            setShowDetailsModal(false);
                                        }}
                                        className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                                    >
                                        <AlertTriangle className="w-4 h-4" />
                                        Start Investigation
                                    </button>
                                )}
                                {(selectedReport.status === 'pending' || selectedReport.status === 'investigating') && (
                                    <button
                                        onClick={() => {
                                            updateStatus(selectedReport.id, 'resolved');
                                            setShowDetailsModal(false);
                                        }}
                                        className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        Mark as Resolved
                                    </button>
                                )}
                                {selectedReport.status !== 'dismissed' && (
                                    <button
                                        onClick={() => {
                                            updateStatus(selectedReport.id, 'dismissed');
                                            setShowDetailsModal(false);
                                        }}
                                        className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Dismiss Report
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

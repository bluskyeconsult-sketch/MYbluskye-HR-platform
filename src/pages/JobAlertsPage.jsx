// src/pages/JobAlertsPage.jsx
// COMPLETE PROFESSIONAL JOB ALERTS PAGE - With unified API, enhanced UI, and complete CRUD operations

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
    Bell, Plus, Edit2, Trash2, ToggleLeft, ToggleRight,
    Mail, Clock, MapPin, Briefcase, DollarSign, Loader2,
    Search, Filter, X, CheckCircle, AlertCircle, Zap,
    TrendingUp, Globe, Calendar, Settings
} from 'lucide-react';

// Import missing icon
import { FileText } from 'lucide-react';

export default function JobAlertsPage() {
    const navigate = useNavigate();
    const [alerts, setAlerts] = useState([]);
    const [filteredAlerts, setFilteredAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingAlert, setEditingAlert] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [user, setUser] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        keywords: '',
        location: '',
        country_code: '',
        job_type: '',
        salary_min: '',
        salary_max: '',
        frequency: 'daily'
    });

    const countries = [
        { code: '', name: 'All Countries', flag: '🌍' },
        { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
        { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
        { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
        { code: 'CA', name: 'Canada', flag: '🇨🇦' },
        { code: 'US', name: 'United States', flag: '🇺🇸' },
        { code: 'DE', name: 'Germany', flag: '🇩🇪' },
        { code: 'AU', name: 'Australia', flag: '🇦🇺' }
    ];

    const jobTypes = [
        { value: '', label: 'All Types', icon: Briefcase },
        { value: 'full_time', label: 'Full Time', icon: Briefcase },
        { value: 'part_time', label: 'Part Time', icon: Clock },
        { value: 'remote', label: 'Remote', icon: Zap },
        { value: 'contract', label: 'Contract', icon: FileText },
        { value: 'freelance', label: 'Freelance', icon: TrendingUp },
        { value: 'hybrid', label: 'Hybrid', icon: Settings }
    ];

    const frequencies = [
        { value: 'instant', label: 'Instant (as they appear)', icon: Zap, color: 'purple' },
        { value: 'daily', label: 'Daily Digest', icon: Calendar, color: 'blue' },
        { value: 'weekly', label: 'Weekly Digest', icon: Calendar, color: 'emerald' }
    ];

    useEffect(() => {
        loadUserAndAlerts();
    }, []);

    useEffect(() => {
        filterAlerts();
    }, [alerts, searchQuery, statusFilter]);

    async function loadUserAndAlerts() {
        try {
            setLoading(true);
            setError(null);
            
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/sign-in?redirect=/job-alerts');
                return;
            }
            setUser(user);
            
            // ✅ Using unified API endpoint
            const response = await fetch('/api/index?action=user-job-alerts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });
            
            const result = await response.json();
            
            if (!result.success) throw new Error(result.error);
            
            setAlerts(result.data || []);
            
        } catch (error) {
            console.error('Error loading alerts:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        
        const alertData = {
            name: formData.name.trim(),
            keywords: formData.keywords.split(',').map(k => k.trim()).filter(k => k),
            location: formData.location.trim() || null,
            country_code: formData.country_code || null,
            job_type: formData.job_type || null,
            salary_min: formData.salary_min ? parseInt(formData.salary_min) : null,
            salary_max: formData.salary_max ? parseInt(formData.salary_max) : null,
            frequency: formData.frequency
        };

        if (!alertData.name) {
            setError('Please enter an alert name');
            setSubmitting(false);
            return;
        }

        try {
            const action = editingAlert ? 'user-job-alert-update' : 'user-job-alert-create';
            const body = editingAlert 
                ? { alertId: editingAlert.id, userId: user.id, updates: alertData }
                : { userId: user.id, alert: alertData };
            
            const response = await fetch(`/api/index?action=${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            
            const result = await response.json();
            
            if (!result.success) throw new Error(result.error);
            
            resetModal();
            await loadUserAndAlerts();
            
        } catch (error) {
            console.error('Error saving alert:', error);
            setError(error.message);
        } finally {
            setSubmitting(false);
        }
    }

    async function handleToggle(alert) {
        setError(null);
        const newStatus = !alert.is_active;
        
        try {
            const response = await fetch('/api/index?action=user-job-alert-toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    alertId: alert.id,
                    userId: user.id,
                    isActive: newStatus
                })
            });
            
            const result = await response.json();
            
            if (!result.success) throw new Error(result.error);
            
            await loadUserAndAlerts();
            
        } catch (error) {
            console.error('Error toggling alert:', error);
            setError(error.message);
        }
    }

    async function handleDelete(alertId) {
        if (!confirm('Are you sure you want to delete this job alert? This action cannot be undone.')) return;
        
        setError(null);
        
        try {
            const response = await fetch('/api/index?action=user-job-alert-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    alertId: alertId,
                    userId: user.id
                })
            });
            
            const result = await response.json();
            
            if (!result.success) throw new Error(result.error);
            
            await loadUserAndAlerts();
            
        } catch (error) {
            console.error('Error deleting alert:', error);
            setError(error.message);
        }
    }

    function resetModal() {
        setShowModal(false);
        setEditingAlert(null);
        setFormData({
            name: '',
            keywords: '',
            location: '',
            country_code: '',
            job_type: '',
            salary_min: '',
            salary_max: '',
            frequency: 'daily'
        });
        setError(null);
    }

    function openEditModal(alert) {
        setEditingAlert(alert);
        setFormData({
            name: alert.name,
            keywords: alert.keywords?.join(', ') || '',
            location: alert.location || '',
            country_code: alert.country_code || '',
            job_type: alert.job_type || '',
            salary_min: alert.salary_min || '',
            salary_max: alert.salary_max || '',
            frequency: alert.frequency || 'daily'
        });
        setShowModal(true);
    }

    function filterAlerts() {
        let filtered = [...alerts];
        
        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(alert => 
                alert.name.toLowerCase().includes(query) ||
                alert.keywords?.some(k => k.toLowerCase().includes(query))
            );
        }
        
        // Status filter
        if (statusFilter === 'active') {
            filtered = filtered.filter(alert => alert.is_active);
        } else if (statusFilter === 'inactive') {
            filtered = filtered.filter(alert => !alert.is_active);
        }
        
        setFilteredAlerts(filtered);
    }

    function getFrequencyConfig(frequency) {
        const config = {
            instant: { label: 'Instant', color: 'bg-purple-500/20 text-purple-400', icon: Zap },
            daily: { label: 'Daily', color: 'bg-blue-500/20 text-blue-400', icon: Calendar },
            weekly: { label: 'Weekly', color: 'bg-emerald-500/20 text-emerald-400', icon: Calendar }
        };
        return config[frequency] || config.daily;
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
            <div className="max-w-6xl mx-auto px-4 py-12">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Bell className="w-8 h-8 text-primary-400" />
                            <h1 className="text-3xl font-bold text-white">Job Alerts</h1>
                        </div>
                        <p className="text-slate-400">Get notified when new jobs match your criteria</p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all duration-200 flex items-center gap-2 shadow-lg shadow-primary-500/20"
                    >
                        <Plus className="w-4 h-4" /> Create Alert
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-center hover:border-primary-500/30 transition">
                        <div className="text-2xl font-bold text-white">{alerts.length}</div>
                        <div className="text-xs text-slate-400">Total Alerts</div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-center hover:border-primary-500/30 transition">
                        <div className="text-2xl font-bold text-emerald-400">{alerts.filter(a => a.is_active).length}</div>
                        <div className="text-xs text-slate-400">Active</div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-center hover:border-primary-500/30 transition">
                        <div className="text-2xl font-bold text-purple-400">{alerts.filter(a => a.frequency === 'instant').length}</div>
                        <div className="text-xs text-slate-400">Instant Alerts</div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-center hover:border-primary-500/30 transition">
                        <div className="text-2xl font-bold text-blue-400">{alerts.filter(a => a.frequency === 'daily').length}</div>
                        <div className="text-xs text-slate-400">Daily Digests</div>
                    </div>
                </div>

                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search alerts by name or keywords..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-3 py-1.5 rounded-lg text-sm transition ${
                                statusFilter === 'all'
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setStatusFilter('active')}
                            className={`px-3 py-1.5 rounded-lg text-sm transition ${
                                statusFilter === 'active'
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setStatusFilter('inactive')}
                            className={`px-3 py-1.5 rounded-lg text-sm transition ${
                                statusFilter === 'inactive'
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                        >
                            Paused
                        </button>
                    </div>
                </div>

                {/* Alerts List */}
                {filteredAlerts.length === 0 ? (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
                        {alerts.length === 0 ? (
                            <>
                                <Bell className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-white mb-2">No Job Alerts Yet</h3>
                                <p className="text-slate-400 mb-6">
                                    Create your first job alert to get personalized job matches delivered to your inbox.
                                </p>
                                <button 
                                    onClick={() => setShowModal(true)} 
                                    className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition inline-flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Create Your First Alert
                                </button>
                            </>
                        ) : (
                            <>
                                <Filter className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-white mb-2">No Matching Alerts</h3>
                                <p className="text-slate-400 mb-6">
                                    No alerts match "{searchQuery}" or the selected filter.
                                </p>
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setStatusFilter('all');
                                    }}
                                    className="px-6 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
                                >
                                    Clear Filters
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredAlerts.map(alert => {
                            const frequencyConfig = getFrequencyConfig(alert.frequency);
                            const FrequencyIcon = frequencyConfig.icon;
                            
                            return (
                                <div 
                                    key={alert.id} 
                                    className={`bg-slate-900/50 border rounded-xl p-5 transition-all duration-200 group ${
                                        alert.is_active 
                                            ? 'border-slate-800 hover:border-primary-500/30' 
                                            : 'border-slate-800/50 opacity-75'
                                    }`}
                                >
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                <h3 className="text-lg font-semibold text-white group-hover:text-primary-400 transition">
                                                    {alert.name}
                                                </h3>
                                                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${frequencyConfig.color}`}>
                                                    <FrequencyIcon className="w-3 h-3" />
                                                    {frequencyConfig.label}
                                                </span>
                                                {!alert.is_active && (
                                                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-400">
                                                        <ToggleLeft className="w-3 h-3" />
                                                        Paused
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {alert.keywords && alert.keywords.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mb-3">
                                                    {alert.keywords.map(keyword => (
                                                        <span key={keyword} className="px-2 py-0.5 bg-slate-800 rounded-full text-xs text-slate-300">
                                                            {keyword}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            
                                            <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                                                {alert.location && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" /> {alert.location}
                                                    </span>
                                                )}
                                                {alert.country_code && (
                                                    <span className="flex items-center gap-1">
                                                        <Globe className="w-3 h-3" /> 
                                                        {countries.find(c => c.code === alert.country_code)?.flag} {alert.country_code}
                                                    </span>
                                                )}
                                                {(alert.salary_min || alert.salary_max) && (
                                                    <span className="flex items-center gap-1">
                                                        <DollarSign className="w-3 h-3" /> 
                                                        ${alert.salary_min || 0} - ${alert.salary_max || '∞'}
                                                    </span>
                                                )}
                                                {alert.job_type && (
                                                    <span className="flex items-center gap-1">
                                                        <Briefcase className="w-3 h-3" />
                                                        {jobTypes.find(j => j.value === alert.job_type)?.label || alert.job_type}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {alert.last_sent_at && (
                                                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                                                    <Mail className="w-3 h-3" />
                                                    Last alert: {new Date(alert.last_sent_at).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                        
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleToggle(alert)} 
                                                className="p-2 rounded-lg hover:bg-slate-800 transition"
                                                title={alert.is_active ? 'Pause alert' : 'Activate alert'}
                                            >
                                                {alert.is_active ? (
                                                    <ToggleRight className="w-6 h-6 text-emerald-400" />
                                                ) : (
                                                    <ToggleLeft className="w-6 h-6 text-slate-500" />
                                                )}
                                            </button>
                                            <button 
                                                onClick={() => openEditModal(alert)} 
                                                className="p-2 rounded-lg hover:bg-slate-800 transition text-slate-400 hover:text-white"
                                                title="Edit alert"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(alert.id)} 
                                                className="p-2 rounded-lg hover:bg-slate-800 transition text-red-400 hover:text-red-300"
                                                title="Delete alert"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                
                {/* Summary */}
                {filteredAlerts.length > 0 && (
                    <div className="mt-6 text-center">
                        <p className="text-sm text-slate-500">
                            Showing {filteredAlerts.length} of {alerts.length} alerts
                        </p>
                    </div>
                )}

                {/* Create/Edit Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-white">
                                    {editingAlert ? 'Edit Job Alert' : 'Create Job Alert'}
                                </h2>
                                <button 
                                    onClick={resetModal}
                                    className="text-slate-400 hover:text-white transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">
                                        Alert Name <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="e.g., Senior Developer Jobs"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">
                                        Keywords (comma separated)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.keywords}
                                        onChange={(e) => setFormData({...formData, keywords: e.target.value})}
                                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="React, Python, Project Manager"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Jobs matching any of these keywords will trigger alerts</p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Location</label>
                                        <input
                                            type="text"
                                            value={formData.location}
                                            onChange={(e) => setFormData({...formData, location: e.target.value})}
                                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                            placeholder="City or region"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Country</label>
                                        <select
                                            value={formData.country_code}
                                            onChange={(e) => setFormData({...formData, country_code: e.target.value})}
                                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                        >
                                            {countries.map(c => (
                                                <option key={c.code} value={c.code}>
                                                    {c.flag} {c.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Job Type</label>
                                        <select
                                            value={formData.job_type}
                                            onChange={(e) => setFormData({...formData, job_type: e.target.value})}
                                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                        >
                                            {jobTypes.map(j => (
                                                <option key={j.value} value={j.value}>{j.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Frequency</label>
                                        <select
                                            value={formData.frequency}
                                            onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                        >
                                            {frequencies.map(f => (
                                                <option key={f.value} value={f.value}>{f.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Min Salary ($)</label>
                                        <input
                                            type="number"
                                            value={formData.salary_min}
                                            onChange={(e) => setFormData({...formData, salary_min: e.target.value})}
                                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Max Salary ($)</label>
                                        <input
                                            type="number"
                                            value={formData.salary_max}
                                            onChange={(e) => setFormData({...formData, salary_max: e.target.value})}
                                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                            placeholder="Unlimited"
                                        />
                                    </div>
                                </div>
                                
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                        {submitting ? 'Saving...' : (editingAlert ? 'Update Alert' : 'Create Alert')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={resetModal}
                                        className="flex-1 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

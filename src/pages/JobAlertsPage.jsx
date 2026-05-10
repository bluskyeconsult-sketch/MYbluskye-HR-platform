// src/pages/JobAlertsPage.jsx
// Complete Job Alerts Management Page

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
    Bell, Plus, Edit2, Trash2, ToggleLeft, ToggleRight,
    Mail, Clock, MapPin, Briefcase, DollarSign, Loader2
} from 'lucide-react';
import {
    getUserJobAlerts,
    createJobAlert,
    updateJobAlert,
    deleteJobAlert,
    toggleJobAlert
} from '../services/jobAlertService';

export default function JobAlertsPage() {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingAlert, setEditingAlert] = useState(null);
    const [submitting, setSubmitting] = useState(false);
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
        { code: '', name: 'All Countries' },
        { code: 'GB', name: 'United Kingdom 🇬🇧' },
        { code: 'NG', name: 'Nigeria 🇳🇬' },
        { code: 'IE', name: 'Ireland 🇮🇪' },
        { code: 'CA', name: 'Canada 🇨🇦' },
        { code: 'US', name: 'United States 🇺🇸' },
        { code: 'DE', name: 'Germany 🇩🇪' },
        { code: 'AU', name: 'Australia 🇦🇺' }
    ];

    const jobTypes = [
        { value: '', label: 'All Types' },
        { value: 'full_time', label: 'Full Time' },
        { value: 'part_time', label: 'Part Time' },
        { value: 'remote', label: 'Remote' },
        { value: 'contract', label: 'Contract' },
        { value: 'freelance', label: 'Freelance' },
        { value: 'hybrid', label: 'Hybrid' }
    ];

    const frequencies = [
        { value: 'instant', label: 'Instant (as they appear)' },
        { value: 'daily', label: 'Daily Digest' },
        { value: 'weekly', label: 'Weekly Digest' }
    ];

    useEffect(() => {
        loadUserAndAlerts();
    }, []);

    async function loadUserAndAlerts() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = '/sign-in?redirect=/job-alerts';
            return;
        }
        setUser(user);
        
        try {
            const data = await getUserJobAlerts(user.id);
            setAlerts(data);
        } catch (error) {
            console.error('Error loading alerts:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitting(true);
        
        const alertData = {
            name: formData.name,
            keywords: formData.keywords.split(',').map(k => k.trim()).filter(k => k),
            location: formData.location,
            country_code: formData.country_code || null,
            job_type: formData.job_type || null,
            salary_min: formData.salary_min ? parseInt(formData.salary_min) : null,
            salary_max: formData.salary_max ? parseInt(formData.salary_max) : null,
            frequency: formData.frequency
        };

        try {
            if (editingAlert) {
                await updateJobAlert(editingAlert.id, user.id, alertData);
            } else {
                await createJobAlert(user.id, alertData);
            }
            
            setShowModal(false);
            setEditingAlert(null);
            setFormData({ name: '', keywords: '', location: '', country_code: '', job_type: '', salary_min: '', salary_max: '', frequency: 'daily' });
            loadUserAndAlerts();
        } catch (error) {
            console.error('Error saving alert:', error);
            alert('Error saving alert: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    }

    async function handleToggle(alert) {
        await toggleJobAlert(alert.id, user.id, !alert.is_active);
        loadUserAndAlerts();
    }

    async function handleDelete(alertId) {
        if (confirm('Delete this job alert?')) {
            await deleteJobAlert(alertId, user.id);
            loadUserAndAlerts();
        }
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
            frequency: alert.frequency
        });
        setShowModal(true);
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Job Alerts</h1>
                        <p className="text-slate-400">Get notified when new jobs match your criteria</p>
                    </div>
                    <button
                        onClick={() => { setEditingAlert(null); setFormData({ name: '', keywords: '', location: '', country_code: '', job_type: '', salary_min: '', salary_max: '', frequency: 'daily' }); setShowModal(true); }}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Create Alert
                    </button>
                </div>

                {alerts.length === 0 ? (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center">
                        <Bell className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-white mb-2">No job alerts yet</h2>
                        <p className="text-slate-400 mb-4">Create your first job alert to get personalized job matches</p>
                        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                            Create Your First Alert
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {alerts.map(alert => (
                            <div key={alert.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-primary-500/30 transition">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="text-lg font-semibold text-white">{alert.name}</h3>
                                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                                                alert.frequency === 'instant' ? 'bg-purple-500/20 text-purple-400' :
                                                alert.frequency === 'daily' ? 'bg-blue-500/20 text-blue-400' :
                                                'bg-emerald-500/20 text-emerald-400'
                                            }`}>
                                                {alert.frequency}
                                            </span>
                                            {!alert.is_active && (
                                                <span className="px-2 py-0.5 rounded-full text-xs bg-slate-500/20 text-slate-400">Paused</span>
                                            )}
                                        </div>
                                        
                                        {alert.keywords && alert.keywords.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-2">
                                                {alert.keywords.map(keyword => (
                                                    <span key={keyword} className="px-2 py-0.5 bg-slate-800 rounded-full text-xs text-slate-300">
                                                        {keyword}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        
                                        <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                                            {alert.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {alert.location}</span>}
                                            {alert.country_code && <span className="flex items-center gap-1">🌍 {alert.country_code}</span>}
                                            {(alert.salary_min || alert.salary_max) && (
                                                <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> ${alert.salary_min || 0} - ${alert.salary_max || 'Unlimited'}</span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        <button onClick={() => handleToggle(alert)} className="p-2 rounded-lg hover:bg-slate-800 transition">
                                            {alert.is_active ? <ToggleRight className="w-6 h-6 text-emerald-400" /> : <ToggleLeft className="w-6 h-6 text-slate-500" />}
                                        </button>
                                        <button onClick={() => openEditModal(alert)} className="p-2 rounded-lg hover:bg-slate-800 transition text-slate-400 hover:text-white">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(alert.id)} className="p-2 rounded-lg hover:bg-slate-800 transition text-red-400 hover:text-red-300">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6">
                            <h2 className="text-xl font-bold text-white mb-4">
                                {editingAlert ? 'Edit Job Alert' : 'Create Job Alert'}
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Alert Name *</label>
                                    <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" required />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Keywords (comma separated)</label>
                                    <input type="text" value={formData.keywords} onChange={(e) => setFormData({...formData, keywords: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">Location</label>
                                        <input type="text" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">Country</label>
                                        <select value={formData.country_code} onChange={(e) => setFormData({...formData, country_code: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
                                            {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">Job Type</label>
                                        <select value={formData.job_type} onChange={(e) => setFormData({...formData, job_type: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
                                            {jobTypes.map(j => <option key={j.value} value={j.value}>{j.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">Frequency</label>
                                        <select value={formData.frequency} onChange={(e) => setFormData({...formData, frequency: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
                                            {frequencies.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">Min Salary ($)</label>
                                        <input type="number" value={formData.salary_min} onChange={(e) => setFormData({...formData, salary_min: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">Max Salary ($)</label>
                                        <input type="number" value={formData.salary_max} onChange={(e) => setFormData({...formData, salary_max: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="submit" disabled={submitting} className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                                        {submitting ? 'Saving...' : (editingAlert ? 'Update Alert' : 'Create Alert')}
                                    </button>
                                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800">
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

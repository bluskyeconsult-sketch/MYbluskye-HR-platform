// src/pages/admin/RenewalsMonitor.jsx
//
// NEW (2026-10-02): real subscription/renewal tracker - log every
// service (Vercel, Supabase, Apify, domains, AI API accounts, etc.)
// with its real registration date, renewal date, cost, and billing
// cycle, with visual warnings for anything due soon.

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, Plus, Trash2, Edit2, AlertTriangle, Loader2, DollarSign, X, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = ['hosting', 'database', 'ai-api', 'domain', 'scraping', 'payments', 'email', 'other'];
const BILLING_CYCLES = ['monthly', 'yearly', 'one-time'];

const DEFAULT_FORM = {
    id: null,
    serviceName: '',
    category: 'other',
    firstRegisteredDate: '',
    renewalDate: '',
    billingCycle: 'yearly',
    cost: '',
    currency: 'USD',
    notes: ''
};

export default function RenewalsMonitor() {
    const [renewals, setRenewals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(DEFAULT_FORM);
    const [saving, setSaving] = useState(false);
    // NEW (2026-10-02): real, direct check of which of this
    // platform's actual real user countries are covered by the
    // holiday-notification system.
    const [coverageResult, setCoverageResult] = useState(null);
    const [checkingCoverage, setCheckingCoverage] = useState(false);

    useEffect(() => {
        loadRenewals();
    }, []);

    async function authHeaders() {
        const { data: { session } } = await supabase.auth.getSession();
        return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` };
    }

    async function loadRenewals() {
        setLoading(true);
        try {
            const headers = await authHeaders();
            const response = await fetch('/api/index?action=get-renewals', { headers });
            const data = await response.json();
            if (!data.success) throw new Error(data.error);
            setRenewals(data.renewals || []);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }

    function daysUntil(dateStr) {
        const diff = new Date(dateStr) - new Date();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    function urgencyStyle(days) {
        if (days < 0) return { label: 'Overdue', color: 'text-red-400 bg-red-500/10 border-red-500/20' };
        if (days <= 7) return { label: `${days}d left`, color: 'text-red-400 bg-red-500/10 border-red-500/20' };
        if (days <= 30) return { label: `${days}d left`, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
        return { label: `${days}d left`, color: 'text-slate-400 bg-slate-800 border-slate-700' };
    }

    function openEdit(renewal) {
        setForm({
            id: renewal.id,
            serviceName: renewal.service_name,
            category: renewal.category || 'other',
            firstRegisteredDate: renewal.first_registered_date || '',
            renewalDate: renewal.renewal_date,
            billingCycle: renewal.billing_cycle || 'yearly',
            cost: renewal.cost ?? '',
            currency: renewal.currency || 'USD',
            notes: renewal.notes || ''
        });
        setShowForm(true);
    }

    function openNew() {
        setForm(DEFAULT_FORM);
        setShowForm(true);
    }

    async function handleSave() {
        if (!form.serviceName.trim() || !form.renewalDate) {
            toast.error('Service name and renewal date are required');
            return;
        }
        setSaving(true);
        try {
            const headers = await authHeaders();
            const response = await fetch('/api/index?action=save-renewal', {
                method: 'POST',
                headers,
                body: JSON.stringify(form)
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.error);
            toast.success(form.id ? 'Renewal updated' : 'Renewal added');
            setShowForm(false);
            loadRenewals();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id) {
        if (!confirm('Remove this renewal from the tracker?')) return;
        try {
            const headers = await authHeaders();
            const response = await fetch('/api/index?action=delete-renewal', {
                method: 'POST',
                headers,
                body: JSON.stringify({ id })
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.error);
            toast.success('Removed');
            loadRenewals();
        } catch (err) {
            toast.error(err.message);
        }
    }

    async function checkCountryCoverage() {
        setCheckingCoverage(true);
        try {
            const headers = await authHeaders();
            const response = await fetch('/api/index?action=check-holiday-country-coverage', { headers });
            const data = await response.json();
            if (!data.success) throw new Error(data.error);
            setCoverageResult(data);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setCheckingCoverage(false);
        }
    }

    const dueSoon = renewals.filter(r => daysUntil(r.renewal_date) <= 30);

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-2">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Calendar className="w-6 h-6 text-primary-400" /> Renewals Monitor
                </h1>
                <div className="flex gap-2">
                    <button
                        onClick={checkCountryCoverage}
                        disabled={checkingCoverage}
                        className="px-3 py-1.5 bg-slate-800 border border-slate-700 text-white rounded-lg hover:bg-slate-700 transition flex items-center gap-1.5 text-sm disabled:opacity-50"
                    >
                        {checkingCoverage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                        Check Holiday Coverage
                    </button>
                    <button
                        onClick={openNew}
                        className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition flex items-center gap-1.5 text-sm"
                    >
                        <Plus className="w-4 h-4" /> Add Renewal
                    </button>
                </div>
            </div>
            <p className="text-slate-400 text-sm mb-6">
                Every real subscription and service — hosting, database, APIs, domains — logged with its real registration and renewal dates.
            </p>

            {coverageResult && (
                <div className="mb-6 p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                    <p className="text-white font-medium text-sm mb-2">Holiday coverage for your real user base</p>
                    {coverageResult.message ? (
                        <p className="text-slate-400 text-sm">{coverageResult.message}</p>
                    ) : (
                        <>
                            {coverageResult.covered.length > 0 && (
                                <p className="text-emerald-400 text-sm mb-1">✓ Covered: {coverageResult.covered.join(', ')}</p>
                            )}
                            {coverageResult.notCovered.length > 0 && (
                                <p className="text-amber-400 text-sm">⚠ Not covered: {coverageResult.notCovered.join(', ')}</p>
                            )}
                        </>
                    )}
                </div>
            )}

            {dueSoon.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-6">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-amber-200 text-sm">
                        {dueSoon.length} renewal{dueSoon.length === 1 ? '' : 's'} due within 30 days.
                    </p>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary-400" /></div>
            ) : renewals.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-12">No renewals logged yet - add your first one above.</p>
            ) : (
                <div className="space-y-3">
                    {renewals.map(r => {
                        const days = daysUntil(r.renewal_date);
                        const urgency = urgencyStyle(days);
                        return (
                            <div key={r.id} className="flex items-start justify-between gap-3 bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-white font-medium">{r.service_name}</p>
                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${urgency.color}`}>{urgency.label}</span>
                                    </div>
                                    <p className="text-slate-400 text-xs capitalize">{r.category || 'other'} · {r.billing_cycle}</p>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                                        {r.first_registered_date && <span>Registered: {new Date(r.first_registered_date).toLocaleDateString()}</span>}
                                        <span>Renews: {new Date(r.renewal_date).toLocaleDateString()}</span>
                                        {r.cost != null && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{r.cost} {r.currency}</span>}
                                    </div>
                                    {r.notes && <p className="text-slate-500 text-xs mt-2">{r.notes}</p>}
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                    <button onClick={() => openEdit(r)} className="p-1.5 text-slate-400 hover:text-white transition"><Edit2 className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(r.id)} className="p-1.5 text-slate-400 hover:text-red-400 transition"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showForm && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-white">{form.id ? 'Edit' : 'Add'} Renewal</h2>
                            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="space-y-3">
                            <input
                                type="text"
                                placeholder="Service name (e.g. Vercel, Supabase, Apify)"
                                value={form.serviceName}
                                onChange={(e) => setForm(f => ({ ...f, serviceName: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                            />
                            <select
                                value={form.category}
                                onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                            >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">First registered</label>
                                    <input
                                        type="date"
                                        value={form.firstRegisteredDate}
                                        onChange={(e) => setForm(f => ({ ...f, firstRegisteredDate: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Renewal date *</label>
                                    <input
                                        type="date"
                                        value={form.renewalDate}
                                        onChange={(e) => setForm(f => ({ ...f, renewalDate: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                                    />
                                </div>
                            </div>
                            <select
                                value={form.billingCycle}
                                onChange={(e) => setForm(f => ({ ...f, billingCycle: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                            >
                                {BILLING_CYCLES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="number"
                                    placeholder="Cost"
                                    value={form.cost}
                                    onChange={(e) => setForm(f => ({ ...f, cost: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                                />
                                <input
                                    type="text"
                                    placeholder="Currency"
                                    value={form.currency}
                                    onChange={(e) => setForm(f => ({ ...f, currency: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                                />
                            </div>
                            <textarea
                                placeholder="Notes (optional)"
                                value={form.notes}
                                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                                rows={2}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                            />
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

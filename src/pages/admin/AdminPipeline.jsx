// src/pages/admin/AdminPipeline.jsx
// NEW (2026-10-13): the employer sales pipeline, kept on the admin dashboard instead of in email or a sheet.
// Stages: Contacted > Replied > Call booked > Trial > Paid > Renewal due (and Lost, with a reason).
// Data lives in the sales_pipeline table (run create-sales-pipeline.sql) and is reached only through
// the server action "admin-pipeline", which checks the signed-in user is an admin.

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Pencil, Trash2, Loader2, AlertCircle, X, CalendarClock } from 'lucide-react';

const STAGES = [
    { key: 'contacted', label: 'Contacted' },
    { key: 'replied', label: 'Replied' },
    { key: 'call_booked', label: 'Call booked' },
    { key: 'trial', label: 'Trial' },
    { key: 'paid', label: 'Paid' },
    { key: 'renewal_due', label: 'Renewal due' },
    { key: 'lost', label: 'Lost' }
];
const STAGE_LABEL = Object.fromEntries(STAGES.map(s => [s.key, s.label]));
const EMPTY = { company: '', contact_name: '', contact_email: '', stage: 'contacted', source: '', first_contact_date: '', next_step: '', next_step_date: '', reason_lost: '', notes: '' };

async function call(op, payload = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch('/api/index?action=admin-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ op, ...payload })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) throw new Error(data.error || 'Request failed');
    return data;
}

export default function AdminPipeline() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');
    const [editing, setEditing] = useState(null); // null = closed, object = form
    const [saving, setSaving] = useState(false);

    async function load() {
        setLoading(true); setError(null);
        try { setRows((await call('list')).rows); }
        catch (e) { setError(e.message); }
        setLoading(false);
    }
    useEffect(() => { load(); }, []);

    const today = new Date().toISOString().slice(0, 10);
    const counts = useMemo(() => {
        const c = {}; STAGES.forEach(s => { c[s.key] = 0; });
        rows.forEach(r => { if (c[r.stage] !== undefined) c[r.stage] += 1; });
        return c;
    }, [rows]);
    const dueCount = rows.filter(r => r.stage !== 'lost' && r.stage !== 'paid' && r.next_step_date && r.next_step_date <= today).length;

    const shown = rows
        .filter(r => filter === 'all' ? true : filter === 'due' ? (r.stage !== 'lost' && r.next_step_date && r.next_step_date <= today) : r.stage === filter)
        .sort((a, b) => (a.next_step_date || '9999').localeCompare(b.next_step_date || '9999'));

    async function save(e) {
        e.preventDefault();
        setSaving(true); setError(null);
        try {
            const { id, created_at, updated_at, ...record } = editing;
            await call('save', { id: id || undefined, record });
            setEditing(null);
            await load();
        } catch (err) { setError(err.message); }
        setSaving(false);
    }
    async function remove(row) {
        if (!confirm(`Delete ${row.company} from the pipeline? This cannot be undone.`)) return;
        try { await call('delete', { id: row.id }); await load(); }
        catch (err) { setError(err.message); }
    }
    const set = (k) => (e) => setEditing(prev => ({ ...prev, [k]: e.target.value }));
    const input = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white';

    return (
        <div className="max-w-6xl mx-auto p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h1 className="text-xl font-semibold text-white">Sales Pipeline</h1>
                    <p className="text-sm text-slate-400">Employer outreach, from first contact to renewal.</p>
                </div>
                <button onClick={() => setEditing({ ...EMPTY, first_contact_date: today })} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-primary-500 text-white text-sm">
                    <Plus className="w-4 h-4" /> Add lead
                </button>
            </div>

            {error && <div className="flex items-center gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"><AlertCircle className="w-4 h-4" />{error}</div>}

            <div className="flex flex-wrap gap-2">
                <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs border ${filter === 'all' ? 'bg-white/15 border-white/30 text-white' : 'border-slate-700 text-slate-300'}`}>All ({rows.length})</button>
                {STAGES.map(s => (
                    <button key={s.key} onClick={() => setFilter(s.key)} className={`px-3 py-1.5 rounded-lg text-xs border ${filter === s.key ? 'bg-white/15 border-white/30 text-white' : 'border-slate-700 text-slate-300'}`}>{s.label} ({counts[s.key]})</button>
                ))}
                <button onClick={() => setFilter('due')} className={`px-3 py-1.5 rounded-lg text-xs border flex items-center gap-1 ${filter === 'due' ? 'bg-amber-500/20 border-amber-400/40 text-amber-200' : 'border-slate-700 text-amber-300'}`}><CalendarClock className="w-3 h-3" /> Due today or overdue ({dueCount})</button>
            </div>

            {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
            ) : shown.length === 0 ? (
                <p className="text-sm text-slate-400 py-8 text-center">{rows.length === 0 ? 'No leads yet. Add your first one.' : 'Nothing in this view.'}</p>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-900 text-slate-400 text-xs uppercase">
                            <tr><th className="p-3">Company</th><th className="p-3">Contact</th><th className="p-3">Stage</th><th className="p-3">Source</th><th className="p-3">First contact</th><th className="p-3">Next step</th><th className="p-3">Due</th><th className="p-3"></th></tr>
                        </thead>
                        <tbody>
                            {shown.map(r => {
                                const overdue = r.stage !== 'lost' && r.stage !== 'paid' && r.next_step_date && r.next_step_date < today;
                                return (
                                    <tr key={r.id} className="border-t border-slate-800 text-slate-200 align-top">
                                        <td className="p-3 font-medium">{r.company}{r.stage === 'lost' && r.reason_lost && <div className="text-xs text-slate-500 font-normal">Lost: {r.reason_lost}</div>}</td>
                                        <td className="p-3">{r.contact_name || ''}{r.contact_email && <div className="text-xs text-slate-500">{r.contact_email}</div>}</td>
                                        <td className="p-3">{STAGE_LABEL[r.stage] || r.stage}</td>
                                        <td className="p-3">{r.source || ''}</td>
                                        <td className="p-3 whitespace-nowrap">{r.first_contact_date || ''}</td>
                                        <td className="p-3">{r.next_step || ''}</td>
                                        <td className={`p-3 whitespace-nowrap ${overdue ? 'text-amber-300 font-semibold' : ''}`}>{r.next_step_date || ''}</td>
                                        <td className="p-3 whitespace-nowrap">
                                            <button onClick={() => setEditing({ ...EMPTY, ...Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v ?? ''])) })} className="p-1.5 text-slate-300 hover:text-white" aria-label="Edit"><Pencil className="w-4 h-4" /></button>
                                            <button onClick={() => remove(r)} className="p-1.5 text-slate-500 hover:text-red-400" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {editing && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                    <form onSubmit={save} className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-white font-semibold">{editing.id ? 'Edit lead' : 'Add lead'}</h2>
                            <button type="button" onClick={() => setEditing(null)} aria-label="Close"><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <label className="block text-xs text-slate-400">Company *<input className={input} value={editing.company} onChange={set('company')} required /></label>
                        <div className="grid grid-cols-2 gap-3">
                            <label className="block text-xs text-slate-400">Contact name<input className={input} value={editing.contact_name} onChange={set('contact_name')} /></label>
                            <label className="block text-xs text-slate-400">Contact email<input type="email" className={input} value={editing.contact_email} onChange={set('contact_email')} /></label>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <label className="block text-xs text-slate-400">Stage
                                <select className={input} value={editing.stage} onChange={set('stage')}>{STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
                            </label>
                            <label className="block text-xs text-slate-400">Source<input className={input} value={editing.source} onChange={set('source')} placeholder="e.g. care sponsor list, referral" /></label>
                        </div>
                        <label className="block text-xs text-slate-400">First contact date<input type="date" className={input} value={editing.first_contact_date} onChange={set('first_contact_date')} /></label>
                        <div className="grid grid-cols-2 gap-3">
                            <label className="block text-xs text-slate-400">Next step<input className={input} value={editing.next_step} onChange={set('next_step')} /></label>
                            <label className="block text-xs text-slate-400">Date of next step<input type="date" className={input} value={editing.next_step_date} onChange={set('next_step_date')} /></label>
                        </div>
                        {editing.stage === 'lost' && (
                            <label className="block text-xs text-slate-400">Reason lost *<input className={input} value={editing.reason_lost} onChange={set('reason_lost')} required /></label>
                        )}
                        <label className="block text-xs text-slate-400">Notes<textarea className={input} rows={3} value={editing.notes} onChange={set('notes')} /></label>
                        <div className="flex justify-end gap-2 pt-1">
                            <button type="button" onClick={() => setEditing(null)} className="px-3 py-2 rounded-lg text-sm text-slate-300 border border-slate-700">Cancel</button>
                            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg text-sm bg-primary-500 text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

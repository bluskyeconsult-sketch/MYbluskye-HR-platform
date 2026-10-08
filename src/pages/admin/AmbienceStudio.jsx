// src/pages/admin/AmbienceStudio.jsx
// NEW (2026-10-08) - Admin > Page Backdrops. Generate the faded background
// photos ONCE with the existing OpenAI image integration; they are stored
// and reused until replaced. Also holds the rollout switch.

import { useEffect, useState, useCallback } from 'react';
import { Loader2, Sparkles, Trash2, Eye, EyeOff, ImageIcon, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { authenticatedFetch } from '../../lib/authFetch';

const THEMES = [
    { key: 'home', label: 'Home & general info', phase: 1, prompts: [
        'Diverse group of professionals chatting in a bright modern office lobby',
        'Hiring manager shaking hands with a smiling candidate after an interview' ] },
    { key: 'jobs', label: 'Jobs', phase: 1, prompts: [
        'Young job seeker searching for jobs on a laptop in a quiet cafe',
        'Candidate in smart clothes waiting in a reception area before an interview',
        'Recruiter reviewing CVs at a desk with a notepad' ] },
    { key: 'pricing', label: 'Pricing', phase: 1, prompts: [
        'Small business owners and HR managers discussing a plan around a meeting table',
        'Team lead reviewing a printed proposal beside a laptop' ] },
    { key: 'signup', label: 'Sign up & sign in', phase: 1, prompts: [
        'Confident professional starting a new job search on a laptop at home',
        'Graduate smiling while using a phone outdoors, city background' ] },
    { key: 'assessments', label: 'Assessments', phase: 1, prompts: [
        'Candidates sitting at desks in a quiet test hall taking a written assessment, seen from behind',
        'Close view of hands writing on an assessment paper at a desk',
        'Proctor walking between rows of candidates in an exam room' ] },
    { key: 'courses', label: 'Courses', phase: 1, prompts: [
        'Professionals attending a training workshop in a classroom with a facilitator',
        'Learner studying on a laptop with notes and headphones' ] },
    { key: 'employers', label: 'Employers & hiring', phase: 2, prompts: [
        'Boardroom with executives seated around a long table in discussion',
        'Interview panel of three people interviewing a candidate' ] },
    { key: 'workforce', label: 'Workforce & virtual assistants', phase: 2, prompts: [
        'Remote professional on a video call from a home office' ] },
    { key: 'books', label: 'Books', phase: 2, prompts: [
        'Person reading a book in a quiet library with warm light' ] },
    { key: 'articles', label: 'Articles & blog', phase: 2, prompts: [
        'Writer working on a laptop with coffee near a window' ] },
    { key: 'dashboard', label: 'User dashboards', phase: 2, prompts: [
        'Professional reviewing progress on a laptop in a tidy home office',
        'Colleagues collaborating over a laptop in a bright open-plan office' ] },
    { key: 'general', label: 'Everything else (fallback)', phase: 2, prompts: [
        'Busy modern office with people working at desks, soft focus' ] },
];

const SCOPES = [
    { v: 'off', t: 'Off', d: 'No backdrops anywhere.' },
    { v: 'public', t: 'Phase 1 - main public pages', d: 'Home, Jobs, Pricing, Sign Up, Assessments, Courses.' },
    { v: 'all', t: 'Phase 2 - every page', d: 'All public pages and user dashboards. Admin, exam-taking and reading pages stay clean.' },
];

// Resize to max 1920px on the long edge and re-encode as WebP in the browser:
// keeps pages fast and strips EXIF/location data from photos.
async function prepareImage(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Use a JPEG, PNG or WebP image');
    if (file.size > 25 * 1024 * 1024) throw new Error('File is over 25MB');
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1920 / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
    if (w < 800) throw new Error('Image is too small - use at least 1200px wide');
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise(r => canvas.toBlob(r, 'image/webp', 0.82));
    if (!blob) throw new Error('Could not process this image');
    return blob;
}

export default function AmbienceStudio() {
    const [rows, setRows] = useState([]);
    const [scope, setScope] = useState('public');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState('');
    const [quality, setQuality] = useState('low');
    const [custom, setCustom] = useState({});

    const load = useCallback(async () => {
        try {
            const d = await authenticatedFetch('ambience-admin-list');
            setRows(d.backdrops || []);
            setScope(d.scope || 'public');
        } catch (e) { toast.error(e.message || 'Could not load backdrops'); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const generate = async (theme, prompt) => {
        if (!prompt || prompt.trim().length < 10) return toast.error('Write a prompt of at least 10 characters');
        setBusy(`${theme}|${prompt}`);
        try {
            const d = await authenticatedFetch('ambience-generate', { theme, prompt, quality });
            setRows(r => [...r, d.backdrop]);
            toast.success(`Created (about $${d.estimatedCost.toFixed(3)})`);
        } catch (e) { toast.error(e.message || 'Generation failed'); }
        finally { setBusy(''); }
    };

    const upload = async (theme, file) => {
        if (!file) return;
        setBusy(`${theme}|upload`);
        try {
            const blob = await prepareImage(file);
            const prep = await authenticatedFetch('ambience-prepare-upload', { theme, contentType: 'image/webp' });
            const { error: upErr } = await supabase.storage.from('avatars').uploadToSignedUrl(prep.path, prep.token, blob, { contentType: 'image/webp' });
            if (upErr) throw upErr;
            const d = await authenticatedFetch('ambience-confirm-upload', { path: prep.path });
            setRows(r => [...r, d.backdrop]);
            toast.success('Image added');
        } catch (e) { toast.error(e.message || 'Upload failed'); }
        finally { setBusy(''); }
    };

    const toggle = async (row) => {
        try {
            await authenticatedFetch('ambience-update', { id: row.id, isActive: !row.is_active });
            setRows(r => r.map(x => x.id === row.id ? { ...x, is_active: !x.is_active } : x));
        } catch (e) { toast.error(e.message); }
    };
    const remove = async (row) => {
        if (!window.confirm('Delete this backdrop?')) return;
        try {
            await authenticatedFetch('ambience-update', { id: row.id, remove: true });
            setRows(r => r.filter(x => x.id !== row.id));
        } catch (e) { toast.error(e.message); }
    };
    const changeScope = async (v) => {
        try {
            await authenticatedFetch('ambience-update', { scope: v });
            setScope(v);
            toast.success('Saved. Visitors see it within about 5 minutes.');
        } catch (e) { toast.error(e.message); }
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

    const total = rows.reduce((s, r) => s + Number(r.estimated_cost || 0), 0);

    return (
        <div className="p-4 sm:p-6 max-w-5xl mx-auto text-slate-100">
            <h1 className="text-2xl font-bold flex items-center gap-2"><ImageIcon className="w-6 h-6" /> Page Backdrops</h1>
            <p className="text-sm text-slate-400 mt-1">
                Faded photos drifting behind page content. Each is generated once, stored, and reused until you replace it.
                These are AI-generated images of people who do not exist - do not describe them as real clients or users.
            </p>

            <div className="mt-5 rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                <h2 className="font-semibold mb-2">Rollout</h2>
                <div className="grid gap-2 sm:grid-cols-3">
                    {SCOPES.map(s => (
                        <button key={s.v} onClick={() => changeScope(s.v)}
                            className={`text-left rounded-lg border p-3 transition ${scope === s.v ? 'border-sky-400 bg-sky-500/10' : 'border-slate-700 hover:border-slate-500'}`}>
                            <div className="font-medium text-sm">{s.t}</div>
                            <div className="text-xs text-slate-400 mt-1">{s.d}</div>
                        </button>
                    ))}
                </div>
                <div className="mt-3 flex items-center gap-3 text-sm">
                    <label htmlFor="amb-q" className="text-slate-400">Image quality</label>
                    <select id="amb-q" value={quality} onChange={e => setQuality(e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-2 py-1">
                        <option value="low">Low (about $0.006 each) - fine for faded backgrounds</option>
                        <option value="medium">Medium (about $0.015 each) - crisper faces</option>
                    </select>
                    <span className="text-slate-500 ml-auto">Spent so far: ${total.toFixed(3)}</span>
                </div>
            </div>

            {THEMES.map(t => {
                const mine = rows.filter(r => r.theme === t.key);
                const missing = t.prompts.filter(p => !mine.some(r => r.prompt === p));
                return (
                    <section key={t.key} className="mt-6">
                        <h3 className="font-semibold">{t.label} <span className="text-xs font-normal text-slate-500">- phase {t.phase} - {mine.filter(r => r.is_active).length} active</span></h3>
                        {mine.length > 0 && (
                            <div className="mt-2 grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
                                {mine.map(r => (
                                    <div key={r.id} className={`rounded-lg overflow-hidden border ${r.is_active ? 'border-slate-700' : 'border-slate-800 opacity-50'}`}>
                                        <img src={r.image_url} alt="" loading="lazy" className="w-full h-24 object-cover" />
                                        <div className="flex items-center justify-between p-1.5 bg-slate-900">
                                            <button onClick={() => toggle(r)} className="p-1 text-slate-300 hover:text-white" aria-label={r.is_active ? 'Hide' : 'Show'}>{r.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button>
                                            <button onClick={() => remove(r)} className="p-1 text-red-400 hover:text-red-300" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="mt-2 space-y-2">
                            {missing.map(p => (
                                <div key={p} className="flex items-center gap-2 text-sm">
                                    <span className="flex-1 text-slate-300">{p}</span>
                                    <button disabled={!!busy} onClick={() => generate(t.key, p)}
                                        className="shrink-0 inline-flex items-center gap-1 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-50 px-3 py-1.5">
                                        {busy === `${t.key}|${p}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate
                                    </button>
                                </div>
                            ))}
                            <div className="flex items-center gap-2 text-sm">
                                <input value={custom[t.key] || ''} onChange={e => setCustom(c => ({ ...c, [t.key]: e.target.value }))} maxLength={900}
                                    placeholder="Or describe your own scene..." className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1.5" />
                                <button disabled={!!busy} onClick={async () => { await generate(t.key, custom[t.key]); setCustom(c => ({ ...c, [t.key]: '' })); }}
                                    className="shrink-0 inline-flex items-center gap-1 rounded border border-slate-600 hover:border-slate-400 disabled:opacity-50 px-3 py-1.5">
                                    {busy === `${t.key}|${custom[t.key]}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate
                                </button>
                            </div>
                            <label className={`inline-flex items-center gap-1 text-sm rounded border border-dashed border-slate-600 px-3 py-1.5 cursor-pointer hover:border-slate-400 ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
                                {busy === `${t.key}|upload` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload your own image (JPEG, PNG or WebP)
                                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                                    onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; upload(t.key, f); }} />
                            </label>
                        </div>
                    </section>
                );
            })}
        </div>
    );
}

// src/pages/admin/InviteCampaigns.jsx
//
// NEW (2026-10-07): Invitation Campaigns.
// Upload or paste a list of emails, choose the tier you are inviting them
// to experience, review a tier-specific message (fully editable), send a
// test to yourself, then send in safe batches. Tracks clicks, sign-ups and
// unsubscribes per campaign.
//
// Safety is enforced on the SERVER (api/index.js): validation, suppression
// list, daily cap, unsubscribe handling. This page only drives it.

import { useState, useEffect, useMemo, useRef } from 'react';
import { authenticatedFetch } from '../../lib/authFetch';
import { Mail, Send, Users, Briefcase, Building2, Building, Upload, Loader2, Eye, RefreshCw, ShieldCheck, AlertTriangle, CheckCircle2, Plus, Trash2, Square, Bell, Server } from 'lucide-react';
import toast from 'react-hot-toast';

const TIERS = [
    { key: 'job_seeker', label: 'Job Seekers', sub: 'Free / Registered', icon: Users, blurb: 'Jobs, AI career assistants, assessments and courses - free to join.' },
    { key: 'professional', label: 'Professionals', sub: 'Professional tier', icon: Briefcase, blurb: 'Unlimited applications, Trust Score, networking and more AI credits.' },
    { key: 'employer', label: 'Employers', sub: 'Employer tier', icon: Building2, blurb: 'Post jobs, review applicants, screen with AI and assessments.' },
    { key: 'business', label: 'Businesses', sub: 'Business tier', icon: Building, blurb: 'Unlimited postings, team seats, API access and high-volume AI.' }
];

const BASES = [
    { key: 'existing_relationship', label: 'They are existing contacts / clients / past customers of mine' },
    { key: 'consent', label: 'They agreed to hear from me (e.g. signed up, replied, gave permission)' },
    { key: 'business_contact', label: 'Business contacts where this is relevant to their role' },
    { key: 'personal_network', label: 'My personal and professional network (people who know me)' }
];

const EMAIL_RE = /^[A-Za-z0-9._%+\-']+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}$/;

function parseContacts(text) {
    const contacts = [], invalid = [], seen = new Set();
    let duplicates = 0;
    for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim();
        if (!line) continue;
        const parts = line.split(/[,;\t]/).map(p => p.trim().replace(/^"|"$/g, '')).filter(Boolean);
        const email = parts.find(p => p.includes('@'));
        if (!email) { if (!/^(e-?mail|name|first)/i.test(line)) invalid.push(line.slice(0, 60)); continue; }
        const e = email.toLowerCase();
        if (!EMAIL_RE.test(e)) { invalid.push(email.slice(0, 60)); continue; }
        if (seen.has(e)) { duplicates++; continue; }
        seen.add(e);
        const name = parts.find(p => p !== email && !p.includes('@')) || '';
        contacts.push({ email: e, firstName: name.split(/\s+/)[0] || '' });
    }
    return { contacts, invalid, duplicates };
}

function Pill({ children, tone = 'slate' }) {
    const tones = { slate: 'bg-slate-700 text-slate-300', green: 'bg-emerald-500/20 text-emerald-400', amber: 'bg-amber-500/20 text-amber-400', red: 'bg-red-500/20 text-red-400', blue: 'bg-sky-500/20 text-sky-400' };
    return <span className={`text-xs px-2 py-0.5 rounded-full ${tones[tone]}`}>{children}</span>;
}

export default function InviteCampaigns() {
    const [tab, setTab] = useState('new');

    // ---- new campaign state
    const [tier, setTier] = useState('');
    const [name, setName] = useState('');
    const [contactsText, setContactsText] = useState('');
    const [form, setForm] = useState(null); // { subject, headline, intro, closing, bullets[] }
    const [edited, setEdited] = useState(false);
    const [testerCode, setTesterCode] = useState('');
    const [lawfulBasis, setLawfulBasis] = useState('');
    const [attest, setAttest] = useState(false);
    const [previewHtml, setPreviewHtml] = useState('');
    const [busy, setBusy] = useState('');
    const [meta, setMeta] = useState({ replyToConfigured: true, postalAddressConfigured: true, dailyCap: 200, testingMode: null });

    // ---- campaigns state
    const [list, setList] = useState(null);
    const [loadingList, setLoadingList] = useState(false);
    const [run, setRun] = useState(null); // { campaignId, mode, sent, failed, remaining, note }
    const stopRef = useRef(false);
    const [smtp, setSmtp] = useState(null);
    const [smtpBusy, setSmtpBusy] = useState(false);

    const parsed = useMemo(() => parseContacts(contactsText), [contactsText]);

    useEffect(() => { if (tab === 'campaigns') loadList(); }, [tab]);

    async function loadList() {
        setLoadingList(true);
        try { setList(await authenticatedFetch('invite-campaign-list')); }
        catch (e) { toast.error(e.message); }
        finally { setLoadingList(false); }
    }

    async function chooseTier(key) {
        if (edited && !confirm('Switching audience replaces your edited message with that tier\'s default. Continue?')) return;
        setTier(key);
        try {
            const res = await authenticatedFetch(`invite-defaults&tier=${key}`);
            const d = res.defaults;
            setForm({ subject: d.subject, preheader: d.preheader || '', headline: d.headline, intro: d.intro, closing: d.closing || '', ps: d.ps || '', bullets: d.bullets.map(b => ({ ...b })), stepsTitle: d.stepsTitle || '', steps: (d.steps || []).map(x => ({ ...x })), snapshot: { title: d.snapshot?.title || '', note: d.snapshot?.note || '', rows: (d.snapshot?.rows || []).map(r => ({ ...r })) } });
            setMeta({ replyToConfigured: res.replyToConfigured, postalAddressConfigured: res.postalAddressConfigured, dailyCap: res.dailyCap, testingMode: res.testingMode });
            setEdited(false);
            setPreviewHtml('');
        } catch (e) { toast.error(e.message); }
    }

    function setField(k, v) { setForm(f => ({ ...f, [k]: v })); setEdited(true); setPreviewHtml(''); }
    function setBullet(i, k, v) { setForm(f => ({ ...f, bullets: f.bullets.map((b, j) => j === i ? { ...b, [k]: v } : b) })); setEdited(true); setPreviewHtml(''); }
    function addBullet() { setForm(f => ({ ...f, bullets: [...f.bullets, { title: '', text: '' }].slice(0, 8) })); setEdited(true); }
    function removeBullet(i) { setForm(f => ({ ...f, bullets: f.bullets.filter((_, j) => j !== i) })); setEdited(true); setPreviewHtml(''); }

    function setStep(i, k, v) { setForm(f => ({ ...f, steps: f.steps.map((x, j) => j === i ? { ...x, [k]: v } : x) })); setEdited(true); setPreviewHtml(''); }
    function addStep() { setForm(f => ({ ...f, steps: [...f.steps, { title: '', text: '' }].slice(0, 5) })); setEdited(true); }
    function removeStep(i) { setForm(f => ({ ...f, steps: f.steps.filter((_, j) => j !== i) })); setEdited(true); setPreviewHtml(''); }
    function setSnap(k, v) { setForm(f => ({ ...f, snapshot: { ...f.snapshot, [k]: v } })); setEdited(true); setPreviewHtml(''); }
    function setRow(i, k, v) { setForm(f => ({ ...f, snapshot: { ...f.snapshot, rows: f.snapshot.rows.map((r, j) => j === i ? { ...r, [k]: v } : r) } })); setEdited(true); setPreviewHtml(''); }
    function addRow() { setForm(f => ({ ...f, snapshot: { ...f.snapshot, rows: [...f.snapshot.rows, { label: '', value: '' }].slice(0, 10) } })); setEdited(true); }
    function removeRow(i) { setForm(f => ({ ...f, snapshot: { ...f.snapshot, rows: f.snapshot.rows.filter((_, j) => j !== i) } })); setEdited(true); setPreviewHtml(''); }

    async function checkSmtp() {
        setSmtpBusy(true);
        try { setSmtp(await authenticatedFetch('invite-smtp-check', {})); }
        catch (e) { toast.error(e.message); }
        finally { setSmtpBusy(false); }
    }

    async function onFile(e) {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (file.size > 1024 * 1024) return toast.error('File too large (max 1 MB).');
        const text = await file.text();
        setContactsText(t => (t ? t.trimEnd() + '\n' : '') + text);
        toast.success(`Loaded ${file.name}`);
    }

    const payloadContent = () => ({ tier, ...form, testerCode: testerCode.trim() || undefined });

    async function doPreview() {
        if (!form) return toast.error('Choose an audience first.');
        setBusy('preview');
        try { const r = await authenticatedFetch('invite-preview', payloadContent()); setPreviewHtml(r.html); }
        catch (e) { toast.error(e.message); }
        finally { setBusy(''); }
    }

    async function doTest() {
        if (!form) return toast.error('Choose an audience first.');
        setBusy('test');
        try { const r = await authenticatedFetch('invite-send-test', payloadContent()); toast.success(`Test sent to ${r.sentTo}`); }
        catch (e) { toast.error(e.message); }
        finally { setBusy(''); }
    }

    async function doCreate() {
        if (!tier || !form) return toast.error('Choose an audience first.');
        if (!name.trim()) return toast.error('Name the campaign.');
        if (parsed.contacts.length === 0) return toast.error('Add at least one valid email.');
        if (!lawfulBasis) return toast.error('Select why you are entitled to contact these people.');
        if (!attest) return toast.error('Please tick the confirmation box.');
        setBusy('create');
        try {
            const r = await authenticatedFetch('invite-campaign-create', {
                name, ...payloadContent(), lawfulBasis, attest: true, contacts: parsed.contacts
            });
            toast.success(`Campaign saved: ${r.accepted} eligible contacts` + (r.alreadyMembers ? `, ${r.alreadyMembers} already members removed` : '') + (r.suppressed ? `, ${r.suppressed} unsubscribed removed` : ''));
            setContactsText(''); setName(''); setAttest(false); setPreviewHtml('');
            setTab('campaigns');
        } catch (e) { toast.error(e.message); }
        finally { setBusy(''); }
    }

    // ---- sending loop: small batches until nothing remains / cap reached / stopped
    async function runSend(campaignId, mode) {
        stopRef.current = false;
        setRun({ campaignId, mode, sent: 0, failed: 0, remaining: null, note: 'Starting...' });
        let sent = 0, failed = 0;
        try {
            for (let guard = 0; guard < 200; guard++) {
                if (stopRef.current) { setRun(r => ({ ...r, note: 'Stopped. You can resume any time.' })); break; }
                const r = await authenticatedFetch('invite-send-batch', { campaignId, mode, batchSize: 10 });
                sent += r.sent; failed += r.failed;
                setRun({ campaignId, mode, sent, failed, remaining: r.remaining, note: r.capReached ? `Daily cap of ${r.dailyCap} reached. Resume tomorrow.` : 'Sending...' });
                if (r.capReached || r.remaining === 0 || (r.sent === 0 && r.failed === 0)) {
                    setRun(x => ({ ...x, note: r.capReached ? `Daily cap of ${r.dailyCap} reached. Resume tomorrow.` : 'Done.' }));
                    break;
                }
            }
        } catch (e) { toast.error(e.message); setRun(x => x && ({ ...x, note: `Error: ${e.message}` })); }
        loadList();
    }

    async function retryFailed(campaignId) {
        try { const r = await authenticatedFetch('invite-retry-failed', { campaignId }); toast.success(`${r.requeued} re-queued`); loadList(); }
        catch (e) { toast.error(e.message); }
    }

    const inputCls = 'w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500';

    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-1">
                <Mail className="w-7 h-7 text-primary-400" />
                <h1 className="text-2xl font-bold text-white">Invite People</h1>
            </div>
            <p className="text-slate-400 text-sm mb-5">Invite a list of people to experience ODUSBABA, with a message written for the kind of user they are.</p>

            <div className="flex gap-2 mb-6 border-b border-slate-800">
                {[['new', 'New campaign'], ['campaigns', 'Campaigns & results']].map(([k, l]) => (
                    <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 text-sm border-b-2 -mb-px ${tab === k ? 'border-primary-500 text-white' : 'border-transparent text-slate-400 hover:text-white'}`}>{l}</button>
                ))}
            </div>

            <div className="mb-6 p-3 rounded-xl border border-slate-700 bg-slate-800/40">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm text-slate-300"><Server className="w-4 h-4 text-primary-400" /> Email connection (uses the SMTP settings in Vercel)</div>
                    <button onClick={checkSmtp} disabled={smtpBusy} className="text-xs px-3 py-1.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-1.5 disabled:opacity-50">{smtpBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Check connection</button>
                </div>
                {smtp && (
                    <div className="mt-3 text-xs text-slate-400 space-y-1">
                        <div className={smtp.connected ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>{smtp.connected ? 'Connected: your mail server accepted the login.' : `Not connected: ${smtp.error}`}</div>
                        <div>Server: <span className="text-slate-200">{smtp.host || 'not set'}</span> &middot; Port: <span className="text-slate-200">{smtp.port}</span> ({smtp.secure ? 'SSL' : 'STARTTLS'}) &middot; Login set: <span className="text-slate-200">{smtp.userSet && smtp.passwordSet ? 'yes' : 'NO'}</span></div>
                        <div>Emails are sent from: <span className="text-slate-200">{smtp.senderAddress}</span></div>
                        <div>Replies go to: <span className="text-slate-200">{smtp.replyToConfigured ? 'your INVITE_REPLY_TO address' : 'NOT SET (set INVITE_REPLY_TO)'}</span> &middot; Footer address: <span className="text-slate-200">{smtp.postalAddressConfigured ? 'set' : 'NOT SET (set INVITE_POSTAL_ADDRESS)'}</span></div>
                    </div>
                )}
            </div>

            {tab === 'new' && (
                <div className="space-y-8">
                    {/* 1 AUDIENCE */}
                    <section>
                        <h2 className="text-white font-semibold mb-3">1. Who are you inviting?</h2>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {TIERS.map(t => (
                                <button key={t.key} onClick={() => chooseTier(t.key)} className={`text-left p-4 rounded-xl border transition ${tier === t.key ? 'border-primary-500 bg-primary-500/10' : 'border-slate-700 bg-slate-800/50 hover:border-slate-500'}`}>
                                    <div className="flex items-center gap-2 mb-1"><t.icon className="w-5 h-5 text-primary-400" /><span className="text-white font-semibold">{t.label}</span><span className="text-xs text-slate-500">{t.sub}</span></div>
                                    <p className="text-slate-400 text-sm">{t.blurb}</p>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* 2 CONTACTS */}
                    <section>
                        <h2 className="text-white font-semibold mb-1">2. Add their emails</h2>
                        <p className="text-slate-400 text-xs mb-3">Paste one per line, or upload a CSV/text file. Format: <code className="text-slate-300">email</code> or <code className="text-slate-300">email, First name</code> (a first name makes the message personal). Max 500 per campaign.</p>
                        <textarea rows={6} value={contactsText} onChange={e => setContactsText(e.target.value)} placeholder={'ada@example.com, Ada\nchidi@example.com, Chidi'} className={inputCls + ' font-mono'} />
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                            <label className="text-xs px-3 py-1.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 cursor-pointer flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" /> Upload CSV / TXT<input type="file" accept=".csv,.txt,text/csv,text/plain" className="hidden" onChange={onFile} /></label>
                            <Pill tone="green">{parsed.contacts.length} valid</Pill>
                            {parsed.duplicates > 0 && <Pill tone="amber">{parsed.duplicates} duplicates removed</Pill>}
                            {parsed.invalid.length > 0 && <Pill tone="red" >{parsed.invalid.length} invalid</Pill>}
                        </div>
                        {parsed.invalid.length > 0 && <p className="text-xs text-red-400 mt-2">Skipped: {parsed.invalid.slice(0, 5).join(', ')}{parsed.invalid.length > 5 ? '...' : ''}</p>}
                        <p className="text-xs text-slate-500 mt-2">People who already have an account, and anyone who has unsubscribed from a previous invitation, are removed automatically when you save.</p>
                    </section>

                    {/* 3 MESSAGE */}
                    {form && (
                        <section>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-white font-semibold">3. The message</h2>
                                <button onClick={() => { setEdited(false); chooseTier(tier); }} className="text-xs text-slate-400 hover:text-white flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Reset to default</button>
                            </div>
                            {meta.testingMode !== null && (
                                <div className={`mb-3 text-xs p-3 rounded-lg border ${meta.testingMode ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300' : 'border-slate-700 bg-slate-800/40 text-slate-300'}`}>
                                    {meta.testingMode
                                        ? <>Testing mode is <strong>ON</strong>. Emails to Professional, Employer and Business invitees will say the plan is free during the testing phase, and every email will say there is no referral commission yet. Both switch automatically when you turn testing mode off.</>
                                        : <>Testing mode is <strong>OFF</strong>. Emails will show normal plan prices and the live referral commission (20% first payment, 10% renewals). Invitees are directed to the free Registered plan.</>}
                                </div>
                            )}
                            <p className="text-slate-400 text-xs mb-3">Written for this tier using your real plan limits. Edit anything. <code className="text-slate-300">{'{{firstName}}'}</code> is replaced with each person's first name (or "there").</p>
                            <div className="space-y-3">
                                <div><label className="text-xs text-slate-400">Subject line</label><input className={inputCls} value={form.subject} onChange={e => setField('subject', e.target.value)} maxLength={150} /></div>
                                <div><label className="text-xs text-slate-400">Preview text (the grey line shown beside the subject in the inbox)</label><input className={inputCls} value={form.preheader} onChange={e => setField('preheader', e.target.value)} maxLength={200} /></div>
                                <div><label className="text-xs text-slate-400">Headline</label><input className={inputCls} value={form.headline} onChange={e => setField('headline', e.target.value)} maxLength={150} /></div>
                                <div><label className="text-xs text-slate-400">Opening</label><textarea rows={6} className={inputCls} value={form.intro} onChange={e => setField('intro', e.target.value)} /></div>
                                <div>
                                    <label className="text-xs text-slate-400">Benefits shown (what makes this tier compelling)</label>
                                    <div className="space-y-2 mt-1">
                                        {form.bullets.map((b, i) => (
                                            <div key={i} className="flex gap-2 items-start">
                                                <div className="flex-1 grid sm:grid-cols-3 gap-2">
                                                    <input className={inputCls} placeholder="Title" value={b.title} onChange={e => setBullet(i, 'title', e.target.value)} maxLength={80} />
                                                    <input className={inputCls + ' sm:col-span-2'} placeholder="One sentence" value={b.text} onChange={e => setBullet(i, 'text', e.target.value)} maxLength={300} />
                                                </div>
                                                <button onClick={() => removeBullet(i)} className="p-2 text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                        {form.bullets.length < 8 && <button onClick={addBullet} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"><Plus className="w-3 h-3" /> Add benefit</button>}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400">"Get started" steps</label>
                                    <input className={inputCls + ' mt-1 mb-2'} placeholder="Section title" value={form.stepsTitle} onChange={e => setField('stepsTitle', e.target.value)} maxLength={80} />
                                    <div className="space-y-2">
                                        {form.steps.map((x, i) => (
                                            <div key={i} className="flex gap-2 items-start">
                                                <div className="flex-1 grid sm:grid-cols-3 gap-2">
                                                    <input className={inputCls} placeholder="Step" value={x.title} onChange={e => setStep(i, 'title', e.target.value)} maxLength={100} />
                                                    <input className={inputCls + ' sm:col-span-2'} placeholder="Short detail (optional)" value={x.text} onChange={e => setStep(i, 'text', e.target.value)} maxLength={200} />
                                                </div>
                                                <button onClick={() => removeStep(i)} className="p-2 text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                        {form.steps.length < 5 && <button onClick={addStep} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"><Plus className="w-3 h-3" /> Add step</button>}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400">Plan at a glance (table)</label>
                                    <input className={inputCls + ' mt-1 mb-2'} placeholder="Table title" value={form.snapshot.title} onChange={e => setSnap('title', e.target.value)} maxLength={80} />
                                    <div className="space-y-2">
                                        {form.snapshot.rows.map((r, i) => (
                                            <div key={i} className="flex gap-2 items-start">
                                                <div className="flex-1 grid grid-cols-2 gap-2">
                                                    <input className={inputCls} placeholder="Label" value={r.label} onChange={e => setRow(i, 'label', e.target.value)} maxLength={60} />
                                                    <input className={inputCls} placeholder="Value" value={r.value} onChange={e => setRow(i, 'value', e.target.value)} maxLength={100} />
                                                </div>
                                                <button onClick={() => removeRow(i)} className="p-2 text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                        {form.snapshot.rows.length < 10 && <button onClick={addRow} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"><Plus className="w-3 h-3" /> Add row</button>}
                                    </div>
                                    <input className={inputCls + ' mt-2'} placeholder="Small note under the table" value={form.snapshot.note} onChange={e => setSnap('note', e.target.value)} maxLength={200} />
                                    <p className="text-[11px] text-slate-500 mt-1">Prices and limits here are copied from your Pricing page. Check them against the live Pricing page before sending.</p>
                                </div>
                                <div><label className="text-xs text-slate-400">Closing</label><textarea rows={3} className={inputCls} value={form.closing} onChange={e => setField('closing', e.target.value)} /></div>
                                <div><label className="text-xs text-slate-400">P.S. (optional)</label><textarea rows={2} className={inputCls} value={form.ps} onChange={e => setField('ps', e.target.value)} maxLength={600} /></div>
                                <div><label className="text-xs text-slate-400">Invite code to include (optional - needed only if tester registration is switched on)</label><input className={inputCls} value={testerCode} onChange={e => { setTesterCode(e.target.value); setPreviewHtml(''); }} placeholder="e.g. ABCD2345" maxLength={32} /></div>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-4">
                                <button onClick={doPreview} disabled={!!busy} className="px-4 py-2 text-sm bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2 disabled:opacity-50">{busy === 'preview' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />} Preview</button>
                                <button onClick={doTest} disabled={!!busy} className="px-4 py-2 text-sm bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2 disabled:opacity-50">{busy === 'test' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send a test to me</button>
                            </div>
                            {previewHtml && <iframe title="Email preview" sandbox="" srcDoc={previewHtml} className="w-full h-[640px] mt-4 rounded-xl border border-slate-700 bg-white" />}
                        </section>
                    )}

                    {/* 4 COMPLIANCE + SAVE */}
                    {form && (
                        <section className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
                            <h2 className="text-white font-semibold mb-1 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-amber-400" /> 4. Confirm you may contact these people</h2>
                            <p className="text-slate-400 text-xs mb-3">Emailing people who have not agreed to hear from you can break the law (for example UK PECR/GDPR, EU rules and Nigeria's NDPR), and gets sending domains blacklisted. Every email includes an unsubscribe link, and anyone who unsubscribes is never emailed again.</p>
                            {(!meta.replyToConfigured || !meta.postalAddressConfigured) && (
                                <div className="mb-3 text-xs text-amber-300 flex gap-2"><AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>
                                    {!meta.replyToConfigured && <>Set <code>INVITE_REPLY_TO</code> in Vercel so replies reach you (otherwise replies go to the no-reply address). </>}
                                    {!meta.postalAddressConfigured && <>Set <code>INVITE_POSTAL_ADDRESS</code> to show your business address in the footer (required by CAN-SPAM and good practice elsewhere).</>}
                                </span></div>
                            )}
                            <div className="space-y-2 mb-3">
                                {BASES.map(b => (
                                    <label key={b.key} className="flex items-start gap-2 text-sm text-slate-300 cursor-pointer"><input type="radio" name="basis" checked={lawfulBasis === b.key} onChange={() => setLawfulBasis(b.key)} className="mt-1" />{b.label}</label>
                                ))}
                            </div>
                            <label className="flex items-start gap-2 text-sm text-white cursor-pointer mb-4"><input type="checkbox" checked={attest} onChange={e => setAttest(e.target.checked)} className="mt-1" />I confirm the above is true and I am entitled to email everyone on this list.</label>
                            <input className={inputCls + ' mb-3'} placeholder="Campaign name (internal), e.g. Lagos HR network - Oct" value={name} onChange={e => setName(e.target.value)} maxLength={120} />
                            <button onClick={doCreate} disabled={!!busy} className="px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-500 flex items-center gap-2 disabled:opacity-50">{busy === 'create' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Save campaign ({parsed.contacts.length} contacts)</button>
                            <p className="text-xs text-slate-500 mt-2">Saving does not send anything. You send from the "Campaigns & results" tab.</p>
                        </section>
                    )}
                </div>
            )}

            {tab === 'campaigns' && (
                <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                        <div className="text-sm text-slate-400">
                            {list && <>Sent in last 24h: <span className="text-white">{list.sentLast24h}</span> of <span className="text-white">{list.dailyCap}</span> daily cap &middot; Unsubscribed (do-not-email list): <span className="text-white">{list.suppressionCount}</span></>}
                        </div>
                        <button onClick={loadList} className="text-xs px-3 py-1.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-1.5"><RefreshCw className={`w-3.5 h-3.5 ${loadingList ? 'animate-spin' : ''}`} /> Refresh</button>
                    </div>
                    {list && !list.replyToConfigured && <p className="text-xs text-amber-300 mb-3 flex gap-2"><AlertTriangle className="w-4 h-4" /> <span><code>INVITE_REPLY_TO</code> is not set, so replies would go to the no-reply address.</span></p>}
                    {loadingList && !list && <Loader2 className="w-6 h-6 animate-spin text-primary-400" />}
                    {list && list.campaigns.length === 0 && <p className="text-slate-400 text-sm">No campaigns yet. Create one in the first tab.</p>}
                    <div className="space-y-4">
                        {list?.campaigns.map(c => {
                            const s = c.stats; const active = run?.campaignId === c.id;
                            const conv = s.sent > 0 ? Math.round((s.registered / s.sent) * 1000) / 10 : 0;
                            return (
                                <div key={c.id} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div><div className="text-white font-semibold">{c.name}</div><div className="text-xs text-slate-500">{TIERS.find(t => t.key === c.target_tier)?.label} &middot; {new Date(c.created_at).toLocaleDateString()} &middot; {c.lawful_basis.replace('_', ' ')}</div></div>
                                        <div className="flex flex-wrap gap-2">
                                            {s.pending > 0 && <button disabled={!!run && !run.note?.match(/Done|Stopped|cap|Error/)} onClick={() => runSend(c.id, 'invite')} className="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-500 flex items-center gap-1.5 disabled:opacity-50"><Send className="w-3.5 h-3.5" /> Send {s.pending} pending</button>}
                                            {s.canRemind > 0 && <button disabled={!!run && !run.note?.match(/Done|Stopped|cap|Error/)} onClick={() => confirm(`Send ONE reminder to ${s.canRemind} people who have not clicked or registered?`) && runSend(c.id, 'reminder')} className="text-xs px-3 py-1.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-1.5 disabled:opacity-50"><Bell className="w-3.5 h-3.5" /> Remind {s.canRemind}</button>}
                                            {s.failed > 0 && <button onClick={() => retryFailed(c.id)} className="text-xs px-3 py-1.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600">Retry {s.failed} failed</button>}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3 text-center">
                                        {[['Invited', s.total], ['Sent', s.sent], ['Clicked', s.clicked], ['Registered', s.registered], ['Unsubscribed', s.unsubscribed], ['Failed', s.failed]].map(([l, v]) => (
                                            <div key={l} className="bg-slate-900/60 rounded-lg py-2"><div className="text-lg font-bold text-white">{v}</div><div className="text-[11px] text-slate-500">{l}</div></div>
                                        ))}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-2">Sign-up rate: <span className="text-slate-300">{conv}%</span> of those sent{s.skipped > 0 && <> &middot; {s.skipped} skipped (already members)</>}{s.reminded > 0 && <> &middot; {s.reminded} reminded</>}. Clicks can include automatic link scanners, so treat them as an upper bound.</div>
                                    {active && (
                                        <div className="mt-3 p-3 rounded-lg bg-slate-900/60 text-sm">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-slate-300">{run.note} Sent {run.sent}{run.failed > 0 && <>, failed {run.failed}</>}{run.remaining != null && <>, remaining {run.remaining}</>}</span>
                                                {run.note === 'Sending...' || run.note === 'Starting...' ? <button onClick={() => { stopRef.current = true; }} className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded flex items-center gap-1"><Square className="w-3 h-3" /> Stop</button> : null}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

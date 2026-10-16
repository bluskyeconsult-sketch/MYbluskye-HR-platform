// src/pages/admin/AdminInbox.jsx
//
// NEW (2026-10-16): the Admin Inbox. A private working copy of your real mailboxes (support@, privacy@ and
// any you add) so you can read, search, label, note, turn into a ticket, and reply from the website.
// Your mail host's own webmail/app stays the master copy and still receives everything.
// Opening a conversation here marks it read on the website only; it does not change the read mark in your mailbox.

import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Mail, Search, RefreshCw, Settings, Send, Wand2, AlertTriangle, X, Plus, Trash2, Tag, FileText, LifeBuoy, User, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { authenticatedFetch } from '../../lib/authFetch';
import MailMessageFrame from '../../components/admin/MailMessageFrame';

const STATUS = { open: 'Open', waiting: 'Waiting on them', done: 'Done' };
const STATUS_STYLE = { open: 'bg-blue-500/15 text-blue-300', waiting: 'bg-amber-500/15 text-amber-300', done: 'bg-emerald-500/15 text-emerald-300' };
const BRACKET = /\[[^\]\n]{2,60}\]|\{\{[^}]+\}\}|<<[^>]+>>/;

const newToken = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const fmtWhen = (iso) => {
    if (!iso) return '';
    const d = new Date(iso); const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    return sameDay ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
};
const fmtFull = (iso) => iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
const fmtSize = (n) => n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round((n || 0) / 1024))} KB`;
const fileToB64 = (f) => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result).split(',')[1] || ''); r.onerror = reject; r.readAsDataURL(f); });

export default function AdminInbox() {
    const [accounts, setAccounts] = useState([]);
    const [canManage, setCanManage] = useState(false);
    const [accountId, setAccountId] = useState('all');
    const [status, setStatus] = useState('all');
    const [unreadOnly, setUnreadOnly] = useState(false);
    const [label, setLabel] = useState('');
    const [q, setQ] = useState('');
    const [qInput, setQInput] = useState('');
    const [threads, setThreads] = useState([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [active, setActive] = useState(null);       // full thread payload
    const [loadingThread, setLoadingThread] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [composeNew, setComposeNew] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const activeIdRef = useRef(null);

    const loadAccounts = useCallback(async () => {
        try {
            const d = await authenticatedFetch('mail-accounts', {});
            setAccounts(d.accounts || []); setCanManage(!!d.canManage);
        } catch (e) { setError(e.message); }
    }, []);

    const loadThreads = useCallback(async (p = 0, quiet = false) => {
        if (!quiet) setLoading(true);
        try {
            const d = await authenticatedFetch('mail-threads', { accountId, status, unread: unreadOnly, label, q, page: p });
            setThreads((prev) => p === 0 ? d.threads : [...prev, ...d.threads]);
            setHasMore(!!d.hasMore); setPage(p); setError('');
        } catch (e) { if (!quiet) setError(e.message); }
        if (!quiet) setLoading(false);
    }, [accountId, status, unreadOnly, label, q]);

    useEffect(() => { loadAccounts(); }, [loadAccounts]);
    useEffect(() => { loadThreads(0); }, [loadThreads]);
    useEffect(() => {
        const t = setInterval(() => { if (document.visibilityState === 'visible') loadThreads(0, true); }, 60000);
        return () => clearInterval(t);
    }, [loadThreads]);

    async function openThread(id) {
        activeIdRef.current = id; setLoadingThread(true);
        try {
            const d = await authenticatedFetch('mail-thread', { threadId: id });
            if (activeIdRef.current === id) { setActive(d); setThreads((ts) => ts.map((t) => t.id === id ? { ...t, unread_count: 0 } : t)); }
        } catch (e) { toast.error(e.message); }
        setLoadingThread(false);
    }
    async function refreshActive() { if (active) await openThread(active.thread.id); loadThreads(0, true); }

    async function syncNow() {
        const targets = accountId === 'all' ? accounts.filter((a) => a.isActive && a.configured) : accounts.filter((a) => a.id === accountId);
        if (!targets.length) { toast.error('No connected mailbox to check yet. Open Settings to see what is missing.'); return; }
        setSyncing(true);
        let got = 0;
        for (const a of targets) {
            try {
                const d = await authenticatedFetch('mail-sync-now', { accountId: a.id });
                got += (d.result?.inbox?.stored || 0) + (d.result?.sent?.stored || 0);
                if (d.result && d.result.ok === false && d.result.error) toast.error(`${a.address}: ${d.result.error}`);
            } catch (e) { toast.error(`${a.address}: ${e.message}`); }
        }
        setSyncing(false);
        toast.success(got ? `${got} new message${got === 1 ? '' : 's'} copied in.` : 'Checked. Nothing new.');
        loadAccounts(); loadThreads(0, true);
    }

    async function updateThread(patch) {
        try {
            await authenticatedFetch('mail-thread-update', { threadId: active.thread.id, ...patch });
            await refreshActive();
        } catch (e) { toast.error(e.message); }
    }

    const acctById = Object.fromEntries(accounts.map((a) => [a.id, a]));
    const anyUnconfigured = accounts.some((a) => a.isActive && !a.configured);
    const allLabels = [...new Set(threads.flatMap((t) => t.labels || []))].sort();

    return (
        <div className="p-4 lg:p-6 text-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <Mail className="w-6 h-6 text-primary-400" />
                    <h1 className="text-xl font-bold text-white">Inbox</h1>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setComposeNew(true)} className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> New message</button>
                    <button onClick={syncNow} disabled={syncing} className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm disabled:opacity-50">
                        {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Check now
                    </button>
                    <button onClick={() => setShowSettings(true)} className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm"><Settings className="w-4 h-4" /> Settings</button>
                </div>
            </div>

            {anyUnconfigured && (
                <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm rounded-lg px-3 py-2.5 mb-4">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>One or more mailboxes are not connected yet. Open <button className="underline" onClick={() => setShowSettings(true)}>Settings</button> to see exactly what is missing.</span>
                </div>
            )}
            <p className="text-xs text-slate-500 mb-4">A private copy of your mailboxes, refreshed about every 5 minutes. Your normal email app still receives everything. Opening a conversation here marks it read on the website only.</p>

            <div className="flex flex-wrap items-center gap-2 mb-3">
                <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-sm">
                    <option value="all">All mailboxes</option>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.address}</option>)}
                </select>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-sm">
                    <option value="all">Any status</option>
                    {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <label className="flex items-center gap-1.5 text-sm px-2"><input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} /> Unread only</label>
                {allLabels.length > 0 && (
                    <select value={label} onChange={(e) => setLabel(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-sm">
                        <option value="">Any label</option>
                        {allLabels.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                )}
                <form onSubmit={(e) => { e.preventDefault(); setQ(qInput.trim()); }} className="flex-1 min-w-[180px] relative">
                    <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-500" />
                    <input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Search subject, sender or text" className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-8 py-2 text-sm" />
                    {q && <button type="button" onClick={() => { setQ(''); setQInput(''); }} className="absolute right-2 top-2.5 text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>}
                </form>
            </div>

            {error && <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-3">{error}</div>}

            <div className="grid lg:grid-cols-[minmax(300px,380px)_1fr] gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden lg:max-h-[75vh] lg:overflow-y-auto">
                    {loading ? <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-500" /></div>
                        : threads.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">{q ? 'No conversations match that search.' : 'No conversations yet. New mail appears here within about 5 minutes of arriving.'}</div>
                            : threads.map((t) => (
                                <button key={t.id} onClick={() => openThread(t.id)} className={`w-full text-left px-3.5 py-3 border-b border-slate-800 hover:bg-slate-800/60 ${active?.thread?.id === t.id ? 'bg-slate-800' : ''}`}>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={`text-sm truncate ${t.unread_count > 0 ? 'font-semibold text-white' : 'text-slate-300'}`}>{(t.participants && t.participants[0]) || 'Unknown'}</span>
                                        <span className="text-xs text-slate-500 flex-shrink-0">{fmtWhen(t.last_message_at)}</span>
                                    </div>
                                    <div className={`text-sm truncate ${t.unread_count > 0 ? 'text-white' : 'text-slate-400'}`}>{t.subject}</div>
                                    <div className="text-xs text-slate-500 truncate">{t.snippet}</div>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                        {t.unread_count > 0 && <span className="w-2 h-2 rounded-full bg-primary-400" />}
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_STYLE[t.status]}`}>{STATUS[t.status]}</span>
                                        {accountId === 'all' && acctById[t.account_id] && <span className="text-[10px] text-slate-500">{acctById[t.account_id].key}</span>}
                                        {t.message_count > 1 && <span className="text-[10px] text-slate-500">{t.message_count} messages</span>}
                                        {t.has_attachments && <FileText className="w-3 h-3 text-slate-500" />}
                                        {t.linked_user_id && <User className="w-3 h-3 text-emerald-400" title="Registered user" />}
                                        {t.linked_ticket_id && <LifeBuoy className="w-3 h-3 text-sky-400" title="Has a ticket" />}
                                        {(t.labels || []).map((l) => <span key={l} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">{l}</span>)}
                                    </div>
                                </button>
                            ))}
                    {hasMore && <button onClick={() => loadThreads(page + 1)} className="w-full py-3 text-sm text-primary-400 hover:bg-slate-800">Load more</button>}
                </div>

                <div className="min-w-0">
                    {loadingThread ? <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-500" /></div>
                        : active ? <ThreadView key={active.thread.id} data={active} onChanged={refreshActive} onUpdate={updateThread} />
                            : <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center text-sm text-slate-500">Choose a conversation to read it.</div>}
                </div>
            </div>

            {composeNew && <ComposeModal accounts={accounts.filter((a) => a.isActive && a.configured)} onClose={() => setComposeNew(false)} onSent={() => { setComposeNew(false); loadThreads(0, true); }} />}
            {showSettings && <SettingsModal accounts={accounts} canManage={canManage} onClose={() => setShowSettings(false)} onChanged={loadAccounts} />}
        </div>
    );
}

// ---------------------------------------------------------------------------------------------
function ThreadView({ data, onChanged, onUpdate }) {
    const { thread, messages, notes, sender, ticket, account } = data;
    const [note, setNote] = useState('');
    const [labelInput, setLabelInput] = useState('');
    const [busy, setBusy] = useState(false);

    async function addNote() {
        if (!note.trim()) return;
        try { await authenticatedFetch('mail-note-add', { threadId: thread.id, body: note }); setNote(''); onChanged(); } catch (e) { toast.error(e.message); }
    }
    async function makeTicket() {
        setBusy(true);
        try { const d = await authenticatedFetch('mail-create-ticket', { threadId: thread.id }); toast.success(`Ticket ${d.ticket.ticket_number} created.`); onChanged(); } catch (e) { toast.error(e.message); }
        setBusy(false);
    }
    async function openAttachment(messageId, index) {
        try { const d = await authenticatedFetch('mail-attachment-url', { messageId, index }); window.open(d.url, '_blank', 'noopener'); } catch (e) { toast.error(e.message); }
    }
    function addLabel() {
        const l = labelInput.trim().toLowerCase(); if (!l) return;
        onUpdate({ labels: [...(thread.labels || []), l] }); setLabelInput('');
    }

    return (
        <div className="space-y-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-lg font-semibold text-white break-words">{thread.subject}</h2>
                        <p className="text-xs text-slate-500 mt-0.5">{account?.address} · {messages.length} message{messages.length === 1 ? '' : 's'}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <select value={thread.status} onChange={(e) => onUpdate({ status: e.target.value })} className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm">
                            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                        <button onClick={() => onUpdate({ markUnread: true })} className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs">Mark unread</button>
                        {!thread.linked_ticket_id && <button onClick={makeTicket} disabled={busy} className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs disabled:opacity-50"><LifeBuoy className="w-3.5 h-3.5" /> Make a ticket</button>}
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    <Tag className="w-3.5 h-3.5 text-slate-500" />
                    {(thread.labels || []).map((l) => (
                        <span key={l} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-slate-700">{l}
                            <button onClick={() => onUpdate({ labels: thread.labels.filter((x) => x !== l) })} className="text-slate-400 hover:text-white"><X className="w-3 h-3" /></button></span>
                    ))}
                    <input value={labelInput} onChange={(e) => setLabelInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addLabel()} placeholder="Add label" className="bg-transparent border-b border-slate-700 text-xs px-1 py-0.5 w-24 focus:outline-none" />
                </div>
                {(sender || ticket) && (
                    <div className="mt-3 text-xs bg-slate-800/60 rounded-lg px-3 py-2 flex flex-wrap gap-x-4 gap-y-1">
                        {sender && <span><User className="w-3 h-3 inline mr-1 text-emerald-400" />Registered user: <b className="text-white">{sender.full_name || sender.email}</b> · {sender.tier || 'free'} plan · joined {fmtFull(sender.created_at).split(',')[0]}</span>}
                        {ticket && <span><LifeBuoy className="w-3 h-3 inline mr-1 text-sky-400" />Ticket <b className="text-white">{ticket.ticket_number}</b> ({ticket.status})</span>}
                    </div>
                )}
            </div>

            {messages.map((m) => <MessageCard key={m.id} m={m} onAttachment={openAttachment} />)}

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Private notes (never sent)</p>
                {notes.map((n) => <div key={n.id} className="text-sm bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 mb-2"><div className="text-xs text-slate-500 mb-0.5">{fmtFull(n.created_at)}</div>{n.body}</div>)}
                <div className="flex gap-2">
                    <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addNote()} placeholder="Add a note for yourself or your team" className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
                    <button onClick={addNote} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm">Add</button>
                </div>
            </div>

            <ReplyBox thread={thread} messages={messages} account={account} onSent={onChanged} />
        </div>
    );
}

function MessageCard({ m, onAttachment }) {
    const out = m.direction === 'out';
    const warn = !out && ['fail', 'softfail', 'permerror'].some((x) => [m.auth_results?.spf, m.auth_results?.dkim, m.auth_results?.dmarc].includes(x));
    const toLine = (m.to_addrs || []).map((a) => a.email).join(', ');
    return (
        <div className={`rounded-xl border p-4 ${out ? 'bg-primary-900/10 border-primary-800/40' : 'bg-slate-900 border-slate-800'}`}>
            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div className="min-w-0 text-sm">
                    <span className="font-semibold text-white">{out ? 'You' : (m.from_name || m.from_email)}</span>
                    <span className="text-slate-500"> {out ? `to ${toLine}` : `<${m.from_email}>`}</span>
                    {!out && toLine && <div className="text-xs text-slate-500">to {toLine}</div>}
                </div>
                <div className="text-xs text-slate-500 flex-shrink-0">{fmtFull(m.received_at)}</div>
            </div>
            {warn && <div className="flex items-start gap-2 text-xs bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg px-3 py-2 mb-2"><Shield className="w-4 h-4 flex-shrink-0" /><span>This message failed a sender check, so it may not really come from who it says. Be careful with links, attachments and requests for money or details.</span></div>}
            {m.is_bounce && <div className="flex items-start gap-2 text-xs bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-lg px-3 py-2 mb-2"><AlertTriangle className="w-4 h-4 flex-shrink-0" /><span>This looks like a delivery failure notice for an email you sent.</span></div>}
            {m.send_status === 'sending' && <div className="text-xs text-amber-300 mb-2">Sending…</div>}
            {m.send_status === 'failed' && <div className="text-xs text-red-300 bg-red-500/10 rounded-lg px-3 py-2 mb-2">This reply was not sent: {m.send_error}</div>}
            {out ? <pre className="whitespace-pre-wrap text-sm text-slate-200 font-sans">{m.body_text}</pre> : <MailMessageFrame html={m.body_html} text={m.body_text} />}
            {(m.attachments || []).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                    {m.attachments.map((a, i) => a.path
                        ? <button key={i} onClick={() => onAttachment(m.id, i)} className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 rounded-lg px-2.5 py-1.5"><FileText className="w-3.5 h-3.5" />{a.name} <span className="text-slate-500">{fmtSize(a.size)}</span></button>
                        : <span key={i} className="flex items-center gap-1.5 text-xs bg-slate-800/50 text-slate-500 rounded-lg px-2.5 py-1.5"><FileText className="w-3.5 h-3.5" />{a.name} {a.skipped ? `(${a.skipped})` : '(sent)'}</span>)}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------------------------
function ReplyBox({ thread, messages, account, onSent }) {
    const lastIn = [...messages].reverse().find((m) => m.direction === 'in');
    const defaultTo = lastIn ? (lastIn.from_email || '') : ((thread.participants || [])[0] || '');
    const baseSubject = /^re:/i.test(thread.subject) ? thread.subject : `Re: ${thread.subject}`;
    return (
        <Composer
            title="Reply"
            accounts={account ? [account] : []}
            fixedAccountId={thread.account_id}
            threadId={thread.id}
            initialTo={defaultTo}
            initialSubject={baseSubject}
            allowAi
            onSent={onSent}
        />
    );
}

function ComposeModal({ accounts, onClose, onSent }) {
    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto p-4">
            <div className="w-full max-w-2xl mt-8">
                <div className="flex justify-end mb-1"><button onClick={onClose} className="text-slate-300 hover:text-white"><X className="w-5 h-5" /></button></div>
                {accounts.length === 0
                    ? <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-sm text-slate-300">No mailbox is connected yet. Open Settings to see what is missing.</div>
                    : <Composer title="New message" accounts={accounts} onSent={onSent} />}
            </div>
        </div>
    );
}

function Composer({ title, accounts, fixedAccountId, threadId, initialTo, initialSubject, allowAi, onSent }) {
    const [accountId, setAccountId] = useState(fixedAccountId || (accounts[0] && accounts[0].id) || '');
    const [to, setTo] = useState(initialTo || '');
    const [cc, setCc] = useState('');
    const [subject, setSubject] = useState(initialSubject || '');
    const [text, setText] = useState('');
    const [files, setFiles] = useState([]);
    const [sending, setSending] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [aiBusy, setAiBusy] = useState(false);
    const [aiNote, setAiNote] = useState('');
    const [aiQuestions, setAiQuestions] = useState([]);
    const [aiDrafted, setAiDrafted] = useState(false);
    const [saveTpl, setSaveTpl] = useState(false);
    const tokenRef = useRef(newToken());

    useEffect(() => { authenticatedFetch('mail-templates', {}).then((d) => setTemplates(d.templates || [])).catch(() => {}); }, []);

    const split = (s) => s.split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean);
    const bracketLeft = BRACKET.test(text);

    async function addFiles(list) {
        const arr = Array.from(list || []);
        const total = [...files, ...arr].reduce((n, f) => n + (f.size || 0), 0);
        if (total > 3 * 1024 * 1024) { toast.error('Attachments are limited to 3 MB in total.'); return; }
        const out = [];
        for (const f of arr) out.push({ name: f.name, type: f.type || 'application/octet-stream', size: f.size, data: await fileToB64(f) });
        setFiles((p) => [...p, ...out]);
    }
    function useTemplate(id) {
        const t = templates.find((x) => x.id === id); if (!t) return;
        setText((p) => p ? `${p}\n\n${t.body}` : t.body);
        if (t.subject && !threadId && !subject) setSubject(t.subject);
    }
    async function draftWithAi() {
        setAiBusy(true); setAiQuestions([]);
        try {
            const d = await authenticatedFetch('mail-ai-draft', { threadId, instruction: aiNote });
            setText(d.draft); setAiQuestions(d.needsInput || []); setAiDrafted(true);
        } catch (e) { toast.error(e.message); }
        setAiBusy(false);
    }
    async function send() {
        if (sending) return;
        if (bracketLeft && !window.confirm('The message still contains text in brackets that looks like a placeholder. Send anyway?')) return;
        if (aiDrafted && !window.confirm('This reply was drafted by AI. Have you checked every fact in it?')) return;
        setSending(true);
        try {
            const d = await authenticatedFetch('mail-send', {
                accountId, threadId, to: split(to), cc: split(cc), subject, text, attachments: files.map(({ name, type, data }) => ({ name, type, data })), clientToken: tokenRef.current
            });
            toast.success(d.filedInSent === false ? 'Sent. (Could not file a copy in the mailbox Sent folder, but it is saved here.)' : 'Sent.');
            if (saveTpl && text.trim()) { try { await authenticatedFetch('mail-template-save', { title: subject.slice(0, 60) || 'Saved reply', subject: threadId ? '' : subject, body: text }); } catch (e) { /* non-blocking */ } }
            setText(''); setFiles([]); setAiDrafted(false); setAiQuestions([]); setSaveTpl(false); tokenRef.current = newToken();
            onSent && onSent();
        } catch (e) { toast.error(e.message); tokenRef.current = newToken(); }
        setSending(false);
    }

    const acct = accounts.find((a) => a.id === accountId);
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{title}{acct ? ` · from ${acct.address}` : ''}</p>
            {!fixedAccountId && accounts.length > 1 && (
                <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm mb-2">
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.address}</option>)}
                </select>
            )}
            <div className="grid sm:grid-cols-2 gap-2 mb-2">
                <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="To" className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
                <input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="Cc (optional)" className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm mb-2" />

            <div className="flex flex-wrap items-center gap-2 mb-2">
                {templates.length > 0 && (
                    <select value="" onChange={(e) => useTemplate(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs">
                        <option value="">Insert a saved reply…</option>
                        {templates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                    </select>
                )}
                {allowAi && (
                    <>
                        <input value={aiNote} onChange={(e) => setAiNote(e.target.value)} placeholder="Optional: tell the AI what to say (e.g. offer a call)" className="flex-1 min-w-[180px] bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs" />
                        <button onClick={draftWithAi} disabled={aiBusy} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-violet-600/80 hover:bg-violet-600 rounded-lg text-xs disabled:opacity-50">
                            {aiBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />} Draft with AI
                        </button>
                    </>
                )}
            </div>
            {aiQuestions.length > 0 && (
                <div className="text-xs bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-lg px-3 py-2 mb-2">
                    <b>The AI needs you to confirm before sending:</b>
                    <ul className="list-disc ml-4 mt-1">{aiQuestions.map((x, i) => <li key={i}>{x}</li>)}</ul>
                </div>
            )}
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder="Write your message. Your signature is added automatically." className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm leading-relaxed" />
            {bracketLeft && <p className="text-xs text-amber-300 mt-1">Part of this message is in brackets and looks like a placeholder. Replace it before sending.</p>}
            {aiDrafted && <p className="text-xs text-slate-500 mt-1">Drafted by AI. It is never sent automatically. Check every fact first.</p>}

            <div className="flex flex-wrap items-center gap-2 mt-2">
                <label className="text-xs px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer">
                    Attach files (3 MB max)
                    <input type="file" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
                </label>
                {files.map((f, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs bg-slate-800 rounded px-2 py-1">{f.name} <span className="text-slate-500">{fmtSize(f.size)}</span>
                        <button onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}><X className="w-3 h-3" /></button></span>
                ))}
                <label className="flex items-center gap-1.5 text-xs text-slate-400 ml-auto"><input type="checkbox" checked={saveTpl} onChange={(e) => setSaveTpl(e.target.checked)} /> Also save as a saved reply</label>
                <button onClick={send} disabled={sending || !accountId} className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm disabled:opacity-50">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send
                </button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------------------------
function SettingsModal({ accounts, canManage, onClose, onChanged }) {
    const [edit, setEdit] = useState(null);
    const [templates, setTemplates] = useState([]);
    const [tpl, setTpl] = useState(null);

    const loadTpl = () => authenticatedFetch('mail-templates', {}).then((d) => setTemplates(d.templates || [])).catch(() => {});
    useEffect(() => { loadTpl(); }, []);

    async function saveAccount() {
        try { await authenticatedFetch('mail-account-save', edit); toast.success('Saved.'); setEdit(null); onChanged(); } catch (e) { toast.error(e.message); }
    }
    async function saveTemplate() {
        try { await authenticatedFetch('mail-template-save', tpl); setTpl(null); loadTpl(); } catch (e) { toast.error(e.message); }
    }
    async function delTemplate(id) {
        if (!window.confirm('Remove this saved reply?')) return;
        try { await authenticatedFetch('mail-template-delete', { id }); loadTpl(); } catch (e) { toast.error(e.message); }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto p-4">
            <div className="w-full max-w-2xl mt-8 bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold text-white">Inbox settings</h2><button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button></div>

                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Mailboxes</p>
                <div className="space-y-2 mb-3">
                    {accounts.map((a) => (
                        <div key={a.id} className="bg-slate-800/60 rounded-lg px-3 py-2.5 text-sm">
                            <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-white">{a.address}</span>
                                <span className={`text-xs px-2 py-0.5 rounded ${!a.isActive ? 'bg-slate-700 text-slate-400' : a.configured ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>{!a.isActive ? 'Switched off' : a.configured ? 'Connected' : 'Not connected'}</span>
                            </div>
                            {!a.configured && <p className="text-xs text-amber-200 mt-1">Add these in Vercel, then redeploy: <code>{a.missing.join(', ')}</code></p>}
                            {a.lastError && <p className="text-xs text-red-300 mt-1">Last problem: {a.lastError}</p>}
                            {a.lastSyncAt && <p className="text-xs text-slate-500 mt-1">Last successful check: {fmtFull(a.lastSyncAt)}</p>}
                            {canManage && <button onClick={() => setEdit({ id: a.id, key: a.key, address: a.address, displayName: a.displayName, signature: a.signature, isActive: a.isActive, syncDays: a.syncDays })} className="text-xs text-primary-400 mt-1.5">Edit</button>}
                        </div>
                    ))}
                </div>
                {canManage && !edit && <button onClick={() => setEdit({ key: '', address: '', displayName: 'BluSkye Integrated Consult', signature: 'Kind regards,\nBluSkye Integrated Consult\nbluskyeconsult.com', isActive: true, syncDays: 30 })} className="flex items-center gap-1.5 text-sm text-primary-400 mb-4"><Plus className="w-4 h-4" /> Add a mailbox</button>}

                {edit && (
                    <div className="bg-slate-800/60 rounded-lg p-3 mb-4 space-y-2 text-sm">
                        <div className="grid sm:grid-cols-2 gap-2">
                            <input value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} placeholder="Email address" className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2" />
                            <input value={edit.key} onChange={(e) => setEdit({ ...edit, key: e.target.value.toLowerCase() })} placeholder="Short key, e.g. sales" disabled={!!edit.id} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 disabled:opacity-60" />
                        </div>
                        {edit.key && <p className="text-xs text-slate-500">Its password goes in Vercel as <code>MAIL_{edit.key.toUpperCase()}_PASSWORD</code>. Never type the password here.</p>}
                        <input value={edit.displayName} onChange={(e) => setEdit({ ...edit, displayName: e.target.value })} placeholder="Name shown to recipients" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2" />
                        <textarea value={edit.signature} onChange={(e) => setEdit({ ...edit, signature: e.target.value })} rows={3} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2" />
                        <div className="flex flex-wrap items-center gap-3">
                            <label className="flex items-center gap-1.5"><input type="checkbox" checked={edit.isActive} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} /> Active</label>
                            <label className="flex items-center gap-1.5">First copy covers the last <input type="number" min="1" max="365" value={edit.syncDays} onChange={(e) => setEdit({ ...edit, syncDays: e.target.value })} className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1" /> days</label>
                            <div className="ml-auto flex gap-2"><button onClick={() => setEdit(null)} className="px-3 py-1.5 bg-slate-700 rounded-lg">Cancel</button><button onClick={saveAccount} className="px-3 py-1.5 bg-primary-600 rounded-lg text-white">Save</button></div>
                        </div>
                    </div>
                )}

                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 mt-2">Saved replies</p>
                <div className="space-y-1.5 mb-2">
                    {templates.map((t) => (
                        <div key={t.id} className="flex items-center justify-between gap-2 bg-slate-800/60 rounded-lg px-3 py-2 text-sm">
                            <button onClick={() => setTpl({ id: t.id, title: t.title, subject: t.subject, body: t.body })} className="text-left truncate hover:text-white">{t.title}</button>
                            <button onClick={() => delTemplate(t.id)} className="text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    ))}
                    {templates.length === 0 && <p className="text-xs text-slate-500">None yet.</p>}
                </div>
                {!tpl && <button onClick={() => setTpl({ title: '', subject: '', body: '' })} className="flex items-center gap-1.5 text-sm text-primary-400"><Plus className="w-4 h-4" /> New saved reply</button>}
                {tpl && (
                    <div className="bg-slate-800/60 rounded-lg p-3 space-y-2 text-sm mt-2">
                        <input value={tpl.title} onChange={(e) => setTpl({ ...tpl, title: e.target.value })} placeholder="Title (only you see this)" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2" />
                        <input value={tpl.subject} onChange={(e) => setTpl({ ...tpl, subject: e.target.value })} placeholder="Subject (optional, for new messages)" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2" />
                        <textarea value={tpl.body} onChange={(e) => setTpl({ ...tpl, body: e.target.value })} rows={5} placeholder="The reply text" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2" />
                        <div className="flex justify-end gap-2"><button onClick={() => setTpl(null)} className="px-3 py-1.5 bg-slate-700 rounded-lg">Cancel</button><button onClick={saveTemplate} className="px-3 py-1.5 bg-primary-600 rounded-lg text-white">Save</button></div>
                    </div>
                )}
            </div>
        </div>
    );
}

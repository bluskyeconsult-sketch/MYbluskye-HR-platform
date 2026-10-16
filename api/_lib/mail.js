// api/_lib/mail.js
//
// NEW (2026-10-16): the engine behind the Admin Inbox.
//   * syncAccount()  reads new mail from a mailbox over IMAP and keeps a private copy in Supabase
//   * sendMail()     sends a reply/new message over SMTP from the real mailbox address and files
//                    a copy in the mailbox's own Sent folder
//   * purgeOld()     retention: removes conversations with no activity for N months
//
// The mailbox stays the master copy. Nothing here ever deletes or changes mail on the mail server.
// Passwords come only from Vercel environment variables:
//   MAIL_IMAP_HOST (+ optional MAIL_IMAP_PORT, default 993)
//   MAIL_SMTP_HOST (+ optional MAIL_SMTP_PORT, default 465; falls back to your existing SMTP settings)
//   MAIL_<KEY>_PASSWORD   e.g. MAIL_SUPPORT_PASSWORD for the account whose key is "support"
//   MAIL_<KEY>_USER       optional, only if the login name differs from the address
//
// The folder starts with an underscore so Vercel does not treat it as a public function.

import crypto from 'node:crypto';

export const MAIL = {
    BATCH: 40,                          // messages read per mailbox per run
    CHUNK: 8,                           // messages fetched at once
    MAX_SOURCE: 15 * 1024 * 1024,       // bigger messages are listed without their body
    MAX_ATTACHMENT: 10 * 1024 * 1024,
    MAX_TOTAL_ATTACHMENTS: 25 * 1024 * 1024,
    MAX_SEND_ATTACHMENTS: 3 * 1024 * 1024,
    LOCK_MINUTES: 4,
    BUCKET: 'mail-attachments'
};

// ---------------------------------------------------------------
// dependencies (loaded on first use; tests can inject fakes)
// ---------------------------------------------------------------
let _deps = null;
export function setDeps(d) { _deps = d; }
async function deps() {
    if (_deps) return _deps;
    const imap = await import('imapflow');
    const mp = await import('mailparser');
    const nm = await import('nodemailer');
    _deps = {
        ImapFlow: imap.ImapFlow || (imap.default && imap.default.ImapFlow),
        simpleParser: mp.simpleParser || (mp.default && mp.default.simpleParser),
        nodemailer: nm.default || nm
    };
    return _deps;
}

// ---------------------------------------------------------------
// configuration
// ---------------------------------------------------------------
export function envFor(account) {
    const key = String(account.key || '').toUpperCase();
    return {
        imapHost: process.env.MAIL_IMAP_HOST || '',
        imapPort: parseInt(process.env.MAIL_IMAP_PORT || '993', 10),
        smtpHost: process.env.MAIL_SMTP_HOST || process.env.VITE_SMTP_HOST || process.env.SMTP_HOST || '',
        smtpPort: parseInt(process.env.MAIL_SMTP_PORT || process.env.VITE_SMTP_PORT || process.env.SMTP_PORT || '465', 10),
        user: process.env[`MAIL_${key}_USER`] || account.address,
        pass: process.env[`MAIL_${key}_PASSWORD`] || ''
    };
}
export function configStatus(account) {
    const e = envFor(account);
    const missing = [];
    if (!e.imapHost) missing.push('MAIL_IMAP_HOST');
    if (!e.smtpHost) missing.push('MAIL_SMTP_HOST');
    if (!e.pass) missing.push(`MAIL_${String(account.key).toUpperCase()}_PASSWORD`);
    return { configured: missing.length === 0, missing };
}

// ---------------------------------------------------------------
// small pure helpers
// ---------------------------------------------------------------
export function normSubject(s) {
    let t = String(s || '').trim().toLowerCase();
    for (let i = 0; i < 6; i++) {
        const next = t.replace(/^\s*(re|fw|fwd|aw|sv|antw|rv)\s*(\[\d+\])?\s*:\s*/i, '');
        if (next === t) break;
        t = next;
    }
    return t.replace(/\s+/g, ' ').trim().slice(0, 200);
}

export function snippetOf(text) {
    return String(text || '').replace(/\s+/g, ' ').trim().slice(0, 220);
}

export function addrList(field) {
    if (!field) return [];
    const arr = Array.isArray(field) ? field : [field];
    return arr.flatMap((f) => (f && f.value) ? f.value : [])
        .map((a) => ({ name: String(a.name || '').slice(0, 120), email: String(a.address || '').toLowerCase().slice(0, 200) }))
        .filter((a) => a.email);
}

export function parseAuthResults(header) {
    const h = String(header || '').toLowerCase();
    const pick = (k) => { const m = h.match(new RegExp(`\\b${k}=(pass|fail|softfail|neutral|none|temperror|permerror)`)); return m ? m[1] : null; };
    return { spf: pick('spf'), dkim: pick('dkim'), dmarc: pick('dmarc') };
}

export function looksLikeBounce(fromEmail, subject) {
    return /(mailer-daemon|postmaster)@/i.test(String(fromEmail || ''))
        || /(undeliverable|delivery status notification|returned mail|mail delivery (failed|subsystem)|failure notice|delivery has failed)/i.test(String(subject || ''));
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export function textToHtml(text) {
    return String(text || '').split(/\n{2,}/).map((p) => `<p style="margin:0 0 12px">${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
}

const safeName = (n) => String(n || 'file').replace(/[^\w.\- ]+/g, '_').replace(/\s+/g, '_').slice(0, 80) || 'file';

// ---------------------------------------------------------------
// storing one parsed message (used by the sync and by sending)
// ---------------------------------------------------------------
async function findThread(sb, account, { inReplyTo, refs, subjectNorm, counterparty }) {
    const ids = [inReplyTo, ...(refs || [])].filter(Boolean);
    if (ids.length) {
        const { data } = await sb.from('mail_messages').select('thread_id')
            .eq('account_id', account.id).in('message_id', ids).limit(1);
        if (data && data[0]) return data[0].thread_id;
    }
    if (subjectNorm && counterparty) {
        const since = new Date(Date.now() - 21 * 86400000).toISOString();
        const { data } = await sb.from('mail_threads').select('id')
            .eq('account_id', account.id).eq('subject_norm', subjectNorm)
            .contains('participants', [counterparty]).gt('last_message_at', since)
            .order('last_message_at', { ascending: false }).limit(1);
        if (data && data[0]) return data[0].id;
    }
    return null;
}

export async function refreshThread(sb, threadId, { newInbound = false, newOutbound = false } = {}) {
    const { data: t } = await sb.from('mail_threads').select('status, participants').eq('id', threadId).maybeSingle();
    if (!t) return;
    const { count: total } = await sb.from('mail_messages').select('id', { count: 'exact', head: true }).eq('thread_id', threadId);
    const { count: unread } = await sb.from('mail_messages').select('id', { count: 'exact', head: true })
        .eq('thread_id', threadId).eq('direction', 'in').eq('is_read', false);
    const { data: last } = await sb.from('mail_messages').select('snippet, direction, received_at, subject')
        .eq('thread_id', threadId).order('received_at', { ascending: false }).limit(1);
    const { data: att } = await sb.from('mail_messages').select('id').eq('thread_id', threadId).neq('attachments', '[]').limit(1);
    const patch = {
        message_count: total || 0,
        unread_count: unread || 0,
        has_attachments: !!(att && att.length)
    };
    if (last && last[0]) {
        patch.snippet = last[0].snippet || null;
        patch.last_direction = last[0].direction;
        patch.last_message_at = last[0].received_at;
    }
    // a new inbound message reopens a finished conversation; our reply moves an open one to "waiting"
    if (newInbound && t.status !== 'open') patch.status = 'open';
    else if (newOutbound && t.status === 'open') patch.status = 'waiting';
    await sb.from('mail_threads').update(patch).eq('id', threadId);
}

export async function ingestParsed({ sb, account, folder, uid, flags, internalDate, parsed }) {
    const direction = folder === 'sent' ? 'out' : 'in';
    const messageId = String(parsed.messageId || '').trim() || `<noid-${account.id}-${folder}-${uid || crypto.randomUUID()}@mailmirror.local>`;

    const { data: existing } = await sb.from('mail_messages').select('id, imap_uid')
        .eq('account_id', account.id).eq('folder', folder).eq('message_id', messageId).maybeSingle();
    if (existing) {
        if (uid && !existing.imap_uid) await sb.from('mail_messages').update({ imap_uid: uid }).eq('id', existing.id);
        return { inserted: false, id: existing.id };
    }

    const from = addrList(parsed.from)[0] || { name: '', email: '' };
    const to = addrList(parsed.to);
    const cc = addrList(parsed.cc);
    const refs = [].concat(parsed.references || []).filter(Boolean).map(String);
    const inReplyTo = parsed.inReplyTo ? String(parsed.inReplyTo) : null;
    const subject = String(parsed.subject || '').slice(0, 300);
    const subjectNorm = normSubject(subject);
    const counterparty = direction === 'in' ? from.email : (to[0] && to[0].email) || '';

    const now = Date.now();
    let when = parsed.date instanceof Date && !isNaN(parsed.date) ? parsed.date : (internalDate ? new Date(internalDate) : new Date());
    if (isNaN(when) || when.getTime() > now + 3600000) when = new Date(now);   // a forged future date must not pin a thread to the top
    const receivedAt = when.toISOString();

    let threadId = await findThread(sb, account, { inReplyTo, refs, subjectNorm, counterparty });
    if (!threadId) {
        const { data: created, error } = await sb.from('mail_threads').insert({
            account_id: account.id, subject: subject || '(no subject)', subject_norm: subjectNorm,
            participants: [counterparty].filter(Boolean), last_message_at: receivedAt
        }).select('id').single();
        if (error) throw error;
        threadId = created.id;
    } else if (counterparty) {
        const { data: th } = await sb.from('mail_threads').select('participants').eq('id', threadId).maybeSingle();
        if (th && !(th.participants || []).includes(counterparty)) {
            await sb.from('mail_threads').update({ participants: [...(th.participants || []), counterparty].slice(0, 30) }).eq('id', threadId);
        }
    }

    // attachments (inline images that the message body itself uses are skipped)
    const msgUuid = crypto.randomUUID();
    const attachments = [];
    let totalBytes = 0, idx = 0;
    for (const a of (parsed.attachments || [])) {
        if (a.related) continue;
        const size = (a.content && a.content.length) || a.size || 0;
        const meta = { name: String(a.filename || `attachment-${idx + 1}`).slice(0, 150), type: String(a.contentType || 'application/octet-stream').slice(0, 100), size, path: null };
        if (!a.content || size > MAIL.MAX_ATTACHMENT || totalBytes + size > MAIL.MAX_TOTAL_ATTACHMENTS) {
            meta.skipped = 'too large to store';
        } else {
            const path = `${account.id}/${msgUuid}/${idx}-${safeName(meta.name)}`;
            const { error: upErr } = await sb.storage.from(MAIL.BUCKET).upload(path, a.content, { contentType: meta.type, upsert: true });
            if (upErr) meta.skipped = 'could not store';
            else { meta.path = path; totalBytes += size; }
        }
        attachments.push(meta);
        idx++;
    }

    const text = String(parsed.text || '').slice(0, 200000);
    const html = parsed.html ? String(parsed.html).slice(0, 400000) : null;
    const auth = parseAuthResults(parsed.headers && parsed.headers.get ? parsed.headers.get('authentication-results') : '');
    const isRead = direction === 'out' ? true : !!(flags && (flags.has ? flags.has('\\Seen') : false));
    const bounce = direction === 'in' && looksLikeBounce(from.email, subject);

    const { error: insErr } = await sb.from('mail_messages').insert({
        id: msgUuid, account_id: account.id, thread_id: threadId, folder, direction, imap_uid: uid || null,
        message_id: messageId, in_reply_to: inReplyTo, refs,
        from_name: from.name, from_email: from.email, to_addrs: to, cc_addrs: cc,
        subject, snippet: snippetOf(text || String(html || '').replace(/<[^>]+>/g, ' ')),
        body_text: text, body_html: html, attachments, received_at: receivedAt,
        is_read: isRead, auth_results: auth, is_bounce: bounce
    });
    if (insErr) {
        if (insErr.code === '23505') return { inserted: false };   // another run stored it first
        throw insErr;
    }

    await refreshThread(sb, threadId, { newInbound: direction === 'in', newOutbound: direction === 'out' });
    if (bounce) await sb.from('mail_threads').update({ is_bounce: true }).eq('id', threadId);

    // link the conversation to a registered user, when the sender is one
    if (direction === 'in' && from.email) {
        const { data: th } = await sb.from('mail_threads').select('linked_user_id').eq('id', threadId).maybeSingle();
        if (th && !th.linked_user_id) {
            const pattern = from.email.replace(/[\\%_]/g, (m) => '\\' + m);
            const { data: prof } = await sb.from('profiles').select('id').ilike('email', pattern).limit(1);
            if (prof && prof[0]) await sb.from('mail_threads').update({ linked_user_id: prof[0].id }).eq('id', threadId);
        }
    }
    return { inserted: true, id: msgUuid, threadId };
}

// ---------------------------------------------------------------
// IMAP sync
// ---------------------------------------------------------------
async function getState(sb, accountId, folder) {
    const { data } = await sb.from('mail_sync_state').select('*').eq('account_id', accountId).eq('folder', folder).maybeSingle();
    if (data) return data;
    await sb.from('mail_sync_state').insert({ account_id: accountId, folder });
    return { account_id: accountId, folder, last_uid: 0, fail_count: 0 };
}

async function acquireLock(sb, accountId, folder) {
    await getState(sb, accountId, folder);
    const now = new Date();
    const until = new Date(now.getTime() + MAIL.LOCK_MINUTES * 60000).toISOString();
    const { data } = await sb.from('mail_sync_state').update({ locked_until: until })
        .eq('account_id', accountId).eq('folder', folder)
        .or(`locked_until.is.null,locked_until.lt.${now.toISOString()}`).select('account_id');
    return !!(data && data.length);
}

async function findSentPath(client) {
    const boxes = await client.list();
    const bySpecial = boxes.find((b) => b.specialUse === '\\Sent');
    if (bySpecial) return bySpecial.path;
    const byName = boxes.find((b) => /^(inbox[./])?(sent|sent items|sent messages|sent mail)$/i.test(b.path));
    return byName ? byName.path : null;
}

async function syncFolder({ sb, client, account, folder, path, state, deadline, simpleParser }) {
    const lock = await client.getMailboxLock(path, { readOnly: true });
    let stored = 0, skipped = 0, lastUid = Number(state.last_uid) || 0, failUid = state.fail_uid || null, failCount = state.fail_count || 0;
    let uidValidity = String(client.mailbox && client.mailbox.uidValidity != null ? client.mailbox.uidValidity : '');
    try {
        if (state.uid_validity && uidValidity && state.uid_validity !== uidValidity) {
            lastUid = 0;   // the server renumbered the folder; duplicates are prevented by message id
            failUid = null; failCount = 0;
        }

        let uids;
        if (lastUid > 0) {
            uids = (await client.search({ uid: `${lastUid + 1}:*` }, { uid: true })) || [];
        } else {
            const since = new Date(Date.now() - (account.sync_inbox_days || 30) * 86400000);
            uids = (await client.search({ since }, { uid: true })) || [];
        }
        uids = uids.map(Number).filter((u) => u > lastUid).sort((a, b) => a - b).slice(0, MAIL.BATCH);

        for (let i = 0; i < uids.length; i += MAIL.CHUNK) {
            if (deadline && Date.now() > deadline) break;
            const chunk = uids.slice(i, i + MAIL.CHUNK);

            // sizes first, so one huge message cannot exhaust memory
            const sizes = new Map();
            for await (const m of client.fetch(chunk.join(','), { uid: true, size: true }, { uid: true })) sizes.set(Number(m.uid), m.size || 0);
            const readable = chunk.filter((u) => (sizes.get(u) || 0) <= MAIL.MAX_SOURCE);
            const tooBig = chunk.filter((u) => !readable.includes(u));

            const results = new Map();
            if (readable.length) {
                for await (const m of client.fetch(readable.join(','), { uid: true, source: true, flags: true, internalDate: true }, { uid: true })) {
                    try {
                        const parsed = await simpleParser(m.source);
                        await ingestParsed({ sb, account, folder, uid: Number(m.uid), flags: m.flags, internalDate: m.internalDate, parsed });
                        results.set(Number(m.uid), 'ok');
                    } catch (e) {
                        results.set(Number(m.uid), `error: ${e.message}`);
                    }
                }
            }

            // advance the cursor only over messages that are done (stored, skipped or given up on)
            for (const u of chunk) {
                if (tooBig.includes(u)) { skipped++; lastUid = u; continue; }
                const r = results.get(u);
                if (r === 'ok') { stored++; lastUid = u; if (failUid === u) { failUid = null; failCount = 0; } continue; }
                if (failUid === u) failCount++; else { failUid = u; failCount = 1; }
                if (failCount >= 3) { skipped++; lastUid = u; failUid = null; failCount = 0; continue; }   // give up on a poison message
                throw new Error(`Could not read message ${u}: ${r || 'not returned by the server'} (will retry)`);
            }
        }
    } finally {
        lock.release();
        await sb.from('mail_sync_state').update({
            last_uid: lastUid, uid_validity: uidValidity || state.uid_validity || null, imap_path: path,
            fail_uid: failUid, fail_count: failCount
        }).eq('account_id', account.id).eq('folder', folder);
    }
    return { stored, skipped };
}

export async function syncAccount({ sb, account, budgetMs = 90000 }) {
    const { ImapFlow, simpleParser } = await deps();
    const cfg = envFor(account);
    const status = configStatus(account);
    if (!status.configured) return { ok: false, skipped: true, error: `Not configured: ${status.missing.join(', ')}` };

    const deadline = Date.now() + budgetMs;
    const summary = { ok: true, inbox: null, sent: null };
    const folders = ['inbox', 'sent'];
    const locked = [];
    for (const f of folders) { if (await acquireLock(sb, account.id, f)) locked.push(f); }
    if (!locked.length) return { ok: true, skipped: true, error: 'Another sync is already running' };

    const client = new ImapFlow({
        host: cfg.imapHost, port: cfg.imapPort, secure: cfg.imapPort === 993,
        auth: { user: cfg.user, pass: cfg.pass }, logger: false,
        connectionTimeout: 20000, greetingTimeout: 15000, socketTimeout: 60000
    });
    client.on('error', () => { /* handled by the awaited calls */ });

    let fatal = null;
    try {
        await client.connect();
        for (const folder of locked) {
            const state = await getState(sb, account.id, folder);
            try {
                let path = folder === 'inbox' ? 'INBOX' : (state.imap_path || await findSentPath(client));
                if (!path) { summary[folder] = { stored: 0, note: 'No Sent folder found' }; continue; }
                summary[folder] = await syncFolder({ sb, client, account, folder, path, state, deadline, simpleParser });
                await sb.from('mail_sync_state').update({ last_sync_at: new Date().toISOString(), last_success_at: new Date().toISOString(), last_error: null }).eq('account_id', account.id).eq('folder', folder);
            } catch (e) {
                summary.ok = false;
                summary[folder] = { error: e.message };
                await sb.from('mail_sync_state').update({ last_sync_at: new Date().toISOString(), last_error: String(e.message).slice(0, 500) }).eq('account_id', account.id).eq('folder', folder);
            }
        }
    } catch (e) {
        fatal = e;
        summary.ok = false;
        summary.error = e.message;
        for (const folder of locked) {
            await sb.from('mail_sync_state').update({ last_sync_at: new Date().toISOString(), last_error: `Connection problem: ${String(e.message).slice(0, 400)}` }).eq('account_id', account.id).eq('folder', folder);
        }
    } finally {
        try { await client.logout(); } catch (e) { try { client.close(); } catch (e2) { /* ignore */ } }
        for (const f of locked) await sb.from('mail_sync_state').update({ locked_until: null }).eq('account_id', account.id).eq('folder', f);
    }
    if (fatal) summary.error = fatal.message;
    return summary;
}

export async function syncAllAccounts({ sb, budgetMs = 100000 }) {
    const { data: accounts } = await sb.from('mail_accounts').select('*').eq('is_active', true);
    const start = Date.now();
    const out = [];
    for (const a of accounts || []) {
        const left = budgetMs - (Date.now() - start);
        if (left < 8000) { out.push({ key: a.key, skipped: true, error: 'Out of time, will run next time' }); continue; }
        out.push({ key: a.key, ...(await syncAccount({ sb, account: a, budgetMs: Math.min(left, 60000) })) });
    }
    return out;
}

// ---------------------------------------------------------------
// sending
// ---------------------------------------------------------------
const EMAIL_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/;
const BLOCKED_EXT = /\.(exe|bat|cmd|com|scr|js|jse|vbs|vbe|msi|ps1|jar|dll|lnk|hta)$/i;
export const newMessageId = (account) => `<${crypto.randomUUID()}@${String(account.address).split('@')[1] || 'localhost'}>`;
export const isEmail = (s) => EMAIL_RE.test(String(s || '').trim());

export function validateOutgoing({ to, cc, subject, text, attachments }) {
    const clean = (list) => [...new Set((list || []).map((x) => String(x || '').trim().toLowerCase()).filter(Boolean))];
    const toL = clean(to), ccL = clean(cc);
    if (!toL.length) return { error: 'Add at least one recipient.' };
    if (toL.length + ccL.length > 10) return { error: 'Up to 10 recipients per message.' };
    const bad = [...toL, ...ccL].find((e) => !isEmail(e));
    if (bad) return { error: `"${bad}" is not a valid email address.` };
    const sub = String(subject || '').replace(/[\r\n]+/g, ' ').trim();
    if (!sub) return { error: 'Add a subject.' };
    if (sub.length > 300) return { error: 'Subject is too long.' };
    const body = String(text || '');
    if (!body.trim()) return { error: 'The message is empty.' };
    if (body.length > 50000) return { error: 'The message is too long.' };
    let total = 0;
    const atts = [];
    for (const a of attachments || []) {
        const name = safeName(a.name);
        if (BLOCKED_EXT.test(name)) return { error: `Attachments of that type (${name}) cannot be sent.` };
        const buf = Buffer.from(String(a.data || ''), 'base64');
        total += buf.length;
        if (total > MAIL.MAX_SEND_ATTACHMENTS) return { error: 'Attachments are limited to 3 MB in total.' };
        atts.push({ filename: name, content: buf, contentType: String(a.type || 'application/octet-stream').slice(0, 100) });
    }
    return { to: toL, cc: ccL, subject: sub, text: body, attachments: atts };
}

// Builds the message once, sends exactly those bytes over SMTP, then files the same bytes in the Sent folder.
export async function sendMail({ account, to, cc, subject, text, inReplyTo, references, attachments, messageId: presetId }) {
    const { nodemailer, ImapFlow } = await deps();
    const cfg = envFor(account);
    const status = configStatus(account);
    if (!status.configured) throw new Error(`Mailbox not configured: ${status.missing.join(', ')}`);

    const domain = String(account.address).split('@')[1] || 'localhost';
    const messageId = presetId || `<${crypto.randomUUID()}@${domain}>`;
    const signature = String(account.signature || '').trim();
    const fullText = signature ? `${String(text).replace(/\s+$/, '')}\n\n-- \n${signature}` : String(text);
    const fullHtml = textToHtml(String(text).replace(/\s+$/, '')) + (signature ? `<p style="margin:16px 0 0;color:#475569">${esc(signature).replace(/\n/g, '<br>')}</p>` : '');

    const mailOptions = {
        from: { name: account.display_name || '', address: account.address },
        to, cc: cc && cc.length ? cc : undefined, subject, text: fullText, html: fullHtml, messageId,
        inReplyTo: inReplyTo || undefined,
        references: references && references.length ? references : undefined,
        attachments: attachments && attachments.length ? attachments : undefined
    };

    const builder = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' });
    const built = await builder.sendMail(mailOptions);
    const raw = built.message;

    const smtp = nodemailer.createTransport({
        host: cfg.smtpHost, port: cfg.smtpPort, secure: cfg.smtpPort === 465,
        auth: { user: cfg.user, pass: cfg.pass },
        connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 40000
    });
    await smtp.sendMail({ envelope: { from: account.address, to: [...to, ...(cc || [])] }, raw });

    // best effort: put the same message in the mailbox's own Sent folder so it shows in your normal email app
    let filedInSent = false;
    try {
        const client = new ImapFlow({ host: cfg.imapHost, port: cfg.imapPort, secure: cfg.imapPort === 993, auth: { user: cfg.user, pass: cfg.pass }, logger: false, connectionTimeout: 15000, greetingTimeout: 10000, socketTimeout: 30000 });
        client.on('error', () => {});
        await client.connect();
        try {
            const path = await findSentPath(client);
            if (path) { await client.append(path, raw, ['\\Seen'], new Date()); filedInSent = true; }
        } finally { try { await client.logout(); } catch (e) { try { client.close(); } catch (e2) { /* ignore */ } } }
    } catch (e) {
        console.warn('Could not file the reply in the Sent folder (non-blocking):', e.message);
    }
    return { messageId, filedInSent };
}

// ---------------------------------------------------------------
// retention
// ---------------------------------------------------------------
export async function purgeOld(sb, months = 12) {
    const cutoff = new Date(Date.now() - months * 30.4 * 86400000).toISOString();
    let threads = 0, files = 0;
    for (let round = 0; round < 20; round++) {
        const { data: old } = await sb.from('mail_threads').select('id').lt('last_message_at', cutoff).limit(100);
        if (!old || !old.length) break;
        const ids = old.map((t) => t.id);
        const { data: msgs } = await sb.from('mail_messages').select('attachments').in('thread_id', ids);
        const paths = (msgs || []).flatMap((m) => (m.attachments || []).map((a) => a.path).filter(Boolean));
        for (let i = 0; i < paths.length; i += 100) {
            await sb.storage.from(MAIL.BUCKET).remove(paths.slice(i, i + 100));
            files += Math.min(100, paths.length - i);
        }
        await sb.from('mail_threads').delete().in('id', ids);
        threads += ids.length;
    }
    return { threads, files, cutoff };
}

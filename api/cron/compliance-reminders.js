// api/cron/compliance-reminders.js
//
// NEW (2026-10-13): one daily email to the owner listing anything in Finance & Compliance that needs
// attention: calendar items due within 14 days or overdue, data requests due within 7 days or overdue,
// open breaches whose 72-hour ICO window is running or has passed, and the VAT watch (70% or more).
// Sends nothing when there is nothing to say. The address is set in Admin > Finance & Compliance >
// Compliance Calendar > Settings (finance_settings.owner_email). Reminders only: nothing is filed.

import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

function getTransporter() {
    if (!process.env.VITE_SMTP_HOST && !process.env.SMTP_HOST) throw new Error('SMTP host is not configured.');
    return nodemailer.createTransport({
        host: process.env.VITE_SMTP_HOST || process.env.SMTP_HOST,
        port: parseInt(process.env.VITE_SMTP_PORT || process.env.SMTP_PORT || '465'),
        secure: true,
        auth: { user: process.env.VITE_EMAIL_USER || process.env.SMTP_USER, pass: process.env.VITE_EMAIL_PASS || process.env.SMTP_PASSWORD },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000
    });
}
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const iso = (d) => d.toISOString().slice(0, 10);
const daysFrom = (dateStr, today) => Math.round((new Date(dateStr + 'T00:00:00Z') - new Date(today + 'T00:00:00Z')) / 86400000);

export default async function handler(req, res) {
    // Refuse to run at all if the secret is not set, so "Bearer undefined" can never get in.
    if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'Unauthorized' });
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    try {
        const { data: settingsRows, error: sErr } = await supabase.from('finance_settings').select('key, value');
        if (sErr) return res.status(200).json({ skipped: 'finance tables not set up' });
        const settings = Object.fromEntries((settingsRows || []).map(r => [r.key, r.value]));
        const to = (settings.owner_email || '').trim();
        if (!to || !/^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/.test(to)) return res.status(200).json({ skipped: 'no reminder email set' });

        const now = new Date();
        const today = iso(now);
        const lines = [];

        const { data: items } = await supabase.from('compliance_items').select('title, authority, due_date').eq('status', 'open').not('due_date', 'is', null).lte('due_date', iso(new Date(now.getTime() + 14 * 86400000))).order('due_date');
        (items || []).forEach(i => { const n = daysFrom(i.due_date, today); lines.push(`${n < 0 ? 'OVERDUE' : 'Due soon'}: ${i.title}${i.authority ? ` (${i.authority})` : ''}: ${i.due_date} (${n < 0 ? `${-n} days overdue` : `in ${n} days`})`); });

        const { data: reqs } = await supabase.from('dp_requests').select('request_type, requester_name, requester_email, due_date').in('status', ['open', 'in_progress']).lte('due_date', iso(new Date(now.getTime() + 7 * 86400000)));
        (reqs || []).forEach(r => { const n = daysFrom(r.due_date, today); lines.push(`Data request (${r.request_type}) from ${r.requester_name || r.requester_email || 'unnamed'}: due ${r.due_date} (${n < 0 ? `${-n} days overdue` : `in ${n} days`})`); });

        const { data: breaches } = await supabase.from('dp_breaches').select('description, discovered_at, risk, ico_reported').eq('status', 'open');
        (breaches || []).filter(b => b.risk !== 'low' && !b.ico_reported).forEach(b => {
            const hrs = Math.round((now.getTime() - new Date(b.discovered_at).getTime()) / 3600000);
            lines.push(`Breach not yet reported to the ICO: "${String(b.description).slice(0, 80)}": ${hrs >= 72 ? `${hrs} hours since discovery, the 72-hour window has passed` : `${72 - hrs} hours left of the 72-hour window`}`);
        });

        // VAT watch: rolling 12 months of GBP income less refunds.
        try {
            const from = new Date(now); from.setUTCFullYear(from.getUTCFullYear() - 1);
            const { data: led } = await supabase.from('finance_ledger').select('kind, gross, currency, amount_gbp').in('kind', ['income', 'refund']).gte('entry_date', iso(from)).limit(20000);
            let total = 0;
            (led || []).forEach(r => {
                const g = (r.currency || 'GBP').toUpperCase() === 'GBP' ? Number(r.gross || 0) : (r.amount_gbp != null ? Number(r.amount_gbp) : 0);
                total += r.kind === 'refund' ? -Math.abs(g) : Math.abs(g);
            });
            const threshold = Number(settings.vat_threshold) || 90000;
            const pct = (total / threshold) * 100;
            if (pct >= 70) lines.push(`VAT watch: turnover for the last 12 months is about £${total.toFixed(2)} (${pct.toFixed(0)}% of the £${threshold.toLocaleString('en-GB')} threshold). Speak to your accountant.`);
        } catch (e) { /* optional */ }

        if (lines.length === 0) return res.status(200).json({ sent: false, reason: 'nothing due' });

        const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#111"><h2 style="font-size:16px">ODUSBABA: compliance reminders for ${today}</h2><ul>${lines.map(l => `<li style="margin:6px 0">${esc(l)}</li>`).join('')}</ul><p style="color:#555;font-size:12px">Open Admin > Growth > Finance & Compliance to act on these. This is a reminder only. Always confirm dates on gov.uk.</p></div>`;
        const transporter = getTransporter();
        await transporter.sendMail({
            from: `"ODUSBABA" <${process.env.SMTP_SENDER_EMAIL || process.env.VITE_EMAIL_SENDER || process.env.EMAIL_SENDER_ADDRESS || 'noreply@bluskyeconsult.com'}>`,
            to, subject: `ODUSBABA reminders: ${lines.length} item${lines.length === 1 ? '' : 's'} need attention`, html
        });
        return res.status(200).json({ sent: true, items: lines.length });
    } catch (e) {
        console.error('compliance-reminders error:', e);
        return res.status(500).json({ error: 'Reminder job failed' });
    }
}

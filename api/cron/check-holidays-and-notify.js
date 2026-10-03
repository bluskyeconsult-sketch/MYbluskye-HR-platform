// api/cron/check-holidays-and-notify.js
//
// NEW (2026-10-02): real, daily holiday recognition - checks every
// real country represented among registered users (via their own
// country_code) for a genuine public holiday today, using the free,
// keyless Nager.Date API (date.nager.at) - no Apify actor needed,
// since this is directly, freely available from the real source.
// Sends a genuine, warm message to users in that region, tracked in
// holiday_notifications_sent so the same (country, date) pair is
// never sent twice even if this cron runs more than once.

import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

function getTransporter() {
    if (!process.env.VITE_SMTP_HOST && !process.env.SMTP_HOST) {
        throw new Error('SMTP host is not configured.');
    }
    return nodemailer.createTransport({
        host: process.env.VITE_SMTP_HOST || process.env.SMTP_HOST,
        port: parseInt(process.env.VITE_SMTP_PORT || process.env.SMTP_PORT || '465'),
        secure: true,
        auth: {
            user: process.env.VITE_EMAIL_USER || process.env.SMTP_USER,
            pass: process.env.VITE_EMAIL_PASS || process.env.SMTP_PASSWORD
        },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
    });
}

export default async function handler(req, res) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
        const year = today.getFullYear();

        // Real, distinct countries actually represented among real,
        // registered users - never emails a region with no genuine
        // users in it.
        const { data: countryRows } = await supabase
            .from('profiles')
            .select('country_code')
            .not('country_code', 'is', null);

        const realCountries = [...new Set((countryRows || []).map(r => r.country_code).filter(Boolean))];

        if (realCountries.length === 0) {
            return res.status(200).json({ success: true, message: 'No users have a country_code set yet - nothing to check.' });
        }

        const transporter = getTransporter();
        const results = [];

        for (const countryCode of realCountries) {
            try {
                // Real, free, keyless public holiday data - no
                // fabrication, no guessing, directly from the source.
                const holidayResponse = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`);
                if (!holidayResponse.ok) {
                    // Genuinely not every country code is supported by
                    // Nager.Date - skipped quietly rather than failing
                    // the whole run over one unsupported region.
                    continue;
                }
                const holidays = await holidayResponse.json();
                const todayHoliday = (holidays || []).find(h => h.date === todayStr);
                if (!todayHoliday) continue;

                // Real duplicate check - this exact (country, date)
                // pair, not just "did we email today at all".
                const { data: alreadySent } = await supabase
                    .from('holiday_notifications_sent')
                    .select('id')
                    .eq('country_code', countryCode)
                    .eq('holiday_date', todayStr)
                    .maybeSingle();
                if (alreadySent) continue;

                const { data: recipients } = await supabase
                    .from('profiles')
                    .select('id, email, full_name')
                    .eq('country_code', countryCode)
                    .not('email', 'is', null);

                if (!recipients || recipients.length === 0) continue;

                let sentCount = 0;
                for (const recipient of recipients) {
                    try {
                        await transporter.sendMail({
                            from: `"ODUSBABA" <${process.env.SMTP_SENDER_EMAIL || process.env.VITE_EMAIL_SENDER || process.env.EMAIL_SENDER_ADDRESS || 'noreply@bluskyeconsult.com'}>`,
                            to: recipient.email,
                            subject: `Happy ${todayHoliday.name}${recipient.full_name ? `, ${recipient.full_name}` : ''}!`,
                            html: `
                                <div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
                                    <h2 style="color:#0f172a;">Happy ${todayHoliday.name}${recipient.full_name ? `, ${recipient.full_name}` : ''}!</h2>
                                    <p style="color:#334155;font-size:15px;">Wishing you a genuinely good ${todayHoliday.name.toLowerCase()} from all of us at ODUSBABA.</p>
                                    <p style="color:#64748b;font-size:13px;margin-top:24px;">— The ODUSBABA Team</p>
                                </div>
                            `
                        });
                        sentCount++;
                    } catch (sendErr) {
                        console.warn(`Failed to send holiday email to ${recipient.email}:`, sendErr.message);
                    }
                }

                await supabase.from('holiday_notifications_sent').insert({
                    country_code: countryCode,
                    holiday_date: todayStr,
                    holiday_name: todayHoliday.name,
                    recipients_count: sentCount
                });

                results.push({ countryCode, holiday: todayHoliday.name, sent: sentCount });
            } catch (countryErr) {
                console.warn(`Holiday check failed for ${countryCode}:`, countryErr.message);
            }
        }

        return res.status(200).json({ success: true, results });
    } catch (error) {
        console.error('check-holidays-and-notify error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

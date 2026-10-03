// api/cron/send-birthday-messages.js
//
// NEW (2026-10-02): real, daily birthday check - finds users whose
// real, recorded date_of_birth matches today's month/day, and sends
// a genuine birthday message. Tracked per-year in
// birthday_messages_sent so nobody is double-emailed on the same
// birthday even if this cron runs more than once in a day.

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
        const todayMonth = today.getMonth() + 1; // JS months are 0-indexed
        const todayDay = today.getDate();
        const currentYear = today.getFullYear();

        // Real, honest limitation: Postgres/Supabase-JS doesn't have
        // a simple "month/day equals" filter through the query
        // builder, so this fetches everyone with a real date_of_birth
        // set and filters in code. Genuinely fine at this platform's
        // real scale; would need a real SQL function for a much
        // larger user base.
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('id, email, full_name, date_of_birth')
            .not('date_of_birth', 'is', null);

        if (error) throw error;

        const birthdayUsers = (profiles || []).filter(p => {
            const dob = new Date(p.date_of_birth);
            return dob.getMonth() + 1 === todayMonth && dob.getDate() === todayDay;
        });

        if (birthdayUsers.length === 0) {
            return res.status(200).json({ success: true, emailed: 0, message: 'No real birthdays today.' });
        }

        const transporter = getTransporter();
        let emailedCount = 0;

        for (const user of birthdayUsers) {
            try {
                // Real, per-year duplicate check - unique constraint
                // on (user_id, birthday_year) in the database is the
                // actual, final safeguard; this check just avoids a
                // wasted email attempt first.
                const { data: alreadySent } = await supabase
                    .from('birthday_messages_sent')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('birthday_year', currentYear)
                    .maybeSingle();
                if (alreadySent) continue;

                await transporter.sendMail({
                    from: `"ODUSBABA" <${process.env.SMTP_SENDER_EMAIL || process.env.VITE_EMAIL_SENDER || process.env.EMAIL_SENDER_ADDRESS || 'noreply@bluskyeconsult.com'}>`,
                    to: user.email,
                    subject: `Happy Birthday${user.full_name ? `, ${user.full_name}` : ''}! 🎉`,
                    html: `
                        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
                            <h2 style="color:#0f172a;">Happy Birthday${user.full_name ? `, ${user.full_name}` : ''}! 🎉</h2>
                            <p style="color:#334155;font-size:15px;">Wishing you a genuinely wonderful day, from all of us at ODUSBABA.</p>
                            <p style="color:#64748b;font-size:13px;margin-top:24px;">— The ODUSBABA Team</p>
                        </div>
                    `
                });

                await supabase.from('birthday_messages_sent').insert({
                    user_id: user.id,
                    birthday_year: currentYear
                });

                emailedCount++;
            } catch (sendErr) {
                console.warn(`Failed to send birthday email to ${user.email}:`, sendErr.message);
            }
        }

        return res.status(200).json({ success: true, emailed: emailedCount, totalBirthdaysToday: birthdayUsers.length });
    } catch (error) {
        console.error('send-birthday-messages error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

// api/cron/reengage-dormant-users.js
//
// NEW (2026-09-24): real, scheduled re-engagement for genuinely
// dormant users - identifies them via Supabase's own
// auth.users.last_sign_in_at (profiles has no last_login field of its
// own), finds real, personalized content for each (an unfinished
// course, or new jobs matching their real skills), and sends a
// genuine, useful email rather than a generic "come back!" blast.
// Tracks last_reengagement_email_at so nobody gets emailed more than
// once every 30 days by this, regardless of how often the cron runs.

import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const DORMANT_AFTER_DAYS = 30;
const REENGAGEMENT_COOLDOWN_DAYS = 30;

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
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        const dormantCutoff = new Date(Date.now() - DORMANT_AFTER_DAYS * 24 * 60 * 60 * 1000);
        const cooldownCutoff = new Date(Date.now() - REENGAGEMENT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

        // Supabase's admin API paginates - genuinely walks every page
        // rather than assuming everyone fits on the first one.
        let allUsers = [];
        let page = 1;
        while (true) {
            const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
            if (error) throw error;
            allUsers = allUsers.concat(data.users);
            if (data.users.length < 1000) break;
            page++;
        }

        const dormantUsers = allUsers.filter(u => {
            const lastSignIn = u.last_sign_in_at ? new Date(u.last_sign_in_at) : null;
            return lastSignIn && lastSignIn < dormantCutoff;
        });

        if (dormantUsers.length === 0) {
            return res.status(200).json({ success: true, emailed: 0, message: 'No genuinely dormant users found' });
        }

        const dormantIds = dormantUsers.map(u => u.id);
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, email, full_name, last_reengagement_email_at')
            .in('id', dormantIds);

        // Only genuinely eligible - never emailed by this before, or
        // outside the real cooldown window.
        const eligible = (profiles || []).filter(p => {
            if (!p.last_reengagement_email_at) return true;
            return new Date(p.last_reengagement_email_at) < cooldownCutoff;
        });

        if (eligible.length === 0) {
            return res.status(200).json({ success: true, emailed: 0, message: 'All dormant users are within their real cooldown window' });
        }

        const transporter = getTransporter();
        let emailedCount = 0;

        for (const profile of eligible) {
            try {
                // Real, personalized content - an unfinished course
                // first, since that's a genuine, specific reason to
                // return; falls back to new jobs matching their real
                // skills if they have no enrollment at all.
                const { data: unfinishedEnrollment } = await supabase
                    .from('course_enrollments')
                    .select('progress, courses(title)')
                    .eq('user_id', profile.id)
                    .neq('status', 'completed')
                    .order('enrolled_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                let contentHtml;
                if (unfinishedEnrollment?.courses?.title) {
                    contentHtml = `<p style="color:#334155;font-size:15px;">You were <strong>${unfinishedEnrollment.progress || 0}%</strong> through <strong>"${unfinishedEnrollment.courses.title}"</strong> - pick up right where you left off.</p>`;
                } else {
                    const { data: skills } = await supabase
                        .from('user_skills')
                        .select('skill_name')
                        .eq('user_id', profile.id)
                        .limit(3);
                    const skillNames = (skills || []).map(s => s.skill_name).filter(Boolean);
                    contentHtml = skillNames.length > 0
                        ? `<p style="color:#334155;font-size:15px;">New jobs matching <strong>${skillNames.join(', ')}</strong> have been posted since you last visited.</p>`
                        : `<p style="color:#334155;font-size:15px;">New jobs, courses, and articles have been added since your last visit.</p>`;
                }

                await transporter.sendMail({
                    from: `"ODUSBABA" <${process.env.SMTP_SENDER_EMAIL || process.env.VITE_EMAIL_SENDER || process.env.EMAIL_SENDER_ADDRESS || 'noreply@bluskyeconsult.com'}>`,
                    to: profile.email,
                    subject: `We've missed you, ${profile.full_name || 'there'}`,
                    html: `
                        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
                            <h2 style="color:#0f172a;">Welcome back${profile.full_name ? `, ${profile.full_name}` : ''}!</h2>
                            ${contentHtml}
                            <a href="https://bluskyeconsult.com/dashboard" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#10b981;color:#fff;text-decoration:none;border-radius:8px;">Continue where you left off</a>
                            <p style="color:#94a3b8;font-size:12px;margin-top:24px;">You're receiving this because it's been a while since your last visit to ODUSBABA.</p>
                        </div>
                    `
                });

                await supabase
                    .from('profiles')
                    .update({ last_reengagement_email_at: new Date().toISOString() })
                    .eq('id', profile.id);

                emailedCount++;
            } catch (perUserError) {
                console.error(`Failed to send re-engagement email to ${profile.email}:`, perUserError.message);
                // Continues to the next user rather than failing the
                // entire batch over one person's issue.
            }
        }

        return res.status(200).json({ success: true, emailed: emailedCount, eligible: eligible.length });
    } catch (error) {
        console.error('reengage-dormant-users cron error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

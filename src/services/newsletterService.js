// src/services/newsletterService.js
// Complete Newsletter System - Scheduling, segmentation, routing, analytics

import { supabase } from '../lib/supabase';
import { sendEmail } from './emailService';

// ============================================
// SUBSCRIBER MANAGEMENT
// ============================================

export async function subscribeToNewsletter(email, name = null, source = 'website', segments = ['general']) {
    // Check if already subscribed
    const { data: existing } = await supabase
        .from('newsletter_subscribers')
        .select('id')
        .eq('email', email)
        .single();

    if (existing) {
        // Reactivate if unsubscribed
        await supabase
            .from('newsletter_subscribers')
            .update({ 
                status: 'active', 
                unsubscribed_at: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
        return { success: true, message: 'Already subscribed' };
    }

    const { data, error } = await supabase
        .from('newsletter_subscribers')
        .insert({
            email: email,
            name: name,
            source: source,
            segments: segments,
            status: 'active',
            subscribed_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) throw error;

    // Send welcome email
    await sendWelcomeNewsletterEmail(email, name);

    return { success: true, subscriberId: data.id };
}

export async function unsubscribeFromNewsletter(email, reason = null) {
    const { error } = await supabase
        .from('newsletter_subscribers')
        .update({
            status: 'unsubscribed',
            unsubscribed_at: new Date().toISOString(),
            unsubscribe_reason: reason
        })
        .eq('email', email);

    if (error) throw error;
    return { success: true };
}

// ============================================
// NEWSLETTER CREATION & SCHEDULING
// ============================================

export async function createNewsletter(data) {
    const { error } = await supabase
        .from('newsletters')
        .insert({
            title: data.title,
            subject: data.subject,
            content: data.content,
            content_html: data.content_html,
            segments: data.segments || ['general'],
            scheduled_for: data.scheduled_for || null,
            status: data.scheduled_for ? 'scheduled' : 'draft',
            created_by: data.created_by,
            created_at: new Date().toISOString()
        });

    if (error) throw error;
    return { success: true };
}

export async function scheduleNewsletter(newsletterId, scheduledDateTime) {
    const { error } = await supabase
        .from('newsletters')
        .update({
            scheduled_for: scheduledDateTime,
            status: 'scheduled'
        })
        .eq('id', newsletterId);

    if (error) throw error;
    return { success: true };
}

// ============================================
// NEWSLETTER DISPATCH (Send to Subscribers)
// ============================================

export async function dispatchNewsletter(newsletterId, testMode = false, testEmail = null) {
    // Get newsletter details
    const { data: newsletter, error: nError } = await supabase
        .from('newsletters')
        .select('*')
        .eq('id', newsletterId)
        .single();

    if (nError) throw nError;

    // Get subscribers based on segments
    let query = supabase
        .from('newsletter_subscribers')
        .select('email, name')
        .eq('status', 'active');

    if (newsletter.segments && newsletter.segments.length > 0 && !newsletter.segments.includes('general')) {
        query = query.overlaps('segments', newsletter.segments);
    }

    const { data: subscribers, error: sError } = await query;

    if (sError) throw sError;

    if (testMode && testEmail) {
        // Send test email
        await sendNewsletterEmail(testEmail, newsletter.subject, newsletter.content_html);
        return { success: true, testSent: true };
    }

    // Batch send to subscribers
    const batchSize = 50;
    const results = { sent: 0, failed: 0, total: subscribers.length };

    for (let i = 0; i < subscribers.length; i += batchSize) {
        const batch = subscribers.slice(i, i + batchSize);
        
        for (const subscriber of batch) {
            try {
                await sendNewsletterEmail(subscriber.email, newsletter.subject, newsletter.content_html, subscriber.name);
                results.sent++;
                
                // Log send
                await supabase
                    .from('newsletter_sends')
                    .insert({
                        newsletter_id: newsletterId,
                        subscriber_id: subscriber.id,
                        sent_at: new Date().toISOString(),
                        status: 'sent'
                    });
            } catch (error) {
                results.failed++;
                console.error(`Failed to send to ${subscriber.email}:`, error);
            }
            
            // Rate limiting delay
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Delay between batches
        if (i + batchSize < subscribers.length) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    // Update newsletter status
    await supabase
        .from('newsletters')
        .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            recipient_count: subscribers.length
        })
        .eq('id', newsletterId);

    return results;
}

// ============================================
// NEWSLETTER EMAIL SENDING
// ============================================

async function sendNewsletterEmail(to, subject, htmlContent, subscriberName = null) {
    const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subject}</title>
            <style>
                body { font-family: Arial, sans-serif; background-color: #020617; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; overflow: hidden; }
                .header { background: linear-gradient(135deg, #0B3C5D, #1a6d8a); padding: 30px; text-align: center; }
                .content { padding: 30px; color: #94a3b8; line-height: 1.6; }
                .footer { background-color: #0a0f1c; padding: 20px; text-align: center; font-size: 12px; color: #475569; }
                .button { display: inline-block; background-color: #0ea5e9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; }
                h1, h2 { color: #ffffff; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📧 ${subject}</h1>
                    <p style="color: #cbd5e1;">From BluSkye Integrated Consult</p>
                </div>
                <div class="content">
                    ${subscriberName ? `<p>Hello ${subscriberName},</p>` : ''}
                    ${htmlContent}
                </div>
                <div class="footer">
                    <p>© ${new Date().getFullYear()} BluSkye Integrated Consult. All rights reserved.</p>
                    <p><a href="https://www.bluskyeconsult.com/unsubscribe?email=${encodeURIComponent(to)}" style="color: #0ea5e9;">Unsubscribe</a> | 
                       <a href="https://www.bluskyeconsult.com/privacy" style="color: #0ea5e9;">Privacy Policy</a></p>
                </div>
            </div>
        </body>
        </html>
    `;

    return sendEmail(to, subject, emailHtml, 'newsletter');
}

async function sendWelcomeNewsletterEmail(to, name) {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 30px;">
            <h1 style="color: #0ea5e9;">Welcome to ODUSBABA Newsletter! 🎉</h1>
            <p style="color: #94a3b8;">Hello ${name || 'there'},</p>
            <p style="color: #94a3b8;">Thank you for subscribing to the ODUSBABA newsletter. You'll receive weekly insights on:</p>
            <ul style="color: #94a3b8;">
                <li>Latest job opportunities</li>
                <li>Career development tips</li>
                <li>Industry trends and news</li>
                <li>New courses and assessments</li>
            </ul>
            <p style="color: #94a3b8;">We're excited to have you on board!</p>
            <a href="https://www.bluskyeconsult.com" class="button" style="display: inline-block; background-color: #0ea5e9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Visit ODUSBABA</a>
        </div>
    `;

    return sendEmail(to, 'Welcome to ODUSBABA Newsletter!', html, 'newsletter_welcome');
}

// ============================================
// NEWSLETTER ANALYTICS
// ============================================

export async function getNewsletterAnalytics(newsletterId) {
    const { data: sends, error } = await supabase
        .from('newsletter_sends')
        .select('*')
        .eq('newsletter_id', newsletterId);

    if (error) throw error;

    const totalSent = sends.length;
    const opens = sends.filter(s => s.opened_at).length;
    const clicks = sends.filter(s => s.clicked_at).length;
    const bounces = sends.filter(s => s.status === 'bounced').length;

    return {
        total_sent: totalSent,
        open_rate: totalSent > 0 ? Math.round((opens / totalSent) * 100) : 0,
        click_rate: totalSent > 0 ? Math.round((clicks / totalSent) * 100) : 0,
        bounce_rate: totalSent > 0 ? Math.round((bounces / totalSent) * 100) : 0,
        unique_opens: opens,
        unique_clicks: clicks
    };
}

// ============================================
// SEGMENT MANAGEMENT
// ============================================

export async function createSegment(name, criteria) {
    const { data, error } = await supabase
        .from('newsletter_segments')
        .insert({
            name: name,
            criteria: criteria,
            created_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) throw error;
    return { success: true, segmentId: data.id };
}

export async function getSubscribersBySegment(segmentId) {
    const { data: segment } = await supabase
        .from('newsletter_segments')
        .select('criteria')
        .eq('id', segmentId)
        .single();

    if (!segment) return [];

    let query = supabase
        .from('newsletter_subscribers')
        .select('*')
        .eq('status', 'active');

    // Apply segment criteria
    if (segment.criteria.source) {
        query = query.eq('source', segment.criteria.source);
    }
    if (segment.criteria.segments) {
        query = query.overlaps('segments', segment.criteria.segments);
    }

    const { data } = await query;
    return data || [];
}

// ============================================
// SCHEDULED NEWSLETTER CRON JOB
// ============================================

export async function processScheduledNewsletters() {
    const { data: newsletters, error } = await supabase
        .from('newsletters')
        .select('*')
        .eq('status', 'scheduled')
        .lte('scheduled_for', new Date().toISOString());

    if (error) throw error;

    const results = [];
    for (const newsletter of newsletters) {
        const result = await dispatchNewsletter(newsletter.id);
        results.push({ newsletterId: newsletter.id, ...result });
    }

    return results;
}

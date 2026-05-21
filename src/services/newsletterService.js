// src/services/newsletterService.js
// COMPLETE NEWSLETTER SYSTEM - Subscriber management, scheduling, segmentation, analytics, and content notifications

import { supabase } from '../lib/supabase';
import { sendEmail } from './emailService';

// ============================================
// SUBSCRIBER MANAGEMENT
// ============================================

export async function subscribeToNewsletter(email, name = null, source = 'website', segments = ['general']) {
    // Check if already subscribed
    const { data: existing } = await supabase
        .from('newsletter_subscribers')
        .select('id, status')
        .eq('email', email)
        .maybeSingle();

    if (existing) {
        if (existing.status === 'active') {
            return { success: true, message: 'Already subscribed' };
        }
        // Reactivate if unsubscribed
        await supabase
            .from('newsletter_subscribers')
            .update({ 
                status: 'active', 
                unsubscribed_at: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
        return { success: true, message: 'Re-subscribed successfully' };
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

export async function getSubscribers(filters = {}) {
    let query = supabase
        .from('newsletter_subscribers')
        .select('*')
        .order('subscribed_at', { ascending: false });

    if (filters.status) {
        query = query.eq('status', filters.status);
    }
    if (filters.segment) {
        query = query.contains('segments', [filters.segment]);
    }
    if (filters.source) {
        query = query.eq('source', filters.source);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

export async function getSubscriberCount() {
    const { count, error } = await supabase
        .from('newsletter_subscribers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
    
    if (error) throw error;
    return count || 0;
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

export async function updateNewsletter(newsletterId, updates) {
    const { error } = await supabase
        .from('newsletters')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('id', newsletterId);

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

export async function cancelScheduledNewsletter(newsletterId) {
    const { error } = await supabase
        .from('newsletters')
        .update({
            status: 'draft',
            scheduled_for: null
        })
        .eq('id', newsletterId);

    if (error) throw error;
    return { success: true };
}

export async function getScheduledNewsletters() {
    const { data, error } = await supabase
        .from('newsletters')
        .select('*')
        .eq('status', 'scheduled')
        .gte('scheduled_for', new Date().toISOString())
        .order('scheduled_for', { ascending: true });

    if (error) throw error;
    return data || [];
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
        .select('email, name, id')
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

    if (!subscribers || subscribers.length === 0) {
        return { success: false, message: 'No subscribers found for the selected segments' };
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
                
                await supabase
                    .from('newsletter_sends')
                    .insert({
                        newsletter_id: newsletterId,
                        subscriber_id: subscriber.id,
                        status: 'failed',
                        error_message: error.message
                    });
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
                body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #020617; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; overflow: hidden; }
                .header { background: linear-gradient(135deg, #0B3C5D, #1a6d8a); padding: 30px; text-align: center; }
                .content { padding: 30px; color: #94a3b8; line-height: 1.6; }
                .footer { background-color: #0a0f1c; padding: 20px; text-align: center; font-size: 12px; color: #475569; }
                .button { display: inline-block; background-color: #0ea5e9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; }
                .button:hover { background-color: #0284c7; }
                h1, h2 { color: #ffffff; }
                .badge { display: inline-block; background-color: #10b981; color: white; font-size: 12px; padding: 4px 8px; border-radius: 4px; margin-right: 8px; }
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
                    <p>
                        <a href="https://www.bluskyeconsult.com/unsubscribe?email=${encodeURIComponent(to)}" style="color: #0ea5e9;">Unsubscribe</a> | 
                        <a href="https://www.bluskyeconsult.com/legal/privacy" style="color: #0ea5e9;">Privacy Policy</a>
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;

    return sendEmail(to, subject, emailHtml, 'newsletter');
}

async function sendWelcomeNewsletterEmail(to, name) {
    const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 30px;">
            <div style="text-align: center;">
                <div style="font-size: 48px;">🎉</div>
                <h1 style="color: #0ea5e9;">Welcome to ODUSBABA Newsletter!</h1>
            </div>
            <p style="color: #94a3b8;">Hello ${name || 'there'},</p>
            <p style="color: #94a3b8;">Thank you for subscribing to the ODUSBABA newsletter. You'll receive weekly insights on:</p>
            <ul style="color: #94a3b8;">
                <li>📋 Latest job opportunities</li>
                <li>📈 Career development tips</li>
                <li>🤖 Industry trends and news</li>
                <li>🎓 New courses and assessments</li>
                <li>💼 Virtual assistant updates</li>
            </ul>
            <p style="color: #94a3b8;">We're excited to have you on board!</p>
            <div style="text-align: center; margin-top: 24px;">
                <a href="https://www.bluskyeconsult.com" style="display: inline-block; background-color: #0ea5e9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Visit ODUSBABA →</a>
            </div>
            <hr style="border-color: #1e293b; margin: 20px 0;">
            <p style="color: #475569; font-size: 12px; text-align: center;">BluSkye Integrated Consult - Creating Value for Partnership</p>
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
        unique_clicks: clicks,
        total_subscribers: await getSubscriberCount()
    };
}

export async function trackNewsletterOpen(sendId) {
    await supabase
        .from('newsletter_sends')
        .update({ opened_at: new Date().toISOString() })
        .eq('id', sendId);
}

export async function trackNewsletterClick(sendId, linkUrl) {
    await supabase
        .from('newsletter_sends')
        .update({ 
            clicked_at: new Date().toISOString(),
            clicked_url: linkUrl
        })
        .eq('id', sendId);
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

export async function getSegments() {
    const { data, error } = await supabase
        .from('newsletter_segments')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
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
// CONTENT NOTIFICATIONS (Courses, Assessments, VAs, Articles)
// ============================================

export async function notifyNewCourse(courseId, courseTitle, courseDescription, courseSlug) {
    const { data: subscribers } = await supabase
        .from('newsletter_subscribers')
        .select('email, name')
        .eq('status', 'active')
        .contains('segments', ['courses', 'general']);

    if (!subscribers || subscribers.length === 0) return;

    const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif;">
            <div style="text-align: center;">
                <span class="badge" style="display: inline-block; background-color: #10b981; color: white; font-size: 12px; padding: 4px 8px; border-radius: 4px;">🎓 New Course</span>
            </div>
            <h2 style="color: #10b981; margin-top: 16px;">${courseTitle}</h2>
            <p>${courseDescription}</p>
            <div style="background-color: #1e293b; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="color: #94a3b8; margin: 0;">✨ Learn at your own pace</p>
                <p style="color: #94a3b8; margin: 8px 0 0;">📚 Expert-led content</p>
            </div>
            <div style="text-align: center; margin-top: 24px;">
                <a href="https://www.bluskyeconsult.com/courses/${courseSlug || courseId}" class="button" style="display: inline-block; background-color: #0ea5e9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Enroll Now →</a>
            </div>
        </div>
    `;

    for (const subscriber of subscribers) {
        await sendNewsletterEmail(subscriber.email, `🎓 New Course: ${courseTitle}`, html, subscriber.name);
    }
}

export async function notifyNewAssessment(assessmentId, assessmentTitle, assessmentDescription) {
    const { data: subscribers } = await supabase
        .from('newsletter_subscribers')
        .select('email, name')
        .eq('status', 'active')
        .contains('segments', ['assessments', 'general']);

    if (!subscribers || subscribers.length === 0) return;

    const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif;">
            <div style="text-align: center;">
                <span class="badge" style="display: inline-block; background-color: #8b5cf6; color: white; font-size: 12px; padding: 4px 8px; border-radius: 4px;">📊 New Assessment</span>
            </div>
            <h2 style="color: #8b5cf6; margin-top: 16px;">${assessmentTitle}</h2>
            <p>${assessmentDescription || 'Discover your strengths and identify growth opportunities with our comprehensive assessment.'}</p>
            <div style="background-color: #1e293b; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="color: #94a3b8; margin: 0;">🎯 Personalized insights</p>
                <p style="color: #94a3b8; margin: 8px 0 0;">📈 Career development recommendations</p>
            </div>
            <div style="text-align: center; margin-top: 24px;">
                <a href="https://www.bluskyeconsult.com/assessments/${assessmentId}" class="button" style="display: inline-block; background-color: #0ea5e9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Take Assessment →</a>
            </div>
        </div>
    `;

    for (const subscriber of subscribers) {
        await sendNewsletterEmail(subscriber.email, `📊 New Assessment: ${assessmentTitle}`, html, subscriber.name);
    }
}

export async function notifyNewVA(vaName, vaDescription, vaPrice, vaCategory) {
    const { data: subscribers } = await supabase
        .from('newsletter_subscribers')
        .select('email, name')
        .eq('status', 'active')
        .contains('segments', ['virtual_assistants', 'general']);

    if (!subscribers || subscribers.length === 0) return;

    const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif;">
            <div style="text-align: center;">
                <span class="badge" style="display: inline-block; background-color: #f59e0b; color: white; font-size: 12px; padding: 4px 8px; border-radius: 4px;">🤖 New Virtual Assistant</span>
            </div>
            <h2 style="color: #f59e0b; margin-top: 16px;">${vaName}</h2>
            <p>${vaDescription}</p>
            <div style="background-color: #1e293b; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="color: #94a3b8; margin: 0;">💰 Price: $${vaPrice} per task</p>
                <p style="color: #94a3b8; margin: 8px 0 0;">📂 Category: ${vaCategory}</p>
            </div>
            <div style="text-align: center; margin-top: 24px;">
                <a href="https://www.bluskyeconsult.com/hire-va" class="button" style="display: inline-block; background-color: #0ea5e9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Hire Now →</a>
            </div>
        </div>
    `;

    for (const subscriber of subscribers) {
        await sendNewsletterEmail(subscriber.email, `🤖 New Virtual Assistant: ${vaName}`, html, subscriber.name);
    }
}

export async function notifyNewArticle(articleTitle, articleExcerpt, articleSlug) {
    const { data: subscribers } = await supabase
        .from('newsletter_subscribers')
        .select('email, name')
        .eq('status', 'active')
        .contains('segments', ['articles', 'general']);

    if (!subscribers || subscribers.length === 0) return;

    const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif;">
            <div style="text-align: center;">
                <span class="badge" style="display: inline-block; background-color: #06b6d4; color: white; font-size: 12px; padding: 4px 8px; border-radius: 4px;">📰 New Article</span>
            </div>
            <h2 style="color: #06b6d4; margin-top: 16px;">${articleTitle}</h2>
            <p>${articleExcerpt}</p>
            <div style="background-color: #1e293b; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="color: #94a3b8; margin: 0;">📖 Read time: 5-7 minutes</p>
                <p style="color: #94a3b8; margin: 8px 0 0;">💡 Actionable insights</p>
            </div>
            <div style="text-align: center; margin-top: 24px;">
                <a href="https://www.bluskyeconsult.com/articles/${articleSlug}" class="button" style="display: inline-block; background-color: #0ea5e9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Read Article →</a>
            </div>
        </div>
    `;

    for (const subscriber of subscribers) {
        await sendNewsletterEmail(subscriber.email, `📰 New Article: ${articleTitle}`, html, subscriber.name);
    }
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
        try {
            const result = await dispatchNewsletter(newsletter.id);
            results.push({ newsletterId: newsletter.id, ...result });
        } catch (error) {
            console.error(`Failed to dispatch newsletter ${newsletter.id}:`, error);
            results.push({ newsletterId: newsletter.id, error: error.message });
        }
    }

    return results;
}

// ============================================
// NEWSLETTER DASHBOARD STATS
// ============================================

export async function getNewsletterDashboardStats() {
    const [subscriberCount, sentCount, scheduledCount, recentCampaigns] = await Promise.all([
        getSubscriberCount(),
        supabase.from('newsletters').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
        supabase.from('newsletters').select('*', { count: 'exact', head: true }).eq('status', 'scheduled'),
        supabase.from('newsletters').select('*').order('created_at', { ascending: false }).limit(5)
    ]);

    return {
        total_subscribers: subscriberCount,
        total_campaigns_sent: sentCount.count || 0,
        scheduled_campaigns: scheduledCount.count || 0,
        recent_campaigns: recentCampaigns.data || [],
        average_open_rate: 0, // Calculate from analytics
        average_click_rate: 0
    };
}

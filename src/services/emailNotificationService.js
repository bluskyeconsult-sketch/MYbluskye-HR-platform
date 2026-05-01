import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Send email via SMTP (requires SMTP configured in Vercel)
export async function sendEmail(to, subject, htmlContent) {
    try {
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to, subject, html: htmlContent })
        });
        return response.ok;
    } catch (error) {
        console.error('Email error:', error);
        return false;
    }
}

// Send new article notification to subscribers
export async function sendNewArticleNotification(article) {
    // Get all active subscribers
    const { data: subscribers } = await supabase
        .from('newsletter_subscribers')
        .select('email')
        .eq('is_active', true);
    
    if (!subscribers || subscribers.length === 0) return { sent: 0 };
    
    const subject = `📢 New Article: ${article.title}`;
    const articleUrl = `https://www.bluskyeconsult.com/articles/${article.slug}`;
    
    let sentCount = 0;
    
    for (const subscriber of subscribers) {
        const html = `
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"></head>
            <body style="font-family: Arial, sans-serif; background-color: #020617; color: #ffffff; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 24px;">
                    <h1 style="color: #10b981;">ODUSBABA</h1>
                    <h2 style="color: #ffffff;">${article.title}</h2>
                    <p style="color: #94a3b8;">${article.excerpt}</p>
                    <a href="${articleUrl}" style="display: inline-block; background-color: #0B3C5D; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">Read Article</a>
                    <hr style="border-color: #1e293b; margin: 20px 0;">
                    <p style="color: #475569; font-size: 12px;">You received this email because you subscribed to ODUSBABA updates. <a href="https://www.bluskyeconsult.com/unsubscribe" style="color: #10b981;">Unsubscribe</a></p>
                </div>
            </body>
            </html>
        `;
        
        const success = await sendEmail(subscriber.email, subject, html);
        if (success) sentCount++;
        
        // Add to queue log
        await supabase.from('email_notifications').insert({
            recipient_email: subscriber.email,
            subject: subject,
            content: html,
            status: success ? 'sent' : 'failed'
        });
    }
    
    // Mark article notification as sent
    await supabase.from('articles').update({ notification_sent_at: new Date().toISOString() }).eq('id', article.id);
    
    return { sent: sentCount, total: subscribers.length };
}

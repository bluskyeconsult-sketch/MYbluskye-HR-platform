// src/services/aiArticleService.js
// AI Article Builder Service
//
// FIXED (2026-08-23) — two severe, confirmed issues:
//
// 1. generateArticle() called api.openai.com directly from this client-side
//    service, using import.meta.env.VITE_OPENAI_API_KEY — a VITE_-prefixed
//    variable, meaning it's bundled directly into the shipped JS and fully
//    visible to anyone who opens dev tools. This exposed the real OpenAI
//    key to every visitor AND completely bypassed the credit/rate-limiting
//    system built this session — anyone who could call this function
//    triggered a real, billed OpenAI request for free, with the platform's
//    own key. Same severity class as the earlier hardcoded tester
//    invite-code vulnerability. Rewired to the real, already-correct
//    pattern used successfully in ArticleEditor.jsx/ArticleDetail.jsx:
//    the metered ?action=chat backend action, with a real userId so
//    credits are checked and attributed correctly.
//
// 2. saveArticle()/publishArticle() wrote/read a `status` string column
//    ('draft'/'published') — but the real, confirmed articles table uses
//    `is_published` (boolean), per ArticleEditor.jsx and ArticleDetail.jsx,
//    both independently confirmed this session. Every article saved
//    through this service would have `is_published` sitting at its
//    default (false) forever, regardless of what this code intended —
//    meaning any article created here could never actually appear on the
//    real, live ArticlesPage.jsx/ArticleDetail.jsx, which correctly filter
//    on is_published. Fixed to match the real column.
//
// 3. publishArticle()'s newsletter-send imported sendEmail from
//    './emailService' — a file never confirmed to exist or work anywhere
//    in this project, and not the same pattern already confirmed correct
//    elsewhere (?action=email, used successfully in NewsletterAdmin.jsx
//    and ArticleDetail.jsx's own newsletter send). Rewired to call that
//    same real action directly, removing the dependency on an unconfirmed
//    file entirely.

import { supabase } from '../lib/supabase';

const API_BASE = '/api/index';

export async function generateArticle(topic, tone = 'professional', length = 'medium', userId = null) {
    const systemPrompt = `You are an expert content writer for a career and HR platform. Write a ${tone} article for the ODUSBABA platform.

Target audience: HR professionals, job seekers, and employers.
Length: ${length === 'short' ? '300-400' : length === 'medium' ? '500-700' : '800-1000'} words.

Include:
- An engaging title
- Introduction that hooks the reader
- 3-4 main sections with subheadings
- Practical examples or actionable tips
- A conclusion with a call-to-action

Format as HTML with proper heading tags (h1, h2, h3), paragraphs, and bullet points where appropriate.`;

    try {
        // FIXED (2026-08-23): no longer calls OpenAI directly with a
        // client-exposed key — goes through the real, metered backend
        // action instead, matching ArticleEditor.jsx/ArticleDetail.jsx.
        const response = await fetch(`${API_BASE}?action=chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: `Write an article about: "${topic}"`,
                systemPrompt,
                history: [],
                temperature: 0.7,
                maxTokens: length === 'short' ? 1000 : length === 'medium' ? 1500 : 2000,
                userId
            })
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Article generation failed');
        }

        const content = data.response;

        // Extract title from content
        const titleMatch = content.match(/<h1>(.*?)<\/h1>/i);
        const title = titleMatch ? titleMatch[1] : topic;

        return {
            success: true,
            title: title,
            content: content,
            topic: topic
        };
    } catch (error) {
        console.error('Article generation error:', error);
        return { success: false, error: error.message };
    }
}

export async function saveArticle(articleData, userId) {
    const slug = articleData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 90);
    
    const { data, error } = await supabase
        .from('articles')
        .insert({
            title: articleData.title,
            slug: slug,
            content: articleData.content,
            excerpt: articleData.content.replace(/<[^>]*>/g, '').substring(0, 160),
            // FIXED (2026-08-23): is_published boolean, not a status
            // string — matches the real, confirmed schema.
            is_published: false,
            author_id: userId,
            category: articleData.category || 'General',
            created_at: new Date().toISOString()
        })
        .select()
        .single();
    
    if (error) throw error;
    return { success: true, articleId: data.id, slug: slug };
}

export async function publishArticle(articleId, sendNewsletter = false) {
    // FIXED (2026-08-23): is_published boolean, not a status string.
    await supabase
        .from('articles')
        .update({ 
            is_published: true, 
            published_at: new Date().toISOString() 
        })
        .eq('id', articleId);
    
    // Get article details for newsletter
    const { data: article } = await supabase
        .from('articles')
        .select('*')
        .eq('id', articleId)
        .single();
    
    if (sendNewsletter && article) {
        // FIXED (2026-08-23): sends via the real, confirmed ?action=email
        // backend action directly — no longer depends on an unconfirmed
        // ./emailService module, matching the same real pattern already
        // used successfully in NewsletterAdmin.jsx and ArticleDetail.jsx.
        const { data: subscribers } = await supabase
            .from('newsletter_subscribers')
            .select('email, name')
            .eq('status', 'active');
        
        for (const subscriber of subscribers || []) {
            try {
                await fetch(`${API_BASE}?action=email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: subscriber.email,
                        subject: `New Article: ${article.title}`,
                        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 24px;">
                            <h1 style="color: #10b981;">New Article from ODUSBABA</h1>
                            <h2>${article.title}</h2>
                            <div style="color: #94a3b8;">${article.excerpt}</div>
                            <a href="https://www.bluskyeconsult.com/articles/${article.slug}" style="display: inline-block; background-color: #0ea5e9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">Read Full Article →</a>
                            <hr style="border-color: #1e293b; margin: 20px 0;">
                            <p style="color: #475569; font-size: 12px;">BluSkye Integrated Consult - Creating Value for Partnership</p>
                        </div>`
                    })
                });
            } catch (sendErr) {
                console.warn('Failed to send newsletter to', subscriber.email, sendErr);
            }
        }
    }
    
    return { success: true };
}

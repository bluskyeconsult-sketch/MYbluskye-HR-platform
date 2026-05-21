// src/services/aiArticleService.js
// AI Article Builder Service

import { supabase } from '../lib/supabase';
import { sendEmail } from './emailService';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export async function generateArticle(topic, tone = 'professional', length = 'medium') {
    const prompt = `Write a ${tone} article about "${topic}" for the ODUSBABA platform.
    
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
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are an expert content writer for a career and HR platform.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: length === 'short' ? 1000 : length === 'medium' ? 1500 : 2000
            })
        });

        const data = await response.json();
        const content = data.choices[0].message.content;
        
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
            status: 'draft',
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
    // Update article status
    await supabase
        .from('articles')
        .update({ 
            status: 'published', 
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
        // Send newsletter to subscribers
        const { data: subscribers } = await supabase
            .from('newsletter_subscribers')
            .select('email, name')
            .eq('status', 'active');
        
        for (const subscriber of subscribers || []) {
            await sendEmail(
                subscriber.email,
                `New Article: ${article.title}`,
                `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; padding: 24px;">
                    <h1 style="color: #10b981;">New Article from ODUSBABA</h1>
                    <h2>${article.title}</h2>
                    <div style="color: #94a3b8;">${article.excerpt}</div>
                    <a href="https://www.bluskyeconsult.com/articles/${article.slug}" style="display: inline-block; background-color: #0ea5e9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">Read Full Article →</a>
                    <hr style="border-color: #1e293b; margin: 20px 0;">
                    <p style="color: #475569; font-size: 12px;">BluSkye Integrated Consult - Creating Value for Partnership</p>
                </div>`
            );
        }
    }
    
    return { success: true };
}

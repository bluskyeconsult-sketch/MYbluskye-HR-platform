// src/pages/api/chat.js
// Complete chat API endpoint for ODUSBABA

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { messages, userId, conversationId } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Invalid messages format' });
    }

    // Get user tier for rate limiting
    let userTier = 'free';
    let remainingCredits = 5;
    
    if (userId) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('tier, ai_credits_remaining')
            .eq('id', userId)
            .single();
        
        if (profile) {
            userTier = profile.tier || 'free';
            remainingCredits = profile.ai_credits_remaining || 0;
            
            const limits = { free: 5, registered: 20, professional: 100, employer: 200, business: 500 };
            if (remainingCredits <= 0 && limits[userTier] > 0) {
                return res.status(429).json({ 
                    error: 'You have exhausted your AI credits. Please upgrade or purchase more credits.',
                    creditsExhausted: true 
                });
            }
        }
    }

    const systemPrompt = `You are ODUSBABA, an AI Career Advisor for BluSkye Integrated Consult.

Key capabilities:
- Help with job search, CV optimization, interview preparation, salary negotiation
- Provide career advice and professional development guidance
- Suggest platform services (CV Optimizer, Cover Letter Writer, LinkedIn Makeover, etc.)
- For legal questions, provide general guidance and suggest consulting professionals

Be helpful, concise, and professional.`;

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
                    { role: 'system', content: systemPrompt },
                    ...messages.slice(-10)
                ],
                temperature: 0.7,
                max_tokens: 800
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'OpenAI API error');
        }

        const data = await response.json();
        const reply = data.choices[0].message.content;

        // Update credit usage if user is logged in
        if (userId) {
            await supabase.rpc('decrement_ai_credits', { user_id: userId });
        }

        return res.status(200).json({ 
            reply, 
            remaining: remainingCredits - 1,
            success: true 
        });
        
    } catch (error) {
        console.error('Chat API error:', error);
        return res.status(500).json({ 
            error: 'AI service temporarily unavailable. Please try again.',
            details: error.message 
        });
    }
}

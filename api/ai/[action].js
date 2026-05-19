// api/ai/[action].js
// Unified AI API endpoint - handles all AI actions

import OpenAI from 'openai';
import { supabase } from '../../src/lib/supabase.js';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// ============================================
// ACTION HANDLERS
// ============================================

const handlers = {
    // Marketing Content for CinematicTextAdvert
    'marketing-content': async (req, res) => {
        const content = [
            { text: "www.bluskyeconsult.com", subtext: "Your Trusted Career Platform", icon: "🌐", gradient: "from-sky-500 to-blue-600", duration: 4000 },
            { text: "AI-Powered Career Intelligence", subtext: "Powered by advanced neural networks", icon: "🧠", gradient: "from-purple-500 to-pink-500", duration: 3500 },
            { text: "Live Government Job Feeds", subtext: "Real-time opportunities from 7+ countries", icon: "🌍", gradient: "from-blue-500 to-cyan-500", duration: 3500 },
            { text: "Sponsorship & Visa Detection", subtext: "Smart filtering for international talent", icon: "✈️", gradient: "from-emerald-500 to-teal-500", duration: 3500 },
            { text: "Professional CV Optimization", subtext: "ATS-friendly, recruiter-approved", icon: "📄", gradient: "from-amber-500 to-orange-500", duration: 3500 },
            { text: "Virtual Assistant Ecosystem", subtext: "24/7 career guidance at your fingertips", icon: "🤖", gradient: "from-indigo-500 to-purple-500", duration: 3500 },
            { text: "Skill Verification & Assessment", subtext: "Validate your expertise with AI", icon: "⭐", gradient: "from-yellow-500 to-red-500", duration: 3500 }
        ];
        
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(200).json(content);
    },

    // Chat endpoint
    'chat': async (req, res) => {
        const { messages, userId, conversationId, userTier } = req.body;
        
        try {
            // Check user credits
            let remaining = 0;
            if (userId) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('ai_credits_remaining, user_type, tier')
                    .eq('id', userId)
                    .single();
                
                const isUnlimited = profile?.user_type === 'super_admin' || 
                                   profile?.user_type === 'admin' || 
                                   profile?.tier === 'business';
                
                if (!isUnlimited) {
                    remaining = profile?.ai_credits_remaining || 0;
                    if (remaining <= 0) {
                        return res.status(403).json({ error: 'Insufficient credits' });
                    }
                }
            }
            
            // Call OpenAI
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are ODUSBABA, an AI Career Advisor. Be helpful, professional, and concise.' },
                    ...messages
                ],
                temperature: 0.7,
                max_tokens: 1000,
            });
            
            const reply = completion.choices[0].message.content;
            
            // Deduct credit if not unlimited
            if (userId && remaining > 0) {
                await supabase.rpc('decrement_ai_credits', { user_id: userId });
                remaining--;
            }
            
            return res.status(200).json({ reply, remaining });
        } catch (error) {
            console.error('Chat error:', error);
            return res.status(500).json({ error: error.message });
        }
    },

    // Generate Article
    'generate-article': async (req, res) => {
        const { topic, tone = 'professional', length = 'medium' } = req.body;
        
        const lengthMap = { short: 500, medium: 1000, long: 2000 };
        const maxTokens = lengthMap[length] || 1000;
        
        const prompt = `Write a ${tone} article about "${topic}". 
Include:
1. An engaging title
2. A compelling introduction
3. 3-5 main sections with subheadings
4. A conclusion with key takeaways
5. An SEO-optimized excerpt (max 160 characters)

Format with markdown.`;

        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are a professional content writer for a career platform.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: maxTokens,
            });
            
            const content = completion.choices[0].message.content;
            
            // Extract title (first line or heading)
            const titleMatch = content.match(/^#\s+(.+)$/m);
            const title = titleMatch ? titleMatch[1] : topic;
            
            // Extract excerpt (first 160 chars of content)
            const excerpt = content.replace(/[#*`]/g, '').substring(0, 160);
            
            return res.status(200).json({
                success: true,
                title,
                content,
                excerpt
            });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // Improve Article
    'improve-article': async (req, res) => {
        const { content, improvement_type = 'clarity' } = req.body;
        
        const improvements = {
            clarity: 'Improve the clarity, grammar, and readability. Fix any awkward phrasing.',
            seo: 'Add SEO keywords naturally, improve headings, and optimize meta description.',
            length: 'Expand the content with more details, examples, and actionable advice.',
            conciseness: 'Make the content more concise. Remove fluff and redundancy.'
        };
        
        const instruction = improvements[improvement_type] || improvements.clarity;
        
        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are a professional editor specializing in career content.' },
                    { role: 'user', content: `${instruction}\n\nOriginal Content:\n${content}` }
                ],
                temperature: 0.5,
                max_tokens: 2000,
            });
            
            const improved = completion.choices[0].message.content;
            
            return res.status(200).json({ success: true, content: improved });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // Generate SEO Title
    'generate-seo-title': async (req, res) => {
        const { title } = req.body;
        
        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'Generate an SEO-optimized title (50-60 characters) for a blog post.' },
                    { role: 'user', content: `Original title: "${title}"\n\nGenerate an SEO-optimized version.` }
                ],
                temperature: 0.5,
                max_tokens: 60,
            });
            
            const seo_title = completion.choices[0].message.content.trim();
            
            return res.status(200).json({ success: true, seo_title });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // Brainstorm Ideas
    'brainstorm': async (req, res) => {
        const { topic, context = 'initial', previousIdeas = [] } = req.body;
        
        const systemPrompt = `You are a product strategy expert. Generate innovative, actionable ideas for a career platform.
Be creative, practical, and specific. Return exactly 5 ideas as a JSON array.`;

        const userPrompt = context === 'deep_dive' 
            ? `Deep dive into this topic: "${topic}". Previous ideas: ${JSON.stringify(previousIdeas)}. Provide 5 detailed, innovative ideas.`
            : `Generate 5 creative ideas for: "${topic}". Focus on practical, implementable solutions.`;
        
        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.8,
                max_tokens: 1000,
            });
            
            let ideas;
            try {
                ideas = JSON.parse(completion.choices[0].message.content);
            } catch {
                // Fallback: split by newlines
                ideas = completion.choices[0].message.content
                    .split(/\d+\.\s+/)
                    .filter(i => i.trim())
                    .map(i => i.trim());
            }
            
            return res.status(200).json({ ideas });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    // Brainstorm Deep Dive
    'brainstorm-deepdive': async (req, res) => {
        const { idea, originalTopic } = req.body;
        
        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'Provide a detailed analysis of this idea including: feasibility, implementation steps, potential challenges, and success metrics.' },
                    { role: 'user', content: `Original topic: "${originalTopic}"\n\nIdea: "${idea}"\n\nProvide a comprehensive deep dive analysis.` }
                ],
                temperature: 0.7,
                max_tokens: 800,
            });
            
            const analysis = completion.choices[0].message.content;
            
            return res.status(200).json({ analysis });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    // Brainstorm Follow-up
    'brainstorm-followup': async (req, res) => {
        const { query, context, previousIdeas } = req.body;
        
        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are a product strategy expert. Provide thoughtful, actionable responses to follow-up questions.' },
                    { role: 'user', content: `Context: "${context}"\nPrevious ideas: ${JSON.stringify(previousIdeas)}\n\nQuestion: ${query}\n\nProvide 3-5 additional ideas or insights.` }
                ],
                temperature: 0.7,
                max_tokens: 600,
            });
            
            const response = completion.choices[0].message.content;
            const ideas = response.split(/\d+\.\s+/).filter(i => i.trim());
            
            return res.status(200).json({ response, ideas });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },

    // Virtual Assistant Task
    'virtual-assistant': async (req, res) => {
        const { assistantId, assistantName, input, userId, userTier } = req.body;
        
        // VA-specific prompts based on type
        const vaPrompts = {
            'cv-expert': `You are a professional CV writer. Optimize the following CV content for ATS systems. Focus on:
- Keywords from job descriptions
- Quantifiable achievements
- Professional formatting
- Action verbs

User request: ${input}`,
            'interview-coach': `You are an interview coach. Help the user prepare for their interview.
Provide:
- Sample questions they might face
- STAR method examples
- Common mistakes to avoid
- Strengths they should highlight

User request: ${input}`,
            'salary-negotiator': `You are a salary negotiation expert. Provide:
- Market research for their role and location
- Negotiation scripts
- Total compensation considerations
- Counter-offer strategies

User request: ${input}`,
            'skill-analyzer': `You are a skill development analyst. Analyze the user's skills and provide:
- Skill gap analysis
- Learning resources
- Certification recommendations
- Career progression path

User request: ${input}`,
            'linkedin-optimizer': `You are a LinkedIn profile expert. Help optimize their profile with:
- SEO keywords for their industry
- Headline optimization
- About section improvements
- Experience section enhancements

User request: ${input}`,
            'cover-letter-pro': `You are a cover letter writer. Create a compelling cover letter that:
- Highlights relevant experience
- Shows enthusiasm for the role
- Connects skills to company needs
- Is concise and professional

User request: ${input}`
        };
        
        const prompt = vaPrompts[assistantId] || `You are ${assistantName}, a career assistant. Help the user with their request.\n\nUser request: ${input}`;
        
        try {
            // Check VA credits
            if (userId && userTier !== 'business') {
                const { data: credits } = await supabase
                    .from('va_credits')
                    .select('balance')
                    .eq('user_id', userId)
                    .single();
                
                if (!credits || credits.balance < 1) {
                    return res.status(403).json({ error: 'Insufficient VA credits' });
                }
                
                // Deduct credit
                await supabase
                    .from('va_credits')
                    .update({ balance: credits.balance - 1 })
                    .eq('user_id', userId);
            }
            
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: `You are ${assistantName}, a professional career assistant. Provide detailed, actionable advice.` },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 1500,
            });
            
            const output = completion.choices[0].message.content;
            
            // Save task to database
            if (userId) {
                await supabase
                    .from('va_tasks')
                    .insert({
                        user_id: userId,
                        va_id: assistantId,
                        input: input,
                        output: output,
                        status: 'completed'
                    });
            }
            
            return res.status(200).json({ output });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
};

// ============================================
// ROUTER
// ============================================

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // Get action from URL
    const action = req.query.action || req.body.action;
    
    if (!action || !handlers[action]) {
        return res.status(404).json({ error: `Unknown action: ${action}` });
    }
    
    try {
        await handlers[action](req, res);
    } catch (error) {
        console.error(`Error in ${action}:`, error);
        return res.status(500).json({ error: error.message });
    }
}

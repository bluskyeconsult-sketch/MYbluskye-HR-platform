// api/ai/[action].js
// Unified AI API endpoint - handles all AI actions
// Works with Vercel serverless functions

import OpenAI from 'openai';

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to get Supabase client (dynamic import for serverless)
async function getSupabase() {
    const { createClient } = await import('@supabase/supabase-js');
    return createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_ANON_KEY
    );
}

// ============================================
// ACTION HANDLERS
// ============================================

const handlers = {
    // 1. Marketing Content for CinematicTextAdvert
    'marketing-content': async (req, res) => {
        const content = [
            { text: "www.bluskyeconsult.com", subtext: "Your Trusted Career Platform", icon: "🌐", gradient: "from-sky-500 to-blue-600", duration: 4000 },
            { text: "AI-Powered Career Intelligence", subtext: "Powered by advanced neural networks", icon: "🧠", gradient: "from-purple-500 to-pink-500", duration: 3500 },
            { text: "Live Government Job Feeds", subtext: "Real-time opportunities from 7+ countries", icon: "🌍", gradient: "from-blue-500 to-cyan-500", duration: 3500 },
            { text: "Sponsorship & Visa Detection", subtext: "Smart filtering for international talent", icon: "✈️", gradient: "from-emerald-500 to-teal-500", duration: 3500 },
            { text: "Professional CV Optimization", subtext: "ATS-friendly, recruiter-approved", icon: "📄", gradient: "from-amber-500 to-orange-500", duration: 3500 },
            { text: "Virtual Assistant Ecosystem", subtext: "24/7 career guidance at your fingertips", icon: "🤖", gradient: "from-indigo-500 to-purple-500", duration: 3500 },
            { text: "Skill Verification & Assessment", subtext: "Validate your expertise with AI", icon: "⭐", gradient: "from-yellow-500 to-red-500", duration: 3500 },
            { text: "Salary Negotiation Coach", subtext: "Maximize your earning potential", icon: "💰", gradient: "from-green-500 to-emerald-500", duration: 3500 },
            { text: "Workplace Rights Protection", subtext: "Legal guidance when you need it", icon: "⚖️", gradient: "from-slate-500 to-gray-500", duration: 3500 }
        ];
        
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(200).json(content);
    },

    // 2. Chat endpoint
    'chat': async (req, res) => {
        const { messages, userId, conversationId, userTier } = req.body;
        
        try {
            const supabase = await getSupabase();
            let remaining = 0;
            let isUnlimited = false;
            
            // Check user credits
            if (userId) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('ai_credits_remaining, user_type, tier')
                    .eq('id', userId)
                    .single();
                
                isUnlimited = profile?.user_type === 'super_admin' || 
                           profile?.user_type === 'admin' || 
                           profile?.tier === 'business';
                
                if (!isUnlimited) {
                    remaining = profile?.ai_credits_remaining || 0;
                    if (remaining <= 0) {
                        return res.status(403).json({ error: 'Insufficient credits. Please upgrade your plan.' });
                    }
                }
            }
            
            // Call OpenAI
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are ODUSBABA, an AI Career Advisor for BluSkye Integrated Consult. Be helpful, professional, and concise. Focus on career advice, job searching, CV optimization, interview preparation, and workplace guidance.' },
                    ...messages
                ],
                temperature: 0.7,
                max_tokens: 1000,
            });
            
            const reply = completion.choices[0].message.content;
            
            // Deduct credit if not unlimited
            if (userId && !isUnlimited && remaining > 0) {
                const { error } = await supabase
                    .from('profiles')
                    .update({ ai_credits_remaining: remaining - 1 })
                    .eq('id', userId);
                
                if (!error) remaining--;
            }
            
            return res.status(200).json({ reply, remaining: isUnlimited ? 999999 : remaining });
        } catch (error) {
            console.error('Chat error:', error);
            return res.status(500).json({ error: error.message });
        }
    },

    // 3. Generate Article
    'generate-article': async (req, res) => {
        const { topic, tone = 'professional', length = 'medium' } = req.body;
        
        const lengthMap = { short: 500, medium: 1000, long: 2000 };
        const maxTokens = lengthMap[length] || 1000;
        
        const prompt = `Write a ${tone} article about "${topic}". 

Format the response as JSON with this structure:
{
    "title": "Engaging article title",
    "content": "Full article content with markdown formatting (use ## for subheadings, bullet points, etc.)",
    "excerpt": "A compelling 150-160 character summary for SEO"
}

Article requirements:
1. Title should be engaging and SEO-friendly
2. Include an introduction that hooks the reader
3. Have 3-5 main sections with subheadings (## Subheading)
4. Include practical, actionable advice
5. End with a conclusion and key takeaways
6. Use bullet points or numbered lists where appropriate
7. Keep the tone professional but accessible

Return ONLY valid JSON, no other text.`;

        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are a professional content writer for a career platform. Return only valid JSON.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: maxTokens,
                response_format: { type: "json_object" }
            });
            
            const result = JSON.parse(completion.choices[0].message.content);
            
            return res.status(200).json({
                success: true,
                title: result.title,
                content: result.content,
                excerpt: result.excerpt?.substring(0, 160) || result.content.substring(0, 160)
            });
        } catch (error) {
            console.error('Generate article error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // 4. Improve Article
    'improve-article': async (req, res) => {
        const { content, improvement_type = 'clarity' } = req.body;
        
        const improvements = {
            clarity: 'Improve the clarity, grammar, and readability. Fix any awkward phrasing, run-on sentences, and typos. Make the content flow better.',
            seo: 'Add SEO keywords naturally throughout. Improve headings to be more search-friendly. Add a meta description suggestion.',
            length: 'Expand the content with more details, examples, case studies, and actionable advice. Add relevant statistics where appropriate.',
            conciseness: 'Make the content more concise. Remove fluff, redundant phrases, and unnecessary words. Keep the core message intact.'
        };
        
        const instruction = improvements[improvement_type] || improvements.clarity;
        
        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are a professional editor specializing in career content. Improve the provided content while preserving the core message and key points.' },
                    { role: 'user', content: `${instruction}\n\nOriginal Content:\n${content}\n\nReturn ONLY the improved content, no explanations.` }
                ],
                temperature: 0.5,
                max_tokens: 2500,
            });
            
            const improved = completion.choices[0].message.content;
            
            return res.status(200).json({ success: true, content: improved });
        } catch (error) {
            console.error('Improve article error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // 5. Generate SEO Title
    'generate-seo-title': async (req, res) => {
        const { title } = req.body;
        
        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'Generate an SEO-optimized title (50-60 characters) for a blog post. Return ONLY the title, no explanations.' },
                    { role: 'user', content: `Original title: "${title}"\n\nGenerate an SEO-optimized version that is clickable and includes relevant keywords.` }
                ],
                temperature: 0.5,
                max_tokens: 60,
            });
            
            const seo_title = completion.choices[0].message.content.trim();
            
            return res.status(200).json({ success: true, seo_title });
        } catch (error) {
            console.error('Generate SEO title error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    // 6. Brainstorm Ideas
    'brainstorm': async (req, res) => {
        const { topic, context = 'initial', previousIdeas = [] } = req.body;
        
        const systemPrompt = `You are a product strategy expert for a career platform. Generate innovative, actionable ideas.
Be creative, practical, and specific. Return exactly 5 ideas as a JSON array of strings.
Example format: ["Idea 1", "Idea 2", "Idea 3", "Idea 4", "Idea 5"]`;

        const userPrompt = context === 'deep_dive' 
            ? `Deep dive into this topic: "${topic}". Previous ideas: ${JSON.stringify(previousIdeas)}. Provide 5 detailed, innovative, and implementable ideas.`
            : `Generate 5 creative, innovative ideas for: "${topic}". Focus on practical, implementable solutions for a career platform.`;
        
        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.8,
                max_tokens: 1000,
                response_format: { type: "json_object" }
            });
            
            let ideas;
            try {
                const parsed = JSON.parse(completion.choices[0].message.content);
                ideas = Array.isArray(parsed) ? parsed : (parsed.ideas || []);
            } catch {
                // Fallback: split by newlines
                ideas = completion.choices[0].message.content
                    .split(/\d+\.\s+/)
                    .filter(i => i.trim())
                    .slice(0, 5)
                    .map(i => i.trim());
            }
            
            if (!ideas.length) {
                ideas = [
                    `AI-powered ${topic} recommendation engine`,
                    `Gamified ${topic} learning path`,
                    `Community-driven ${topic} insights hub`,
                    `Personalized ${topic} coaching with AI`,
                    `Analytics dashboard for ${topic} metrics`
                ];
            }
            
            return res.status(200).json({ ideas });
        } catch (error) {
            console.error('Brainstorm error:', error);
            return res.status(500).json({ error: error.message });
        }
    },

    // 7. Brainstorm Deep Dive
    'brainstorm-deepdive': async (req, res) => {
        const { idea, originalTopic } = req.body;
        
        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'Provide a detailed analysis of this idea. Be specific and actionable.' },
                    { role: 'user', content: `Original topic: "${originalTopic}"\n\nIdea: "${idea}"\n\nProvide a comprehensive deep dive analysis including:\n1. Feasibility (1-10 scale with explanation)\n2. Implementation steps (3-5 bullet points)\n3. Potential challenges\n4. Success metrics\n5. Estimated timeline\n6. Required resources` }
                ],
                temperature: 0.7,
                max_tokens: 1000,
            });
            
            const analysis = completion.choices[0].message.content;
            
            return res.status(200).json({ analysis });
        } catch (error) {
            console.error('Deep dive error:', error);
            return res.status(500).json({ error: error.message });
        }
    },

    // 8. Brainstorm Follow-up
    'brainstorm-followup': async (req, res) => {
        const { query, context, previousIdeas } = req.body;
        
        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are a product strategy expert. Provide thoughtful, actionable responses.' },
                    { role: 'user', content: `Context: "${context}"\nPrevious ideas: ${JSON.stringify(previousIdeas)}\n\nQuestion: ${query}\n\nProvide 3-5 additional ideas or insights. Return as JSON array.` }
                ],
                temperature: 0.7,
                max_tokens: 800,
            });
            
            let ideas = [];
            try {
                const parsed = JSON.parse(completion.choices[0].message.content);
                ideas = Array.isArray(parsed) ? parsed : [];
            } catch {
                ideas = [completion.choices[0].message.content];
            }
            
            const response = ideas.join('\n');
            
            return res.status(200).json({ response, ideas });
        } catch (error) {
            console.error('Follow-up error:', error);
            return res.status(500).json({ error: error.message });
        }
    },

    // 9. Virtual Assistant Task
    'virtual-assistant': async (req, res) => {
        const { assistantId, assistantName, input, userId, userTier } = req.body;
        
        // VA-specific prompts based on type
        const vaPrompts = {
            'cv-expert': `You are a professional CV writer. Optimize the following CV content for ATS systems.

Focus on:
- Keywords from job descriptions
- Quantifiable achievements (use numbers, percentages, dollar amounts)
- Professional formatting (bullet points, clear sections)
- Action verbs (achieved, improved, managed, created, developed)
- Removing weak language (avoid "responsible for", "helped with")

User request: ${input}

Provide a detailed, optimized response.`,
            'interview-coach': `You are an interview coach. Help the user prepare for their interview.

Provide:
- 5 sample questions they might face for their role
- STAR method examples for behavioral questions
- Common mistakes to avoid during interviews
- Strengths they should highlight based on their experience
- Questions they should ask the interviewer

User request: ${input}`,
            'salary-negotiator': `You are a salary negotiation expert. Provide comprehensive guidance.

Include:
- Market research approach for their role and location
- Negotiation scripts (opening, counter-offer, closing)
- Total compensation considerations (bonus, benefits, equity, remote work)
- How to handle "What's your current salary?" questions
- Counter-offer strategies and when to walk away

User request: ${input}`,
            'skill-analyzer': `You are a skill development analyst. Analyze the user's situation and provide:

- Skill gap analysis comparing their current vs. desired role
- Top 5 skills to develop (prioritized)
- Learning resources (free and paid) for each skill
- Certification recommendations with estimated time/cost
- Career progression path over 6, 12, 24 months

User request: ${input}`,
            'linkedin-optimizer': `You are a LinkedIn profile expert. Help optimize their profile.

Provide suggestions for:
- Headline optimization (220 characters) with keywords
- About section rewrite (2-3 paragraphs)
- Experience section enhancements with achievements
- Skills section recommendations (top 10-15 skills)
- Recommendation request strategies
- Profile photo and banner advice

User request: ${input}`,
            'cover-letter-pro': `You are a cover letter writer. Create a compelling cover letter.

The cover letter should:
- Be tailored to the specific role (ask for details if needed)
- Open with a strong hook showing enthusiasm
- Highlight 2-3 key achievements relevant to the role
- Connect skills to company needs/problems they solve
- Close with a confident call to action
- Be concise (250-400 words)

User request: ${input}`
        };
        
        const prompt = vaPrompts[assistantId] || `You are ${assistantName}, a career assistant. Help the user with their request professionally.\n\nUser request: ${input}`;
        
        try {
            const supabase = await getSupabase();
            
            // Check VA credits for non-admin users
            if (userId && userTier !== 'business') {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('user_type, tier')
                    .eq('id', userId)
                    .single();
                
                const isAdmin = profile?.user_type === 'super_admin' || profile?.user_type === 'admin';
                
                if (!isAdmin) {
                    const { data: credits } = await supabase
                        .from('va_credits')
                        .select('balance')
                        .eq('user_id', userId)
                        .single();
                    
                    if (!credits || credits.balance < 1) {
                        return res.status(403).json({ error: 'Insufficient VA credits. Please purchase more credits.' });
                    }
                    
                    // Deduct credit
                    await supabase
                        .from('va_credits')
                        .update({ balance: credits.balance - 1, updated_at: new Date().toISOString() })
                        .eq('user_id', userId);
                }
            }
            
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: `You are ${assistantName}, a professional career assistant. Provide detailed, actionable, and personalized advice. Use examples where helpful. Keep the tone professional but warm.` },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 1500,
            });
            
            const output = completion.choices[0].message.content;
            
            // Save task to database
            if (userId) {
                const { error } = await supabase
                    .from('va_tasks')
                    .insert({
                        user_id: userId,
                        va_id: assistantId,
                        input: input,
                        output: output,
                        status: 'completed',
                        completed_at: new Date().toISOString()
                    });
                
                if (error) console.error('Error saving VA task:', error);
            }
            
            return res.status(200).json({ output });
        } catch (error) {
            console.error('Virtual assistant error:', error);
            return res.status(500).json({ error: error.message });
        }
    }
};

// ============================================
// MAIN HANDLER
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
    
    // Get action from URL or body
    const action = req.query.action || req.body.action;
    
    if (!action || !handlers[action]) {
        return res.status(404).json({ 
            error: `Unknown action: ${action}`,
            available_actions: Object.keys(handlers)
        });
    }
    
    try {
        await handlers[action](req, res);
    } catch (error) {
        console.error(`Error in ${action}:`, error);
        return res.status(500).json({ error: error.message });
    }
}

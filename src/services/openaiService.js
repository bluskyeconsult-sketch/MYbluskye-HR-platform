// src/services/openaiService.js
// COMPLETE OPENAI SERVICE - No placeholders

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const API_URL = 'https://api.openai.com/v1/chat/completions';

async function callOpenAI(messages, temperature = 0.7, maxTokens = 1000) {
    if (!OPENAI_API_KEY) {
        console.error('OpenAI API key missing');
        return { error: 'OpenAI API key not configured' };
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: messages,
                temperature: temperature,
                max_tokens: maxTokens
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `API error: ${response.status}`);
        }

        const data = await response.json();
        return { success: true, content: data.choices[0].message.content };
    } catch (error) {
        console.error('OpenAI API error:', error);
        return { error: error.message };
    }
}

// ============================================
// ARTICLE ASSISTANT
// ============================================
export async function generateArticleContent(topic, tone = 'professional', length = 'medium') {
    const lengthMap = { short: 500, medium: 1000, long: 2000 };
    const maxTokens = lengthMap[length] || 1000;
    
    const prompt = `Write a ${tone} article about "${topic}" for a career/HR platform.
    
Requirements:
- Engaging introduction
- 3-4 main sections with subheadings
- Practical examples and actionable advice
- Strong conclusion

Format as HTML with <h2> for section headings and <p> for paragraphs.`;

    const result = await callOpenAI([
        { role: 'system', content: 'You are a professional career and HR content writer.' },
        { role: 'user', content: prompt }
    ], 0.7, maxTokens);

    return result;
}

export async function generateArticleHeadline(topic) {
    const result = await callOpenAI([
        { role: 'system', content: 'You are a copywriter who creates compelling headlines.' },
        { role: 'user', content: `Generate 5 engaging headlines for an article about "${topic}". Return as JSON array.` }
    ], 0.8, 300);
    
    return result;
}

export async function improveArticleContent(content, instructions) {
    const result = await callOpenAI([
        { role: 'system', content: 'You are an editor who improves article content.' },
        { role: 'user', content: `Improve this content: ${content}\n\nInstructions: ${instructions}` }
    ], 0.5, 2000);
    
    return result;
}

// ============================================
// ODUSBABA CHAT
// ============================================
export async function getChatResponse(userMessage, conversationHistory = [], userContext = {}) {
    const systemPrompt = `You are ODUSBABA, an AI Career Advisor for BluSkye Integrated Consult.
    
Your role:
- Help with job search, CV optimization, interview preparation, salary negotiation
- Provide career advice and guidance
- Suggest relevant platform services when appropriate
- Be professional, warm, and helpful

User context: ${JSON.stringify(userContext)}

Important: If the user asks about workplace legal issues, provide general guidance and suggest consulting a lawyer.
If the user wants to escalate to a human, provide ticket creation instructions.`;

    const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-10),
        { role: 'user', content: userMessage }
    ];

    const result = await callOpenAI(messages, 0.7, 800);
    return result;
}

// ============================================
// BRAINSTORM PARTNER (Super Admin only)
// ============================================
export async function brainstormWithAI(question, context = {}) {
    const systemPrompt = `You are Brainstorm Partner, an AI assistant for Super Admin of ODUSBABA.
    
You help with:
- Platform strategy and decision making
- Troubleshooting and problem-solving
- Data analysis interpretation
- Feature planning and prioritization

Be concise, practical, and action-oriented.`;

    const result = await callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
    ], 0.8, 1500);
    
    return result;
}

// ============================================
// VIRTUAL ASSISTANT EXECUTION
// ============================================
export async function executeVirtualAssistant(vaType, input, userContext = {}) {
    const prompts = {
        cv_optimizer: `You are a professional CV writer. Optimize this CV for ATS systems and recruiter appeal.\n\nCV:\n${input}`,
        cover_letter: `Write a professional cover letter for this job application.\n\nDetails:\n${input}`,
        linkedin_makeover: `Optimize this LinkedIn profile for better visibility and engagement.\n\nProfile:\n${input}`,
        interview_coach: `Provide interview preparation advice and practice questions for this role.\n\nRole:\n${input}`,
        salary_coach: `Provide salary negotiation strategies and market insights.\n\nContext:\n${input}`,
        skill_analyzer: `Analyze skill gaps and provide learning recommendations.\n\nSkills:\n${input}`
    };

    const prompt = prompts[vaType] || `You are a helpful career assistant. Respond to: ${input}`;

    const result = await callOpenAI([
        { role: 'system', content: 'You are a professional career coach and advisor.' },
        { role: 'user', content: prompt }
    ], 0.7, 1200);
    
    return result;
}

// ============================================
// ASSESSMENT GENERATION
// ============================================
export async function generateAssessmentQuestions(topic, difficulty, count = 10) {
    const difficultyLevels = {
        beginner: 'basic knowledge and fundamental concepts',
        intermediate: 'practical application and scenario-based',
        advanced: 'complex problem-solving and strategic thinking'
    };

    const prompt = `Create ${count} ${difficulty} level questions for a "${topic}" assessment.
    
Return as JSON array with this structure:
[
    {
        "question": "Question text?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct": 0,
        "explanation": "Why this is correct"
    }
]

Difficulty: ${difficultyLevels[difficulty] || difficultyLevels.intermediate}`;

    const result = await callOpenAI([
        { role: 'system', content: 'You are an expert test creator.' },
        { role: 'user', content: prompt }
    ], 0.5, 2000);
    
    if (result.success) {
        try {
            const jsonMatch = result.content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return { success: true, questions: JSON.parse(jsonMatch[0]) };
            }
        } catch (e) {
            return { error: 'Failed to parse questions' };
        }
    }
    
    return result;
}

// ============================================
// NEWSLETTER GENERATION
// ============================================
export async function generateNewsletterContent(topic, segments = []) {
    const prompt = `Create a professional email newsletter on "${topic}".
    
Target audience: ${segments.join(', ') || 'Career professionals'}
Include: engaging subject line, introduction, 3-4 content sections, call-to-action.
Format as HTML with proper styling.`;

    const result = await callOpenAI([
        { role: 'system', content: 'You are a marketing copywriter for a career platform.' },
        { role: 'user', content: prompt }
    ], 0.7, 1500);
    
    return result;
}

// src/services/openaiService.js
// COMPLETE OPENAI SERVICE - With cost tracking, error handling, and all AI features

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const API_URL = 'https://api.openai.com/v1/chat/completions';

// ============================================
// COST TRACKING (2026 pricing)
// ============================================
const COST_RATES = {
    'gpt-4o-mini': { input: 0.15 / 1_000_000, output: 0.60 / 1_000_000 },
    'gpt-4o': { input: 2.50 / 1_000_000, output: 10.00 / 1_000_000 },
    'gpt-4': { input: 30.00 / 1_000_000, output: 60.00 / 1_000_000 },
    'gpt-3.5-turbo': { input: 0.50 / 1_000_000, output: 1.50 / 1_000_000 }
};

function calculateCost(model, inputTokens, outputTokens) {
    const rates = COST_RATES[model] || COST_RATES['gpt-4o-mini'];
    const inputCost = inputTokens * rates.input;
    const outputCost = outputTokens * rates.output;
    return inputCost + outputCost;
}

// ============================================
// CORE OPENAI FUNCTION (with cost tracking)
// ============================================
async function callOpenAI(messages, options = {}) {
    const {
        model = 'gpt-4o-mini',
        temperature = 0.7,
        maxTokens = 1000,
        trackCost = true,
        feature = 'general'
    } = options;

    if (!OPENAI_API_KEY) {
        console.error('❌ OpenAI API key missing');
        return { success: false, error: 'OpenAI API key not configured' };
    }

    const startTime = Date.now();

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                temperature: temperature,
                max_tokens: maxTokens
            })
        });

        const duration = Date.now() - startTime;

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `API error: ${response.status}`);
        }

        const data = await response.json();
        const usage = data.usage;
        const cost = calculateCost(model, usage.prompt_tokens, usage.completion_tokens);

        // Log cost in development
        if (import.meta.env.DEV) {
            console.log(`💰 ${feature}: $${cost.toFixed(6)} (${usage.total_tokens} tokens, ${duration}ms)`);
        }

        return {
            success: true,
            content: data.choices[0].message.content,
            usage: {
                promptTokens: usage.prompt_tokens,
                completionTokens: usage.completion_tokens,
                totalTokens: usage.total_tokens,
                cost: cost
            },
            duration: duration,
            model: model
        };
    } catch (error) {
        console.error('OpenAI API error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// TEST CONNECTION
// ============================================
export async function testOpenAIConnection() {
    const start = Date.now();
    
    if (!OPENAI_API_KEY) {
        return { success: false, error: 'API key missing', duration: 0 };
    }
    
    const result = await callOpenAI(
        [{ role: 'user', content: 'Say "OK" if you receive this.' }],
        { maxTokens: 10, feature: 'test' }
    );
    
    return {
        success: result.success,
        error: result.error,
        duration: result.duration,
        response: result.content
    };
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

    return callOpenAI(
        [
            { role: 'system', content: 'You are a professional career and HR content writer.' },
            { role: 'user', content: prompt }
        ],
        { temperature: 0.7, maxTokens: maxTokens, feature: 'article_generation' }
    );
}

export async function generateArticleHeadline(topic) {
    const result = await callOpenAI(
        [
            { role: 'system', content: 'You are a copywriter who creates compelling headlines. Return ONLY valid JSON array.' },
            { role: 'user', content: `Generate 5 engaging headlines for an article about "${topic}". Return as JSON array.` }
        ],
        { temperature: 0.8, maxTokens: 300, feature: 'headline_generation' }
    );
    
    if (result.success) {
        try {
            const headlines = JSON.parse(result.content);
            return { success: true, headlines: headlines };
        } catch (e) {
            return { success: false, error: 'Failed to parse headlines' };
        }
    }
    return result;
}

export async function improveArticleContent(content, instructions) {
    return callOpenAI(
        [
            { role: 'system', content: 'You are an editor who improves article content.' },
            { role: 'user', content: `Improve this content: ${content}\n\nInstructions: ${instructions}` }
        ],
        { temperature: 0.5, maxTokens: 2000, feature: 'article_improvement' }
    );
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

    return callOpenAI(messages, { temperature: 0.7, maxTokens: 800, feature: 'chat' });
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

    return callOpenAI(
        [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: question }
        ],
        { temperature: 0.8, maxTokens: 1500, feature: 'brainstorm' }
    );
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

    return callOpenAI(
        [
            { role: 'system', content: 'You are a professional career coach and advisor.' },
            { role: 'user', content: prompt }
        ],
        { temperature: 0.7, maxTokens: 1200, feature: `va_${vaType}` }
    );
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

    const result = await callOpenAI(
        [
            { role: 'system', content: 'You are an expert test creator. Return ONLY valid JSON.' },
            { role: 'user', content: prompt }
        ],
        { temperature: 0.5, maxTokens: 2000, feature: 'assessment_generation' }
    );
    
    if (result.success) {
        try {
            const jsonMatch = result.content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const questions = JSON.parse(jsonMatch[0]);
                return { success: true, questions: questions };
            }
            return { error: 'No JSON array found in response' };
        } catch (e) {
            return { success: false, error: 'Failed to parse questions: ' + e.message };
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

    return callOpenAI(
        [
            { role: 'system', content: 'You are a marketing copywriter for a career platform.' },
            { role: 'user', content: prompt }
        ],
        { temperature: 0.7, maxTokens: 1500, feature: 'newsletter_generation' }
    );
}

// ============================================
// JOB DESCRIPTION GENERATOR
// ============================================
export async function generateJobDescription(title, company, requirements) {
    const prompt = `Create a professional job description for a "${title}" position at ${company}.
    
Requirements provided: ${requirements}

Include: job summary, responsibilities, qualifications, benefits, and how to apply.`;

    return callOpenAI(
        [
            { role: 'system', content: 'You are an HR professional writing job descriptions.' },
            { role: 'user', content: prompt }
        ],
        { temperature: 0.6, maxTokens: 1200, feature: 'job_description' }
    );
}

// ============================================
// COURSE CONTENT GENERATOR
// ============================================
export async function generateCourseOutline(topic, level = 'beginner') {
    const prompt = `Create a course outline for "${topic}" at ${level} level.
    
Include: learning objectives, module titles (5-7 modules), key topics per module, and a final project.`;

    return callOpenAI(
        [
            { role: 'system', content: 'You are an instructional designer creating course outlines.' },
            { role: 'user', content: prompt }
        ],
        { temperature: 0.6, maxTokens: 1500, feature: 'course_outline' }
    );
}

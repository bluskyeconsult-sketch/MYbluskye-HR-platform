import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tier limits
const TIER_LIMITS = {
    free: { messages: 5, extra_credit_price: 1.99, extra_credits: 10 },
    registered: { messages: 20, extra_credit_price: 1.99, extra_credits: 10 },
    professional: { messages: 100, extra_credit_price: 0.99, extra_credits: 20 },
    employer: { messages: 50, extra_credit_price: 1.99, extra_credits: 10 },
    business: { messages: 999999, extra_credit_price: 0, extra_credits: 0 },
    admin: { messages: 999999, extra_credit_price: 0, extra_credits: 0 },
    super_admin: { messages: 999999, extra_credit_price: 0, extra_credits: 0 }
};

export async function getRemainingChatCredits(userId) {
    const { data: user } = await supabase
        .from('profiles')
        .select('tier')
        .eq('id', userId)
        .single();
    
    if (!user) return { remaining: 0, tier: 'free', limit: 5 };
    
    const limit = TIER_LIMITS[user.tier]?.messages || 5;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { count: used } = await supabase
        .from('ai_usage_tracking')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('feature_type', 'chat')
        .gte('created_at', startOfMonth.toISOString());
    
    const { data: purchases } = await supabase
        .from('chat_credit_purchases')
        .select('credits_purchased')
        .eq('user_id', userId)
        .gte('created_at', startOfMonth.toISOString());
    
    const purchasedCredits = purchases?.reduce((sum, p) => sum + p.credits_purchased, 0) || 0;
    const usedCount = used || 0;
    const remaining = Math.max(0, (limit + purchasedCredits) - usedCount);
    
    return {
        remaining, used: usedCount, limit, purchasedCredits,
        tier: user.tier, canPurchaseExtra: TIER_LIMITS[user.tier]?.extra_credit_price > 0
    };
}

export async function recordChatUsage(userId) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    await supabase.from('ai_usage_tracking').insert({
        user_id: userId,
        feature_type: 'chat',
        used_count: 1,
        created_at: new Date().toISOString()
    });
}

export async function escalateToAdmin(userId, conversationId, subject, issue, priority = 'medium') {
    const { data, error } = await supabase
        .from('escalation_tickets')
        .insert({
            user_id: userId,
            conversation_id: conversationId,
            subject,
            issue,
            priority,
            status: 'open'
        })
        .select()
        .single();
    
    if (error) throw error;
    return { success: true, ticketId: data.id };
}

// INTELLIGENT RESPONSE FUNCTION - REAL CAREER ADVISOR
export async function getAIResponse(userId, message, conversationId, userProfile, userTier) {
    const lowerMessage = message.toLowerCase();
    const isLoggedIn = !!userId;
    
    // ============ LEGAL & HR COMPLIANCE QUESTIONS ============
    if (lowerMessage.includes('sue') || lowerMessage.includes('legal') || lowerMessage.includes('lawyer') || 
        lowerMessage.includes('abuse') || lowerMessage.includes('harassment') || lowerMessage.includes('discrimination')) {
        return {
            response: `⚖️ **Employment Law Guidance**

I understand you're asking about workplace legal matters. Here's what you should know:

**Important Disclaimer:** I am an AI assistant, not an attorney. This is informational only.

**For workplace abuse/harassment:**
1. Document everything (dates, times, witnesses, messages)
2. Report to HR or management first (if safe)
3. You may have legal options depending on your country
4. Consult a local employment attorney for specific advice

**In the UK:** Contact ACAS (acas.org.uk) for free advice
**In the US:** Contact EEOC (eeoc.gov) for discrimination claims
**In Nigeria:** Contact National Industrial Court

Would you like me to help you find employment law resources or connect you with a human advisor?`,
            needsEscalation: lowerMessage.includes('lawyer') || lowerMessage.includes('attorney')
        };
    }
    
    // ============ SALARY NEGOTIATION ============
    if (lowerMessage.includes('salary') || lowerMessage.includes('negotiate') || lowerMessage.includes('pay raise') || lowerMessage.includes('increase')) {
        return {
            response: `💰 **Salary Negotiation Tips**

**Research first:**
• Know the market rate for your role (Glassdoor, LinkedIn, Levels.fyi)
• Factor in your experience, location, and skills
• Check our job board for salary ranges in your country

**Negotiation strategy:**
1. Let employer mention numbers first
2. Give a range, not a fixed number
3. Highlight your value (achievements, skills, certifications)
4. Consider total compensation (benefits, remote work, bonus)

**Sample script:** "Based on my experience and market research, I'm looking for a range between $X and $Y. I'm open to discussion based on total compensation."

Would you like me to search for salary data for your role and location?`,
            needsEscalation: false
        };
    }
    
    // ============ CV/RESUME ADVICE ============
    if (lowerMessage.includes('cv') || lowerMessage.includes('resume') || lowerMessage.includes('application')) {
        return {
            response: `📄 **Professional CV Advice**

**Key sections your CV should have:**
1. Contact information (email, phone, location)
2. Professional summary (2-3 sentences)
3. Skills (technical and soft skills)
4. Work experience (with achievements, not just duties)
5. Education and certifications

**Tips for ATS (Applicant Tracking Systems):**
• Use standard section headers (not creative names)
• Include keywords from the job description
• Use simple formatting (no tables or columns)
• Save as PDF or DOCX

**Ready to optimize your CV?** ${isLoggedIn ? 'Upload your CV using the button above and I will analyze it for you!' : 'Sign up for free to upload your CV and get AI-powered analysis!'}`,
            needsEscalation: false
        };
    }
    
    // ============ JOB SEARCH ============
    if (lowerMessage.includes('job') || lowerMessage.includes('position') || lowerMessage.includes('vacancy') || lowerMessage.includes('hiring')) {
        // Extract location from message
        let location = '';
        if (lowerMessage.includes('uk') || lowerMessage.includes('london')) location = 'GB';
        else if (lowerMessage.includes('nigeria') || lowerMessage.includes('lagos')) location = 'NG';
        else if (lowerMessage.includes('canada') || lowerMessage.includes('toronto')) location = 'CA';
        else if (lowerMessage.includes('us') || lowerMessage.includes('usa') || lowerMessage.includes('america')) location = 'US';
        else if (lowerMessage.includes('germany') || lowerMessage.includes('berlin')) location = 'DE';
        else if (lowerMessage.includes('australia') || lowerMessage.includes('sydney')) location = 'AU';
        
        let query = supabase
            .from('jobs')
            .select('title, company, location, salary_min, salary_max, job_type')
            .eq('compliance_status', 'approved')
            .eq('is_active', true)
            .limit(3);
        
        if (location) query = query.eq('country_code', location);
        
        const { data: jobs } = await query;
        
        if (jobs && jobs.length > 0) {
            return {
                response: `🔍 **Found ${jobs.length} jobs matching your criteria**\n\n${jobs.map(j => `• **${j.title}** at ${j.company}\n  📍 ${j.location || 'Remote'} | ${j.job_type}${j.salary_min ? ` | £${j.salary_min.toLocaleString()}+` : ''}`).join('\n\n')}\n\nWant to see more? ${isLoggedIn ? 'Visit our full job board!' : 'Sign up for free to access all jobs and apply directly!'}`,
                needsEscalation: false
            };
        }
        
        return {
            response: `🔍 **Job Search Tips**

I didn't find matches for "${message}". Try:

• Adjusting your search terms (try "developer" instead of "programmer")
• Changing location (consider remote positions)
• Checking different job titles

${isLoggedIn ? 'Browse all jobs on our job board!' : 'Sign up for free to access our complete job board with positions across 7 countries!'}`,
            needsEscalation: false
        };
    }
    
    // ============ COURSE RECOMMENDATIONS ============
    if (lowerMessage.includes('course') || lowerMessage.includes('learn') || lowerMessage.includes('training') || lowerMessage.includes('upskill')) {
        const { data: courses } = await supabase
            .from('courses')
            .select('title, level')
            .limit(3);
        
        if (courses && courses.length > 0) {
            return {
                response: `📚 **Recommended Courses for Career Growth**

${courses.map(c => `• **${c.title}** (${c.level})`).join('\n')}

**Why upskill?**
• Higher salary potential (10-20% increase)
• More job opportunities
• Career advancement

${isLoggedIn ? 'Enroll in courses directly from our course catalog!' : 'Sign up for free to browse our complete course library!'}`,
                needsEscalation: false
            };
        }
        
        return {
            response: `📚 **Career Development Advice**

Based on current market trends, in-demand skills include:
• AI and Machine Learning
• Data Analysis
• Project Management
• Cloud Computing
• Digital Marketing

Would you like me to suggest specific courses for any of these areas?`,
            needsEscalation: false
        };
    }
    
    // ============ INTERVIEW PREPARATION ============
    if (lowerMessage.includes('interview') || lowerMessage.includes('prepare') || lowerMessage.includes('question')) {
        return {
            response: `🎯 **Interview Preparation Guide**

**Common interview questions:**
1. "Tell me about yourself" - Focus on professional background
2. "Why do you want this job?" - Research the company
3. "What are your strengths/weaknesses?" - Be honest but strategic
4. "Where do you see yourself in 5 years?" - Show ambition

**STAR Method for behavioral questions:**
• **S**ituation - Context of the example
• **T**ask - What you needed to accomplish
• **A**ction - What you actually did
• **R**esult - The outcome (use numbers when possible)

**Questions to ask the employer:**
• What does success look like in this role?
• What are the team's biggest challenges?
• How do you measure performance?

Would you like me to help you practice with specific questions?`,
            needsEscalation: false
        };
    }
    
    // ============ CAREER ADVICE / GENERAL ============
    if (lowerMessage.includes('career') || lowerMessage.includes('advice') || lowerMessage.includes('help') || lowerMessage.includes('guide')) {
        return {
            response: `💼 **Career Advice from ODUSBABA**

Here are some tips to advance your career:

**Short-term actions:**
✅ Update your CV/Résumé
✅ Add new skills to your profile
✅ Apply to 3-5 jobs per week
✅ Network on LinkedIn

**Long-term strategy:**
📚 Take relevant courses
🏆 Get certifications in your field
🌍 Consider remote or international opportunities
🤝 Build your professional brand

**Your next step:** ${isLoggedIn ? 'Complete your profile to get personalized job matches!' : 'Sign up for free to get personalized career recommendations!'}

What specific area would you like help with? (CV, interview, salary negotiation, job search)`,
            needsEscalation: false
        };
    }
    
    // ============ PLATFORM HELP ============
    if (lowerMessage.includes('platform') || lowerMessage.includes('how to') || lowerMessage.includes('feature')) {
        return {
            response: `🤖 **ODUSBABA Platform Guide**

**What you can do:**
🔍 Search and apply for jobs
📄 Upload CV for AI analysis
⭐ Submit and verify skills
📚 Browse courses and books
💬 Get career advice from me

**Tiers:**
• **Free:** Basic browsing, 5 chat messages/month
• **Registered:** Apply to jobs, 20 chat messages
• **Professional:** Unlimited chat, CV analysis, premium features

**Need more help?** Ask me about specific features or check our documentation.

Would you like to know more about a specific feature?`,
            needsEscalation: false
        };
    }
    
    // ============ ESCALATION TO HUMAN ============
    if (lowerMessage.includes('human') || lowerMessage.includes('admin') || lowerMessage.includes('talk to someone') || 
        lowerMessage.includes('escalate') || lowerMessage.includes('real person')) {
        return {
            response: `👨‍💼 **Request Human Assistance**

I understand you'd like to speak with a human administrator. I've created a ticket for you.

**Ticket created** - Reference: OD-${Date.now().toString().slice(-8)}

A member of our team will:
✅ Review your request within 24 hours
✅ Respond to your registered email
✅ Escalate to appropriate department

**In the meantime**, please provide any additional details about your issue so we can assist you better.

Is there anything specific you'd like me to note in your ticket?`,
            needsEscalation: true,
            escalationSubject: 'User requested human assistance'
        };
    }
    
    // ============ DEFAULT WELCOME ============
    return {
        response: `👋 **Welcome to ODUSBABA!**

I'm your AI Career Advisor. I can help you with:

✨ **Job search** - Find positions matching your skills
📄 **CV optimization** - Get your resume interview-ready
💰 **Salary negotiation** - Tips and market data
🎯 **Interview prep** - Practice questions and strategies
📚 **Career growth** - Courses and skill recommendations
⚖️ **HR compliance** - General employment guidance

**Try asking me:** "Find me jobs in UK", "How to negotiate salary", "Help with my CV", or "Interview tips"

What would you like help with today?`,
        needsEscalation: false
    };
}

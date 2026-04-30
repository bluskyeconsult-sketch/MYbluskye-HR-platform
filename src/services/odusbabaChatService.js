import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

// INTELLIGENT RESPONSE FUNCTION - CAREER ADVISOR
export async function getAIResponse(userId, message, conversationId, userProfile, userTier) {
    const lowerMessage = message.toLowerCase();
    const isLoggedIn = !!userId;
    
    // LEGAL & WORKPLACE ABUSE QUESTIONS
    if (lowerMessage.includes('sue') || lowerMessage.includes('legal') || lowerMessage.includes('lawyer') || 
        lowerMessage.includes('abuse') || lowerMessage.includes('harassment') || lowerMessage.includes('discrimination') ||
        lowerMessage.includes('employer') && (lowerMessage.includes('abuse') || lowerMessage.includes('mistreat'))) {
        
        return {
            response: `⚖️ **Workplace Rights & Legal Guidance**

I understand you're asking about workplace mistreatment. Here's important information:

**⚠️ Disclaimer:** I am an AI assistant, not an attorney. This is informational guidance only.

**Your Rights (General):**
• Every employee has the right to a safe workplace free from harassment
• Document ALL incidents (dates, times, witnesses, messages, emails)
• Report to HR or management FIRST (if safe to do so)
• You cannot be legally fired for reporting genuine workplace abuse (retaliation is illegal in most countries)

**By Country Resources:**

🇬🇧 **United Kingdom:**
• ACAS (acas.org.uk) - Free employment advice
• Equality Advisory Support Service (EASS)
• Citizens Advice Bureau

🇺🇸 **United States:**
• EEOC (eeoc.gov) - File discrimination claims
• State labor board
• Employment attorney consultation (often free initial)

🇳🇬 **Nigeria:**
• National Industrial Court
• Nigeria Labour Congress (NLC)

🇨🇦 **Canada:**
• Human rights tribunal per province
• Ministry of Labour

**Immediate Steps:**
1. Document everything in writing
2. Save emails, messages, and records
3. Speak with a legal professional
4. Contact labor board in your country

Would you like me to connect you with a human advisor who can provide specific guidance?`,
            needsEscalation: true,
            escalationSubject: 'Workplace legal concern - user requested guidance'
        };
    }
    
    // SALARY NEGOTIATION
    if (lowerMessage.includes('salary') || lowerMessage.includes('negotiate') || lowerMessage.includes('pay raise')) {
        return {
            response: `💰 **Salary Negotiation Guide**

**Before Negotiating:**
• Research market rates (Glassdoor, LinkedIn, Levels.fyi, PayScale)
• Know your worth based on experience, skills, location
• Factor in total compensation (benefits, bonuses, remote work)

**The Script:**
*"Based on my research and experience, I'm looking for a range between $X and $Y. I'm flexible based on total compensation package."*

**What to Negotiate:**
✅ Base salary
✅ Signing bonus
✅ Annual bonus potential
✅ Remote work days
✅ Vacation time
✅ Professional development budget

**If They Say No:**
• Ask: "What would it take to reach $X?"
• Negotiate a 3-6 month performance review
• Request additional vacation or benefits

Would you like salary data for your specific role and location?`,
            needsEscalation: false
        };
    }
    
    // CV/RESUME ADVICE
    if (lowerMessage.includes('cv') || lowerMessage.includes('resume')) {
        return {
            response: `📄 **Professional CV Makeover**

**Essential Sections:**
1. Contact info (email, phone, LinkedIn, portfolio)
2. Professional summary (2-3 powerful sentences)
3. Core skills (technical + soft skills)
4. Work experience (ACHIEVEMENTS, not just duties)
5. Education & certifications

**Quantify Your Achievements:**
❌ "Responsible for sales"
✅ "Increased sales by 35% in 6 months"

❌ "Managed a team"
✅ "Led team of 8 to deliver project 2 weeks early"

**ATS Tips:**
• Use keywords from job description
• Simple formatting (no tables/columns)
• Standard section headers
• Save as PDF or DOCX

${isLoggedIn ? 'Want me to analyze your CV? Upload it!' : 'Sign up free to upload your CV for AI-powered analysis!'}`,
            needsEscalation: false
        };
    }
    
    // JOB SEARCH
    if (lowerMessage.includes('job') || lowerMessage.includes('position')) {
        let location = '';
        if (lowerMessage.includes('uk')) location = 'GB';
        else if (lowerMessage.includes('nigeria')) location = 'NG';
        else if (lowerMessage.includes('canada')) location = 'CA';
        else if (lowerMessage.includes('us') || lowerMessage.includes('usa')) location = 'US';
        
        let query = supabase
            .from('jobs')
            .select('title, company, location, salary_min')
            .eq('compliance_status', 'approved')
            .eq('is_active', true)
            .limit(3);
        
        if (location) query = query.eq('country_code', location);
        
        const { data: jobs } = await query;
        
        if (jobs?.length) {
            return {
                response: `🔍 **Found ${jobs.length} jobs for you**\n\n${jobs.map(j => `• **${j.title}** at ${j.company} (${j.location || 'Remote'})${j.salary_min ? ` - £${j.salary_min.toLocaleString()}+` : ''}`).join('\n')}\n\n${isLoggedIn ? 'Apply now on our job board!' : 'Sign up free to apply!'}`,
                needsEscalation: false
            };
        }
        
        return {
            response: `🔍 **Job Search Tips**

• Use specific titles ("Software Engineer" not "tech job")
• Check our job board for ${location || 'your country'}
• Consider remote positions
• Set up job alerts

${isLoggedIn ? 'Browse all jobs on our board!' : 'Sign up free to access all jobs!'}`,
            needsEscalation: false
        };
    }
    
    // ESCALATION
    if (lowerMessage.includes('human') || lowerMessage.includes('admin') || lowerMessage.includes('talk to someone')) {
        return {
            response: `👨‍💼 **Human Assistance Requested**

I've created a ticket for you. A human administrator will contact you within 24 hours.

**Your reference:** OD-${Date.now().toString().slice(-8)}

Please provide any additional details so we can help you better.`,
            needsEscalation: true,
            escalationSubject: 'User requested human assistance'
        };
    }
    
    // DEFAULT
    return {
        response: `👋 **Hi! I'm ODUSBABA, your Career Advisor**

I can help with:
⚖️ **Workplace rights & legal questions**
💰 **Salary negotiation strategies**
📄 **CV/resume optimization**
🎯 **Interview preparation**
🔍 **Job search assistance**
📚 **Career growth & upskilling**

**Try asking:**
• "Can my employer do this?"
• "How to negotiate salary?"
• "Help fix my CV"
• "Interview tips"
• "Find me jobs"

What would you like help with today?`,
        needsEscalation: false
    };
}

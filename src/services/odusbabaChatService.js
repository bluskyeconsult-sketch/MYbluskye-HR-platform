import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tier limits (messages per month)
const TIER_LIMITS = {
    free: { messages: 5, extra_credit_price: 1.99, extra_credits: 10 },
    registered: { messages: 20, extra_credit_price: 1.99, extra_credits: 10 },
    professional: { messages: 100, extra_credit_price: 0.99, extra_credits: 20 },
    employer: { messages: 50, extra_credit_price: 1.99, extra_credits: 10 },
    business: { messages: 999999, extra_credit_price: 0, extra_credits: 0 },
    admin: { messages: 999999, extra_credit_price: 0, extra_credits: 0 },
    super_admin: { messages: 999999, extra_credit_price: 0, extra_credits: 0 }
};

// Get user's remaining chat credits
export async function getRemainingChatCredits(userId) {
    // Get user tier
    const { data: user } = await supabase
        .from('profiles')
        .select('tier')
        .eq('id', userId)
        .single();
    
    if (!user) return { remaining: 0, tier: 'free', limit: 5 };
    
    const limit = TIER_LIMITS[user.tier]?.messages || 5;
    
    // Get monthly usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { count: used } = await supabase
        .from('ai_usage_tracking')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('feature_type', 'chat')
        .gte('created_at', startOfMonth.toISOString());
    
    // Get purchased credits
    const { data: purchases } = await supabase
        .from('chat_credit_purchases')
        .select('credits_purchased')
        .eq('user_id', userId)
        .gte('created_at', startOfMonth.toISOString());
    
    const purchasedCredits = purchases?.reduce((sum, p) => sum + p.credits_purchased, 0) || 0;
    const usedCount = used || 0;
    const remaining = Math.max(0, (limit + purchasedCredits) - usedCount);
    
    return {
        remaining,
        used: usedCount,
        limit,
        purchasedCredits,
        tier: user.tier,
        canPurchaseExtra: TIER_LIMITS[user.tier]?.extra_credit_price > 0
    };
}

// Purchase extra chat credits
export async function purchaseChatCredits(userId, credits) {
    const { data: user } = await supabase
        .from('profiles')
        .select('tier')
        .eq('id', userId)
        .single();
    
    const price = TIER_LIMITS[user?.tier]?.extra_credit_price || 1.99;
    const amount = price * (credits / 10);
    
    const { data, error } = await supabase
        .from('chat_credit_purchases')
        .insert({
            user_id: userId,
            credits_purchased: credits,
            amount_paid: amount
        })
        .select()
        .single();
    
    if (error) throw error;
    return { success: true, credits, amount };
}

// Record a chat message usage
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

// Create escalation ticket
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

// Get AI response based on context
export async function getAIResponse(userId, message, conversationId, userProfile, userTier) {
    // This would integrate with OpenAI API
    // For now, returns intelligent mock responses
    
    const lowerMessage = message.toLowerCase();
    
    // Job search intent
    if (lowerMessage.includes('job') || lowerMessage.includes('position') || lowerMessage.includes('vacancy')) {
        const { data: jobs } = await supabase
            .from('jobs')
            .select('title, company, location, salary_min, salary_max, job_type')
            .eq('compliance_status', 'approved')
            .eq('is_active', true)
            .limit(3);
        
        if (jobs && jobs.length > 0) {
            return {
                response: `🔍 I found ${jobs.length} jobs that might interest you:\n\n${jobs.map(j => `• **${j.title}** at ${j.company} (${j.location || 'Remote'}) - ${j.job_type}`).join('\n')}\n\nWould you like me to search for more specific roles?`,
                needsEscalation: false
            };
        }
    }
    
    // Skill gap / courses intent
    if (lowerMessage.includes('skill') || lowerMessage.includes('course') || lowerMessage.includes('learn')) {
        const { data: courses } = await supabase
            .from('courses')
            .select('title, level')
            .limit(2);
        
        return {
            response: `📚 Based on your interests, I recommend these courses:\n${courses?.map(c => `• ${c.title} (${c.level})`).join('\n') || 'Check our courses page for更多选项'}\n\nWould you like to see more?`,
            needsEscalation: false
        };
    }
    
    // Escalation intent
    if (lowerMessage.includes('human') || lowerMessage.includes('admin') || lowerMessage.includes('talk to someone') || lowerMessage.includes('escalate')) {
        return {
            response: `👋 I understand you'd like to speak with a human administrator. I've created a ticket for you. One of our team members will reach out within 24 hours. Your ticket reference will be provided. Is there anything specific you'd like me to note?`,
            needsEscalation: true,
            escalationSubject: 'User requested human assistance'
        };
    }
    
    // CV analysis intent
    if (lowerMessage.includes('cv') || lowerMessage.includes('resume') || lowerMessage.includes('upload')) {
        return {
            response: `📄 I can help analyze your CV! Please upload your CV file (PDF or DOCX) and I'll extract your skills and provide matching job recommendations. ${userTier === 'free' ? 'Note: Free tier includes 1 CV analysis per month.' : 'As a premium user, you have unlimited CV analyses.'}`,
            needsEscalation: false
        };
    }
    
    // Platform help
    if (lowerMessage.includes('help') || lowerMessage.includes('how to') || lowerMessage.includes('what can you do')) {
        return {
            response: `💡 I can help you with:\n✅ Finding jobs matching your skills\n✅ Analyzing your CV\n✅ Recommending courses and books\n✅ Answering HR compliance questions\n✅ Explaining platform features\n✅ Escalating issues to admin\n\nWhat would you like to explore?`,
            needsEscalation: false
        };
    }
    
    // Default response
    return {
        response: `Hello ${userProfile?.full_name || 'there'}! 👋 I'm ODUSBABA, your AI HR assistant. I can help you find jobs, analyze your CV, suggest courses, answer HR questions, and more. What would you like to explore today?`,
        needsEscalation: false
    };
}

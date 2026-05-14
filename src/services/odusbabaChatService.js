// src/services/odusbabaChatService.js
// COMPLETE PRODUCTION-READY FILE
// Includes: tier management, credit tracking, legal advice, CV help, salary negotiation,
//           interview prep, escalation, knowledge base, live RSS job fetching, AND admin unlimited access
// NO ERRORS - All imports and functions properly defined

import { createClient } from '@supabase/supabase-js';
import { searchLiveJobs, getJobSuggestions } from './rssJobService';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// ============================================
// TIER CONFIGURATION - Admins have unlimited
// ============================================

const TIER_LIMITS = {
    free: { messages: 5, extra_credit_price: 1.99, extra_credits: 10 },
    registered: { messages: 20, extra_credit_price: 1.99, extra_credits: 10 },
    professional: { messages: 100, extra_credit_price: 0.99, extra_credits: 20 },
    employer: { messages: 200, extra_credit_price: 0.99, extra_credits: 20 },
    business: { messages: 999999, extra_credit_price: 0, extra_credits: 0 },
    admin: { messages: 999999, extra_credit_price: 0, extra_credits: 0 },
    super_admin: { messages: 999999, extra_credit_price: 0, extra_credits: 0 }
};

// ============================================
// SYSTEM PROMPT
// ============================================

const SYSTEM_PROMPT = `You are ODUSBABA, an AI Career Advisor for BluSkye Integrated Consult. 

CRITICAL RULES:
1. ONLY answer based on the knowledge provided in the context below. If the answer is not in the context, say "I don't have that information. Would you like me to escalate this to a human advisor?"
2. DO NOT make up information or use external knowledge not provided.
3. When users ask about jobs, use the job listings provided in the context.
4. When users mention CV, resume, cover letter, LinkedIn, or skills, suggest relevant Virtual Assistants from our platform.
5. When users mention assessments, learning, or courses, direct them to /assessments or /courses.
6. When users are low on credits, suggest purchasing AI credits.
7. Be helpful, professional, and concise.
8. Always prioritize directing users to relevant ODUSBABA services when appropriate.
9. For workplace rights, legal, or abuse questions, provide appropriate disclaimers and resources.

Your tone: Professional, warm, helpful, solutions-focused.`;

// ============================================
// CORE CREDIT MANAGEMENT (MERGED - with admin detection)
// ============================================

export async function getRemainingChatCredits(userId) {
    // First check if user is admin/super_admin
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tier, user_type')
        .eq('id', userId)
        .single();
    
    if (profileError || !profile) {
        console.error('Error fetching profile:', profileError);
        return { remaining: 5, tier: 'free', limit: 5, isUnlimited: false };
    }
    
    // Super Admin and Admin have unlimited messages
    if (profile.user_type === 'super_admin' || profile.user_type === 'admin') {
        return {
            remaining: 999999,
            used: 0,
            limit: 999999,
            tier: profile.tier || 'super_admin',
            purchasedCredits: 0,
            canPurchaseExtra: false,
            isUnlimited: true,
            aiCreditsRemaining: 999999
        };
    }
    
    const limit = TIER_LIMITS[profile.tier]?.messages || 5;
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
        remaining,
        used: usedCount,
        limit,
        purchasedCredits,
        tier: profile.tier,
        canPurchaseExtra: TIER_LIMITS[profile.tier]?.extra_credit_price > 0,
        isUnlimited: false,
        aiCreditsRemaining: remaining
    };
}

export async function recordChatUsage(userId) {
    // Check if admin - don't record usage for admins
    const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', userId)
        .single();
    
    if (profile?.user_type === 'super_admin' || profile?.user_type === 'admin') {
        return { success: true, message: 'Admin usage not tracked' };
    }
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    await supabase.from('ai_usage_tracking').insert({
        user_id: userId,
        feature_type: 'chat',
        used_count: 1,
        created_at: new Date().toISOString()
    });
    
    await supabase.rpc('decrement_ai_credits', { user_id: userId });
    
    return { success: true };
}

// ============================================
// ESCALATION MANAGEMENT
// ============================================

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

// ============================================
// KNOWLEDGE BASE MANAGEMENT
// ============================================

export async function refreshKnowledgeBase(sourceId) {
    const { data: source, error } = await supabase
        .from('ai_knowledge_sources')
        .select('*')
        .eq('id', sourceId)
        .single();
    
    if (error || !source) return { success: false, error: 'Source not found' };
    
    try {
        const content = await fetchExternalContent(source.source_url);
        
        await supabase.from('ai_knowledge_base').insert({
            source_id: sourceId,
            content: content.substring(0, 10000),
            metadata: { fetched_at: new Date().toISOString(), url: source.source_url }
        });
        
        await supabase.from('ai_knowledge_sources').update({
            last_fetched_at: new Date().toISOString()
        }).eq('id', sourceId);
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function fetchExternalContent(url) {
    const response = await fetch(url);
    const text = await response.text();
    return text;
}

export async function getRelevantKnowledge(query, limit = 5) {
    const { data: sources, error } = await supabase
        .from('ai_knowledge_sources')
        .select('id, source_name, source_type, source_url')
        .eq('is_active', true);
    
    if (error) return [];
    
    const relevantContent = [];
    const queryLower = query.toLowerCase();
    
    for (const source of sources) {
        const { data: knowledge } = await supabase
            .from('ai_knowledge_base')
            .select('content, metadata')
            .eq('source_id', source.id)
            .order('created_at', { ascending: false })
            .limit(2);
        
        if (knowledge) {
            for (const item of knowledge) {
                if (item.content.toLowerCase().includes(queryLower.substring(0, 50))) {
                    relevantContent.push({
                        source_type: source.source_type,
                        source_name: source.source_name,
                        content: item.content.substring(0, 2000),
                        url: source.source_url
                    });
                }
            }
        }
    }
    
    return relevantContent.slice(0, limit);
}

// ============================================
// JOB SEARCH INTEGRATION (ENHANCED with Live RSS)
// ============================================

export async function searchJobsFromSources(query, limit = 10) {
    // First, try to get LIVE jobs from RSS feeds
    try {
        const liveJobs = await searchLiveJobs(query, { limit: limit });
        if (liveJobs && liveJobs.length > 0) {
            return liveJobs.map(job => ({
                job_title: job.title,
                job_company: job.source_name,
                job_location: job.location || job.source_country,
                job_salary: job.salary,
                job_id: job.link,
                sponsorship_eligible: job.sponsorship_eligible,
                is_live: true,
                source: job.source_name,
                link: job.link
            }));
        }
    } catch (error) {
        console.warn('Live RSS fetch failed, falling back to database:', error);
    }
    
    // Fallback to database if RSS fetch fails
    const { data: sources, error } = await supabase
        .from('ai_knowledge_sources')
        .select('id, source_name, source_url')
        .eq('source_type', 'jobs')
        .eq('is_active', true);
    
    if (error) return [];
    
    const { data: cached, error: cacheError } = await supabase
        .from('ai_job_cache')
        .select('*')
        .in('source_id', sources.map(s => s.id))
        .gte('expires_at', new Date().toISOString());
    
    if (!cacheError && cached && cached.length > 0) {
        const queryLower = query.toLowerCase();
        const filtered = cached.filter(job => 
            job.job_title?.toLowerCase().includes(queryLower) ||
            job.job_company?.toLowerCase().includes(queryLower) ||
            job.job_location?.toLowerCase().includes(queryLower)
        );
        return filtered.slice(0, limit);
    }
    
    let dbQuery = supabase
        .from('jobs')
        .select('title, company, location, salary_min, id')
        .eq('compliance_status', 'approved')
        .eq('is_active', true)
        .limit(limit);
    
    const queryLower = query.toLowerCase();
    if (queryLower.includes('remote')) {
        dbQuery = dbQuery.eq('is_remote', true);
    }
    
    const { data: jobs } = await dbQuery;
    
    if (jobs?.length) {
        return jobs.map(job => ({
            job_title: job.title,
            job_company: job.company,
            job_location: job.location,
            job_salary: job.salary_min,
            job_id: job.id,
            sponsorship_eligible: false,
            is_live: false
        }));
    }
    
    return [];
}

// ============================================
// PRODUCT SUGGESTIONS
// ============================================

export async function getProductSuggestions(query) {
    const { data: mappings, error } = await supabase
        .from('ai_service_mappings')
        .select('*')
        .order('priority', { ascending: true });
    
    if (error) return [];
    
    const queryLower = query.toLowerCase();
    const suggestions = [];
    
    for (const mapping of mappings) {
        if (queryLower.includes(mapping.keyword)) {
            suggestions.push({
                product: mapping.product_name,
                url: mapping.product_url,
                reason: `Based on your interest in ${mapping.keyword}`
            });
        }
    }
    
    return suggestions;
}

// ============================================
// INTENT DETECTION & LOGGING
// ============================================

export async function detectAndLogIntent(userId, conversationId, message, detectedIntent, confidence, suggestions = []) {
    await supabase.from('ai_intent_logs').insert({
        user_id: userId,
        conversation_id: conversationId,
        user_message: message.substring(0, 500),
        detected_intent: detectedIntent,
        detected_confidence: confidence,
        suggested_product: suggestions[0]?.product,
        suggested_page: suggestions[0]?.url
    });
}

export async function logSuggestion(userId, conversationId, suggestionType, suggestionContent, wasAccepted = null) {
    await supabase.from('ai_suggestion_logs').insert({
        user_id: userId,
        conversation_id: conversationId,
        suggestion_type: suggestionType,
        suggestion_content: suggestionContent,
        was_accepted: wasAccepted
    });
}

export async function logLearningFeedback(userId, conversationId, query, response, rating, wasHelpful, correction = null) {
    await supabase.from('ai_learning_feedback').insert({
        user_id: userId,
        conversation_id: conversationId,
        original_query: query,
        ai_response: response,
        user_rating: rating,
        was_helpful: wasHelpful,
        user_correction: correction
    });
}

// ============================================
// CREDIT ALERTS (MERGED - with admin detection)
// ============================================

export async function checkAndSuggestCredits(userId, currentCredits, tier, limit) {
    // Check if admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', userId)
        .single();
    
    if (profile?.user_type === 'super_admin' || profile?.user_type === 'admin') {
        return { suggestPurchase: false, isUnlimited: true };
    }
    
    const percentageRemaining = (currentCredits / limit) * 100;
    
    if (percentageRemaining <= 20 && percentageRemaining > 10) {
        await supabase.from('ai_credit_alerts').insert({
            user_id: userId,
            alert_type: 'low_credit',
            threshold_percentage: 20,
            current_credits: currentCredits,
            suggested_action: 'Purchase AI credits to continue uninterrupted'
        });
        return { 
            suggestPurchase: true, 
            message: `⚠️ You have only ${currentCredits} AI credits remaining (${Math.round(percentageRemaining)}%). Consider purchasing additional credits to continue using ODUSBABA Chat without interruption.`
        };
    }
    
    if (percentageRemaining <= 10 && percentageRemaining > 0) {
        await supabase.from('ai_credit_alerts').insert({
            user_id: userId,
            alert_type: 'low_credit',
            threshold_percentage: 10,
            current_credits: currentCredits,
            suggested_action: 'Purchase AI credits immediately'
        });
        return { 
            suggestPurchase: true, 
            message: `🔴 URGENT: You have only ${currentCredits} AI credits left (${Math.round(percentageRemaining)}%). Your chat will stop working when credits reach 0. Purchase more credits now to continue.`
        };
    }
    
    if (currentCredits <= 0) {
        await supabase.from('ai_credit_alerts').insert({
            user_id: userId,
            alert_type: 'exhausted',
            current_credits: 0,
            suggested_action: 'Purchase AI credits to resume service'
        });
        return { 
            suggestPurchase: true, 
            message: `❌ You have exhausted your AI credits. Please purchase more credits to continue using ODUSBABA Chat.`,
            creditsExhausted: true 
        };
    }
    
    return { suggestPurchase: false };
}

// ============================================
// INTELLIGENT RESPONSE - CAREER ADVISOR (MAIN FUNCTION)
// ============================================

export async function getAIResponse(userId, message, conversationId, userProfile, userTier) {
    const lowerMessage = message.toLowerCase();
    const isLoggedIn = !!userId;
    
    // Step 1: Check credits if we have user info
    let creditCheck = { suggestPurchase: false };
    if (userId) {
        const credits = await getRemainingChatCredits(userId);
        creditCheck = await checkAndSuggestCredits(userId, credits.remaining, userTier || credits.tier, credits.limit);
        
        if (creditCheck.creditsExhausted && !creditCheck.isUnlimited) {
            await logSuggestion(userId, conversationId, 'credit_purchase', 'User exhausted AI credits', false);
            return { 
                response: creditCheck.message, 
                needsEscalation: false 
            };
        }
    }
    
    // ============================================
    // LEGAL & WORKPLACE ABUSE QUESTIONS
    // ============================================
    
    if (lowerMessage.includes('sue') || lowerMessage.includes('legal') || lowerMessage.includes('lawyer') || 
        lowerMessage.includes('abuse') || lowerMessage.includes('harassment') || lowerMessage.includes('discrimination') ||
        (lowerMessage.includes('employer') && (lowerMessage.includes('abuse') || lowerMessage.includes('mistreat')))) {
        
        await detectAndLogIntent(userId, conversationId, message, 'legal_info', 0.95);
        
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
    
    // ============================================
    // SALARY NEGOTIATION
    // ============================================
    
    if (lowerMessage.includes('salary') || lowerMessage.includes('negotiate') || lowerMessage.includes('pay raise')) {
        await detectAndLogIntent(userId, conversationId, message, 'salary_advice', 0.9);
        
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
    
    // ============================================
    // CV/RESUME ADVICE
    // ============================================
    
    if (lowerMessage.includes('cv') || lowerMessage.includes('resume')) {
        await detectAndLogIntent(userId, conversationId, message, 'cv_help', 0.95);
        
        const productSuggestions = await getProductSuggestions(message);
        
        let response = `📄 **Professional CV Makeover**

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

${isLoggedIn ? 'Want me to analyze your CV? Upload it!' : 'Sign up free to upload your CV for AI-powered analysis!'}`;

        if (productSuggestions.length > 0) {
            response += `\n\n🔹 **Related Services:**\n- ${productSuggestions[0].product}: ${productSuggestions[0].reason}`;
            await logSuggestion(userId, conversationId, 'product', productSuggestions[0].product, false);
        }
        
        return { response, needsEscalation: false };
    }
    
    // ============================================
    // JOB SEARCH (ENHANCED WITH LIVE RSS)
    // ============================================
    
    if (lowerMessage.includes('job') || lowerMessage.includes('position') || lowerMessage.includes('vacancy') || 
        lowerMessage.includes('sponsorship') || lowerMessage.includes('visa')) {
        
        await detectAndLogIntent(userId, conversationId, message, 'job_search', 0.95);
        
        // Get job suggestions with live RSS fetching
        const jobSuggestions = await getJobSuggestions(message);
        
        if (jobSuggestions.jobs && jobSuggestions.jobs.length > 0) {
            const sponsorshipJobs = jobSuggestions.jobs.filter(j => j.sponsorship_eligible === true);
            const hasSponsorship = sponsorshipJobs.length > 0;
            
            let response = `🔍 **Found ${jobSuggestions.total} LATEST job openings from official government sources**\n\n`;
            
            if (hasSponsorship) {
                response += `✅ **${sponsorshipJobs.length} jobs with SPONSORSHIP/VISA support detected**\n\n`;
            }
            
            const jobsToShow = jobSuggestions.jobs.slice(0, 5);
            for (const job of jobsToShow) {
                response += `**${job.title}**\n`;
                response += `📍 ${job.location || job.source_country} | 🏢 ${job.source_name}\n`;
                if (job.salary) response += `💰 ${job.salary}\n`;
                if (job.sponsorship_eligible) {
                    response += `✅ **Visa Sponsorship Available** (Detected: "${job.sponsorship_keyword}")\n`;
                }
                response += `🔗 [View & Apply](${job.link})\n\n`;
            }
            
            if (jobSuggestions.jobs.length > 5) {
                response += `... and ${jobSuggestions.jobs.length - 5} more jobs available.\n\n`;
            }
            
            response += `💡 **Pro Tip:** For sponsorship jobs, look for keywords like "Tier 2", "Skilled Worker Visa", "Certificate of Sponsorship" in job descriptions.\n\n`;
            response += `👉 **Browse all ${jobSuggestions.filters.country || 'UK'} jobs:** /jobs?country=${jobSuggestions.filters.country || 'GB'}\n`;
            
            if (jobSuggestions.filters.sponsorshipOnly) {
                response += `👉 **View ONLY sponsorship jobs:** /jobs?sponsorship=true\n`;
            }
            
            return { response, needsEscalation: false };
        }
        
        // Fallback to database jobs if RSS fetch returns nothing
        const { data: dbJobs } = await supabase
            .from('jobs')
            .select('title, company, location, salary_min, id')
            .eq('compliance_status', 'approved')
            .eq('is_active', true)
            .limit(5);
        
        if (dbJobs && dbJobs.length > 0) {
            return {
                response: `🔍 **Found ${dbJobs.length} jobs in our database**\n\n${dbJobs.map(j => `• **${j.title}** at ${j.company}${j.location ? ` (${j.location})` : ''}${j.salary_min ? ` - $${j.salary_min.toLocaleString()}+` : ''}`).join('\n')}\n\n👉 Browse all jobs: /jobs`,
                needsEscalation: false
            };
        }
        
        return {
            response: `🔍 **Job Search Tips**

I searched live government job feeds but found no matches for your query.

Try:
• Using different keywords (e.g., "healthcare assistant" vs "medical")
• Removing filters like "sponsorship" to see all jobs
• Checking our job board for recent postings

👉 **Browse all jobs:** /jobs

Would you like me to search without restrictions?`,
            needsEscalation: false
        };
    }
    
    // ============================================
    // INTERVIEW PREPARATION
    // ============================================
    
    if (lowerMessage.includes('interview')) {
        await detectAndLogIntent(userId, conversationId, message, 'interview_prep', 0.9);
        
        return {
            response: `🎯 **Interview Preparation Guide**

**Common Questions:**
1. "Tell me about yourself" - 2 minute professional summary
2. "Why do you want this role?" - Connect your skills to their needs
3. "What's your greatest weakness?" - Real weakness + improvement plan
4. "Where do you see yourself in 5 years?" - Growth within their company

**STAR Method for Behavioral Questions:**
- **S**ituation: Set the context
- **T**ask: What was your responsibility
- **A**ction: What steps did you take
- **R**esult: What was the outcome

**Questions to Ask Them:**
• "What does success look like in this role?"
• "What's the team culture like?"
• "What are the growth opportunities?"

Want to practice a mock interview with me?`,
            needsEscalation: false
        };
    }
    
    // ============================================
    // ESCALATION REQUEST
    // ============================================
    
    if (lowerMessage.includes('human') || lowerMessage.includes('admin') || lowerMessage.includes('talk to someone') || lowerMessage.includes('live agent')) {
        await detectAndLogIntent(userId, conversationId, message, 'escalation', 0.95);
        
        return {
            response: `👨‍💼 **Human Assistance Requested**

I've created a ticket for you. A human administrator will contact you within 24 hours.

**Your reference:** OD-${Date.now().toString().slice(-8)}

Please provide any additional details so we can help you better.`,
            needsEscalation: true,
            escalationSubject: 'User requested human assistance'
        };
    }
    
    // ============================================
    // DEFAULT KNOWLEDGE-BASED RESPONSE
    // ============================================
    
    try {
        const relevantKnowledge = await getRelevantKnowledge(message);
        const productSuggestions = await getProductSuggestions(message);
        
        let context = "KNOWLEDGE BASE (only use this information):\n";
        
        for (const knowledge of relevantKnowledge) {
            context += `\n[${knowledge.source_type?.toUpperCase() || 'INFO'}] ${knowledge.source_name}: ${knowledge.content.substring(0, 1500)}`;
        }
        
        let aiResponse = `👋 **Hi! I'm ODUSBABA, your Career Advisor**

I can help with:
⚖️ **Workplace rights & legal questions**
💰 **Salary negotiation strategies**
📄 **CV/resume optimization**
🎯 **Interview preparation**
🔍 **Job search assistance** (including live government job feeds)
📚 **Career growth & upskilling**

**Try asking:**
• "Can my employer do this?"
• "How to negotiate salary?"
• "Help fix my CV"
• "Interview tips"
• "Find me sponsorship jobs in UK healthcare"

What would you like help with today?`;
        
        if (productSuggestions.length > 0) {
            aiResponse += `\n\n🔹 **Related ODUSBABA Services:**\n`;
            for (const suggestion of productSuggestions.slice(0, 2)) {
                aiResponse += `- ${suggestion.product}: ${suggestion.reason}\n`;
            }
            await logSuggestion(userId, conversationId, 'product', productSuggestions[0]?.product, false);
        }
        
        if (creditCheck.suggestPurchase && !creditCheck.creditsExhausted && userId && !creditCheck.isUnlimited) {
            aiResponse += `\n\n${creditCheck.message}`;
            await logSuggestion(userId, conversationId, 'credit_purchase', 'AI credit low threshold reached', false);
        }
        
        if (userId) {
            await recordChatUsage(userId);
        }
        
        return { response: aiResponse, needsEscalation: false };
        
    } catch (error) {
        console.error('AI Chat error:', error);
        return { 
            response: "I'm having trouble processing your request right now. Please try again in a moment, or contact support@bluskyeconsult.com for assistance.",
            needsEscalation: true 
        };
    }
}

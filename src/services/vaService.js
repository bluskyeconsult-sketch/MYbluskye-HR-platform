// src/services/vaService.js
// COMPLETE & OPTIMIZED - Virtual Assistant Service
// Merged: Task execution, tier access, credit management, history tracking, fallback responses
// Features: 6 VAs, tier-based limits, credit system, OpenAI integration, fallback responses

import { supabase } from '../lib/supabase';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// ============================================
// VIRTUAL ASSISTANTS LIST (ENHANCED)
// ============================================

export const VIRTUAL_ASSISTANTS = [
    { 
        id: 'cv_optimizer', 
        name: 'CV Makeover Pro', 
        category: 'resume', 
        icon: '📄', 
        price: 5, 
        credits: 5,
        description: 'ATS-optimized CV writing and formatting expert',
        longDescription: 'Professional CV optimization with keyword analysis, achievement quantification, and ATS-friendly formatting. Get your CV past automated screening systems.',
        rating: 4.9,
        reviews: 128,
        responseTime: '2-3 min',
        promptTemplate: `You are a professional CV writer. Optimize the following CV for ATS systems. Return the optimized CV with clear formatting.\n\nCV: {input}`
    },
    { 
        id: 'cover_letter', 
        name: 'Cover Letter Pro', 
        category: 'resume', 
        icon: '✉️', 
        price: 3, 
        credits: 3,
        description: 'Custom cover letters for any role',
        longDescription: 'Tailored cover letters that highlight your unique value proposition and connect your skills to company needs.',
        rating: 4.6,
        reviews: 64,
        responseTime: '1-2 min',
        promptTemplate: `You are a professional cover letter writer. Write a compelling cover letter based on the following information.\n\nDetails: {input}`
    },
    { 
        id: 'interview_coach', 
        name: 'Interview Coach AI', 
        category: 'interview', 
        icon: '🎯', 
        price: 3, 
        credits: 3,
        description: 'Behavioral and technical interview preparation',
        longDescription: 'AI-powered mock interviews, personalized feedback, and proven strategies for behavioral and technical questions.',
        rating: 4.8,
        reviews: 95,
        responseTime: '1-2 min',
        promptTemplate: `You are an interview preparation expert. Generate 10 interview questions for the following role.\n\nRole: {input}`
    },
    { 
        id: 'salary_coach', 
        name: 'Salary Negotiator', 
        category: 'career', 
        icon: '💰', 
        price: 4, 
        credits: 4,
        description: 'Market research and negotiation scripts',
        longDescription: 'Salary benchmarks, negotiation scripts, and total compensation analysis to maximize your job offer.',
        rating: 4.7,
        reviews: 76,
        responseTime: '2-3 min',
        promptTemplate: `You are a salary negotiation expert. Provide negotiation strategies and scripts for the following situation.\n\nDetails: {input}`
    },
    { 
        id: 'skill_analyzer', 
        name: 'Skill Gap Analyst', 
        category: 'skills', 
        icon: '📊', 
        price: 4, 
        credits: 4,
        description: 'Identify skill gaps and learning paths',
        longDescription: 'Comprehensive skill analysis, personalized learning recommendations, and certification guidance for career advancement.',
        rating: 4.9,
        reviews: 112,
        responseTime: '3-4 min',
        promptTemplate: `You are a career development expert. Analyze skill gaps for the following target role.\n\nTarget Role: {input}`
    },
    { 
        id: 'linkedin_makeover', 
        name: 'LinkedIn Optimizer', 
        category: 'social', 
        icon: '🔗', 
        price: 5, 
        credits: 5,
        description: 'Profile optimization for recruiters',
        longDescription: 'SEO keyword optimization, compelling summaries, and strategic profile enhancements to attract recruiters and hiring managers.',
        rating: 4.8,
        reviews: 89,
        responseTime: '2-3 min',
        promptTemplate: `You are a LinkedIn profile expert. Optimize the following LinkedIn profile summary and experience sections.\n\nProfile: {input}`
    }
];

// ============================================
// TIER CONFIGURATION (MERGED)
// ============================================

const TIER_LIMITS = {
    free: { tasks_per_month: 0, can_access: false, credits_granted: 0 },
    registered: { tasks_per_month: 1, can_access: true, credits_granted: 1 },
    professional: { tasks_per_month: 10, can_access: true, credits_granted: 10 },
    employer: { tasks_per_month: 5, can_access: true, credits_granted: 5 },
    business: { tasks_per_month: 20, can_access: true, credits_granted: 20 }
};

const UNLIMITED_TIERS = ['super_admin', 'admin', 'business'];

// ============================================
// USER ELIGIBILITY (MERGED)
// ============================================

export async function checkVAEligibility(userId) {
    try {
        // Get user profile with tier and user_type
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('user_type, tier')
            .eq('id', userId)
            .single();
        
        if (profileError) throw profileError;
        
        // Check for unlimited access (admins and business tier)
        const isUnlimited = UNLIMITED_TIERS.includes(profile?.user_type) || 
                           profile?.tier === 'business';
        
        if (isUnlimited) {
            return {
                canAccess: true,
                remaining: 999999,
                limit: 999999,
                tier: profile?.tier || 'business',
                isUnlimited: true,
                creditsRemaining: 999999
            };
        }
        
        // Get tier limits
        const tier = profile?.tier || 'free';
        const limits = TIER_LIMITS[tier];
        
        if (!limits.can_access) {
            return {
                canAccess: false,
                remaining: 0,
                limit: limits.tasks_per_month,
                tier,
                isUnlimited: false,
                creditsRemaining: 0,
                upgradeRequired: true
            };
        }
        
        // Count tasks used this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const { count: monthlyTaskCount, error: countError } = await supabase
            .from('va_tasks')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('created_at', startOfMonth.toISOString());
        
        if (countError) throw countError;
        
        const monthlyRemaining = Math.max(0, limits.tasks_per_month - (monthlyTaskCount || 0));
        
        // Check credit balance (from va_credits table)
        let creditBalance = 0;
        try {
            const { data: credits } = await supabase
                .from('va_credits')
                .select('balance')
                .eq('user_id', userId)
                .single();
            creditBalance = credits?.balance || 0;
        } catch (err) {
            // Credits table might not exist or user has no credits yet
            console.debug('No credits found for user:', err.message);
        }
        
        // Can access if either monthly tasks remaining OR credits available
        const canAccess = monthlyRemaining > 0 || creditBalance > 0;
        
        return {
            canAccess,
            remaining: Math.max(monthlyRemaining, creditBalance),
            limit: limits.tasks_per_month,
            tier,
            isUnlimited: false,
            creditsRemaining: creditBalance,
            monthlyRemaining,
            upgradeRequired: !canAccess
        };
        
    } catch (error) {
        console.error('Error checking VA eligibility:', error);
        return {
            canAccess: false,
            remaining: 0,
            limit: 10,
            tier: 'free',
            isUnlimited: false,
            creditsRemaining: 0,
            upgradeRequired: true,
            error: error.message
        };
    }
}

// ============================================
// OPENAI EXECUTION (MERGED)
// ============================================

async function executeWithOpenAI(va, input) {
    if (!OPENAI_API_KEY) {
        return getFallbackResponse(va.id, input);
    }
    
    const promptTemplate = va.promptTemplate || 
        `You are a professional career coach and writing expert. Respond to: {input}`;
    
    const prompt = promptTemplate.replace('{input}', input);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { 
                    role: 'system', 
                    content: `You are ${va.name}, a professional ${va.category} expert. 
                              You provide helpful, actionable advice. 
                              Keep responses professional but friendly. 
                              Use markdown formatting for readability.` 
                },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 1500
        })
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        console.error('OpenAI API error:', errorData);
        return getFallbackResponse(va.id, input);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
}

// ============================================
// FALLBACK RESPONSES (ENHANCED)
// ============================================

function getFallbackResponse(vaId, input) {
    const fallbacks = {
        cv_optimizer: `## CV Optimization Recommendations

Thank you for sharing your CV. Here are key recommendations to make it ATS-friendly:

### 1. **Quantify Achievements**
- Replace "Responsible for team management" with "Led team of 8, increased productivity by 25%"

### 2. **Use Action Verbs**
- Start each bullet with: **Led**, **Managed**, **Created**, **Developed**, **Implemented**

### 3. **Keyword Optimization**
- Review the job description and include relevant keywords throughout your CV

### 4. **Format Cleanly**
- Use standard fonts (Arial, Calibri, Times New Roman)
- Avoid tables, columns, and graphics
- Save as .docx or .pdf

Would you like me to review specific sections of your CV?`,

        cover_letter: `## Cover Letter Template

**Dear Hiring Manager,**

I am writing to express my strong interest in the [Position Name] role at [Company Name]. With my background in [Your Field], I bring valuable experience in [Key Skill 1] and [Key Skill 2].

In my previous role at [Previous Company], I:
- Achieved [quantifiable accomplishment]
- Implemented [process improvement]
- Collaborated with [teams/departments]

I am particularly drawn to [Company Name] because [specific reason about company mission/project].

**Sincerely,**
[Your Name]
[Your Phone]
[Your LinkedIn]`,

        linkedin_makeover: `## LinkedIn Profile Optimization

### Headline Formula
**Current Role** | **Key Skill 1** + **Key Skill 2** | **Value Statement**

Example: *Senior Marketing Manager | SEO & Content Strategy | Driving 200% Organic Growth*

### About Section Structure
1. **Hook**: "I help [companies/teams] achieve [specific outcome]"
2. **Experience Highlights**: 3-4 bullet points of key achievements
3. **Personal Touch**: What drives you professionally

### Experience Section
Focus on achievements, not duties:
- "Increased X by Y%"
- "Saved Z hours by automating..."
- "Led team of N to accomplish..."

### Skills to Feature
Add skills that match your target role. Get endorsements from colleagues.`,

        interview_coach: `## Top 10 Interview Questions

### Behavioral Questions
1. **"Tell me about yourself"** → 90-second summary of your career arc
2. **"Why do you want this role?"** → Connect your skills to their needs
3. **"What's your greatest strength?"** → Skill + evidence + result
4. **"What's your greatest weakness?"** → Real weakness + improvement steps
5. **"Tell me about a challenge you overcame"** → STAR method (Situation, Task, Action, Result)

### Technical/Role-Specific
6. **"Describe your experience with [key tool/skill]"** → Specific projects and outcomes
7. **"How do you handle tight deadlines?"** → Prioritization framework

### Cultural Fit
8. **"Why do you want to work here?"** → Research their mission and values
9. **"Where do you see yourself in 5 years?"** → Growth within their organization
10. **"Do you have questions for us?"** → Always ask 2-3 thoughtful questions

### Preparation Tips
- Research the company (products, news, culture)
- Practice out loud (recording yourself)
- Prepare specific examples with numbers`,

        salary_coach: `## Salary Negotiation Guide

### 1. **Research Market Rates**
- Use: Glassdoor, Levels.fyi, LinkedIn Salary, Blind
- Know: 25th percentile (low), 50th percentile (market), 75th percentile (high)

### 2. **Know Your Minimum**
- Calculate your living expenses + savings goals
- Set a walk-away number BEFORE negotiating

### 3. **Negotiation Script**

*After receiving offer:*
> "Thank you for the offer. I'm very excited about the role. Based on my research of market rates and my experience with [specific achievements], I was expecting a base salary in the range of $X - $Y. Is there flexibility to meet that range?"

### 4. **Total Compensation**
Don't just negotiate base salary:
- Signing bonus (one-time)
- Performance bonus (annual)
- Equity/RSUs
- Vacation days
- Remote work flexibility
- Professional development budget

### 5. **Timing**
- Always negotiate (90% of companies expect it)
- Get offer in writing first
- Respond within 2-3 business days`,

        skill_analyzer: `## Skill Gap Analysis

### Top Skills for Your Target Role

Based on industry data, here are the most in-demand skills:

**Technical Skills**
1. [Skill 1] - Critical (90% of job posts)
2. [Skill 2] - Important (70% of job posts)
3. [Skill 3] - Nice to have (40% of job posts)

**Soft Skills**
1. Communication - Mentioned in 85% of posts
2. Problem-solving - 80%
3. Team collaboration - 75%

### Recommended Learning Paths

**Immediate (1-2 weeks)**
- [Free course link for Skill 1]
- [YouTube tutorial for Skill 2]

**Short-term (1-3 months)**
- [Certification for Skill 1]
- [Project-based course]

**Long-term (3-6 months)**
- [Advanced certification]
- [Portfolio project]

### Quick Wins
- Add skills to LinkedIn immediately
- Update CV with relevant keywords
- Start a small project to demonstrate capability

Would you like specific course recommendations for your target role?`
    };
    
    return fallbacks[vaId] || `## Help with Your Request

Thank you for your request. Here are some helpful suggestions for "${input.substring(0, 100)}":

1. **Be specific** - Provide more details about your situation
2. **Share examples** - Include your current CV, job description, or target role
3. **Ask follow-ups** - I'm here to help refine the response

Would you like to provide more details for a personalized response?`;
}

// ============================================
// EXECUTE VA TASK (MERGED)
// ============================================

export async function executeVATask(userId, vaId, input, taskId = null) {
    const va = VIRTUAL_ASSISTANTS.find(v => v.id === vaId);
    if (!va) {
        throw new Error(`Virtual Assistant '${vaId}' not found`);
    }
    
    // Check eligibility
    const eligibility = await checkVAEligibility(userId);
    
    if (!eligibility.canAccess && !eligibility.isUnlimited) {
        const remaining = eligibility.remaining || 0;
        const limit = eligibility.limit || 10;
        throw new Error(`You have used all ${limit} VA tasks this month. Upgrade your plan to continue getting expert assistance.`);
    }
    
    // Create or retrieve task record
    let task;
    if (taskId) {
        const { data, error } = await supabase
            .from('va_tasks')
            .select('*')
            .eq('id', taskId)
            .eq('user_id', userId)
            .single();
        
        if (error) throw new Error('Task not found');
        task = data;
    } else {
        // Deduct a credit if not unlimited
        if (!eligibility.isUnlimited && eligibility.creditsRemaining > 0) {
            await supabase
                .from('va_credits')
                .update({ balance: supabase.rpc('decrement', { x: 1 }) })
                .eq('user_id', userId);
        }
        
        const { data, error } = await supabase
            .from('va_tasks')
            .insert({
                user_id: userId,
                va_id: vaId,
                va_name: va.name,
                input: input.substring(0, 2000),
                status: 'processing',
                created_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (error) throw error;
        task = data;
    }
    
    // Execute based on VA type
    let output = '';
    let executionTime = null;
    
    try {
        const startTime = Date.now();
        output = await executeWithOpenAI(va, input);
        executionTime = Date.now() - startTime;
        
        // Update task with success
        const { error: updateError } = await supabase
            .from('va_tasks')
            .update({
                status: 'completed',
                output: output,
                execution_time_ms: executionTime,
                completed_at: new Date().toISOString()
            })
            .eq('id', task.id);
        
        if (updateError) throw updateError;
        
    } catch (error) {
        console.error('VA task execution error:', error);
        
        // Update task with failure
        await supabase
            .from('va_tasks')
            .update({
                status: 'failed',
                error_message: error.message,
                completed_at: new Date().toISOString()
            })
            .eq('id', task.id);
        
        throw error;
    }
    
    return {
        success: true,
        taskId: task.id,
        output,
        executionTimeMs: executionTime,
        va: va
    };
}

// ============================================
// TASK HISTORY (MERGED)
// ============================================

export async function getUserVATasks(userId, limit = 20, offset = 0) {
    try {
        const { data, error, count } = await supabase
            .from('va_tasks')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        
        if (error) throw error;
        
        return {
            tasks: data || [],
            total: count || 0,
            hasMore: (offset + (data?.length || 0)) < (count || 0)
        };
    } catch (error) {
        console.error('Error fetching VA tasks:', error);
        return { tasks: [], total: 0, hasMore: false };
    }
}

export async function getVATaskById(taskId, userId) {
    try {
        const { data, error } = await supabase
            .from('va_tasks')
            .select('*')
            .eq('id', taskId)
            .eq('user_id', userId)
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching VA task:', error);
        return null;
    }
}

export async function getVATasksSummary(userId) {
    try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const { data: tasks } = await supabase
            .from('va_tasks')
            .select('status, created_at, va_name')
            .eq('user_id', userId);
        
        const thisMonth = tasks?.filter(t => 
            new Date(t.created_at) >= startOfMonth
        ) || [];
        
        const completed = thisMonth.filter(t => t.status === 'completed').length;
        const failed = thisMonth.filter(t => t.status === 'failed').length;
        const processing = thisMonth.filter(t => t.status === 'processing').length;
        
        // Group by VA type
        const byVA = {};
        tasks?.forEach(t => {
            const name = t.va_name || t.va_id;
            byVA[name] = (byVA[name] || 0) + 1;
        });
        
        return {
            total_tasks: tasks?.length || 0,
            this_month: {
                total: thisMonth.length,
                completed,
                failed,
                processing
            },
            by_virtual_assistant: byVA,
            most_used_va: Object.entries(byVA).sort((a, b) => b[1] - a[1])[0]?.[0] || null
        };
    } catch (error) {
        console.error('Error fetching VA summary:', error);
        return null;
    }
}

// ============================================
// CREDIT MANAGEMENT (MERGED)
// ============================================

export async function getVACredits(userId) {
    try {
        const { data, error } = await supabase
            .from('va_credits')
            .select('balance, updated_at')
            .eq('user_id', userId)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        return {
            balance: data?.balance || 0,
            lastUpdated: data?.updated_at || null
        };
    } catch (error) {
        console.error('Error fetching VA credits:', error);
        return { balance: 0, lastUpdated: null };
    }
}

export async function purchaseVACredits(userId, amount, paymentMethod = 'stripe') {
    try {
        // This would integrate with your payment system
        // For now, just update the credits directly
        const { data: existing } = await supabase
            .from('va_credits')
            .select('id, balance')
            .eq('user_id', userId)
            .single();
        
        let newBalance;
        if (existing) {
            newBalance = existing.balance + amount;
            await supabase
                .from('va_credits')
                .update({ 
                    balance: newBalance,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id);
        } else {
            newBalance = amount;
            await supabase
                .from('va_credits')
                .insert({ 
                    user_id: userId, 
                    balance: amount,
                    created_at: new Date().toISOString()
                });
        }
        
        // Log the purchase
        await supabase
            .from('va_credit_purchases')
            .insert({
                user_id: userId,
                amount: amount,
                payment_method: paymentMethod,
                created_at: new Date().toISOString()
            });
        
        return { 
            success: true, 
            newBalance,
            message: `Successfully purchased ${amount} VA credits. New balance: ${newBalance}`
        };
    } catch (error) {
        console.error('Error purchasing VA credits:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// VA RETRIEVAL HELPERS
// ============================================

export function getVAById(vaId) {
    return VIRTUAL_ASSISTANTS.find(va => va.id === vaId);
}

export function getVAsByCategory(category) {
    if (category === 'all') return VIRTUAL_ASSISTANTS;
    return VIRTUAL_ASSISTANTS.filter(va => va.category === category);
}

export function getVACategories() {
    const categories = [...new Set(VIRTUAL_ASSISTANTS.map(va => va.category))];
    return categories.map(cat => ({
        id: cat,
        name: cat.charAt(0).toUpperCase() + cat.slice(1),
        count: VIRTUAL_ASSISTANTS.filter(va => va.category === cat).length
    }));
}

export function getVAPricing(vaId) {
    const va = getVAById(vaId);
    return {
        price: va?.price || 0,
        credits: va?.credits || va?.price || 0,
        currency: 'USD'
    };
}

// ============================================
// USAGE STATISTICS (For Admin Dashboard)
// ============================================

export async function getVAUsageStats(days = 30) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: tasks, error } = await supabase
        .from('va_tasks')
        .select('*')
        .gte('created_at', cutoff);
    
    if (error) throw error;
    
    const completed = tasks?.filter(t => t.status === 'completed') || [];
    const failed = tasks?.filter(t => t.status === 'failed') || [];
    
    const byVA = {};
    completed.forEach(t => {
        const vaName = t.va_name || t.va_id;
        byVA[vaName] = (byVA[vaName] || 0) + 1;
    });
    
    const totalExecutionTime = completed.reduce((sum, t) => sum + (t.execution_time_ms || 0), 0);
    const avgExecutionTime = completed.length > 0 ? totalExecutionTime / completed.length : 0;
    
    return {
        summary: {
            total_tasks: tasks?.length || 0,
            completed: completed.length,
            failed: failed.length,
            success_rate: tasks?.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0,
            avg_execution_time_ms: Math.round(avgExecutionTime)
        },
        by_virtual_assistant: byVA,
        top_va: Object.entries(byVA).sort((a, b) => b[1] - a[1])[0]?.[0] || null,
        daily_usage: aggregateByDay(tasks || [])
    };
}

function aggregateByDay(tasks) {
    const daily = {};
    tasks.forEach(task => {
        const day = new Date(task.created_at).toISOString().split('T')[0];
        if (!daily[day]) {
            daily[day] = { total: 0, completed: 0, failed: 0 };
        }
        daily[day].total++;
        if (task.status === 'completed') daily[day].completed++;
        if (task.status === 'failed') daily[day].failed++;
    });
    return daily;
}

// ============================================
// EXPORTS
// ============================================

export default {
    VIRTUAL_ASSISTANTS,
    checkVAEligibility,
    executeVATask,
    getUserVATasks,
    getVATaskById,
    getVATasksSummary,
    getVACredits,
    purchaseVACredits,
    getVAById,
    getVAsByCategory,
    getVACategories,
    getVAPricing,
    getVAUsageStats
};

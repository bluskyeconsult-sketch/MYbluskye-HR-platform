// src/services/vaService.js
// ODUSBABA VA SERVICE v3.0 - PRODUCTION READY
// ✅ Virtual Assistants with tier-based access
// ✅ Credit management system
// ✅ OpenAI integration with fallback responses
// ✅ Complete task history tracking

import { supabase } from '../lib/supabase';

// ============================================
// VIRTUAL ASSISTANTS DATA (ENHANCED)
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
        longDescription: 'Professional CV optimization with keyword analysis, achievement quantification, and ATS-friendly formatting.',
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
        longDescription: 'Comprehensive skill analysis, personalized learning recommendations, and certification guidance.',
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
        longDescription: 'SEO keyword optimization, compelling summaries, and strategic profile enhancements to attract recruiters.',
        rating: 4.8,
        reviews: 89,
        responseTime: '2-3 min',
        promptTemplate: `You are a LinkedIn profile expert. Optimize the following LinkedIn profile summary and experience sections.\n\nProfile: {input}`
    }
];

// ============================================
// TIER CONFIGURATION
// ============================================

const TIER_CREDITS = {
    free: 5,
    registered: 10,
    professional: 25,
    employer: 20,
    business: 999999,
    admin: 999999,
    super_admin: 999999,
    tester: 10
};

const UNLIMITED_TIERS = ['super_admin', 'admin', 'business'];

// ============================================
// HELPER FUNCTIONS
// ============================================

const isUnlimitedTier = (tier, userType) => {
    return UNLIMITED_TIERS.includes(tier) || UNLIMITED_TIERS.includes(userType);
};

// ============================================
// USER ELIGIBILITY CHECK
// ============================================

export async function checkVAEligibility(userId) {
    try {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('tier, user_type')
            .eq('id', userId)
            .single();
        
        if (profileError) {
            console.error('Profile fetch error:', profileError);
            return { remaining: 5, limit: 5, tier: 'free', isUnlimited: false, canAccess: true };
        }
        
        const tier = profile?.tier || profile?.user_type || 'free';
        const isUnlimited = isUnlimitedTier(tier, profile?.user_type);
        
        if (isUnlimited) {
            return { 
                remaining: 999999, 
                limit: 999999, 
                tier, 
                isUnlimited: true,
                canAccess: true,
                creditsRemaining: 999999
            };
        }
        
        // Get or create VA credits
        let { data: credits, error: creditsError } = await supabase
            .from('va_credits')
            .select('balance')
            .eq('user_id', userId)
            .single();
        
        if (creditsError && creditsError.code === 'PGRST116') {
            const defaultCredits = TIER_CREDITS[tier] || 5;
            const { data: newCredits } = await supabase
                .from('va_credits')
                .insert({ user_id: userId, balance: defaultCredits })
                .select()
                .single();
            credits = newCredits || { balance: defaultCredits };
        }
        
        const balance = credits?.balance || 0;
        
        return { 
            remaining: balance,
            limit: TIER_CREDITS[tier] || 5,
            tier,
            isUnlimited: false,
            canAccess: balance > 0,
            creditsRemaining: balance
        };
    } catch (error) {
        console.error('VA eligibility error:', error);
        return { remaining: 5, limit: 5, tier: 'free', isUnlimited: false, canAccess: true, creditsRemaining: 5 };
    }
}

// ============================================
// FALLBACK RESPONSES (ENHANCED)
// ============================================

function getFallbackResponse(vaId, input) {
    const fallbacks = {
        cv_optimizer: `## 📄 CV Optimization Results

Based on your request, here are key recommendations to make your CV ATS-friendly:

### ✅ Key Improvements

**1. Quantify Achievements**
- ❌ "Responsible for team management"
- ✅ "Led team of 8, increased productivity by 25%"

**2. Use Action Verbs**
Start each bullet with: **Led**, **Managed**, **Created**, **Developed**, **Implemented**

**3. ATS Keywords**
Review job descriptions and include relevant keywords throughout your CV

**4. Format Cleanly**
- Use standard fonts (Arial, Calibri)
- Avoid tables, columns, and graphics
- Save as .docx or .pdf

### 📝 Sample Achievement Rewrite

**Before:** "Responsible for project delivery"
**After:** "Delivered 5 major projects on time, saving $50K annually"

Would you like me to review specific sections of your CV?`,

        cover_letter: `## ✉️ Professional Cover Letter Template

### Template

**Dear Hiring Manager,**

I am writing to express my strong interest in the [Position Name] role at [Company Name]. With my background in [Your Field], I bring valuable experience in [Key Skill 1] and [Key Skill 2].

In my previous role at [Previous Company], I:
- Achieved [quantifiable accomplishment]
- Implemented [process improvement]
- Collaborated with [teams/departments]

I am particularly drawn to [Company Name] because [specific reason about company mission].

**Sincerely,**
[Your Name]
[Your LinkedIn]

### ✅ Checklist
- [ ] Customized for each application
- [ ] Addressed to specific person
- [ ] Under 400 words
- [ ] Includes specific achievements`,

        linkedin_makeover: `## 🔗 LinkedIn Profile Optimization

### Headline Formula
**Current Role** | **Key Skill 1** + **Key Skill 2** | **Value Statement**

Example: *Senior Marketing Manager | SEO & Content Strategy | Driving 200% Organic Growth*

### About Section Structure
1. **Hook**: "I help [companies/teams] achieve [specific outcome]"
2. **Experience Highlights**: 3-4 bullet points of key achievements
3. **Personal Touch**: What drives you professionally

### Skills to Feature
Add skills that match your target role. Get endorsements from colleagues.

### Experience Section Focus
Focus on achievements, not duties:
- "Increased X by Y%"
- "Saved Z hours by automating..."
- "Led team of N to accomplish..."`,

        interview_coach: `## 🎯 Interview Preparation Guide

### Top 10 Common Questions

**Behavioral Questions**
1. **"Tell me about yourself"** → 90-second career summary
2. **"Why do you want this role?"** → Connect skills to their needs
3. **"What's your greatest strength?"** → Skill + evidence + result
4. **"What's your greatest weakness?"** → Real weakness + improvement steps
5. **"Tell me about a challenge you overcame"** → STAR method

### STAR Method Framework
- **S**ituation - Set the context
- **T**ask - What was your responsibility
- **A**ction - What steps you took
- **R**esult - What was the outcome (quantify)

### Questions to Ask Them
- "What does success look like in this role?"
- "What's the team culture like?"
- "What are the growth opportunities?"`,

        salary_coach: `## 💰 Salary Negotiation Guide

### 1. Research Market Rates
Use: Glassdoor, Levels.fyi, LinkedIn Salary, Blind

### 2. Know Your Minimum
Calculate your living expenses + savings goals

### 3. Negotiation Script

*After receiving offer:*
> "Thank you for the offer. Based on my research and experience, I was expecting a range of $X - $Y. Is there flexibility?"

### 4. Total Compensation
Don't just negotiate base salary:
- Signing bonus
- Performance bonus
- Equity/RSUs
- Vacation days
- Remote work flexibility

### 5. Timing
- Always negotiate (90% of companies expect it)
- Get offer in writing first
- Respond within 2-3 business days`,

        skill_analyzer: `## 📊 Skill Gap Analysis

### Top Skills for Your Target Role

**Technical Skills**
1. [Skill 1] - Critical (90% of job posts)
2. [Skill 2] - Important (70% of job posts)

**Soft Skills**
1. Communication - 85% of posts
2. Problem-solving - 80%

### Recommended Learning Paths

**Immediate (1-2 weeks)**
- Free course on Skill 1
- YouTube tutorial on Skill 2

**Short-term (1-3 months)**
- Certification for Skill 1
- Project-based course

**Long-term (3-6 months)**
- Advanced certification
- Portfolio project

Would you like specific course recommendations?`
    };
    
    return fallbacks[vaId] || `## 🤖 ${VIRTUAL_ASSISTANTS.find(v => v.id === vaId)?.name || 'VA'} Results

Based on your request: *"${input.substring(0, 150)}${input.length > 150 ? '...' : ''}"*

### Key Recommendations

1. **Be specific** - Provide more details for better results
2. **Include examples** - Share specific scenarios
3. **Follow up** - Ask clarifying questions

Would you like to provide more details for a personalized response?`;
}

// ============================================
// AI EXECUTION (with fallback)
// ============================================

async function executeWithOpenAI(va, input) {
    const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
        return getFallbackResponse(va.id, input);
    }
    
    const promptTemplate = va.promptTemplate || 
        `You are a professional career coach and writing expert. Respond to: {input}`;
    
    const prompt = promptTemplate.replace('{input}', input);
    
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
            console.error('OpenAI API error:', response.status);
            return getFallbackResponse(va.id, input);
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('OpenAI execution error:', error);
        return getFallbackResponse(va.id, input);
    }
}

// ============================================
// EXECUTE VA TASK
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
        throw new Error(`Insufficient VA credits. Need ${va.price} credits, you have ${remaining}.`);
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
        // Create new task
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
        
        // Deduct credits if not unlimited and new task
        if (!taskId && !eligibility.isUnlimited) {
            const { data: credits } = await supabase
                .from('va_credits')
                .select('balance')
                .eq('user_id', userId)
                .single();
            
            if (credits && credits.balance >= va.price) {
                await supabase
                    .from('va_credits')
                    .update({ balance: credits.balance - va.price })
                    .eq('user_id', userId);
            }
        }
        
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
    
    // Get updated credits
    const finalCredits = await getVACredits(userId);
    
    return {
        success: true,
        taskId: task.id,
        output,
        executionTimeMs: executionTime,
        va: va,
        creditsRemaining: eligibility.isUnlimited ? 'unlimited' : finalCredits.balance
    };
}

// ============================================
// TASK HISTORY
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
        const { data: tasks, error } = await supabase
            .from('va_tasks')
            .select('status, created_at, va_name')
            .eq('user_id', userId);
        
        if (error) throw error;
        
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const thisMonth = tasks?.filter(t => new Date(t.created_at) >= startOfMonth) || [];
        const completed = thisMonth.filter(t => t.status === 'completed').length;
        const failed = thisMonth.filter(t => t.status === 'failed').length;
        const processing = thisMonth.filter(t => t.status === 'processing').length;
        
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
// CREDIT MANAGEMENT
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
// USAGE STATISTICS (Admin)
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
    
    function aggregateByDay(taskList) {
        const daily = {};
        taskList.forEach(task => {
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

// ============================================
// DEFAULT EXPORT (backward compatible)
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

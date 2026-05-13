// src/services/vaService.js
// Complete Virtual Assistant Service - Task execution, tier access, history

import { supabase } from '../lib/supabase';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// ============================================
// TIER CONFIGURATION
// ============================================

const VA_TIER_LIMITS = {
    free: { tasks_per_month: 0, can_access: false },
    registered: { tasks_per_month: 1, can_access: true },
    professional: { tasks_per_month: 10, can_access: true },
    employer: { tasks_per_month: 5, can_access: true },
    business: { tasks_per_month: 20, can_access: true }
};

// ============================================
// VIRTUAL ASSISTANTS LIST
// ============================================

export const VIRTUAL_ASSISTANTS = [
    { id: 'cv_optimizer', name: 'CV Optimizer Pro', category: 'resume', price: 9.99, description: 'Professional CV rewrite for ATS systems', icon: '📄' },
    { id: 'cover_letter', name: 'Cover Letter Writer', category: 'resume', price: 7.99, description: 'Generate personalized cover letters', icon: '✉️' },
    { id: 'linkedin_makeover', name: 'LinkedIn Makeover', category: 'social', price: 14.99, description: 'Optimize your LinkedIn profile', icon: '🔗' },
    { id: 'interview_coach', name: 'Interview Question Generator', category: 'interview', price: 5.99, description: 'Generate role-specific questions', icon: '🎯' },
    { id: 'salary_coach', name: 'Salary Negotiation Coach', category: 'career', price: 8.99, description: 'Get negotiation scripts', icon: '💰' },
    { id: 'skill_analyzer', name: 'Skill Gap Analyst', category: 'skills', price: 6.99, description: 'Identify skill gaps for target roles', icon: '📊' }
];

// ============================================
// USER ELIGIBILITY
// ============================================

export async function checkVAEligibility(userId) {
    const { data: profile } = await supabase
        .from('profiles')
        .select('tier')
        .eq('id', userId)
        .single();
    
    const tier = profile?.tier || 'free';
    const limits = VA_TIER_LIMITS[tier];
    
    // Count tasks this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { count } = await supabase
        .from('va_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', startOfMonth.toISOString());
    
    const remaining = Math.max(0, limits.tasks_per_month - (count || 0));
    
    return {
        canAccess: limits.can_access,
        remaining,
        limit: limits.tasks_per_month,
        tier
    };
}

// ============================================
// EXECUTE VA TASK
// ============================================

export async function executeVATask(userId, vaId, input, taskId = null) {
    const va = VIRTUAL_ASSISTANTS.find(v => v.id === vaId);
    if (!va) throw new Error('Virtual Assistant not found');
    
    // Check eligibility
    const eligibility = await checkVAEligibility(userId);
    if (!eligibility.canAccess || eligibility.remaining <= 0) {
        throw new Error(`You have used all ${eligibility.limit} VA tasks this month. Upgrade to continue.`);
    }
    
    // Create task record
    let task;
    if (taskId) {
        const { data } = await supabase
            .from('va_tasks')
            .select('*')
            .eq('id', taskId)
            .single();
        task = data;
    } else {
        const { data, error } = await supabase
            .from('va_tasks')
            .insert({
                user_id: userId,
                va_id: vaId,
                input: input,
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
    try {
        output = await executeByType(vaId, input);
        
        await supabase
            .from('va_tasks')
            .update({
                status: 'completed',
                output: output,
                completed_at: new Date().toISOString()
            })
            .eq('id', task.id);
        
    } catch (error) {
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
    
    return { success: true, taskId: task.id, output };
}

async function executeByType(vaId, input) {
    if (!OPENAI_API_KEY) {
        return getFallbackResponse(vaId, input);
    }
    
    const prompts = {
        cv_optimizer: `You are a professional CV writer. Optimize the following CV for ATS systems. Return the optimized CV with clear formatting.\n\nCV: ${input}`,
        cover_letter: `You are a professional cover letter writer. Write a compelling cover letter based on the following information.\n\nDetails: ${input}`,
        linkedin_makeover: `You are a LinkedIn profile expert. Optimize the following LinkedIn profile summary and experience sections.\n\nProfile: ${input}`,
        interview_coach: `You are an interview preparation expert. Generate 10 interview questions for the following role.\n\nRole: ${input}`,
        salary_coach: `You are a salary negotiation expert. Provide negotiation strategies and scripts for the following situation.\n\nDetails: ${input}`,
        skill_analyzer: `You are a career development expert. Analyze skill gaps for the following target role.\n\nTarget Role: ${input}`
    };
    
    const prompt = prompts[vaId] || `You are a helpful assistant. Respond to: ${input}`;
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are a professional career coach and writing expert.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 1500
        })
    });
    
    const data = await response.json();
    return data.choices[0].message.content;
}

function getFallbackResponse(vaId, input) {
    const fallbacks = {
        cv_optimizer: `[CV Optimization]\n\nThank you for sharing your CV. Here are key recommendations:\n\n1. Add quantifiable achievements\n2. Use action verbs (led, managed, created)\n3. Tailor keywords to job descriptions\n4. Keep formatting clean and ATS-friendly\n\nWould you like specific suggestions for your CV?`,
        cover_letter: `[Cover Letter]\n\nDear Hiring Manager,\n\nI am writing to express my interest in this position. With my background in [your field], I bring valuable experience in [key skills].\n\nI look forward to discussing how I can contribute to your team.\n\nSincerely,\n[Your Name]`,
        linkedin_makeover: `[LinkedIn Optimization]\n\nHeadline: [Your Title] | [Key Skills]\n\nAbout: Results-driven professional with [X] years of experience in [field].\n\nExperience highlights should focus on achievements, not just duties.`,
        interview_coach: `[Interview Questions]\n\n1. Tell me about yourself\n2. Why do you want this role?\n3. What's your greatest strength/weakness?\n4. Where do you see yourself in 5 years?\n5. Describe a challenge you overcame.`,
        salary_coach: `[Salary Negotiation]\n\nResearch market rates for your role. Know your minimum acceptable offer. Practice the script: "Based on my research and experience, I'm looking for a range between $X and $Y."`,
        skill_analyzer: `[Skill Analysis]\n\nTop skills for this role include: communication, problem-solving, leadership, technical proficiency, and teamwork. Consider online courses to build these areas.`
    };
    return fallbacks[vaId] || `Here's help with: ${input}\n\nPlease provide more details for personalized assistance.`;
}

// ============================================
// GET TASK HISTORY
// ============================================

export async function getUserVATasks(userId, limit = 20) {
    const { data, error } = await supabase
        .from('va_tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
    
    if (error) throw error;
    return data || [];
}

export async function getVATaskById(taskId, userId) {
    const { data, error } = await supabase
        .from('va_tasks')
        .select('*')
        .eq('id', taskId)
        .eq('user_id', userId)
        .single();
    
    if (error) throw error;
    return data;
}

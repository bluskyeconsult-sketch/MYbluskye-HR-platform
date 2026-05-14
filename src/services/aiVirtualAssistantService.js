// src/services/aiVirtualAssistantService.js
// COMPLETE - AI-Powered Virtual Assistant Service
// Features: AI VA generation, task execution engine, credit management, admin unlimited access
// Includes: resume, career, interview, skill, legal, and general VA categories

import { supabase } from '../lib/supabase';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// ============================================
// AI VA GENERATION
// ============================================

export async function generateVirtualAssistantWithAI(topic, specialization, tone = 'professional') {
    const prompt = `Create a complete Virtual Assistant profile for ODUSBABA platform.

Topic/Specialization: ${topic}
Specialization Details: ${specialization}
Tone: ${tone}

Return as JSON with this exact structure:
{
    "name": "Catchy VA name",
    "title": "Professional title",
    "description": "2-3 sentence description of what this VA does",
    "long_description": "Detailed explanation of services and benefits",
    "features": ["feature 1", "feature 2", "feature 3", "feature 4", "feature 5"],
    "price": 9.99,
    "category": "resume|career|interview|skill|legal",
    "processing_time_minutes": 5,
    "sample_prompt": "Example user question for this VA",
    "sample_output": "Example response from this VA",
    "tags": ["tag1", "tag2", "tag3"]
}

Make it practical, valuable, and engaging. Return ONLY valid JSON.`;

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
                    { role: 'system', content: 'You are an expert at creating Virtual Assistant profiles for a career platform.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 2000
            })
        });

        const data = await response.json();
        const content = data.choices[0].message.content;
        const cleanResponse = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleanResponse);
    } catch (error) {
        console.error('AI VA generation error:', error);
        throw error;
    }
}

export async function createVirtualAssistantFromAI(vaData, adminId) {
    const { data, error } = await supabase
        .from('virtual_assistants')
        .insert({
            name: vaData.name,
            title: vaData.title,
            description: vaData.description,
            long_description: vaData.long_description,
            features: vaData.features,
            price: vaData.price,
            category: vaData.category,
            processing_time_minutes: vaData.processing_time_minutes,
            sample_prompt: vaData.sample_prompt,
            sample_output: vaData.sample_output,
            tags: vaData.tags,
            is_active: true,
            created_by: adminId,
            created_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) throw error;
    return { success: true, vaId: data.id };
}

// ============================================
// VA EXECUTION FUNCTIONS (All categories)
// ============================================

async function executeResumeVA(input, va) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: `You are ${va.name}, a professional career advisor specializing in resume optimization. ${va.description}. Optimize the CV for ATS systems and provide actionable improvements.` },
                { role: 'user', content: input }
            ],
            temperature: 0.5,
            max_tokens: 2000
        })
    });
    const data = await response.json();
    return data.choices[0].message.content;
}

async function executeCareerVA(input, va) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: `You are ${va.name}, a career advisor. ${va.description}. Provide practical, actionable career guidance.` },
                { role: 'user', content: input }
            ],
            temperature: 0.7,
            max_tokens: 1200
        })
    });
    const data = await response.json();
    return data.choices[0].message.content;
}

async function executeInterviewVA(input, va) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: `You are ${va.name}, an interview preparation expert. ${va.description}. Provide sample questions, STAR method guidance, and interview strategies.` },
                { role: 'user', content: input }
            ],
            temperature: 0.7,
            max_tokens: 1500
        })
    });
    const data = await response.json();
    return data.choices[0].message.content;
}

async function executeSkillVA(input, va) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: `You are ${va.name}, a skill development expert. ${va.description}. Provide learning paths, resource recommendations, and skill-building strategies.` },
                { role: 'user', content: input }
            ],
            temperature: 0.7,
            max_tokens: 1000
        })
    });
    const data = await response.json();
    return data.choices[0].message.content;
}

async function executeLegalVA(input, va) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: `You are ${va.name}, a workplace rights and legal information advisor. Provide general guidance only, not legal advice. Include appropriate disclaimers. ${va.description}` },
                { role: 'user', content: input }
            ],
            temperature: 0.7,
            max_tokens: 1200
        })
    });
    const data = await response.json();
    return data.choices[0].message.content;
}

async function executeGeneralVA(input, va) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: `You are ${va.name}. ${va.description}. Be helpful, professional, and concise.` },
                { role: 'user', content: input }
            ],
            temperature: 0.7,
            max_tokens: 1000
        })
    });
    const data = await response.json();
    return data.choices[0].message.content;
}

function calculateQualityScore(output, input) {
    let score = 85;
    if (output.length > 500) score += 5;
    if (output.includes('```') || output.includes('•') || output.includes('-')) score += 5;
    if (output.toLowerCase().includes('recommend') || output.toLowerCase().includes('suggest')) score += 5;
    if (output.toLowerCase().includes('example') || output.toLowerCase().includes('sample')) score += 3;
    return Math.min(100, score);
}

// ============================================
// VA CREDIT MANAGEMENT (Unlimited for Admins & Business)
// ============================================

export async function getVACredits(userId) {
    // First check if user is admin/super_admin
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_type, tier')
        .eq('id', userId)
        .single();
    
    if (profileError) {
        console.error('Error fetching profile:', profileError);
        return { balance: 0, isUnlimited: false };
    }
    
    // Super Admin and Admin have unlimited credits
    if (profile?.user_type === 'super_admin' || profile?.user_type === 'admin') {
        return { balance: 999999, isUnlimited: true, message: 'Admins have unlimited VA credits' };
    }
    
    // Business tier has unlimited VA credits
    if (profile?.tier === 'business') {
        return { balance: 999999, isUnlimited: true, message: 'Business plan includes unlimited VA credits' };
    }
    
    const { data, error } = await supabase
        .from('va_credits')
        .select('balance')
        .eq('user_id', userId)
        .single();

    if (error && error.code !== 'PGRST116') throw error;
    return { balance: data?.balance || 0, isUnlimited: false };
}

export async function purchaseVACredits(userId, amount) {
    // Check if admin - admins don't need to purchase
    const { data: profile } = await supabase
        .from('profiles')
        .select('user_type, tier')
        .eq('id', userId)
        .single();
    
    if (profile?.user_type === 'super_admin' || profile?.user_type === 'admin') {
        return { success: true, message: 'Admins have unlimited access to Virtual Assistants' };
    }
    
    if (profile?.tier === 'business') {
        return { success: true, message: 'Business plan includes unlimited VA credits' };
    }
    
    const { data: existing } = await supabase
        .from('va_credits')
        .select('id, balance')
        .eq('user_id', userId)
        .single();

    if (existing) {
        await supabase
            .from('va_credits')
            .update({ balance: existing.balance + amount })
            .eq('id', existing.id);
    } else {
        await supabase
            .from('va_credits')
            .insert({ user_id: userId, balance: amount });
    }

    return { success: true, newBalance: (existing?.balance || 0) + amount };
}

// ============================================
// VA TASK EXECUTION ENGINE (Enhanced with all categories)
// ============================================

export async function executeVATask(vaId, userId, input, priority = 'normal') {
    // Get VA details
    const { data: va, error: vaError } = await supabase
        .from('virtual_assistants')
        .select('*')
        .eq('id', vaId)
        .single();

    if (vaError) throw vaError;
    
    // Check user credits (handles admin/business unlimited)
    const credits = await getVACredits(userId);
    
    if (!credits.isUnlimited && credits.balance < va.price) {
        return { 
            success: false, 
            error: 'Insufficient VA credits', 
            required: va.price,
            currentBalance: credits.balance,
            suggestedPurchase: true
        };
    }

    // Create task record
    const { data: task, error: taskError } = await supabase
        .from('va_tasks')
        .insert({
            user_id: userId,
            va_id: vaId,
            input: input,
            status: 'processing',
            priority: priority,
            estimated_completion: new Date(Date.now() + va.processing_time_minutes * 60 * 1000).toISOString()
        })
        .select()
        .single();

    if (taskError) throw taskError;

    // Execute based on VA category (full category support)
    let output = '';
    let qualityScore = 85;

    try {
        switch (va.category) {
            case 'resume':
                output = await executeResumeVA(input, va);
                break;
            case 'career':
                output = await executeCareerVA(input, va);
                break;
            case 'interview':
                output = await executeInterviewVA(input, va);
                break;
            case 'skill':
                output = await executeSkillVA(input, va);
                break;
            case 'legal':
                output = await executeLegalVA(input, va);
                break;
            default:
                output = await executeGeneralVA(input, va);
        }
        qualityScore = calculateQualityScore(output, input);
    } catch (error) {
        console.error('VA execution error:', error);
        output = `I encountered an error processing your request. Please try again or contact support.`;
        qualityScore = 50;
    }

    // Update task with results
    await supabase
        .from('va_tasks')
        .update({
            status: 'completed',
            output: output,
            quality_score: qualityScore,
            completed_at: new Date().toISOString()
        })
        .eq('id', task.id);

    // Deduct credits only if not unlimited
    if (!credits.isUnlimited) {
        await supabase
            .from('va_credits')
            .update({ balance: credits.balance - va.price })
            .eq('user_id', userId);
        
        return {
            success: true,
            taskId: task.id,
            output: output,
            qualityScore: qualityScore,
            creditsRemaining: credits.balance - va.price,
            vaName: va.name
        };
    } else {
        return {
            success: true,
            taskId: task.id,
            output: output,
            qualityScore: qualityScore,
            creditsRemaining: 'unlimited',
            vaName: va.name,
            isUnlimited: true
        };
    }
}

// ============================================
// GET ALL ACTIVE VIRTUAL ASSISTANTS
// ============================================

export async function getActiveVirtualAssistants() {
    const { data, error } = await supabase
        .from('virtual_assistants')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

    if (error) throw error;
    return data || [];
}

export async function getVirtualAssistantById(vaId) {
    const { data, error } = await supabase
        .from('virtual_assistants')
        .select('*')
        .eq('id', vaId)
        .single();

    if (error) throw error;
    return data;
}

// ============================================
// GET USER'S VA TASK HISTORY
// ============================================

export async function getUserVATasks(userId, limit = 20) {
    const { data, error } = await supabase
        .from('va_tasks')
        .select(`
            *,
            virtual_assistants (name, category, price)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data || [];
}

// ============================================
// GET VA TASK BY ID
// ============================================

export async function getVATaskById(taskId, userId) {
    const { data, error } = await supabase
        .from('va_tasks')
        .select(`
            *,
            virtual_assistants (name, category, price, description)
        `)
        .eq('id', taskId)
        .eq('user_id', userId)
        .single();

    if (error) throw error;
    return data;
}

// src/services/aiVirtualAssistantService.js
// COMPLETE - AI-Powered Virtual Assistant Service
// Features: AI VA generation, task execution engine, credit management, admin unlimited access, unified API
// Includes: resume, career, interview, skill, legal, and general VA categories

import { supabase } from '../lib/supabase';

// ============================================
// CONFIGURATION
// ============================================

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const API_BASE = '/api/index';

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateQualityScore(output, input) {
    let score = 85;
    if (output.length > 500) score += 5;
    if (output.includes('```') || output.includes('•') || output.includes('-')) score += 5;
    if (output.toLowerCase().includes('recommend') || output.toLowerCase().includes('suggest')) score += 5;
    if (output.toLowerCase().includes('example') || output.toLowerCase().includes('sample')) score += 3;
    return Math.min(100, score);
}

async function callVAExecutionAPI(vaId, input, userId) {
    // ✅ FIXED: Use unified API endpoint
    const response = await fetch(`${API_BASE}?action=va-execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            assistantId: vaId,
            input,
            userId
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'VA execution failed');
    }
    
    return await response.json();
}

// ============================================
// AI VA GENERATION
// ============================================

export async function generateVirtualAssistantWithAI(topic, specialization, tone = 'professional') {
    if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
    }
    
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
                max_tokens: 2000,
                response_format: { type: "json_object" }
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
// VA CREDIT MANAGEMENT (Unlimited for Admins & Business)
// ============================================

export async function getVACredits(userId) {
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
// VA TASK EXECUTION ENGINE (with unified API)
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

    let output = '';
    let qualityScore = 85;

    try {
        // ✅ FIXED: Use unified API endpoint for execution
        const result = await callVAExecutionAPI(vaId, input, userId);
        output = result.output;
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
// GET USER'S VA TASK HISTORY (with unified API)
// ============================================

export async function getUserVATasks(userId, limit = 20) {
    // ✅ FIXED: Try unified API first, fallback to direct Supabase
    try {
        const response = await fetch(`${API_BASE}?action=va-tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, limit })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                return data.tasks || [];
            }
        }
    } catch (err) {
        console.warn('Unified API failed, falling back to direct Supabase:', err);
    }
    
    // Fallback to direct Supabase query
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

// ============================================
// VA STATISTICS
// ============================================

export async function getVAStatistics(userId) {
    try {
        const tasks = await getUserVATasks(userId, 100);
        
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const averageQuality = tasks.reduce((acc, t) => acc + (t.quality_score || 0), 0) / (completedTasks || 1);
        
        // Category breakdown
        const categoryStats = {};
        for (const task of tasks) {
            const category = task.virtual_assistants?.category || 'unknown';
            categoryStats[category] = (categoryStats[category] || 0) + 1;
        }
        
        return {
            totalTasks,
            completedTasks,
            averageQuality: Math.round(averageQuality),
            categoryBreakdown: categoryStats,
            mostUsedCategory: Object.keys(categoryStats).reduce((a, b) => 
                categoryStats[a] > categoryStats[b] ? a : b, 'none'
            )
        };
    } catch (error) {
        console.error('Error fetching VA statistics:', error);
        return {
            totalTasks: 0,
            completedTasks: 0,
            averageQuality: 0,
            categoryBreakdown: {},
            mostUsedCategory: 'none'
        };
    }
}

// ============================================
// VA RATING & FEEDBACK
// ============================================

export async function rateVATask(taskId, userId, rating, feedback = null) {
    const { error } = await supabase
        .from('va_tasks')
        .update({ 
            user_rating: rating,
            user_feedback: feedback,
            rated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
    generateVirtualAssistantWithAI,
    createVirtualAssistantFromAI,
    getVACredits,
    purchaseVACredits,
    executeVATask,
    getActiveVirtualAssistants,
    getVirtualAssistantById,
    getUserVATasks,
    getVATaskById,
    getVAStatistics,
    rateVATask
};

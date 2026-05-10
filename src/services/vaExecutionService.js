// src/services/vaExecutionService.js
// Virtual Assistant Task Execution Engine - Complete automation with scoring

import { supabase } from '../lib/supabase';
import { generateAudioForLesson } from './audioService';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// ============================================
// VA CONFIGURATION
// ============================================

const VIRTUAL_ASSISTANTS = {
    cv_optimizer: {
        id: 'cv_optimizer',
        name: 'CV Optimizer Pro',
        description: 'Professional CV rewrite for ATS systems',
        price: 9.99,
        processing_time_seconds: 30,
        quality_check: true,
        async execute(input) {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: 'You are a professional CV writer. Optimize the CV for ATS systems. Return the optimized CV with clear formatting.' },
                        { role: 'user', content: `Optimize this CV:\n\n${input.cvContent}` }
                    ],
                    temperature: 0.5,
                    max_tokens: 2000
                })
            });
            const data = await response.json();
            return {
                output: data.choices[0].message.content,
                metadata: { ats_score: calculateATSScore(data.choices[0].message.content) }
            };
        }
    },
    cover_letter_writer: {
        id: 'cover_letter_writer',
        name: 'Cover Letter Writer',
        description: 'Generate personalized cover letters',
        price: 7.99,
        processing_time_seconds: 20,
        quality_check: true,
        async execute(input) {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: 'You are a professional cover letter writer.' },
                        { role: 'user', content: `Write a cover letter for ${input.jobTitle} at ${input.companyName}. My skills: ${input.skills}. Experience: ${input.experience}` }
                    ],
                    temperature: 0.7,
                    max_tokens: 1000
                })
            });
            const data = await response.json();
            return {
                output: data.choices[0].message.content,
                metadata: { personalization_score: calculatePersonalizationScore(data.choices[0].message.content, input) }
            };
        }
    },
    linkedin_makeover: {
        id: 'linkedin_makeover',
        name: 'LinkedIn Makeover',
        description: 'Optimize your LinkedIn profile',
        price: 14.99,
        processing_time_seconds: 45,
        quality_check: true,
        async execute(input) {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: 'You are a LinkedIn optimization expert.' },
                        { role: 'user', content: `Optimize this LinkedIn profile:\nCurrent Headline: ${input.headline}\nAbout: ${input.about}\nExperience: ${input.experience}` }
                    ],
                    temperature: 0.6,
                    max_tokens: 1500
                })
            });
            const data = await response.json();
            return {
                output: data.choices[0].message.content,
                metadata: { profile_strength: calculateProfileStrength(data.choices[0].message.content) }
            };
        }
    },
    interview_question_generator: {
        id: 'interview_question_generator',
        name: 'Interview Question Generator',
        description: 'Generate role-specific interview questions',
        price: 5.99,
        processing_time_seconds: 15,
        quality_check: false,
        async execute(input) {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: 'You are an interview preparation expert.' },
                        { role: 'user', content: `Generate 10 interview questions for a ${input.jobTitle} position at ${input.companyName}. Include behavioral and technical questions.` }
                    ],
                    temperature: 0.8,
                    max_tokens: 1500
                })
            });
            const data = await response.json();
            return {
                output: data.choices[0].message.content,
                metadata: { question_count: 10, type: 'mixed' }
            };
        }
    },
    salary_negotiation_coach: {
        id: 'salary_negotiation_coach',
        name: 'Salary Negotiation Coach',
        description: 'Get salary negotiation scripts and strategies',
        price: 8.99,
        processing_time_seconds: 25,
        quality_check: true,
        async execute(input) {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: 'You are a salary negotiation expert.' },
                        { role: 'user', content: `Provide salary negotiation advice for a ${input.jobTitle} position. Current offer: ${input.currentOffer}. Market range: ${input.marketRange}. Experience: ${input.experience} years.` }
                    ],
                    temperature: 0.6,
                    max_tokens: 1200
                })
            });
            const data = await response.json();
            return {
                output: data.choices[0].message.content,
                metadata: { negotiation_power: calculateNegotiationPower(input) }
            };
        }
    },
    skill_gap_analyzer: {
        id: 'skill_gap_analyzer',
        name: 'Skill Gap Analyst',
        description: 'Identify skill gaps for your target role',
        price: 6.99,
        processing_time_seconds: 20,
        quality_check: true,
        async execute(input) {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: 'You are a career development expert.' },
                        { role: 'user', content: `Analyze skill gaps for a ${input.targetRole} position. Current skills: ${input.currentSkills}. Provide recommendations for upskilling.` }
                    ],
                    temperature: 0.7,
                    max_tokens: 1000
                })
            });
            const data = await response.json();
            return {
                output: data.choices[0].message.content,
                metadata: { gap_count: countSkillGaps(data.choices[0].message.content) }
            };
        }
    }
};

// ============================================
// QUALITY SCORING FUNCTIONS
// ============================================

function calculateATSScore(cvContent) {
    // ATS scoring logic
    let score = 70;
    if (cvContent.includes('achieved') || cvContent.includes('increased')) score += 10;
    if (cvContent.match(/\d+%/)) score += 10;
    if (cvContent.match(/[A-Z]{2,}/)) score += 5;
    if (cvContent.length > 500) score += 5;
    return Math.min(100, score);
}

function calculatePersonalizationScore(content, input) {
    let score = 60;
    if (content.includes(input.companyName)) score += 15;
    if (content.includes(input.jobTitle)) score += 15;
    if (content.includes('skills')) score += 10;
    return Math.min(100, score);
}

function calculateProfileStrength(content) {
    let score = 50;
    if (content.length > 500) score += 15;
    if (content.includes('achievement')) score += 15;
    if (content.includes('leadership')) score += 10;
    if (content.includes('results')) score += 10;
    return Math.min(100, score);
}

function calculateNegotiationPower(input) {
    let power = 50;
    if (input.experience >= 5) power += 20;
    if (input.currentOffer && input.currentOffer < input.marketRange) power += 20;
    if (input.experience >= 10) power += 10;
    return Math.min(100, power);
}

function countSkillGaps(content) {
    const matches = content.match(/gap|missing|need|required/gi);
    return matches?.length || 3;
}

// ============================================
// EXECUTE VA TASK
// ============================================

export async function executeVATask(userId, vaId, input, priority = 'normal') {
    const va = VIRTUAL_ASSISTANTS[vaId];
    if (!va) return { success: false, error: 'Virtual Assistant not found' };

    try {
        // Check user credits
        const { data: credits } = await supabase
            .from('va_credits')
            .select('balance')
            .eq('user_id', userId)
            .single();

        if (!credits || credits.balance < va.price) {
            return { success: false, error: 'Insufficient VA credits', required: va.price };
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
                estimated_completion: new Date(Date.now() + va.processing_time_seconds * 1000).toISOString()
            })
            .select()
            .single();

        if (taskError) throw taskError;

        // Execute the VA task
        const execution = await va.execute(input);

        // Calculate quality score
        const qualityScore = va.quality_check ? execution.metadata?.ats_score || 85 : 90;

        // Update task with results
        const { error: updateError } = await supabase
            .from('va_tasks')
            .update({
                status: 'completed',
                output: execution.output,
                quality_score: qualityScore,
                processing_time_seconds: va.processing_time_seconds,
                completed_at: new Date().toISOString(),
                metadata: execution.metadata
            })
            .eq('id', task.id);

        if (updateError) throw updateError;

        // Deduct credits
        await supabase
            .from('va_credits')
            .update({ balance: credits.balance - va.price })
            .eq('user_id', userId);

        // Log execution
        await supabase
            .from('va_execution_logs')
            .insert({
                user_id: userId,
                va_id: vaId,
                task_id: task.id,
                credits_used: va.price,
                quality_score: qualityScore,
                status: 'success'
            });

        return {
            success: true,
            taskId: task.id,
            output: execution.output,
            qualityScore: qualityScore,
            creditsRemaining: credits.balance - va.price,
            metadata: execution.metadata
        };

    } catch (error) {
        console.error('VA execution error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// GET VA TASK STATUS
// ============================================

export async function getVATaskStatus(taskId, userId) {
    const { data, error } = await supabase
        .from('va_tasks')
        .select('*')
        .eq('id', taskId)
        .eq('user_id', userId)
        .single();

    if (error) throw error;
    return data;
}

// ============================================
// AUTOMATE TASK EXECUTION (Batch Processing)
// ============================================

export async function executeBatchVATasks(tasks) {
    const results = [];
    for (const task of tasks) {
        const result = await executeVATask(task.userId, task.vaId, task.input, 'batch');
        results.push(result);
        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return results;
}

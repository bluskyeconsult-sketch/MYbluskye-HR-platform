// src/services/assessmentService.js
// COMPLETE ASSESSMENT SERVICE - With AI scoring, unlimited admin access, and report generation

import { supabase } from '../lib/supabase';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// ============================================
// TIER CONFIGURATION
// ============================================

const TIER_LIMITS = {
    free: { assessments_per_month: 3, can_download_report: false, can_retake: false },
    registered: { assessments_per_month: 10, can_download_report: true, can_retake: true },
    professional: { assessments_per_month: 50, can_download_report: true, can_retake: true },
    employer: { assessments_per_month: 30, can_download_report: true, can_retake: true },
    business: { assessments_per_month: 999999, can_download_report: true, can_retake: true },
    admin: { assessments_per_month: 999999, can_download_report: true, can_retake: true },
    super_admin: { assessments_per_month: 999999, can_download_report: true, can_retake: true },
    tester: { assessments_per_month: 5, can_download_report: false, can_retake: true }
};

// ============================================
// ASSESSMENT FETCHING
// ============================================

export async function getActiveAssessments() {
    const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
}

export async function getAssessmentById(assessmentId) {
    const { data, error } = await supabase
        .from('assessments')
        .select('*, questions:assessment_questions(*, options:assessment_options(*))')
        .eq('id', assessmentId)
        .single();
    
    if (error) throw error;
    return data;
}

// ============================================
// USER ELIGIBILITY & TRACKING (with unlimited admins)
// ============================================

export async function checkUserEligibility(userId, assessmentId) {
    // Get user profile with correct column names
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tier, user_type')
        .eq('id', userId)
        .single();
    
    // Handle missing profile - create one if needed
    if (profileError || !profile) {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Create profile with only existing columns from your schema
        await supabase
            .from('profiles')
            .insert({
                id: userId,
                email: user?.email,
                tier: user?.email === 'bluskyeconsult@gmail.com' ? 'business' : 'free',
                user_type: user?.email === 'bluskyeconsult@gmail.com' ? 'super_admin' : 'user',
                country_code: 'GB',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        
        const tier = user?.email === 'bluskyeconsult@gmail.com' ? 'business' : 'free';
        const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
        
        return {
            eligible: true,
            remaining: limits.assessments_per_month,
            limit: limits.assessments_per_month,
            tier: tier,
            canDownloadReport: limits.can_download_report,
            canRetake: limits.can_retake,
            isUnlimited: tier === 'super_admin' || tier === 'admin'
        };
    }
    
    const tier = profile?.tier || profile?.user_type || 'free';
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
    
    // Super admin and admin have unlimited access
    if (tier === 'super_admin' || tier === 'admin' || profile?.user_type === 'super_admin') {
        return {
            eligible: true,
            remaining: 999999,
            limit: 999999,
            tier: tier,
            canDownloadReport: true,
            canRetake: true,
            isUnlimited: true
        };
    }
    
    // Count assessments taken this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { count, error } = await supabase
        .from('user_assessments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', startOfMonth.toISOString());
    
    if (error && error.code !== 'PGRST116') {
        console.warn('Error counting assessments:', error);
    }
    
    const used = count || 0;
    const remaining = Math.max(0, limits.assessments_per_month - used);
    
    return {
        eligible: remaining > 0,
        remaining,
        used,
        limit: limits.assessments_per_month,
        tier,
        canDownloadReport: limits.can_download_report,
        canRetake: limits.can_retake,
        isUnlimited: false
    };
}

export async function recordAssessmentStart(userId, assessmentId, sessionId) {
    const { data, error } = await supabase
        .from('user_assessments')
        .insert({
            user_id: userId,
            assessment_id: assessmentId,
            session_id: sessionId,
            status: 'in_progress',
            answers: [],
            current_question_index: 0,
            time_spent_seconds: 0,
            started_at: new Date().toISOString(),
            created_at: new Date().toISOString()
        })
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

// ============================================
// START ASSESSMENT (simplified wrapper)
// ============================================

export async function startAssessment(userId, assessmentId) {
    try {
        // Check eligibility
        const eligibility = await checkUserEligibility(userId, assessmentId);
        
        if (!eligibility.eligible && !eligibility.isUnlimited) {
            return {
                success: false,
                error: `You have reached your monthly limit of ${eligibility.limit} assessments. Upgrade to continue.`,
                limitReached: true,
                eligibility
            };
        }
        
        // Generate unique session ID
        const sessionId = `${userId}_${assessmentId}_${Date.now()}`;
        
        // Create assessment session
        const session = await recordAssessmentStart(userId, assessmentId, sessionId);
        
        // Get assessment questions
        const { data: questions, error: questionsError } = await supabase
            .from('assessment_questions')
            .select('*, options:assessment_options(*)')
            .eq('assessment_id', assessmentId)
            .order('sort_order', { ascending: true });
        
        if (questionsError) throw questionsError;
        
        return {
            success: true,
            sessionId,
            session,
            questions: questions || [],
            totalQuestions: questions?.length || 0,
            eligibility
        };
    } catch (error) {
        console.error('Error starting assessment:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// SAVE ANSWER (simplified)
// ============================================

export async function saveAnswer(sessionId, questionId, answer, questionIndex) {
    try {
        // Get current session
        const { data: session, error: sessionError } = await supabase
            .from('user_assessments')
            .select('answers, current_question_index')
            .eq('session_id', sessionId)
            .single();
        
        if (sessionError) throw sessionError;
        
        let currentAnswers = session.answers || [];
        
        // Update or add answer
        const existingIndex = currentAnswers.findIndex(a => a.question_id === questionId);
        if (existingIndex >= 0) {
            currentAnswers[existingIndex] = {
                question_id: questionId,
                answer: answer,
                answered_at: new Date().toISOString(),
                question_index: questionIndex
            };
        } else {
            currentAnswers.push({
                question_id: questionId,
                answer: answer,
                answered_at: new Date().toISOString(),
                question_index: questionIndex
            });
        }
        
        // Update session
        const { error: updateError } = await supabase
            .from('user_assessments')
            .update({
                answers: currentAnswers,
                current_question_index: questionIndex + 1,
                updated_at: new Date().toISOString()
            })
            .eq('session_id', sessionId);
        
        if (updateError) throw updateError;
        
        return { success: true };
    } catch (error) {
        console.error('Error saving answer:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// ASSESSMENT SCORING & COMPLETION
// ============================================

export async function submitAssessmentAnswers(userAssessmentId, answers, timeSpentSeconds) {
    // Get assessment questions
    const { data: userAssessment, error: uaError } = await supabase
        .from('user_assessments')
        .select('*, assessment:assessments(*)')
        .eq('id', userAssessmentId)
        .single();
    
    if (uaError) throw uaError;
    
    const { data: questions, error: qError } = await supabase
        .from('assessment_questions')
        .select('*, options:assessment_options(*)')
        .eq('assessment_id', userAssessment.assessment_id);
    
    if (qError) throw qError;
    
    let totalScore = 0;
    let maxPossibleScore = 0;
    const dimensionScores = {};
    const questionResults = [];
    
    for (const question of questions || []) {
        const userAnswer = answers[question.id];
        const maxPoints = question.points || 1;
        maxPossibleScore += maxPoints;
        
        let score = 0;
        let isCorrect = false;
        
        if (question.question_type === 'multiple_choice') {
            const correctOption = question.options?.find(opt => opt.is_correct === true);
            if (correctOption && userAnswer === correctOption.id) {
                score = maxPoints;
                isCorrect = true;
            }
        } else if (question.question_type === 'likert_scale') {
            score = (userAnswer || 3) * (maxPoints / 5);
            isCorrect = true;
        } else if (question.question_type === 'scenario') {
            const aiScore = await scoreScenarioAnswer(question.question_text, userAnswer);
            score = aiScore * (maxPoints / 10);
            isCorrect = score >= maxPoints * 0.7;
        }
        
        totalScore += score;
        
        if (question.dimension) {
            if (!dimensionScores[question.dimension]) {
                dimensionScores[question.dimension] = { score: 0, max: 0 };
            }
            dimensionScores[question.dimension].score += score;
            dimensionScores[question.dimension].max += maxPoints;
        }
        
        questionResults.push({
            question_id: question.id,
            question_text: question.question_text,
            user_answer: userAnswer,
            score: score,
            max_score: maxPoints,
            is_correct: isCorrect
        });
    }
    
    const percentage = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;
    let performanceLevel = 'needs_improvement';
    if (percentage >= 80) performanceLevel = 'excellent';
    else if (percentage >= 60) performanceLevel = 'good';
    else if (percentage >= 40) performanceLevel = 'average';
    
    // Calculate dimension percentages
    const dimensionPercentages = {};
    for (const [dim, data] of Object.entries(dimensionScores)) {
        dimensionPercentages[dim] = Math.round((data.score / data.max) * 100);
    }
    
    // Generate AI insights
    const insights = await generateAssessmentInsights(
        userAssessment.assessment?.title,
        percentage,
        dimensionPercentages
    );
    
    // Update user assessment
    const { error: updateError } = await supabase
        .from('user_assessments')
        .update({
            score: totalScore,
            max_score: maxPossibleScore,
            percentage: percentage,
            performance_level: performanceLevel,
            dimension_scores: dimensionPercentages,
            answers: questionResults,
            insights: insights,
            time_spent_seconds: timeSpentSeconds,
            status: 'completed',
            completed_at: new Date().toISOString()
        })
        .eq('id', userAssessmentId);
    
    if (updateError) throw updateError;
    
    return {
        success: true,
        percentage,
        performanceLevel,
        dimensionScores: dimensionPercentages,
        insights
    };
}

// Simplified complete assessment function
export async function completeAssessment(sessionId) {
    try {
        // Get session by session_id
        const { data: session, error: sessionError } = await supabase
            .from('user_assessments')
            .select('id')
            .eq('session_id', sessionId)
            .single();
        
        if (sessionError) throw sessionError;
        
        // Use the full scoring function
        // This assumes answers are already stored
        const result = await submitAssessmentAnswers(session.id, {}, 0);
        
        return {
            success: true,
            score: result.percentage,
            percentage: result.percentage,
            performanceLevel: result.performanceLevel
        };
    } catch (error) {
        console.error('Error completing assessment:', error);
        return { success: false, error: error.message };
    }
}

async function scoreScenarioAnswer(question, answer) {
    if (!OPENAI_API_KEY) return 7;
    
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
                    { role: 'system', content: 'You are an expert assessor. Score the following answer from 1-10. Return ONLY a number.' },
                    { role: 'user', content: `Question: ${question}\n\nAnswer: ${answer}` }
                ],
                temperature: 0.3,
                max_tokens: 10
            })
        });
        const data = await response.json();
        return parseInt(data.choices[0].message.content) || 7;
    } catch (error) {
        return 7;
    }
}

async function generateAssessmentInsights(assessmentTitle, percentage, dimensionScores) {
    if (!OPENAI_API_KEY) {
        return {
            summary: `You scored ${percentage}% on this assessment.`,
            strengths: ['Self-awareness', 'Willingness to grow'],
            improvements: ['Review areas with lower scores'],
            recommendations: ['Take relevant courses', 'Practice regularly']
        };
    }
    
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
                    { role: 'system', content: 'You are a career coach. Provide personalized assessment insights as JSON.' },
                    { role: 'user', content: `Assessment: ${assessmentTitle}\nScore: ${percentage}%\nDimension Scores: ${JSON.stringify(dimensionScores)}\n\nReturn JSON with: summary (string), strengths (array), improvements (array), recommendations (array)` }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });
        const data = await response.json();
        const content = data.choices[0].message.content;
        const cleanResponse = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleanResponse);
    } catch (error) {
        return {
            summary: `You scored ${percentage}% on this assessment.`,
            strengths: ['Self-awareness', 'Analytical thinking'],
            improvements: ['Continuous learning'],
            recommendations: ['Seek mentorship', 'Take relevant courses']
        };
    }
}

// ============================================
// GET ASSESSMENT RESULTS
// ============================================

export async function getAssessmentResults(sessionId) {
    try {
        const { data, error } = await supabase
            .from('user_assessments')
            .select('*, assessment:assessment_id(*)')
            .eq('session_id', sessionId)
            .single();
        
        if (error) throw error;
        
        return { success: true, results: data };
    } catch (error) {
        console.error('Error getting results:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// USER ASSESSMENT HISTORY
// ============================================

export async function getUserAssessmentHistory(userId) {
    try {
        const { data, error } = await supabase
            .from('user_assessments')
            .select('*, assessment:assessment_id(title, assessment_type)')
            .eq('user_id', userId)
            .eq('status', 'completed')
            .order('completed_at', { ascending: false });
        
        if (error) throw error;
        
        return { success: true, history: data || [] };
    } catch (error) {
        console.error('Error getting history:', error);
        return { success: false, history: [] };
    }
}

// ============================================
// REPORT GENERATION
// ============================================

export async function generateAssessmentReport(userAssessmentId, userId) {
    const { data: userAssessment, error } = await supabase
        .from('user_assessments')
        .select('*, assessment:assessments(*)')
        .eq('id', userAssessmentId)
        .eq('user_id', userId)
        .single();
    
    if (error) throw error;
    
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single();
    
    const reportUrl = `https://www.bluskyeconsult.com/reports/${userAssessmentId}`;
    
    await supabase
        .from('user_assessments')
        .update({ report_url: reportUrl })
        .eq('id', userAssessmentId);
    
    return { reportUrl, html: generateReportHTML(userAssessment, profile) };
}

function generateReportHTML(userAssessment, profile) {
    const insights = userAssessment.insights || {};
    const dimensionScores = userAssessment.dimension_scores || {};
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>ODUSBABA Assessment Report</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; background: #020617; color: #fff; padding: 40px; }
                .container { max-width: 800px; margin: 0 auto; background: #0f172a; border-radius: 16px; padding: 32px; }
                .header { text-align: center; border-bottom: 1px solid #1e293b; padding-bottom: 20px; margin-bottom: 20px; }
                .score { font-size: 48px; font-weight: bold; color: #0ea5e9; text-align: center; margin: 20px 0; }
                .dimension { margin: 15px 0; }
                .dimension-bar { background: #1e293b; border-radius: 8px; height: 8px; overflow: hidden; }
                .dimension-fill { background: #0ea5e9; height: 100%; border-radius: 8px; }
                .footer { text-align: center; font-size: 12px; color: #475569; margin-top: 30px; padding-top: 20px; border-top: 1px solid #1e293b; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>ODUSBABA Assessment Report</h1>
                    <p>${userAssessment.assessment?.title}</p>
                    <p>Completed: ${new Date(userAssessment.completed_at).toLocaleDateString()}</p>
                </div>
                <div class="score">
                    ${userAssessment.percentage}%
                    <div style="font-size: 14px; color: #94a3b8;">Overall Score</div>
                </div>
                <div style="background: #1e293b; border-radius: 12px; padding: 20px; margin: 20px 0;">
                    <h3>Performance Level: ${userAssessment.performance_level?.toUpperCase()}</h3>
                    <p>${insights.summary || `You scored ${userAssessment.percentage}% on this assessment.`}</p>
                </div>
                <h3>Dimension Breakdown</h3>
                ${Object.entries(dimensionScores).map(([dim, score]) => `
                    <div class="dimension">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span>${dim.replace(/_/g, ' ').toUpperCase()}</span>
                            <span>${score}%</span>
                        </div>
                        <div class="dimension-bar">
                            <div class="dimension-fill" style="width: ${score}%"></div>
                        </div>
                    </div>
                `).join('')}
                ${insights.strengths?.length > 0 ? `
                    <h3>Strengths</h3>
                    <ul>${insights.strengths.map(s => `<li>${s}</li>`).join('')}</ul>
                ` : ''}
                ${insights.recommendations?.length > 0 ? `
                    <h3>Recommendations</h3>
                    <ul>${insights.recommendations.map(r => `<li>${r}</li>`).join('')}</ul>
                ` : ''}
                <div class="footer">
                    <p>BluSkye Integrated Consult | ODUSBABA Intelligence</p>
                    <p>Creating Value for Partnership</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

// ============================================
// AI-ASSISTED ASSESSMENT CREATION
// ============================================

export async function generateAIAssessment(topic, difficulty, numberOfQuestions, adminId) {
    if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
    }
    
    const prompt = `Create a professional ${difficulty} level assessment on "${topic}" with ${numberOfQuestions} questions.

Return as JSON with this exact structure:
{
    "title": "Assessment title",
    "description": "2-3 sentence description",
    "instructions": "Clear instructions for test takers",
    "time_limit_minutes": 30,
    "questions": [
        {
            "question_text": "Question text?",
            "question_type": "multiple_choice",
            "points": 1,
            "dimension": "relevant_dimension",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_answer": 0
        }
    ]
}

Make questions professional, insightful, and appropriate. Return ONLY valid JSON.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are an expert psychometrician and assessment designer.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 4000
        })
    });
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    const cleanResponse = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const assessmentData = JSON.parse(cleanResponse);
    
    // Create assessment in database
    const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .insert({
            title: assessmentData.title,
            description: assessmentData.description,
            instructions: assessmentData.instructions,
            assessment_type: 'ai_generated',
            difficulty: difficulty,
            time_limit_minutes: assessmentData.time_limit_minutes,
            question_count: assessmentData.questions.length,
            is_active: true,
            created_by: adminId,
            created_at: new Date().toISOString()
        })
        .select()
        .single();
    
    if (assessmentError) throw assessmentError;
    
    // Add questions and options
    for (let i = 0; i < assessmentData.questions.length; i++) {
        const q = assessmentData.questions[i];
        
        const { data: question, error: qError } = await supabase
            .from('assessment_questions')
            .insert({
                assessment_id: assessment.id,
                question_text: q.question_text,
                question_type: q.question_type,
                points: q.points,
                dimension: q.dimension,
                sort_order: i,
                created_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (qError) throw qError;
        
        for (let j = 0; j < q.options.length; j++) {
            await supabase
                .from('assessment_options')
                .insert({
                    question_id: question.id,
                    option_text: q.options[j],
                    is_correct: j === q.correct_answer,
                    sort_order: j,
                    created_at: new Date().toISOString()
                });
        }
    }
    
    return { success: true, assessmentId: assessment.id };
}

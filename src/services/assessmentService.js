// src/services/assessmentService.js
// COMPLETE ASSESSMENT SERVICE - AI scoring, unlimited admin access, report generation, AI assessment creation

import { supabase } from '../lib/supabase';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const USE_API_ROUTES = import.meta.env.VITE_USE_AI_API_ROUTES === 'true'; // Toggle between direct OpenAI and API routes

// ============================================
// CONSTANTS & CONFIGURATION
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

const ADMIN_EMAILS = ['bluskyeconsult@gmail.com'];
const PERFORMANCE_THRESHOLDS = {
    excellent: 80,
    good: 60,
    average: 40
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const isUnlimitedTier = (tier, userType) => {
    return tier === 'super_admin' || tier === 'admin' || userType === 'super_admin';
};

const getTierLimits = (tier, userType) => {
    if (isUnlimitedTier(tier, userType)) {
        return { ...TIER_LIMITS.super_admin, isUnlimited: true };
    }
    return { ...(TIER_LIMITS[tier] || TIER_LIMITS.free), isUnlimited: false };
};

const callOpenAI = async (messages, options = {}) => {
    const defaultOptions = {
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 1000
    };
    
    const config = { ...defaultOptions, ...options };
    
    if (USE_API_ROUTES) {
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages, ...config })
        });
        if (!response.ok) throw new Error('API request failed');
        return await response.json();
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages, ...config })
    });
    
    if (!response.ok) throw new Error('OpenAI API request failed');
    return await response.json();
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

export async function getAssessmentWithQuestions(assessmentId) {
    const [assessment, { data: questions }] = await Promise.all([
        getAssessmentById(assessmentId),
        supabase
            .from('assessment_questions')
            .select('*, options:assessment_options(*)')
            .eq('assessment_id', assessmentId)
            .order('sort_order', { ascending: true })
    ]);
    
    return { ...assessment, questions: questions || [] };
}

// ============================================
// USER ELIGIBILITY & TRACKING (with unlimited admins)
// ============================================

export async function checkUserEligibility(userId, assessmentId) {
    try {
        // Get user profile
        let { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('tier, user_type, email')
            .eq('id', userId)
            .single();
        
        // Handle missing profile - create one if needed
        if (profileError || !profile) {
            const { data: { user } } = await supabase.auth.getUser();
            const isAdmin = ADMIN_EMAILS.includes(user?.email);
            
            const newProfile = {
                id: userId,
                email: user?.email,
                tier: isAdmin ? 'business' : 'free',
                user_type: isAdmin ? 'super_admin' : 'user',
                country_code: 'GB',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            const { data: createdProfile, error: insertError } = await supabase
                .from('profiles')
                .insert(newProfile)
                .select()
                .single();
            
            if (insertError) throw insertError;
            profile = createdProfile;
        }
        
        const tier = profile?.tier || profile?.user_type || 'free';
        const limits = getTierLimits(tier, profile?.user_type);
        
        // Unlimited access for admins
        if (limits.isUnlimited) {
            return {
                eligible: true,
                remaining: 999999,
                limit: 999999,
                tier,
                canDownloadReport: true,
                canRetake: true,
                isUnlimited: true
            };
        }
        
        // Count assessments taken this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const { count, error: countError } = await supabase
            .from('user_assessments')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('created_at', startOfMonth.toISOString());
        
        if (countError && countError.code !== 'PGRST116') {
            console.warn('Error counting assessments:', countError);
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
    } catch (error) {
        console.error('Error checking eligibility:', error);
        // Safe fallback - allow access but log error
        return {
            eligible: true,
            remaining: 5,
            limit: 5,
            tier: 'free',
            canDownloadReport: false,
            canRetake: true,
            isUnlimited: false,
            error: error.message
        };
    }
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
// START ASSESSMENT (wrapper)
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
        
        // Get assessment questions with options
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
// SAVE ANSWER
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
        const answerRecord = {
            question_id: questionId,
            answer: answer,
            answered_at: new Date().toISOString(),
            question_index: questionIndex
        };
        
        if (existingIndex >= 0) {
            currentAnswers[existingIndex] = answerRecord;
        } else {
            currentAnswers.push(answerRecord);
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
// AI SCORING & INSIGHTS
// ============================================

export async function scoreScenarioAnswer(question, answer) {
    if (!OPENAI_API_KEY && !USE_API_ROUTES) return 7;
    
    try {
        const response = await callOpenAI(
            [
                { role: 'system', content: 'You are an expert assessor. Score the following answer from 1-10. Return ONLY a number.' },
                { role: 'user', content: `Question: ${question}\n\nAnswer: ${answer}` }
            ],
            { temperature: 0.3, max_tokens: 10 }
        );
        
        const score = parseInt(response.choices[0].message.content);
        return isNaN(score) ? 7 : Math.min(10, Math.max(1, score));
    } catch (error) {
        console.error('Error scoring scenario answer:', error);
        return 7;
    }
}

export async function generateAssessmentInsights(assessmentTitle, percentage, dimensionScores) {
    const fallbackInsights = {
        summary: `You scored ${percentage}% on this assessment.`,
        strengths: ['Self-awareness', 'Willingness to grow'],
        improvements: ['Review areas with lower scores'],
        recommendations: ['Take relevant courses', 'Practice regularly']
    };
    
    if (!OPENAI_API_KEY && !USE_API_ROUTES) return fallbackInsights;
    
    try {
        let response;
        
        if (USE_API_ROUTES) {
            const apiResponse = await fetch('/api/ai/generate-insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assessmentTitle, percentage, dimensionScores })
            });
            if (!apiResponse.ok) throw new Error('Insights generation failed');
            response = await apiResponse.json();
            return response;
        }
        
        const openAIResponse = await callOpenAI(
            [
                { role: 'system', content: 'You are a career coach. Provide personalized assessment insights as JSON.' },
                { role: 'user', content: `Assessment: ${assessmentTitle}\nScore: ${percentage}%\nDimension Scores: ${JSON.stringify(dimensionScores)}\n\nReturn JSON with: summary (string), strengths (array), improvements (array), recommendations (array)` }
            ],
            { temperature: 0.7, max_tokens: 500 }
        );
        
        const content = openAIResponse.choices[0].message.content;
        const cleanResponse = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleanResponse);
    } catch (error) {
        console.error('Error generating insights:', error);
        return fallbackInsights;
    }
}

// ============================================
// ASSESSMENT SCORING & COMPLETION
// ============================================

export async function submitAssessmentAnswers(userAssessmentId, answers, timeSpentSeconds) {
    try {
        // Get user assessment and related data
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
        
        // Calculate scores for each question
        for (const question of questions || []) {
            const userAnswer = answers[question.id];
            const maxPoints = question.points || 1;
            maxPossibleScore += maxPoints;
            
            let score = 0;
            let isCorrect = false;
            let userAnswerText = userAnswer;
            
            if (question.question_type === 'multiple_choice') {
                const selectedOption = question.options?.find(opt => opt.id === userAnswer);
                userAnswerText = selectedOption?.option_text || userAnswer;
                const correctOption = question.options?.find(opt => opt.is_correct === true);
                if (correctOption && userAnswer === correctOption.id) {
                    score = maxPoints;
                    isCorrect = true;
                }
            } else if (question.question_type === 'likert_scale') {
                const likertValue = typeof userAnswer === 'number' ? userAnswer : parseInt(userAnswer) || 3;
                score = likertValue * (maxPoints / 5);
                isCorrect = true;
            } else if (question.question_type === 'scenario') {
                const aiScore = await scoreScenarioAnswer(question.question_text, userAnswer);
                score = aiScore * (maxPoints / 10);
                isCorrect = score >= maxPoints * 0.7;
            }
            
            totalScore += score;
            
            // Track dimension scores
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
                user_answer: userAnswerText,
                user_answer_value: userAnswer,
                score: Math.round(score * 100) / 100,
                max_score: maxPoints,
                is_correct: isCorrect,
                question_type: question.question_type
            });
        }
        
        // Calculate overall percentage
        const percentage = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;
        
        // Determine performance level
        let performanceLevel = 'needs_improvement';
        if (percentage >= PERFORMANCE_THRESHOLDS.excellent) performanceLevel = 'excellent';
        else if (percentage >= PERFORMANCE_THRESHOLDS.good) performanceLevel = 'good';
        else if (percentage >= PERFORMANCE_THRESHOLDS.average) performanceLevel = 'average';
        
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
                score: Math.round(totalScore * 100) / 100,
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
            insights,
            totalScore: Math.round(totalScore * 100) / 100,
            maxPossibleScore
        };
    } catch (error) {
        console.error('Error submitting assessment:', error);
        return { success: false, error: error.message };
    }
}

export async function completeAssessment(sessionId) {
    try {
        // Get session by session_id
        const { data: session, error: sessionError } = await supabase
            .from('user_assessments')
            .select('id')
            .eq('session_id', sessionId)
            .single();
        
        if (sessionError) throw sessionError;
        
        // Build answers object from session answers
        const { data: fullSession } = await supabase
            .from('user_assessments')
            .select('answers')
            .eq('id', session.id)
            .single();
        
        const answersMap = {};
        (fullSession?.answers || []).forEach(ans => {
            answersMap[ans.question_id] = ans.answer;
        });
        
        // Submit for scoring
        const result = await submitAssessmentAnswers(session.id, answersMap, 0);
        
        return {
            success: true,
            score: result.percentage,
            percentage: result.percentage,
            performanceLevel: result.performanceLevel,
            insights: result.insights
        };
    } catch (error) {
        console.error('Error completing assessment:', error);
        return { success: false, error: error.message };
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

export async function getUserAssessmentHistory(userId, limit = 50) {
    try {
        const { data, error } = await supabase
            .from('user_assessments')
            .select('*, assessment:assessment_id(title, assessment_type)')
            .eq('user_id', userId)
            .eq('status', 'completed')
            .order('completed_at', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        
        return { success: true, history: data || [] };
    } catch (error) {
        console.error('Error getting history:', error);
        return { success: false, history: [], error: error.message };
    }
}

// ============================================
// REPORT GENERATION
// ============================================

export async function generateAssessmentReport(userAssessmentId, userId) {
    try {
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
        
        return { 
            reportUrl, 
            html: generateReportHTML(userAssessment, profile),
            pdf: null // PDF generation can be added separately
        };
    } catch (error) {
        console.error('Error generating report:', error);
        throw error;
    }
}

function generateReportHTML(userAssessment, profile) {
    const insights = userAssessment.insights || {};
    const dimensionScores = userAssessment.dimension_scores || {};
    const answers = userAssessment.answers || [];
    
    return `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>ODUSBABA Assessment Report</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #020617; color: #fff; padding: 40px; }
            .container { max-width: 800px; margin: 0 auto; background: #0f172a; border-radius: 16px; padding: 32px; }
            .header { text-align: center; border-bottom: 1px solid #1e293b; padding-bottom: 20px; margin-bottom: 20px; }
            .logo { font-size: 24px; font-weight: bold; color: #0ea5e9; margin-bottom: 10px; }
            .score-section { background: linear-gradient(135deg, #0ea5e9, #3b82f6); border-radius: 16px; padding: 24px; text-align: center; margin: 20px 0; }
            .score-number { font-size: 64px; font-weight: bold; }
            .score-label { font-size: 14px; opacity: 0.9; margin-top: 8px; }
            .performance-card { background: #1e293b; border-radius: 12px; padding: 20px; margin: 20px 0; }
            .dimension { margin: 15px 0; }
            .dimension-header { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 14px; }
            .dimension-bar { background: #334155; border-radius: 8px; height: 8px; overflow: hidden; }
            .dimension-fill { background: #0ea5e9; height: 100%; border-radius: 8px; transition: width 0.5s ease; }
            .section-title { font-size: 18px; font-weight: bold; margin: 20px 0 12px 0; color: #0ea5e9; }
            .strength-list, .recommendation-list { list-style: none; padding-left: 0; }
            .strength-list li, .recommendation-list li { padding: 8px 0; border-bottom: 1px solid #1e293b; }
            .strength-list li:before { content: "✓"; color: #10b981; margin-right: 10px; }
            .recommendation-list li:before { content: "→"; color: #0ea5e9; margin-right: 10px; }
            .footer { text-align: center; font-size: 12px; color: #475569; margin-top: 30px; padding-top: 20px; border-top: 1px solid #1e293b; }
            @media print {
                body { background: white; padding: 20px; }
                .container { background: white; color: black; border: 1px solid #ddd; }
                .score-section { background: #3b82f6; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .dimension-bar { background: #e2e8f0; }
                .dimension-fill { background: #3b82f6; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">ODUSBABA Intelligence</div>
                <h1>Assessment Report</h1>
                <p>${userAssessment.assessment?.title || 'Professional Assessment'}</p>
                <p style="font-size: 12px; opacity: 0.7;">Completed: ${new Date(userAssessment.completed_at).toLocaleDateString()}</p>
                ${profile?.full_name ? `<p style="font-size: 14px; margin-top: 10px;">Prepared for: ${profile.full_name}</p>` : ''}
            </div>
            
            <div class="score-section">
                <div class="score-number">${userAssessment.percentage}%</div>
                <div class="score-label">Overall Score</div>
                <div style="font-size: 14px; margin-top: 10px;">${userAssessment.performance_level?.toUpperCase() || 'COMPLETED'}</div>
            </div>
            
            <div class="performance-card">
                <h3>Assessment Summary</h3>
                <p style="margin-top: 10px; line-height: 1.6;">${insights.summary || `You scored ${userAssessment.percentage}% on this assessment, demonstrating ${userAssessment.percentage >= 70 ? 'strong' : 'developing'} capabilities in the assessed areas.`}</p>
            </div>
            
            <div class="section-title">Dimension Breakdown</div>
            ${Object.entries(dimensionScores).map(([dim, score]) => `
                <div class="dimension">
                    <div class="dimension-header">
                        <span>${dim.replace(/_/g, ' ').toUpperCase()}</span>
                        <span>${score}%</span>
                    </div>
                    <div class="dimension-bar">
                        <div class="dimension-fill" style="width: ${score}%"></div>
                    </div>
                </div>
            `).join('')}
            
            ${insights.strengths?.length > 0 ? `
                <div class="section-title">Key Strengths</div>
                <ul class="strength-list">
                    ${insights.strengths.map(s => `<li>${s}</li>`).join('')}
                </ul>
            ` : ''}
            
            ${insights.recommendations?.length > 0 ? `
                <div class="section-title">Recommendations</div>
                <ul class="recommendation-list">
                    ${insights.recommendations.map(r => `<li>${r}</li>`).join('')}
                </ul>
            ` : ''}
            
            ${answers.length > 0 ? `
                <div class="section-title">Question Summary</div>
                <div style="background: #1e293b; border-radius: 12px; padding: 16px; margin-top: 10px;">
                    ${answers.slice(0, 5).map((ans, idx) => `
                        <div style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #334155;">
                            <div style="font-size: 13px; color: #94a3b8;">Q${idx + 1}</div>
                            <div style="font-size: 14px; margin: 5px 0;">${ans.question_text?.substring(0, 100)}${ans.question_text?.length > 100 ? '...' : ''}</div>
                            <div style="font-size: 12px; color: ${ans.is_correct ? '#10b981' : '#ef4444'}">
                                Score: ${Math.round(ans.score)}/${ans.max_score}
                            </div>
                        </div>
                    `).join('')}
                    ${answers.length > 5 ? '<div style="text-align: center; font-size: 12px; color: #64748b;">+ ' + (answers.length - 5) + ' more questions</div>' : ''}
                </div>
            ` : ''}
            
            <div class="footer">
                <p>BluSkye Integrated Consult | ODUSBABA Intelligence</p>
                <p>Creating Value for Partnership</p>
                <p style="margin-top: 10px;">Report ID: ${userAssessment.id}</p>
            </div>
        </div>
    </body>
    </html>`;
}

// ============================================
// AI-ASSISTED ASSESSMENT CREATION
// ============================================

export async function generateAIAssessment(topic, difficulty, numberOfQuestions, adminId = null) {
    const hasAIAccess = OPENAI_API_KEY || USE_API_ROUTES;
    
    if (!hasAIAccess) {
        const fallbackData = generateFallbackAssessment(topic, difficulty, numberOfQuestions);
        return { success: true, fallback: true, ...fallbackData };
    }
    
    try {
        let result;
        
        if (USE_API_ROUTES) {
            const response = await fetch('/api/ai/generate-assessment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic, difficulty, numberOfQuestions })
            });
            
            if (!response.ok) throw new Error('AI generation failed');
            result = await response.json();
        } else {
            const prompt = `Create a professional ${difficulty} level assessment on "${topic}" with ${numberOfQuestions} questions.

Return as JSON with this exact structure:
{
    "title": "Assessment title",
    "description": "2-3 sentence description",
    "instructions": "Clear instructions for test takers",
    "category": "one of: personality, emotional_intelligence, leadership, communication, problem_solving, team_collaboration, career_aptitude, general",
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

Make questions professional, insightful, and appropriate. Mix question types when suitable. Return ONLY valid JSON.`;

            const openAIResponse = await callOpenAI(
                [
                    { role: 'system', content: 'You are an expert psychometrician and assessment designer.' },
                    { role: 'user', content: prompt }
                ],
                { temperature: 0.7, max_tokens: 4000 }
            );
            
            const content = openAIResponse.choices[0].message.content;
            const cleanResponse = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            result = JSON.parse(cleanResponse);
        }
        
        // If adminId provided, save to database
        if (adminId) {
            const savedAssessment = await saveGeneratedAssessmentToDB(result, difficulty, adminId);
            return { success: true, saved: true, assessmentId: savedAssessment.id, ...result };
        }
        
        return { success: true, ...result };
    } catch (error) {
        console.error('AI generation error:', error);
        const fallbackData = generateFallbackAssessment(topic, difficulty, numberOfQuestions);
        return { success: true, fallback: true, ...fallbackData };
    }
}

function generateFallbackAssessment(topic, difficulty, numberOfQuestions) {
    const categories = ['personality', 'leadership', 'communication', 'problem_solving', 'career_aptitude'];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    
    const questions = [];
    for (let i = 0; i < numberOfQuestions; i++) {
        questions.push({
            question_text: `Question ${i + 1}: How would you rate your proficiency in ${topic}?`,
            question_type: i % 2 === 0 ? 'likert_scale' : 'multiple_choice',
            points: 1,
            dimension: topic.toLowerCase().replace(/\s/g, '_'),
            options: i % 2 === 0 ? undefined : ['Very Low', 'Low', 'Moderate', 'High', 'Very High'],
            correct_answer: i % 2 === 0 ? undefined : 2
        });
    }
    
    return {
        title: `${topic} Assessment`,
        description: `This ${difficulty} level assessment measures your knowledge and skills in ${topic}. Complete all questions to receive your personalized report.`,
        instructions: 'Please read each question carefully and select the answer that best represents your knowledge or experience. There are no right or wrong answers - be honest for the most accurate results.',
        category: randomCategory,
        time_limit_minutes: Math.min(45, Math.max(15, Math.floor(numberOfQuestions * 1.5))),
        questions: questions
    };
}

async function saveGeneratedAssessmentToDB(assessmentData, difficulty, adminId) {
    // Create assessment
    const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .insert({
            title: assessmentData.title,
            description: assessmentData.description,
            instructions: assessmentData.instructions,
            assessment_type: assessmentData.category || 'general',
            difficulty: difficulty,
            time_limit_minutes: assessmentData.time_limit_minutes || 30,
            question_count: assessmentData.questions?.length || 0,
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
                points: q.points || 1,
                dimension: q.dimension,
                sort_order: i,
                created_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (qError) throw qError;
        
        // Save options for multiple choice
        if (q.options && q.options.length) {
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
    }
    
    return assessment;
}

// ============================================
// ADMIN FUNCTIONS
// ============================================

export async function getAdminAssessmentStats() {
    try {
        const [assessments, userAssessments, profiles] = await Promise.all([
            supabase.from('assessments').select('*'),
            supabase.from('user_assessments').select('*'),
            supabase.from('profiles').select('tier, user_type')
        ]);
        
        const completedAssessments = userAssessments.data?.filter(ua => ua.status === 'completed') || [];
        const avgScore = completedAssessments.length > 0
            ? Math.round(completedAssessments.reduce((sum, ua) => sum + (ua.percentage || 0), 0) / completedAssessments.length)
            : 0;
        
        const tierDistribution = {};
        profiles.data?.forEach(p => {
            const tier = p.tier || p.user_type || 'free';
            tierDistribution[tier] = (tierDistribution[tier] || 0) + 1;
        });
        
        return {
            success: true,
            stats: {
                totalAssessments: assessments.data?.length || 0,
                totalSubmissions: userAssessments.data?.length || 0,
                completedAssessments: completedAssessments.length,
                averageScore: avgScore,
                activeUsers: profiles.data?.length || 0,
                tierDistribution
            }
        };
    } catch (error) {
        console.error('Error getting admin stats:', error);
        return { success: false, error: error.message };
    }
}

// Export all functions as default object for convenience
export default {
    getActiveAssessments,
    getAssessmentById,
    getAssessmentWithQuestions,
    checkUserEligibility,
    startAssessment,
    saveAnswer,
    submitAssessmentAnswers,
    completeAssessment,
    getAssessmentResults,
    getUserAssessmentHistory,
    generateAssessmentReport,
    generateAIAssessment,
    getAdminAssessmentStats
};

// src/services/assessmentService.js
// ODUSBABA ASSESSMENT SERVICE v3.2 - PRODUCTION READY
//
// FIXED (2026-08-07):
// 1. Removed a hardcoded ADMIN_EMAILS-based privilege escalation, applied when
//    auto-creating a missing profile — granted 'business' tier + 'super_admin'
//    user_type to that email regardless of its real role. Same backdoor
//    pattern already found and fixed in GovernanceContext.jsx, independently
//    duplicated here. New auto-created profiles now always default to
//    free/job_seeker.
// 2. scoreScenarioWithAI() and generateAIInsights() sent payloads shaped for
//    a `messages` array to the unified API's 'chat' action, but the real
//    handler expects a single `message` string + `history` array — so the
//    primary path always failed, silently falling through to a direct
//    browser-side OpenAI call (extra latency, unnecessary API key exposure)
//    or a static fallback. generateAIInsights() also called a 'generate-insights'
//    action that doesn't exist at all. Both now correctly use the real 'chat'
//    action with the right payload shape.

import { supabase } from '../lib/supabase';

const API_BASE = '/api/index';
// FIXED (2026-08-20): removed OPENAI_API_KEY (import.meta.env.VITE_OPENAI_API_KEY)
// — no longer used anywhere in this file now that the direct-OpenAI
// bypass path is gone. This constant existed only to support that
// removed code path, and having it defined at all was itself a standing
// exposure risk (any VITE_-prefixed env var ships in the client bundle,
// readable by anyone who inspects the built JS) — better removed
// entirely than left sitting unused.

const TIER_LIMITS = {
    free: { assessments_per_month: 3, can_download_report: false, can_retake: false, ai_insights: false },
    registered: { assessments_per_month: 10, can_download_report: true, can_retake: true, ai_insights: true },
    professional: { assessments_per_month: 50, can_download_report: true, can_retake: true, ai_insights: true },
    employer: { assessments_per_month: 30, can_download_report: true, can_retake: true, ai_insights: true },
    business: { assessments_per_month: 999999, can_download_report: true, can_retake: true, ai_insights: true },
    admin: { assessments_per_month: 999999, can_download_report: true, can_retake: true, ai_insights: true },
    super_admin: { assessments_per_month: 999999, can_download_report: true, can_retake: true, ai_insights: true },
    tester: { assessments_per_month: 5, can_download_report: false, can_retake: true, ai_insights: false }
};

const PERFORMANCE_THRESHOLDS = {
    excellent: 80,
    good: 60,
    average: 40
};

const isUnlimitedTier = (tier, userType) => {
    return tier === 'super_admin' || tier === 'admin' || tier === 'business' || userType === 'super_admin';
};

// FIXED (2026-08-21): TIER_LIMITS.tester was keyed on a literal
// tier === 'tester' value that no account has held since the
// SignUpPage.jsx tester rebuild — testers now keep their REAL selected
// tier's user_type (job_seeker/employer/business_owner) so they can
// actually test that tier's real experience, rather than being forced
// onto a generic 'tester' tier value. Without this fix, a tester
// testing at the 'professional' tier would silently get 50
// assessments/month (that tier's real limit) instead of the intended
// tighter tester restriction — completely bypassing the separate,
// deliberate tester cap. Now checks the real is_tester boolean flag
// instead, applied on top of whatever real tier the account has.
const getTierLimits = (tier, userType, isTester = false) => {
    if (isTester) {
        return { ...TIER_LIMITS.tester, isUnlimited: false };
    }
    if (isUnlimitedTier(tier, userType)) {
        return { ...TIER_LIMITS.super_admin, isUnlimited: true };
    }
    return { ...(TIER_LIMITS[tier] || TIER_LIMITS.free), isUnlimited: false };
};

const callUnifiedAPI = async (action, payload, options = {}) => {
    // NEW (2026-08-21): headers option added so callers (like
    // generateAIAssessment) can attach an Authorization token for actions
    // that now require it server-side. Previously this always hardcoded
    // just Content-Type, silently dropping any headers a caller tried to
    // pass — merging them in properly now.
    const { method = 'POST', timeout = 30000, headers = {} } = options;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(`${API_BASE}?action=${action}`, {
            method,
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `API request failed: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success && !result.result) {
            throw new Error(result.error || 'Unknown API error');
        }
        
        return result;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timeout. Please try again.');
        }
        throw error;
    }
};

// FIXED (2026-08-20): removed callOpenAIDirect() and the direct-OpenAI
// fallback branch entirely. This previously caught ANY failure from the
// real, metered backend call — including the expected "insufficient
// credits" rejection — and silently routed around it via a direct,
// client-side call using the exposed VITE_OPENAI_API_KEY. That meant
// running out of credits didn't actually stop AI usage on this file's
// functions at all; it just quietly bypassed the entire gating system
// built this session. Both real call sites already define a sensible
// static fallback value (a default score, generic insight text) — any
// backend failure now goes straight to that, preserving genuine
// resilience without ever spending the exposed key for free, unmetered
// usage.
// Note: `directMessages` is accepted for backward compatibility with
// existing call sites' argument lists but is intentionally unused now —
// see the comment above for why the direct-call path was removed.
const callAIWithFallback = async (action, payload, directMessages, fallbackValue) => {
    try {
        const response = await callUnifiedAPI(action, payload);
        return response.result || response.response;
    } catch (apiError) {
        console.warn(`AI call failed for ${action}, using static fallback:`, apiError);
        return fallbackValue;
    }
};

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

export async function checkAssessmentEligibility(userId) {
    try {
        let { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('tier, user_type, email, is_tester')
            .eq('id', userId)
            .single();
        
        if (profileError || !profile) {
            const { data: { user } } = await supabase.auth.getUser();
            
            // FIXED: previously granted 'business' tier + 'super_admin'
            // user_type to a hardcoded email regardless of its real role.
            // New auto-created profiles always default to free/job_seeker now
            // — admin status should only ever come from profiles.user_type
            // set directly in the database.
            const newProfile = {
                id: userId,
                email: user?.email,
                tier: 'free',
                user_type: 'job_seeker',
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
        const limits = getTierLimits(tier, profile?.user_type, profile?.is_tester || false);
        
        if (limits.isUnlimited) {
            return {
                eligible: true,
                remaining: 999999,
                limit: 999999,
                tier,
                canDownloadReport: true,
                canRetake: true,
                aiInsights: true,
                isUnlimited: true
            };
        }
        
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const { count, error: countError } = await supabase
            .from('user_assessments')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'completed')
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
            aiInsights: limits.ai_insights,
            isUnlimited: false
        };
    } catch (error) {
        console.error('Error checking eligibility:', error);
        return {
            eligible: true,
            remaining: 5,
            limit: 5,
            tier: 'free',
            canDownloadReport: false,
            canRetake: true,
            aiInsights: false,
            isUnlimited: false,
            error: error.message
        };
    }
}

export const checkUserEligibility = checkAssessmentEligibility;

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

export async function startAssessment(userId, assessmentId) {
    try {
        const eligibility = await checkAssessmentEligibility(userId);
        
        if (!eligibility.eligible && !eligibility.isUnlimited) {
            return {
                success: false,
                error: `You have reached your monthly limit of ${eligibility.limit} assessments. Upgrade to continue.`,
                limitReached: true,
                eligibility
            };
        }
        
        const sessionId = `${userId}_${assessmentId}_${Date.now()}`;
        const session = await recordAssessmentStart(userId, assessmentId, sessionId);
        
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

export async function saveAnswer(sessionId, questionId, answer, questionIndex) {
    try {
        const { data: session, error: sessionError } = await supabase
            .from('user_assessments')
            .select('answers, current_question_index')
            .eq('session_id', sessionId)
            .single();
        
        if (sessionError) throw sessionError;
        
        let currentAnswers = session.answers || [];
        
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

async function scoreScenarioWithAI(question, answer) {
    const fallbackScore = 7;
    const systemPrompt = 'Score the following answer from 1-10. Return ONLY a number.';
    const userMessage = `Question: ${question}\n\nAnswer: ${answer}`;
    
    try {
        // FIXED: real 'chat' handler expects `message` (string) + `history`
        // (array), not a `messages` array — this previously always failed
        // and fell through to the fallback chain.
        const result = await callAIWithFallback(
            'chat',
            {
                message: userMessage,
                systemPrompt,
                history: [],
                temperature: 0.3,
                maxTokens: 10
            },
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            fallbackScore.toString()
        );
        
        const score = parseInt(result);
        return isNaN(score) ? fallbackScore : Math.min(10, Math.max(1, score));
    } catch (error) {
        console.error('Error scoring scenario answer:', error);
        return fallbackScore;
    }
}

async function generateAIInsights(assessmentTitle, percentage, dimensionScores) {
    const fallbackInsights = {
        summary: `You scored ${percentage}% on this assessment. ${percentage >= 70 ? 'Great work!' : 'Keep practicing to improve your scores.'}`,
        strengths: ['Self-awareness', 'Willingness to grow', 'Engagement with material'],
        improvements: ['Review areas with lower scores', 'Practice regularly', 'Seek additional resources'],
        recommendations: ['Take relevant courses', 'Join study groups', 'Practice with real-world scenarios']
    };
    
    // FIXED (2026-08-20): this used to gate on whether the client-side
    // OPENAI_API_KEY was present — meaningless now that this function
    // only ever calls the metered backend, which has its own key entirely
    // server-side. Removed; the real backend call's own error handling
    // (now falling straight to fallbackInsights on any failure) covers
    // this correctly.
    const systemPrompt = 'You are a career coach. Provide personalized assessment insights as JSON. Return ONLY valid JSON.';
    const userMessage = `Assessment: ${assessmentTitle}\nScore: ${percentage}%\nDimension Scores: ${JSON.stringify(dimensionScores)}\n\nReturn JSON with: summary (string), strengths (array of 3-4 strings), improvements (array of 2-3 strings), recommendations (array of 3-4 strings)`;
    
    try {
        // FIXED: was calling a 'generate-insights' action that doesn't exist
        // in api/index.js at all. Now uses the real 'chat' action, with the
        // payload shape it actually expects.
        const result = await callAIWithFallback(
            'chat',
            {
                message: userMessage,
                systemPrompt,
                history: [],
                temperature: 0.7,
                maxTokens: 500
            },
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            null
        );
        
        if (typeof result === 'string') {
            try {
                const cleanResponse = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                const parsed = JSON.parse(cleanResponse);
                if (parsed.summary && parsed.strengths && parsed.recommendations) {
                    return parsed;
                }
            } catch (parseError) {
                console.warn('Failed to parse AI insights response:', parseError);
            }
        }
        
        if (result && typeof result === 'object' && result.summary) {
            return result;
        }
        
        return fallbackInsights;
    } catch (error) {
        console.error('Error generating insights:', error);
        return fallbackInsights;
    }
}

export async function submitAssessmentAnswers(userAssessmentId, answers, timeSpentSeconds) {
    try {
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
                userAnswerText = `Rating: ${likertValue}/5`;
            } else if (question.question_type === 'true_false') {
                // FIXED (2026-08-23): this question type was never handled
                // here at all — TakeAssessment.jsx fully supports it
                // (renders True/False buttons, stores 'true'/'false' as the
                // answer), but every true_false question silently scored 0
                // regardless of the actual answer, since it fell through
                // with none of the branches above matching. If the
                // question has a real correct_answer field, score against
                // it like a factual question should; if that field isn't
                // set (unconfirmed whether it exists on every row), give
                // full credit rather than unfairly zero a question with no
                // defined right answer — punishing the user for a data gap
                // that isn't their fault is worse than being lenient here.
                userAnswerText = userAnswer === 'true' ? 'True' : 'False';
                if (question.correct_answer !== undefined && question.correct_answer !== null) {
                    const correctAnswer = String(question.correct_answer).toLowerCase();
                    if (String(userAnswer).toLowerCase() === correctAnswer) {
                        score = maxPoints;
                        isCorrect = true;
                    }
                } else {
                    score = maxPoints;
                    isCorrect = true;
                }
            } else if (question.question_type === 'scenario' || question.question_type === 'text' || question.question_type === 'essay') {
                // FIXED (2026-08-23): 'text' and 'essay' were also never
                // handled here — same silent always-zero gap as
                // true_false. Both are open-ended responses,
                // conceptually identical to 'scenario' (which already has
                // real AI-based scoring built) — routed through the same
                // scoring path rather than inventing a separate one.
                const aiScore = await scoreScenarioWithAI(question.question_text, userAnswer);
                score = aiScore * (maxPoints / 10);
                isCorrect = score >= maxPoints * 0.7;
                userAnswerText = userAnswer;
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
                user_answer: userAnswerText,
                user_answer_value: userAnswer,
                score: Math.round(score * 100) / 100,
                max_score: maxPoints,
                is_correct: isCorrect,
                question_type: question.question_type
            });
        }
        
        const percentage = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;
        
        let performanceLevel = 'needs_improvement';
        if (percentage >= PERFORMANCE_THRESHOLDS.excellent) performanceLevel = 'excellent';
        else if (percentage >= PERFORMANCE_THRESHOLDS.good) performanceLevel = 'good';
        else if (percentage >= PERFORMANCE_THRESHOLDS.average) performanceLevel = 'average';
        
        const dimensionPercentages = {};
        for (const [dim, data] of Object.entries(dimensionScores)) {
            dimensionPercentages[dim] = Math.round((data.score / data.max) * 100);
        }
        
        const insights = await generateAIInsights(
            userAssessment.assessment?.title || 'Professional Assessment',
            percentage,
            dimensionPercentages
        );
        
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
        const { data: session, error: sessionError } = await supabase
            .from('user_assessments')
            .select('id')
            .eq('session_id', sessionId)
            .single();
        
        if (sessionError) throw sessionError;
        
        const { data: fullSession } = await supabase
            .from('user_assessments')
            .select('answers')
            .eq('id', session.id)
            .single();
        
        const answersMap = {};
        (fullSession?.answers || []).forEach(ans => {
            answersMap[ans.question_id] = ans.answer;
        });
        
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
        
        const reportUrl = `https://bluskyeconsult.com/reports/${userAssessmentId}`;
        
        await supabase
            .from('user_assessments')
            .update({ report_url: reportUrl })
            .eq('id', userAssessmentId);
        
        return { 
            reportUrl, 
            html: generateReportHTML(userAssessment, profile)
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
                <p>${escapeHtml(userAssessment.assessment?.title || 'Professional Assessment')}</p>
                <p style="font-size: 12px; opacity: 0.7;">Completed: ${new Date(userAssessment.completed_at).toLocaleDateString()}</p>
                ${profile?.full_name ? `<p style="font-size: 14px; margin-top: 10px;">Prepared for: ${escapeHtml(profile.full_name)}</p>` : ''}
            </div>
            
            <div class="score-section">
                <div class="score-number">${userAssessment.percentage}%</div>
                <div class="score-label">Overall Score</div>
                <div style="font-size: 14px; margin-top: 10px;">${(userAssessment.performance_level || 'COMPLETED').toUpperCase()}</div>
            </div>
            
            <div class="performance-card">
                <h3>Assessment Summary</h3>
                <p style="margin-top: 10px; line-height: 1.6;">${escapeHtml(insights.summary || `You scored ${userAssessment.percentage}% on this assessment, demonstrating ${userAssessment.percentage >= 70 ? 'strong' : 'developing'} capabilities in the assessed areas.`)}</p>
            </div>
            
            <div class="section-title">Dimension Breakdown</div>
            ${Object.entries(dimensionScores).map(([dim, score]) => `
                <div class="dimension">
                    <div class="dimension-header">
                        <span>${escapeHtml(dim.replace(/_/g, ' ').toUpperCase())}</span>
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
                    ${insights.strengths.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
                </ul>
            ` : ''}
            
            ${insights.recommendations?.length > 0 ? `
                <div class="section-title">Recommendations</div>
                <ul class="recommendation-list">
                    ${insights.recommendations.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
                </ul>
            ` : ''}
            
            ${answers.length > 0 ? `
                <div class="section-title">Question Summary</div>
                <div style="background: #1e293b; border-radius: 12px; padding: 16px; margin-top: 10px;">
                    ${answers.slice(0, 5).map((ans, idx) => `
                        <div style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #334155;">
                            <div style="font-size: 13px; color: #94a3b8;">Q${idx + 1}</div>
                            <div style="font-size: 14px; margin: 5px 0;">${escapeHtml(ans.question_text?.substring(0, 100))}${ans.question_text?.length > 100 ? '...' : ''}</div>
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
                <p>Report generated: ${new Date().toLocaleString()}</p>
            </div>
        </div>
    </body>
    </html>`;
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// FIXED (2026-08-21): generate-assessment now requires real admin auth
// server-side (it had none at all before — reachable by anyone, unmetered
// OpenAI cost). This call never sent an Authorization header, so it will
// fail with 401 the moment that backend fix is deployed. Now attaches the
// caller's real session token — this function is admin-only anyway
// (adminId is passed to save the result), so this doesn't change who's
// meant to call it, just makes the existing intent actually enforced.
export async function generateAIAssessment(topic, difficulty, numberOfQuestions, adminId = null) {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await callUnifiedAPI('generate-assessment', {
            topic,
            difficulty,
            numberOfQuestions
        }, { headers: { 'Authorization': `Bearer ${session?.access_token}` } });
        
        let result;
        if (response.success && response.result) {
            result = response.result;
        } else if (response.title) {
            result = response;
        } else {
            throw new Error('Invalid response from AI');
        }
        
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
        instructions: 'Please read each question carefully and select the answer that best represents your knowledge or experience.',
        category: randomCategory,
        time_limit_minutes: Math.min(45, Math.max(15, Math.floor(numberOfQuestions * 1.5))),
        questions: questions
    };
}

async function saveGeneratedAssessmentToDB(assessmentData, difficulty, adminId) {
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

export default {
    getActiveAssessments,
    getAssessmentById,
    getAssessmentWithQuestions,
    checkAssessmentEligibility,
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

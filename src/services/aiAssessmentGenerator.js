// src/services/aiAssessmentGenerator.js
// AI-Powered Assessment Generator - Creates, scores, and analyzes assessments

import { supabase } from '../lib/supabase';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// ============================================
// ASSESSMENT TYPES & CONFIGURATION
// ============================================

const ASSESSMENT_TYPES = {
    personality: {
        name: 'Personality Profile',
        description: 'Big 5 personality traits assessment',
        question_count: 20,
        scoring_method: 'dimensional',
        time_limit_minutes: 15
    },
    emotional_intelligence: {
        name: 'Emotional Intelligence (EQ)',
        description: 'Measure emotional awareness and management',
        question_count: 25,
        scoring_method: 'cumulative',
        time_limit_minutes: 20
    },
    leadership: {
        name: 'Leadership Potential',
        description: 'Evaluate leadership readiness',
        question_count: 30,
        scoring_method: 'dimensional',
        time_limit_minutes: 25
    },
    communication: {
        name: 'Communication Skills',
        description: 'Assess verbal and written communication',
        question_count: 20,
        scoring_method: 'cumulative',
        time_limit_minutes: 15
    },
    problem_solving: {
        name: 'Problem Solving',
        description: 'Measure analytical thinking',
        question_count: 15,
        scoring_method: 'cumulative',
        time_limit_minutes: 30
    },
    team_collaboration: {
        name: 'Team Collaboration',
        description: 'Evaluate teamwork capabilities',
        question_count: 20,
        scoring_method: 'dimensional',
        time_limit_minutes: 15
    },
    career_aptitude: {
        name: 'Career Aptitude',
        description: 'Discover career matches',
        question_count: 40,
        scoring_method: 'recommendation',
        time_limit_minutes: 20
    }
};

// ============================================
// GENERATE ASSESSMENT QUESTIONS (AI)
// ============================================

export async function generateAssessmentQuestions(assessmentType, difficulty = 'intermediate', numberOfQuestions = null) {
    const config = ASSESSMENT_TYPES[assessmentType];
    if (!config) throw new Error('Invalid assessment type');

    const questionCount = numberOfQuestions || config.question_count;
    
    const prompt = `Create a professional ${config.name} assessment with ${questionCount} questions.

Assessment Type: ${assessmentType}
Difficulty: ${difficulty}
Scoring Method: ${config.scoring_method}

Return as JSON with this exact structure:
{
    "title": "${config.name} Assessment",
    "description": "${config.description}",
    "instructions": "Clear instructions for the test taker",
    "questions": [
        {
            "question_text": "Question text here?",
            "question_type": "multiple_choice|likert_scale|scenario|open_ended",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_answer": 0,
            "points": 1,
            "dimension": "personality_trait|eq_component|leadership_trait",
            "scoring_weight": 1.0,
            "explanation": "What this question measures"
        }
    ],
    "dimensions": [
        {
            "name": "Dimension Name",
            "description": "What this dimension measures",
            "min_score": 0,
            "max_score": 100
        }
    ],
    "scoring_rubric": {
        "excellent_range": [80, 100],
        "good_range": [60, 79],
        "average_range": [40, 59],
        "needs_improvement_range": [0, 39]
    }
}

Make questions professional, insightful, and appropriate for workplace assessment. Return ONLY valid JSON.`;

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
        return JSON.parse(cleanResponse);
    } catch (error) {
        console.error('Assessment generation error:', error);
        throw error;
    }
}

// ============================================
// SCORE ASSESSMENT (Auto-Grading)
// ============================================

export async function scoreAssessment(assessmentId, userId, answers) {
    try {
        // Get assessment questions
        const { data: questions, error: qError } = await supabase
            .from('assessment_questions')
            .select('*')
            .eq('assessment_id', assessmentId)
            .order('sort_order');

        if (qError) throw qError;

        let totalScore = 0;
        let maxPossibleScore = 0;
        const dimensionScores = {};
        const questionResults = [];

        // Calculate scores
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            const userAnswer = answers[i];
            const maxPoints = q.points || 1;
            maxPossibleScore += maxPoints;

            let score = 0;
            let isCorrect = false;

            if (q.question_type === 'multiple_choice') {
                // Get correct answer from options
                const { data: options } = await supabase
                    .from('assessment_options')
                    .select('*')
                    .eq('question_id', q.id);
                
                const correctOption = options?.find(opt => opt.is_correct === true);
                if (correctOption && userAnswer === correctOption.id) {
                    score = maxPoints;
                    isCorrect = true;
                }
            } else if (q.question_type === 'likert_scale') {
                // Likert scale scoring (1-5)
                score = userAnswer * (maxPoints / 5);
                isCorrect = true;
            } else if (q.question_type === 'scenario') {
                // Scenario-based scoring using AI
                const aiScore = await scoreScenarioAnswer(q.question_text, userAnswer);
                score = aiScore * (maxPoints / 10);
                isCorrect = score >= maxPoints * 0.7;
            } else {
                // Open-ended - requires manual review or AI scoring
                score = 0;
                isCorrect = false;
            }

            totalScore += score;
            
            // Track dimension scores
            if (q.dimension) {
                if (!dimensionScores[q.dimension]) {
                    dimensionScores[q.dimension] = { total: 0, max: 0, count: 0 };
                }
                dimensionScores[q.dimension].total += score;
                dimensionScores[q.dimension].max += maxPoints;
                dimensionScores[q.dimension].count++;
            }

            questionResults.push({
                question_id: q.id,
                user_answer: userAnswer,
                score: score,
                max_score: maxPoints,
                is_correct: isCorrect
            });
        }

        // Calculate percentage
        const percentage = Math.round((totalScore / maxPossibleScore) * 100);
        
        // Determine performance level
        let performanceLevel = 'needs_improvement';
        if (percentage >= 80) performanceLevel = 'excellent';
        else if (percentage >= 60) performanceLevel = 'good';
        else if (percentage >= 40) performanceLevel = 'average';

        // Calculate dimension scores
        const dimensionResults = {};
        for (const [dimension, data] of Object.entries(dimensionScores)) {
            dimensionResults[dimension] = {
                score: Math.round((data.total / data.max) * 100),
                raw_score: data.total,
                max_score: data.max
            };
        }

        // Save results
        const { data: result, error: saveError } = await supabase
            .from('user_assessments')
            .insert({
                user_id: userId,
                assessment_id: assessmentId,
                score: totalScore,
                max_score: maxPossibleScore,
                percentage: percentage,
                performance_level: performanceLevel,
                dimension_scores: dimensionResults,
                answers: questionResults,
                completed_at: new Date().toISOString()
            })
            .select()
            .single();

        if (saveError) throw saveError;

        // Generate insights using AI
        const insights = await generateAssessmentInsights(assessmentId, percentage, dimensionResults);

        // Update with insights
        await supabase
            .from('user_assessments')
            .update({ insights: insights })
            .eq('id', result.id);

        return {
            success: true,
            resultId: result.id,
            percentage: percentage,
            performanceLevel: performanceLevel,
            dimensionScores: dimensionResults,
            insights: insights,
            recommendations: generateRecommendations(percentage, dimensionResults)
        };

    } catch (error) {
        console.error('Assessment scoring error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// SCENARIO ANSWER SCORING (AI)
// ============================================

async function scoreScenarioAnswer(question, answer) {
    const prompt = `Score this scenario answer from 1-10 based on quality, relevance, and insight.

Question: ${question}
Answer: ${answer}

Return ONLY a number between 1 and 10.`;

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
                    { role: 'system', content: 'You are an expert assessor scoring scenario-based answers.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
                max_tokens: 10
            })
        });

        const data = await response.json();
        return parseInt(data.choices[0].message.content) || 5;
    } catch (error) {
        console.error('Scenario scoring error:', error);
        return 5;
    }
}

// ============================================
// GENERATE ASSESSMENT INSIGHTS (AI)
// ============================================

async function generateAssessmentInsights(assessmentId, percentage, dimensionScores) {
    const prompt = `Generate personalized career insights based on assessment results.

Overall Score: ${percentage}%
Dimension Scores: ${JSON.stringify(dimensionScores)}

Provide 3-5 actionable insights and recommendations for professional development.

Return as JSON:
{
    "strengths": ["strength 1", "strength 2", "strength 3"],
    "development_areas": ["area 1", "area 2", "area 3"],
    "career_suggestions": ["suggestion 1", "suggestion 2"],
    "actionable_tips": ["tip 1", "tip 2", "tip 3"]
}`;

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
                    { role: 'system', content: 'You are a career coach providing actionable insights.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        const data = await response.json();
        const content = data.choices[0].message.content;
        const cleanResponse = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleanResponse);
    } catch (error) {
        console.error('Insights generation error:', error);
        return {
            strengths: ['Self-awareness', 'Willingness to grow'],
            development_areas: ['Continuous learning'],
            career_suggestions: ['Seek mentorship', 'Take relevant courses'],
            actionable_tips: ['Set weekly learning goals']
        };
    }
}

function generateRecommendations(percentage, dimensionScores) {
    const recommendations = [];
    
    if (percentage < 50) {
        recommendations.push('Consider taking foundational courses in this area');
        recommendations.push('Seek mentorship from experienced professionals');
    } else if (percentage < 70) {
        recommendations.push('Practice applied learning through real projects');
        recommendations.push('Join professional communities in this field');
    } else {
        recommendations.push('Consider mentoring others to reinforce your knowledge');
        recommendations.push('Explore advanced certifications to deepen expertise');
    }

    return recommendations;
}

// ============================================
// CREATE ASSESSMENT FROM AI
// ============================================

export async function createAssessmentFromAI(assessmentType, createdBy, customTitle = null) {
    try {
        const generated = await generateAssessmentQuestions(assessmentType);
        
        const { data: assessment, error: assessmentError } = await supabase
            .from('assessments')
            .insert({
                title: customTitle || generated.title,
                description: generated.description,
                instructions: generated.instructions,
                assessment_type: assessmentType,
                difficulty: 'intermediate',
                time_limit_minutes: ASSESSMENT_TYPES[assessmentType].time_limit_minutes,
                question_count: generated.questions.length,
                is_active: true,
                created_by: createdBy
            })
            .select()
            .single();

        if (assessmentError) throw assessmentError;

        for (let i = 0; i < generated.questions.length; i++) {
            const q = generated.questions[i];
            
            const { data: question, error: qError } = await supabase
                .from('assessment_questions')
                .insert({
                    assessment_id: assessment.id,
                    question_text: q.question_text,
                    question_type: q.question_type,
                    points: q.points,
                    dimension: q.dimension,
                    sort_order: i
                })
                .select()
                .single();

            if (qError) throw qError;

            if (q.options && q.options.length > 0) {
                for (let j = 0; j < q.options.length; j++) {
                    await supabase
                        .from('assessment_options')
                        .insert({
                            question_id: question.id,
                            option_text: q.options[j],
                            is_correct: j === q.correct_answer,
                            sort_order: j
                        });
                }
            }
        }

        return { success: true, assessmentId: assessment.id };

    } catch (error) {
        console.error('Assessment creation error:', error);
        return { success: false, error: error.message };
    }
}

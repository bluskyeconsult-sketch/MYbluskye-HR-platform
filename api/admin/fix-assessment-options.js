import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { assessmentId } = req.body;
    
    try {
        let query = supabase.from('assessment_questions').select('id');
        if (assessmentId) {
            query = query.eq('assessment_id', assessmentId);
        }
        
        const { data: questions, error: qError } = await query;
        if (qError) throw qError;
        
        let added = 0;
        
        for (const question of questions) {
            const { count } = await supabase
                .from('assessment_options')
                .select('id', { count: 'exact', head: true })
                .eq('question_id', question.id);
            
            if (count === 0) {
                // Add default options
                await supabase.from('assessment_options').insert([
                    { question_id: question.id, option_text: 'Strongly Disagree', sort_order: 0 },
                    { question_id: question.id, option_text: 'Disagree', sort_order: 1 },
                    { question_id: question.id, option_text: 'Agree', sort_order: 2, is_correct: true },
                    { question_id: question.id, option_text: 'Strongly Agree', sort_order: 3 }
                ]);
                added++;
            }
        }
        
        return res.status(200).json({ 
            success: true, 
            message: `Added options to ${added} questions`,
            fixed: added 
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

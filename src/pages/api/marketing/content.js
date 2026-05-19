import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
    // Allow GET for public viewing, POST/PUT requires admin auth
    if (req.method === 'GET') {
        const { data, error } = await supabase
            .from('marketing_content')
            .select('content')
            .eq('section', 'homepage_advert')
            .single();
            
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data.content);
    }

    // Admin only actions below
    // Add authentication check here...

    if (req.method === 'PUT') {
        const { content } = req.body;
        const { error } = await supabase
            .from('marketing_content')
            .update({ content, updated_at: new Date() })
            .eq('section', 'homepage_advert');
            
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true });
    }
}

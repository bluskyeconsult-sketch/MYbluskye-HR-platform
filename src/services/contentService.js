import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// AI Content Generation
export async function aiGenerateOutline(topic, category) {
    // This would call OpenAI API
    // For now, returns structured outline
    return {
        headlines: [`The Ultimate Guide to ${topic}`, `Why ${topic} Matters in 2026`, `${topic}: Best Practices and Trends`],
        keyPoints: [`Understanding ${topic}`, `Implementing ${topic}`, `Measuring ${topic} Success`],
        suggestedTags: [topic.toLowerCase(), 'HR', 'Workforce']
    };
}

// Push to Newsletter
export async function pushToNewsletter(contentId, contentType, subject) {
    // Get content details
    const { data: content } = await supabase
        .from(contentType === 'article' ? 'articles' : 'blog_posts')
        .select('*')
        .eq('id', contentId)
        .single();
    
    // Get subscribers
    const { data: subscribers } = await supabase
        .from('newsletter_subscribers')
        .select('email')
        .eq('is_active', true);
    
    // Track share
    await supabase.from('content_shares').insert({
        content_id: contentId,
        content_type: contentType,
        share_type: 'newsletter'
    });
    
    // Return recipient count
    return { success: true, recipientCount: subscribers?.length || 0 };
}

// Push to Announcement Bar
export async function pushToAnnouncementBar(contentId, contentType, message) {
    // Store in localStorage or database for announcement bar
    const announcement = {
        id: contentId,
        message: message,
        type: contentType,
        created_at: new Date().toISOString()
    };
    
    // Track share
    await supabase.from('content_shares').insert({
        content_id: contentId,
        content_type: contentType,
        share_type: 'announcement'
    });
    
    return { success: true, announcement };
}

// Get Trending Topics
export async function getTrendingTopics(period = 'week', limit = 10) {
    const { data } = await supabase
        .from('trending_topics')
        .select('*')
        .eq('period', period)
        .order('score', { ascending: false })
        .limit(limit);
    
    return data || [];
}

// Get Trending Articles
export async function getTrendingArticles(limit = 5) {
    const { data } = await supabase
        .from('articles')
        .select('*')
        .eq('is_published', true)
        .order('trend_score', { ascending: false })
        .limit(limit);
    
    return data || [];
}

// Get Personalized Recommendations
export async function getPersonalizedRecommendations(userId, limit = 5) {
    // Get user preferences
    const { data: preferences } = await supabase
        .from('user_content_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();
    
    // Get articles based on preferences
    let query = supabase.from('articles').select('*').eq('is_published', true);
    
    if (preferences?.preferred_categories?.length > 0) {
        query = query.in('category', preferences.preferred_categories);
    }
    
    const { data } = await query.order('created_at', { ascending: false }).limit(limit);
    
    return data || [];
}

// Update User Preferences
export async function updateUserPreferences(userId, preferences) {
    const { data, error } = await supabase
        .from('user_content_preferences')
        .upsert({
            user_id: userId,
            preferred_categories: preferences.categories,
            preferred_tags: preferences.tags,
            notification_frequency: preferences.frequency
        })
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

// Track Content View (for personalization)
export async function trackContentView(userId, contentId, contentType) {
    await supabase.from('content_views').insert({
        user_id: userId,
        content_id: contentId,
        content_type: contentType
    });
}

// Get AI Content Suggestions
export async function getAIContentSuggestions() {
    const { data } = await supabase
        .from('ai_content_suggestions')
        .select('*')
        .eq('is_approved', false)
        .order('confidence_score', { ascending: false });
    
    return data || [];
}

// Approve AI Suggestion
export async function approveAISuggestion(suggestionId, approved) {
    await supabase
        .from('ai_content_suggestions')
        .update({ is_approved: approved })
        .eq('id', suggestionId);
    
    return { success: true };
}

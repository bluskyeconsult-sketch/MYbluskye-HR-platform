// src/pages/admin/ArticleEditor.jsx
// PROFESSIONAL ARTICLE EDITOR - AI-powered content creation with markdown support, SEO optimization, and fallback handling
// Features: AI article generation, content improvement, SEO optimization, markdown preview, tags, categories, and professional UI

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { 
    Save, Eye, Send, X, Plus, Trash2, Sparkles, Loader2, 
    Copy, Check, RefreshCw, FileText, Tag, Calendar, User, 
    Edit, Clock, Wand2, Globe, Hash, Image as ImageIcon, 
    AlertCircle, WifiOff, Maximize2, Minimize2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// PROFESSIONAL CONFIGURATION
// ============================================

const MAX_EXCERPT_LENGTH = 160;
const MAX_TITLE_LENGTH = 120;
const DEFAULT_AUTHOR = 'ODUSBABA Team';

// ============================================
// FALLBACK FUNCTIONS (When AI API is unavailable)
// ============================================

const fallbackImproveContent = (text) => {
    if (!text?.trim()) return text;
    
    let improved = text;
    
    // Professional formatting improvements
    improved = improved.replace(/([.!?])\s*([a-z])/g, (_, p1, p2) => `${p1} ${p2.toUpperCase()}`);
    improved = improved.charAt(0).toUpperCase() + improved.slice(1);
    improved = improved.replace(/\s+/g, ' ');
    improved = improved.replace(/\s+([.,!?:;])/g, '$1');
    
    // Add paragraph breaks for long text
    if (improved.length > 500 && !improved.includes('\n\n')) {
        const sentences = improved.split('. ');
        if (sentences.length > 3) {
            const midPoint = Math.floor(sentences.length / 2);
            improved = sentences.slice(0, midPoint).join('. ') + '.\n\n' + sentences.slice(midPoint).join('. ');
        }
    }
    
    // Professional typography fixes
    const corrections = {
        'teh': 'the', 'adn': 'and', 'wih': 'with', 'thier': 'their',
        'recieve': 'receive', 'acheive': 'achieve', 'practise': 'practice',
        'definately': 'definitely', 'seperate': 'separate', 'occured': 'occurred'
    };
    
    for (const [wrong, correct] of Object.entries(corrections)) {
        improved = improved.replace(new RegExp(wrong, 'gi'), correct);
    }
    
    return improved;
};

const fallbackGenerateSEOTitle = (title) => {
    if (!title) return '';
    let seoTitle = title.replace(/[^\w\s]/g, '').trim();
    return seoTitle.length > 60 ? seoTitle.substring(0, 57) + '...' : seoTitle;
};

const fallbackGenerateArticle = (topic) => {
    const templates = {
        default: `# ${topic}\n\n## Introduction\n\n${topic} represents a significant opportunity in today's professional landscape. This comprehensive guide explores key aspects, benefits, and practical applications.\n\n## Key Benefits\n\n- **Enhanced Efficiency**: Streamline processes and optimize workflows\n- **Superior Outcomes**: Achieve measurable results with proven methodologies\n- **Cost Effectiveness**: Maximize ROI while maintaining quality standards\n\n## Implementation Strategy\n\n1. Assess current capabilities and identify gaps\n2. Develop a strategic roadmap aligned with business goals\n3. Execute with precision and monitor progress\n4. Iterate and optimize based on feedback\n\n## Best Practices\n\n### Recommended Approaches\n- Establish clear, measurable objectives\n- Engage stakeholders throughout the process\n- Implement regular progress reviews\n\n### Common Pitfalls to Avoid\n- Rushing strategic planning phases\n- Dismissing valuable user feedback\n- Neglecting ongoing training requirements\n\n## Conclusion\n\n${topic} offers transformative potential for organizations ready to embrace innovation. Begin your journey toward excellence today.`,
        
        technology: `# ${topic}\n\n## The Evolution of ${topic}\n\nThe technology landscape has undergone remarkable transformation, with ${topic} emerging as a pivotal force shaping modern business practices.\n\n## Emerging Trends\n\n- **Artificial Intelligence Integration**: Revolutionizing approaches to ${topic.toLowerCase()}\n- **Cloud-Native Architectures**: Scalable solutions for dynamic challenges\n- **Data-Driven Decision Making**: Leveraging analytics for strategic advantage\n\n## Future Outlook\n\nThe trajectory of ${topic} points toward continued innovation and widespread adoption across industries.\n\n## Implementation Roadmap\n\n1. Conduct comprehensive technology assessment\n2. Initiate pilot programs for validation\n3. Scale successful initiatives\n4. Continuously optimize based on performance metrics\n\n## Conclusion\n\n${topic} represents the next frontier of digital transformation. Organizations that embrace these technologies will gain competitive advantage.`,
        
        remote: `# ${topic}\n\n## The Rise of ${topic}\n\nRemote work has fundamentally transformed organizational culture, productivity paradigms, and work-life integration.\n\n## Strategic Advantages\n\n- **Flexible Work Arrangements**: Optimizing productivity through personalized schedules\n- **Reduced Commuting**: Enhancing quality of life and environmental sustainability\n- **Global Talent Access**: Building diverse, high-performing teams without geographic constraints\n\n## Challenges and Solutions\n\n### Communication Excellence\nLeverage collaboration platforms including Slack, Zoom, and Microsoft Teams\n\n### Collaborative Workflows\nImplement robust project management systems such as Asana, Trello, or Jira\n\n### Culture Building\nDevelop intentional virtual team-building initiatives and regular check-ins\n\n## Success Framework\n\n1. Establish clear communication protocols and expectations\n2. Define measurable KPIs aligned with organizational goals\n3. Provide necessary technology infrastructure and support\n4. Schedule regular team synchronization meetings\n5. Recognize and celebrate achievements consistently\n\n## Conclusion\n\n${topic} is permanently reshaping the professional landscape. Organizations that adapt strategically will thrive in this new era of work.`
    };
    
    const topicLower = topic.toLowerCase();
    if (topicLower.includes('tech') || topicLower.includes('ai') || topicLower.includes('software')) return templates.technology;
    if (topicLower.includes('remote') || topicLower.includes('work from home') || topicLower.includes('distributed')) return templates.remote;
    return templates.default;
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function ArticleEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    // State Management
    const [article, setArticle] = useState({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        category: '',
        tags: [],
        featured_image: '',
        author: DEFAULT_AUTHOR,
        status: 'draft',
        send_notification: false,
        seo_title: '',
        seo_description: '',
        view_count: 0
    });
    
    const [tagInput, setTagInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [preview, setPreview] = useState(false);
    const [aiGenerating, setAiGenerating] = useState(false);
    const [aiImproving, setAiImproving] = useState(false);
    const [aiTopic, setAiTopic] = useState('');
    const [showAIPanel, setShowAIPanel] = useState(false);
    const [copied, setCopied] = useState(false);
    const [wordCount, setWordCount] = useState(0);
    const [readTime, setReadTime] = useState(0);
    const [notificationSent, setNotificationSent] = useState(false);
    const [aiFallbackUsed, setAiFallbackUsed] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);

    // Effects
    useEffect(() => {
        if (id && id !== 'new') loadArticle();
    }, [id]);

    useEffect(() => {
        const words = article.content.trim().split(/\s+/).filter(w => w.length > 0).length;
        setWordCount(words);
        setReadTime(Math.max(1, Math.ceil(words / 200)));
    }, [article.content]);

    useEffect(() => {
        if (aiFallbackUsed) {
            const timer = setTimeout(() => setAiFallbackUsed(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [aiFallbackUsed]);

    // Database Operations
    async function loadArticle() {
        setLoading(true);
        const { data, error } = await supabase
            .from('articles')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) {
            console.error('Error loading article:', error);
            alert('Error loading article: ' + error.message);
        } else if (data) {
            setArticle(data);
        }
        setLoading(false);
    }

    const generateSlug = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    async function saveArticle(publish = false) {
        if (!article.title.trim()) {
            alert('Please enter a title');
            return;
        }
        
        setSaving(true);
        const articleData = {
            ...article,
            status: publish ? 'published' : 'draft',
            slug: article.slug || generateSlug(article.title),
            updated_at: new Date().toISOString(),
            published_at: publish && article.status !== 'published' ? new Date().toISOString() : article.published_at
        };

        try {
            let result;
            if (id && id !== 'new') {
                result = await supabase.from('articles').update(articleData).eq('id', id);
            } else {
                const { data, error } = await supabase.from('articles').insert([articleData]).select();
                result = { error };
                if (!error && data) {
                    navigate(`/admin/articles/${data[0].id}`, { replace: true });
                }
            }

            if (result.error) throw result.error;

            alert(publish ? '✅ Article published successfully!' : '✅ Article saved as draft');
            
            if (publish && article.send_notification && !notificationSent) {
                setNotificationSent(true);
                await sendNotification(articleData);
            }
            
            navigate('/admin/articles');
            
        } catch (error) {
            console.error('Save error:', error);
            alert('Error saving article: ' + error.message);
        } finally {
            setSaving(false);
        }
    }

    async function sendNotification(articleData) {
        try {
            await supabase.functions.invoke('send-article-notification', {
                body: {
                    articleId: id || articleData.id,
                    title: articleData.title,
                    excerpt: articleData.excerpt,
                    slug: articleData.slug
                }
            });
        } catch (error) {
            console.error('Failed to send notifications:', error);
        }
    }

    // AI Functions
    async function handleAIGenerate() {
        if (!aiTopic.trim()) {
            alert('Please enter a topic');
            return;
        }
        
        setAiGenerating(true);
        setAiFallbackUsed(false);
        
        try {
            const response = await fetch('/api/ai/generate-article', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: aiTopic, tone: 'professional', length: 'medium' })
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            
            if (data.success) {
                setArticle({
                    ...article,
                    title: data.title || aiTopic,
                    content: data.content,
                    excerpt: data.excerpt || data.content.substring(0, MAX_EXCERPT_LENGTH)
                });
                alert('✅ Article generated successfully!');
                setShowAIPanel(false);
                setAiTopic('');
            } else {
                throw new Error(data.error || 'Generation failed');
            }
        } catch (error) {
            console.error('AI generation error:', error);
            const fallbackContent = fallbackGenerateArticle(aiTopic);
            setArticle({
                ...article,
                title: aiTopic,
                content: fallbackContent,
                excerpt: fallbackContent.substring(0, MAX_EXCERPT_LENGTH)
            });
            setAiFallbackUsed(true);
            alert('⚠️ AI service unavailable. Used template-based generation instead.');
            setShowAIPanel(false);
            setAiTopic('');
        } finally {
            setAiGenerating(false);
        }
    }

    async function handleImproveContent() {
        if (!article.content.trim()) {
            alert('Please add some content first');
            return;
        }
        
        setAiImproving(true);
        setAiFallbackUsed(false);
        
        try {
            const response = await fetch('/api/ai/improve-article', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: article.content, improvement_type: 'clarity' })
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            
            if (data.success) {
                setArticle({ ...article, content: data.content });
                alert('✅ Content improved successfully!');
            } else {
                throw new Error(data.error || 'Improvement failed');
            }
        } catch (error) {
            console.error('AI improvement error:', error);
            const improvedContent = fallbackImproveContent(article.content);
            setArticle({ ...article, content: improvedContent });
            setAiFallbackUsed(true);
            alert('⚠️ AI service unavailable. Used basic text improvement instead.');
        } finally {
            setAiImproving(false);
        }
    }

    async function generateSEOTitle() {
        if (!article.title) {
            alert('Please enter a title first');
            return;
        }
        
        setAiGenerating(true);
        setAiFallbackUsed(false);
        
        try {
            const response = await fetch('/api/ai/generate-seo-title', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: article.title })
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            if (data.success && data.seo_title) {
                setArticle({ ...article, seo_title: data.seo_title });
                alert('✅ SEO title generated!');
            } else {
                throw new Error(data.error || 'Generation failed');
            }
        } catch (error) {
            console.error('SEO title generation error:', error);
            const fallbackTitle = fallbackGenerateSEOTitle(article.title);
            setArticle({ ...article, seo_title: fallbackTitle });
            setAiFallbackUsed(true);
            alert('⚠️ AI service unavailable. Used basic title optimization instead.');
        } finally {
            setAiGenerating(false);
        }
    }

    // Utility Functions
    const copyToClipboard = (text) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const addTag = () => {
        if (tagInput && !article.tags.includes(tagInput)) {
            setArticle({ ...article, tags: [...article.tags, tagInput] });
            setTagInput('');
        }
    };

    const removeTag = (tag) => {
        setArticle({ ...article, tags: article.tags.filter(t => t !== tag) });
    };

    const categories = [
        'AI & Technology', 'Employment Law', 'HR Strategy', 'Workforce Trends',
        'Career Development', 'Skill Verification', 'Remote Work', 'Diversity & Inclusion',
        'Leadership', 'Recruitment', 'Productivity', 'Wellness', 'Talent Management',
        'Employee Engagement', 'Workplace Culture', 'Compliance', 'Benefits & Compensation'
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    const isAiLoading = aiGenerating || aiImproving;

    return (
        <div className={`min-h-screen bg-slate-950 ${fullscreen ? 'fixed inset-0 z-50 overflow-auto' : ''}`}>
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            {id === 'new' ? 'Create New Article' : 'Edit Article'}
                        </h1>
                        {!preview && (
                            <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                                <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {wordCount} words</span>
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {readTime} min read</span>
                                <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {article.tags.length} tags</span>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3 flex-wrap">
                        <button onClick={() => setFullscreen(!fullscreen)} className="px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition" title="Fullscreen">
                            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setShowAIPanel(!showAIPanel)} className="px-4 py-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition flex items-center gap-2">
                            <Sparkles className="w-4 h-4" /> AI Assistant
                        </button>
                        <button onClick={() => setPreview(!preview)} className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition flex items-center gap-2">
                            {preview ? <Edit className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            {preview ? 'Edit' : 'Preview'}
                        </button>
                        <button onClick={() => saveArticle(false)} disabled={saving} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition disabled:opacity-50 flex items-center gap-2">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Draft
                        </button>
                        <button onClick={() => saveArticle(true)} disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition disabled:opacity-50 flex items-center gap-2">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Publish
                        </button>
                    </div>
                </div>

                {/* AI Fallback Warning Banner */}
                {aiFallbackUsed && (
                    <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2">
                        <WifiOff className="w-4 h-4 text-amber-400" />
                        <p className="text-amber-400 text-sm">⚠️ AI service is currently unavailable. Using fallback mode with basic improvements.</p>
                    </div>
                )}

                {/* AI Panel */}
                {showAIPanel && !preview && (
                    <div className="mb-6 p-5 bg-gradient-to-r from-purple-900/20 to-primary-900/20 border border-purple-500/30 rounded-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-white font-semibold flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-400" /> AI Content Assistant</h3>
                            <button onClick={() => setShowAIPanel(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm text-slate-300 mb-2">Generate Article</label>
                                <div className="flex gap-2">
                                    <input type="text" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} placeholder="e.g., Future of Remote Work" className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                                    <button onClick={handleAIGenerate} disabled={isAiLoading} className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition disabled:opacity-50" title="Generate full article">
                                        {aiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-300 mb-2">Improve Content</label>
                                <button onClick={handleImproveContent} disabled={isAiLoading || !article.content} className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
                                    {aiImproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Improve Grammar & Clarity
                                </button>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-300 mb-2">SEO Optimization</label>
                                <button onClick={generateSEOTitle} disabled={isAiLoading || !article.title} className="w-full px-3 py-2 bg-emerald-600/20 text-emerald-400 rounded-lg hover:bg-emerald-600/30 transition disabled:opacity-50 flex items-center justify-center gap-2">
                                    <Globe className="w-4 h-4" /> Generate SEO Title
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {!preview ? (
                    <div className="space-y-6">
                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Title *</label>
                            <input type="text" value={article.title} onChange={(e) => setArticle({ ...article, title: e.target.value.slice(0, MAX_TITLE_LENGTH), slug: generateSlug(e.target.value), seo_title: e.target.value })} className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-lg" placeholder="Article title..." />
                            <p className="text-xs text-slate-500 mt-1">{article.title.length}/{MAX_TITLE_LENGTH} characters</p>
                        </div>

                        {/* Slug & SEO */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">URL Slug</label>
                                <div className="flex gap-2">
                                    <input type="text" value={article.slug} onChange={(e) => setArticle({ ...article, slug: e.target.value })} className="flex-1 px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm" placeholder="url-friendly-title" />
                                    <button onClick={() => copyToClipboard(article.slug)} className="px-3 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition">
                                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">SEO Title (Optional)</label>
                                <div className="flex gap-2">
                                    <input type="text" value={article.seo_title} onChange={(e) => setArticle({ ...article, seo_title: e.target.value.slice(0, 60) })} className="flex-1 px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="SEO optimized title" />
                                    <button onClick={generateSEOTitle} disabled={isAiLoading || !article.title} className="px-3 py-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition disabled:opacity-50">
                                        <Sparkles className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">{article.seo_title.length}/60 characters</p>
                            </div>
                        </div>

                        {/* Excerpt */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Excerpt (SEO Meta Description)</label>
                            <textarea rows={2} value={article.excerpt} onChange={(e) => setArticle({ ...article, excerpt: e.target.value.slice(0, MAX_EXCERPT_LENGTH) })} className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Brief summary for search engines..." />
                            <p className="text-xs text-slate-500 mt-1">{article.excerpt.length}/{MAX_EXCERPT_LENGTH} characters</p>
                        </div>

                        {/* Category & Author */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
                                <select value={article.category} onChange={(e) => setArticle({ ...article, category: e.target.value })} className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
                                    <option value="">Select category</option>
                                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Author</label>
                                <input type="text" value={article.author} onChange={(e) => setArticle({ ...article, author: e.target.value })} className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
                            </div>
                        </div>

                        {/* Tags */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Tags</label>
                            <div className="flex gap-2 mb-2">
                                <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addTag()} className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Add tag..." />
                                <button onClick={addTag} className="px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition"><Plus className="w-4 h-4" /></button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {article.tags.map(tag => (
                                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-800 rounded-full text-sm text-slate-300">
                                        <Hash className="w-3 h-3" /> {tag}
                                        <button onClick={() => removeTag(tag)} className="hover:text-red-400"><X className="w-3 h-3" /></button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Featured Image URL */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Featured Image URL</label>
                            <div className="flex gap-2">
                                <input type="text" value={article.featured_image} onChange={(e) => setArticle({ ...article, featured_image: e.target.value })} className="flex-1 px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="https://example.com/image.jpg" />
                                {article.featured_image && (
                                    <button onClick={() => window.open(article.featured_image, '_blank')} className="px-3 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition" title="Preview image"><ImageIcon className="w-4 h-4" /></button>
                                )}
                            </div>
                        </div>

                        {/* Content */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Content (Markdown supported)</label>
                            <textarea rows={18} value={article.content} onChange={(e) => setArticle({ ...article, content: e.target.value })} className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Write your article content here... Use markdown for formatting." />
                            <div className="mt-2 flex justify-between items-center">
                                <p className="text-xs text-slate-500">{wordCount} words • {readTime} min read</p>
                                <button onClick={handleImproveContent} disabled={isAiLoading || !article.content} className="text-xs text-purple-400 hover:text-purple-300 transition disabled:opacity-50 flex items-center gap-1">
                                    {aiImproving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Improve with AI
                                </button>
                            </div>
                        </div>

                        {/* Notification Option */}
                        <div className="flex items-center gap-3 p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                            <input type="checkbox" id="send_notification" checked={article.send_notification} onChange={(e) => setArticle({ ...article, send_notification: e.target.checked })} className="w-4 h-4 rounded border-slate-600 text-primary-500 focus:ring-primary-500" />
                            <label htmlFor="send_notification" className="text-slate-300 text-sm">Send email notification to subscribers when published</label>
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 prose prose-invert prose-lg max-w-none">
                        {article.featured_image && <img src={article.featured_image} alt={article.title} className="rounded-xl mb-8 w-full" />}
                        <h1 className="text-4xl font-bold mb-4">{article.title}</h1>
                        <div className="flex flex-wrap items-center gap-6 text-sm text-slate-400 mb-8 pb-6 border-b border-slate-800">
                            <span className="flex items-center gap-2"><User className="w-4 h-4" /> {article.author}</span>
                            <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> {readTime} min read</span>
                            {article.category && <span className="flex items-center gap-2"><Tag className="w-4 h-4" /> {article.category}</span>}
                        </div>
                        <div className="markdown-content">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {article.content || '*No content yet*'}
                            </ReactMarkdown>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

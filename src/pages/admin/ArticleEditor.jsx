// src/pages/admin/ArticleEditor.jsx
// COMPLETE ARTICLE EDITOR - With AI generation, markdown support, and SEO optimization

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Save, Eye, Send, X, Plus, Trash2, Sparkles, Loader2, Copy, Check, RefreshCw, FileText, Tag, Calendar, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ArticleEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [article, setArticle] = useState({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        category: '',
        tags: [],
        featured_image: '',
        author: 'ODUSBABA Team',
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
    const [aiTopic, setAiTopic] = useState('');
    const [showAIPanel, setShowAIPanel] = useState(false);
    const [copied, setCopied] = useState(false);
    const [wordCount, setWordCount] = useState(0);
    const [readTime, setReadTime] = useState(0);

    useEffect(() => {
        if (id && id !== 'new') {
            loadArticle();
        }
    }, [id]);

    useEffect(() => {
        // Update word count and read time
        const words = article.content.trim().split(/\s+/).length;
        setWordCount(words);
        setReadTime(Math.max(1, Math.ceil(words / 200))); // 200 words per minute
    }, [article.content]);

    async function loadArticle() {
        setLoading(true);
        const { data, error } = await supabase
            .from('articles')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) {
            console.error('Error loading article:', error);
        } else if (data) {
            setArticle(data);
        }
        setLoading(false);
    }

    function generateSlug(title) {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }

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

        let result;
        if (id && id !== 'new') {
            result = await supabase
                .from('articles')
                .update(articleData)
                .eq('id', id);
        } else {
            const { data, error } = await supabase
                .from('articles')
                .insert([articleData])
                .select();
            
            result = { error };
            if (!error && data) {
                // Update URL with new ID
                navigate(`/admin/articles/${data[0].id}`, { replace: true });
            }
        }

        if (result.error) {
            alert('Error saving article: ' + result.error.message);
        } else {
            const message = publish ? 'Article published successfully!' : 'Article saved as draft';
            alert(message);
            
            if (publish && article.send_notification) {
                // Trigger notification sending
                await sendNotification(articleData);
            }
            
            navigate('/admin/articles');
        }
        setSaving(false);
    }

    async function sendNotification(articleData) {
        try {
            await supabase.functions.invoke('send-article-notification', {
                body: {
                    articleId: id,
                    title: articleData.title,
                    excerpt: articleData.excerpt,
                    slug: articleData.slug
                }
            });
        } catch (error) {
            console.error('Failed to send notifications:', error);
        }
    }

    async function handleAIGenerate() {
        if (!aiTopic.trim()) {
            alert('Please enter a topic');
            return;
        }
        
        setAiGenerating(true);
        try {
            // Call AI service to generate content
            const response = await fetch('/api/ai/generate-article', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    topic: aiTopic,
                    tone: 'professional',
                    length: 'medium'
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                setArticle({
                    ...article,
                    title: data.title || aiTopic,
                    content: data.content,
                    excerpt: data.excerpt || data.content.substring(0, 160)
                });
                alert('Article generated successfully!');
                setShowAIPanel(false);
                setAiTopic('');
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('AI generation error:', error);
            alert('Failed to generate article: ' + error.message);
        } finally {
            setAiGenerating(false);
        }
    }

    async function handleImproveContent() {
        if (!article.content.trim()) {
            alert('Please write some content first');
            return;
        }
        
        setAiGenerating(true);
        try {
            const response = await fetch('/api/ai/improve-article', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    content: article.content,
                    improvement_type: 'clarity'
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                setArticle({ ...article, content: data.content });
                alert('Content improved!');
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('AI improvement error:', error);
            alert('Failed to improve content: ' + error.message);
        } finally {
            setAiGenerating(false);
        }
    }

    async function generateSEOTitle() {
        if (!article.title) return;
        
        try {
            const response = await fetch('/api/ai/generate-seo-title', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: article.title })
            });
            
            const data = await response.json();
            if (data.success) {
                setArticle({ ...article, seo_title: data.seo_title });
            }
        } catch (error) {
            console.error('SEO title generation error:', error);
        }
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    function addTag() {
        if (tagInput && !article.tags.includes(tagInput)) {
            setArticle({ ...article, tags: [...article.tags, tagInput] });
            setTagInput('');
        }
    }

    function removeTag(tag) {
        setArticle({ ...article, tags: article.tags.filter(t => t !== tag) });
    }

    const categories = [
        'AI & Technology',
        'Employment Law',
        'HR Strategy',
        'Workforce Trends',
        'Career Development',
        'Skill Verification',
        'Remote Work',
        'Diversity & Inclusion',
        'Leadership',
        'Recruitment'
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            {id === 'new' ? 'Create New Article' : 'Edit Article'}
                        </h1>
                        {!preview && (
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                    <FileText className="w-3 h-3" /> {wordCount} words
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {readTime} min read
                                </span>
                                <span className="flex items-center gap-1">
                                    <Tag className="w-3 h-3" /> {article.tags.length} tags
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3 flex-wrap">
                        <button
                            onClick={() => setShowAIPanel(!showAIPanel)}
                            className="px-4 py-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition flex items-center gap-2"
                        >
                            <Sparkles className="w-4 h-4" />
                            AI Assistant
                        </button>
                        <button
                            onClick={() => setPreview(!preview)}
                            className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition flex items-center gap-2"
                        >
                            {preview ? <Edit className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            {preview ? 'Edit' : 'Preview'}
                        </button>
                        <button
                            onClick={() => saveArticle(false)}
                            disabled={saving}
                            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Draft
                        </button>
                        <button
                            onClick={() => saveArticle(true)}
                            disabled={saving}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            Publish
                        </button>
                    </div>
                </div>

                {/* AI Panel */}
                {showAIPanel && !preview && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-purple-900/20 to-primary-900/20 border border-purple-500/30 rounded-xl">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-white font-semibold flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-purple-400" />
                                AI Content Assistant
                            </h3>
                            <button onClick={() => setShowAIPanel(false)} className="text-slate-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-300 mb-2">Generate Article</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={aiTopic}
                                        onChange={(e) => setAiTopic(e.target.value)}
                                        placeholder="e.g., Future of Remote Work in 2024"
                                        className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                                    />
                                    <button
                                        onClick={handleAIGenerate}
                                        disabled={aiGenerating}
                                        className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition disabled:opacity-50"
                                    >
                                        {aiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-300 mb-2">Improve Existing Content</label>
                                <button
                                    onClick={handleImproveContent}
                                    disabled={aiGenerating || !article.content}
                                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Improve Clarity & Grammar
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
                            <input
                                type="text"
                                value={article.title}
                                onChange={(e) => setArticle({ 
                                    ...article, 
                                    title: e.target.value, 
                                    slug: generateSlug(e.target.value),
                                    seo_title: e.target.value
                                })}
                                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-primary-500 text-lg"
                                placeholder="Article title..."
                            />
                        </div>

                        {/* Slug & SEO */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">URL Slug</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={article.slug}
                                        onChange={(e) => setArticle({ ...article, slug: e.target.value })}
                                        className="flex-1 px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-primary-500 font-mono text-sm"
                                        placeholder="url-friendly-title"
                                    />
                                    <button
                                        onClick={() => copyToClipboard(article.slug)}
                                        className="px-3 py-2 bg-slate-800 rounded-lg hover:bg-slate-700"
                                    >
                                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">SEO Title (Optional)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={article.seo_title}
                                        onChange={(e) => setArticle({ ...article, seo_title: e.target.value })}
                                        className="flex-1 px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-primary-500"
                                        placeholder="SEO optimized title"
                                    />
                                    <button
                                        onClick={generateSEOTitle}
                                        className="px-3 py-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30"
                                        title="Generate SEO Title"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Excerpt */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Excerpt (Short summary) - {article.excerpt.length}/160 characters
                            </label>
                            <textarea
                                rows={2}
                                value={article.excerpt}
                                onChange={(e) => setArticle({ ...article, excerpt: e.target.value.slice(0, 160) })}
                                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-primary-500"
                                placeholder="Brief summary of the article..."
                            />
                        </div>

                        {/* Category & Author */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
                                <select
                                    value={article.category}
                                    onChange={(e) => setArticle({ ...article, category: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-primary-500"
                                >
                                    <option value="">Select category</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Author</label>
                                <input
                                    type="text"
                                    value={article.author}
                                    onChange={(e) => setArticle({ ...article, author: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-primary-500"
                                />
                            </div>
                        </div>

                        {/* Tags */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Tags</label>
                            <div className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                                    className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
                                    placeholder="Add tag..."
                                />
                                <button
                                    onClick={addTag}
                                    className="px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {article.tags.map(tag => (
                                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-800 rounded-full text-sm text-slate-300">
                                        {tag}
                                        <button onClick={() => removeTag(tag)} className="hover:text-red-400">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Featured Image URL */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Featured Image URL</label>
                            <input
                                type="text"
                                value={article.featured_image}
                                onChange={(e) => setArticle({ ...article, featured_image: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-primary-500"
                                placeholder="https://example.com/image.jpg"
                            />
                        </div>

                        {/* Content */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Content (Markdown supported) - {wordCount} words
                            </label>
                            <textarea
                                rows={15}
                                value={article.content}
                                onChange={(e) => setArticle({ ...article, content: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-primary-500"
                                placeholder="Write your article content here... Use markdown for formatting."
                            />
                            <div className="mt-2 text-right">
                                <button
                                    onClick={handleImproveContent}
                                    disabled={aiGenerating || !article.content}
                                    className="text-xs text-purple-400 hover:text-purple-300 transition"
                                >
                                    ✨ Improve with AI
                                </button>
                            </div>
                        </div>

                        {/* Notification Option */}
                        <div className="flex items-center gap-3 p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                            <input
                                type="checkbox"
                                id="send_notification"
                                checked={article.send_notification}
                                onChange={(e) => setArticle({ ...article, send_notification: e.target.checked })}
                                className="w-4 h-4 rounded border-slate-600 text-primary-500 focus:ring-primary-500"
                            />
                            <label htmlFor="send_notification" className="text-slate-300">
                                Send email notification to subscribers when published
                            </label>
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 prose prose-invert max-w-none">
                        {article.featured_image && (
                            <img src={article.featured_image} alt={article.title} className="rounded-xl mb-6 w-full" />
                        )}
                        <h1>{article.title}</h1>
                        <div className="flex items-center gap-4 text-sm text-slate-400 mb-6 pb-4 border-b border-slate-800">
                            <span className="flex items-center gap-1">
                                <User className="w-3 h-3" /> {article.author}
                            </span>
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> {new Date().toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {readTime} min read
                            </span>
                        </div>
                        <div className="whitespace-pre-wrap">
                            <ReactMarkdown>{article.content}</ReactMarkdown>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Import missing icons
import { Edit, Clock } from 'lucide-react';

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Save, Eye, Send, X, Plus, Trash2 } from 'lucide-react';

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
        send_notification: false
    });
    const [tagInput, setTagInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [preview, setPreview] = useState(false);

    useEffect(() => {
        if (id && id !== 'new') {
            loadArticle();
        }
    }, [id]);

    async function loadArticle() {
        setLoading(true);
        const { data } = await supabase.from('articles').select('*').eq('id', id).single();
        if (data) setArticle(data);
        setLoading(false);
    }

    function generateSlug(title) {
        return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    async function saveArticle(publish = false) {
        setSaving(true);
        const articleData = {
            ...article,
            status: publish ? 'published' : 'draft',
            slug: article.slug || generateSlug(article.title),
            updated_at: new Date().toISOString()
        };

        let result;
        if (id && id !== 'new') {
            result = await supabase.from('articles').update(articleData).eq('id', id);
        } else {
            result = await supabase.from('articles').insert([articleData]);
        }

        if (result.error) {
            alert('Error saving article: ' + result.error.message);
        } else {
            alert(publish ? 'Article published!' : 'Article saved as draft');
            navigate('/admin/articles');
        }
        setSaving(false);
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

    if (loading) return <div className="p-8 text-center text-slate-400">Loading...</div>;

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-white">{id === 'new' ? 'Create Article' : 'Edit Article'}</h1>
                    <div className="flex gap-3">
                        <button onClick={() => setPreview(!preview)} className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700">
                            {preview ? 'Edit' : 'Preview'}
                        </button>
                        <button onClick={() => saveArticle(false)} disabled={saving} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600">
                            Save Draft
                        </button>
                        <button onClick={() => saveArticle(true)} disabled={saving} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">
                            Publish
                        </button>
                    </div>
                </div>

                {!preview ? (
                    <div className="space-y-6">
                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Title</label>
                            <input
                                type="text"
                                value={article.title}
                                onChange={(e) => setArticle({ ...article, title: e.target.value, slug: generateSlug(e.target.value) })}
                                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-primary-500"
                                placeholder="Article title..."
                            />
                        </div>

                        {/* Slug */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">URL Slug</label>
                            <input
                                type="text"
                                value={article.slug}
                                onChange={(e) => setArticle({ ...article, slug: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-primary-500"
                                placeholder="url-friendly-title"
                            />
                        </div>

                        {/* Excerpt */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Excerpt (Short summary)</label>
                            <textarea
                                rows={2}
                                value={article.excerpt}
                                onChange={(e) => setArticle({ ...article, excerpt: e.target.value })}
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
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white"
                                >
                                    <option value="">Select category</option>
                                    <option value="AI & Technology">AI & Technology</option>
                                    <option value="Employment Law">Employment Law</option>
                                    <option value="HR Strategy">HR Strategy</option>
                                    <option value="Workforce Trends">Workforce Trends</option>
                                    <option value="Career Development">Career Development</option>
                                    <option value="Skill Verification">Skill Verification</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Author</label>
                                <input
                                    type="text"
                                    value={article.author}
                                    onChange={(e) => setArticle({ ...article, author: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white"
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
                                    className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                                    placeholder="Add tag..."
                                />
                                <button onClick={addTag} className="px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {article.tags.map(tag => (
                                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-800 rounded-full text-sm text-slate-300">
                                        {tag}
                                        <button onClick={() => removeTag(tag)} className="hover:text-red-400"><X className="w-3 h-3" /></button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Content */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Content (Markdown supported)</label>
                            <textarea
                                rows={15}
                                value={article.content}
                                onChange={(e) => setArticle({ ...article, content: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-primary-500"
                                placeholder="Write your article content here... Use markdown for formatting."
                            />
                        </div>

                        {/* Notification Option */}
                        <div className="flex items-center gap-3 p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                            <input
                                type="checkbox"
                                id="send_notification"
                                checked={article.send_notification}
                                onChange={(e) => setArticle({ ...article, send_notification: e.target.checked })}
                                className="w-4 h-4"
                            />
                            <label htmlFor="send_notification" className="text-slate-300">
                                Send email notification to subscribers when published
                            </label>
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 prose prose-invert max-w-none">
                        <h1>{article.title}</h1>
                        <div className="text-sm text-slate-400 mb-4">By {article.author}</div>
                        <div className="whitespace-pre-wrap">{article.content}</div>
                    </div>
                )}
            </div>
        </div>
    );
}

// src/pages/admin/VirtualAssistantManager.jsx
// SUPER ADMIN - AI-Powered Virtual Assistant Manager
//
// FIXED (2026-08-07): removed a hardcoded admin-email backdoor (5th
// instance found across the codebase) — now checks profiles.user_type.
//
// RESOLVED (2026-08-07, VA Architecture Unification): the architecture
// split described below is fixed. `api/index.js`'s 'virtual-assistants'
// handler now queries the real `virtual_assistants` table (is_active =
// true) instead of a hardcoded 6-item array, and HireVirtualAssistant.jsx
// fetches that catalog on load. VAs created/edited here ARE now live on
// the public /hire-va page — confirmed 2026-08-20 (46 VAs showing live).
// The stale in-page warning banner reflecting the old, pre-fix state has
// been removed (2026-08-21).

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { generateVirtualAssistantWithAI, createVirtualAssistantFromAI } from '../../services/aiVirtualAssistantService';
import { 
    Bot, Plus, Edit2, Trash2, Eye, Loader2, Sparkles, 
    CheckCircle, XCircle, DollarSign, Clock, Tag, Zap,
    Brain, Wand2, Save, X, TrendingUp, Award, Target,
    MessageCircle, FileText, Briefcase, Users
} from 'lucide-react';

export default function VirtualAssistantManager() {
    const [assistants, setAssistants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showAIModal, setShowAIModal] = useState(false);
    const [editingVA, setEditingVA] = useState(null);
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [aiTopic, setAiTopic] = useState('');
    const [aiSpecialization, setAiSpecialization] = useState('');
    const [aiTone, setAiTone] = useState('professional');
    const [aiGeneratedVA, setAiGeneratedVA] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        title: '',
        description: '',
        long_description: '',
        features: [],
        price: 9.99,
        category: 'resume',
        processing_time_minutes: 5,
        sample_prompt: '',
        sample_output: '',
        tags: [],
        is_active: true
    });

    const [newFeature, setNewFeature] = useState('');
    const [newTag, setNewTag] = useState('');

    // FIXED (2026-08-08): confirmed via the real database check constraint
    // (virtual_assistants_category_check) that only these 4 exact values
    // are allowed — 'interview', 'skill', 'legal', and 'job' (all
    // previously offered here) fail every time. Any admin who picked one of
    // those would have hit a confusing database error with no indication
    // it was the category dropdown at fault. Rebuilt to match ground truth
    // exactly rather than the platform's descriptive documentation, which
    // didn't reflect what the database actually enforces.
    const categories = [
        { id: 'resume', name: 'Resume & CV', icon: FileText, color: 'bg-blue-500/20 text-blue-400' },
        { id: 'career', name: 'Career Advice', icon: Briefcase, color: 'bg-emerald-500/20 text-emerald-400' },
        { id: 'writing', name: 'Writing', icon: MessageCircle, color: 'bg-purple-500/20 text-purple-400' },
        { id: 'productivity', name: 'Productivity', icon: TrendingUp, color: 'bg-amber-500/20 text-amber-400' }
    ];

    useEffect(() => {
        loadAssistants();
        checkAdminAccess();
    }, []);

    async function checkAdminAccess() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = '/admin-login';
            return;
        }

        // FIXED: real database check instead of a hardcoded email.
        const { data: profile } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('id', user.id)
            .single();

        const isAdmin = profile?.user_type === 'admin' || profile?.user_type === 'super_admin';
        if (!isAdmin) {
            alert('Access denied. Admin access required.');
            window.location.href = '/admin/dashboard';
        }
    }

    async function loadAssistants() {
        setLoading(true);
        const { data, error } = await supabase
            .from('virtual_assistants')
            .select('*')
            .order('category', { ascending: true });
        
        if (!error) setAssistants(data || []);
        setLoading(false);
    }

    async function generateWithAI() {
        if (!aiTopic.trim()) {
            alert('Please enter a topic for AI generation');
            return;
        }
        
        setGenerating(true);
        
        try {
            const generated = await generateVirtualAssistantWithAI(aiTopic, aiSpecialization, aiTone);
            setAiGeneratedVA(generated);
            setFormData({
                name: generated.name,
                title: generated.title,
                description: generated.description,
                long_description: generated.long_description,
                features: generated.features || [],
                price: generated.price,
                category: generated.category || 'resume',
                processing_time_minutes: generated.processing_time_minutes || 5,
                sample_prompt: generated.sample_prompt || '',
                sample_output: generated.sample_output || '',
                tags: generated.tags || [],
                is_active: true
            });
        } catch (error) {
            console.error('AI generation error:', error);
            alert('Error generating VA. Please try again.');
        } finally {
            setGenerating(false);
        }
    }

    async function saveFromAI() {
        setSaving(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        
        const result = await createVirtualAssistantFromAI(formData, user.id);
        
        if (result.success) {
            setShowAIModal(false);
            setAiGeneratedVA(null);
            setAiTopic('');
            setAiSpecialization('');
            loadAssistants();
            alert('✅ Virtual Assistant created successfully! Note: this is only visible in this admin catalog, not on the live /hire-va page — see file header.');
        } else {
            alert('Error creating Virtual Assistant');
        }
        setSaving(false);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (editingVA) {
            await supabase
                .from('virtual_assistants')
                .update(formData)
                .eq('id', editingVA.id);
        } else {
            await supabase
                .from('virtual_assistants')
                .insert({
                    ...formData,
                    created_by: user.id,
                    created_at: new Date().toISOString()
                });
        }
        
        setShowModal(false);
        setEditingVA(null);
        setFormData({
            name: '', title: '', description: '', long_description: '', features: [], price: 9.99,
            category: 'resume', processing_time_minutes: 5, sample_prompt: '', sample_output: '', tags: [], is_active: true
        });
        loadAssistants();
        setSaving(false);
    }

    async function toggleStatus(va) {
        await supabase
            .from('virtual_assistants')
            .update({ is_active: !va.is_active })
            .eq('id', va.id);
        loadAssistants();
    }

    async function deleteVA(id) {
        if (confirm('Delete this Virtual Assistant?')) {
            await supabase.from('virtual_assistants').delete().eq('id', id);
            loadAssistants();
        }
    }

    function addFeature() {
        if (newFeature.trim() && !formData.features.includes(newFeature.trim())) {
            setFormData({ ...formData, features: [...formData.features, newFeature.trim()] });
            setNewFeature('');
        }
    }

    function removeFeature(feature) {
        setFormData({ ...formData, features: formData.features.filter(f => f !== feature) });
    }

    function addTag() {
        if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
            setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] });
            setNewTag('');
        }
    }

    function removeTag(tag) {
        setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
    }

    function getCategoryIcon(category) {
        const cat = categories.find(c => c.id === category);
        if (cat) {
            const Icon = cat.icon;
            return <Icon className="w-4 h-4" />;
        }
        return <Bot className="w-4 h-4" />;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Virtual Assistant Manager</h1>
                    <p className="text-slate-400">Manage AI-powered Virtual Assistants with AI generation</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => { setShowAIModal(true); setAiGeneratedVA(null); setAiTopic(''); setAiSpecialization(''); }}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 flex items-center gap-2"
                    >
                        <Sparkles className="w-4 h-4" /> AI Generate VA
                    </button>
                    <button
                        onClick={() => { setEditingVA(null); setFormData({ name: '', title: '', description: '', long_description: '', features: [], price: 9.99, category: 'resume', processing_time_minutes: 5, sample_prompt: '', sample_output: '', tags: [], is_active: true }); setShowModal(true); }}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Create Manual
                    </button>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <Bot className="w-8 h-8 text-primary-400" />
                        <div>
                            <div className="text-2xl font-bold text-white">{assistants.length}</div>
                            <div className="text-sm text-slate-400">Total VAs</div>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <CheckCircle className="w-8 h-8 text-emerald-400" />
                        <div>
                            <div className="text-2xl font-bold text-white">{assistants.filter(v => v.is_active).length}</div>
                            <div className="text-sm text-slate-400">Active</div>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <DollarSign className="w-8 h-8 text-amber-400" />
                        <div>
                            <div className="text-2xl font-bold text-white">5+</div>
                            <div className="text-sm text-slate-400">Categories</div>
                        </div>
                    </div>
                </div>
                <div className="bg-gradient-to-r from-purple-600/10 to-indigo-600/10 border border-purple-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <Brain className="w-8 h-8 text-purple-400" />
                        <div>
                            <div className="text-2xl font-bold text-purple-400">AI Powered</div>
                            <div className="text-sm text-slate-400">Generation Ready</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Virtual Assistants Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assistants.map(va => {
                    const CategoryIcon = categories.find(c => c.id === va.category)?.icon || Bot;
                    return (
                        <div key={va.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-primary-500/30 transition">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                                        <CategoryIcon className="w-5 h-5 text-primary-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-semibold">{va.name}</h3>
                                        <p className="text-slate-400 text-sm">{va.title}</p>
                                    </div>
                                </div>
                                {va.is_active ? (
                                    <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Active</span>
                                ) : (
                                    <span className="text-xs text-slate-400 flex items-center gap-1"><XCircle className="w-3 h-3" /> Inactive</span>
                                )}
                            </div>
                            <p className="text-slate-400 text-sm line-clamp-2 mb-3">{va.description}</p>
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-lg font-bold text-primary-400">${va.price}</span>
                                <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {va.processing_time_minutes} min</span>
                            </div>
                            <div className="flex flex-wrap gap-1 mb-3">
                                {va.tags?.slice(0, 3).map(tag => (
                                    <span key={tag} className="px-2 py-0.5 bg-slate-800 rounded-full text-xs text-slate-400">#{tag}</span>
                                ))}
                            </div>
                            <div className="flex gap-2 mt-2">
                                <button onClick={() => toggleStatus(va)} className="flex-1 py-1.5 text-sm border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800">
                                    {va.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                                <button onClick={() => { setEditingVA(va); setFormData(va); setShowModal(true); }} className="p-1.5 bg-slate-800 rounded-lg text-slate-300 hover:text-white">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => deleteVA(va.id)} className="p-1.5 bg-slate-800 rounded-lg text-red-400 hover:text-red-300">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* AI Generator Modal */}
            {showAIModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Brain className="w-5 h-5 text-purple-400" />
                                AI Virtual Assistant Generator
                            </h2>
                            <button onClick={() => setShowAIModal(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="bg-gradient-to-r from-purple-600/10 to-indigo-600/10 border border-purple-500/20 rounded-lg p-4 mb-6">
                            <p className="text-purple-400 text-sm flex items-center gap-2">
                                <Sparkles className="w-4 h-4" />
                                AI will create a complete Virtual Assistant profile based on your specifications
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">VA Topic/Specialization *</label>
                                <input
                                    type="text"
                                    value={aiTopic}
                                    onChange={(e) => setAiTopic(e.target.value)}
                                    placeholder="e.g., Technical Interview Coach, LinkedIn Profile Optimizer, Career Transition Advisor"
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Specific Focus (Optional)</label>
                                <textarea
                                    value={aiSpecialization}
                                    onChange={(e) => setAiSpecialization(e.target.value)}
                                    rows="3"
                                    placeholder="e.g., Focuses on helping software engineers prepare for FAANG interviews with behavioral and technical questions"
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Tone</label>
                                <select value={aiTone} onChange={(e) => setAiTone(e.target.value)} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
                                    <option value="professional">Professional</option>
                                    <option value="friendly">Friendly & Approachable</option>
                                    <option value="motivational">Motivational & Encouraging</option>
                                    <option value="detailed">Detailed & Analytical</option>
                                </select>
                            </div>
                            <button
                                onClick={generateWithAI}
                                disabled={generating || !aiTopic.trim()}
                                className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                {generating ? 'Generating...' : 'Generate Virtual Assistant'}
                            </button>

                            {aiGeneratedVA && (
                                <div className="mt-6 border-t border-slate-800 pt-4">
                                    <h3 className="text-white font-semibold mb-3">Generated VA Preview</h3>
                                    <div className="bg-slate-800/50 rounded-lg p-4">
                                        <p className="text-primary-400 font-semibold">{aiGeneratedVA.name}</p>
                                        <p className="text-slate-400 text-sm">{aiGeneratedVA.title}</p>
                                        <p className="text-slate-300 text-sm mt-2">{aiGeneratedVA.description}</p>
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {aiGeneratedVA.features?.slice(0, 3).map((f, i) => (
                                                <span key={i} className="px-2 py-0.5 bg-slate-700 rounded-full text-xs text-slate-300">✓ {f}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <button
                                        onClick={saveFromAI}
                                        disabled={saving}
                                        className="mt-4 w-full py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Create Virtual Assistant
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-white mb-4">{editingVA ? 'Edit Virtual Assistant' : 'Create Virtual Assistant'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Name *</label>
                                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" required />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Title *</label>
                                    <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Short Description *</label>
                                <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" required />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Long Description</label>
                                <textarea value={formData.long_description} onChange={e => setFormData({...formData, long_description: e.target.value})} rows="3" className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Features</label>
                                <div className="flex gap-2 mb-2">
                                    <input type="text" value={newFeature} onChange={(e) => setNewFeature(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addFeature()} placeholder="Add feature..." className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                                    <button type="button" onClick={addFeature} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Add</button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {formData.features.map(f => (
                                        <span key={f} className="px-3 py-1 bg-slate-700 rounded-full text-sm text-slate-200 flex items-center gap-1">
                                            {f}
                                            <button type="button" onClick={() => removeFeature(f)} className="text-slate-400 hover:text-red-400">×</button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Price ($)</label>
                                    <input type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Category</label>
                                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Processing Time (minutes)</label>
                                    <input type="number" value={formData.processing_time_minutes} onChange={e => setFormData({...formData, processing_time_minutes: parseInt(e.target.value)})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Tags</label>
                                    <div className="flex gap-2">
                                        <input type="text" value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addTag()} placeholder="Add tag..." className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                                        <button type="button" onClick={addTag} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Add</button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {formData.tags.map(t => (
                                    <span key={t} className="px-3 py-1 bg-slate-700 rounded-full text-sm text-slate-200 flex items-center gap-1">
                                        #{t}
                                        <button type="button" onClick={() => removeTag(t)} className="text-slate-400 hover:text-red-400">×</button>
                                    </span>
                                ))}
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Sample Prompt (for users)</label>
                                <textarea value={formData.sample_prompt} onChange={e => setFormData({...formData, sample_prompt: e.target.value})} rows="2" className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" placeholder="Example: Help me optimize my CV for a senior developer role" />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Sample Output</label>
                                <textarea value={formData.sample_output} onChange={e => setFormData({...formData, sample_output: e.target.value})} rows="3" className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" placeholder="Example response from this VA" />
                            </div>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} />
                                <span className="text-white">Active (visible to users)</span>
                            </label>
                            <div className="flex gap-3 pt-2">
                                <button type="submit" disabled={saving} className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">{saving ? 'Saving...' : (editingVA ? 'Update' : 'Create')}</button>
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

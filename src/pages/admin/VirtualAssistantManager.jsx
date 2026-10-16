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
import SuggestPriceButton from '../../components/admin/SuggestPriceButton';
import { generateVirtualAssistantWithAI, createVirtualAssistantFromAI, normalizeVACategory } from '../../services/aiVirtualAssistantService';
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
    // NEW (2026-10-16): AI price suggestion in the AI preview, and the review-all-prices tool for VAs already built.
    const [aiPriceNote, setAiPriceNote] = useState('');
    const [showPriceReview, setShowPriceReview] = useState(false);
    const [priceRows, setPriceRows] = useState([]);      // { id, name, current, suggested, reasoning, status, apply }
    const [priceReviewRunning, setPriceReviewRunning] = useState(false);
    const [applyingPrices, setApplyingPrices] = useState(false);

    // What a use of a VA really costs the person: credits, not dollars. The dollar price is the value shown on the
    // card, so it should rise with how big the job is, not be the same for everything.
    const creditsPerUse = (va) => (va?.execution_type === 'conversational' ? 2 : 1);
    const money = (n) => (Number.isFinite(Number(n)) ? `$${Number(n).toFixed(2)}` : '$0.00');

    async function fetchPriceSuggestion(va) {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch('/api/index?action=suggest-price', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
            body: JSON.stringify({
                itemType: 'virtual_assistant',
                name: va.name || va.title,
                description: va.description,
                category: va.category,
                executionType: va.execution_type || 'single_turn'
            })
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Could not get a price suggestion');
        return data;
    }

    async function runPriceReview() {
        setPriceReviewRunning(true);
        const rows = assistants.map(a => ({ id: a.id, name: a.name, current: Number(a.price) || 0, suggested: null, reasoning: '', status: 'waiting', apply: false, va: a }));
        setPriceRows(rows);
        let next = 0;
        const worker = async () => {
            while (next < rows.length) {
                const i = next++;
                try {
                    const s = await fetchPriceSuggestion(rows[i].va);
                    const price = Math.round(Number(s.suggestedPrice) * 100) / 100;
                    rows[i] = { ...rows[i], suggested: price, reasoning: s.reasoning || '', status: 'done', apply: Number.isFinite(price) && price > 0 && price !== rows[i].current };
                } catch (err) {
                    rows[i] = { ...rows[i], status: 'failed', reasoning: err.message };
                }
                setPriceRows([...rows]);
            }
        };
        await Promise.all([worker(), worker(), worker()]);
        setPriceReviewRunning(false);
    }

    async function applySelectedPrices() {
        const chosen = priceRows.filter(r => r.apply && Number.isFinite(r.suggested) && r.suggested > 0);
        if (chosen.length === 0) return;
        setApplyingPrices(true);
        let failed = 0;
        for (const r of chosen) {
            const { error } = await supabase.from('virtual_assistants').update({ price: r.suggested }).eq('id', r.id);
            if (error) failed++;
        }
        setApplyingPrices(false);
        alert(failed ? `${chosen.length - failed} prices updated, ${failed} failed.` : `${chosen.length} prices updated.`);
        setShowPriceReview(false);
        loadAssistants();
    }

    const [formData, setFormData] = useState({
        name: '',
        title: '',
        description: '',
        long_description: '',
        features: [],
        price: 9.99,
        category: 'resume',
        execution_type: 'single_turn',
        required_tier: 'free',
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
        { id: 'productivity', name: 'Productivity', icon: TrendingUp, color: 'bg-amber-500/20 text-amber-400' },
        // FIXED (2026-10-16): employer_ops is a real, allowed category (the Rota Assistant uses it and the public
        // Hire VA page already has a tab for it) but it was missing here, so employer-facing VAs could not be
        // created or edited with the right category, and editing the Rota Assistant silently changed it.
        { id: 'employer_ops', name: 'Employer & Workforce Tools', icon: Users, color: 'bg-cyan-500/20 text-cyan-400' }
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
            .order('created_at', { ascending: false }); // newest first
        
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
                category: normalizeVACategory(generated.category),
                execution_type: 'single_turn',
                required_tier: 'free',
                processing_time_minutes: generated.processing_time_minutes || 5,
                sample_prompt: generated.sample_prompt || '',
                sample_output: generated.sample_output || '',
                tags: generated.tags || [],
                is_active: true
            });
            // Ask the pricing assistant for a price straight away so the preview never shows a made-up default.
            setAiPriceNote('Working out a price...');
            try {
                const s = await fetchPriceSuggestion({ ...generated, category: normalizeVACategory(generated.category), execution_type: 'single_turn' });
                const price = Math.round(Number(s.suggestedPrice) * 100) / 100;
                if (Number.isFinite(price) && price > 0) setFormData(prev => ({ ...prev, price }));
                setAiPriceNote(s.reasoning || '');
            } catch (priceErr) {
                console.warn('Price suggestion failed:', priceErr.message);
                setAiPriceNote('Could not get a price suggestion. Enter one, or use Suggest Price.');
            }
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
        
        let result = { success: false };
        try {
            result = await createVirtualAssistantFromAI(formData, user.id);
        } catch (err) {
            // FIXED (2026-10-16): a failed save used to leave the button spinning with no message.
            console.error('Create VA error:', err);
            alert('Could not create the Virtual Assistant: ' + (err.message || 'unknown error'));
            setSaving(false);
            return;
        }
        
        if (result.success) {
            setShowAIModal(false);
            setAiGeneratedVA(null);
            setAiPriceNote('');
            setAiTopic('');
            setAiSpecialization('');
            loadAssistants();
            // FIXED (2026-09-04): confirmed stale, incorrect message -
            // directly contradicted this file's own header, which
            // confirms VAs created here have been live on the public
            // /hire-va page since the 2026-08-07 architecture fix
            // (confirmed 2026-08-20). This alert was never updated when
            // that fix landed, meaning it would actively mislead an
            // admin into thinking a real, live VA hadn't actually gone
            // live - a silent wrong instruction, not just outdated text.
            alert('✅ Virtual Assistant created successfully and is now live on the public /hire-va page.');
        } else {
            alert('Error creating Virtual Assistant');
        }
        setSaving(false);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        
        let saveError = null;
        if (editingVA) {
            const { error } = await supabase
                .from('virtual_assistants')
                .update(formData)
                .eq('id', editingVA.id);
            saveError = error;
        } else {
            const { error } = await supabase
                .from('virtual_assistants')
                .insert({
                    ...formData,
                    // created_by removed (2026-10-16): the virtual_assistants table has no such column.
                    created_at: new Date().toISOString()
                });
            saveError = error;
        }
        
        // FIXED (2026-10-16): save errors (for example a category the database does not allow) were ignored,
        // so the window closed as if it had worked. Now the admin sees the reason and the window stays open.
        if (saveError) {
            console.error('Save VA error:', saveError);
            alert('Could not save: ' + saveError.message);
            setSaving(false);
            return;
        }
        
        setShowModal(false);
        setEditingVA(null);
        setFormData({
            name: '', title: '', description: '', long_description: '', features: [], price: 9.99,
            category: 'resume', execution_type: 'single_turn', required_tier: 'free', processing_time_minutes: 5, sample_prompt: '', sample_output: '', tags: [], is_active: true
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
                        onClick={() => { setShowPriceReview(true); setPriceRows([]); }}
                        className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-200 rounded-lg hover:bg-slate-700 flex items-center gap-2"
                    >
                        <DollarSign className="w-4 h-4" /> Review Prices
                    </button>
                    <button
                        onClick={() => { setShowAIModal(true); setAiGeneratedVA(null); setAiTopic(''); setAiSpecialization(''); }}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 flex items-center gap-2"
                    >
                        <Sparkles className="w-4 h-4" /> AI Generate VA
                    </button>
                    <button
                        onClick={() => { setEditingVA(null); setFormData({ name: '', title: '', description: '', long_description: '', features: [], price: 9.99, category: 'resume', execution_type: 'single_turn', required_tier: 'free', processing_time_minutes: 5, sample_prompt: '', sample_output: '', tags: [], is_active: true }); setShowModal(true); }}
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
                                <span className="text-lg font-bold text-primary-400">{money(va.price)} <span className="text-xs font-normal text-slate-500">· {creditsPerUse(va)} credit{creditsPerUse(va) > 1 ? 's' : ''}/use</span></span>
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
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Category</label>
                                            <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm">
                                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Execution type</label>
                                            <select value={formData.execution_type || 'single_turn'} onChange={e => setFormData({ ...formData, execution_type: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm">
                                                <option value="single_turn">Single-turn (one input, one output)</option>
                                                <option value="conversational">Conversational (remembers the thread)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Price shown on the card ($)</label>
                                            <input type="number" step="0.01" min="0" value={formData.price} onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm" />
                                            <p className="text-[11px] text-slate-500 mt-1">People pay {formData.execution_type === 'conversational' ? '2 credits' : '1 credit'} per use. This is the value shown on the card.</p>
                                            <SuggestPriceButton
                                                itemType="virtual_assistant"
                                                name={formData.name || formData.title}
                                                description={formData.description}
                                                category={formData.category}
                                                executionType={formData.execution_type}
                                                onApply={(suggested) => setFormData({ ...formData, price: suggested })}
                                            />
                                            {aiPriceNote && <p className="text-[11px] text-slate-400 mt-2">{aiPriceNote}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Required plan</label>
                                            <select value={formData.required_tier || 'free'} onChange={e => setFormData({ ...formData, required_tier: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm">
                                                <option value="free">Free</option>
                                                <option value="registered">Registered or higher</option>
                                                <option value="professional">Professional or higher</option>
                                                <option value="employer">Employer or higher</option>
                                                <option value="business">Business only</option>
                                            </select>
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

            {/* Review prices modal (NEW 2026-10-16) */}
            {showPriceReview && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-start justify-between mb-2">
                            <h2 className="text-xl font-bold text-white">Review Virtual Assistant prices</h2>
                            <button onClick={() => setShowPriceReview(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <p className="text-slate-400 text-sm mb-4">
                            The pricing assistant looks at each assistant and suggests a price. Nothing changes until you tick the ones you want and press Apply. It makes one AI call per assistant ({assistants.length} in total).
                        </p>
                        {priceRows.length === 0 ? (
                            <button onClick={runPriceReview} disabled={priceReviewRunning || assistants.length === 0} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2">
                                <Sparkles className="w-4 h-4" /> Suggest prices for all {assistants.length}
                            </button>
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-2 text-xs text-slate-400">
                                    <span>{priceRows.filter(r => r.status === 'done').length} of {priceRows.length} done{priceReviewRunning ? '...' : ''}</span>
                                    <span>
                                        <button className="underline mr-3" onClick={() => setPriceRows(priceRows.map(r => ({ ...r, apply: r.status === 'done' && r.suggested > 0 && r.suggested !== r.current })))}>Tick all changes</button>
                                        <button className="underline" onClick={() => setPriceRows(priceRows.map(r => ({ ...r, apply: false })))}>Untick all</button>
                                    </span>
                                </div>
                                <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg">
                                    {priceRows.map((r, i) => (
                                        <div key={r.id} className="p-3 flex items-start gap-3">
                                            <input type="checkbox" className="mt-1" checked={r.apply} disabled={r.status !== 'done'} onChange={e => setPriceRows(priceRows.map((x, j) => j === i ? { ...x, apply: e.target.checked } : x))} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white text-sm font-medium truncate">{r.name}</p>
                                                <p className="text-slate-500 text-xs">{r.status === 'waiting' ? 'Waiting...' : r.status === 'failed' ? `Failed: ${r.reasoning}` : r.reasoning}</p>
                                            </div>
                                            <div className="text-right text-sm whitespace-nowrap">
                                                <span className="text-slate-400">{money(r.current)}</span>
                                                {r.status === 'done' && <span className="text-emerald-400 font-semibold"> → {money(r.suggested)}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-3 mt-4">
                                    <button onClick={applySelectedPrices} disabled={applyingPrices || priceReviewRunning || !priceRows.some(r => r.apply)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
                                        {applyingPrices ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Apply {priceRows.filter(r => r.apply).length} selected
                                    </button>
                                    <button onClick={() => setShowPriceReview(false)} className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800">Close</button>
                                </div>
                            </>
                        )}
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
                                    <SuggestPriceButton
                                        itemType="virtual_assistant"
                                        name={formData.name || formData.title}
                                        description={formData.description}
                                        category={formData.category}
                                        executionType={formData.execution_type}
                                        onApply={(suggested) => setFormData({ ...formData, price: suggested })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Category</label>
                                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            {/* NEW (2026-08-23): controls whether this VA remembers
                                the conversation within a session (real message
                                history sent to the model) or behaves like today's
                                original one-shot VAs. This is the actual mechanical
                                difference between "hiring an assistant" and a
                                single-purpose HR Tool — also the extension point for
                                future VA execution types. */}
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Execution Type</label>
                                <select value={formData.execution_type || 'single_turn'} onChange={e => setFormData({...formData, execution_type: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
                                    <option value="single_turn">Single-turn (one input, one output — no memory)</option>
                                    <option value="conversational">Conversational (remembers the thread within a session)</option>
                                </select>
                                <p className="text-xs text-slate-500 mt-1">Conversational VAs show a chat-style thread and carry context between messages; single-turn matches every VA's original behavior.</p>
                            </div>
                            {/* NEW (2026-08-23): this field never existed before — the
                                "some VAs require a higher plan" concept was built into
                                the frontend catalog UI, but there was no way for an
                                admin to actually set it, and the backend hardcoded every
                                VA as 'free' regardless. Now a real, enforced setting —
                                checked both here (display/access) and server-side in
                                va-execute (the real security boundary). */}
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Required Plan</label>
                                <select value={formData.required_tier || 'free'} onChange={e => setFormData({...formData, required_tier: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
                                    <option value="free">Free — available to everyone</option>
                                    <option value="registered">Registered or higher</option>
                                    <option value="professional">Professional or higher</option>
                                    <option value="employer">Employer or higher</option>
                                    <option value="business">Business only</option>
                                </select>
                                <p className="text-xs text-slate-500 mt-1">Minimum plan needed to use this assistant — enforced server-side, not just hidden in the UI.</p>
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

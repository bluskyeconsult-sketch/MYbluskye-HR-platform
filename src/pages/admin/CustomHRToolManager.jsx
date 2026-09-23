// src/pages/admin/CustomHRToolManager.jsx
//
// NEW (2026-09-21): admin page to create new HR tools via AI - the
// genuine gap this closes, since the existing 10 tools require
// editing code directly. Mirrors VirtualAssistantManager.jsx's proven
// AI-generation pattern exactly.

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Sparkles, Loader2, Wrench, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CustomHRToolManager() {
    const [topic, setTopic] = useState('');
    const [details, setDetails] = useState('');
    const [requiredTier, setRequiredTier] = useState('free');
    const [generating, setGenerating] = useState(false);
    const [generatedTool, setGeneratedTool] = useState(null);
    const [saving, setSaving] = useState(false);
    const [existingTools, setExistingTools] = useState([]);
    const [loadingTools, setLoadingTools] = useState(true);

    useEffect(() => {
        loadTools();
    }, []);

    async function authHeaders() {
        const { data: { session } } = await supabase.auth.getSession();
        return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` };
    }

    async function loadTools() {
        setLoadingTools(true);
        try {
            const response = await fetch('/api/index?action=list-custom-hr-tools');
            const data = await response.json();
            setExistingTools(data.tools || []);
        } catch (err) {
            console.error('Failed to load custom HR tools:', err);
        } finally {
            setLoadingTools(false);
        }
    }

    async function handleGenerate() {
        if (!topic.trim()) {
            toast.error('Enter a topic for the tool first.');
            return;
        }
        setGenerating(true);
        setGeneratedTool(null);
        try {
            const headers = await authHeaders();
            const response = await fetch('/api/index?action=generate-custom-hr-tool', {
                method: 'POST',
                headers,
                body: JSON.stringify({ topic, details })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Generation failed');
            setGeneratedTool(data.tool);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setGenerating(false);
        }
    }

    async function handleSave() {
        if (!generatedTool) return;
        setSaving(true);
        try {
            const headers = await authHeaders();
            const response = await fetch('/api/index?action=admin-create-custom-hr-tool', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    name: generatedTool.name,
                    description: generatedTool.description,
                    systemPrompt: generatedTool.system_prompt,
                    category: generatedTool.category,
                    requiredTier
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Save failed');

            toast.success('HR tool created!');
            setGeneratedTool(null);
            setTopic('');
            setDetails('');
            loadTools();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                <Wrench className="w-6 h-6 text-primary-400" /> HR Tool Builder
            </h1>
            <p className="text-slate-400 text-sm mb-6">
                Create a new HR tool with AI assistance - it'll appear on the public HR Tools page immediately once saved.
            </p>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 mb-8">
                <div className="space-y-3 mb-4">
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Tool Topic *</label>
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g. Redundancy Letter Writer"
                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Details (optional)</label>
                        <textarea
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            rows={2}
                            placeholder="Any specifics about what this tool should focus on"
                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Required Tier</label>
                        <select
                            value={requiredTier}
                            onChange={(e) => setRequiredTier(e.target.value)}
                            className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                        >
                            <option value="free">Free</option>
                            <option value="registered">Registered</option>
                            <option value="professional">Professional</option>
                            <option value="business">Business</option>
                        </select>
                    </div>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="w-full py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Generate Tool
                </button>

                {generatedTool && (
                    <div className="mt-5 pt-5 border-t border-slate-800">
                        <p className="text-primary-400 font-semibold text-lg">{generatedTool.name}</p>
                        <p className="text-slate-400 text-sm mb-3">{generatedTool.description}</p>
                        <div className="bg-slate-800/50 rounded-lg p-3 mb-4">
                            <p className="text-slate-500 text-xs mb-1">Operating instructions (what the tool actually runs on):</p>
                            <p className="text-slate-300 text-sm whitespace-pre-wrap">{generatedTool.system_prompt}</p>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            Save & Publish Tool
                        </button>
                    </div>
                )}
            </div>

            <h2 className="text-white font-semibold mb-3">Existing Custom Tools</h2>
            {loadingTools ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary-400" /></div>
            ) : existingTools.length === 0 ? (
                <p className="text-slate-500 text-sm">No custom tools created yet.</p>
            ) : (
                <div className="space-y-2">
                    {existingTools.map(tool => (
                        <div key={tool.id} className="bg-slate-900/30 border border-slate-800 rounded-lg p-3">
                            <p className="text-white font-medium">{tool.name}</p>
                            <p className="text-slate-500 text-sm">{tool.description}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

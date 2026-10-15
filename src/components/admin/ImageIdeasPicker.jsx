// src/components/admin/ImageIdeasPicker.jsx
//
// NEW (2026-10-15): tailored image suggestions for any AI image button.
// The AI reads the actual piece (title, summary, text, editor guidance) and proposes
// specific pictures. The editor picks one, can edit the description, then generates.
// Nothing is generated (or paid for) until "Generate this image" is pressed.
//
// Usage:
//   <ImageIdeasPicker
//       kind="article"            // 'article' | 'course' | 'lesson'
//       title={article.title}
//       summary={article.excerpt}
//       content={article.content}
//       guidance={aiGuidance}      // optional
//       style="modern"             // optional, course illustration style key
//       generating={generatingImage}
//       onGenerate={(prompt, idea) => generateWith(prompt, idea)}
//   />
import { useState } from 'react';
import { Sparkles, Loader2, Lightbulb, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function ImageIdeasPicker({
    kind = 'article',
    title = '',
    summary = '',
    content = '',
    guidance = '',
    style = '',
    generating = false,
    onGenerate,
    className = ''
}) {
    const [ideas, setIdeas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selected, setSelected] = useState(-1);
    const [promptText, setPromptText] = useState('');

    const canSuggest = !!(String(title).trim() || String(content).trim());

    async function suggest() {
        setLoading(true);
        setError('');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/index?action=suggest-image-ideas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
                },
                body: JSON.stringify({ kind, title, summary, content: String(content).slice(0, 6000), guidance, style, count: 3 })
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.error || 'Could not get image ideas');
            setIdeas(data.ideas || []);
            setSelected(-1);
            setPromptText('');
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    function pick(i) {
        setSelected(i);
        setPromptText(ideas[i].prompt);
    }

    return (
        <div className={`rounded-lg border border-slate-700 bg-slate-900/60 p-3 ${className}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-sm text-slate-300 flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    Image ideas tailored to this {kind === 'course' ? 'course' : kind === 'lesson' ? 'lesson' : 'article'}
                </div>
                <button
                    type="button"
                    onClick={suggest}
                    disabled={loading || generating || !canSuggest}
                    className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-500 disabled:opacity-50 flex items-center gap-1.5"
                >
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    {ideas.length ? 'Suggest different ideas' : 'Suggest image ideas'}
                </button>
            </div>
            {!canSuggest && <p className="text-xs text-slate-500 mt-2">Add a title or some content first so the ideas fit your piece.</p>}
            {error && <p className="text-xs text-red-400 mt-2">{error}</p>}

            {ideas.length > 0 && (
                <div className="mt-3 space-y-2">
                    {ideas.map((idea, i) => (
                        <button
                            type="button"
                            key={i}
                            onClick={() => pick(i)}
                            className={`w-full text-left rounded-lg border p-2.5 transition ${selected === i ? 'border-purple-500 bg-purple-500/10' : 'border-slate-700 bg-slate-800/60 hover:border-slate-500'}`}
                        >
                            <div className="flex items-center gap-1.5 text-sm font-medium text-white">
                                {selected === i && <Check className="w-3.5 h-3.5 text-purple-400" />}
                                {idea.label}
                            </div>
                            {idea.description && <div className="text-xs text-slate-300 mt-0.5">{idea.description}</div>}
                            {idea.alt_text && <div className="text-xs text-slate-500 mt-0.5">Alt text: {idea.alt_text}</div>}
                        </button>
                    ))}
                </div>
            )}

            {selected >= 0 && (
                <div className="mt-3">
                    <label className="block text-xs text-slate-400 mb-1">Image description (edit freely, this is exactly what the image tool receives)</label>
                    <textarea
                        value={promptText}
                        onChange={(e) => setPromptText(e.target.value.slice(0, 900))}
                        rows={4}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                        type="button"
                        onClick={() => onGenerate && onGenerate(promptText.trim(), ideas[selected])}
                        disabled={generating || promptText.trim().length < 20}
                        className="mt-2 text-sm px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 disabled:opacity-50 flex items-center gap-2"
                    >
                        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {generating ? 'Generating...' : 'Generate this image'}
                    </button>
                </div>
            )}
        </div>
    );
}

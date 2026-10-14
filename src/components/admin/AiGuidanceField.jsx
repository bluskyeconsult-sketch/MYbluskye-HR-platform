// src/components/admin/AiGuidanceField.jsx
//
// NEW (2026-10-14): one shared "brief description" box for every AI builder.
// Until now each AI feature took only a topic, so the writer had no way to say
// WHO the content is for, WHAT angle to take or WHICH points to cover. This box
// sits under the topic and its text is sent to the AI as the editor's own guidance.
//
// Usage:
//   const [guidance, setGuidance] = useState('');
//   <AiGuidanceField value={guidance} onChange={setGuidance} />
//   ...send `guidance` with the request, or add it to the prompt with
//   guidanceLine(guidance) when the prompt is built in the browser.

export const GUIDANCE_MAX = 800;

// Plain-text version for prompts built in the browser (e.g. the article editor).
export function guidanceLine(text) {
    const t = String(text || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, GUIDANCE_MAX);
    return t
        ? `\n\nEditor's guidance for focus, audience and angle (follow it unless it conflicts with accuracy; never invent facts to satisfy it):\n${t}`
        : '';
}

export default function AiGuidanceField({
    value,
    onChange,
    label = 'Brief description (optional)',
    placeholder = 'Who is this for, what angle should it take, and what must it cover? e.g. "For care workers in England. Practical, no legal jargon. Cover what changed on 1 October and one example."',
    rows = 3,
    disabled = false,
    className = ''
}) {
    const len = (value || '').length;
    return (
        <div className={className}>
            <label className="block text-sm text-slate-300 mb-1">{label}</label>
            <textarea
                value={value || ''}
                onChange={(e) => onChange(e.target.value.slice(0, GUIDANCE_MAX))}
                rows={rows}
                disabled={disabled}
                maxLength={GUIDANCE_MAX}
                placeholder={placeholder}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>Guides the AI's focus. It does not replace the topic.</span>
                <span>{len}/{GUIDANCE_MAX}</span>
            </div>
        </div>
    );
}

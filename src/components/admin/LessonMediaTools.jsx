// src/components/admin/LessonMediaTools.jsx
//
// NEW (2026-10-11): authoring tools that sit under a lesson's text box in the course editor.
//   - "Add a block": drops a ready-made template (tip, key term, steps, quick quiz, video, table,
//     stats, quote, picture by link) at the cursor, so nobody has to memorise the markup.
//   - "Suggest pictures": reads the lesson and proposes 2-4 illustrations; one click makes a picture
//     and inserts it where it fits.
//   - "Make pictures for placeholders": the AI lesson writer leaves [[illustration: ...]] lines;
//     this turns every one into a real picture in one go.
//   - "Preview lesson": opens the learner's lesson reader on this lesson, before publishing.
// Pictures cost about $0.006 each (low quality). Nothing is generated until you click.

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
    Image as ImageIcon, Wand2, Loader2, Plus, Eye, Lightbulb, Info, AlertTriangle, Sparkles,
    BookOpen, ListOrdered, HelpCircle, Video, Table2, Quote, BarChart3, Link2, FlaskConical
} from 'lucide-react';
import { authenticatedFetch } from '../../lib/authFetch';
import LessonReader from '../LessonReader';

const KIND_LABEL = { concept: 'Idea picture', scene: 'Real-world scene', process: 'Process', comparison: 'Comparison', cover: 'Wide hero', icon: 'Icon' };

const TEMPLATES = [
    { key: 'tip', label: 'Tip', icon: Lightbulb, text: ':::tip Handy tip\nWrite the tip here.\n:::' },
    { key: 'note', label: 'Note', icon: Info, text: ':::note\nWrite a note here.\n:::' },
    { key: 'warning', label: 'Warning', icon: AlertTriangle, text: ':::warning Watch out\nWrite the warning here.\n:::' },
    { key: 'example', label: 'Example', icon: FlaskConical, text: ':::example\nDescribe a real example here.\n:::' },
    { key: 'key', label: 'Key idea', icon: Sparkles, text: ':::key\nThe one idea to remember.\n:::' },
    { key: 'term', label: 'Key term', icon: BookOpen, text: ':::term Word | Plain-English meaning of the word.' },
    { key: 'steps', label: 'Steps', icon: ListOrdered, text: ':::steps\n1. First step\n2. Second step\n3. Third step\n:::' },
    { key: 'stats', label: 'Big numbers', icon: BarChart3, text: ':::stats\n85% | of employers do this\n3 | steps to remember\n:::' },
    { key: 'table', label: 'Table', icon: Table2, text: '| Column A | Column B |\n| --- | --- |\n| First | Second |' },
    { key: 'quote', label: 'Quote', icon: Quote, text: '> Write the quotation here.' },
    { key: 'check', label: 'Quick quiz', icon: HelpCircle, text: ':::check\nQ: Write the question here?\n- A wrong answer\n+ The right answer\n- Another wrong answer\nExplain: Why the right answer is right.\n:::' },
    { key: 'video', label: 'Video', icon: Video, text: ':::video https://www.youtube.com/watch?v=VIDEO_ID' }
];

const MARKER_RE = /\[\[\s*illustration\s*:\s*([^\]|]*)\|([^\]|]*)(?:\|([^\]]*))?\]\]/gi;

function cleanAlt(s) { return String(s || '').replace(/[\r\n"\]\[()]+/g, ' ').replace(/\s+/g, ' ').trim(); }

// Puts a snippet into the text: at the cursor, or by placement (start / middle / end).
function insertSnippet(content, snippet, { cursor = null, placement = 'end' } = {}) {
    const text = String(content || '');
    const block = `\n\n${snippet}\n\n`;
    if (cursor !== null && cursor >= 0 && cursor <= text.length) {
        return (text.slice(0, cursor).replace(/\s+$/, '') + block + text.slice(cursor).replace(/^\s+/, '')).trim();
    }
    const paras = text.split(/\n{2,}/);
    if (paras.length <= 1 || placement === 'end') return (text.trim() + block).trim();
    const at = placement === 'start' ? 1 : Math.max(1, Math.floor(paras.length / 2));
    return [...paras.slice(0, at), snippet, ...paras.slice(at)].join('\n\n').trim();
}

export default function LessonMediaTools({ lesson, course, onChange, getTextarea }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [ideas, setIdeas] = useState([]);
    const [busy, setBusy] = useState('');         // '', 'suggest', 'idea-<i>', 'markers'
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');
    const [preview, setPreview] = useState(false);
    const [linkOpen, setLinkOpen] = useState(false);
    const [link, setLink] = useState({ url: '', alt: '', caption: '' });

    const content = lesson.content || '';
    const markers = [...content.matchAll(MARKER_RE)];
    const style = course?.illustration_style || 'modern';

    async function makePicture({ kind, prompt }) {
        const data = await authenticatedFetch('generateLessonImage', { prompt, kind, style, shape: kind === 'cover' ? 'wide' : 'square' });
        if (!data?.success || !data.imageUrl) throw new Error(data?.error || 'The picture could not be made.');
        return data.imageUrl;
    }

    function insertBlock(t) {
        const ta = getTextarea ? getTextarea() : null;
        const cursor = ta && typeof ta.selectionStart === 'number' ? ta.selectionStart : null;
        onChange(insertSnippet(content, t.text, { cursor }));
        setMenuOpen(false);
        setMsg(`${t.label} added. Edit the words in the text box, then Save.`);
        setErr('');
    }

    function insertLink() {
        const url = link.url.trim();
        if (!/^https:\/\//i.test(url)) { setErr('Use a full link that starts with https://'); return; }
        const snippet = `![${cleanAlt(link.alt) || 'Illustration'}](${url.replace(/[\s)]/g, '')}${link.caption.trim() ? ` "${cleanAlt(link.caption)}"` : ''})`;
        const ta = getTextarea ? getTextarea() : null;
        onChange(insertSnippet(content, snippet, { cursor: ta && typeof ta.selectionStart === 'number' ? ta.selectionStart : null }));
        setLink({ url: '', alt: '', caption: '' }); setLinkOpen(false); setErr('');
        setMsg('Picture added. Click Save to keep it.');
    }

    async function suggest() {
        setBusy('suggest'); setErr(''); setMsg(''); setIdeas([]);
        try {
            const data = await authenticatedFetch('suggest-lesson-illustrations', { lessonTitle: lesson.title, content, courseTitle: course?.title });
            if (!data?.success) throw new Error(data?.error || 'No suggestions came back.');
            if (!data.ideas?.length) setMsg('No good picture ideas found. Add more lesson text and try again.');
            setIdeas(data.ideas || []);
        } catch (e) { setErr(e.message); }
        finally { setBusy(''); }
    }

    async function useIdea(idea, i) {
        setBusy(`idea-${i}`); setErr(''); setMsg('');
        try {
            const url = await makePicture(idea);
            const snippet = `![${cleanAlt(idea.alt) || 'Illustration'}](${url}${idea.caption ? ` "${cleanAlt(idea.caption)}"` : ''})`;
            onChange(insertSnippet(content, snippet, { placement: idea.placement }));
            setIdeas(list => list.filter((_, j) => j !== i));
            setMsg('Picture added to the lesson. Click Save to keep it.');
        } catch (e) { setErr(e.message); }
        finally { setBusy(''); }
    }

    async function fillMarkers() {
        if (!markers.length) return;
        if (!window.confirm(`Make ${markers.length} picture${markers.length > 1 ? 's' : ''}? This costs about $${(markers.length * 0.006).toFixed(3)}.`)) return;
        setBusy('markers'); setErr(''); setMsg('');
        let text = content, made = 0;
        try {
            for (const m of [...text.matchAll(MARKER_RE)]) {
                const kind = (m[1] || 'concept').trim().toLowerCase();
                const prompt = (m[2] || '').trim();
                const alt = cleanAlt(m[3]) || cleanAlt(prompt).slice(0, 100);
                const url = await makePicture({ kind: KIND_LABEL[kind] ? kind : 'concept', prompt });
                text = text.replace(m[0], `![${alt}](${url})`);
                made++;
                onChange(text);
            }
            setMsg(`${made} picture${made > 1 ? 's' : ''} added. Click Save to keep them.`);
        } catch (e) {
            setErr(`${e.message}${made ? ` (${made} picture${made > 1 ? 's were' : ' was'} added before this.)` : ''}`);
        } finally { setBusy(''); }
    }

    const previewLesson = { ...lesson, id: lesson.id, images: lesson.course_images || [] };

    return (
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs uppercase tracking-wide text-slate-500 mr-1">Lesson design</p>
                <div className="relative">
                    <button onClick={() => setMenuOpen(o => !o)} className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5" /> Add a block
                    </button>
                    {menuOpen && (
                        <div className="absolute z-20 mt-1 w-56 rounded-xl border border-slate-700 bg-slate-900 p-1 shadow-2xl">
                            {TEMPLATES.map(t => {
                                const Icon = t.icon;
                                return (
                                    <button key={t.key} onClick={() => insertBlock(t)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm text-slate-200 hover:bg-slate-800">
                                        <Icon className="w-4 h-4 text-primary-300" /> {t.label}
                                    </button>
                                );
                            })}
                            <button onClick={() => { setLinkOpen(true); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm text-slate-200 hover:bg-slate-800">
                                <Link2 className="w-4 h-4 text-primary-300" /> Picture from a link
                            </button>
                        </div>
                    )}
                </div>
                <button onClick={suggest} disabled={!!busy} className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm flex items-center gap-1.5 disabled:opacity-50">
                    {busy === 'suggest' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />} Suggest pictures
                </button>
                {markers.length > 0 && (
                    <button onClick={fillMarkers} disabled={!!busy} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm flex items-center gap-1.5 disabled:opacity-50">
                        {busy === 'markers' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />} Make {markers.length} planned picture{markers.length > 1 ? 's' : ''}
                    </button>
                )}
                <button onClick={() => setPreview(true)} className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-sm flex items-center gap-1.5 ml-auto">
                    <Eye className="w-3.5 h-3.5" /> Preview lesson
                </button>
            </div>

            {linkOpen && (
                <div className="grid gap-2 sm:grid-cols-3 rounded-lg bg-slate-800/60 p-3">
                    <input value={link.url} onChange={e => setLink({ ...link, url: e.target.value })} placeholder="https:// link to the picture" className="sm:col-span-3 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm" />
                    <input value={link.alt} onChange={e => setLink({ ...link, alt: e.target.value })} placeholder="What it shows (for screen readers)" className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm" />
                    <input value={link.caption} onChange={e => setLink({ ...link, caption: e.target.value })} placeholder="Caption (optional)" className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm" />
                    <div className="flex gap-2">
                        <button onClick={insertLink} className="px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-sm">Insert</button>
                        <button onClick={() => setLinkOpen(false)} className="px-3 py-2 rounded-lg text-slate-400 hover:text-white text-sm">Cancel</button>
                    </div>
                    <p className="sm:col-span-3 text-xs text-slate-500">Tip: every picture you make or upload is also listed in the Media Library, where you can copy its link.</p>
                </div>
            )}

            {ideas.length > 0 && (
                <div className="space-y-2">
                    {ideas.map((idea, i) => (
                        <div key={i} className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300">{KIND_LABEL[idea.kind] || 'Picture'}</span>
                                <span className="text-xs text-slate-500">goes near the {idea.placement} of the lesson</span>
                            </div>
                            <textarea
                                rows={2}
                                value={idea.prompt}
                                onChange={e => setIdeas(list => list.map((x, j) => j === i ? { ...x, prompt: e.target.value } : x))}
                                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
                            />
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-slate-500">About $0.006 once created</span>
                                <div className="flex gap-2">
                                    <button onClick={() => setIdeas(list => list.filter((_, j) => j !== i))} className="text-xs text-slate-400 hover:text-white px-2">Skip</button>
                                    <button onClick={() => useIdea(idea, i)} disabled={!!busy} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs flex items-center gap-1.5 disabled:opacity-50">
                                        {busy === `idea-${i}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />} Make and add
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {msg && <p className="text-sm text-emerald-300">{msg}</p>}
            {err && <p className="text-sm text-red-300">{err}</p>}
            <p className="text-xs text-slate-500">AI pictures never contain words (the image tool draws letters badly). For labelled diagrams use Steps, Table or Big numbers instead, or add your own picture by link.</p>

            <AnimatePresence>
                {preview && (
                    <LessonReader
                        courseTitle={course?.title || 'Preview'}
                        lessons={[previewLesson]}
                        activeIdx={0}
                        done={false}
                        updating={false}
                        completedLessonIds={[]}
                        onClose={() => setPreview(false)}
                        onPrevLesson={() => {}}
                        onNextLesson={() => setPreview(false)}
                        onComplete={() => setPreview(false)}
                        onSelectLesson={() => {}}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

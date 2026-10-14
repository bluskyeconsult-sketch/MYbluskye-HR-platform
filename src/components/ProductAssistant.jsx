// src/components/ProductAssistant.jsx
// NEW (2026-10-14) - the AI assistant as a card inside a product page.
// Same look and the same rules everywhere: one credit per question, a clear
// message when credits run out, an honest message when the AI fails (the
// server refunds the credit), and no userId or system prompt sent from here.
//
// USAGE:
//   <ProductAssistant
//       product="assessments"
//       title="Ask about your results"
//       context={`Assessment: ${name}. Score: ${score}%.`}
//       suggestions={['What should I work on first?', 'Explain my lowest score']}
//   />
// Place it where the member is already working. It shows nothing until the
// member opens it, so it never pushes the page content around.

import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Send, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { askAssistant } from '../lib/aiAssistant';

export default function ProductAssistant({ product = 'general', title = 'Ask the AI assistant', context = '', suggestions = [], defaultOpen = false }) {
    const [open, setOpen] = useState(defaultOpen);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [outOfCredits, setOutOfCredits] = useState(false);
    const [remaining, setRemaining] = useState(null);
    const endRef = useRef(null);

    useEffect(() => {
        if (open) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [messages, busy, open]);

    async function send(text) {
        const question = (text ?? input).trim();
        if (!question || busy) return;
        setBusy(true);
        setError('');
        setOutOfCredits(false);
        const history = messages.map(m => ({ role: m.role, content: m.content }));
        setMessages(prev => [...prev, { role: 'user', content: question }]);
        setInput('');
        try {
            const { response, remaining: left } = await askAssistant({ product, message: question, context, history });
            setMessages(prev => [...prev, { role: 'assistant', content: response }]);
            setRemaining(left);
        } catch (err) {
            const msg = err.message || 'The assistant could not answer just now.';
            setOutOfCredits(/no ai credits/i.test(msg));
            setError(msg);
            // Put the question back so nothing the member typed is lost.
            setMessages(prev => prev.slice(0, -1));
            setInput(question);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-800/40 transition"
                aria-expanded={open}
            >
                <span className="flex items-center gap-2 text-white font-medium">
                    <Sparkles className="w-4 h-4 text-primary-400" /> {title}
                </span>
                {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {open && (
                <div className="border-t border-slate-800 p-4">
                    {messages.length === 0 && suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                            {suggestions.map(s => (
                                <button key={s} type="button" onClick={() => send(s)} disabled={busy} className="text-xs px-3 py-1.5 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50">
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}

                    {messages.length > 0 && (
                        <div className="space-y-3 mb-3 max-h-80 overflow-y-auto pr-1">
                            {messages.map((m, i) => (
                                <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                                    <p className={`inline-block max-w-[92%] text-sm rounded-lg px-3 py-2 whitespace-pre-wrap text-left ${m.role === 'user' ? 'bg-primary-500/20 text-slate-100' : 'bg-slate-800 text-slate-200'}`}>
                                        {m.content}
                                    </p>
                                </div>
                            ))}
                            {busy && <p className="text-xs text-slate-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Thinking...</p>}
                            <div ref={endRef} />
                        </div>
                    )}

                    {error && (
                        <div className="mb-3 p-3 rounded-lg text-sm bg-red-500/10 border border-red-500/20 text-red-300">
                            {error}
                            {outOfCredits && <> <Link to="/pricing" className="underline">See plans</Link></>}
                        </div>
                    )}

                    <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            maxLength={2000}
                            placeholder="Type your question..."
                            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <button type="submit" disabled={busy || !input.trim()} className="px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center" aria-label="Send">
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                    </form>
                    <p className="text-xs text-slate-500 mt-2">
                        Each question uses 1 AI credit{remaining !== null && remaining !== undefined ? ` · ${remaining === 'unlimited' ? 'unlimited' : remaining} left` : ''}. Guidance only, not professional advice.
                    </p>
                </div>
            )}
        </div>
    );
}

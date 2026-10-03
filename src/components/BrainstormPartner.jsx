// src/components/BrainstormPartner.jsx
// ODUSBABA BRAINSTORM PARTNER v4.0
//
// REBUILT (2026-09-30): confirmed, genuine root cause of "not working
// as expected" - the entire previous version forced every single
// message through a rigid "generate exactly 5 numbered ideas for:
// [whatever was typed]" system prompt, then split the response on
// numbered-list patterns. A direct question ("write me a video
// prompt") got mangled into a brainstorm-ideas request instead of
// being genuinely answered. Follow-up questions didn't even send
// real conversation history to the backend, so Claude had no actual
// memory of the conversation beyond one flat context string.
//
// This version is a real, open-ended chat: type anything, get a real,
// direct, conversational answer in whatever form actually fits - a
// prompt, a plan, a direct answer, a list only when a list genuinely
// suits the question. Full message history is sent on every turn.
// The backend (admin-brainstorm in index.js) also now injects real,
// current platform data (user counts by tier, active jobs, published
// courses, recent real search/chat activity) so recommendations are
// grounded in the site's actual state, not generic knowledge alone.

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
    Lightbulb, Sparkles, TrendingUp, Users, Briefcase, Zap,
    X, Send, Loader2, Copy, Check, Star,
    Rocket, Target, Brain, Code, Megaphone, RefreshCw, User, AlertTriangle
} from 'lucide-react';

const API_BASE = '/api/index';
const CHAT_ENDPOINT = `${API_BASE}?action=admin-brainstorm`;

export default function BrainstormPartner() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [conversation, setConversation] = useState([]);
    const [error, setError] = useState(null);
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [savedNotes, setSavedNotes] = useState([]);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const saved = localStorage.getItem('brainstorm_saved_notes');
        if (saved) {
            try { setSavedNotes(JSON.parse(saved)); } catch { /* genuinely corrupt saved data - ignore rather than crash */ }
        }
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversation]);

    const quickTopics = [
        { icon: Briefcase, text: "New HR features", prompt: "What HR features should we consider building next, given where the platform is right now?", color: "blue" },
        { icon: Users, text: "User engagement", prompt: "How could we meaningfully improve user engagement and retention?", color: "green" },
        { icon: TrendingUp, text: "Growth strategies", prompt: "What growth strategies make sense for this platform at its current stage?", color: "purple" },
        { icon: Zap, text: "AI integrations", prompt: "Where could AI genuinely add value on this platform that we haven't used it for yet?", color: "amber" },
        { icon: Rocket, text: "Product roadmap", prompt: "Help me think through priorities for the next phase of the product roadmap.", color: "red" },
        { icon: Target, text: "User acquisition", prompt: "What are cost-effective, realistic user acquisition approaches for a platform at this stage?", color: "teal" }
    ];

    async function authHeaders() {
        const { data: { session } } = await supabase.auth.getSession();
        return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` };
    }

    // NEW (2026-09-30): the real, genuine send function - one, single,
    // honest chat turn. Sends the real, full conversation history so
    // Claude genuinely remembers what's been discussed, and never
    // forces the response into a rigid format the question didn't ask
    // for.
    async function sendMessage(messageText) {
        const text = (messageText ?? input).trim();
        if (!text) return;

        setError(null);
        setIsLoading(true);
        setInput('');

        const userMessage = { role: 'user', content: text, timestamp: new Date().toISOString() };
        const updatedConversation = [...conversation, userMessage];
        setConversation(updatedConversation);

        try {
            const headers = await authHeaders();
            // Real history - every prior turn, in the exact role/content
            // shape the backend expects, so Claude has genuine context
            // for this message rather than starting fresh each time.
            const history = conversation.map(m => ({ role: m.role, content: m.content }));

            const response = await fetch(CHAT_ENDPOINT, {
                method: 'POST',
                headers,
                body: JSON.stringify({ message: text, history, temperature: 0.7, maxTokens: 1500 })
            });

            const data = await response.json();
            if (!data.success || !data.response) {
                throw new Error(data.error || 'No response received');
            }

            const assistantMessage = { role: 'assistant', content: data.response, timestamp: new Date().toISOString() };
            setConversation(prev => [...prev, assistantMessage]);
        } catch (err) {
            console.error('Brainstorm error:', err);
            // FIXED (2026-09-30): a real, honest error shown directly -
            // never a silently-substituted hardcoded idea list
            // pretending to be a genuine response.
            setError(err.message || 'Something went wrong - please try again.');
            // Removes the optimistic user message's pending state by
            // leaving it in place (it was genuinely sent), but makes
            // the failure visible rather than hidden.
        } finally {
            setIsLoading(false);
        }
    }

    const copyToClipboard = (text, index) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const saveNote = (text) => {
        const newSaved = [...savedNotes, { text, savedAt: new Date().toISOString() }];
        setSavedNotes(newSaved);
        localStorage.setItem('brainstorm_saved_notes', JSON.stringify(newSaved));
    };

    const clearConversation = () => {
        setConversation([]);
        setError(null);
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 left-6 z-50 p-3.5 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 group"
                title="AI Brainstorm Partner"
            >
                <Lightbulb className="w-5 h-5 text-white group-hover:animate-pulse" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">

                        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-gradient-to-r from-amber-600/20 to-orange-600/20">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                                    <Brain className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">Brainstorm Partner</h3>
                                    <p className="text-xs text-slate-400">A real conversation, grounded in the platform's current data</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={clearConversation} className="p-2 text-slate-400 hover:text-white transition" title="Clear conversation">
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                                <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 hover:text-white transition">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                            <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                Quick starting points:
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {quickTopics.map((topicItem, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => sendMessage(topicItem.prompt)}
                                        disabled={isLoading}
                                        className={`flex items-center gap-1 px-3 py-1.5 bg-${topicItem.color}-500/10 border border-${topicItem.color}-500/20 rounded-lg text-sm text-${topicItem.color}-400 hover:bg-${topicItem.color}-500/20 transition disabled:opacity-50`}
                                    >
                                        <topicItem.icon className="w-3.5 h-3.5" />
                                        {topicItem.text}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[450px]">
                            {conversation.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-4">
                                        <Lightbulb className="w-10 h-10 text-amber-400" />
                                    </div>
                                    <h4 className="text-white font-semibold mb-2">Ask me anything</h4>
                                    <p className="text-slate-400 text-sm max-w-md mx-auto">
                                        A direct question, a plan to think through, a prompt to draft - type it below or pick a starting point above. Real answers grounded in the platform's current data, not a fixed format.
                                    </p>
                                    <div className="flex items-center justify-center gap-2 mt-4">
                                        <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400">
                                            <Target className="w-3 h-3 inline mr-1" /> Strategy
                                        </span>
                                        <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400">
                                            <Code className="w-3 h-3 inline mr-1" /> Features
                                        </span>
                                        <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400">
                                            <Megaphone className="w-3 h-3 inline mr-1" /> Writing & prompts
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                conversation.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] ${msg.role === 'user' ? 'bg-amber-600/20 border border-amber-500/30' : 'bg-slate-800'} rounded-2xl px-4 py-3`}>
                                            {msg.role === 'user' ? (
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
                                                        <User className="w-3 h-3 text-amber-400" />
                                                    </div>
                                                    <span className="text-xs text-amber-400">You</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between gap-2 mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <Brain className="w-4 h-4 text-amber-400" />
                                                        <span className="text-xs font-medium text-amber-400">Brainstorm Partner</span>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => copyToClipboard(msg.content, idx)} className="p-1 hover:bg-slate-700 rounded" title="Copy response">
                                                            {copiedIndex === idx ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                                                        </button>
                                                        <button onClick={() => saveNote(msg.content)} className="p-1 hover:bg-slate-700 rounded" title="Save this response">
                                                            <Star className="w-3 h-3 text-slate-400" />
                                                        </button>
                                                        <button
                                                            onClick={() => sendMessage('Go deeper on that - feasibility, implementation steps, potential challenges, and how we\'d know it\'s working (success metrics).')}
                                                            disabled={isLoading}
                                                            className="p-1 hover:bg-slate-700 rounded disabled:opacity-50"
                                                            title="Get more detail on this"
                                                        >
                                                            <Rocket className="w-3 h-3 text-slate-400" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                            <p className="text-white text-sm whitespace-pre-wrap">{msg.content}</p>
                                            <p className="text-xs text-slate-500 mt-2">
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}

                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-800 rounded-2xl px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                                            <span className="text-sm text-slate-400">Thinking...</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-red-300 text-sm">{error}</p>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-4 border-t border-slate-800 bg-slate-900">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                    placeholder="Ask anything - a question, a plan, a prompt to write..."
                                    disabled={isLoading}
                                    className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                                />
                                <button
                                    onClick={() => sendMessage()}
                                    disabled={isLoading || !input.trim()}
                                    className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl hover:from-amber-500 hover:to-orange-500 transition disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    Send
                                </button>
                            </div>
                            {savedNotes.length > 0 && (
                                <p className="text-xs text-amber-400 mt-2">{savedNotes.length} saved note{savedNotes.length === 1 ? '' : 's'}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

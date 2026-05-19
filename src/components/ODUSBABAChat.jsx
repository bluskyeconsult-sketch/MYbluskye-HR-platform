// src/components/ODUSBABAChat.jsx
// COMPLETE CHAT COMPONENT - Integrated with real OpenAI API, credit tracking, database persistence

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { MessageCircle, X, Send, Bot, User, Sparkles, Briefcase, FileText, Award, TrendingUp, Users, Zap, Loader2 } from 'lucide-react';

export default function ODUSBABAChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [conversationId, setConversationId] = useState(null);
    const [remainingCredits, setRemainingCredits] = useState(null);
    const [userTier, setUserTier] = useState(null);
    const messagesEndRef = useRef(null);

    // Guest message limit
    const GUEST_LIMIT = 5;

    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    async function checkAuth() {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (user) {
            await loadConversation();
            await loadCredits();
        } else {
            // Guest mode - load welcome message only
            setMessages([{
                id: 'welcome',
                sender: 'odusbaba',
                message: "👋 Hello! I'm ODUSBABA, your AI Career Advisor. I can help with job searches, CV optimization, interview preparation, salary negotiation, and career advice. What would you like help with today?",
                created_at: new Date().toISOString()
            }]);
        }
    }

    async function loadConversation() {
        if (!user) return;
        
        // Get most recent conversation
        const { data: existing } = await supabase
            .from('chat_conversations')
            .select('id')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        
        let convId = existing?.id;
        
        if (!convId) {
            const { data: newConv } = await supabase
                .from('chat_conversations')
                .insert({ user_id: user.id, title: 'New Conversation' })
                .select()
                .single();
            convId = newConv?.id;
        }
        
        setConversationId(convId);
        
        if (convId) {
            const { data: history } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('conversation_id', convId)
                .order('created_at', { ascending: true });
            
            if (history?.length > 0) {
                setMessages(history);
            } else {
                setMessages([{
                    id: 'welcome',
                    sender: 'odusbaba',
                    message: "👋 Hello! I'm ODUSBABA, your AI Career Advisor. I can help with job searches, CV optimization, interview preparation, salary negotiation, and career advice. What would you like help with today?",
                    created_at: new Date().toISOString()
                }]);
            }
        }
    }

    async function loadCredits() {
        if (!user) return;
        
        const { data: profile } = await supabase
            .from('profiles')
            .select('ai_credits_remaining, tier, user_type')
            .eq('id', user.id)
            .single();
        
        setUserTier(profile?.tier || 'free');
        const credits = profile?.ai_credits_remaining;
        
        if (credits !== null && credits !== undefined) {
            setRemainingCredits(credits);
        } else {
            const limits = { free: 5, registered: 20, professional: 100, employer: 200, business: 999999 };
            setRemainingCredits(limits[profile?.tier] || 5);
        }
    }

    const guestMessageCount = messages.filter(m => m.sender === 'user').length;
    const canSendMessage = () => {
        if (loading) return false;
        if (!input.trim()) return false;
        if (!user && guestMessageCount >= GUEST_LIMIT) return false;
        if (user && remainingCredits !== null && remainingCredits <= 0) return false;
        return true;
    };

    async function sendMessage() {
        if (!canSendMessage()) return;
        
        const userMessage = {
            id: Date.now(),
            sender: 'user',
            message: input,
            created_at: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            // Save user message to database (if logged in)
            if (conversationId && user) {
                await supabase.from('chat_messages').insert({
                    conversation_id: conversationId,
                    sender: 'user',
                    message: input
                });
            }

            // Prepare conversation history for API
            const history = messages.slice(-10).map(m => ({
                role: m.sender === 'user' ? 'user' : 'assistant',
                content: m.message
            }));
            history.push({ role: 'user', content: input });

            // Call API endpoint
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    messages: history, 
                    userId: user?.id,
                    conversationId,
                    userTier
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Chat failed');
            }

            // Save bot response
            const botMessage = {
                id: Date.now() + 1,
                sender: 'odusbaba',
                message: data.reply,
                created_at: new Date().toISOString()
            };
            setMessages(prev => [...prev, botMessage]);

            if (conversationId && user) {
                await supabase.from('chat_messages').insert({
                    conversation_id: conversationId,
                    sender: 'odusbaba',
                    message: data.reply
                });
                
                // Update conversation timestamp
                await supabase
                    .from('chat_conversations')
                    .update({ updated_at: new Date().toISOString() })
                    .eq('id', conversationId);
            }

            if (data.remaining !== undefined) {
                setRemainingCredits(data.remaining);
            }

        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                sender: 'odusbaba',
                message: "I'm having trouble connecting right now. Please try again in a moment, or contact support@bluskyeconsult.com for assistance.",
                created_at: new Date().toISOString()
            }]);
        } finally {
            setLoading(false);
        }
    }

    const suggestedActions = [
        { icon: Briefcase, text: "Career Path Planning", action: "Help me plan my career path based on my skills" },
        { icon: FileText, text: "Resume Review", action: "Can you review my resume and provide suggestions?" },
        { icon: Award, text: "Skill Gap Analysis", action: "Identify my skill gaps and recommend learning paths" },
        { icon: TrendingUp, text: "Job Search Strategy", action: "Help me find jobs that match my profile" },
        { icon: Users, text: "Interview Prep", action: "Generate interview questions for my target role" },
        { icon: Zap, text: "Salary Guidance", action: "What salary should I expect for my role and location?" }
    ];

    const showSuggestedActions = messages.filter(m => m.sender === 'user').length === 0;

    return (
        <>
            {/* Chat Button */}
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-r from-primary-500 to-purple-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 ${isOpen ? 'scale-0' : 'scale-100'}`}
            >
                <MessageCircle className="w-6 h-6 text-white" />
                {!user && remainingCredits !== 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse"></span>
                )}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 z-50 w-[400px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-8rem)] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-gradient-to-r from-primary-600/20 to-purple-600/20">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white">ODUSBABA AI</h3>
                                <p className="text-xs text-slate-400">Career Advisor • 24/7</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {user && remainingCredits !== null && (
                                <div className="px-2 py-1 bg-slate-800 rounded-lg">
                                    <p className={`text-xs font-medium ${remainingCredits <= 5 ? 'text-amber-400' : 'text-slate-400'}`}>
                                        {remainingCredits >= 999999 ? '∞' : remainingCredits} credits left
                                    </p>
                                </div>
                            )}
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] ${msg.sender === 'user' ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-200'} rounded-2xl px-4 py-2.5 ${msg.sender === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        {msg.sender === 'odusbaba' ? (
                                            <Bot className="w-3 h-3 text-primary-400" />
                                        ) : (
                                            <User className="w-3 h-3 text-slate-400" />
                                        )}
                                        <span className="text-xs opacity-70">
                                            {msg.sender === 'odusbaba' ? 'Career Advisor' : 'You'}
                                        </span>
                                    </div>
                                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                    <p className="text-xs opacity-50 mt-1">
                                        {new Date(msg.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))}
                        
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-2">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Suggested Actions - Only show when no conversation yet */}
                    {showSuggestedActions && (
                        <div className="p-3 border-t border-slate-800 bg-slate-900/50">
                            <p className="text-xs text-slate-400 mb-2">✨ Suggested actions:</p>
                            <div className="flex flex-wrap gap-2">
                                {suggestedActions.map((action, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            setInput(action.action);
                                            setTimeout(() => sendMessage(), 100);
                                        }}
                                        className="flex items-center gap-1 px-2 py-1 bg-slate-800 rounded-lg text-xs text-slate-300 hover:bg-slate-700 transition"
                                    >
                                        <action.icon className="w-3 h-3" />
                                        {action.text}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input Area */}
                    <div className="p-4 border-t border-slate-800 bg-slate-900">
                        <div className="flex gap-2">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                                placeholder={user ? "Ask me anything..." : `Try ODUSBABA free (${GUEST_LIMIT - guestMessageCount} messages left)...`}
                                rows={1}
                                className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 resize-none"
                                style={{ minHeight: '44px', maxHeight: '100px' }}
                                disabled={loading || (user && remainingCredits === 0)}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!canSendMessage()}
                                className="p-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            </button>
                        </div>
                        
                        {/* Credit/Usage Info */}
                        {!user && (
                            <p className="text-xs text-slate-500 text-center mt-2">
                                {guestMessageCount >= GUEST_LIMIT ? (
                                    <span className="text-amber-400">
                                        Free messages used. <a href="/sign-up" className="text-primary-400 underline">Sign up</a> to continue.
                                    </span>
                                ) : (
                                    <span>
                                        {GUEST_LIMIT - guestMessageCount} free messages remaining. 
                                        <a href="/sign-up" className="text-primary-400 underline ml-1">Sign up</a> for more.
                                    </span>
                                )}
                            </p>
                        )}
                        
                        {user && remainingCredits === 0 && (
                            <p className="text-xs text-amber-400 text-center mt-2">
                                You've used all your credits. <a href="/pricing" className="text-primary-400 underline">Upgrade</a> to continue.
                            </p>
                        )}
                        
                        {user && remainingCredits > 0 && remainingCredits <= 5 && (
                            <p className="text-xs text-amber-400/70 text-center mt-2">
                                ⚠️ Low on credits. <a href="/pricing" className="text-primary-400 underline">Purchase more</a>
                            </p>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

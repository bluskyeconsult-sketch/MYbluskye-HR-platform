import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';
import { getRemainingChatCredits, recordChatUsage, getAIResponse, escalateToAdmin } from '../services/odusbabaChatService';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ODUSBABAChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [remainingCredits, setRemainingCredits] = useState(null);
    const [conversationId, setConversationId] = useState(null);
    const [guestMessageCount, setGuestMessageCount] = useState(0);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const GUEST_LIMIT = 5;

    useEffect(() => {
        checkAuth();
        // Load guest message count from localStorage
        const savedCount = localStorage.getItem('guest-chat-count');
        if (savedCount) setGuestMessageCount(parseInt(savedCount));
    }, []);

    useEffect(() => {
        if (isOpen && user) {
            loadConversation();
            loadRemainingCredits();
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, user]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    async function checkAuth() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUser(user);
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            setProfile(profile);
        }
    }

    async function loadRemainingCredits() {
        if (!user) return;
        const credits = await getRemainingChatCredits(user.id);
        setRemainingCredits(credits);
    }

    async function loadConversation() {
        if (!user) return;
        
        let { data: conv } = await supabase
            .from('chat_conversations')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();
        
        if (!conv) {
            const { data: newConv } = await supabase
                .from('chat_conversations')
                .insert({
                    user_id: user.id,
                    title: 'ODUSBABA Chat',
                    jurisdiction: profile?.country_code || 'GB'
                })
                .select()
                .single();
            conv = newConv;
        }
        
        if (conv) {
            setConversationId(conv.id);
            
            const { data: msgs } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('conversation_id', conv.id)
                .order('created_at', { ascending: true });
            
            if (msgs && msgs.length > 0) {
                setMessages(msgs);
            } else {
                const welcomeMsg = {
                    id: 'welcome',
                    sender: 'odusbaba',
                    message: `Hello ${profile?.full_name || 'there'}! 👋 I'm ODUSBABA, your AI HR assistant. I can help you find jobs, analyze your CV, suggest courses, answer HR questions, and more. What would you like to explore today?`,
                    created_at: new Date().toISOString()
                };
                setMessages([welcomeMsg]);
            }
        }
    }

    async function sendMessage() {
        if (!input.trim() || loading) return;
        
        // Guest user (not logged in)
        if (!user) {
            if (guestMessageCount >= GUEST_LIMIT) {
                const errorMsg = {
                    id: Date.now(),
                    sender: 'odusbaba',
                    message: `💡 You've used your ${GUEST_LIMIT} free messages! Sign up or log in to continue chatting with ODUSBABA and unlock:\n\n✅ Unlimited chat\n✅ CV analysis\n✅ Job matching\n✅ Personalized recommendations\n✅ Skill gap analysis\n\n👉 [Sign Up](/sign-up) or [Log In](/sign-in) to continue!`,
                    created_at: new Date().toISOString()
                };
                setMessages(prev => [...prev, errorMsg]);
                setInput('');
                return;
            }
            
            const userMsg = { id: Date.now(), sender: 'user', message: input, created_at: new Date().toISOString() };
            setMessages(prev => [...prev, userMsg]);
            setInput('');
            setLoading(true);
            
            const lowerInput = input.toLowerCase();
            let response = '';
            
            if (lowerInput.includes('job') || lowerInput.includes('work')) {
                response = `🔍 I'd love to help you find jobs! Sign up for free to access our job board with thousands of verified positions across 7 countries. 👉 [Sign Up Here](/sign-up)`;
            } else if (lowerInput.includes('cv') || lowerInput.includes('resume')) {
                response = `📄 CV analysis is available for registered users. Sign up for free to upload your CV and get AI-powered skill extraction and job matching! 👉 [Sign Up Here](/sign-up)`;
            } else if (lowerInput.includes('help') || lowerInput.includes('what can you do')) {
                response = `✨ I'm ODUSBABA, your AI HR assistant! I can help with:\n\n🔍 Finding jobs\n📄 Analyzing CVs\n📚 Suggesting courses\n💡 Answering HR questions\n\n👉 Sign up for free to unlock all features!`;
            } else {
                response = `👋 Welcome to ODUSBABA! I'm your AI HR assistant. Sign up for free to get personalized job recommendations, CV analysis, and much more! 👉 [Sign Up Here](/sign-up)`;
            }
            
            const botMsg = {
                id: Date.now() + 1,
                sender: 'odusbaba',
                message: response,
                created_at: new Date().toISOString()
            };
            setMessages(prev => [...prev, botMsg]);
            const newCount = guestMessageCount + 1;
            setGuestMessageCount(newCount);
            localStorage.setItem('guest-chat-count', newCount.toString());
            setLoading(false);
            return;
        }
        
        // Logged-in user
        if (remainingCredits?.remaining <= 0) {
            const userMsg = { id: Date.now(), sender: 'user', message: input, created_at: new Date().toISOString() };
            setMessages(prev => [...prev, userMsg]);
            const errorMsg = {
                id: Date.now() + 1,
                sender: 'odusbaba',
                message: `⚠️ You've reached your monthly chat limit (${remainingCredits?.limit || 5} messages).\n\n💡 Options:\n• Upgrade your tier for more messages\n• Purchase extra credits\n• Wait until next month when your credits reset.\n\nWould you like to upgrade or purchase credits?`,
                created_at: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorMsg]);
            setInput('');
            setLoading(false);
            return;
        }
        
        const userMsg = { id: Date.now(), sender: 'user', message: input, created_at: new Date().toISOString() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);
        
        try {
            if (conversationId) {
                await supabase.from('chat_messages').insert({
                    conversation_id: conversationId,
                    sender: 'user',
                    message: input
                });
            }
            
            const aiResponse = await getAIResponse(user?.id, input, conversationId, profile, remainingCredits?.tier);
            
            const botMsg = {
                id: Date.now() + 1,
                sender: 'odusbaba',
                message: aiResponse.response,
                created_at: new Date().toISOString()
            };
            setMessages(prev => [...prev, botMsg]);
            
            if (conversationId) {
                await supabase.from('chat_messages').insert({
                    conversation_id: conversationId,
                    sender: 'odusbaba',
                    message: aiResponse.response
                });
            }
            
            await recordChatUsage(user.id);
            await loadRemainingCredits();
            
            if (aiResponse.needsEscalation && user) {
                const ticket = await escalateToAdmin(
                    user.id,
                    conversationId,
                    aiResponse.escalationSubject || 'User requested assistance',
                    input
                );
                const escalationMsg = {
                    id: Date.now() + 2,
                    sender: 'odusbaba',
                    message: `✅ Your request has been escalated to our admin team. Ticket reference: ${ticket.ticketId.substring(0, 8)}. A human administrator will respond within 24 hours.`,
                    created_at: new Date().toISOString()
                };
                setMessages(prev => [...prev, escalationMsg]);
                await supabase.from('chat_messages').insert({
                    conversation_id: conversationId,
                    sender: 'odusbaba',
                    message: escalationMsg.message
                });
            }
        } catch (error) {
            console.error('Chat error:', error);
            const errorMsg = {
                id: Date.now() + 1,
                sender: 'odusbaba',
                message: '⚠️ I encountered an issue. Please try again or contact support if the problem persists.',
                created_at: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    }

    function handleKeyPress(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    function getTierColor() {
        switch (remainingCredits?.tier) {
            case 'free': return 'text-slate-400';
            case 'registered': return 'text-blue-400';
            case 'professional': return 'text-emerald-400';
            case 'employer': return 'text-purple-400';
            case 'business': return 'text-amber-400';
            default: return 'text-slate-400';
        }
    }

    return (
        <>
            {/* Chat Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-full shadow-lg hover:scale-105 transition-all duration-300 hover:shadow-emerald-500/25"
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-[400px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-8rem)] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden">
                    {/* Header */}
                    <div className="p-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-950">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-sky-500 flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">ODUSBABA</h3>
                                    <p className="text-xs text-slate-400">AI HR Assistant</p>
                                </div>
                            </div>
                            {user && remainingCredits ? (
                                <div className="text-right">
                                    <div className={`text-xs font-medium ${getTierColor()}`}>
                                        {remainingCredits.tier.toUpperCase()} • {remainingCredits.remaining} credits left
                                    </div>
                                    {remainingCredits.remaining <= 5 && remainingCredits.remaining > 0 && (
                                        <div className="text-xs text-amber-400">⚠️ Low credits</div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-right">
                                    <div className="text-xs text-slate-400">
                                        💬 {guestMessageCount}/{GUEST_LIMIT} free messages
                                    </div>
                                    {guestMessageCount >= GUEST_LIMIT - 1 && guestMessageCount < GUEST_LIMIT && (
                                        <div className="text-xs text-amber-400">⚠️ Last free message</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                                        msg.sender === 'user'
                                            ? 'bg-emerald-600 text-white rounded-br-sm'
                                            : 'bg-slate-800 text-slate-200 rounded-bl-sm'
                                    }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                    <p className="text-xs opacity-50 mt-1">
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-2">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Actions */}
                    <div className="px-4 py-2 border-t border-slate-800 bg-slate-900/50">
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            <button onClick={() => setInput('Find me jobs in UK')} className="px-3 py-1 text-xs bg-slate-800 text-slate-300 rounded-full hover:bg-slate-700 whitespace-nowrap">
                                🔍 Find Jobs
                            </button>
                            <button onClick={() => setInput('Analyze my CV')} className="px-3 py-1 text-xs bg-slate-800 text-slate-300 rounded-full hover:bg-slate-700 whitespace-nowrap">
                                📄 Analyze CV
                            </button>
                            <button onClick={() => setInput('Suggest courses for me')} className="px-3 py-1 text-xs bg-slate-800 text-slate-300 rounded-full hover:bg-slate-700 whitespace-nowrap">
                                📚 Suggest Courses
                            </button>
                            <button onClick={() => setInput('I need to speak to a human')} className="px-3 py-1 text-xs bg-slate-800 text-slate-300 rounded-full hover:bg-slate-700 whitespace-nowrap">
                                👨‍💼 Escalate to Admin
                            </button>
                        </div>
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t border-slate-800 bg-slate-900">
                        <div className="flex gap-2">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder={user ? "Ask ODUSBABA anything..." : "Try ODUSBABA free (5 messages)..."}
                                rows={1}
                                className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                                style={{ minHeight: '44px', maxHeight: '100px' }}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={loading || !input.trim()}
                                className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                        {!user && (
                            <p className="text-xs text-slate-500 text-center mt-2">
                                <a href="/sign-up" className="text-emerald-400 hover:underline">Sign up free</a> or <a href="/sign-in" className="text-emerald-400 hover:underline">log in</a> for unlimited chat
                            </p>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { MessageCircle, X, Send, Zap, Sparkles, ChevronUp, User, Settings, HelpCircle, Briefcase, BookOpen, TrendingUp, Shield } from 'lucide-react';
import { getRemainingChatCredits, recordChatUsage, getAIResponse, escalateToAdmin, purchaseChatCredits } from '../services/odusbabaChatService';

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
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        checkAuth();
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
        
        // Get or create conversation
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
            
            // Load messages
            const { data: msgs } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('conversation_id', conv.id)
                .order('created_at', { ascending: true });
            
            if (msgs && msgs.length > 0) {
                setMessages(msgs);
            } else {
                // Welcome message
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
        if (user && remainingCredits?.remaining <= 0) {
            const userMsg = { id: Date.now(), sender: 'user', message: input, created_at: new Date().toISOString() };
            setMessages(prev => [...prev, userMsg]);
            const errorMsg = {
                id: Date.now() + 1,
                sender: 'odusbaba',
                message: `⚠️ You've reached your monthly chat limit (${remainingCredits?.limit || 5} messages).\n\n💡 Options:\n• Upgrade your tier for more messages\n• Purchase extra credits (${remainingCredits?.canPurchaseExtra ? '$1.99 for 10 credits' : 'not available for your tier'})\n• Wait until next month when your credits reset.\n\nWould you like to upgrade or purchase credits?`,
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
            // Save user message to database
            if (conversationId) {
                await supabase.from('chat_messages').insert({
                    conversation_id: conversationId,
                    sender: 'user',
                    message: input
                });
            }
            
            // Get AI response
            const aiResponse = await getAIResponse(user?.id, input, conversationId, profile, remainingCredits?.tier);
            
            const botMsg = {
                id: Date.now() + 1,
                sender: 'odusbaba',
                message: aiResponse.response,
                created_at: new Date().toISOString()
            };
            setMessages(prev => [...prev, botMsg]);
            
            // Save bot message
            if (conversationId) {
                await supabase.from('chat_messages').insert({
                    conversation_id: conversationId,
                    sender: 'odusbaba',
                    message: aiResponse.response
                });
            }
            
            // Record usage for authenticated users
            if (user) {
                await recordChatUsage(user.id);
                await loadRemainingCredits();
            }
            
            // Escalate if needed
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
                            {user && remainingCredits && (
                                <div className="text-right">
                                    <div className={`text-xs font-medium ${getTierColor()}`}>
                                        {remainingCredits.tier.toUpperCase()} • {remainingCredits.remaining} credits left
                                    </div>
                                    {remainingCredits.remaining <= 5 && remainingCredits.remaining > 0 && (
                                        <div className="text-xs text-amber-400">⚠️ Low credits</div>
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
                                placeholder={user ? "Ask ODUSBABA anything..." : "Sign in to chat with ODUSBABA"}
                                disabled={!user}
                                rows={1}
                                className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                                style={{ minHeight: '44px', maxHeight: '100px' }}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!user || loading || !input.trim()}
                                className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                        {!user && (
                            <p className="text-xs text-slate-500 text-center mt-2">
                                <a href="/sign-in" className="text-emerald-400 hover:underline">Sign in</a> to chat with ODUSBABA
                            </p>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

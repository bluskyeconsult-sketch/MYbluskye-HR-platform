// src/components/ODUSBABAChat.jsx
// PROFESSIONAL CHAT COMPONENT - Integrated with OpenAI API, credit tracking, database persistence, unified API endpoint
// Features: Guest mode, credit system, conversation history, typing indicators, suggested actions, responsive design

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { MessageCircle, X, Send, Bot, User, Sparkles, Briefcase, FileText, Award, TrendingUp, Users, Zap, Loader2, AlertCircle, CreditCard, ChevronDown, Minimize2 } from 'lucide-react';

// ============================================
// CONFIGURATION
// ============================================

// ✅ FIXED: Unified API endpoint
const API_BASE = '/api/index';
const CHAT_ENDPOINT = `${API_BASE}?action=chat`;

// Configuration constants
const GUEST_LIMIT = 5;
const MAX_HISTORY_MESSAGES = 10;
const TYPING_DELAY = 500;
const AUTO_CLOSE_DELAY = 300000; // 5 minutes inactivity

// ============================================
// MAIN COMPONENT
// ============================================

export default function ODUSBABAChat() {
    // State Management
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [user, setUser] = useState(null);
    const [conversationId, setConversationId] = useState(null);
    const [remainingCredits, setRemainingCredits] = useState(null);
    const [userTier, setUserTier] = useState(null);
    const [error, setError] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);
    
    // Refs
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const inactivityTimerRef = useRef(null);
    const chatContainerRef = useRef(null);

    // ============================================
    // INITIALIZATION
    // ============================================

    useEffect(() => {
        initializeChat();
        
        // Track unread messages when chat is closed
        if (!isOpen && messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage?.sender === 'odusbaba') {
                setUnreadCount(prev => prev + 1);
            }
        } else {
            setUnreadCount(0);
        }
        
        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        };
    }, [isOpen]);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    // Focus input when chat opens
    useEffect(() => {
        if (isOpen && !isMinimized && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, isMinimized]);

    // Inactivity auto-close
    useEffect(() => {
        if (isOpen && !isMinimized) {
            if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
            inactivityTimerRef.current = setTimeout(() => {
                setIsOpen(false);
            }, AUTO_CLOSE_DELAY);
        }
        return () => {
            if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        };
    }, [isOpen, isMinimized, messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const initializeChat = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (user) {
            await Promise.all([
                loadConversation(),
                loadCredits()
            ]);
        } else {
            // Guest mode - welcome message only
            setMessages([createWelcomeMessage()]);
        }
    };

    const createWelcomeMessage = () => ({
        id: `welcome_${Date.now()}`,
        sender: 'odusbaba',
        message: "👋 Hello! I'm ODUSBABA, your AI Career Advisor. I can help with job searches, CV optimization, interview preparation, salary negotiation, and career advice. What would you like help with today?",
        created_at: new Date().toISOString()
    });

    const loadConversation = async () => {
        if (!user) return;
        
        try {
            // Get or create conversation
            const { data: existing } = await supabase
                .from('chat_conversations')
                .select('id, title')
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            
            let convId = existing?.id;
            let convTitle = existing?.title;
            
            if (!convId) {
                const { data: newConv } = await supabase
                    .from('chat_conversations')
                    .insert({ user_id: user.id, title: 'New Conversation' })
                    .select()
                    .single();
                convId = newConv?.id;
                convTitle = newConv?.title;
            }
            
            setConversationId(convId);
            
            // Load message history
            if (convId) {
                const { data: history } = await supabase
                    .from('chat_messages')
                    .select('*')
                    .eq('conversation_id', convId)
                    .order('created_at', { ascending: true });
                
                if (history?.length > 0) {
                    setMessages(history);
                } else {
                    setMessages([createWelcomeMessage()]);
                }
            }
        } catch (err) {
            console.error('Failed to load conversation:', err);
            setMessages([createWelcomeMessage()]);
        }
    };

    const loadCredits = async () => {
        if (!user) return;
        
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('ai_credits_remaining, tier, user_type')
                .eq('id', user.id)
                .single();
            
            setUserTier(profile?.tier || 'free');
            
            // Check for unlimited access
            const isUnlimited = profile?.user_type === 'super_admin' || 
                               profile?.user_type === 'admin' || 
                               profile?.tier === 'business';
            
            if (isUnlimited) {
                setRemainingCredits(999999);
            } else {
                const credits = profile?.ai_credits_remaining;
                if (credits !== null && credits !== undefined) {
                    setRemainingCredits(credits);
                } else {
                    const limits = { free: 5, registered: 20, professional: 100, employer: 200 };
                    setRemainingCredits(limits[profile?.tier] || 5);
                }
            }
        } catch (err) {
            console.error('Failed to load credits:', err);
            setRemainingCredits(5);
        }
    };

    const guestMessageCount = messages.filter(m => m.sender === 'user').length;
    
    const canSendMessage = useCallback(() => {
        if (isLoading) return false;
        if (!input.trim()) return false;
        if (!user && guestMessageCount >= GUEST_LIMIT) return false;
        if (user && remainingCredits !== null && remainingCredits <= 0 && remainingCredits !== 999999) return false;
        return true;
    }, [isLoading, input, user, guestMessageCount, remainingCredits]);

    // ============================================
    // SEND MESSAGE
    // ============================================

    const sendMessage = async () => {
        if (!canSendMessage()) return;
        
        const userMessage = {
            id: `msg_${Date.now()}`,
            sender: 'user',
            message: input.trim(),
            created_at: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setError(null);
        setIsLoading(true);
        setIsTyping(true);

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        
        try {
            // Save user message to database
            if (conversationId && user) {
                await supabase.from('chat_messages').insert({
                    conversation_id: conversationId,
                    sender: 'user',
                    message: userMessage.message
                });
            }

            // Prepare conversation history
            const history = messages
                .slice(-MAX_HISTORY_MESSAGES)
                .map(m => ({
                    role: m.sender === 'user' ? 'user' : 'assistant',
                    content: m.message
                }));
            history.push({ role: 'user', content: userMessage.message });

            // ✅ FIXED: Call unified API endpoint
            const response = await fetch(CHAT_ENDPOINT, {
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
                throw new Error(data.error || 'Chat service unavailable');
            }

            setIsTyping(false);
            
            const botMessage = {
                id: `msg_${Date.now() + 1}`,
                sender: 'odusbaba',
                message: data.reply,
                created_at: new Date().toISOString()
            };
            
            setMessages(prev => [...prev, botMessage]);

            // Save bot response
            if (conversationId && user) {
                await supabase.from('chat_messages').insert({
                    conversation_id: conversationId,
                    sender: 'odusbaba',
                    message: data.reply
                });
                
                await supabase
                    .from('chat_conversations')
                    .update({ updated_at: new Date().toISOString() })
                    .eq('id', conversationId);
            }

            if (data.remaining !== undefined) {
                setRemainingCredits(data.remaining);
            }

        } catch (err) {
            console.error('Chat error:', err);
            setError(err.message);
            
            setMessages(prev => [...prev, {
                id: `msg_error_${Date.now()}`,
                sender: 'odusbaba',
                message: "I'm having trouble connecting right now. Please try again in a moment, or refresh the page if the issue persists.",
                created_at: new Date().toISOString()
            }]);
        } finally {
            setIsLoading(false);
            setIsTyping(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getCreditDisplay = () => {
        if (!user) return null;
        if (remainingCredits >= 999999) return null;
        if (remainingCredits <= 5) return 'urgent';
        if (remainingCredits <= 20) return 'warning';
        return 'normal';
    };

    // ============================================
    // SUGGESTED ACTIONS
    // ============================================

    const suggestedActions = [
        { icon: Briefcase, text: "Career Path", action: "Help me plan my career path based on my skills" },
        { icon: FileText, text: "Resume Review", action: "Can you review my resume and provide suggestions?" },
        { icon: Award, text: "Skill Gap", action: "Identify my skill gaps and recommend learning paths" },
        { icon: TrendingUp, text: "Job Search", action: "Help me find jobs that match my profile" },
        { icon: Users, text: "Interview Prep", action: "Generate interview questions for my target role" },
        { icon: Zap, text: "Salary Guide", action: "What salary should I expect for my role and location?" }
    ];

    const showSuggestedActions = messages.filter(m => m.sender === 'user').length === 0 && !isLoading;
    const creditStatus = getCreditDisplay();

    // ============================================
    // RENDER
    // ============================================

    return (
        <>
            {/* Chat Button */}
            <button
                onClick={() => {
                    setIsOpen(true);
                    setIsMinimized(false);
                    setUnreadCount(0);
                }}
                className={`fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-r from-primary-600 to-purple-600 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
                aria-label="Open chat"
            >
                <MessageCircle className="w-6 h-6 text-white" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
                {!user && remainingCredits !== 0 && unreadCount === 0 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                )}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div 
                    ref={chatContainerRef}
                    className={`fixed bottom-24 right-6 z-50 w-[420px] max-w-[calc(100vw-2rem)] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
                        isMinimized ? 'h-14' : 'h-[600px] max-h-[calc(100vh-8rem)]'
                    }`}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-gradient-to-r from-primary-900/30 to-purple-900/30 cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center shadow-lg">
                                <Sparkles className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white text-sm">ODUSBABA AI</h3>
                                <p className="text-xs text-slate-400">Career Advisor • 24/7</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {user && remainingCredits !== null && remainingCredits < 999999 && !isMinimized && (
                                <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    creditStatus === 'urgent' ? 'bg-red-500/20 text-red-400' :
                                    creditStatus === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                                    'bg-slate-700 text-slate-300'
                                }`}>
                                    <CreditCard className="w-3 h-3 inline mr-1" />
                                    {remainingCredits}
                                </div>
                            )}
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsMinimized(!isMinimized);
                                }}
                                className="p-1 text-slate-400 hover:text-white transition rounded-lg hover:bg-slate-800"
                                aria-label={isMinimized ? "Expand chat" : "Minimize chat"}
                            >
                                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isMinimized ? 'rotate-180' : ''}`} />
                            </button>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsOpen(false);
                                }}
                                className="p-1 text-slate-400 hover:text-white transition rounded-lg hover:bg-slate-800"
                                aria-label="Close chat"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {!isMinimized && (
                        <>
                            {/* Messages Container */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-slate-900 to-slate-950">
                                {messages.map((msg, idx) => (
                                    <div
                                        key={msg.id || idx}
                                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                                    >
                                        <div className={`max-w-[85%] ${msg.sender === 'user' ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-200'} rounded-2xl px-4 py-2.5 ${msg.sender === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm'} shadow-sm`}>
                                            <div className="flex items-center gap-1.5 mb-1">
                                                {msg.sender === 'odusbaba' ? (
                                                    <Bot className="w-3 h-3 text-primary-400" />
                                                ) : (
                                                    <User className="w-3 h-3 text-slate-400" />
                                                )}
                                                <span className="text-xs opacity-70">
                                                    {msg.sender === 'odusbaba' ? 'Advisor' : 'You'}
                                                </span>
                                            </div>
                                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                                            <p className="text-[10px] opacity-40 mt-1 text-right">
                                                {formatTimestamp(msg.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                
                                {/* Typing indicator */}
                                {isTyping && (
                                    <div className="flex justify-start animate-fade-in">
                                        <div className="bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-3">
                                            <div className="flex gap-1">
                                                <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Error message */}
                                {error && (
                                    <div className="flex justify-center">
                                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                                            <p className="text-red-400 text-xs flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                {error}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Suggested Actions */}
                            {showSuggestedActions && (
                                <div className="p-3 border-t border-slate-700 bg-slate-900/80">
                                    <p className="text-xs text-slate-500 mb-2">Quick suggestions:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {suggestedActions.map((action, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    setInput(action.action);
                                                    setTimeout(() => sendMessage(), 50);
                                                }}
                                                className="flex items-center gap-1 px-2 py-1 bg-slate-800 rounded-lg text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition"
                                                disabled={isLoading}
                                            >
                                                <action.icon className="w-3 h-3" />
                                                <span className="hidden sm:inline">{action.text}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Input Area */}
                            <div className="p-3 border-t border-slate-700 bg-slate-900">
                                <div className="flex gap-2">
                                    <textarea
                                        ref={inputRef}
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder={user ? "Ask me anything..." : `Free: ${GUEST_LIMIT - guestMessageCount} msgs left`}
                                        rows={1}
                                        className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-sm"
                                        style={{ minHeight: '42px', maxHeight: '100px' }}
                                        disabled={isLoading || (user && remainingCredits === 0)}
                                    />
                                    <button
                                        onClick={sendMessage}
                                        disabled={!canSendMessage()}
                                        className="p-2 bg-primary-600 text-white rounded-xl hover:bg-primary-500 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[42px]"
                                        aria-label="Send message"
                                    >
                                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                    </button>
                                </div>
                                
                                {/* Credit/Usage Info */}
                                {!user && (
                                    <p className="text-xs text-slate-500 text-center mt-2">
                                        {guestMessageCount >= GUEST_LIMIT ? (
                                            <span className="text-amber-400">
                                                Free messages used. <a href="/sign-up" className="text-primary-400 hover:underline">Sign up</a> to continue.
                                            </span>
                                        ) : (
                                            <span>
                                                {GUEST_LIMIT - guestMessageCount} free messages remaining
                                            </span>
                                        )}
                                    </p>
                                )}
                                
                                {user && remainingCredits === 0 && remainingCredits !== 999999 && (
                                    <p className="text-xs text-amber-400 text-center mt-2">
                                        Credits exhausted. <a href="/pricing" className="underline hover:text-amber-300">Upgrade</a> to continue.
                                    </p>
                                )}
                                
                                {user && remainingCredits > 0 && remainingCredits <= 5 && remainingCredits !== 999999 && (
                                    <p className="text-xs text-amber-500 text-center mt-2">
                                        Low on credits ({remainingCredits} left). <a href="/pricing" className="underline">Purchase more</a>
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </>
    );
}

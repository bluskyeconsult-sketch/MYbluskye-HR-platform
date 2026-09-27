// src/pages/UserMessages.jsx
//
// REBUILT (2026-09-25): replaces the deliberate "Coming soon" stub
// with a real, working inbox - conversation list plus a real message
// thread, backed by the new conversations/messages tables and
// get-conversations/get-messages/send-message backend actions.

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MessageCircle, Send, Loader2, User, Flag } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UserMessages() {
    const [searchParams] = useSearchParams();
    const [conversations, setConversations] = useState([]);
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [activeConversationId, setActiveConversationId] = useState(searchParams.get('conversation') || null);
    const [messages, setMessages] = useState([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        init();
    }, []);

    useEffect(() => {
        if (activeConversationId) loadMessages(activeConversationId);
    }, [activeConversationId]);

    // NEW (2026-09-25): lightweight realtime for the currently-open
    // conversation only - matches the exact, proven pattern already
    // used in NotificationBell.jsx. Deliberately scoped small: this
    // is professional, async communication (not a live chat app), so
    // only the thread someone is actively reading needs to update
    // without a manual refresh - not every conversation at once.
    useEffect(() => {
        if (!activeConversationId) return;

        const subscription = supabase
            .channel(`messages-${activeConversationId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${activeConversationId}`
            }, (payload) => {
                setMessages(prev => {
                    // Avoids a duplicate when this is genuinely our
                    // own message we already added optimistically on
                    // send.
                    if (prev.some(m => m.id === payload.new.id)) return prev;
                    return [...prev, payload.new];
                });
            })
            .subscribe();

        return () => subscription.unsubscribe();
    }, [activeConversationId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    async function authHeaders() {
        const { data: { session } } = await supabase.auth.getSession();
        return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` };
    }

    async function init() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUserId(user.id);
        loadConversations();
    }

    async function loadConversations() {
        setLoadingConversations(true);
        try {
            const headers = await authHeaders();
            const response = await fetch('/api/index?action=get-conversations', { headers });
            const data = await response.json();
            setConversations(data.conversations || []);
        } catch (err) {
            console.error('Failed to load conversations:', err);
        } finally {
            setLoadingConversations(false);
        }
    }

    async function loadMessages(conversationId) {
        setLoadingMessages(true);
        try {
            const headers = await authHeaders();
            const response = await fetch(`/api/index?action=get-messages&conversationId=${conversationId}`, { headers });
            const data = await response.json();
            setMessages(data.messages || []);
        } catch (err) {
            toast.error('Failed to load messages');
        } finally {
            setLoadingMessages(false);
        }
    }

    async function handleReportMessage(messageId) {
        if (!confirm('Report this message to admins for review?')) return;
        try {
            const headers = await authHeaders();
            const response = await fetch('/api/index?action=report-message', {
                method: 'POST',
                headers,
                body: JSON.stringify({ messageId })
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.error);
            toast.success('Reported - our team will review this.');
        } catch (err) {
            toast.error(err.message);
        }
    }

    async function handleSend() {
        if (!newMessage.trim() || !activeConversationId) return;
        setSending(true);
        try {
            const headers = await authHeaders();
            const response = await fetch('/api/index?action=send-message', {
                method: 'POST',
                headers,
                body: JSON.stringify({ conversationId: activeConversationId, content: newMessage.trim() })
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.error);

            setMessages(prev => [...prev, data.message]);
            setNewMessage('');
            loadConversations();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSending(false);
        }
    }

    const activeConversation = conversations.find(c => c.id === activeConversationId);

    return (
        <div className="min-h-screen bg-background py-8">
            <div className="max-w-5xl mx-auto px-4">
                <h1 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
                    <MessageCircle className="w-7 h-7 text-primary-400" /> Messages
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden" style={{ height: '70vh' }}>
                    {/* Conversation list */}
                    <div className="md:col-span-1 border-r border-slate-800 overflow-y-auto">
                        {loadingConversations ? (
                            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary-400" /></div>
                        ) : conversations.length === 0 ? (
                            <p className="text-slate-500 text-sm text-center p-6">
                                No conversations yet. Messages from employers or applicants will appear here.
                            </p>
                        ) : (
                            conversations.map(conv => (
                                <button
                                    key={conv.id}
                                    onClick={() => setActiveConversationId(conv.id)}
                                    className={`w-full text-left p-4 border-b border-slate-800/50 hover:bg-slate-800/50 transition ${activeConversationId === conv.id ? 'bg-slate-800' : ''}`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                                            {conv.otherUser?.avatar_url ? (
                                                <img src={conv.otherUser.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                                            ) : (
                                                <User className="w-4 h-4 text-slate-400" />
                                            )}
                                        </div>
                                        <p className="text-white text-sm font-medium truncate flex-1">{conv.otherUser?.full_name || 'Unknown user'}</p>
                                        {conv.unreadCount > 0 && (
                                            <span className="w-5 h-5 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center flex-shrink-0">{conv.unreadCount}</span>
                                        )}
                                    </div>
                                    {conv.relatedJobTitle && <p className="text-slate-500 text-xs truncate">Re: {conv.relatedJobTitle}</p>}
                                </button>
                            ))
                        )}
                    </div>

                    {/* Thread */}
                    <div className="md:col-span-2 flex flex-col">
                        {!activeConversationId ? (
                            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                                Select a conversation to view messages.
                            </div>
                        ) : (
                            <>
                                <div className="p-4 border-b border-slate-800">
                                    <p className="text-white font-medium">{activeConversation?.otherUser?.full_name || 'Conversation'}</p>
                                    {activeConversation?.relatedJobTitle && <p className="text-slate-500 text-xs">Re: {activeConversation.relatedJobTitle}</p>}
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {loadingMessages ? (
                                        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary-400" /></div>
                                    ) : (
                                        messages.map(msg => (
                                            <div key={msg.id} className={`flex ${msg.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${msg.sender_id === currentUserId ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-200'}`}>
                                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                                    <div className="flex items-center justify-between gap-2 mt-1">
                                                        <p className={`text-[10px] ${msg.sender_id === currentUserId ? 'text-primary-200' : 'text-slate-500'}`}>
                                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                        {msg.sender_id !== currentUserId && (
                                                            <button
                                                                onClick={() => handleReportMessage(msg.id)}
                                                                className="text-slate-500 hover:text-red-400 transition"
                                                                title="Report this message"
                                                            >
                                                                <Flag className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                <div className="p-3 border-t border-slate-800 flex gap-2">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                        placeholder="Type a message..."
                                        className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500"
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={sending || !newMessage.trim()}
                                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition disabled:opacity-50 flex items-center justify-center"
                                    >
                                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

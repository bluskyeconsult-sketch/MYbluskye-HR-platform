// src/pages/admin/AdminSupportTickets.jsx
//
// NEW (2026-09-24): admin-side ticket management - view all tickets,
// filter by real status, reply, and update status
// (open/in_progress/resolved/closed).

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { LifeBuoy, Loader2, Send } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['open', 'in_progress', 'resolved', 'closed'];

export default function AdminSupportTickets() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [activeTicket, setActiveTicket] = useState(null);
    const [replies, setReplies] = useState([]);
    const [replyMessage, setReplyMessage] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        loadTickets();
    }, [statusFilter]);

    async function authHeaders() {
        const { data: { session } } = await supabase.auth.getSession();
        return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` };
    }

    async function loadTickets() {
        setLoading(true);
        try {
            const headers = await authHeaders();
            const url = `/api/index?action=admin-list-tickets${statusFilter ? `&status=${statusFilter}` : ''}`;
            const response = await fetch(url, { headers });
            const data = await response.json();
            setTickets(data.tickets || []);
        } catch (err) {
            console.error('Failed to load tickets:', err);
        } finally {
            setLoading(false);
        }
    }

    async function openTicket(ticket) {
        setActiveTicket(ticket);
        setReplyMessage('');
        try {
            const headers = await authHeaders();
            const response = await fetch(`/api/index?action=get-ticket-detail&ticketId=${ticket.id}`, { headers });
            const data = await response.json();
            setReplies(data.replies || []);
        } catch (err) {
            console.error('Failed to load ticket detail:', err);
        }
    }

    async function handleReply() {
        if (!replyMessage.trim()) return;
        setSending(true);
        try {
            const headers = await authHeaders();
            const response = await fetch('/api/index?action=admin-reply-ticket', {
                method: 'POST',
                headers,
                body: JSON.stringify({ ticketId: activeTicket.id, message: replyMessage })
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.error);

            toast.success('Reply sent');
            setReplyMessage('');
            await openTicket(activeTicket);
            await loadTickets();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSending(false);
        }
    }

    async function handleStatusChange(newStatus) {
        try {
            const headers = await authHeaders();
            const response = await fetch('/api/index?action=admin-update-ticket-status', {
                method: 'POST',
                headers,
                body: JSON.stringify({ ticketId: activeTicket.id, status: newStatus })
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.error);

            toast.success(`Ticket marked ${newStatus}`);
            setActiveTicket(prev => ({ ...prev, status: newStatus }));
            await loadTickets();
        } catch (err) {
            toast.error(err.message);
        }
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <LifeBuoy className="w-6 h-6 text-primary-400" /> Support Tickets
            </h1>

            <div className="flex gap-2 mb-4">
                {['', ...STATUS_OPTIONS].map(s => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1.5 rounded-lg text-sm ${statusFilter === s ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                    >
                        {s === '' ? 'All' : s.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary-400" /></div>
            ) : tickets.length === 0 ? (
                <p className="text-slate-500 text-sm">No tickets found.</p>
            ) : (
                <div className="space-y-2">
                    {tickets.map(ticket => (
                        <button
                            key={ticket.id}
                            onClick={() => openTicket(ticket)}
                            className="w-full text-left bg-slate-900/30 border border-slate-800 rounded-lg p-4 hover:border-primary-500/30 transition flex justify-between items-start gap-3"
                        >
                            <div>
                                <p className="text-slate-500 text-xs font-mono">{ticket.ticket_number} — {ticket.user_email}</p>
                                <p className="text-white font-medium">{ticket.subject}</p>
                            </div>
                            <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-300 flex-shrink-0 capitalize">{ticket.status.replace('_', ' ')}</span>
                        </button>
                    ))}
                </div>
            )}

            {activeTicket && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-3">
                            <p className="text-slate-500 text-xs font-mono">{activeTicket.ticket_number} — {activeTicket.user_email}</p>
                            <button onClick={() => setActiveTicket(null)} className="text-slate-400 hover:text-white">✕</button>
                        </div>
                        <h3 className="text-white font-semibold text-lg mb-3">{activeTicket.subject}</h3>

                        <div className="flex gap-2 mb-4">
                            {STATUS_OPTIONS.map(s => (
                                <button
                                    key={s}
                                    onClick={() => handleStatusChange(s)}
                                    className={`px-2.5 py-1 rounded-lg text-xs capitalize ${activeTicket.status === s ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                                >
                                    {s.replace('_', ' ')}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-3 mb-4">
                            {replies.map(reply => (
                                <div
                                    key={reply.id}
                                    className={`p-3 rounded-lg text-sm ${reply.author_type === 'support' ? 'bg-primary-500/10 text-slate-200' : 'bg-slate-800 text-slate-300'}`}
                                >
                                    <p className="text-xs text-slate-500 mb-1">{reply.author_type === 'support' ? 'Support (you)' : 'User'}</p>
                                    {reply.message}
                                </div>
                            ))}
                        </div>

                        <textarea
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                            rows={3}
                            placeholder="Write a reply..."
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm mb-2"
                        />
                        <button
                            onClick={handleReply}
                            disabled={sending || !replyMessage.trim()}
                            className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                        >
                            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            Send Reply
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

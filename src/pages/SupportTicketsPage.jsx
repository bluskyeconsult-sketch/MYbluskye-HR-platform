// src/pages/SupportTicketsPage.jsx
//
// NEW (2026-09-24): real, user-facing support ticketing - submit a
// new ticket, see real status (open/in_progress/resolved/closed), and
// read the full reply thread. Anyone can submit (no account
// required), but viewing past tickets requires being signed in as
// the person who opened them.

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LifeBuoy, Loader2, Send, Clock, CheckCircle, XCircle, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
    open: { label: 'Open', color: 'text-amber-400 bg-amber-500/10', icon: Clock },
    in_progress: { label: 'In Progress', color: 'text-sky-400 bg-sky-500/10', icon: MessageCircle },
    resolved: { label: 'Resolved', color: 'text-emerald-400 bg-emerald-500/10', icon: CheckCircle },
    closed: { label: 'Closed', color: 'text-slate-400 bg-slate-500/10', icon: XCircle }
};

export default function SupportTicketsPage() {
    const [user, setUser] = useState(null);
    const [tickets, setTickets] = useState([]);
    const [loadingTickets, setLoadingTickets] = useState(true);
    const [activeTicket, setActiveTicket] = useState(null);
    const [replies, setReplies] = useState([]);

    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [category, setCategory] = useState('general');
    const [guestEmail, setGuestEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        init();
    }, []);

    async function init() {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);
        if (currentUser) {
            await loadTickets(currentUser.id);
        } else {
            setLoadingTickets(false);
            setShowForm(true);
        }
    }

    async function authHeaders() {
        const { data: { session } } = await supabase.auth.getSession();
        return { 'Content-Type': 'application/json', ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}) };
    }

    async function loadTickets(userId) {
        setLoadingTickets(true);
        try {
            const headers = await authHeaders();
            const response = await fetch(`/api/index?action=get-my-tickets&userId=${userId}`, { headers });
            const data = await response.json();
            setTickets(data.tickets || []);
        } catch (err) {
            console.error('Failed to load tickets:', err);
        } finally {
            setLoadingTickets(false);
        }
    }

    async function openTicketDetail(ticket) {
        setActiveTicket(ticket);
        try {
            const headers = await authHeaders();
            const response = await fetch(`/api/index?action=get-ticket-detail&ticketId=${ticket.id}&userId=${user?.id || ''}`, { headers });
            const data = await response.json();
            setReplies(data.replies || []);
        } catch (err) {
            console.error('Failed to load ticket detail:', err);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const email = user?.email || guestEmail;
        if (!email || !subject.trim() || !message.trim()) {
            toast.error('Please fill in all required fields.');
            return;
        }

        setSubmitting(true);
        try {
            const headers = await authHeaders();
            const response = await fetch('/api/index?action=create-support-ticket', {
                method: 'POST',
                headers,
                body: JSON.stringify({ userId: user?.id || null, userEmail: email, subject, message, category })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to submit ticket');

            toast.success(`Ticket ${data.ticket.ticket_number} submitted!`);
            setSubject('');
            setMessage('');
            setShowForm(false);
            if (user) await loadTickets(user.id);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <LifeBuoy className="w-6 h-6 text-primary-400" /> Support
                </h1>
                {user && (
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition text-sm"
                    >
                        {showForm ? 'Cancel' : 'New Ticket'}
                    </button>
                )}
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 mb-6 space-y-3">
                    {!user && (
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Your Email *</label>
                            <input
                                type="email"
                                value={guestEmail}
                                onChange={(e) => setGuestEmail(e.target.value)}
                                required
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Category</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                        >
                            <option value="general">General</option>
                            <option value="billing">Billing</option>
                            <option value="account">Account</option>
                            <option value="jobs">Jobs</option>
                            <option value="technical">Technical Issue</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Subject *</label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            required
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Message *</label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={4}
                            required
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Submit Ticket
                    </button>
                </form>
            )}

            {user && (
                <>
                    <h2 className="text-white font-semibold mb-3">Your Tickets</h2>
                    {loadingTickets ? (
                        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary-400" /></div>
                    ) : tickets.length === 0 ? (
                        <p className="text-slate-500 text-sm">No tickets yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {tickets.map(ticket => {
                                const statusInfo = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
                                const StatusIcon = statusInfo.icon;
                                return (
                                    <button
                                        key={ticket.id}
                                        onClick={() => openTicketDetail(ticket)}
                                        className="w-full text-left bg-slate-900/30 border border-slate-800 rounded-lg p-4 hover:border-primary-500/30 transition"
                                    >
                                        <div className="flex justify-between items-start gap-3">
                                            <div>
                                                <p className="text-slate-500 text-xs font-mono">{ticket.ticket_number}</p>
                                                <p className="text-white font-medium">{ticket.subject}</p>
                                            </div>
                                            <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs flex-shrink-0 ${statusInfo.color}`}>
                                                <StatusIcon className="w-3 h-3" /> {statusInfo.label}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {activeTicket && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-1">
                            <p className="text-slate-500 text-xs font-mono">{activeTicket.ticket_number}</p>
                            <button onClick={() => setActiveTicket(null)} className="text-slate-400 hover:text-white">✕</button>
                        </div>
                        <h3 className="text-white font-semibold text-lg mb-4">{activeTicket.subject}</h3>
                        <div className="space-y-3">
                            {replies.map(reply => (
                                <div
                                    key={reply.id}
                                    className={`p-3 rounded-lg text-sm ${reply.author_type === 'support' ? 'bg-primary-500/10 text-slate-200' : 'bg-slate-800 text-slate-300'}`}
                                >
                                    <p className="text-xs text-slate-500 mb-1">{reply.author_type === 'support' ? 'Support' : 'You'}</p>
                                    {reply.message}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

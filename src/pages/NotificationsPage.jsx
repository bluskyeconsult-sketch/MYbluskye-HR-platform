// src/pages/NotificationsPage.jsx
// NEW (2026-09-13): confirmed NotificationBell.jsx's "View all
// notifications" link pointed to /notifications, a route that never
// existed anywhere in this app - this page, plus the route added to
// App.jsx, completes that link.

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Bell, Briefcase, Users, AlertCircle, MessageCircle, Loader2 } from 'lucide-react';

function getIcon(type) {
    switch (type) {
        case 'job': return <Briefcase className="w-5 h-5 text-emerald-400" />;
        case 'user': return <Users className="w-5 h-5 text-blue-400" />;
        case 'alert': return <AlertCircle className="w-5 h-5 text-red-400" />;
        case 'article': return <MessageCircle className="w-5 h-5 text-primary-400" />;
        default: return <MessageCircle className="w-5 h-5 text-slate-400" />;
    }
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadNotifications();
    }, []);

    async function loadNotifications() {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(100);

            setNotifications(data || []);
        } finally {
            setLoading(false);
        }
    }

    async function markAsRead(notificationId) {
        await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
        setNotifications(notifications.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
    }

    return (
        <div className="min-h-screen bg-slate-950 py-8">
            <div className="max-w-2xl mx-auto px-4">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
                    <Bell className="w-6 h-6 text-primary-400" /> Notifications
                </h1>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-16 text-slate-500">
                        <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No notifications yet.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {notifications.map((n) => (
                            <div
                                key={n.id}
                                onClick={() => !n.is_read && markAsRead(n.id)}
                                className={`p-4 rounded-xl border cursor-pointer transition ${
                                    n.is_read ? 'bg-slate-900/30 border-slate-800' : 'bg-primary-500/5 border-primary-500/20'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    {getIcon(n.type)}
                                    <div className="flex-1">
                                        <p className="text-white font-medium">{n.title}</p>
                                        {n.message && <p className="text-slate-400 text-sm mt-1">{n.message}</p>}
                                        <p className="text-slate-500 text-xs mt-2">
                                            {new Date(n.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    {!n.is_read && <div className="w-2 h-2 bg-primary-400 rounded-full mt-1.5" />}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

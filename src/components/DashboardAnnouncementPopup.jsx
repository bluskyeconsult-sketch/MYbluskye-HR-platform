// src/components/DashboardAnnouncementPopup.jsx
//
// NEW (2026-09-25): a real, dismissible modal popup for occasional
// admin communications - genuinely distinct from the top scrolling
// banner (ScrollingBanner.jsx/banner_messages), which is meant for
// persistent, glanceable notices. This is for something that
// genuinely needs to be seen and acknowledged, not scrolled past.

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Megaphone, X } from 'lucide-react';

export default function DashboardAnnouncementPopup() {
    const [announcement, setAnnouncement] = useState(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        loadAnnouncement();
    }, []);

    async function loadAnnouncement() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch('/api/index?action=get-dashboard-announcement', {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const data = await response.json();
            if (data.announcement) {
                setAnnouncement(data.announcement);
                setVisible(true);
            }
        } catch {
            // Non-critical - a failed fetch just means no popup shows,
            // never breaks the dashboard itself.
        }
    }

    async function handleDismiss() {
        setVisible(false);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            await fetch('/api/index?action=dismiss-dashboard-announcement', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                body: JSON.stringify({ announcementId: announcement.id })
            });
        } catch {
            // Non-critical if this doesn't persist - worst case it
            // shows again next visit.
        }
    }

    if (!visible || !announcement) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 relative">
                <button
                    onClick={handleDismiss}
                    className="absolute top-3 right-3 text-slate-500 hover:text-white transition"
                    aria-label="Dismiss"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="w-12 h-12 rounded-full bg-primary-500/10 flex items-center justify-center mb-4">
                    <Megaphone className="w-6 h-6 text-primary-400" />
                </div>

                <h2 className="text-lg font-bold text-white mb-2">{announcement.title}</h2>
                <p className="text-slate-300 text-sm mb-5 whitespace-pre-wrap">{announcement.message}</p>

                <div className="flex gap-3">
                    {announcement.cta_url && announcement.cta_label && (
                        <a
                            href={announcement.cta_url}
                            onClick={handleDismiss}
                            className="flex-1 text-center py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition text-sm font-medium"
                        >
                            {announcement.cta_label}
                        </a>
                    )}
                    <button
                        onClick={handleDismiss}
                        className={`${announcement.cta_url ? '' : 'flex-1'} py-2.5 px-4 text-slate-400 hover:text-white transition text-sm`}
                    >
                        {announcement.cta_url ? 'Dismiss' : 'Got it'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// src/hooks/useAnalyticsTracker.js
//
// NEW (2026-09-13): confirmed the real backend for this
// (track-page-view) was already fully built back on 2026-08-07 -
// handles session management, region via Vercel's own free
// geolocation headers, device/browser detection - but nothing in the
// frontend ever actually called it. This is that missing piece: a
// small hook, mounted once in App.jsx, that calls it on every real
// route change.

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const SESSION_STORAGE_KEY = 'odusbaba_analytics_session_id';

function getOrCreateSessionId() {
    let sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionId) {
        sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
        sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    }
    return sessionId;
}

export default function useAnalyticsTracker() {
    const location = useLocation();

    useEffect(() => {
        async function track() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                const { data: { session } } = await supabase.auth.getSession();

                await fetch('/api/index?action=track-page-view', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
                    },
                    body: JSON.stringify({
                        sessionId: getOrCreateSessionId(),
                        pageUrl: location.pathname,
                        userId: user?.id || null
                    })
                });
            } catch {
                // Tracking should never be able to break the site -
                // matches the backend's own stated design intent.
            }
        }
        track();
    }, [location.pathname]);
}

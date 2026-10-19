// src/lib/shareTracking.js
//
// NEW (2026-10-19): records which Share button was used, so the admin can see what actually gets shared.
// Fire-and-forget: it never delays the share, never shows an error, and stores no personal data
// (only the kind of item, the channel and the page path).

export function trackShare({ kind, channel, url }) {
    try {
        let path = '/';
        try { path = new URL(url || window.location.href, window.location.origin).pathname; } catch (e) { /* keep '/' */ }
        fetch('/api/index?action=track-share', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kind: kind || 'generic', channel, path }),
            keepalive: true
        }).catch(() => {});
    } catch (e) { /* tracking must never break sharing */ }
}

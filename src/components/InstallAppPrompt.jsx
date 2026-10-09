// src/components/InstallAppPrompt.jsx
// NEW (2026-10-09): makes the website installable as a phone app (PWA).
//
// 1. Registers /sw.js (production only, after the page has loaded, so it can
//    never slow first paint).
// 2. Adds the manifest / theme-color / apple-touch-icon tags if index.html
//    does not already have them (belt and braces - the same tags are also
//    given as a snippet for index.html).
// 3. Shows a small, dismissible "Install app" card:
//      - Android / Chrome / Edge: real install button (beforeinstallprompt)
//      - iPhone / iPad Safari: short "Share > Add to Home Screen" hint
//    Never shown when the app is already installed (standalone mode), on
//    admin pages, or within 21 days of being dismissed.
//    Storage access is wrapped in try/catch so a blocked browser is harmless.

import { useEffect, useState } from 'react';
import { Download, X, Share, PlusSquare } from 'lucide-react';

const STORAGE_KEY = 'odusbaba_install_prompt_dismissed_at';
const COOLDOWN_DAYS = 21;
const SHOW_AFTER_MS = 20000; // let the visitor look around first

function isStandalone() {
    return (
        window.matchMedia?.('(display-mode: standalone)').matches ||
        window.navigator.standalone === true
    );
}

function isIOS() {
    const ua = window.navigator.userAgent || '';
    const iPadOS = ua.includes('Mac') && 'ontouchend' in document;
    return /iPhone|iPad|iPod/.test(ua) || iPadOS;
}

function ensureHeadTag(selector, create) {
    if (!document.head.querySelector(selector)) document.head.appendChild(create());
}

export default function InstallAppPrompt() {
    const [deferred, setDeferred] = useState(null);
    const [showIOSHint, setShowIOSHint] = useState(false);
    const [visible, setVisible] = useState(false);

    // Service worker + head tags
    useEffect(() => {
        ensureHeadTag('link[rel="manifest"]', () => {
            const l = document.createElement('link');
            l.rel = 'manifest'; l.href = '/manifest.json';
            return l;
        });
        ensureHeadTag('meta[name="theme-color"]', () => {
            const m = document.createElement('meta');
            m.name = 'theme-color'; m.content = '#0F172A';
            return m;
        });
        ensureHeadTag('link[rel="apple-touch-icon"]', () => {
            const l = document.createElement('link');
            l.rel = 'apple-touch-icon'; l.href = '/icons/apple-touch-icon.png';
            return l;
        });

        if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
        const register = () => navigator.serviceWorker.register('/sw.js').catch(() => {});
        if (document.readyState === 'complete') register();
        else window.addEventListener('load', register, { once: true });
    }, []);

    // Decide whether / when to show the card
    useEffect(() => {
        if (isStandalone()) return;
        if (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/secure-admin')) return;

        try {
            const at = localStorage.getItem(STORAGE_KEY);
            if (at && (Date.now() - Number(at)) / 86400000 < COOLDOWN_DAYS) return;
        } catch { /* ignore */ }

        let timer;
        const onBeforeInstall = (e) => {
            e.preventDefault();          // we show our own card instead of the browser's
            setDeferred(e);
            timer = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
        };
        const onInstalled = () => { setVisible(false); setDeferred(null); };

        window.addEventListener('beforeinstallprompt', onBeforeInstall);
        window.addEventListener('appinstalled', onInstalled);

        if (isIOS()) {
            setShowIOSHint(true);
            timer = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
        }

        return () => {
            clearTimeout(timer);
            window.removeEventListener('beforeinstallprompt', onBeforeInstall);
            window.removeEventListener('appinstalled', onInstalled);
        };
    }, []);

    function dismiss() {
        setVisible(false);
        try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch { /* ignore */ }
    }

    async function install() {
        if (!deferred) return;
        deferred.prompt();
        try { await deferred.userChoice; } catch { /* ignore */ }
        setDeferred(null);
        dismiss();
    }

    if (!visible || (!deferred && !showIOSHint)) return null;

    return (
        <div
            role="dialog"
            aria-label="Install the ODUSBABA app"
            className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-40 bg-slate-900 border border-primary-500/30 rounded-xl shadow-2xl p-4"
        >
            <button
                onClick={dismiss}
                className="absolute top-2 right-2 text-slate-500 hover:text-white transition"
                aria-label="Dismiss"
            >
                <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-3 pr-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-sky-500 flex items-center justify-center flex-shrink-0">
                    <Download className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                    <p className="text-white text-sm font-semibold">Get the ODUSBABA app</p>
                    {deferred ? (
                        <>
                            <p className="text-slate-400 text-xs mt-0.5">Jobs, courses and alerts one tap away from your home screen. Free, no app store needed.</p>
                            <button
                                onClick={install}
                                className="mt-3 px-4 py-1.5 bg-gradient-to-r from-primary-500 to-sky-500 text-white rounded-lg text-sm font-medium hover:opacity-90 transition"
                            >
                                Install app
                            </button>
                        </>
                    ) : (
                        <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">
                            On iPhone: tap <Share className="inline w-3.5 h-3.5 -mt-0.5 text-sky-400" /> Share, then
                            <PlusSquare className="inline w-3.5 h-3.5 -mt-0.5 mx-1 text-sky-400" />
                            <span className="text-white">Add to Home Screen</span>.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

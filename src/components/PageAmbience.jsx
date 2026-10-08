// src/components/PageAmbience.jsx
// NEW (2026-10-08) - a faded, slowly drifting backdrop of themed photos
// (job seekers, boardrooms, test halls...) plus a few vector silhouettes,
// shown BEHIND page content. It never captures clicks, never changes
// layout, and is switched on/off (and phased 'public' -> 'all') from
// Admin > Page Backdrops. Images are generated once and reused.
//
// Mount once, inside the Router, above the page content:  <PageAmbience />
// The content wrapper must be position:relative with z-index:1 (App.jsx).

import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

// ---- route -> theme ----------------------------------------------------
// phase 'public' = part of the first rollout; 'all' = shown only when the
// admin switch is set to "Every page".
const EXACT = {
    '/': { theme: 'home', phase: 'public' },
    '/jobs': { theme: 'jobs', phase: 'public' },
    '/pricing': { theme: 'pricing', phase: 'public' },
    '/sign-up': { theme: 'signup', phase: 'public' },
    '/assessments': { theme: 'assessments', phase: 'public' },
    '/courses': { theme: 'courses', phase: 'public' },
};

const PREFIX = [
    ['/verified-employers', 'employers'], ['/post-job', 'employers'], ['/manage-jobs', 'employers'],
    ['/company-profile', 'employers'], ['/employer-verification', 'employers'], ['/hire-va', 'employers'],
    ['/workforce', 'workforce'],
    ['/books', 'books'], ['/articles', 'articles'], ['/blog', 'articles'], ['/newsletter', 'articles'],
    ['/dashboard', 'dashboard'], ['/profile', 'dashboard'], ['/applications', 'dashboard'], ['/skills', 'dashboard'],
    ['/saved-jobs', 'dashboard'], ['/job-alerts', 'dashboard'], ['/my-learning', 'dashboard'], ['/affiliate', 'dashboard'],
    ['/notifications', 'dashboard'], ['/messages', 'dashboard'], ['/settings', 'dashboard'], ['/tester', 'dashboard'],
    ['/sign-in', 'signup'], ['/pricing-explained', 'pricing'],
    ['/products', 'home'], ['/about', 'home'], ['/contact', 'home'], ['/faq', 'home'], ['/hr-tools', 'home'],
    ['/support-tickets', 'dashboard'], ['/report-fraud', 'general'], ['/safety-tips', 'general'], ['/request-refund', 'general'],
];

// Reading / exam / admin screens stay clean on purpose.
const EXCLUDED = [
    /^\/admin/, /^\/assessments\/.+/, /^\/assessment-results/, /^\/learning\//, /^\/courses\/.+/,
    /^\/books\/.+/, /^\/articles\/.+/, /^\/legal\//, /^\/certificate\//, /^\/verify\//,
    /^\/reset-password/, /^\/confirm/, /^\/auth\//, /^\/edit-job\//, /^\/jobs\/.+/,
];

export function resolveAmbience(pathname) {
    const p = (pathname || '/').replace(/\/+$/, '') || '/';
    if (EXCLUDED.some(re => re.test(p))) return null;
    if (EXACT[p]) return EXACT[p];
    const hit = PREFIX.find(([prefix]) => p === prefix || p.startsWith(prefix + '/'));
    return { theme: hit ? hit[1] : 'general', phase: 'all' };
}

// ---- config (fetched once per page load, cached) ----------------------
let configPromise = null;
function loadConfig() {
    if (!configPromise) {
        configPromise = fetch('/api/index?action=ambience-get')
            .then(r => (r.ok ? r.json() : null))
            .then(d => (d && d.success ? d : { scope: 'off', themes: {} }))
            .catch(() => ({ scope: 'off', themes: {} }));
    }
    return configPromise;
}

const SLIDE_MS = 14000;

// ---- vector silhouettes ------------------------------------------------
const STANDING = 'M30 4a10 10 0 1 1 0 20a10 10 0 0 1 0-20zM17 32q13-7 26 0l4 44-6 3-2 79h-8l-1-52-1 52h-8l-2-79-6-3z';

function Silhouettes() {
    return (
        <>
            <svg className="amb-walkers" viewBox="0 0 3600 180" width="3600" height="180" aria-hidden="true">
                {[0, 1200, 2400].map(off => [0, 150, 260, 430, 560, 760, 880, 1040].map((x, i) => (
                    <g key={`${off}-${x}`} transform={`translate(${off + x} ${i % 3 === 0 ? 14 : 22}) scale(${i % 3 === 0 ? 1 : 0.92})`}>
                        <path d={STANDING} />
                        {i % 2 === 0 && <rect x="44" y="82" width="16" height="12" rx="2" />}
                    </g>
                )))}
            </svg>
            <svg className="amb-desk" viewBox="0 0 220 150" aria-hidden="true">
                <circle cx="70" cy="34" r="11" />
                <path d="M54 50q16-8 32 0l8 36h46v8H92l-4 24h-8l-6-26-14-4z" />
                <rect x="120" y="62" width="44" height="28" rx="3" />
                <rect x="30" y="94" width="170" height="7" rx="2" />
                <rect x="44" y="101" width="7" height="44" /><rect x="180" y="101" width="7" height="44" />
            </svg>
        </>
    );
}

// ---- component ---------------------------------------------------------
export default function PageAmbience() {
    const { pathname } = useLocation();
    const [config, setConfig] = useState(null);
    const [idx, setIdx] = useState(0);
    const [seen, setSeen] = useState(1);
    const [reduced, setReduced] = useState(false);

    useEffect(() => {
        let alive = true;
        loadConfig().then(c => { if (alive) setConfig(c); });
        return () => { alive = false; };
    }, []);

    useEffect(() => {
        try {
            const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
            setReduced(mq.matches);
            const h = e => setReduced(e.matches);
            mq.addEventListener?.('change', h);
            return () => mq.removeEventListener?.('change', h);
        } catch { /* ignore */ }
    }, []);

    const route = useMemo(() => resolveAmbience(pathname), [pathname]);
    const allowed = !!(config && route && config.scope !== 'off' && (config.scope === 'all' || route.phase === 'public'));

    let saveData = false;
    try { saveData = !!navigator.connection?.saveData; } catch { /* ignore */ }

    const images = useMemo(() => {
        if (!allowed || saveData) return [];
        return (config.themes?.[route.theme] || config.themes?.general || []).slice(0, 5);
    }, [allowed, saveData, config, route]);

    useEffect(() => { setIdx(0); setSeen(1); }, [route?.theme]);

    useEffect(() => {
        if (images.length < 2 || reduced) return undefined;
        const t = setInterval(() => {
            setIdx(i => {
                const n = (i + 1) % images.length;
                setSeen(s => Math.max(s, n + 1));
                return n;
            });
        }, SLIDE_MS);
        return () => clearInterval(t);
    }, [images.length, reduced]);

    // Make page wrappers transparent only while the backdrop is showing.
    useEffect(() => {
        const root = document.documentElement;
        if (allowed) root.setAttribute('data-ambience', 'on'); else root.removeAttribute('data-ambience');
        return () => root.removeAttribute('data-ambience');
    }, [allowed]);

    if (!allowed) return null;

    return (
        <div className="amb-root" aria-hidden="true">
            <style>{CSS}</style>
            {images.slice(0, seen).map((src, i) => (
                <img
                    key={src}
                    src={src}
                    alt=""
                    decoding="async"
                    draggable="false"
                    className={`amb-img ${i === idx ? 'amb-on' : ''} ${reduced ? 'amb-still' : ''}`}
                />
            ))}
            <Silhouettes />
            <div className="amb-veil" />
        </div>
    );
}

const CSS = `
html[data-ambience="on"] main,
html[data-ambience="on"] main .min-h-screen { background: transparent !important; }
.amb-root { position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; background: #020617; }
.amb-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0;
  filter: grayscale(.35) saturate(.8) blur(1px); transition: opacity 3s ease-in-out; will-change: opacity, transform; }
.amb-img.amb-on { opacity: .17; animation: amb-zoom 30s ease-in-out infinite alternate; }
.amb-img.amb-still { animation: none; }
.amb-veil { position: absolute; inset: 0;
  background: radial-gradient(ellipse at 50% 35%, rgba(2,6,23,.35) 0%, rgba(2,6,23,.8) 100%),
              linear-gradient(to bottom, rgba(2,6,23,.55), rgba(2,6,23,.15) 40%, rgba(2,6,23,.7)); }
.amb-walkers { position: absolute; left: 0; bottom: 0; width: 3600px; height: 180px; max-width: none; fill: #94a3b8; opacity: .07;
  animation: amb-drift 150s linear infinite; }
.amb-desk { position: absolute; right: 4%; bottom: 4%; width: min(26vw, 260px); fill: #94a3b8; opacity: .05; }
@keyframes amb-zoom { from { transform: scale(1.04) translate3d(0,0,0); } to { transform: scale(1.14) translate3d(-1.5%, -1%, 0); } }
@keyframes amb-drift { from { transform: translateX(0); } to { transform: translateX(-1200px); } }
@media (max-width: 640px) { .amb-desk { display: none; } .amb-img.amb-on { opacity: .13; } }
@media (prefers-reduced-motion: reduce) { .amb-img, .amb-walkers { animation: none !important; transition: none !important; } }
`;

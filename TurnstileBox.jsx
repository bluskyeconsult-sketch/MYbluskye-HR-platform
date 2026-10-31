// src/components/TurnstileBox.jsx  (new 2026-10-23)
// Cloudflare Turnstile "human check". It stays INVISIBLE for almost everyone and only shows a box when Cloudflare
// is unsure. If VITE_TURNSTILE_SITE_KEY is not set, it renders nothing and getToken() returns '' immediately, so
// this file is harmless until you create the Cloudflare widget and add the key.
//
// Usage:  const captcha = useRef(null);
//         <TurnstileBox ref={captcha} action="login" />
//         const token = await captcha.current?.getToken();   // before sending the form
//         captcha.current?.reset();                           // after every attempt (a token works only once)
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
let scriptPromise = null;

function loadScript() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (!scriptPromise) {
        scriptPromise = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
            s.async = true;
            s.defer = true;
            s.onload = () => resolve(window.turnstile);
            s.onerror = () => { scriptPromise = null; reject(new Error('Turnstile script blocked')); };
            document.head.appendChild(s);
        });
    }
    return scriptPromise;
}

const TurnstileBox = forwardRef(function TurnstileBox({ action = 'form', className = 'flex justify-center' }, ref) {
    const boxRef = useRef(null);
    const widgetId = useRef(null);
    const tokenRef = useRef('');
    const waiters = useRef([]);

    useEffect(() => {
        if (!SITE_KEY) return undefined;
        let cancelled = false;
        loadScript().then((ts) => {
            if (cancelled || !ts || !boxRef.current) return;
            widgetId.current = ts.render(boxRef.current, {
                sitekey: SITE_KEY,
                action,
                theme: 'dark',
                appearance: 'interaction-only',
                callback: (t) => { tokenRef.current = t; waiters.current.splice(0).forEach((w) => w(t)); },
                'expired-callback': () => { tokenRef.current = ''; },
                'error-callback': () => { tokenRef.current = ''; }
            });
        }).catch(() => { /* blocked by an ad blocker: getToken() will return '' and the server decides */ });
        return () => {
            cancelled = true;
            if (widgetId.current != null && window.turnstile) { try { window.turnstile.remove(widgetId.current); } catch { /* ignore */ } }
            widgetId.current = null;
        };
    }, [action]);

    useImperativeHandle(ref, () => ({
        // Resolves with the token as soon as Cloudflare has one (normally under a second); '' after 10 seconds.
        getToken: () => new Promise((resolve) => {
            if (!SITE_KEY) return resolve('');
            if (tokenRef.current) return resolve(tokenRef.current);
            const timer = setTimeout(() => resolve(''), 10000);
            waiters.current.push((v) => { clearTimeout(timer); resolve(v); });
            return undefined;
        }),
        reset: () => {
            tokenRef.current = '';
            if (widgetId.current != null && window.turnstile) { try { window.turnstile.reset(widgetId.current); } catch { /* ignore */ } }
        }
    }), []);

    if (!SITE_KEY) return null;
    return <div ref={boxRef} className={className} />;
});

export default TurnstileBox;

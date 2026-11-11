// src/lib/adminProof.js  (NEW 2026-11-11)
// Server-checked two-factor proof for the admin area. The API now refuses admin actions unless the request carries
// a signed proof (header x-admin-proof) that the 2FA code was entered in THIS sign-in session.
// Importing this file once wraps fetch so every call to /api/ carries the proof automatically.

const KEY = 'odusbaba_admin_proof';

export function getAdminProof() {
    try { return sessionStorage.getItem(KEY) || ''; } catch (e) { return ''; }
}
export function setAdminProof(proof) {
    try { if (proof) sessionStorage.setItem(KEY, proof); } catch (e) { /* ignore */ }
}
export function clearAdminProof() {
    try { sessionStorage.removeItem(KEY); } catch (e) { /* ignore */ }
}

if (typeof window !== 'undefined' && !window.__adminProofFetchInstalled) {
    window.__adminProofFetchInstalled = true;
    const realFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
        try {
            const url = typeof input === 'string' ? input : (input && input.url) || '';
            const proof = getAdminProof();
            const isOwnApi = url.indexOf('/api/') === 0 || url.indexOf(window.location.origin + '/api/') === 0;
            if (proof && isOwnApi) {
                const headers = new Headers((init && init.headers) || (typeof input !== 'string' && input.headers) || {});
                if (!headers.has('x-admin-proof')) headers.set('x-admin-proof', proof);
                init = { ...(init || {}), headers };
            }
        } catch (e) { /* never break a request */ }
        const res = await realFetch(input, init);
        try {
            if (res.status === 403) {
                res.clone().json().then((d) => {
                    const msg = String((d && d.error) || '');
                    if (msg.indexOf('ADMIN_2FA_REQUIRED') === 0 || msg.indexOf('ADMIN_2FA_SETUP_REQUIRED') === 0) {
                        clearAdminProof();
                        window.dispatchEvent(new CustomEvent('admin-2fa-needed', { detail: msg }));
                    }
                }).catch(() => {});
            }
        } catch (e) { /* ignore */ }
        return res;
    };
}

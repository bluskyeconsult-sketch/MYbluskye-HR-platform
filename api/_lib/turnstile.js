// api/_lib/turnstile.js  (new 2026-10-23)
// Checks a Cloudflare Turnstile token on the server. Used for endpoints that do NOT go through Supabase Auth
// (sign-in, sign-up and password reset are checked by Supabase itself once its CAPTCHA switch is on; a token can
// only be used once, so those must not be checked twice).
//  * TURNSTILE_SECRET_KEY not set  -> returns { ok: true, skipped: true } (nothing changes until you add the key)
//  * Cloudflare unreachable        -> fails OPEN (a Cloudflare outage must not lock your members out)
//  * Cloudflare says "not human"   -> { ok: false }
export async function verifyTurnstile(token, ip, env = process.env, fetchImpl = fetch) {
    const secret = env.TURNSTILE_SECRET_KEY;
    if (!secret) return { ok: true, skipped: true };
    if (!token || typeof token !== 'string' || token.length > 4096) return { ok: false, reason: 'missing' };
    try {
        const body = new URLSearchParams({ secret, response: token });
        if (ip && ip !== 'unknown') body.set('remoteip', ip);
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 5000);
        const r = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body, signal: ctrl.signal });
        clearTimeout(t);
        const j = await r.json();
        return j.success ? { ok: true } : { ok: false, reason: (j['error-codes'] || []).join(',') || 'failed' };
    } catch (err) {
        console.warn('Turnstile check unavailable, failing open:', err.message);
        return { ok: true, unavailable: true };
    }
}

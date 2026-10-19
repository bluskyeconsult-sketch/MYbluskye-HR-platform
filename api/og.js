// api/og.js
//
// NEW (2026-10-19): serves the share picture for a link, at /share-image/:type/:key
// (vercel.json rewrites that address here). A separate function on purpose, so the image tools
// never touch api/index.js. If anything goes wrong it redirects to the static default card
// (/og-default.jpg), so a share never ends up with a broken or missing image.

import { createClient } from '@supabase/supabase-js';
import { getShareItem, isValidKey, SITE_DEFAULT_BASE } from './_lib/shareData.js';
import { renderShareCard, loadImage } from './_lib/shareCard.js';

const TYPES = ['article', 'job', 'course', 'book', 'assessment', 'page'];

function siteBase() {
    return String(process.env.SITE_URL || SITE_DEFAULT_BASE).replace(/\/+$/, '');
}

let client = null;
function db() {
    if (!client) {
        client = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
        );
    }
    return client;
}

function fallback(res) {
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
    res.statusCode = 302;
    res.setHeader('Location', `${siteBase()}/og-default.jpg`);
    return res.end();
}

export default async function handler(req, res) {
    try {
        if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; return res.end(); }

        const type = String(req.query?.type || '');
        let key = String(req.query?.key || '');
        try { key = decodeURIComponent(key); } catch { /* keep as is */ }
        key = key.replace(/\.(jpe?g|png)$/i, '');
        if (!TYPES.includes(type) || !isValidKey(type, key)) return fallback(res);

        const base = siteBase();
        const item = await getShareItem(db(), type, key, base);
        if (!item) return fallback(res);

        const imageBuffer = await loadImage(item.imageUrl);
        const { buffer } = await renderShareCard({ item, imageBuffer });

        res.statusCode = 200;
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Content-Length', String(buffer.length));
        // The address carries ?v=<last updated>, so a long cache is safe: an edited item gets a new address.
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=604800, stale-while-revalidate=86400');
        return res.end(req.method === 'HEAD' ? undefined : buffer);
    } catch (err) {
        console.error('share image error:', err && err.message);
        return fallback(res);
    }
}

// api/_lib/shareCard.js
//
// NEW (2026-10-19): builds the 1200x630 picture shown when a link is shared.
//   - Content with its own image (article, course, book): that image fills the card (a blurred
//     backdrop is used for tall images such as book covers), with the BluSkye logo on a white badge
//     and a small type label. The logo is added to the image, never used on its own.
//   - Content without an image (jobs, assessments, pages) or whose image cannot be loaded: a branded
//     card with the title written on it, plus the logo.
// Text is drawn from vector outlines (ogFont.js), so it does not depend on fonts installed on the server.
// Output is a JPEG kept under about 290 KB because WhatsApp drops larger preview images.

import sharp from 'sharp';
import { FONT } from './ogFont.js';
import { LOGO_B64, LOGO_W, LOGO_H } from './ogAssets.js';
import { TYPE_LABEL } from './shareData.js';

const W = 1200;
const H = 630;
const NAVY = '#0B3C5D';
const TEAL = '#0f766e';
const MINT = '#a7f3d0';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// ---------- text as vector paths ----------

function glyphOf(ch) { return FONT.glyphs[ch] || null; }

function measure(text, size) {
    const k = size / FONT.upm;
    let w = 0;
    for (const ch of text) { const g = glyphOf(ch); w += g ? g[0] * k : 0; }
    return w;
}

function clean(text) {
    return String(text || '').normalize('NFC').replace(/\s+/g, ' ').trim()
        .split('').filter(ch => glyphOf(ch)).join('');
}

function wrap(text, size, maxWidth, maxLines) {
    const words = clean(text).split(' ').filter(Boolean);
    const lines = [];
    let line = '';
    for (const word of words) {
        const trial = line ? `${line} ${word}` : word;
        if (measure(trial, size) <= maxWidth || !line) { line = trial; }
        else { lines.push(line); line = word; }
    }
    if (line) lines.push(line);
    if (lines.length > maxLines) {
        const kept = lines.slice(0, maxLines);
        let last = kept[maxLines - 1];
        while (last.length > 1 && measure(`${last}…`, size) > maxWidth) last = last.slice(0, -1).trimEnd();
        kept[maxLines - 1] = `${last}…`;
        return { lines: kept, truncated: true };
    }
    return { lines, truncated: false };
}

function textPath(text, x, baselineY, size, fill, opacity = 1) {
    const k = size / FONT.upm;
    let cx = x;
    const parts = [];
    for (const ch of text) {
        const g = glyphOf(ch);
        if (!g) continue;
        if (g[1]) parts.push(`<g transform="translate(${cx.toFixed(1)} ${baselineY}) scale(${k.toFixed(5)} ${(-k).toFixed(5)})"><path d="${g[1]}"/></g>`);
        cx += g[0] * k;
    }
    return `<g fill="${fill}" fill-opacity="${opacity}">${parts.join('')}</g>`;
}

// ---------- image loading ----------

function isSafeHttpUrl(u) {
    try {
        const url = new URL(u);
        if (url.protocol !== 'https:') return false;
        const h = url.hostname.toLowerCase();
        if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return false;
        if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return false;
        if (h.includes(':')) return false;
        return true;
    } catch { return false; }
}

async function loadImage(url) {
    if (!url) return null;
    try {
        if (/^data:image\//i.test(url)) {
            const m = url.match(/^data:image\/[a-z0-9.+-]+;base64,(.+)$/i);
            if (!m) return null;
            const buf = Buffer.from(m[1], 'base64');
            return buf.length && buf.length <= MAX_IMAGE_BYTES ? buf : null;
        }
        if (!isSafeHttpUrl(url)) return null;
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 6000);
        try {
            const r = await fetch(url, { signal: ctrl.signal, redirect: 'follow' });
            if (!r.ok) return null;
            const len = Number(r.headers.get('content-length') || 0);
            if (len && len > MAX_IMAGE_BYTES) return null;
            const buf = Buffer.from(await r.arrayBuffer());
            return buf.length && buf.length <= MAX_IMAGE_BYTES ? buf : null;
        } finally { clearTimeout(timer); }
    } catch { return null; }
}

// ---------- pieces ----------

async function logoBadge() {
    const padX = 22, padY = 16;
    const lw = 250;
    const lh = Math.round(lw * LOGO_H / LOGO_W);
    const bw = lw + padX * 2;
    const bh = lh + padY * 2;
    const logo = await sharp(Buffer.from(LOGO_B64, 'base64')).resize(lw, lh).png().toBuffer();
    const badge = await sharp({ create: { width: bw, height: bh, channels: 4, background: '#ffffff' } })
        .composite([
            { input: logo, left: padX, top: padY },
            { input: Buffer.from(`<svg width="${bw}" height="${bh}"><rect width="${bw}" height="${bh}" rx="18" ry="18" fill="#fff"/></svg>`), blend: 'dest-in' }
        ])
        .png().toBuffer();
    return { input: badge, width: bw, height: bh };
}

function pill(label, x, y) {
    const size = 22;
    const text = clean(label).toUpperCase();
    const tw = measure(text, size) + text.length * 2; // small letter spacing allowance
    const w = Math.round(tw + 44), h = 46;
    let cx = x + 22;
    const k = size / FONT.upm;
    const glyphs = [];
    for (const ch of text) {
        const g = glyphOf(ch); if (!g) continue;
        if (g[1]) glyphs.push(`<g transform="translate(${cx.toFixed(1)} ${y + 31}) scale(${k.toFixed(5)} ${(-k).toFixed(5)})"><path d="${g[1]}"/></g>`);
        cx += g[0] * k + 2;
    }
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="23" fill="#ffffff" fill-opacity="0.92"/><g fill="${NAVY}">${glyphs.join('')}</g>`;
}

async function photoBackground(buf) {
    const meta = await sharp(buf, { failOn: 'none' }).metadata();
    const ratio = (meta.width || 1) / (meta.height || 1);
    if (ratio >= 1.3 && ratio <= 2.6) {
        return sharp(buf, { failOn: 'none' }).rotate().resize(W, H, { fit: 'cover', position: 'centre' }).removeAlpha().toBuffer();
    }
    // Tall or square images (book covers): blurred backdrop plus the whole image, uncropped.
    const backdrop = await sharp(buf, { failOn: 'none' }).rotate().resize(W, H, { fit: 'cover' }).blur(28).modulate({ brightness: 0.55 }).removeAlpha().toBuffer();
    const fg = await sharp(buf, { failOn: 'none' }).rotate().resize({ height: 560, width: 760, fit: 'inside' }).toBuffer();
    const fgMeta = await sharp(fg).metadata();
    return sharp(backdrop).composite([{ input: fg, left: Math.round((W - fgMeta.width) / 2), top: Math.round((H - fgMeta.height) / 2) }]).removeAlpha().toBuffer();
}

function brandBackgroundSvg() {
    return Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${NAVY}"/><stop offset="1" stop-color="${TEAL}"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#g)"/>
<circle cx="1080" cy="80" r="260" fill="#ffffff" fill-opacity="0.05"/>
<circle cx="1160" cy="520" r="180" fill="#ffffff" fill-opacity="0.05"/>
<circle cx="-40" cy="620" r="220" fill="#ffffff" fill-opacity="0.04"/>
</svg>`);
}

function titleBlock(title, subtitle) {
    // Pick the largest size where the whole title (and subtitle) fits above the logo badge.
    const startY = 196;
    const limitY = 430;
    const hasSub = !!clean(subtitle);
    let chosen = null;
    for (const size of [74, 64, 56, 48, 42]) {
        const w = wrap(title, size, 1056, 3);
        const lineH = Math.round(size * 1.16);
        // Baseline of the last thing drawn: the subtitle (one line below the title) or the last title line.
        const bottom = hasSub ? startY + w.lines.length * lineH + 14 : startY + (w.lines.length - 1) * lineH;
        if (!w.truncated && bottom <= limitY) { chosen = { size, lines: w.lines }; break; }
    }
    if (!chosen) { const w = wrap(title, 42, 1056, 3); chosen = { size: 42, lines: w.lines }; }
    const lineH = Math.round(chosen.size * 1.16);
    let y = startY;
    const out = [];
    for (const line of chosen.lines) { out.push(textPath(line, 72, y, chosen.size, '#ffffff')); y += lineH; }
    const sub = clean(subtitle);
    if (sub) {
        const { lines } = wrap(sub, 34, 1056, 1);
        out.push(textPath(lines[0] || '', 72, y + 14, 34, MINT));
    }
    return out.join('');
}

// ---------- main ----------

export async function renderShareCard({ item, imageBuffer }) {
    const label = TYPE_LABEL[item.type] || 'ODUSBABA';
    const badge = await logoBadge();
    const badgeLeft = 40;
    const badgeTop = H - 40 - badge.height;

    let base;
    let usedPhoto = false;
    if (imageBuffer) {
        try { base = await photoBackground(imageBuffer); usedPhoto = true; } catch { base = null; }
    }

    const layers = [];
    if (usedPhoto) {
        layers.push({
            input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.6"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#s)"/>${pill(label, 40, 36)}</svg>`)
        });
        layers.push({ input: badge.input, left: badgeLeft, top: badgeTop });
    } else {
        base = await sharp(brandBackgroundSvg()).png().toBuffer();
        layers.push({
            input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
${pill(label, 72, 64)}${titleBlock(item.title || 'ODUSBABA', item.subtitle)}
${textPath('bluskyeconsult.com', 1128 - measure('bluskyeconsult.com', 28), H - 56, 28, '#ffffff', 0.85)}
</svg>`)
        });
        layers.push({ input: badge.input, left: 72, top: badgeTop });
    }

    let q = 82;
    let out = await sharp(base).composite(layers).jpeg({ quality: q, mozjpeg: true }).toBuffer();
    while (out.length > 290 * 1024 && q > 40) {
        q -= 10;
        out = await sharp(base).composite(layers).jpeg({ quality: q, mozjpeg: true }).toBuffer();
    }
    return { buffer: out, usedPhoto };
}

export { loadImage };

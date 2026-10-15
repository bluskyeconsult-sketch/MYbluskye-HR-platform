// src/services/videoFinishEngine.js
//
// NEW (2026-10-15): "Finish a video" engine for the free video tab.
// Takes an already-made video, an optional voiceover/audio file and a script
// (or an SRT file), then plays them together on a <canvas> with animated
// captions burned in, and records the result with the browser's MediaRecorder.
// Nothing is uploaded anywhere and nothing costs money.
//
// How the blend works (the mix recommended for the BluSkye videos):
//   * the voiceover sits at full volume;
//   * the video's own sound (its music) sits underneath at about a third;
//   * both fade out together over the last 0.7 s.
//
// Sync: the voiceover is scheduled on the audio clock at an exact offset and
// the captions are driven by the same clock, so captions and voice cannot drift
// apart. The recording runs in real time (a 34 s video takes about 34 s).

import { pickRecorderMime } from './slideVideoEngine';

export const CAPTION_STYLES = [
    { value: 'pill', label: 'Highlight pill (spoken word sits on a colour pill)' },
    { value: 'karaoke', label: 'Karaoke (spoken word lights up)' },
    { value: 'single', label: 'One word at a time (big, punchy, reels style)' },
    { value: 'pop', label: 'Word pop (words bounce in)' },
    { value: 'slideup', label: 'Rise (words glide up one by one)' },
    { value: 'neon', label: 'Neon glow (best on dark footage)' },
    { value: 'fade', label: 'Fade up (whole line glides in)' },
    { value: 'type', label: 'Typewriter' }
];
export const ACCENT_PRESETS = [
    { name: 'Sky', value: '#0EA5E9' },
    { name: 'Lime', value: '#A3E635' },
    { name: 'Amber', value: '#FBBF24' },
    { name: 'Pink', value: '#F472B6' },
    { name: 'Emerald', value: '#10B981' },
    { name: 'Coral', value: '#FB7185' }
];
export const CAPTION_POSITIONS = [
    { value: 'bottom', label: 'Bottom' },
    { value: 'middle', label: 'Middle' },
    { value: 'top', label: 'Top' }
];
export const CAPTION_SIZES = [
    { value: 'small', label: 'Small', k: 0.85 },
    { value: 'medium', label: 'Medium', k: 1 },
    { value: 'large', label: 'Large', k: 1.25 }
];

const FONT = 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
const easeOutBack = (x) => {
    const c1 = 1.70158, c3 = c1 + 1, p = clamp01(x) - 1;
    return 1 + c3 * p * p * p + c1 * p * p;
};

// ---------------------------------------------------------------
// caption parsing
// ---------------------------------------------------------------

// Spoken spellings in the audio scripts are turned back into the written brand
// ("Blue Sky Consult dot com" is said aloud but shown as bluskyeconsult.com).
export function fixBrandSpelling(text) {
    return String(text || '')
        .replace(/Blue\s*Sky\s*Consult\s*dot\s*com/gi, 'bluskyeconsult.com')
        .replace(/Blue\s*Sky(?=\s+(?:Integrated|Consult)|[.,!?]|\s*$)/gi, 'BluSkye');
}

function cleanLine(raw) {
    return String(raw || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\([^)]*\)/g, ' ')
        .replace(/\s*\bTIGHT\b.*$/i, '')
        .replace(/[*_`#>]+/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

const wordCount = (s) => (String(s).trim().match(/\S+/g) || []).length;

function parseClock(h, m, s) {
    return (h || 0) * 3600 + m * 60 + parseFloat(String(s).replace(',', '.'));
}

function parseSrt(text) {
    const cues = [];
    String(text).replace(/\r/g, '').split(/\n{2,}/).forEach((block) => {
        const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
        const ti = lines.findIndex((l) => l.includes('-->'));
        if (ti < 0) return;
        const m = lines[ti].match(/(?:(\d+):)?(\d{1,2}):(\d{2}[.,]\d{1,3})\s*-->\s*(?:(\d+):)?(\d{1,2}):(\d{2}[.,]\d{1,3})/);
        if (!m) return;
        const body = cleanLine(lines.slice(ti + 1).join(' '));
        if (!body) return;
        cues.push({
            start: parseClock(m[1], +m[2], m[3]),
            end: parseClock(m[4], +m[5], m[6]),
            text: body,
            exact: true
        });
    });
    return cues;
}

// A timed line is "0:04.3 Some words" or a markdown table row "| 0:04.3 | on screen | words |"
// (the last cell of a table row is what is said).
const TIMED_RE = /^\s*\|?\s*\[?(\d{1,2}):(\d{2}(?:[.,]\d{1,3})?)\]?\s*\|?\s*(.*)$/;

export function parseCaptions(raw, { voiceDuration = 0, offset = 0, videoDuration = 0, fixBrand = true } = {}) {
    const text = String(raw || '').replace(/\r/g, '');
    if (!text.trim()) return [];
    const fix = (s) => (fixBrand ? fixBrandSpelling(s) : s);

    if (text.includes('-->')) {
        return parseSrt(text).map((c) => ({ ...c, text: fix(c.text) }));
    }

    const lines = text.split('\n');
    const timed = [];
    lines.forEach((l) => {
        const m = l.match(TIMED_RE);
        if (!m) return;
        let rest = m[3];
        if (rest.includes('|')) {
            const cells = rest.split('|').map((c) => c.trim()).filter(Boolean);
            rest = cells.length ? cells[cells.length - 1] : '';
        }
        rest = cleanLine(rest);
        if (rest) timed.push({ start: parseClock(0, +m[1], m[2]), text: fix(rest) });
    });
    if (timed.length >= 2) {
        return timed.sort((a, b) => a.start - b.start);
    }

    // Plain script: split into sentences, then spread them over the voiceover.
    const sentences = [];
    lines.forEach((l) => {
        const t = l.trim();
        if (!t || /^(#|---|>|[-*•]\s)/.test(t)) return;
        const c = cleanLine(t);
        if (!c) return;
        c.split(/(?<=[.!?])\s+/).forEach((s) => { if (s.trim()) sentences.push(s.trim()); });
    });
    const units = [];
    let buf = '';
    sentences.forEach((s) => {
        if (buf && wordCount(buf) < 3 && wordCount(buf) + wordCount(s) <= 8) buf += ' ' + s;
        else { if (buf) units.push(buf); buf = s; }
    });
    if (buf) units.push(buf);
    if (!units.length) return [];

    const span = voiceDuration > 0 ? voiceDuration : Math.max(3, (videoDuration || units.length * 3) - offset);
    const weights = units.map((u) => wordCount(u) + 1);
    const sum = weights.reduce((a, b) => a + b, 0);
    let t = Math.max(0, offset);
    return units.map((u, i) => {
        const start = t;
        t += (weights[i] / sum) * span;
        return { start, text: fix(u) };
    });
}

// Gives every cue an end: just before the next cue starts (or after a sensible reading time).
export function withEnds(cues, total) {
    const list = [...cues]
        .filter((c) => c && String(c.text || '').trim())
        .sort((a, b) => a.start - b.start);
    return list.map((c, i) => {
        const next = list[i + 1];
        const readTime = Math.max(2.2, wordCount(c.text) * 0.5);
        let end;
        if (c.exact && c.end != null) {
            // Transcribed or SRT captions know when they end: leave a short linger, never run into the next one.
            end = c.end + 0.25;
            if (next) end = Math.min(end, next.start - 0.04);
        } else {
            end = next ? next.start - 0.04 : c.start + readTime;
        }
        if (!next && total) end = Math.min(end, total);
        end = Math.max(c.start + 0.3, Math.min(end, c.start + 9));
        return { ...c, end };
    });
}

function srtTime(sec) {
    const s = Math.max(0, sec);
    const ms = Math.round((s % 1) * 1000);
    const whole = Math.floor(s) + (ms === 1000 ? 1 : 0);
    const pad = (n, l = 2) => String(n).padStart(l, '0');
    return `${pad(Math.floor(whole / 3600))}:${pad(Math.floor((whole % 3600) / 60))}:${pad(whole % 60)},${pad(ms === 1000 ? 0 : ms, 3)}`;
}

export function cuesToSrt(cues, total, shift = 0) {
    return withEnds(cues, total).map((c, i) =>
        `${i + 1}\n${srtTime(c.start + shift)} --> ${srtTime(c.end + shift)}\n${c.text}\n`
    ).join('\n');
}

// ---------------------------------------------------------------
// caption drawing
// ---------------------------------------------------------------

const layoutCache = new Map();

function layoutCue(ctx, text, W, H, sizeK) {
    const key = `${text}|${W}|${H}|${sizeK}`; // text already upper-cased by the caller when needed
    if (layoutCache.has(key)) return layoutCache.get(key);
    const vertical = H > W;
    const maxW = W * (vertical ? 0.86 : 0.8);
    let size = Math.min(W, H) * 0.066 * sizeK;
    const words = text.split(/\s+/).filter(Boolean);
    let lines, spaceW;
    for (let guard = 0; guard < 14; guard++) {
        ctx.font = `800 ${size}px ${FONT}`;
        spaceW = ctx.measureText(' ').width + size * 0.16; // extra room so the outline never closes the gap between words
        lines = [];
        let cur = [], curW = 0;
        words.forEach((w) => {
            const ww = ctx.measureText(w).width;
            if (cur.length && curW + spaceW + ww > maxW) { lines.push({ words: cur, w: curW }); cur = []; curW = 0; }
            curW += (cur.length ? spaceW : 0) + ww;
            cur.push({ text: w, w: ww });
        });
        if (cur.length) lines.push({ words: cur, w: curW });
        if (lines.length <= 3 && lines.every((l) => l.w <= maxW * 1.02)) break;
        size *= 0.92;
    }
    const lh = size * 1.22;
    const out = { size, lines, lh, spaceW, blockH: lines.length * lh, blockW: Math.max(...lines.map((l) => l.w)) };
    if (layoutCache.size > 200) layoutCache.clear();
    layoutCache.set(key, out);
    return out;
}

export function drawCaptions(ctx, W, H, cues, t, opts) {
    const cue = cues.find((c) => t >= c.start && t < c.end);
    if (!cue) return;
    const sizeK = (CAPTION_SIZES.find((s) => s.value === opts.captionSize) || CAPTION_SIZES[1]).k;
    const shownText = opts.captionUpper ? cue.text.toUpperCase() : cue.text;
    const L = layoutCue(ctx, shownText, W, H, sizeK);
    const dur = cue.end - cue.start;
    const local = t - cue.start;
    const alpha = clamp01(local / 0.12) * clamp01((cue.end - t) / 0.15);
    if (alpha <= 0) return;

    const vertical = H > W;
    let centerY;
    if (opts.captionPosition === 'top') centerY = H * (vertical ? 0.2 : 0.14) + L.blockH / 2;
    else if (opts.captionPosition === 'middle') centerY = H * 0.5;
    else centerY = H * (vertical ? 0.78 : 0.88) - L.blockH / 2;
    const style = opts.captionStyle || 'pill';
    const accent = opts.accent || '#0EA5E9';
    const slide = style === 'fade' ? (1 - easeOut(local / 0.35)) * H * 0.03 : 0;

    const all = L.lines.flatMap((l) => l.words);
    const totalChars = all.reduce((a, w) => a + w.text.length + 2, 0);
    let run = 0;
    all.forEach((w) => {
        w.ws = (run / totalChars) * dur * 0.88;
        run += w.text.length + 2;
        w.we = (run / totalChars) * dur * 0.88;
    });
    // Real word times (from a transcript) beat the estimate, as long as the words still line up.
    if (Array.isArray(cue.wt) && cue.wt.length === all.length) {
        all.forEach((w, i) => {
            w.ws = cue.wt[i][0];
            w.we = i < all.length - 1 ? cue.wt[i + 1][0] : Math.max(cue.wt[i][1], dur);
        });
    }
    const visibleChars = style === 'type' ? Math.floor(clamp01(local / (dur * 0.78)) * all.reduce((a, w) => a + w.text.length, 0)) : 0;
    const lastShown = style === 'pop' ? all.reduce((acc, w, i) => (local >= w.ws ? i : acc), -1) : -1;

    if (style === 'single') {
        // one big word at a time, centred where the caption block would sit
        let a = 0;
        all.forEach((w, i) => { if (local >= w.ws) a = i; });
        const w = all[a];
        let size = L.size * 1.75;
        ctx.save();
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.font = `900 ${size}px ${FONT}`;
        const maxW = W * 0.88;
        let mw = ctx.measureText(w.text).width;
        if (mw > maxW) { size *= maxW / mw; ctx.font = `900 ${size}px ${FONT}`; mw = ctx.measureText(w.text).width; }
        const p = (local - w.ws) / 0.2;
        const sc = 0.6 + 0.4 * easeOutBack(p);
        ctx.globalAlpha = alpha * clamp01(p * 4 + 0.2);
        ctx.translate(W / 2, centerY + slide);
        ctx.scale(sc, sc);
        ctx.textAlign = 'center';
        ctx.lineWidth = size * 0.17;
        ctx.strokeStyle = 'rgba(2,6,23,0.95)';
        ctx.strokeText(w.text, 0, 0);
        ctx.fillStyle = a % 2 === 0 ? '#FFFFFF' : accent;
        ctx.fillText(w.text, 0, 0);
        ctx.restore();
        return;
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.lineJoin = 'round';
    ctx.font = `800 ${L.size}px ${FONT}`;

    if (opts.captionBox) {
        const padX = L.size * 0.55, padY = L.size * 0.4;
        const bx = W / 2 - L.blockW / 2 - padX, by = centerY - L.blockH / 2 - padY + slide;
        const bw = L.blockW + padX * 2, bh = L.blockH + padY * 2, r = L.size * 0.4;
        ctx.fillStyle = 'rgba(2,6,23,0.72)';
        ctx.beginPath();
        ctx.moveTo(bx + r, by);
        ctx.arcTo(bx + bw, by, bx + bw, by + bh, r);
        ctx.arcTo(bx + bw, by + bh, bx, by + bh, r);
        ctx.arcTo(bx, by + bh, bx, by, r);
        ctx.arcTo(bx, by, bx + bw, by, r);
        ctx.closePath();
        ctx.fill();
    }

    let idx = 0, charsLeft = visibleChars;
    L.lines.forEach((line, li) => {
        let x = W / 2 - line.w / 2;
        const y = centerY - L.blockH / 2 + L.lh * (li + 0.5) + slide;
        line.words.forEach((w) => {
            const i = idx++;
            let shown = w.text, fill = '#FFFFFF', scale = 1, wa = 1, dy = 0, pill = false, glow = 0;
            const active = local >= w.ws && local < w.we;
            if (style === 'karaoke') {
                if (active) { fill = accent; scale = 1.07; }
            } else if (style === 'pill') {
                if (active) { pill = true; fill = '#0B1220'; scale = 0.9 + 0.1 * easeOutBack((local - w.ws) / 0.14); }
            } else if (style === 'pop') {
                if (local < w.ws) wa = 0;
                else {
                    const p = (local - w.ws) / 0.24;
                    scale = 0.55 + 0.45 * easeOutBack(p);
                    wa = clamp01(p * 3);
                    if (i === lastShown) fill = accent;
                }
            } else if (style === 'slideup') {
                if (local < w.ws) wa = 0;
                else {
                    const p = (local - w.ws) / 0.3;
                    dy = (1 - easeOut(p)) * L.size * 0.7;
                    wa = clamp01(p * 3.5);
                }
            } else if (style === 'neon') {
                glow = active ? L.size * 0.9 : L.size * 0.35;
                if (active) fill = '#FFFFFF';
            } else if (style === 'type') {
                const n = Math.max(0, Math.min(w.text.length, charsLeft));
                charsLeft -= w.text.length;
                shown = w.text.slice(0, n);
            }
            if (wa > 0 && shown) {
                ctx.save();
                ctx.globalAlpha = alpha * wa;
                ctx.translate(x + w.w / 2, y + dy);
                ctx.scale(scale, scale);
                if (pill) {
                    const px = L.size * 0.14, ph = L.size * 1.08, r = L.size * 0.3;
                    const bx = -w.w / 2 - px, by = -ph / 2, bw = w.w + px * 2;
                    ctx.fillStyle = accent;
                    ctx.beginPath();
                    ctx.moveTo(bx + r, by);
                    ctx.arcTo(bx + bw, by, bx + bw, by + ph, r);
                    ctx.arcTo(bx + bw, by + ph, bx, by + ph, r);
                    ctx.arcTo(bx, by + ph, bx, by, r);
                    ctx.arcTo(bx, by, bx + bw, by, r);
                    ctx.closePath();
                    ctx.fill();
                } else if (!opts.captionBox) {
                    ctx.lineWidth = style === 'neon' ? L.size * 0.08 : L.size * 0.16;
                    ctx.strokeStyle = 'rgba(2,6,23,0.92)';
                    ctx.strokeText(shown, -w.w / 2, 0);
                }
                if (glow) { ctx.shadowColor = accent; ctx.shadowBlur = glow; }
                ctx.fillStyle = fill;
                ctx.fillText(shown, -w.w / 2, 0);
                ctx.restore();
            }
            x += w.w + L.spaceW;
        });
    });
    ctx.restore();
}


// ---------------------------------------------------------------
// transcription: audio in the browser -> short WAV pieces -> server -> timed captions
// ---------------------------------------------------------------

const SR = 16000;          // 16 kHz mono is all speech recognition needs
const FRAME = 0.02;        // seconds per loudness frame (20 ms)
const CHUNK_SECONDS = 55;  // each request stays far below the 4.5 MB request limit

// Decodes any audio (or the sound of a video) and resamples it to 16 kHz mono.
export async function prepareAudio(file) {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ac = new AC();
    let decoded;
    try {
        decoded = await ac.decodeAudioData(await file.arrayBuffer());
    } catch (e) {
        throw new Error('This browser could not read the sound in that file.');
    } finally {
        try { await ac.close(); } catch (e) { /* ignore */ }
    }
    const frames = Math.max(1, Math.ceil(decoded.duration * SR));
    const off = new OfflineAudioContext(1, frames, SR);
    const src = off.createBufferSource();
    src.buffer = decoded;
    src.connect(off.destination);
    src.start();
    const rendered = await off.startRendering();
    return { samples: rendered.getChannelData(0), duration: decoded.duration };
}

// Loudness (RMS) of every 20 ms frame.
export function loudnessEnvelope(samples) {
    const n = Math.floor(samples.length / (SR * FRAME));
    const step = SR * FRAME;
    const env = new Float32Array(n);
    for (let f = 0; f < n; f++) {
        let sum = 0;
        for (let i = f * step; i < (f + 1) * step; i++) sum += samples[i] * samples[i];
        env[f] = Math.sqrt(sum / step);
    }
    return env;
}

// Cut points: about every 55 s, always in the quietest moment of the last few seconds
// so a word is never sliced in half.
export function planChunks(env, totalSamples) {
    const cuts = [0];
    const fps = 1 / FRAME;
    let start = 0;
    while (totalSamples - start > (CHUNK_SECONDS + 4) * SR) {
        const target = start + CHUNK_SECONDS * SR;
        const f0 = Math.floor((target - 6 * SR) / (SR * FRAME));
        const f1 = Math.floor(target / (SR * FRAME));
        let best = f1, bestVal = Infinity;
        for (let f = Math.max(0, f0); f < Math.min(env.length - 8, f1); f++) {
            let v = 0;
            for (let k = 0; k < 8; k++) v += env[f + k];          // 160 ms window
            if (v < bestVal) { bestVal = v; best = f + 4; }
        }
        start = Math.round(best * SR * FRAME);
        cuts.push(start);
    }
    cuts.push(totalSamples);
    return cuts.slice(0, -1).map((c, i) => ({ from: c, to: cuts[i + 1] }));
}

function wavBase64(samples, from, to) {
    const n = to - from;
    const buf = new ArrayBuffer(44 + n * 2);
    const v = new DataView(buf);
    const w = (o, str) => { for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, SR, true); v.setUint32(28, SR * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    w(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) {
        const x = Math.max(-1, Math.min(1, samples[from + i]));
        v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true);
    }
    const bytes = new Uint8Array(buf);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
}

// Sends each piece to the server and joins the answers. Returns the text of every piece
// with its time span, plus the loudness envelope used later to time the words.
export async function transcribeAudio({ file, precise = false, language = 'en', accessToken, onStatus }) {
    if (onStatus) onStatus('Reading the audio...');
    const { samples, duration } = await prepareAudio(file);
    if (duration > 600) throw new Error('That audio is longer than 10 minutes. Please use a shorter file.');
    const env = loudnessEnvelope(samples);
    const plan = planChunks(env, samples.length);
    const chunks = [];
    let cost = 0;
    for (let i = 0; i < plan.length; i++) {
        const { from, to } = plan[i];
        if (onStatus) onStatus(`Transcribing part ${i + 1} of ${plan.length}...`);
        const response = await fetch('/api/index?action=transcribe-audio-captions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
            },
            body: JSON.stringify({ audioBase64: wavBase64(samples, from, to), precise, language, seconds: (to - from) / SR })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) throw new Error(data.error || 'Transcription failed. Please try again.');
        cost += data.estimatedCost || 0;
        const start = from / SR;
        chunks.push({
            start,
            end: to / SR,
            text: data.text || '',
            words: (data.words || []).map((w) => ({ w: w.w, s: w.s + start, e: w.e + start }))
        });
    }
    return { chunks, env, duration, cost };
}

// ---- timing words against the real pauses in the audio -----------------

function speechMask(env) {
    const sorted = Float32Array.from(env).sort();
    const p90 = sorted[Math.floor(sorted.length * 0.9)] || 0.01;
    const thr = Math.max(0.003, p90 * 0.1);
    const voiced = new Uint8Array(env.length);
    for (let i = 0; i < env.length; i++) voiced[i] = env[i] > thr ? 1 : 0;
    // close tiny gaps (between syllables) of up to 120 ms
    let i = 0;
    while (i < voiced.length) {
        if (!voiced[i]) {
            let j = i;
            while (j < voiced.length && !voiced[j]) j++;
            if (i > 0 && j < voiced.length && j - i <= 6) for (let k = i; k < j; k++) voiced[k] = 1;
            i = j;
        } else i++;
    }
    return voiced;
}

const letters = (t) => (String(t).replace(/[^\p{L}\p{N}]/gu, '').length || 1);
const endsPunct = (t) => /[.,;:!?…]["')\]]*$/.test(t);

// Spreads the words of one piece over the speech in [c0, c1], snapping phrase breaks to real pauses.
export function alignWords(tokens, voiced, c0, c1) {
    const n = tokens.length;
    if (!n) return [];
    const f0 = Math.max(0, Math.floor(c0 / FRAME));
    const f1 = Math.min(voiced.length, Math.ceil(c1 / FRAME));
    let a = f0; while (a < f1 && !voiced[a]) a++;
    let b = f1; while (b > a && !voiced[b - 1]) b--;
    if (b - a < 4) {
        const span = Math.max(0.5, c1 - c0);
        const wts = tokens.map((t) => letters(t) + 1.5), tot = wts.reduce((x, y) => x + y, 0);
        let t = c0;
        return tokens.map((w, i) => { const s = t; t += (wts[i] / tot) * span; return { w, s, e: t }; });
    }
    const X0 = a * FRAME, X1 = b * FRAME;

    // pauses inside the speech (200 ms or longer)
    const pauses = [];
    let i = a;
    while (i < b) {
        if (!voiced[i]) {
            let j = i; while (j < b && !voiced[j]) j++;
            if (j - i >= 10) pauses.push({ s: i * FRAME, e: j * FRAME });
            i = j;
        } else i++;
    }
    // speech axis = real time with the pauses squeezed out
    const toSp = (t) => { let x = t; for (const p of pauses) { if (t >= p.e) x -= (p.e - p.s); else if (t > p.s) x -= (t - p.s); } return x; };
    const fromSp = (x, after) => {
        let t = x;
        for (const p of pauses) {
            const q = toSp(p.s);
            if (x > q || (after && x >= q)) t += (p.e - p.s);
        }
        return t;
    };
    const S0 = toSp(X0), S1 = toSp(X1);

    const wts = tokens.map((t) => letters(t) + 1.5);
    const tot = wts.reduce((x, y) => x + y, 0);
    const cum = [0]; wts.forEach((w) => cum.push(cum[cum.length - 1] + w));
    const ideal = (k) => S0 + (cum[k] / tot) * (S1 - S0);

    // snap phrase boundaries to pauses (prefer boundaries that follow punctuation)
    const anchors = new Map(); // boundary index k (before word k) -> pause
    let lastK = 0;
    pauses.forEach((p) => {
        const q = toSp(p.s);
        let bestK = -1, bestD = Infinity;
        for (let k = lastK + 1; k < n; k++) {
            const d = Math.abs(ideal(k) - q) * (endsPunct(tokens[k - 1]) ? 0.55 : 1);
            if (d < bestD) { bestD = d; bestK = k; }
            if (ideal(k) - q > 1.5) break;
        }
        if (bestK > 0 && Math.abs(ideal(bestK) - q) <= 1.2) { anchors.set(bestK, p); lastK = bestK; }
    });

    // boundaries in speech time: forced at anchors, proportional in between
    const bound = new Array(n + 1);
    bound[0] = S0; bound[n] = S1;
    const keys = [0, ...[...anchors.keys()].sort((x, y) => x - y), n];
    for (let m = 0; m < keys.length - 1; m++) {
        const ka = keys[m], kb = keys[m + 1];
        const xa = ka === 0 ? S0 : toSp(anchors.get(ka).s);
        const xb = kb === n ? S1 : toSp(anchors.get(kb).s);
        const sum = cum[kb] - cum[ka];
        for (let k = ka; k <= kb; k++) bound[k] = xa + ((cum[k] - cum[ka]) / sum) * (xb - xa);
    }
    return tokens.map((w, k) => ({
        w,
        s: fromSp(bound[k], true),
        e: Math.max(fromSp(bound[k], true) + 0.08, fromSp(bound[k + 1], false))
    }));
}

// Gives the transcript the written brand spelling, keeping one timed token per displayed word.
function fixTokens(list) {
    const out = [];
    for (let i = 0; i < list.length; i++) {
        const norm = (j) => (list[j] ? list[j].w.toLowerCase().replace(/[^a-z]/g, '') : '');
        if (norm(i) === 'blue' && norm(i + 1) === 'sky') {
            const trail = list[i + 1].w.match(/[.,!?;:]+$/);
            if (norm(i + 2) === 'consult' && norm(i + 3) === 'dot' && norm(i + 4) === 'com') {
                const last = list[i + 4].w.match(/[.,!?;:]+$/);
                out.push({ w: 'bluskyeconsult.com' + (last ? last[0] : ''), s: list[i].s, e: list[i + 4].e });
                i += 4;
            } else {
                out.push({ w: 'BluSkye' + (trail ? trail[0] : ''), s: list[i].s, e: list[i + 1].e });
                i += 1;
            }
        } else out.push(list[i]);
    }
    return out;
}

// Whisper words carry no punctuation; take it from the text so captions break at sentences.
function restorePunctuation(words, text) {
    const toks = String(text || '').split(/\s+/).filter(Boolean);
    const norm = (t) => String(t).toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    let ti = 0;
    return words.map((w) => {
        for (let k = ti; k < Math.min(toks.length, ti + 4); k++) {
            if (norm(toks[k]) === norm(w.w)) { ti = k + 1; return { ...w, w: toks[k] }; }
        }
        return w;
    });
}

// Groups timed words into short caption cues (default up to 6 words).
export function groupWords(words, maxWords = 6) {
    const phrases = [];
    let cur = [];
    words.forEach((w, i) => {
        cur.push(w);
        const next = words[i + 1];
        const gap = next ? next.s - w.e : 99;
        if (/[.!?…]["')\]]*$/.test(w.w) || gap > 0.45 || (/[,;:]$/.test(w.w) && cur.length >= 3)) { phrases.push(cur); cur = []; }
    });
    if (cur.length) phrases.push(cur);

    const merged = [];
    phrases.forEach((ph) => {
        const prev = merged[merged.length - 1];
        if (prev && prev.length <= 2 && !/[.!?…]["')\]]*$/.test(prev[prev.length - 1].w) && ph[0].s - prev[prev.length - 1].e < 0.5 && prev.length + ph.length <= maxWords) {
            prev.push(...ph);
        } else merged.push([...ph]);
    });

    const cues = [];
    merged.forEach((ph) => {
        const parts = Math.ceil(ph.length / maxWords);
        const size = Math.ceil(ph.length / parts);
        for (let i = 0; i < ph.length; i += size) {
            const g = ph.slice(i, i + size);
            const start = g[0].s, end = g[g.length - 1].e;
            cues.push({
                start,
                end,
                text: g.map((x) => x.w).join(' '),
                wt: g.map((x) => [+(x.s - start).toFixed(3), +(x.e - start).toFixed(3)]),
                exact: true
            });
        }
    });
    return cues;
}

// Transcript pieces + loudness envelope -> caption cues with real word timing.
export function buildCuesFromTranscript(chunks, env, { maxWords = 6, fixBrand = true } = {}) {
    const voiced = speechMask(env);
    let all = [];
    chunks.forEach((c) => {
        let words;
        if (c.words && c.words.length) words = restorePunctuation(c.words, c.text);
        else words = alignWords(String(c.text || '').split(/\s+/).filter(Boolean), voiced, c.start, c.end);
        all = all.concat(words);
    });
    if (fixBrand) all = fixTokens(all);
    return groupWords(all, maxWords);
}

// ---------------------------------------------------------------
// media helpers
// ---------------------------------------------------------------

export function readDuration(file, tag = 'video') {
    return new Promise((resolve, reject) => {
        const el = document.createElement(tag);
        const url = URL.createObjectURL(file);
        el.preload = 'metadata';
        el.onloadedmetadata = () => {
            const info = { duration: el.duration, width: el.videoWidth || 0, height: el.videoHeight || 0 };
            URL.revokeObjectURL(url);
            if (!isFinite(info.duration)) reject(new Error('Could not read the length of this file.'));
            else resolve(info);
        };
        el.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This browser cannot open that file. Try an MP4 (H.264) or WebM video, or an MP3/WAV/M4A audio file.')); };
        el.src = url;
    });
}

// ---------------------------------------------------------------
// the main run: preview (record=false) or record (record=true)
// ---------------------------------------------------------------

export async function runFinish({ canvas, videoFile, voiceFile, cues, opts, record, onProgress, shouldStop }) {
    const url = URL.createObjectURL(videoFile);
    const video = document.createElement('video');
    video.playsInline = true;
    video.preload = 'auto';
    video.src = url;
    await new Promise((res, rej) => {
        video.onloadedmetadata = res;
        video.onerror = () => rej(new Error('This browser cannot play that video file. Try an MP4 (H.264) or WebM.'));
    });

    const vw = video.videoWidth || 1280, vh = video.videoHeight || 720;
    const target = opts.shortSide === 1080 ? 1080 : 720;
    const scale = Math.min(1, target / Math.min(vw, vh));
    const W = Math.max(2, Math.round((vw * scale) / 2) * 2);
    const H = Math.max(2, Math.round((vh * scale) / 2) * 2);
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    try {
        if (document.fonts && document.fonts.load) await document.fonts.load('800 40px Inter');
    } catch (e) { /* font is a nicety only */ }

    const AC = window.AudioContext || window.webkitAudioContext;
    const ac = new AC();
    if (ac.state === 'suspended') await ac.resume();
    const dest = ac.createMediaStreamDestination();

    const offset = Math.max(0, Number(opts.voiceOffset) || 0);
    let voiceBuf = null;
    if (voiceFile) voiceBuf = await ac.decodeAudioData(await voiceFile.arrayBuffer());

    const videoDur = video.duration;
    const total = voiceBuf ? Math.max(videoDur, offset + voiceBuf.duration + 0.4) : videoDur;
    const timed = withEnds(cues || [], total).map((c) => ({ ...c, start: c.start + (opts.captionShift || 0), end: c.end + (opts.captionShift || 0) }));

    const videoGain = ac.createGain();
    videoGain.gain.value = voiceBuf ? clamp01(opts.videoVolume) : 1;
    const vSrc = ac.createMediaElementSource(video);
    vSrc.connect(videoGain);
    videoGain.connect(dest);
    let voiceGain = null, vs = null;
    if (voiceBuf) {
        voiceGain = ac.createGain();
        voiceGain.gain.value = Math.max(0, Math.min(1.5, opts.voiceVolume));
        vs = ac.createBufferSource();
        vs.buffer = voiceBuf;
        vs.connect(voiceGain);
        voiceGain.connect(dest);
    }
    // Hear it while previewing; while recording the sound goes only into the file.
    if (!record) {
        videoGain.connect(ac.destination);
        if (voiceGain) voiceGain.connect(ac.destination);
    }

    let wakeLock = null;
    try { if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { /* optional */ }
    // Long videos use a lower bitrate so the recording stays a sensible size in memory.
    const lengthK = total > 150 ? 0.6 : total > 90 ? 0.75 : 1;

    let recorder = null;
    const chunks = [];
    let stopped = null;
    if (record) {
        const stream = canvas.captureStream(30);
        dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
        const mime = pickRecorderMime();
        recorder = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: Math.round((opts.shortSide === 1080 ? 9000000 : 5000000) * lengthK), audioBitsPerSecond: 160000 } : undefined);
        recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
        stopped = new Promise((res) => { recorder.onstop = res; });
    }

    video.currentTime = 0;
    await new Promise((res) => {
        if (video.readyState >= 2 && video.currentTime === 0) return res();
        video.onseeked = res;
        setTimeout(res, 1500);
    });
    ctx.drawImage(video, 0, 0, W, H);
    if (recorder) recorder.start(250);

    await video.play();
    const T0 = ac.currentTime;
    if (vs) vs.start(T0 + offset);
    const fadeAt = T0 + Math.max(0, total - 0.7), endAt = T0 + total;
    [videoGain, voiceGain].filter(Boolean).forEach((g) => {
        g.gain.setValueAtTime(g.gain.value, fadeAt);
        g.gain.linearRampToValueAtTime(0, endAt);
    });

    let userStopped = false;
    await new Promise((resolve) => {
        const tick = () => {
            const t = ac.currentTime - T0;
            ctx.drawImage(video, 0, 0, W, H);
            drawCaptions(ctx, W, H, timed, t, opts);
            if (onProgress) onProgress(clamp01(t / total), t, total);
            if (shouldStop && shouldStop()) { userStopped = true; resolve(); }
            else if (t >= total) resolve();
            else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    });

    try { video.pause(); } catch (e) { /* ignore */ }
    try { if (vs) vs.stop(); } catch (e) { /* already stopped */ }
    let blob = null;
    if (recorder) {
        if (recorder.state !== 'inactive') recorder.stop();
        await stopped;
        blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
    }
    try { await ac.close(); } catch (e) { /* ignore */ }
    try { if (wakeLock) await wakeLock.release(); } catch (e) { /* ignore */ }
    URL.revokeObjectURL(url);
    return { blob: userStopped ? null : blob, total, size: { W, H } };
}

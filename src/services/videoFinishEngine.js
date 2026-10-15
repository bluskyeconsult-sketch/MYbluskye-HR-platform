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
    { value: 'karaoke', label: 'Karaoke highlight (current word lights up)' },
    { value: 'pop', label: 'Word pop (words bounce in one by one)' },
    { value: 'fade', label: 'Fade up (whole line glides in)' },
    { value: 'type', label: 'Typewriter' }
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
            text: body
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
        let end = c.end != null && !next ? c.end : (next ? next.start - 0.04 : c.start + readTime);
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
    const key = `${text}|${W}|${H}|${sizeK}`;
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
    const L = layoutCue(ctx, cue.text, W, H, sizeK);
    const dur = cue.end - cue.start;
    const local = t - cue.start;
    const alpha = clamp01(local / 0.12) * clamp01((cue.end - t) / 0.15);
    if (alpha <= 0) return;

    const vertical = H > W;
    let centerY;
    if (opts.captionPosition === 'top') centerY = H * (vertical ? 0.2 : 0.14) + L.blockH / 2;
    else if (opts.captionPosition === 'middle') centerY = H * 0.5;
    else centerY = H * (vertical ? 0.78 : 0.88) - L.blockH / 2;
    const style = opts.captionStyle || 'karaoke';
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
    const visibleChars = style === 'type' ? Math.floor(clamp01(local / (dur * 0.78)) * all.reduce((a, w) => a + w.text.length, 0)) : 0;
    const lastShown = style === 'pop' ? all.reduce((acc, w, i) => (local >= w.ws ? i : acc), -1) : -1;

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
            let shown = w.text, fill = '#FFFFFF', scale = 1, wa = 1;
            if (style === 'karaoke') {
                if (local >= w.ws && local < w.we) { fill = accent; scale = 1.07; }
            } else if (style === 'pop') {
                if (local < w.ws) wa = 0;
                else {
                    const p = (local - w.ws) / 0.24;
                    scale = 0.55 + 0.45 * easeOutBack(p);
                    wa = clamp01(p * 3);
                    if (i === lastShown) fill = accent;
                }
            } else if (style === 'type') {
                const n = Math.max(0, Math.min(w.text.length, charsLeft));
                charsLeft -= w.text.length;
                shown = w.text.slice(0, n);
            }
            if (wa > 0 && shown) {
                ctx.save();
                ctx.globalAlpha = alpha * wa;
                ctx.translate(x + w.w / 2, y);
                ctx.scale(scale, scale);
                if (!opts.captionBox) {
                    ctx.lineWidth = L.size * 0.16;
                    ctx.strokeStyle = 'rgba(2,6,23,0.92)';
                    ctx.strokeText(shown, -w.w / 2, 0);
                }
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

    let recorder = null;
    const chunks = [];
    let stopped = null;
    if (record) {
        const stream = canvas.captureStream(30);
        dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
        const mime = pickRecorderMime();
        recorder = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: opts.shortSide === 1080 ? 9000000 : 5000000, audioBitsPerSecond: 160000 } : undefined);
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
    URL.revokeObjectURL(url);
    return { blob: userStopped ? null : blob, total, size: { W, H } };
}

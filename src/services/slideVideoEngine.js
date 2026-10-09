// src/services/slideVideoEngine.js
//
// NEW (2026-10-09): a free, in-browser slide video engine. It draws every
// frame on a <canvas> (so it can do real transitions, slow zoom motion,
// animated captions and branded title cards) and records the canvas, plus
// an optional narration/music file, with the browser's own MediaRecorder.
// No server, no FFmpeg download, no cost.
//
// Slide shape:
//   { kind: 'image', img: HTMLImageElement|null, caption, duration }
//   { kind: 'title', title, subtitle, button, url, duration }
//
// Timing: slide N starts exactly when slide N-1's `duration` has elapsed,
// so per-slide durations line up with separately recorded narration clips.
// A transition is drawn over the first `transitionSeconds` of the next slide.

export const BRAND = {
    navy: '#0F172A',
    black: '#020617',
    slate: '#1E293B',
    sky: '#0EA5E9',
    blue: '#3B82F6',
    white: '#FFFFFF',
    light: '#CBD5E1',
    emerald: '#10B981'
};

export const TRANSITIONS = [
    { value: 'fade', label: 'Smooth fade' },
    { value: 'slide', label: 'Slide in' },
    { value: 'zoom', label: 'Zoom through' },
    { value: 'wipe', label: 'Wipe' },
    { value: 'none', label: 'None (hard cut)' }
];

const FONT = 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);

export function buildTimeline(slides) {
    const starts = [];
    let t = 0;
    slides.forEach((s) => {
        starts.push(t);
        t += Math.max(1, Number(s.duration) || 4);
    });
    return { starts, total: t };
}

export function resolutionFor(opts) {
    return opts.height === 1080 ? { W: 1920, H: 1080 } : { W: 1280, H: 720 };
}

// ---------------------------------------------------------------
// drawing helpers
// ---------------------------------------------------------------

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function wrapLines(ctx, text, maxW) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    words.forEach((w) => {
        const test = line ? `${line} ${w}` : w;
        if (ctx.measureText(test).width > maxW && line) {
            lines.push(line);
            line = w;
        } else {
            line = test;
        }
    });
    if (line) lines.push(line);
    return lines;
}

function drawBackground(ctx, W, H, glow = 0.14) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, BRAND.navy);
    g.addColorStop(1, BRAND.black);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const r = ctx.createRadialGradient(W * 0.85, H * 0.1, 0, W * 0.85, H * 0.1, W * 0.6);
    r.addColorStop(0, `rgba(14,165,233,${glow})`);
    r.addColorStop(1, 'rgba(14,165,233,0)');
    ctx.fillStyle = r;
    ctx.fillRect(0, 0, W, H);
}

function drawCaption(ctx, W, H, text, local, dur) {
    if (!text) return;
    const inA = easeOut((local - 0.25) / 0.55);
    const outA = 1 - clamp01((local - (dur - 0.45)) / 0.45);
    const a = clamp01(inA * outA);
    if (a <= 0) return;

    const bh = H * 0.155;
    const y0 = H - bh + (1 - inA) * bh * 0.35;

    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(2,6,23,0.9)';
    ctx.fillRect(0, y0, W, bh + 2);
    // accent line that grows across the top edge of the bar
    const lg = ctx.createLinearGradient(0, 0, W, 0);
    lg.addColorStop(0, BRAND.sky);
    lg.addColorStop(1, BRAND.blue);
    ctx.fillStyle = lg;
    ctx.fillRect(0, y0, W * inA, Math.max(3, H * 0.004));

    let size = H * 0.043;
    let lines;
    do {
        ctx.font = `700 ${size}px ${FONT}`;
        lines = wrapLines(ctx, text, W * 0.86);
        if (lines.length <= 2) break;
        size *= 0.9;
    } while (size > H * 0.026);
    lines = lines.slice(0, 2);

    ctx.fillStyle = BRAND.white;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lh = size * 1.28;
    const startY = y0 + bh / 2 - ((lines.length - 1) * lh) / 2 + H * 0.004;
    lines.forEach((l, i) => ctx.fillText(l, W / 2, startY + i * lh));
    ctx.restore();
}

function drawImageSlide(ctx, W, H, slide, local, dur, idx, opts, tail) {
    drawBackground(ctx, W, H);
    const kp = clamp01(local / (dur + tail));
    const zoom = 1 + 0.07 * kp;
    const panDir = idx % 2 === 0 ? 1 : -1;
    const img = slide.img;

    if (!img) {
        ctx.fillStyle = BRAND.light;
        ctx.font = `600 ${H * 0.04}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Add a screenshot for this slide', W / 2, H * 0.45);
        drawCaption(ctx, W, H, slide.caption, local, dur);
        return;
    }

    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;

    if (opts.layout === 'full') {
        const s = Math.max(W / iw, H / ih) * zoom;
        const w = iw * s;
        const h = ih * s;
        const x = (W - w) / 2 + panDir * W * 0.012 * (kp - 0.5);
        const y = (H - h) / 2;
        ctx.drawImage(img, x, y, w, h);
    } else {
        // framed: screenshot inside a rounded card with a soft shadow
        const maxW = W * 0.84;
        const maxH = H * 0.69;
        const fit = Math.min(maxW / iw, maxH / ih);
        const w = iw * fit;
        const h = ih * fit;
        const cx = W / 2 + panDir * W * 0.008 * (kp - 0.5);
        const cy = H * 0.455;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(zoom, zoom);
        const x = -w / 2;
        const y = -h / 2;
        const r = Math.max(10, H * 0.018);

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = H * 0.06;
        ctx.shadowOffsetY = H * 0.025;
        ctx.fillStyle = BRAND.slate;
        roundRect(ctx, x, y, w, h, r);
        ctx.fill();
        ctx.restore();

        ctx.save();
        roundRect(ctx, x, y, w, h, r);
        ctx.clip();
        ctx.drawImage(img, x, y, w, h);
        ctx.restore();

        ctx.strokeStyle = 'rgba(255,255,255,0.14)';
        ctx.lineWidth = Math.max(1, H * 0.0018);
        roundRect(ctx, x, y, w, h, r);
        ctx.stroke();
        ctx.restore();
    }

    drawCaption(ctx, W, H, slide.caption, local, dur);
}

function drawTitleSlide(ctx, W, H, slide, local, dur, assets) {
    drawBackground(ctx, W, H, 0.22);

    // soft centre glow
    const cg = ctx.createRadialGradient(W / 2, H * 0.5, 0, W / 2, H * 0.5, W * 0.45);
    cg.addColorStop(0, 'rgba(59,130,246,0.18)');
    cg.addColorStop(1, 'rgba(59,130,246,0)');
    ctx.fillStyle = cg;
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const hasButton = !!slide.button;
    const hasUrl = !!slide.url;

    // logo plate
    let top = H * 0.2;
    if (assets && assets.logo) {
        const a = easeOut(local / 0.6);
        const lh = H * 0.15;
        const lw = lh * (assets.logo.width / assets.logo.height);
        const pad = H * 0.018;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(0, (1 - a) * H * 0.02);
        ctx.fillStyle = '#FFFFFF';
        roundRect(ctx, W / 2 - lw / 2 - pad, top - lh / 2 - pad, lw + pad * 2, lh + pad * 2, H * 0.02);
        ctx.fill();
        ctx.drawImage(assets.logo, W / 2 - lw / 2, top - lh / 2, lw, lh);
        ctx.restore();
        top += lh * 0.5 + H * 0.07;
    } else {
        top = H * 0.3;
    }

    // title
    const tA = easeOut((local - 0.2) / 0.7);
    let size = H * 0.095;
    let lines;
    do {
        ctx.font = `800 ${size}px ${FONT}`;
        lines = wrapLines(ctx, slide.title, W * 0.8);
        if (lines.length <= 3) break;
        size *= 0.92;
    } while (size > H * 0.04);
    const lh = size * 1.12;
    const blockH = lines.length * lh;
    const titleTop = assets && assets.logo ? top + blockH / 2 : H * 0.42 - (hasButton || hasUrl ? H * 0.04 : 0);
    ctx.save();
    ctx.globalAlpha = tA;
    ctx.translate(0, (1 - tA) * H * 0.04);
    ctx.fillStyle = BRAND.white;
    ctx.font = `800 ${size}px ${FONT}`;
    lines.forEach((l, i) => ctx.fillText(l, W / 2, titleTop - blockH / 2 + lh / 2 + i * lh));
    ctx.restore();

    let y = titleTop + blockH / 2 + H * 0.025;

    // accent underline
    const uA = easeOut((local - 0.55) / 0.6);
    const ug = ctx.createLinearGradient(W / 2 - W * 0.09, 0, W / 2 + W * 0.09, 0);
    ug.addColorStop(0, BRAND.sky);
    ug.addColorStop(1, BRAND.blue);
    ctx.fillStyle = ug;
    roundRect(ctx, W / 2 - W * 0.09 * uA, y, W * 0.18 * uA, Math.max(4, H * 0.007), 4);
    ctx.fill();
    y += H * 0.06;

    // subtitle
    if (slide.subtitle) {
        const sA = easeOut((local - 0.75) / 0.6);
        ctx.save();
        ctx.globalAlpha = sA;
        ctx.translate(0, (1 - sA) * H * 0.02);
        ctx.fillStyle = BRAND.light;
        ctx.font = `500 ${H * 0.038}px ${FONT}`;
        const sl = wrapLines(ctx, slide.subtitle, W * 0.74).slice(0, 2);
        sl.forEach((l, i) => ctx.fillText(l, W / 2, y + i * H * 0.05));
        ctx.restore();
        y += sl.length * H * 0.05 + H * 0.035;
    }

    // button
    if (hasButton) {
        const bA = easeOut((local - 1.0) / 0.5);
        const bw = W * 0.2;
        const bh = H * 0.085;
        ctx.save();
        ctx.translate(W / 2, y + bh / 2);
        const sc = 0.85 + 0.15 * bA;
        ctx.scale(sc, sc);
        ctx.globalAlpha = bA;
        const bg = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
        bg.addColorStop(0, BRAND.sky);
        bg.addColorStop(1, BRAND.blue);
        ctx.shadowColor = 'rgba(14,165,233,0.45)';
        ctx.shadowBlur = H * 0.04;
        ctx.fillStyle = bg;
        roundRect(ctx, -bw / 2, -bh / 2, bw, bh, bh * 0.28);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = BRAND.white;
        ctx.font = `700 ${H * 0.036}px ${FONT}`;
        ctx.fillText(slide.button, 0, 0);
        ctx.restore();
        y += bh + H * 0.035;
    }

    // url
    if (hasUrl) {
        const uA2 = easeOut((local - 1.25) / 0.5);
        ctx.save();
        ctx.globalAlpha = uA2;
        ctx.fillStyle = BRAND.white;
        ctx.font = `600 ${H * 0.044}px ${FONT}`;
        ctx.fillText(slide.url, W / 2, y + H * 0.02);
        ctx.restore();
    }
}

function drawSlide(ctx, W, H, slide, local, idx, opts, assets, tail) {
    const dur = Math.max(1, Number(slide.duration) || 4);
    if (slide.kind === 'title') drawTitleSlide(ctx, W, H, slide, local, dur, assets);
    else drawImageSlide(ctx, W, H, slide, local, dur, idx, opts, tail);
}

function drawWatermark(ctx, W, H, assets, alpha) {
    if (!assets || !assets.logo || alpha <= 0.01) return;
    const lh = H * 0.075;
    const lw = lh * (assets.logo.width / assets.logo.height);
    const pad = H * 0.01;
    const x = W * 0.025;
    const y = H * 0.035;
    ctx.save();
    ctx.globalAlpha = alpha * 0.96;
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, x, y, lw + pad * 2, lh + pad * 2, H * 0.012);
    ctx.fill();
    ctx.drawImage(assets.logo, x + pad, y + pad, lw, lh);
    ctx.restore();
}

// ---------------------------------------------------------------
// one frame at time t (seconds)
// ---------------------------------------------------------------

export function renderFrame(ctx, W, H, slides, opts, assets, t) {
    if (!slides.length) {
        drawBackground(ctx, W, H);
        return;
    }
    const { starts, total } = buildTimeline(slides);
    const T = opts.transition === 'none' ? 0 : Math.max(0.2, Number(opts.transitionSeconds) || 0.8);
    const tt = Math.min(Math.max(0, t), total - 0.001);

    let i = 0;
    for (let k = 0; k < slides.length; k++) if (starts[k] <= tt) i = k;
    const local = tt - starts[i];

    ctx.save();
    ctx.clearRect(0, 0, W, H);

    if (i > 0 && T > 0 && local < T) {
        const p = ease(local / T);
        const prev = slides[i - 1];
        const next = slides[i];
        const prevLocal = tt - starts[i - 1];
        const draw = (s, loc, idx) => drawSlide(ctx, W, H, s, loc, idx, opts, assets, T);

        switch (opts.transition) {
            case 'slide':
                ctx.save();
                ctx.translate(-p * W * 0.28, 0);
                draw(prev, prevLocal, i - 1);
                ctx.fillStyle = `rgba(2,6,23,${0.55 * p})`;
                ctx.fillRect(-W, 0, W * 3, H);
                ctx.restore();
                ctx.save();
                ctx.translate((1 - p) * W, 0);
                ctx.shadowColor = 'rgba(0,0,0,0.6)';
                ctx.shadowBlur = 40;
                draw(next, local, i);
                ctx.restore();
                break;
            case 'zoom':
                ctx.save();
                ctx.translate(W / 2, H / 2);
                const sIn = 0.93 + 0.07 * p;
                ctx.scale(sIn, sIn);
                ctx.translate(-W / 2, -H / 2);
                draw(next, local, i);
                ctx.restore();
                ctx.save();
                ctx.globalAlpha = 1 - p;
                ctx.translate(W / 2, H / 2);
                const sOut = 1 + 0.22 * p;
                ctx.scale(sOut, sOut);
                ctx.translate(-W / 2, -H / 2);
                draw(prev, prevLocal, i - 1);
                ctx.restore();
                break;
            case 'wipe': {
                draw(prev, prevLocal, i - 1);
                ctx.save();
                ctx.beginPath();
                ctx.rect(0, 0, p * W, H);
                ctx.clip();
                draw(next, local, i);
                ctx.restore();
                const g = ctx.createLinearGradient(p * W - 90, 0, p * W + 4, 0);
                g.addColorStop(0, 'rgba(14,165,233,0)');
                g.addColorStop(1, 'rgba(14,165,233,0.85)');
                ctx.fillStyle = g;
                ctx.fillRect(p * W - 90, 0, 94, H);
                break;
            }
            case 'fade':
            default:
                draw(prev, prevLocal, i - 1);
                ctx.globalAlpha = p;
                draw(next, local, i);
                ctx.globalAlpha = 1;
        }

        const wm = (prev.kind === 'image' ? 1 - p : 0) + (next.kind === 'image' ? p : 0);
        drawWatermark(ctx, W, H, assets, clamp01(wm));
    } else {
        drawSlide(ctx, W, H, slides[i], local, i, opts, assets, T);
        drawWatermark(ctx, W, H, assets, slides[i].kind === 'image' ? easeOut(local / 0.5) : 0);
    }
    ctx.restore();
}

// ---------------------------------------------------------------
// loading + playing + recording
// ---------------------------------------------------------------

export async function loadImageFile(file) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    try {
        await img.decode();
    } catch (e) {
        URL.revokeObjectURL(url);
        throw new Error(`Could not read "${file.name}". Use PNG, JPG or WEBP (not HEIC).`);
    }
    return { img, url };
}

export function pickRecorderMime() {
    if (typeof window === 'undefined' || !window.MediaRecorder) return '';
    const candidates = [
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4;codecs=avc1',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm'
    ];
    return candidates.find((m) => window.MediaRecorder.isTypeSupported(m)) || '';
}

export function drawStill(canvas, slides, opts, assets, t) {
    const { W, H } = resolutionFor(opts);
    canvas.width = W;
    canvas.height = H;
    renderFrame(canvas.getContext('2d'), W, H, slides, opts, assets, t);
}

// Plays the timeline on `canvas`. With record=true it also records and
// resolves to a Blob. It runs in real time, so the browser tab must stay
// visible while it records (browsers slow background tabs down).
export async function playTimeline({ canvas, slides, opts, assets, audioFile, record, onProgress, shouldStop }) {
    const { W, H } = resolutionFor(opts);
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    try {
        if (document.fonts && document.fonts.load) {
            await Promise.all([
                document.fonts.load(`500 40px Inter`),
                document.fonts.load(`700 40px Inter`),
                document.fonts.load(`800 40px Inter`)
            ]);
        }
    } catch (e) { /* fonts are a nicety, never a blocker */ }

    const { total } = buildTimeline(slides);
    const endT = total + 0.3;

    let ac = null;
    let srcNode = null;
    let dest = null;
    if (audioFile) {
        const AC = window.AudioContext || window.webkitAudioContext;
        ac = new AC();
        const buf = await ac.decodeAudioData(await audioFile.arrayBuffer());
        srcNode = ac.createBufferSource();
        srcNode.buffer = buf;
        dest = ac.createMediaStreamDestination();
        srcNode.connect(dest);
        if (!record) srcNode.connect(ac.destination);
    }

    let recorder = null;
    const chunks = [];
    let stopped = null;
    if (record) {
        const stream = canvas.captureStream(30);
        if (dest) dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
        const mime = pickRecorderMime();
        recorder = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 8000000 } : undefined);
        recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
        stopped = new Promise((res) => { recorder.onstop = res; });
        recorder.start(250);
    }

    renderFrame(ctx, W, H, slides, opts, assets, 0);

    await new Promise((resolve) => {
        const t0 = performance.now();
        if (srcNode) srcNode.start();
        const tick = () => {
            const t = (performance.now() - t0) / 1000;
            renderFrame(ctx, W, H, slides, opts, assets, t);
            if (onProgress) onProgress(Math.min(1, t / endT));
            if (t >= endT || (shouldStop && shouldStop())) resolve();
            else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    });

    try { if (srcNode) srcNode.stop(); } catch (e) { /* already stopped */ }
    if (ac) { try { await ac.close(); } catch (e) { /* ignore */ } }

    if (recorder) {
        if (recorder.state !== 'inactive') recorder.stop();
        await stopped;
        return new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
    }
    return null;
}

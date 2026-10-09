// src/pages/admin/SlideVideoStudio.jsx
//
// NEW (2026-10-09): the free video tab, rebuilt. Real transitions (fade,
// slide, zoom, wipe), slow zoom motion on every screenshot, animated
// captions, branded title / end cards, logo watermark, and narration or
// music - all rendered in the browser with the engine in
// src/services/slideVideoEngine.js. $0.00, nothing is uploaded anywhere.
//
// "Load ODUSBABA template" creates the 10-scene awareness video with the
// scene lengths that match the narration clips, so you only have to attach
// your screenshots and your audio.

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Upload, Trash2, ArrowUp, ArrowDown, Play, Square, Download,
    Plus, Loader2, Film, Type, Image as ImageIcon
} from 'lucide-react';
import {
    TRANSITIONS, buildTimeline, drawStill, playTimeline,
    loadImageFile, pickRecorderMime
} from '../../services/slideVideoEngine';

let idCounter = 1;
const newId = () => `s${idCounter++}`;

const imageSlide = (caption = '', duration = 6) => ({ id: newId(), kind: 'image', img: null, url: null, imgName: '', caption, duration });
const titleSlide = (o = {}) => ({ id: newId(), kind: 'title', title: '', subtitle: '', button: '', url: '', duration: 6, ...o });

function odusbabaTemplate() {
    return [
        titleSlide({ title: 'Careers. Hiring. Skills. One platform.', subtitle: 'ODUSBABA by BluSkye Integrated Consult', duration: 12 }),
        titleSlide({ title: 'Outdated listings. Unverified employers. Fraud risk.', duration: 11 }),
        imageSlide('ODUSBABA by BluSkye Integrated Consult', 14),            // home page
        imageSlide('Verified Job Marketplace', 7),                            // jobs: search
        imageSlide('Filter by country, type, salary, visa sponsorship', 8),   // jobs: filters
        imageSlide('Official portals. Employer career pages.', 10),           // jobs: cards
        imageSlide('Free job alerts. Straight to your inbox.', 9),            // alerts
        imageSlide('Professional courses', 8),                                // courses
        imageSlide('Shareable, verifiable certificates', 9),                  // certificate
        imageSlide('Ask ODUSBABA AI. Recommendations based on your goals.', 14),
        imageSlide('Assessments', 5),
        imageSlide('HR tools', 5),
        imageSlide('For employers', 6),                                       // verified employers
        imageSlide('For learners. For readers.', 7),                          // books / articles
        titleSlide({ title: 'Verified opportunities. Real skills. Practical tools.', button: 'Start today', url: 'bluskyeconsult.com', duration: 14 })
    ];
}

export default function SlideVideoStudio() {
    const canvasRef = useRef(null);
    const stopRef = useRef(false);

    const [slides, setSlides] = useState([]);
    const [opts, setOpts] = useState({ transition: 'fade', transitionSeconds: 0.8, layout: 'framed', height: 720 });
    const [logo, setLogo] = useState(null);       // { img, url }
    const [audioFile, setAudioFile] = useState(null);
    const [scrub, setScrub] = useState(0);
    const [busy, setBusy] = useState(null);       // null | 'preview' | 'record'
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);   // { url, type }

    const { total } = buildTimeline(slides);
    const assets = { logo: logo ? logo.img : null };

    // keep the still preview up to date while editing
    const redraw = useCallback(() => {
        if (!canvasRef.current || busy) return;
        drawStill(canvasRef.current, slides, opts, assets, Math.min(scrub, Math.max(0, total - 0.01)));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slides, opts, logo, scrub, busy, total]);

    useEffect(() => { redraw(); }, [redraw]);

    // re-draw once the Inter font has loaded
    useEffect(() => {
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => redraw());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ---------- slide editing ----------
    const updateSlide = (id, patch) => setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    const removeSlide = (id) => setSlides((prev) => {
        const s = prev.find((x) => x.id === id);
        if (s && s.url) URL.revokeObjectURL(s.url);
        return prev.filter((x) => x.id !== id);
    });
    const moveSlide = (id, dir) => setSlides((prev) => {
        const i = prev.findIndex((s) => s.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= prev.length) return prev;
        const next = [...prev];
        [next[i], next[j]] = [next[j], next[i]];
        return next;
    });

    async function attachImage(id, file) {
        if (!file) return;
        try {
            const { img, url } = await loadImageFile(file);
            setSlides((prev) => prev.map((s) => {
                if (s.id !== id) return s;
                if (s.url) URL.revokeObjectURL(s.url);
                return { ...s, img, url, imgName: file.name };
            }));
            setError(null);
        } catch (e) {
            setError(e.message);
        }
    }

    // many screenshots at once: fill the empty image slots in order,
    // then add new slides for any left over
    async function bulkAdd(fileList) {
        const files = Array.from(fileList || []);
        if (!files.length) return;
        const loaded = [];
        for (const f of files) {
            try { loaded.push({ ...(await loadImageFile(f)), name: f.name }); }
            catch (e) { setError(e.message); }
        }
        setSlides((prev) => {
            const next = [...prev];
            let k = 0;
            for (let i = 0; i < next.length && k < loaded.length; i++) {
                if (next[i].kind === 'image' && !next[i].img) {
                    next[i] = { ...next[i], img: loaded[k].img, url: loaded[k].url, imgName: loaded[k].name };
                    k++;
                }
            }
            for (; k < loaded.length; k++) {
                next.push({ ...imageSlide('', 6), img: loaded[k].img, url: loaded[k].url, imgName: loaded[k].name });
            }
            return next;
        });
    }

    async function chooseLogo(file) {
        if (!file) return;
        try {
            const { img, url } = await loadImageFile(file);
            setLogo((old) => { if (old) URL.revokeObjectURL(old.url); return { img, url }; });
        } catch (e) { setError(e.message); }
    }

    // ---------- play / record ----------
    function validate() {
        if (!slides.length) return 'Add some slides first, or load the ODUSBABA template.';
        const missing = slides.map((s, i) => (s.kind === 'image' && !s.img ? i + 1 : null)).filter(Boolean);
        if (missing.length) return `Slide ${missing.join(', ')} still need a screenshot.`;
        return null;
    }

    async function run(record) {
        const problem = validate();
        if (problem) { setError(problem); return; }
        if (record && !window.MediaRecorder) {
            setError('This browser cannot record video. Use the latest Chrome or Edge on a computer.');
            return;
        }
        setError(null);
        setResult(null);
        stopRef.current = false;
        setBusy(record ? 'record' : 'preview');
        setProgress(0);
        try {
            const blob = await playTimeline({
                canvas: canvasRef.current,
                slides, opts, assets, audioFile, record,
                onProgress: setProgress,
                shouldStop: () => stopRef.current
            });
            if (record && blob && blob.size > 2000 && !stopRef.current) {
                setResult({ url: URL.createObjectURL(blob), type: blob.type });
            } else if (record && !stopRef.current) {
                setError('The recording came out empty. Keep this tab in front while recording and try again.');
            }
        } catch (e) {
            console.error('Slide video error:', e);
            setError(e.message || 'Something went wrong while making the video.');
        } finally {
            setBusy(null);
            setProgress(0);
        }
    }

    const ext = result && result.type.includes('mp4') ? 'mp4' : 'webm';
    const mime = pickRecorderMime();
    const fmt = mime.includes('mp4') ? 'MP4' : mime ? 'WebM' : 'not supported';

    const inputCls = 'w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-primary-500';
    const btnCls = 'inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 hover:border-primary-500 text-xs transition disabled:opacity-40';

    return (
        <div>
            <p className="text-slate-400 text-sm mb-4">
                Free, runs in your browser. Real transitions, slow zoom on every screenshot, animated captions, branded title cards, your logo and narration. $0.00.
            </p>

            {/* Preview */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-5">
                <canvas ref={canvasRef} className="w-full rounded-lg border border-slate-700 bg-black" style={{ aspectRatio: '16 / 9' }} />
                <div className="mt-3 flex items-center gap-3">
                    <input
                        type="range" min="0" max={Math.max(1, total)} step="0.1"
                        value={Math.min(scrub, total)}
                        onChange={(e) => setScrub(parseFloat(e.target.value))}
                        disabled={!!busy || !slides.length}
                        className="flex-1"
                        aria-label="Scrub through the video"
                    />
                    <span className="text-slate-400 text-xs tabular-nums w-24 text-right">
                        {busy ? `${Math.round(progress * 100)}%` : `${scrub.toFixed(1)}s / ${total}s`}
                    </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                    {!busy ? (
                        <>
                            <button onClick={() => run(false)} disabled={!slides.length} className={btnCls}><Play className="w-3.5 h-3.5" /> Play preview</button>
                            <button onClick={() => run(true)} disabled={!slides.length} className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-medium transition disabled:opacity-40">
                                <Film className="w-3.5 h-3.5" /> Record video ({fmt})
                            </button>
                        </>
                    ) : (
                        <button onClick={() => { stopRef.current = true; }} className={btnCls}><Square className="w-3.5 h-3.5" /> Stop</button>
                    )}
                    {busy === 'record' && (
                        <span className="text-amber-300 text-xs flex items-center gap-1.5">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Recording in real time ({total}s). Keep this tab open and in front.
                        </span>
                    )}
                </div>
            </div>

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            {result && (
                <div className="bg-slate-900/50 border border-emerald-500/30 rounded-xl p-4 mb-5">
                    <p className="text-emerald-400 text-sm font-medium mb-2">Your video is ready</p>
                    <video controls src={result.url} className="w-full rounded-lg border border-slate-700" />
                    <a
                        href={result.url}
                        download={`odusbaba-video.${ext}`}
                        className="mt-3 flex items-center justify-center gap-2 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition text-sm"
                    >
                        <Download className="w-4 h-4" /> Download .{ext}
                    </a>
                    {ext === 'webm' && (
                        <p className="text-slate-500 text-xs mt-2">
                            This browser saves WebM. YouTube, Facebook and most editors accept it. If a site refuses it, open it in CapCut or Clipchamp and export MP4. Chrome or Edge on a computer usually save MP4 directly.
                        </p>
                    )}
                </div>
            )}

            {/* Settings */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-5">
                <p className="text-white font-medium text-sm mb-3">Look and sound</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <label className="text-xs text-slate-400">Transition
                        <select className={inputCls + ' mt-1'} value={opts.transition} onChange={(e) => setOpts({ ...opts, transition: e.target.value })}>
                            {TRANSITIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </label>
                    <label className="text-xs text-slate-400">Transition length (seconds)
                        <input type="number" min="0.3" max="1.5" step="0.1" className={inputCls + ' mt-1'} value={opts.transitionSeconds}
                            onChange={(e) => setOpts({ ...opts, transitionSeconds: parseFloat(e.target.value) || 0.8 })} />
                    </label>
                    <label className="text-xs text-slate-400">Screenshot style
                        <select className={inputCls + ' mt-1'} value={opts.layout} onChange={(e) => setOpts({ ...opts, layout: e.target.value })}>
                            <option value="framed">Framed card with shadow</option>
                            <option value="full">Full screen</option>
                        </select>
                    </label>
                    <label className="text-xs text-slate-400">Quality
                        <select className={inputCls + ' mt-1'} value={opts.height} onChange={(e) => setOpts({ ...opts, height: parseInt(e.target.value, 10) })}>
                            <option value={720}>720p (faster)</option>
                            <option value={1080}>1080p (sharper)</option>
                        </select>
                    </label>
                    <label className="text-xs text-slate-400 sm:col-span-2">Your logo (PNG or JPG, shown top left)
                        <input type="file" accept="image/*" onChange={(e) => chooseLogo(e.target.files?.[0])}
                            className="block w-full mt-1 text-sm text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-800 file:text-slate-300" />
                    </label>
                    <label className="text-xs text-slate-400 sm:col-span-2">Narration or music (MP3, WAV, M4A) {audioFile && <span className="text-slate-500">- {audioFile.name}</span>}
                        <input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                            className="block w-full mt-1 text-sm text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-800 file:text-slate-300" />
                    </label>
                </div>
            </div>

            {/* Slides */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <p className="text-white font-medium text-sm mr-auto">Slides ({slides.length}) &middot; {total}s</p>
                    <button onClick={() => setSlides(odusbabaTemplate())} className={btnCls}><Film className="w-3.5 h-3.5" /> Load ODUSBABA template</button>
                    <label className={btnCls + ' cursor-pointer'}>
                        <Upload className="w-3.5 h-3.5" /> Add screenshots
                        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { bulkAdd(e.target.files); e.target.value = ''; }} />
                    </label>
                    <button onClick={() => setSlides((p) => [...p, imageSlide('', 6)])} className={btnCls}><Plus className="w-3.5 h-3.5" /> Image slide</button>
                    <button onClick={() => setSlides((p) => [...p, titleSlide({ title: 'Your title', duration: 6 })])} className={btnCls}><Type className="w-3.5 h-3.5" /> Title slide</button>
                    {slides.length > 0 && (
                        <button onClick={() => { slides.forEach((s) => s.url && URL.revokeObjectURL(s.url)); setSlides([]); setResult(null); }} className={btnCls}><Trash2 className="w-3.5 h-3.5" /> Clear</button>
                    )}
                </div>

                {slides.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-8">
                        No slides yet. Click <span className="text-slate-300">Load ODUSBABA template</span> for the 10-scene awareness video, then add your screenshots.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {slides.map((s, i) => (
                            <div key={s.id} className="flex gap-3 p-3 bg-slate-800/40 border border-slate-800 rounded-lg">
                                <div className="w-28 flex-shrink-0">
                                    {s.kind === 'image' ? (
                                        s.url ? (
                                            <img src={s.url} alt="" className="w-28 h-16 object-cover rounded-md border border-slate-700" />
                                        ) : (
                                            <label className="w-28 h-16 flex flex-col items-center justify-center gap-1 rounded-md border border-dashed border-slate-600 text-slate-400 hover:border-primary-500 cursor-pointer text-[10px]">
                                                <ImageIcon className="w-4 h-4" /> Add screenshot
                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => { attachImage(s.id, e.target.files?.[0]); e.target.value = ''; }} />
                                            </label>
                                        )
                                    ) : (
                                        <div className="w-28 h-16 rounded-md bg-gradient-to-br from-slate-900 to-primary-900/40 border border-slate-700 flex items-center justify-center text-[10px] text-slate-300">Title card</div>
                                    )}
                                    {s.kind === 'image' && s.url && (
                                        <label className="block mt-1 text-[10px] text-primary-400 hover:text-primary-300 cursor-pointer text-center">
                                            Replace
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => { attachImage(s.id, e.target.files?.[0]); e.target.value = ''; }} />
                                        </label>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-500 text-xs w-5">{i + 1}</span>
                                        {s.kind === 'image' ? (
                                            <input className={inputCls} placeholder="Caption shown at the bottom (optional)" value={s.caption} onChange={(e) => updateSlide(s.id, { caption: e.target.value })} />
                                        ) : (
                                            <input className={inputCls} placeholder="Title" value={s.title} onChange={(e) => updateSlide(s.id, { title: e.target.value })} />
                                        )}
                                    </div>
                                    {s.kind === 'title' && (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pl-7">
                                            <input className={inputCls} placeholder="Subtitle (optional)" value={s.subtitle} onChange={(e) => updateSlide(s.id, { subtitle: e.target.value })} />
                                            <input className={inputCls} placeholder="Button text (optional)" value={s.button} onChange={(e) => updateSlide(s.id, { button: e.target.value })} />
                                            <input className={inputCls} placeholder="Web address (optional)" value={s.url} onChange={(e) => updateSlide(s.id, { url: e.target.value })} />
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 pl-7">
                                        <label className="text-xs text-slate-400 flex items-center gap-1.5">Seconds
                                            <input type="number" min="1" max="60" className="w-16 px-2 py-1 bg-slate-800 border border-slate-700 rounded-md text-white text-sm"
                                                value={s.duration} onChange={(e) => updateSlide(s.id, { duration: Math.max(1, parseInt(e.target.value, 10) || 1) })} />
                                        </label>
                                        {s.imgName && <span className="text-slate-600 text-[10px] truncate">{s.imgName}</span>}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <button onClick={() => moveSlide(s.id, -1)} disabled={i === 0} className="p-1 text-slate-400 hover:text-white disabled:opacity-30" aria-label="Move up"><ArrowUp className="w-4 h-4" /></button>
                                    <button onClick={() => moveSlide(s.id, 1)} disabled={i === slides.length - 1} className="p-1 text-slate-400 hover:text-white disabled:opacity-30" aria-label="Move down"><ArrowDown className="w-4 h-4" /></button>
                                    <button onClick={() => removeSlide(s.id)} className="p-1 text-slate-500 hover:text-red-400" aria-label="Delete slide"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <p className="text-slate-600 text-xs mt-4">
                Tips: the template's seconds match the narration clips scene by scene. Recording runs in real time, so a {total || 140}-second video takes about that long to record. Keep this browser tab visible while it records.
            </p>
        </div>
    );
}

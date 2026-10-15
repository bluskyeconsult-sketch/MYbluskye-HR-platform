// src/pages/admin/VideoFinishStudio.jsx
//
// NEW (2026-10-15): "Finish a video" for the free video tab. Upload a video you
// already made, add your voiceover, paste the script (or an SRT file) and get one
// finished video with the blend mixed and animated captions burned in.
// Everything happens in the browser: no upload, no cost.

import { useState, useRef, useMemo } from 'react';
import { Upload, Play, Square, Download, Loader2, Film, Type, Volume2, AlertTriangle, Trash2, Wand2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
    CAPTION_STYLES, CAPTION_POSITIONS, CAPTION_SIZES, ACCENT_PRESETS,
    parseCaptions, withEnds, cuesToSrt, readDuration, runFinish,
    transcribeAudio, buildCuesFromTranscript
} from '../../services/videoFinishEngine';

let cueId = 1;
const fmt = (s) => {
    const m = Math.floor(s / 60);
    return `${m}:${(s - m * 60).toFixed(1).padStart(4, '0')}`;
};

export default function VideoFinishStudio() {
    const canvasRef = useRef(null);
    const stopRef = useRef(false);

    const [videoFile, setVideoFile] = useState(null);
    const [videoInfo, setVideoInfo] = useState(null);
    const [voiceFile, setVoiceFile] = useState(null);
    const [voiceInfo, setVoiceInfo] = useState(null);

    const [script, setScript] = useState('');
    const [fixBrand, setFixBrand] = useState(true);
    const [cues, setCues] = useState([]);
    const [captionsOn, setCaptionsOn] = useState(true);

    const [captionStyle, setCaptionStyle] = useState('pill');
    const [captionUpper, setCaptionUpper] = useState(false);
    const [captionPosition, setCaptionPosition] = useState('bottom');
    const [captionSize, setCaptionSize] = useState('medium');
    const [captionBox, setCaptionBox] = useState(false);
    const [accent, setAccent] = useState('#0EA5E9');
    const [captionShift, setCaptionShift] = useState(0);

    const [voiceOffset, setVoiceOffset] = useState(0);
    const [voiceVolume, setVoiceVolume] = useState(100);
    const [videoVolume, setVideoVolume] = useState(33);
    const [shortSide, setShortSide] = useState(1080);

    // automatic captions from the audio
    const [txSource, setTxSource] = useState('voice');
    const [txPrecise, setTxPrecise] = useState(false);
    const [txLanguage, setTxLanguage] = useState('en');
    const [maxWords, setMaxWords] = useState(5);
    const [txStatus, setTxStatus] = useState('');
    const [txNote, setTxNote] = useState('');
    const cuesFromVoice = useRef(false);

    const [busy, setBusy] = useState('');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);

    const total = useMemo(() => {
        if (!videoInfo) return 0;
        return voiceInfo ? Math.max(videoInfo.duration, voiceOffset + voiceInfo.duration + 0.4) : videoInfo.duration;
    }, [videoInfo, voiceInfo, voiceOffset]);

    async function pickVideo(file) {
        if (!file) return;
        setError(''); setResult(null);
        try {
            const info = await readDuration(file, 'video');
            setVideoFile(file); setVideoInfo(info);
        } catch (e) { setError(e.message); }
    }
    async function pickVoice(file) {
        if (!file) return;
        setError(''); setResult(null);
        try {
            const info = await readDuration(file, 'audio');
            setVoiceFile(file); setVoiceInfo(info);
        } catch (e) { setError(e.message); }
    }
    async function pickSrt(file) {
        if (!file) return;
        const text = await file.text();
        setScript(text);
        buildCaptions(text);
    }

    function buildCaptions(textOverride) {
        const text = typeof textOverride === 'string' ? textOverride : script;
        const parsed = parseCaptions(text, {
            voiceDuration: voiceInfo?.duration || 0,
            offset: voiceOffset,
            videoDuration: videoInfo?.duration || 0,
            fixBrand
        });
        if (!parsed.length) { setError('No caption text found. Paste your script or load an .srt file.'); return; }
        setError('');
        cuesFromVoice.current = false;
        setCues(parsed.map((c) => ({ id: cueId++, start: Number(c.start.toFixed(2)), end: c.end, text: c.text, exact: c.exact, wt: c.wt })));
    }

    const txFile = (txSource === 'voice' && voiceFile) ? voiceFile : videoFile;
    const txSeconds = (txSource === 'voice' && voiceInfo) ? voiceInfo.duration : (videoInfo?.duration || 0);
    const txCost = (txSeconds / 60) * (txPrecise ? 0.006 : 0.003);

    // Speech -> words -> timed captions. Cheapest model by default; "precise" uses the model that returns exact word times.
    async function transcribe() {
        if (!txFile) { setError('Add your video or voiceover first.'); return; }
        setError(''); setTxNote(''); setTxStatus('Starting...');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const out = await transcribeAudio({
                file: txFile, precise: txPrecise, language: txLanguage === 'auto' ? '' : txLanguage,
                accessToken: session?.access_token, onStatus: setTxStatus
            });
            const built = buildCuesFromTranscript(out.chunks, out.env, { maxWords, fixBrand });
            if (!built.length) throw new Error('No speech was found in that audio.');
            const useOffset = txFile === voiceFile ? voiceOffset : 0;
            cuesFromVoice.current = txFile === voiceFile;
            setCues(built.map((c) => ({ id: cueId++, start: Number((c.start + useOffset).toFixed(2)), end: c.end + useOffset, text: c.text, exact: true, wt: c.wt })));
            setTxNote(`${built.length} captions made. Cost about $${out.cost.toFixed(3)}. Check the wording below, especially names.`);
        } catch (e) {
            console.error('Transcribe error:', e);
            setError(e.message || 'Transcription failed.');
        } finally {
            setTxStatus('');
        }
    }

    function changeVoiceOffset(v) {
        const delta = v - voiceOffset;
        setVoiceOffset(v);
        // captions made from the voiceover travel with it
        if (cuesFromVoice.current && delta) setCues((cs) => cs.map((c) => ({ ...c, start: Math.max(0, +(c.start + delta).toFixed(2)), end: c.end != null ? c.end + delta : c.end })));
    }

    function updateCue(id, patch) {
        setCues((cs) => cs.map((c) => {
            if (c.id !== id) return c;
            const next = { ...c, ...patch };
            if (patch.start != null && c.end != null) next.end = c.end + (patch.start - c.start);
            return next;
        }));
    }

    const opts = {
        captionStyle, captionPosition, captionSize, captionBox, captionUpper, accent, captionShift,
        voiceOffset, voiceVolume: voiceVolume / 100, videoVolume: videoVolume / 100, shortSide
    };

    async function run(record) {
        if (!videoFile) { setError('Add your video first.'); return; }
        if (total > 600) { setError('Videos up to 10 minutes are supported. This one is longer.'); return; }
        setError(''); setResult(null); setProgress(0);
        stopRef.current = false;
        setBusy(record ? 'record' : 'preview');
        try {
            const out = await runFinish({
                canvas: canvasRef.current, videoFile, voiceFile,
                cues: captionsOn ? cues : [], opts, record,
                onProgress: (p) => setProgress(p),
                shouldStop: () => stopRef.current
            });
            if (record && out.blob) {
                setResult({ url: URL.createObjectURL(out.blob), type: out.blob.type, size: out.blob.size });
            }
        } catch (e) {
            console.error('Finish video error:', e);
            setError(e.message || 'Something went wrong while making the video.');
        } finally {
            setBusy('');
        }
    }

    function downloadSrt() {
        const blob = new Blob([cuesToSrt(cues, total, captionShift)], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'captions.srt';
        a.click();
    }

    const ext = result?.type?.includes('mp4') ? 'mp4' : 'webm';
    const ended = useMemo(() => withEnds(cues, total), [cues, total]);
    const inp = 'w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm';
    const lbl = 'block text-xs text-slate-400 mb-1';
    const card = 'bg-slate-900/50 border border-slate-800 rounded-xl p-4';

    return (
        <div className="space-y-4">
            <div className={card}>
                <h3 className="text-white font-semibold flex items-center gap-2 mb-1"><Film className="w-4 h-4 text-sky-400" /> 1. Your video</h3>
                <p className="text-xs text-slate-500 mb-3">An already-made video (MP4 or WebM). Its own sound is kept and mixed underneath your voiceover.</p>
                <label className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-dashed border-slate-600 rounded-lg text-sm text-slate-300 cursor-pointer hover:border-sky-500">
                    <Upload className="w-4 h-4" /> {videoFile ? videoFile.name : 'Choose video file'}
                    <input type="file" accept="video/*" className="hidden" onChange={(e) => pickVideo(e.target.files?.[0])} />
                </label>
                {videoInfo && <p className="text-xs text-slate-500 mt-2">{videoInfo.width}×{videoInfo.height}, {fmt(videoInfo.duration)} long</p>}
            </div>

            <div className={card}>
                <h3 className="text-white font-semibold flex items-center gap-2 mb-1"><Volume2 className="w-4 h-4 text-sky-400" /> 2. Voiceover (optional)</h3>
                <label className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-dashed border-slate-600 rounded-lg text-sm text-slate-300 cursor-pointer hover:border-sky-500">
                    <Upload className="w-4 h-4" /> {voiceFile ? voiceFile.name : 'Choose audio file (MP3, WAV, M4A)'}
                    <input type="file" accept="audio/*" className="hidden" onChange={(e) => pickVoice(e.target.files?.[0])} />
                </label>
                {voiceInfo && <p className="text-xs text-slate-500 mt-2">Voiceover is {fmt(voiceInfo.duration)} long</p>}
                {voiceFile && (
                    <div className="grid sm:grid-cols-3 gap-3 mt-3">
                        <div>
                            <label className={lbl}>Voice starts at: {voiceOffset.toFixed(1)} s</label>
                            <input type="range" min="0" max="10" step="0.1" value={voiceOffset} onChange={(e) => changeVoiceOffset(+e.target.value)} className="w-full" />
                        </div>
                        <div>
                            <label className={lbl}>Voice volume: {voiceVolume}%</label>
                            <input type="range" min="40" max="150" step="5" value={voiceVolume} onChange={(e) => setVoiceVolume(+e.target.value)} className="w-full" />
                        </div>
                        <div>
                            <label className={lbl}>Video's own sound under voice: {videoVolume}%</label>
                            <input type="range" min="0" max="100" step="1" value={videoVolume} onChange={(e) => setVideoVolume(+e.target.value)} className="w-full" />
                        </div>
                    </div>
                )}
                {voiceFile && videoInfo && voiceOffset + voiceInfo.duration > videoInfo.duration && (
                    <p className="text-xs text-amber-400 mt-2 flex items-start gap-1"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> The voiceover ends after the video does, so the last frame is held until the voice finishes.</p>
                )}
                <p className="text-xs text-slate-500 mt-2">Default blend: voice at full volume, the video's music at about a third underneath, both fading out over the last 0.7 s.</p>
            </div>

            <div className={card}>
                <h3 className="text-white font-semibold flex items-center gap-2 mb-1"><Type className="w-4 h-4 text-sky-400" /> 3. Animated captions</h3>
                <label className="flex items-center gap-2 text-sm text-slate-300 mb-2">
                    <input type="checkbox" checked={captionsOn} onChange={(e) => setCaptionsOn(e.target.checked)} /> Burn captions into the video
                </label>
                {captionsOn && (
                    <>
                        <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3 mb-4">
                            <div className="flex items-center gap-1.5 text-sm text-slate-200 mb-2"><Wand2 className="w-4 h-4 text-sky-400" /> Get captions automatically from the audio</div>
                            <div className="grid sm:grid-cols-3 gap-3">
                                <div>
                                    <label className={lbl}>Listen to</label>
                                    <select value={txSource} onChange={(e) => setTxSource(e.target.value)} className={inp}>
                                        <option value="voice">The voiceover file</option>
                                        <option value="video">The video's own sound</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={lbl}>Language</label>
                                    <select value={txLanguage} onChange={(e) => setTxLanguage(e.target.value)} className={inp}>
                                        <option value="en">English</option>
                                        <option value="auto">Detect automatically</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={lbl}>Words per caption</label>
                                    <select value={maxWords} onChange={(e) => setMaxWords(+e.target.value)} className={inp}>
                                        <option value={3}>3 (fast reels style)</option>
                                        <option value={5}>5 (balanced)</option>
                                        <option value={7}>7 (fuller lines)</option>
                                    </select>
                                </div>
                            </div>
                            <label className="flex items-start gap-2 text-xs text-slate-400 mt-3">
                                <input type="checkbox" className="mt-0.5" checked={txPrecise} onChange={(e) => setTxPrecise(e.target.checked)} />
                                <span>Exact word timing (uses the Whisper model, double the price). Leave off to use the cheapest model, which is timed against the real pauses in your audio and is accurate for clear voiceovers.</span>
                            </label>
                            <div className="flex flex-wrap items-center gap-3 mt-3">
                                <button onClick={transcribe} disabled={!!txStatus || !txFile} className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm hover:bg-sky-500 disabled:opacity-50 flex items-center gap-2">
                                    {txStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} {txStatus || 'Make captions from audio'}
                                </button>
                                {txFile && txSeconds > 0 && <span className="text-xs text-slate-500">Estimated cost for {fmt(txSeconds)}: about ${txCost.toFixed(3)}</span>}
                            </div>
                            {txNote && <p className="text-xs text-emerald-400 mt-2">{txNote}</p>}
                        </div>

                        <label className={lbl}>Or paste your script. Plain text is spread across the voiceover by word count. Lines that start with a time ("0:04.3 Hello there") or an .srt file give exact timing.</label>
                        <textarea rows={6} value={script} onChange={(e) => setScript(e.target.value)} className={inp} placeholder="Paste the audio script here" />
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                            <button onClick={() => buildCaptions()} disabled={!script.trim()} className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm hover:bg-sky-500 disabled:opacity-50">Build captions</button>
                            <label className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 cursor-pointer hover:border-sky-500">
                                Load .srt file
                                <input type="file" accept=".srt,.txt" className="hidden" onChange={(e) => pickSrt(e.target.files?.[0])} />
                            </label>
                            <label className="flex items-center gap-2 text-xs text-slate-400">
                                <input type="checkbox" checked={fixBrand} onChange={(e) => setFixBrand(e.target.checked)} /> Show "Blue Sky" as BluSkye and "Blue Sky Consult dot com" as bluskyeconsult.com
                            </label>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                            <div><label className={lbl}>Animation</label>
                                <select value={captionStyle} onChange={(e) => setCaptionStyle(e.target.value)} className={inp}>
                                    {CAPTION_STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select></div>
                            <div><label className={lbl}>Position</label>
                                <select value={captionPosition} onChange={(e) => setCaptionPosition(e.target.value)} className={inp}>
                                    {CAPTION_POSITIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select></div>
                            <div><label className={lbl}>Size</label>
                                <select value={captionSize} onChange={(e) => setCaptionSize(e.target.value)} className={inp}>
                                    {CAPTION_SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select></div>
                            <div><label className={lbl}>Highlight colour</label>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {ACCENT_PRESETS.map((c) => (
                                        <button key={c.value} type="button" title={c.name} onClick={() => setAccent(c.value)}
                                            className={`w-7 h-7 rounded-full border-2 ${accent.toLowerCase() === c.value.toLowerCase() ? 'border-white' : 'border-transparent'}`}
                                            style={{ background: c.value }} />
                                    ))}
                                    <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="w-7 h-7 bg-transparent border-0 p-0 cursor-pointer" title="Any colour" />
                                </div></div>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3 mt-3">
                            <div>
                                <label className={lbl}>Shift all captions: {captionShift > 0 ? '+' : ''}{captionShift.toFixed(1)} s (later is positive)</label>
                                <input type="range" min="-3" max="3" step="0.1" value={captionShift} onChange={(e) => setCaptionShift(+e.target.value)} className="w-full" />
                            </div>
                            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-5">
                                <label className="flex items-center gap-2 text-sm text-slate-300">
                                    <input type="checkbox" checked={captionUpper} onChange={(e) => setCaptionUpper(e.target.checked)} /> CAPITALS
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-300">
                                    <input type="checkbox" checked={captionBox} onChange={(e) => setCaptionBox(e.target.checked)} /> Dark box behind the words
                                </label>
                            </div>
                        </div>

                        {cues.length > 0 && (
                            <div className="mt-4">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-xs text-slate-400">{cues.length} captions. Edit any start time or wording; each caption ends just before the next begins.</p>
                                    <button onClick={downloadSrt} className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1"><Download className="w-3 h-3" /> .srt</button>
                                </div>
                                <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                                    {cues.map((c, i) => (
                                        <div key={c.id} className="flex items-center gap-2">
                                            <input type="number" step="0.1" min="0" value={c.start} onChange={(e) => updateCue(c.id, { start: Math.max(0, +e.target.value || 0) })} className="w-20 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs" />
                                            <input type="text" value={c.text} onChange={(e) => updateCue(c.id, { text: e.target.value })} className="flex-1 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs" />
                                            <span className="text-[10px] text-slate-500 w-12 text-right">{ended[i] ? `to ${fmt(ended[i].end)}` : ''}</span>
                                            <button onClick={() => setCues((cs) => cs.filter((x) => x.id !== c.id))} className="text-slate-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                    ))}
                                </div>
                                {!cues.some((c) => c.exact) && !/-->|\d:\d\d/.test(script) && (
                                    <p className="text-xs text-amber-400 mt-2 flex items-start gap-1"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> Times for a plain script are estimated from word counts. Press Preview and nudge the start times or the shift slider until the words land with the voice.</p>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className={card}>
                <div className="flex flex-wrap items-end gap-3 mb-3">
                    <div>
                        <label className={lbl}>Output quality</label>
                        <select value={shortSide} onChange={(e) => setShortSide(+e.target.value)} className={inp}>
                            <option value={1080}>Full HD (1080 on the short side)</option>
                            <option value={720}>HD (720, smaller file)</option>
                        </select>
                    </div>
                    <button onClick={() => run(false)} disabled={!!busy || !videoFile} className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-600 disabled:opacity-50 flex items-center gap-2">
                        {busy === 'preview' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Preview with sound
                    </button>
                    <button onClick={() => run(true)} disabled={!!busy || !videoFile} className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm hover:bg-sky-500 disabled:opacity-50 flex items-center gap-2">
                        {busy === 'record' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />} Make finished video
                    </button>
                    {busy && (
                        <button onClick={() => { stopRef.current = true; }} className="px-4 py-2 bg-red-600/80 text-white rounded-lg text-sm hover:bg-red-600 flex items-center gap-2"><Square className="w-4 h-4" /> Stop</button>
                    )}
                </div>
                <canvas ref={canvasRef} width={1280} height={720} className="w-full max-h-[70vh] object-contain bg-black rounded-lg border border-slate-800" />
                {total > 180 && !busy && (
                    <p className="text-xs text-amber-400 mb-3 flex items-start gap-1"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> This video is {fmt(total)} long. Making it takes that long in real time, so keep this tab open and in front the whole time.</p>
                )}
                {busy && (
                    <div className="mt-3">
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-sky-500" style={{ width: `${Math.round(progress * 100)}%` }} /></div>
                        <p className="text-xs text-slate-500 mt-1">{busy === 'record' ? 'Recording in real time. Keep this tab open and in front until it finishes.' : 'Previewing.'} {Math.round(progress * 100)}%</p>
                    </div>
                )}
                {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
                {result && (
                    <div className="mt-4">
                        <video controls src={result.url} className="w-full max-h-[70vh] rounded-lg border border-slate-700" />
                        <a href={result.url} download={`finished-video.${ext}`} className="mt-3 flex items-center justify-center gap-2 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 text-sm">
                            <Download className="w-4 h-4" /> Download {ext.toUpperCase()} ({(result.size / 1048576).toFixed(1)} MB)
                        </a>
                        {ext === 'webm' && <p className="text-xs text-slate-500 mt-2">This browser saves WebM. It plays in Chrome, Edge and most players, but some social apps want MP4. Recent Chrome saves MP4 directly; otherwise a free converter will change it without re-making the video.</p>}
                    </div>
                )}
            </div>
        </div>
    );
}

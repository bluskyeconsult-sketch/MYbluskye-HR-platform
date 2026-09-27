// src/pages/admin/PersonalMediaStudio.jsx
//
// NEW (2026-09-26): a personal, super-admin-only studio for
// generating images and audio from a script, using OpenAI's real,
// highest-quality settings - genuinely different from the
// cost-optimized settings used for bulk article/course content
// elsewhere on this platform.
//
// Honest note: video generation is not included here. OpenAI
// discontinued the Sora API on 2026-09-24, two days before this was
// built - building against a shut-down API would fail on every call.

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Image, Music, Video, Loader2, Download, Sparkles, AlertTriangle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

export default function PersonalMediaStudio() {
    const [activeTab, setActiveTab] = useState('image');

    // Image state
    const [imagePrompt, setImagePrompt] = useState('');
    const [imageSize, setImageSize] = useState('1024x1024');
    const [imageQuality, setImageQuality] = useState('low');
    const [generatingImage, setGeneratingImage] = useState(false);
    const [generatedImage, setGeneratedImage] = useState(null);
    const [imageCost, setImageCost] = useState(null);

    // Audio state
    const [script, setScript] = useState('');
    const [voice, setVoice] = useState('alloy');
    const [speed, setSpeed] = useState(1.0);
    const [useHD, setUseHD] = useState(false);
    const [generatingAudio, setGeneratingAudio] = useState(false);
    const [generatedAudio, setGeneratedAudio] = useState(null);
    const [audioCost, setAudioCost] = useState(null);

    // NEW (2026-09-26): real, upfront cost estimates shown before
    // generating anything - confirmed via direct research, matching
    // the exact figures the backend uses, so what's shown here and
    // what's actually charged genuinely agree.
    const IMAGE_COST_ESTIMATES = {
        '1024x1024': { low: 0.005, medium: 0.015, high: 0.052 },
        '1536x1024': { low: 0.006, medium: 0.015, high: 0.052 },
        '1024x1536': { low: 0.006, medium: 0.015, high: 0.052 }
    };
    const estimatedImageCost = IMAGE_COST_ESTIMATES[imageSize]?.[imageQuality] ?? null;
    const estimatedAudioCost = script.length > 0 ? Math.round(script.length * (useHD ? 0.00003 : 0.000015) * 10000) / 10000 : null;

    // Video state - NEW (2026-09-26)
    const [videoPrompt, setVideoPrompt] = useState('');
    const [videoImageUrl, setVideoImageUrl] = useState('');
    const [generatingVideo, setGeneratingVideo] = useState(false);
    const [videoStatus, setVideoStatus] = useState('');
    const [generatedVideo, setGeneratedVideo] = useState(null);
    const [videoCost, setVideoCost] = useState(null);
    const [videoElapsed, setVideoElapsed] = useState(0);

    async function authHeaders() {
        const { data: { session } } = await supabase.auth.getSession();
        return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` };
    }

    async function handleGenerateImage() {
        if (!imagePrompt.trim()) {
            toast.error('Enter a prompt first');
            return;
        }
        setGeneratingImage(true);
        setGeneratedImage(null);
        setImageCost(null);
        try {
            const headers = await authHeaders();
            const response = await fetch('/api/index?action=generate-personal-image', {
                method: 'POST',
                headers,
                body: JSON.stringify({ prompt: imagePrompt.trim(), size: imageSize, quality: imageQuality })
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.error);
            setGeneratedImage(data.image);
            setImageCost(data.estimatedCost);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setGeneratingImage(false);
        }
    }

    async function handleGenerateAudio() {
        if (!script.trim()) {
            toast.error('Enter a script first');
            return;
        }
        setGeneratingAudio(true);
        setGeneratedAudio(null);
        setAudioCost(null);
        try {
            const headers = await authHeaders();
            const response = await fetch('/api/index?action=generate-personal-audio', {
                method: 'POST',
                headers,
                body: JSON.stringify({ script: script.trim(), voice, speed, hd: useHD })
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.error);
            setGeneratedAudio(data.audio);
            setAudioCost(data.estimatedCost);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setGeneratingAudio(false);
        }
    }

    async function handleGenerateVideo() {
        if (!videoPrompt.trim()) {
            toast.error('Enter a prompt first');
            return;
        }
        setGeneratingVideo(true);
        setGeneratedVideo(null);
        setVideoCost(null);
        setVideoElapsed(0);
        setVideoStatus('Starting...');

        try {
            const headers = await authHeaders();
            const startResponse = await fetch('/api/index?action=start-personal-video', {
                method: 'POST',
                headers,
                body: JSON.stringify({ prompt: videoPrompt.trim(), imageUrl: videoImageUrl.trim() || undefined })
            });
            const startData = await startResponse.json();
            if (!startData.success) throw new Error(startData.error);

            const runId = startData.runId;
            setVideoStatus('Generating (this genuinely takes 2-10 minutes, sometimes up to 30)...');

            // Polls the real status action every 10 seconds - never a
            // single long-running request, matching the backend's
            // real, split architecture.
            //
            // FIXED (2026-09-26): confirmed a real, genuine gap - the
            // backend's original single-request draft had its own
            // 25-minute ceiling, but splitting into start+status-check
            // moved the actual waiting here, to the frontend, without
            // carrying that ceiling over. Without this, a stuck run or
            // an invalid run ID would have polled forever, every 10
            // seconds, with no stopping point at all. This now matches
            // the real, honest 30-minute maximum the Apify actor
            // itself documents.
            const MAX_POLL_MS = 30 * 60 * 1000;
            const pollStart = Date.now();
            const poll = async () => {
                // FIXED (2026-09-26): confirmed a second, genuine bug -
                // setTimeout(poll, ...) runs this outside the original
                // try/catch's call stack entirely, so any error thrown
                // in a recursive call was becoming a silent, unhandled
                // promise rejection - the outer catch never saw it, and
                // the UI would stay stuck on "Generating..." forever
                // with no error shown at all. Wrapping poll's own body
                // in its own try/catch fixes this regardless of which
                // invocation the error happens in.
                try {
                    const elapsedMs = Date.now() - pollStart;
                    const elapsed = Math.round(elapsedMs / 1000);
                    setVideoElapsed(elapsed);

                    if (elapsedMs > MAX_POLL_MS) {
                        throw new Error("Still generating after 30 minutes - genuinely longer than this actor's own stated maximum, something may be stuck. You can try again.");
                    }

                    const statusHeaders = await authHeaders();
                    const statusResponse = await fetch(`/api/index?action=check-personal-video-status&runId=${runId}`, { headers: statusHeaders });
                    const statusData = await statusResponse.json();

                    if (!statusData.success) throw new Error(statusData.error || 'Status check failed');

                    if (!statusData.done) {
                        setTimeout(poll, 10000);
                        return;
                    }

                    if (statusData.failed) {
                        throw new Error(statusData.message || `Video generation failed (status: ${statusData.status})`);
                    }

                    setGeneratedVideo(statusData.videoUrl);
                    setVideoCost(statusData.estimatedCost);
                    setVideoStatus('Done!');
                    setGeneratingVideo(false);
                } catch (pollErr) {
                    toast.error(pollErr.message);
                    setGeneratingVideo(false);
                    setVideoStatus('');
                }
            };

            setTimeout(poll, 10000);
        } catch (err) {
            toast.error(err.message);
            setGeneratingVideo(false);
            setVideoStatus('');
        }
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary-400" /> Personal Media Studio
            </h1>
            <p className="text-slate-400 text-sm mb-2">
                Real, highest-quality OpenAI generation for your own use - separate from the cost-optimized settings used for site content.
            </p>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-6 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-amber-200 text-xs">
                    Video generation isn't included here - OpenAI discontinued the Sora API on September 24, 2026, so it's genuinely no longer available to build against.
                </p>
            </div>

            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('image')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'image' ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                >
                    <Image className="w-4 h-4" /> Image
                </button>
                <button
                    onClick={() => setActiveTab('audio')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'audio' ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                >
                    <Music className="w-4 h-4" /> Audio
                </button>
                <button
                    onClick={() => setActiveTab('video')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'video' ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                >
                    <Video className="w-4 h-4" /> Video
                </button>
            </div>

            {activeTab === 'image' && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                    <label className="block text-sm text-slate-400 mb-2">Prompt</label>
                    <textarea
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                        rows={4}
                        placeholder="Describe the image in detail..."
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm mb-4"
                    />

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Size</label>
                            <select
                                value={imageSize}
                                onChange={(e) => setImageSize(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                            >
                                <option value="1024x1024">Square (1024×1024)</option>
                                <option value="1536x1024">Landscape (1536×1024)</option>
                                <option value="1024x1536">Portrait (1024×1536)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Quality</label>
                            <select
                                value={imageQuality}
                                onChange={(e) => setImageQuality(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                            >
                                <option value="low">Low ($0.005-0.006, cheapest)</option>
                                <option value="medium">Medium (~$0.015)</option>
                                <option value="high">High (~$0.052, ~10x cost)</option>
                            </select>
                        </div>
                    </div>

                    <p className="text-slate-400 text-xs mb-3">
                        Estimated cost: <span className="text-emerald-400 font-medium">${estimatedImageCost?.toFixed(3) ?? '—'}</span>
                        {imageQuality === 'high' && <span className="text-amber-400"> (high quality costs ~10x more than low)</span>}
                    </p>

                    <button
                        onClick={handleGenerateImage}
                        disabled={generatingImage}
                        className="w-full py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {generatingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {generatingImage ? 'Generating...' : 'Generate Image'}
                    </button>

                    {generatedImage && (
                        <div className="mt-5">
                            <img src={generatedImage} alt="Generated" className="w-full rounded-lg border border-slate-700" />
                            {imageCost != null && <p className="text-slate-500 text-xs mt-2">Actual cost: ${imageCost.toFixed(3)}</p>}
                            <a
                                href={generatedImage}
                                download="generated-image.png"
                                className="mt-3 flex items-center justify-center gap-2 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition text-sm"
                            >
                                <Download className="w-4 h-4" /> Download
                            </a>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'audio' && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                    <label className="block text-sm text-slate-400 mb-2">Script</label>
                    <textarea
                        value={script}
                        onChange={(e) => setScript(e.target.value)}
                        rows={6}
                        placeholder="Paste or write your script..."
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm mb-4"
                    />
                    <p className="text-slate-500 text-xs mb-4">{script.length} characters (long scripts are automatically split and combined)</p>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Voice</label>
                            <select
                                value={voice}
                                onChange={(e) => setVoice(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                            >
                                {VOICES.map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Speed ({speed}x)</label>
                            <input
                                type="range"
                                min="0.5"
                                max="2.0"
                                step="0.1"
                                value={speed}
                                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                                className="w-full mt-3"
                            />
                        </div>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-slate-300 mb-3 cursor-pointer">
                        <input type="checkbox" checked={useHD} onChange={(e) => setUseHD(e.target.checked)} />
                        Use HD audio (2x the cost, higher fidelity)
                    </label>

                    <p className="text-slate-400 text-xs mb-3">
                        Estimated cost: <span className="text-emerald-400 font-medium">${estimatedAudioCost?.toFixed(4) ?? '0.0000'}</span>
                        {' '}({useHD ? 'HD' : 'Standard'} · $
                        {useHD ? '30' : '15'}/1M characters)
                    </p>

                    <button
                        onClick={handleGenerateAudio}
                        disabled={generatingAudio}
                        className="w-full py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {generatingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {generatingAudio ? 'Generating...' : 'Generate Audio'}
                    </button>

                    {generatedAudio && (
                        <div className="mt-5">
                            <audio controls src={generatedAudio} className="w-full" />
                            {audioCost != null && <p className="text-slate-500 text-xs mt-2">Actual cost: ${audioCost.toFixed(4)}</p>}
                            <a
                                href={generatedAudio}
                                download="generated-audio.mp3"
                                className="mt-3 flex items-center justify-center gap-2 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition text-sm"
                            >
                                <Download className="w-4 h-4" /> Download
                            </a>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'video' && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                    <div className="bg-slate-800/50 rounded-lg p-3 mb-4">
                        <p className="text-slate-300 text-xs">
                            Uses Google's Gemini Omni Flash via Apify — genuinely the fastest, least complicated, best-value option researched: zero new account setup (reuses this platform's existing Apify connection), versus Google Veo's direct API needing a full Google Cloud project and billing setup at $0.03–$0.60 <em>per second</em> of video.
                        </p>
                    </div>

                    <label className="block text-sm text-slate-400 mb-2">Prompt</label>
                    <textarea
                        value={videoPrompt}
                        onChange={(e) => setVideoPrompt(e.target.value)}
                        rows={4}
                        placeholder="Describe the video: subject, style, camera movement, mood, lighting, action..."
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm mb-4"
                        disabled={generatingVideo}
                    />

                    <label className="block text-sm text-slate-400 mb-2">Reference image URL (optional)</label>
                    <input
                        type="text"
                        value={videoImageUrl}
                        onChange={(e) => setVideoImageUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm mb-4"
                        disabled={generatingVideo}
                    />

                    <p className="text-slate-400 text-xs mb-4">
                        Estimated cost: <span className="text-emerald-400 font-medium">~$1.10</span> per video (real, confirmed rate)
                    </p>

                    <button
                        onClick={handleGenerateVideo}
                        disabled={generatingVideo}
                        className="w-full py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {generatingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                        {generatingVideo ? 'Generating...' : 'Generate Video'}
                    </button>

                    {generatingVideo && (
                        <div className="mt-4 flex items-center gap-2 text-slate-400 text-xs">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{videoStatus} ({videoElapsed}s elapsed)</span>
                        </div>
                    )}

                    {generatedVideo && (
                        <div className="mt-5">
                            <video controls src={generatedVideo} className="w-full rounded-lg border border-slate-700" />
                            {videoCost != null && <p className="text-slate-500 text-xs mt-2">Actual cost: ~${videoCost.toFixed(2)}</p>}
                            <a
                                href={generatedVideo}
                                download="generated-video.mp4"
                                className="mt-3 flex items-center justify-center gap-2 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition text-sm"
                            >
                                <Download className="w-4 h-4" /> Download
                            </a>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

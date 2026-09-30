// src/pages/admin/VideoCreator.jsx
//
// REBUILT (2026-09-30): replaced the AWS/Remotion Lambda approach
// (confirmed too complex for practical use) with
// dami_studio/storyboard-video-generator - a real Apify actor
// needing zero new setup, reusing the same APIFY_API_TOKEN already
// working everywhere else on this platform.
//
// Honest, stated limits (confirmed directly from the actor's own
// documentation): hard cuts only, no real transitions; no text or
// captions burned in; one shared duration-per-image, not per-slide.

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Video, Plus, Trash2, Loader2, Upload, Download, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const ASPECT_RATIOS = [
    { value: '9:16', label: '9:16 Vertical (Reels/Shorts/TikTok)' },
    { value: '16:9', label: '16:9 Wide' },
    { value: '1:1', label: '1:1 Square' }
];

export default function VideoCreator() {
    const [images, setImages] = useState([]);
    const [secondsPerImage, setSecondsPerImage] = useState(4);
    const [aspectRatio, setAspectRatio] = useState('9:16');
    const [audioUrl, setAudioUrl] = useState('');
    const [uploadingImage, setUploadingImage] = useState(false);
    const [rendering, setRendering] = useState(false);
    const [renderStatus, setRenderStatus] = useState('');
    const [renderedVideo, setRenderedVideo] = useState(null);
    const [renderCost, setRenderCost] = useState(null);
    const [skipped, setSkipped] = useState([]);
    const [error, setError] = useState(null);

    async function authHeaders() {
        const { data: { session } } = await supabase.auth.getSession();
        return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` };
    }

    async function handleImageUpload(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        if (images.length >= 60) {
            toast.error('This actor supports a maximum of 60 images per video');
            e.target.value = '';
            return;
        }

        setUploadingImage(true);
        try {
            // Reuses the same, real, already-built scan-and-upload
            // pathway (virus scan before storage) as CV/avatar
            // uploads elsewhere on this platform. Images must be
            // publicly reachable for the actor to download them.
            const fileBase64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const headers = await authHeaders();
            const response = await fetch('/api/index?action=scan-and-upload-file', {
                method: 'POST',
                headers,
                body: JSON.stringify({ fileBase64, fileName: file.name, mimeType: file.type, bucket: 'avatars', folder: 'video-slides' })
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.error);

            setImages(prev => [...prev, data.url]);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setUploadingImage(false);
            e.target.value = '';
        }
    }

    function removeImage(index) {
        setImages(prev => prev.filter((_, i) => i !== index));
    }

    async function handleRender() {
        if (images.length < 2) {
            toast.error('Add at least 2 images');
            return;
        }
        setRendering(true);
        setError(null);
        setRenderedVideo(null);
        setSkipped([]);
        setRenderStatus('Starting...');

        try {
            const headers = await authHeaders();
            const startResponse = await fetch('/api/index?action=start-slideshow-video', {
                method: 'POST',
                headers,
                body: JSON.stringify({ imageUrls: images, secondsPerImage, aspectRatio, audioUrl: audioUrl.trim() || undefined })
            });
            const startData = await startResponse.json();
            if (!startData.success) throw new Error(startData.error);

            const { runId } = startData;
            setRenderStatus('Rendering (usually a minute or two)...');

            // Same, proven pattern already fixed once for the
            // Personal Media Studio's video tab - a real 30-minute
            // ceiling, and poll's own body wrapped in its own
            // try/catch so an error is never silently lost to an
            // unhandled promise rejection.
            const MAX_POLL_MS = 30 * 60 * 1000;
            const pollStart = Date.now();
            const poll = async () => {
                try {
                    if (Date.now() - pollStart > MAX_POLL_MS) {
                        throw new Error('Still rendering after 30 minutes - something may be stuck. You can try again.');
                    }

                    const statusHeaders = await authHeaders();
                    const statusResponse = await fetch(`/api/index?action=check-slideshow-video-status&runId=${runId}`, { headers: statusHeaders });
                    const statusData = await statusResponse.json();
                    if (!statusData.success) throw new Error(statusData.error || 'Status check failed');

                    if (!statusData.done) {
                        setTimeout(poll, 5000);
                        return;
                    }
                    if (statusData.failed) {
                        throw new Error(statusData.message || `Video generation failed (${statusData.status})`);
                    }

                    setRenderedVideo(statusData.videoUrl);
                    setRenderCost(statusData.estimatedCost);
                    setSkipped(statusData.skipped || []);
                    setRendering(false);
                } catch (pollErr) {
                    setError(pollErr.message);
                    setRendering(false);
                }
            };
            setTimeout(poll, 5000);
        } catch (err) {
            setError(err.message);
            setRendering(false);
        }
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                <Video className="w-6 h-6 text-primary-400" /> Video Creator
            </h1>
            <p className="text-slate-400 text-sm mb-2">
                Turn a set of images into a finished slideshow video with automatic pan-and-zoom motion.
            </p>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-6 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-amber-200 text-xs">
                    Honest limits: hard cuts only between images (no crossfades/wipes), and no text or captions can be burned into the video. Zoom direction alternates automatically per image.
                </p>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-white font-medium text-sm">Images ({images.length}/60)</p>
                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-dashed border-slate-600 rounded-lg text-slate-300 hover:border-primary-500 cursor-pointer transition text-xs">
                        {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        Add Image
                        <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} className="hidden" />
                    </label>
                </div>

                {images.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-6">No images yet - add at least 2 to render a video.</p>
                ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {images.map((url, i) => (
                            <div key={i} className="relative group">
                                <img src={url} alt="" className="w-full aspect-square object-cover rounded-lg" />
                                <button
                                    onClick={() => removeImage(i)}
                                    className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Seconds per image (1-15)</label>
                        <input
                            type="number"
                            min="1"
                            max="15"
                            value={secondsPerImage}
                            onChange={(e) => setSecondsPerImage(parseInt(e.target.value) || 4)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Aspect ratio</label>
                        <select
                            value={aspectRatio}
                            onChange={(e) => setAspectRatio(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                        >
                            {ASPECT_RATIOS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-sm text-slate-400 mb-2">Background audio URL (optional)</label>
                    <input
                        type="text"
                        value={audioUrl}
                        onChange={(e) => setAudioUrl(e.target.value)}
                        placeholder="https://... (a shorter track trims the video to match)"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                    />
                </div>
                <p className="text-slate-500 text-xs mt-3">
                    Estimated cost: ~${(images.length * secondsPerImage * 0.015).toFixed(3)} ($0.015/rendered second)
                </p>
            </div>

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            <button
                onClick={handleRender}
                disabled={rendering || images.length < 2}
                className="w-full py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {rendering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                {rendering ? renderStatus : 'Render Video'}
            </button>

            {renderedVideo && (
                <div className="mt-5">
                    <video controls src={renderedVideo} className="w-full rounded-lg border border-slate-700" />
                    {renderCost != null && <p className="text-slate-500 text-xs mt-2">Actual cost: ${renderCost.toFixed(3)}</p>}
                    {skipped.length > 0 && (
                        <p className="text-amber-400 text-xs mt-1">{skipped.length} image(s) were skipped (dead link or invalid image)</p>
                    )}
                    <a
                        href={renderedVideo}
                        download="video.mp4"
                        className="mt-3 flex items-center justify-center gap-2 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition text-sm"
                    >
                        <Download className="w-4 h-4" /> Download
                    </a>
                </div>
            )}
        </div>
    );
}

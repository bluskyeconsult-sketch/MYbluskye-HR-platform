// src/components/admin/SourceExternalAudio.jsx
//
// NEW (2026-09-21): admin tool to source an external audio file (like
// the background music track) into Supabase Storage - paste a direct,
// publicly-accessible audio URL (right-click Pixabay's own download
// button → "Copy link address"), and this fetches it server-side and
// gives you back the real, storage-hosted public URL to paste into
// AudiobookListener.jsx's BACKGROUND_TRACK_URL constant.

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Music, Loader2, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SourceExternalAudio() {
    const [sourceUrl, setSourceUrl] = useState('');
    const [fetching, setFetching] = useState(false);
    const [resultUrl, setResultUrl] = useState('');
    const [copied, setCopied] = useState(false);

    async function handleFetch() {
        if (!sourceUrl.trim()) return;
        setFetching(true);
        setResultUrl('');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/index?action=admin-fetch-external-audio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ sourceUrl: sourceUrl.trim(), fileName: 'ambient/quiet-reflections-background.mp3' })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Fetch failed');

            setResultUrl(data.publicUrl);
            toast.success('Audio sourced successfully!');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setFetching(false);
        }
    }

    async function handleCopy() {
        await navigator.clipboard.writeText(resultUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 max-w-lg">
            <h3 className="text-white font-medium flex items-center gap-2 mb-2">
                <Music className="w-4 h-4 text-primary-400" /> Source External Audio
            </h3>
            <p className="text-slate-400 text-sm mb-3">
                Paste a direct audio file URL (e.g. right-click Pixabay's Download button → "Copy link address"). This fetches it server-side and stores it permanently.
            </p>
            <div className="flex gap-2 mb-3">
                <input
                    type="text"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                />
                <button
                    onClick={handleFetch}
                    disabled={fetching || !sourceUrl.trim()}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition disabled:opacity-50 flex items-center gap-2 text-sm"
                >
                    {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Fetch'}
                </button>
            </div>
            {resultUrl && (
                <div className="bg-slate-800 rounded-lg p-3 flex items-center gap-2">
                    <p className="text-emerald-400 text-xs flex-1 truncate">{resultUrl}</p>
                    <button onClick={handleCopy} className="text-slate-400 hover:text-white flex-shrink-0">
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                </div>
            )}
        </div>
    );
}

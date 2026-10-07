// src/pages/admin/MediaLibrary.jsx
//
// NEW (2026-10-03): the real, central place to see everything
// generated anywhere on the platform - course covers, lesson audio,
// both Video Creator tools, and every Personal Media Studio output.
// Confirmed directly that this genuinely didn't exist before, and
// that several generation points (Personal Studio images/audio)
// weren't even being stored anywhere at all - fixed in index.js
// alongside this page.

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Image, Music, Video, Trash2, Download, Loader2, DollarSign, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const MEDIA_TYPES = [
    { value: 'all', label: 'All Types' },
    { value: 'image', label: 'Images' },
    { value: 'audio', label: 'Audio' },
    { value: 'video', label: 'Video' }
];

const SOURCES = [
    { value: 'all', label: 'All Sources' },
    { value: 'course_cover', label: 'Course Covers' },
    { value: 'lesson_audio', label: 'Lesson Audio' },
    { value: 'video_creator_apify', label: 'Video Creator (Images)' },
    { value: 'video_creator_veo', label: 'Video Creator (Text)' },
    { value: 'personal_studio_image', label: 'Personal Studio - Image' },
    { value: 'personal_studio_audio', label: 'Personal Studio - Audio' },
    { value: 'personal_studio_video', label: 'Personal Studio - Video' }
];

const TYPE_ICONS = { image: Image, audio: Music, video: Video };

export default function MediaLibrary() {
    const [items, setItems] = useState([]);
    const [totalCost, setTotalCost] = useState(0);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState('all');
    const [sourceFilter, setSourceFilter] = useState('all');

    useEffect(() => {
        loadLibrary();
    }, [typeFilter, sourceFilter]);

    async function authHeaders() {
        const { data: { session } } = await supabase.auth.getSession();
        return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` };
    }

    async function loadLibrary() {
        setLoading(true);
        try {
            const headers = await authHeaders();
            const params = new URLSearchParams({ mediaType: typeFilter, source: sourceFilter });
            const response = await fetch(`/api/index?action=get-media-library&${params}`, { headers });
            const data = await response.json();
            if (!data.success) throw new Error(data.error);
            setItems(data.items || []);
            setTotalCost(data.totalCost || 0);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id) {
        if (!confirm('Remove this from the library? The real file itself stays in storage - this only removes it from this view.')) return;
        try {
            const headers = await authHeaders();
            const response = await fetch('/api/index?action=delete-media-item', {
                method: 'POST',
                headers,
                body: JSON.stringify({ id })
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.error);
            toast.success('Removed');
            loadLibrary();
        } catch (err) {
            toast.error(err.message);
        }
    }

    function sourceLabel(source) {
        return SOURCES.find(s => s.value === source)?.label || source;
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                <Image className="w-6 h-6 text-primary-400" /> Media Library
            </h1>
            <p className="text-slate-400 text-sm mb-6">
                Everything generated across the platform, in one real place — course covers, lesson audio, both video tools, and every Personal Media Studio output.
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-500" />
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                    >
                        {MEDIA_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </div>
                <select
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                >
                    {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                {!loading && (
                    <span className="ml-auto flex items-center gap-1.5 text-sm text-slate-400">
                        <DollarSign className="w-4 h-4" /> ${totalCost.toFixed(2)} spent on {items.length} item{items.length === 1 ? '' : 's'} shown
                    </span>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary-400" /></div>
            ) : items.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-12">Nothing generated yet matching these filters.</p>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {items.map(item => {
                        const Icon = TYPE_ICONS[item.media_type] || Image;
                        return (
                            <div key={item.id} className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden group">
                                <div className="aspect-square bg-slate-800 relative flex items-center justify-center">
                                    {item.media_type === 'image' ? (
                                        <img src={item.url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <Icon className="w-8 h-8 text-slate-500" />
                                    )}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                                        <a href={item.url} download target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-800 rounded-lg text-white hover:bg-slate-700">
                                            <Download className="w-4 h-4" />
                                        </a>
                                        <button onClick={() => handleDelete(item.id)} className="p-2 bg-slate-800 rounded-lg text-white hover:bg-red-600">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-2.5">
                                    <p className="text-xs text-slate-300 truncate">{sourceLabel(item.source)}</p>
                                    <div className="flex items-center justify-between mt-1">
                                        <p className="text-[10px] text-slate-500">{new Date(item.created_at).toLocaleDateString()}</p>
                                        {item.estimated_cost > 0 && <p className="text-[10px] text-slate-500">${Number(item.estimated_cost).toFixed(3)}</p>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
